"""
quality_score.py
Calculates a transparent 0–100 data-quality score based on measurable issues.

Scoring breakdown (total = 100 points):
  Missing values       – up to 30 points lost
  Exact duplicates     – up to 20 points lost
  Whitespace issues    – up to 10 points lost
  Inconsistent casing  – up to 10 points lost
  Date format issues   – up to 10 points lost
  Numeric-as-text      – up to  5 points lost
  Email/phone issues   – up to  5 points lost
  Outliers (suggested) – up to  5 points lost
  Constant columns     – up to  5 points lost
"""


def calculate_score(profile: dict) -> dict:
    """Return score dict from a profile produced by profiler.profile_dataframe."""
    total_cells = profile.get("total_cells", 1) or 1
    total_rows = profile.get("row_count", 1) or 1
    total_cols = profile.get("col_count", 1) or 1
    columns = profile.get("columns", [])
    exact_dupes = profile.get("exact_duplicate_rows", 0)

    breakdown = {}
    deductions = 0

    # ── Missing values (0–30) ──────────────────────────────────────────────
    total_missing = profile.get("total_missing", 0)
    missing_ratio = total_missing / total_cells
    missing_deduction = min(30, round(missing_ratio * 100))
    breakdown["missing_values"] = {
        "max_penalty": 30,
        "penalty": missing_deduction,
        "note": f"{total_missing} missing cells ({missing_ratio*100:.1f}%)",
    }
    deductions += missing_deduction

    # ── Exact duplicates (0–20) ────────────────────────────────────────────
    dupe_ratio = exact_dupes / total_rows
    dupe_deduction = min(20, round(dupe_ratio * 100))
    breakdown["exact_duplicates"] = {
        "max_penalty": 20,
        "penalty": dupe_deduction,
        "note": f"{exact_dupes} duplicate rows ({dupe_ratio*100:.1f}%)",
    }
    deductions += dupe_deduction

    # ── Whitespace (0–10) ─────────────────────────────────────────────────
    ws_cells = sum(c.get("leading_trailing_spaces", 0) for c in columns)
    ws_ratio = ws_cells / total_cells
    ws_deduction = min(10, round(ws_ratio * 50))
    breakdown["whitespace"] = {
        "max_penalty": 10,
        "penalty": ws_deduction,
        "note": f"{ws_cells} cells with whitespace issues",
    }
    deductions += ws_deduction

    # ── Inconsistent casing (0–10) ────────────────────────────────────────
    case_cols = sum(1 for c in columns if c.get("inconsistent_case"))
    case_deduction = min(10, case_cols * 3)
    breakdown["inconsistent_case"] = {
        "max_penalty": 10,
        "penalty": case_deduction,
        "note": f"{case_cols} columns with inconsistent casing",
    }
    deductions += case_deduction

    # ── Date formats (0–10) ───────────────────────────────────────────────
    date_cols = sum(1 for c in columns if c.get("date_formats_inconsistent"))
    date_deduction = min(10, date_cols * 5)
    breakdown["date_formats"] = {
        "max_penalty": 10,
        "penalty": date_deduction,
        "note": f"{date_cols} columns with inconsistent date formats",
    }
    deductions += date_deduction

    # ── Numeric-as-text (0–5) ─────────────────────────────────────────────
    num_cols = sum(1 for c in columns if c.get("numeric_as_text"))
    num_deduction = min(5, num_cols * 2)
    breakdown["numeric_as_text"] = {
        "max_penalty": 5,
        "penalty": num_deduction,
        "note": f"{num_cols} columns with numbers stored as text",
    }
    deductions += num_deduction

    # ── Email/phone (0–5) ─────────────────────────────────────────────────
    ep_cols = sum(1 for c in columns if c.get("has_email_issues") or c.get("has_phone_issues"))
    ep_deduction = min(5, ep_cols * 2)
    breakdown["email_phone"] = {
        "max_penalty": 5,
        "penalty": ep_deduction,
        "note": f"{ep_cols} columns with email/phone format issues",
    }
    deductions += ep_deduction

    # ── Outliers (0–5, suggestion only) ──────────────────────────────────
    outlier_count = sum(c.get("outlier_count", 0) for c in columns)
    outlier_deduction = min(5, round(outlier_count / max(total_cells, 1) * 200))
    breakdown["outliers"] = {
        "max_penalty": 5,
        "penalty": outlier_deduction,
        "note": f"{outlier_count} potential outlier values (suggestion)",
    }
    deductions += outlier_deduction

    # ── Constant columns (0–5) ───────────────────────────────────────────
    const_cols = sum(1 for c in columns if c.get("is_constant") and c.get("total", 0) > 0)
    const_deduction = min(5, const_cols * 2)
    breakdown["constant_columns"] = {
        "max_penalty": 5,
        "penalty": const_deduction,
        "note": f"{const_cols} constant/empty columns",
    }
    deductions += const_deduction

    score = max(0, 100 - deductions)

    grade = _grade(score)

    return {
        "score": score,
        "grade": grade,
        "total_deductions": deductions,
        "breakdown": breakdown,
    }


def _grade(score: int) -> str:
    if score >= 90:
        return "A"
    elif score >= 75:
        return "B"
    elif score >= 60:
        return "C"
    elif score >= 40:
        return "D"
    else:
        return "F"
