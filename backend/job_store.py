"""
job_store.py
In-memory store for cleaning jobs with TTL cleanup.
Each job holds: original_df, working_df, metadata, operation_log.
"""
import time
import threading
import uuid
import os

_store: dict = {}
_lock = threading.Lock()

JOB_TTL_SECONDS = int(os.getenv("JOB_TTL_MINUTES", "60")) * 60


def create_job(original_df, filename: str, sheet_name: str = None, file_type: str = "csv") -> str:
    """Create and store a new job. Returns job_id."""
    job_id = str(uuid.uuid4())
    with _lock:
        _store[job_id] = {
            "id": job_id,
            "created_at": time.time(),
            "filename": filename,
            "sheet_name": sheet_name,
            "file_type": file_type,
            "original_df": original_df.copy(),
            "working_df": original_df.copy(),
            "undo_stack": [],  # list of DataFrames
            "operation_log": [],
            "profile": None,
            "quality_score": None,
        }
    return job_id


def get_job(job_id: str) -> dict | None:
    """Retrieve a job by ID or None if not found / expired."""
    with _lock:
        job = _store.get(job_id)
        if job and (time.time() - job["created_at"]) > JOB_TTL_SECONDS:
            del _store[job_id]
            return None
        return job


def update_working_df(job_id: str, new_df, log_entry: dict):
    """Push a new working DataFrame onto the job, saving undo state."""
    with _lock:
        job = _store.get(job_id)
        if not job:
            return False
        job["undo_stack"].append(job["working_df"].copy())
        # Keep undo stack bounded
        if len(job["undo_stack"]) > 50:
            job["undo_stack"].pop(0)
        job["working_df"] = new_df.copy()
        job["operation_log"].append(log_entry)
        # Invalidate cached profile/score
        job["profile"] = None
        job["quality_score"] = None
        return True


def undo_last(job_id: str) -> dict | None:
    """Undo the last operation. Returns the restored log_entry or None."""
    with _lock:
        job = _store.get(job_id)
        if not job or not job["undo_stack"]:
            return None
        job["working_df"] = job["undo_stack"].pop()
        if job["operation_log"]:
            entry = job["operation_log"].pop()
        else:
            entry = {}
        job["profile"] = None
        job["quality_score"] = None
        return entry


def set_profile(job_id: str, profile: dict, score: dict):
    with _lock:
        job = _store.get(job_id)
        if job:
            job["profile"] = profile
            job["quality_score"] = score


def list_jobs() -> list:
    """Return summary metadata for all active jobs."""
    with _lock:
        summaries = []
        for jid, j in list(_store.items()):
            try:
                df = j.get("working_df")
                row_count = int(len(df)) if df is not None else 0
                col_count = int(len(df.columns)) if df is not None else 0
                score_obj = j.get("quality_score") or {}
                summaries.append({
                    "id": str(jid),
                    "filename": str(j.get("filename", "unknown")),
                    "file_type": str(j.get("file_type", "csv")),
                    "created_at": float(j.get("created_at", 0)),
                    "row_count": row_count,
                    "col_count": col_count,
                    "has_profile": bool(j.get("profile") is not None),
                    "quality_score": score_obj.get("score"),
                    "ops_count": int(len(j.get("operation_log", []))),
                })
            except Exception as e:
                print(f"Error summarizing job {jid}: {e}")
        return summaries


def cleanup_expired():
    """Remove expired jobs. Call periodically."""
    now = time.time()
    with _lock:
        expired = [jid for jid, j in _store.items() if now - j["created_at"] > JOB_TTL_SECONDS]
        for jid in expired:
            del _store[jid]


def _start_cleanup_thread():
    def _run():
        while True:
            time.sleep(300)  # Every 5 minutes
            cleanup_expired()
    t = threading.Thread(target=_run, daemon=True)
    t.start()


_start_cleanup_thread()
