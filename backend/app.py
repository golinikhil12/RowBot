"""
app.py – RowBot Flask backend
"""
import os
import sys

# Ensure services/ is importable
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
import io

from job_store import (
    create_job, get_job, update_working_df, undo_last, set_profile, list_jobs
)
from dashboard_html import BACKEND_DASHBOARD_HTML
from services.file_loader import (
    validate_file, load_csv, load_excel, load_excel_sheet, df_to_records
)
from services.profiler import profile_dataframe
from services.quality_score import calculate_score
from services.cleaning_engine import apply_operation, preview_operation
from services.command_parser import parse_command, get_command_examples
from services.exporter import export_csv, export_excel, export_report

import numpy as np
import pandas as pd
from flask.json.provider import DefaultJSONProvider

class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, (np.bool_, np.generic)):
            if isinstance(obj, np.bool_):
                return bool(obj)
            if isinstance(obj, np.integer):
                return int(obj)
            if isinstance(obj, np.floating):
                return float(obj)
            return obj.item()
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if hasattr(obj, "item"):
            return obj.item()
        return super().default(obj)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 65 * 1024 * 1024  # Allows up to 55 MB files with multipart overhead
app.json = CustomJSONProvider(app)
CORS(app, resources={r"/*": {"origins": "*"}})

SAMPLE_CSV_CONTENT = """customer_id,name,email,phone,country,signup_date,revenue,status
1,Alice Johnson,alice@example.com,+1-555-0101,United States,2024-01-15,1250.00,Active
2,bob smith,BOB@EXAMPLE.COM,5550102,USA,15/01/2024,850.5,active
3,Alice Johnson,alice@example.com,+1-555-0101,United States,2024-01-15,1250.00,Active
4,  Carol White  ,carol.white@example.com,(555) 0103,uk,Jan 20 2024,3200,ACTIVE
5,David Brown,david@,555-0104,United Kingdom,2024/01/22,950,Active
6,eve davis,EVE@EXAMPLE.COM,+44 555 0105,England,22-01-2024,1100.75,inactive
7,Frank Miller,frank@example.com,5550106,Canada,2024-02-01,,Active
8,Grace Lee,grace@example.com,+1 (555) 0107,canada,Feb 1 2024,2200,Active
9,,henry@example.com,5550108,Australia,2024-02-10,780,active
10,Iris Chen,iris.chen,+61-555-0109,australia,10/02/2024,4500.00,Active
11,Jack Wilson,jack@example.com,555-0110,Germany,2024-02-15,1650,Active
12,KAREN JONES,karen@example.com,+49 555 0111,germany,15-02-2024,1650,Active
13,Liam Scott,liam@example.com,5550112,France,2024-03-01,920.25,Active
14,mia taylor,MIA@EXAMPLE.COM,+33 555 0113,france,01/03/2024,920.25,active
15,Noah Clark,noah@example.com,555-0114,Japan,2024-03-10,5600,Active
16,,,,,,,
17,Olivia Hall,olivia@example.com,5550116,japan,10-03-2024,5600,Active
18,Peter Young,peter@example.com,+81 555 0117,India,2024-03-20,300,Inactive
19,Quinn Adams,quinn @example.com,5550118,india,20/03/2024,300,inactive
20,Ryan King,ryan@example.com,555-0119,Brazil,2024-04-01,1800,Active
"""

def _provision_demo_job():
    """Create and return the job_id for a pre-loaded messy demo dataset."""
    sample_csv_bytes = SAMPLE_CSV_CONTENT.encode("utf-8")
    result = load_csv(sample_csv_bytes)
    if result["ok"]:
        df = result["df"]
        job_id = create_job(df, "rowbot_sample_messy.csv", file_type="csv")
        profile = profile_dataframe(df)
        score = calculate_score(profile)
        set_profile(job_id, profile, score)
        return job_id
    return None

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept"
    return response

@app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
@app.route("/<path:path>", methods=["OPTIONS"])
def handle_options(path=""):
    return ("", 204)

# ─────────────────────────────────────────────────────────────────────────────
# Root & Web Dashboard
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
@app.get("/dashboard")
def backend_dashboard():
    """Serve the standalone RowBot Backend Control Center & API Explorer web page."""
    return Response(BACKEND_DASHBOARD_HTML, mimetype="text/html")

# ─────────────────────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "version": "1.0.0", "engine": "RowBot Flask Core"})

@app.post("/api/demo")
def api_demo():
    job_id = _provision_demo_job()
    if not job_id:
        return jsonify({"error": "Failed to create demo job."}), 500
    job = get_job(job_id)
    return jsonify({
        "ok": True,
        "job_id": job_id,
        "filename": "rowbot_sample_messy.csv",
        "file_type": "csv",
        "row_count": len(job["working_df"]),
        "col_count": len(job["working_df"].columns),
        "columns": list(job["working_df"].columns),
        "profile": job["profile"],
        "score": job["quality_score"],
    })

@app.get("/api/jobs")
def api_list_jobs():
    jobs = list_jobs()
    return jsonify({
        "ok": True,
        "count": len(jobs),
        "jobs": jobs,
    })


# ─────────────────────────────────────────────────────────────────────────────
# Upload
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/upload")
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    validation = validate_file(file)
    if not validation["ok"]:
        return jsonify({"error": validation["error"]}), 400

    ext = validation["ext"]
    filename = validation["filename"]
    file_bytes = file.read()

    if ext == ".csv":
        result = load_csv(file_bytes)
        if not result["ok"]:
            return jsonify({"error": result["error"]}), 422

        df = result["df"]
        job_id = create_job(df, filename, file_type="csv")

        # Automatically profile and calculate score immediately on upload
        try:
            profile = profile_dataframe(df)
            score = calculate_score(profile)
            set_profile(job_id, profile, score)
        except Exception as e:
            app.logger.warning(f"Initial profiling error on upload: {e}")
            profile = None
            score = None

        return jsonify({
            "job_id": job_id,
            "filename": filename,
            "file_type": "csv",
            "encoding": result.get("encoding"),
            "delimiter": result.get("delimiter"),
            "row_count": len(df),
            "col_count": len(df.columns),
            "columns": list(df.columns),
            "warnings": result.get("warnings", []),
            "profile": profile,
            "score": score,
        })

    else:  # Excel
        result = load_excel(file_bytes)
        if not result["ok"]:
            return jsonify({"error": result["error"]}), 422

        sheet_names = result["sheet_names"]
        sheet_param = request.form.get("sheet_name") or request.args.get("sheet_name")

        if not sheet_param and len(sheet_names) > 1:
            # Return sheet list for client to choose
            return jsonify({
                "requires_sheet_selection": True,
                "sheet_names": sheet_names,
                "filename": filename,
                "file_bytes_token": None,  # handled via re-upload with sheet param
            })

        sheet = sheet_param or sheet_names[0]
        sheet_result = load_excel_sheet(file_bytes, sheet)
        if not sheet_result["ok"]:
            return jsonify({"error": sheet_result["error"]}), 422

        df = sheet_result["df"]
        job_id = create_job(df, filename, sheet_name=sheet, file_type="excel")

        # Automatically profile and calculate score immediately on upload
        try:
            profile = profile_dataframe(df)
            score = calculate_score(profile)
            set_profile(job_id, profile, score)
        except Exception as e:
            app.logger.warning(f"Initial profiling error on upload: {e}")
            profile = None
            score = None

        return jsonify({
            "job_id": job_id,
            "filename": filename,
            "file_type": "excel",
            "sheet_name": sheet,
            "sheet_names": sheet_names,
            "row_count": len(df),
            "col_count": len(df.columns),
            "columns": list(df.columns),
            "profile": profile,
            "score": score,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Profile
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/jobs/<job_id>/profile")
def get_profile(job_id):
    job = get_job(job_id)
    if not job:
        if job_id in ("demo", "sample", "default") or len(str(job_id)) <= 6:
            new_job_id = _provision_demo_job()
            if new_job_id:
                job = get_job(new_job_id)
                job_id = new_job_id

        if not job:
            return jsonify({
                "error": "Dataset session not found or server was restarted. Please upload your file or click 'Load Demo Dataset'.",
                "can_load_demo": True
            }), 404

    try:
        # Use cached profile if available
        if job.get("profile") and job.get("quality_score"):
            return jsonify({
                "job_id": job_id,
                "profile": job["profile"],
                "score": job["quality_score"],
            })

        df = job["working_df"]
        profile = profile_dataframe(df)
        score = calculate_score(profile)
        set_profile(job_id, profile, score)

        return jsonify({
            "job_id": job_id,
            "profile": profile,
            "score": score,
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to profile dataset: {str(e)}"}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Data preview (paginated)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/jobs/<job_id>/data")
def get_data(job_id):
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found or expired."}), 404

    page = max(1, int(request.args.get("page", 1)))
    page_size = min(200, max(10, int(request.args.get("page_size", 50))))
    df = job["working_df"]

    total_rows = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    page_df = df.iloc[start:end]

    # Detect exact duplicates across the dataset for this page
    page_dupes = []
    if total_rows > 1:
        dupe_mask = df.duplicated(keep=False)
        for i in range(start, min(end, total_rows)):
            if bool(dupe_mask.iloc[i]):
                page_dupes.append(int(i - start))

    # Detect potential duplicate indices on this page
    potential_dupes = []
    if job.get("profile") and "potential_duplicate_groups" in job["profile"]:
        for group in job["profile"]["potential_duplicate_groups"]:
            b_idx = group.get("base_row_index")
            if start <= b_idx < end:
                potential_dupes.append(int(b_idx - start))
            for m in group.get("matches", []):
                r_idx = m.get("row_index")
                if start <= r_idx < end:
                    potential_dupes.append(int(r_idx - start))

    col_types = {}
    if job.get("profile") and "columns" in job["profile"]:
        col_types = {c["name"]: c.get("type", "text") for c in job["profile"]["columns"]}
    else:
        for col in df.columns:
            col_types[col] = "numeric" if pd.to_numeric(df[col], errors="coerce").notna().mean() > 0.8 else "text"

    return jsonify({
        "columns": list(df.columns),
        "rows": df_to_records(page_df),
        "total_rows": total_rows,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_rows + page_size - 1) // page_size if page_size else 1,
        "column_types": col_types,
        "exact_duplicate_row_indices": page_dupes,
        "potential_duplicate_row_indices": list(set(potential_dupes)),
        "filename": job.get("filename", ""),
        "file_type": job.get("file_type", "csv"),
        "sheet_name": job.get("sheet_name"),
    })


# ─────────────────────────────────────────────────────────────────────────────
# Original data preview
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/jobs/<job_id>/original")
def get_original(job_id):
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found or expired."}), 404

    page = max(1, int(request.args.get("page", 1)))
    page_size = min(200, max(10, int(request.args.get("page_size", 50))))
    df = job["original_df"]

    total_rows = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    page_df = df.iloc[start:end]

    page_dupes = []
    if total_rows > 1:
        dupe_mask = df.duplicated(keep=False)
        for i in range(start, min(end, total_rows)):
            if bool(dupe_mask.iloc[i]):
                page_dupes.append(int(i - start))

    col_types = {}
    for col in df.columns:
        col_types[col] = "numeric" if pd.to_numeric(df[col], errors="coerce").notna().mean() > 0.8 else "text"

    return jsonify({
        "columns": list(df.columns),
        "rows": df_to_records(page_df),
        "total_rows": total_rows,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_rows + page_size - 1) // page_size if page_size else 1,
        "column_types": col_types,
        "exact_duplicate_row_indices": page_dupes,
        "potential_duplicate_row_indices": [],
        "filename": job.get("filename", ""),
        "file_type": job.get("file_type", "csv"),
        "sheet_name": job.get("sheet_name"),
    })


# ─────────────────────────────────────────────────────────────────────────────
# Preview an operation
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/jobs/<job_id>/preview")
def preview_op(job_id):
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found or expired."}), 404

    body = request.get_json(silent=True) or {}
    operation = body.get("operation")
    if not operation:
        return jsonify({"error": "No operation specified."}), 400

    result = preview_operation(job["working_df"], operation)
    if not result["ok"]:
        return jsonify({"error": result.get("error")}), 422

    return jsonify(result)


# ─────────────────────────────────────────────────────────────────────────────
# Apply an operation
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/jobs/<job_id>/apply")
def apply_op(job_id):
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found or expired."}), 404

    body = request.get_json(silent=True) or {}
    operation = body.get("operation")
    if not operation:
        return jsonify({"error": "No operation specified."}), 400

    result = apply_operation(job["working_df"], operation)
    if not result["ok"]:
        return jsonify({"error": result.get("error")}), 422

    update_working_df(job_id, result["df"], result["log_entry"])

    # Return updated profile and score
    new_df = result["df"]
    profile = profile_dataframe(new_df)
    score = calculate_score(profile)
    set_profile(job_id, profile, score)

    return jsonify({
        "ok": True,
        "log_entry": result["log_entry"],
        "warnings": result.get("warnings", []),
        "row_count": len(new_df),
        "col_count": len(new_df.columns),
        "score": score,
        "profile": profile,
    })


@app.post("/api/jobs/<job_id>/batch_apply")
def batch_apply_ops(job_id):
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found or expired."}), 404

    body = request.get_json(silent=True) or {}
    operations = body.get("operations")

    # If operations list not provided, default to all standard quick operations in best sequence
    if not operations:
        operations = [
            {"op": "remove_empty_rows", "params": {}},
            {"op": "remove_empty_columns", "params": {}},
            {"op": "remove_exact_duplicates", "params": {}},
            {"op": "trim_whitespace", "params": {}},
            {"op": "normalize_text", "params": {}},
            {"op": "normalize_email", "params": {}},
            {"op": "standardize_dates", "params": {"format": "%Y-%m-%d"}},
            {"op": "convert_numeric", "params": {}},
            {"op": "fill_missing", "params": {"method": "median"}},
            {"op": "fill_missing", "params": {"method": "mode"}},
        ]

    current_df = job["working_df"].copy()
    applied_logs = []
    total_rows_affected = 0
    all_warnings = []

    for op_item in operations:
        op = op_item.get("op")
        params = op_item.get("params", {})
        try:
            res = apply_operation(current_df, {"op": op, "params": params})
            if res.get("ok"):
                current_df = res["df"]
                log_entry = res["log_entry"]
                update_working_df(job_id, current_df, log_entry)
                applied_logs.append(log_entry)
                total_rows_affected += log_entry.get("rows_affected", 0)
                if res.get("warnings"):
                    all_warnings.extend(res["warnings"])
        except Exception as e:
            app.logger.warning(f"Error applying {op} in batch: {e}")

    # Re-profile updated dataset and recalculate score
    profile = profile_dataframe(current_df)
    score = calculate_score(profile)
    set_profile(job_id, profile, score)

    return jsonify({
        "ok": True,
        "applied_count": len(applied_logs),
        "log_entries": applied_logs,
        "total_rows_affected": total_rows_affected,
        "row_count": len(current_df),
        "col_count": len(current_df.columns),
        "score": score,
        "profile": profile,
        "warnings": all_warnings,
    })


# ─────────────────────────────────────────────────────────────────────────────
# Undo
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/jobs/<job_id>/undo")
def undo_op(job_id):
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found or expired."}), 404

    entry = undo_last(job_id)
    if entry is None:
        return jsonify({"error": "Nothing to undo."}), 400

    job = get_job(job_id)
    profile = profile_dataframe(job["working_df"])
    score = calculate_score(profile)
    set_profile(job_id, profile, score)

    return jsonify({
        "ok": True,
        "undone_operation": entry,
        "row_count": len(job["working_df"]),
        "score": score,
        "profile": profile,
    })


# ─────────────────────────────────────────────────────────────────────────────
# Operation log
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/jobs/<job_id>/log")
def get_log(job_id):
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found or expired."}), 404
    return jsonify({"operation_log": job["operation_log"]})


# ─────────────────────────────────────────────────────────────────────────────
# AI Copilot / Command assistant
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/jobs/<job_id>/assistant")
def assistant(job_id):
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found or expired."}), 404

    body = request.get_json(silent=True) or {}
    instruction = body.get("instruction", "").strip()
    if not instruction:
        return jsonify({"error": "No instruction provided."}), 400

    available_columns = list(job["working_df"].columns)
    api_key = body.get("api_key")
    model = body.get("model")
    parsed = parse_command(instruction, available_columns, api_key=api_key, model=model)

    if not parsed["ok"]:
        return jsonify({
            "ok": False,
            "error": parsed["error"],
            "suggestions": parsed.get("suggestions", []),
            "note": parsed.get("note", ""),
        })

    # Build a preview automatically
    operation = {"op": parsed["op"], "params": parsed["params"]}
    preview = preview_operation(job["working_df"], operation)

    return jsonify({
        "ok": True,
        "parsed": {
            "op": parsed["op"],
            "params": parsed["params"],
            "description": parsed["description"],
            "confidence": parsed["confidence"],
            "columns_detected": parsed.get("columns_detected", []),
        },
        "preview": preview if preview.get("ok") else None,
        "preview_error": preview.get("error") if not preview.get("ok") else None,
        "operation": operation,
        "ai_mode": parsed.get("ai_mode", "rule_based"),
        "model": parsed.get("model", None),
        "disclosure": parsed.get("disclosure", "This response was generated by a deterministic rule-based parser."),
        "reasoning": parsed.get("reasoning", None),
    })


@app.get("/api/assistant/examples")
def assistant_examples():
    return jsonify({"examples": get_command_examples()})


# ─────────────────────────────────────────────────────────────────────────────
# Google Gemini AI Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/gemini/status")
def gemini_status():
    from services.gemini_service import get_gemini_config
    return jsonify(get_gemini_config())


@app.post("/api/gemini/config")
def gemini_config():
    data = request.get_json(silent=True) or {}
    api_key = data.get("api_key")
    model = data.get("model")
    from services.gemini_service import set_gemini_config, get_gemini_config
    set_gemini_config(api_key=api_key, model=model)
    return jsonify({"ok": True, "config": get_gemini_config()})


@app.post("/api/jobs/<job_id>/gemini/chat")
def gemini_chat(job_id):
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found or expired."}), 404
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    if not message:
        return jsonify({"error": "Message is required."}), 400

    df = job["working_df"]
    prof = profile_dataframe(df)
    sc = calculate_score(prof)

    dataset_context = {
        "row_count": len(df),
        "col_count": len(df.columns),
        "columns": list(df.columns),
        "score": sc,
        "issues": prof.get("issues", [])
    }

    from services.gemini_service import chat_with_gemini
    res = chat_with_gemini(message, dataset_context, api_key=data.get("api_key"), model=data.get("model"))
    return jsonify(res)


@app.post("/api/jobs/<job_id>/gemini/auto-recipe")
def gemini_auto_recipe(job_id):
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found or expired."}), 404
    data = request.get_json(silent=True) or {}

    df = job["working_df"]
    prof = profile_dataframe(df)
    sc = calculate_score(prof)

    dataset_context = {
        "row_count": len(df),
        "col_count": len(df.columns),
        "columns": list(df.columns),
        "score": sc,
        "issues": prof.get("issues", [])
    }

    from services.gemini_service import generate_auto_cleaning_recipe
    res = generate_auto_cleaning_recipe(dataset_context, api_key=data.get("api_key"), model=data.get("model"))
    return jsonify(res)


# ─────────────────────────────────────────────────────────────────────────────
# Comparison (before vs. after)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/jobs/<job_id>/comparison")
def comparison(job_id):
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found or expired."}), 404

    orig_df = job["original_df"]
    work_df = job["working_df"]

    orig_profile = profile_dataframe(orig_df)
    orig_score = calculate_score(orig_profile)
    work_profile = profile_dataframe(work_df)
    work_score = calculate_score(work_profile)

    return jsonify({
        "before": {
            "row_count": orig_profile["row_count"],
            "col_count": orig_profile["col_count"],
            "missing": orig_profile["total_missing"],
            "duplicates": orig_profile["exact_duplicate_rows"],
            "score": orig_score["score"],
            "grade": orig_score["grade"],
        },
        "after": {
            "row_count": work_profile["row_count"],
            "col_count": work_profile["col_count"],
            "missing": work_profile["total_missing"],
            "duplicates": work_profile["exact_duplicate_rows"],
            "score": work_score["score"],
            "grade": work_score["grade"],
        },
        "operations_applied": len(job["operation_log"]),
        "operation_log": job["operation_log"],
    })


# ─────────────────────────────────────────────────────────────────────────────
# Export
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/jobs/<job_id>/export", methods=["GET", "POST"])
def export(job_id):
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found or expired."}), 404

    body = request.get_json(silent=True) or {}
    fmt = (request.args.get("format") or body.get("format", "csv")).lower()
    df = job["working_df"]
    filename = job["filename"]

    if fmt == "csv":
        result = export_csv(df, filename)
    elif fmt in ("xlsx", "excel"):
        result = export_excel(df, filename)
    elif fmt == "report":
        orig_df = job["original_df"]
        orig_profile = profile_dataframe(orig_df)
        orig_score = calculate_score(orig_profile)
        work_profile = profile_dataframe(df)
        work_score = calculate_score(work_profile)
        result = export_report(
            orig_profile, work_profile,
            orig_score, work_score,
            job["operation_log"],
            filename,
        )
    else:
        return jsonify({"error": f"Unsupported format '{fmt}'. Use csv, xlsx, or report."}), 400

    if not result["ok"]:
        return jsonify({"error": result.get("error", "Export failed.")}), 500

    return send_file(
        io.BytesIO(result["bytes"]),
        mimetype=result["mimetype"],
        as_attachment=True,
        download_name=result["filename"],
    )


# ─────────────────────────────────────────────────────────────────────────────
# Sample dataset download
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/sample")
def sample_dataset():
    """Return a deliberately messy sample CSV for demo purposes."""
    return send_file(
        io.BytesIO(SAMPLE_CSV_CONTENT.encode("utf-8")),
        mimetype="text/csv",
        as_attachment=True,
        download_name="rowbot_sample_messy.csv",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Error handlers
# ─────────────────────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found."}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed."}), 405


@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "An internal server error occurred."}), 500


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", "5000"))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
