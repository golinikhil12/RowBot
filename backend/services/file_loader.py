"""
file_loader.py
Responsible for safely loading CSV and Excel files into pandas DataFrames.
"""
import io
import os
import re
import chardet
import pandas as pd
import numpy as np
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "55"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


def validate_file(file_storage) -> dict:
    """Validate uploaded file before reading. Returns dict with ok/error."""
    filename = secure_filename(file_storage.filename)
    if not filename:
        return {"ok": False, "error": "No filename provided."}

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return {
            "ok": False,
            "error": f"Unsupported file type '{ext}'. Please upload .csv, .xlsx, or .xls files.",
        }

    # Check size by reading into memory buffer
    file_storage.seek(0, 2)  # seek to end
    size = file_storage.tell()
    file_storage.seek(0)

    if size == 0:
        return {"ok": False, "error": "The uploaded file is empty."}
    if size > MAX_FILE_SIZE_BYTES:
        mb = size / (1024 * 1024)
        return {
            "ok": False,
            "error": f"File is {mb:.1f} MB. Maximum allowed size is {MAX_FILE_SIZE_MB} MB.",
        }

    return {"ok": True, "filename": filename, "size": size, "ext": ext}


def load_csv(file_bytes: bytes) -> dict:
    """Load CSV bytes into a DataFrame, auto-detecting encoding and delimiter."""
    # Detect encoding
    detected = chardet.detect(file_bytes)
    encoding = detected.get("encoding") or "utf-8"

    errors = []
    delimiter = ","

    # Try to sniff delimiter
    try:
        sample = file_bytes[:4096].decode(encoding, errors="replace")
        import csv
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        delimiter = dialect.delimiter
    except Exception:
        delimiter = ","

    try:
        df = pd.read_csv(
            io.BytesIO(file_bytes),
            encoding=encoding,
            sep=delimiter,
            dtype=str,  # load everything as str first; we'll infer types later
            keep_default_na=False,
            na_values=["", "NA", "N/A", "nan", "NaN", "NULL", "null", "None", "none", "#N/A"],
        )
    except Exception as e:
        return {"ok": False, "error": f"Failed to parse CSV: {str(e)}"}

    if df.empty:
        return {"ok": False, "error": "CSV file has no data rows."}

    # Sanitize column names
    df.columns = [_sanitize_col_name(c) for c in df.columns]

    return {
        "ok": True,
        "df": df,
        "encoding": encoding,
        "delimiter": delimiter,
        "warnings": errors,
    }


def load_excel(file_bytes: bytes) -> dict:
    """Load Excel bytes, returning sheet names and the first sheet's DataFrame."""
    try:
        xl = pd.ExcelFile(io.BytesIO(file_bytes), engine=None)
        sheet_names = xl.sheet_names
    except Exception as e:
        return {"ok": False, "error": f"Failed to open Excel file: {str(e)}"}

    return {"ok": True, "sheet_names": sheet_names, "excel_bytes": file_bytes}


def load_excel_sheet(file_bytes: bytes, sheet_name: str) -> dict:
    """Load a specific sheet from an Excel file."""
    try:
        df = pd.read_excel(
            io.BytesIO(file_bytes),
            sheet_name=sheet_name,
            dtype=str,
            keep_default_na=False,
            na_values=["", "NA", "N/A", "nan", "NaN", "NULL", "null", "None", "none", "#N/A"],
            engine=None,
        )
    except Exception as e:
        return {"ok": False, "error": f"Failed to load sheet '{sheet_name}': {str(e)}"}

    if df.empty:
        return {"ok": False, "error": f"Sheet '{sheet_name}' has no data rows."}

    df.columns = [_sanitize_col_name(c) for c in df.columns]
    return {"ok": True, "df": df}


def _sanitize_col_name(name) -> str:
    """Strip column names of leading/trailing whitespace."""
    return str(name).strip()


def df_to_records(df: pd.DataFrame) -> list:
    """Convert DataFrame to JSON-serialisable list of dicts, handling NaN/NaT."""
    def _clean(v):
        if v is None:
            return None
        if isinstance(v, float) and np.isnan(v):
            return None
        return v

    records = []
    for row in df.to_dict(orient="records"):
        records.append({k: _clean(v) for k, v in row.items()})
    return records
