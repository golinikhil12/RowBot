"""
test_backend.py
Backend unit tests for RowBot.
Run: python -m pytest tests/test_backend.py -v
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import io
import pytest
import pandas as pd
from services.file_loader import load_csv, load_excel, load_excel_sheet, validate_file
from services.profiler import profile_dataframe
from services.quality_score import calculate_score
from services.cleaning_engine import apply_operation, preview_operation
from services.command_parser import parse_command
from services.exporter import export_csv, export_excel, sanitize_cell


# ─────────────────────────────────────────────────────────────────────────────
# Sample data
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_CSV = b"""name,email,country,date,revenue
Alice Johnson,alice@example.com,United States,2024-01-15,1250
  bob smith  ,BOB@EXAMPLE.COM,USA,15/01/2024,850
Alice Johnson,alice@example.com,United States,2024-01-15,1250
Carol White,carol@example.com,uk,Jan 20 2024,3200
,henry@example.com,Australia,2024-02-10,780
"""


def make_df():
    result = load_csv(SAMPLE_CSV)
    assert result["ok"]
    return result["df"]


# ─────────────────────────────────────────────────────────────────────────────
# File loader tests
# ─────────────────────────────────────────────────────────────────────────────

class TestFileLoader:
    def test_load_csv_ok(self):
        result = load_csv(SAMPLE_CSV)
        assert result["ok"]
        assert len(result["df"]) == 5
        assert "name" in result["df"].columns

    def test_load_csv_empty(self):
        result = load_csv(b"")
        assert not result["ok"]

    def test_load_csv_header_only(self):
        result = load_csv(b"name,email\n")
        assert not result["ok"] or len(result["df"]) == 0

    def test_load_csv_tab_delimited(self):
        tsv = b"name\temail\nAlice\talice@test.com\n"
        result = load_csv(tsv)
        assert result["ok"]
        assert result["delimiter"] in ("\t", ",")

    def test_excel_multi_sheet(self):
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as w:
            pd.DataFrame({"a": [1, 2]}).to_excel(w, sheet_name="Sheet1", index=False)
            pd.DataFrame({"b": [3, 4]}).to_excel(w, sheet_name="Sheet2", index=False)
        buf.seek(0)
        result = load_excel(buf.read())
        assert result["ok"]
        assert "Sheet1" in result["sheet_names"]
        assert "Sheet2" in result["sheet_names"]

    def test_file_size_limit_is_55mb(self):
        from services.file_loader import MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES
        assert MAX_FILE_SIZE_MB == 55
        assert MAX_FILE_SIZE_BYTES == 55 * 1024 * 1024


# ─────────────────────────────────────────────────────────────────────────────
# Profiler tests
# ─────────────────────────────────────────────────────────────────────────────

class TestProfiler:
    def test_profile_basic(self):
        df = make_df()
        p = profile_dataframe(df)
        assert p["row_count"] == 5
        assert p["col_count"] == 5

    def test_detects_exact_duplicates(self):
        df = make_df()
        p = profile_dataframe(df)
        assert p["exact_duplicate_rows"] == 1

    def test_detects_missing(self):
        df = make_df()
        p = profile_dataframe(df)
        assert p["total_missing"] > 0

    def test_detects_whitespace(self):
        df = make_df()
        p = profile_dataframe(df)
        ws_cols = [c for c in p["columns"] if c["leading_trailing_spaces"] > 0]
        assert len(ws_cols) > 0

    def test_detects_date_inconsistency(self):
        df = make_df()
        p = profile_dataframe(df)
        date_cols = [c for c in p["columns"] if c["name"] == "date"]
        assert len(date_cols) > 0

    def test_issues_list_not_empty(self):
        df = make_df()
        p = profile_dataframe(df)
        assert len(p["issues"]) > 0

    def test_detects_ambiguous_dates(self):
        df = pd.DataFrame({"date": ["04/05/2023", "06/07/2023", "11/12/2022"]})
        p = profile_dataframe(df)
        date_col = next(c for c in p["columns"] if c["name"] == "date")
        assert date_col["ambiguous_date_count"] > 0
        assert any(i["id"] == "ambiguous_dates" for i in p["issues"])

    def test_detects_potential_duplicates(self):
        df = pd.DataFrame({
            "name": ["Jonathan Swift", "Jonathon Swift", "Random Person"],
            "city": ["Dublin", "Dublin", "London"]
        })
        p = profile_dataframe(df)
        assert len(p["potential_duplicate_groups"]) > 0
        assert any(i["id"] == "potential_duplicates" for i in p["issues"])


# ─────────────────────────────────────────────────────────────────────────────
# Quality score tests
# ─────────────────────────────────────────────────────────────────────────────

class TestQualityScore:
    def test_score_range(self):
        df = make_df()
        p = profile_dataframe(df)
        s = calculate_score(p)
        assert 0 <= s["score"] <= 100

    def test_score_decreases_with_more_issues(self):
        clean_df = pd.DataFrame({"name": ["Alice", "Bob"], "age": ["25", "30"]})
        messy_df = make_df()
        clean_score = calculate_score(profile_dataframe(clean_df))["score"]
        messy_score = calculate_score(profile_dataframe(messy_df))["score"]
        assert clean_score > messy_score

    def test_breakdown_present(self):
        df = make_df()
        p = profile_dataframe(df)
        s = calculate_score(p)
        assert "breakdown" in s
        assert len(s["breakdown"]) > 0

    def test_grade_present(self):
        df = make_df()
        p = profile_dataframe(df)
        s = calculate_score(p)
        assert s["grade"] in ("A", "B", "C", "D", "F")


# ─────────────────────────────────────────────────────────────────────────────
# Cleaning engine tests
# ─────────────────────────────────────────────────────────────────────────────

class TestCleaningEngine:
    def test_trim_whitespace(self):
        df = make_df()
        result = apply_operation(df, {"op": "trim_whitespace", "params": {}})
        assert result["ok"]
        assert result["log_entry"]["rows_affected"] > 0
        new_df = result["df"]
        assert not any(new_df["name"].dropna().str.startswith(" "))

    def test_remove_exact_duplicates(self):
        df = make_df()
        before_len = len(df)
        result = apply_operation(df, {"op": "remove_exact_duplicates", "params": {}})
        assert result["ok"]
        assert len(result["df"]) < before_len

    def test_normalize_case_lower(self):
        df = pd.DataFrame({"text": ["ALICE", "BOB", "Carol"]})
        result = apply_operation(df, {"op": "normalize_case", "params": {"mode": "lower"}})
        assert result["ok"]
        assert all(result["df"]["text"].str.islower())

    def test_remove_empty_rows(self):
        df = pd.DataFrame({"a": [None, "x", None], "b": [None, "y", None]})
        result = apply_operation(df, {"op": "remove_empty_rows", "params": {}})
        assert result["ok"]
        assert len(result["df"]) == 1

    def test_fill_missing_median(self):
        df = pd.DataFrame({"value": ["10", None, "20", None, "30"]})
        result = apply_operation(df, {"op": "fill_missing", "params": {"method": "median", "columns": ["value"]}})
        assert result["ok"]
        assert result["df"]["value"].isna().sum() == 0

    def test_standardize_dates(self):
        df = pd.DataFrame({"date": ["01/15/2024", "15-01-2024", "Jan 15 2024"]})
        result = apply_operation(df, {"op": "standardize_dates", "params": {"columns": ["date"]}})
        assert result["ok"]

    def test_normalize_email(self):
        df = pd.DataFrame({"email": ["ALICE@EXAMPLE.COM", " bob@test.com "]})
        result = apply_operation(df, {"op": "normalize_email", "params": {"columns": ["email"]}})
        assert result["ok"]
        assert all(result["df"]["email"].str.islower())

    def test_invalid_operation(self):
        df = make_df()
        result = apply_operation(df, {"op": "delete_everything", "params": {}})
        assert not result["ok"]

    def test_missing_column_error(self):
        df = make_df()
        result = apply_operation(df, {"op": "trim_whitespace", "params": {"columns": ["nonexistent_column"]}})
        assert not result["ok"]

    def test_preview_does_not_mutate(self):
        df = make_df()
        original_len = len(df)
        preview_operation(df.copy(), {"op": "remove_exact_duplicates", "params": {}})
        assert len(df) == original_len  # original unchanged

    def test_drop_column(self):
        df = make_df()
        result = apply_operation(df, {"op": "drop_column", "params": {"columns": ["revenue"]}})
        assert result["ok"]
        assert "revenue" not in result["df"].columns

    def test_rename_column(self):
        df = pd.DataFrame({"old_name": ["a", "b"]})
        result = apply_operation(df, {"op": "rename_column", "params": {"old_name": "old_name", "new_name": "new_name"}})
        assert result["ok"]
        assert "new_name" in result["df"].columns

    def test_fuzzy_deduplicate(self):
        df = pd.DataFrame({
            "name": ["Jonathan Swift", "Jonathon Swift", "Jonathan Swift", "Alice Wonderland"],
            "city": ["Dublin", "Dublin", "Dublin", "Oxford"]
        })
        result = apply_operation(df, {"op": "fuzzy_deduplicate", "params": {"threshold": 0.85, "keep": "first"}})
        assert result["ok"]
        assert result["log_entry"]["rows_affected"] >= 1
        assert len(result["df"]) < len(df)

    def test_reorder_columns(self):
        df = pd.DataFrame({"c": [1], "b": [2], "a": [3]})
        result = apply_operation(df, {"op": "reorder_columns", "params": {"order": ["a", "b", "c"]}})
        assert result["ok"]
        assert list(result["df"].columns) == ["a", "b", "c"]

    def test_standardize_dates_dayfirst(self):
        # 04/05/2023 with dayfirst=True -> 2023-05-04 (May 4th); with dayfirst=False -> 2023-04-05 (April 5th)
        df_dmy = pd.DataFrame({"d": ["04/05/2023"]})
        res_dmy = apply_operation(df_dmy, {"op": "standardize_dates", "params": {"columns": ["d"], "ambiguous_preference": "DMY"}})
        assert res_dmy["ok"]
        assert res_dmy["df"]["d"].iloc[0] == "2023-05-04"

        df_mdy = pd.DataFrame({"d": ["04/05/2023"]})
        res_mdy = apply_operation(df_mdy, {"op": "standardize_dates", "params": {"columns": ["d"], "ambiguous_preference": "MDY"}})
        assert res_mdy["ok"]
        assert res_mdy["df"]["d"].iloc[0] == "2023-04-05"


# ─────────────────────────────────────────────────────────────────────────────
# Command parser tests
# ─────────────────────────────────────────────────────────────────────────────

class TestCommandParser:
    COLS = ["name", "email", "country", "date", "revenue"]

    def test_parse_remove_duplicates(self):
        r = parse_command("Remove duplicate rows", self.COLS)
        assert r["ok"]
        assert r["op"] == "remove_exact_duplicates"

    def test_parse_fuzzy_deduplicate(self):
        r = parse_command("Fuzzy deduplicate similar rows", self.COLS)
        assert r["ok"]
        assert r["op"] == "fuzzy_deduplicate"

    def test_parse_reorder_columns(self):
        r = parse_command("Reorder columns in dataset", self.COLS)
        assert r["ok"]
        assert r["op"] == "reorder_columns"

    def test_parse_trim_whitespace(self):
        r = parse_command("Trim extra spaces", self.COLS)
        assert r["ok"]
        assert r["op"] == "trim_whitespace"

    def test_parse_lowercase(self):
        r = parse_command("Convert text to lowercase", self.COLS)
        assert r["ok"]
        assert r["op"] == "normalize_case"
        assert r["params"]["mode"] == "lower"

    def test_parse_standardize_dates(self):
        r = parse_command("Standardize dates to YYYY-MM-DD", self.COLS)
        assert r["ok"]
        assert r["op"] == "standardize_dates"

    def test_parse_fill_median(self):
        r = parse_command("Fill missing values with median", self.COLS)
        assert r["ok"]
        assert r["op"] == "fill_missing"
        assert r["params"]["method"] == "median"

    def test_parse_normalize_emails(self):
        r = parse_command("Normalize email addresses to lowercase", self.COLS)
        assert r["ok"]
        assert r["op"] == "normalize_email"

    def test_parse_unknown_returns_suggestions(self):
        r = parse_command("Do something completely unknown xyz", self.COLS)
        assert not r["ok"]
        assert "suggestions" in r
        assert len(r["suggestions"]) > 0

    def test_detects_column_name(self):
        r = parse_command("Trim whitespace in name column", self.COLS)
        assert r["ok"]
        assert "name" in r.get("columns_detected", [])


# ─────────────────────────────────────────────────────────────────────────────
# Exporter tests
# ─────────────────────────────────────────────────────────────────────────────

class TestExporter:
    def test_sanitize_cell_formula_injection(self):
        assert sanitize_cell("=SUM(A1:B10)").startswith("'")
        assert sanitize_cell("+12345").startswith("'")
        assert sanitize_cell("@cmd").startswith("'")
        assert sanitize_cell("-50").startswith("'")
        assert sanitize_cell("normal text") == "normal text"

    def test_export_csv_roundtrip(self):
        df = make_df()
        res = export_csv(df, "sample.csv")
        assert res["ok"]
        assert res["mimetype"] == "text/csv"
        assert len(res["bytes"]) > 0
        loaded = load_csv(res["bytes"])
        assert loaded["ok"]
        assert len(loaded["df"]) == len(df)

    def test_export_excel_roundtrip(self):
        df = make_df()
        res = export_excel(df, "sample.xlsx")
        assert res["ok"]
        assert "spreadsheetml" in res["mimetype"]
        assert len(res["bytes"]) > 0
        loaded = load_excel(res["bytes"])
        assert loaded["ok"]
        assert len(loaded["sheet_names"]) > 0
        sheet_res = load_excel_sheet(res["bytes"], loaded["sheet_names"][0])
        assert sheet_res["ok"]
        assert len(sheet_res["df"]) == len(df)


# ─────────────────────────────────────────────────────────────────────────────
# Google Gemini tests
# ─────────────────────────────────────────────────────────────────────────────

class TestGeminiService:
    def test_gemini_config_defaults(self):
        from services.gemini_service import get_gemini_config
        cfg = get_gemini_config()
        assert "provider" in cfg
        assert cfg["provider"] == "Google Gemini"
        assert "supported_models" in cfg
        assert "gemini-1.5-flash" in cfg["supported_models"]

    def test_gemini_status_api(self):
        from app import app
        with app.test_client() as client:
            res = client.get("/api/gemini/status")
            assert res.status_code == 200
            data = res.get_json()
            assert data["provider"] == "Google Gemini"
            assert "model" in data

    def test_gemini_config_api_update(self):
        from app import app
        with app.test_client() as client:
            res = client.post("/api/gemini/config", json={
                "model": "gemini-2.0-flash",
                "api_key": "AIzaSyTestMockKey123456789"
            })
            assert res.status_code == 200
            data = res.get_json()
            assert data["ok"] is True
            assert data["config"]["model"] == "gemini-2.0-flash"
            assert data["config"]["configured"] is True


class TestUploadAndEndpoints:
    def test_upload_csv_returns_profile_and_score(self):
        from app import app
        with app.test_client() as client:
            csv_bytes = b"name,email,revenue\nAlice,alice@example.com,1250\nBob,bob@example.com,850\nAlice,alice@example.com,1250\n"
            res = client.post(
                "/api/upload",
                data={"file": (io.BytesIO(csv_bytes), "test_data.csv")},
                content_type="multipart/form-data"
            )
            assert res.status_code == 200
            data = res.get_json()
            assert "job_id" in data
            assert data["row_count"] == 3
            assert data["col_count"] == 3
            assert "profile" in data and data["profile"] is not None
            assert "score" in data and data["score"] is not None
            job_id = data["job_id"]

            # Test /data endpoint
            res_data = client.get(f"/api/jobs/{job_id}/data?page=1&page_size=50")
            assert res_data.status_code == 200
            grid = res_data.get_json()
            assert len(grid["rows"]) == 3
            assert "column_types" in grid

            # Test /original endpoint (verifying pd.to_numeric bug is resolved)
            res_orig = client.get(f"/api/jobs/{job_id}/original?page=1&page_size=50")
            assert res_orig.status_code == 200
            orig_grid = res_orig.get_json()
            assert len(orig_grid["rows"]) == 3

            # Test /assistant endpoint
            res_asst = client.post(
                f"/api/jobs/{job_id}/assistant",
                json={"instruction": "remove duplicates", "api_key": None}
            )
            assert res_asst.status_code == 200
            asst_data = res_asst.get_json()
            assert asst_data["ok"] is True
            assert asst_data["parsed"]["op"] == "remove_exact_duplicates"

            # Test /batch_apply endpoint (running all quick operations in one click)
            res_batch = client.post(f"/api/jobs/{job_id}/batch_apply", json={})
            assert res_batch.status_code == 200
            batch_data = res_batch.get_json()
            assert batch_data["ok"] is True
            assert batch_data["applied_count"] > 0
            assert "score" in batch_data
            assert "log_entries" in batch_data

            # Test email normalization and resolution of email issues
            df_email = pd.DataFrame({
                "Email Address": ["ALICE@EXAMPLE.COM", "bob @example.com", "david@", None, ""]
            })
            from services.profiler import profile_dataframe
            from services.cleaning_engine import apply_operation
            p_before = profile_dataframe(df_email)
            email_issues_before = [i for i in p_before["issues"] if i["id"] == "email_issues"]
            assert len(email_issues_before) == 1

            clean_res = apply_operation(df_email, {"op": "normalize_email", "params": {"remove_invalid": True}})
            assert clean_res["ok"] is True
            assert clean_res["df"]["Email Address"].iloc[0] == "alice@example.com"
            assert clean_res["df"]["Email Address"].iloc[1] == "bob@example.com"
            assert clean_res["df"]["Email Address"].iloc[2] == ""

            p_after = profile_dataframe(clean_res["df"])
            email_issues_after = [i for i in p_after["issues"] if i["id"] == "email_issues"]
            assert len(email_issues_after) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

