"""
cleaning_engine.py
Applies validated cleaning operations to a pandas DataFrame.
Every operation returns an OperationResult with detailed metadata.
"""
import re
import copy
from difflib import SequenceMatcher
import pandas as pd
import numpy as np
from dateutil import parser as dateutil_parser
from datetime import datetime, timezone


# ─────────────────────────────────────────────────────────────────────────────
# Allowlisted operations
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_OPERATIONS = {
    "trim_whitespace",
    "normalize_case",
    "remove_exact_duplicates",
    "remove_key_duplicates",
    "fuzzy_deduplicate",
    "standardize_dates",
    "convert_numeric",
    "fill_missing",
    "remove_empty_rows",
    "remove_empty_columns",
    "normalize_email",
    "normalize_text",
    "rename_column",
    "drop_column",
    "reorder_columns",
}


def apply_operation(df: pd.DataFrame, operation: dict) -> dict:
    """
    Validate and apply a single cleaning operation.
    Returns: {ok, df, log_entry, warnings}
    """
    op_name = operation.get("op")
    if op_name not in ALLOWED_OPERATIONS:
        return {
            "ok": False,
            "error": f"Operation '{op_name}' is not supported.",
        }

    params = operation.get("params", {})
    columns_param = params.get("columns", [])

    # Validate referenced columns exist
    if columns_param:
        missing_cols = [c for c in columns_param if c not in df.columns]
        if missing_cols:
            return {
                "ok": False,
                "error": f"Column(s) not found: {', '.join(missing_cols)}",
            }

    try:
        result = _dispatch(df, op_name, params)
        return result
    except Exception as e:
        return {"ok": False, "error": f"Operation failed: {str(e)}"}


def preview_operation(df: pd.DataFrame, operation: dict) -> dict:
    """Return a preview of changes without mutating *df*."""
    df_copy = df.copy()
    result = apply_operation(df_copy, operation)
    if not result.get("ok"):
        return result

    changed_df = result["df"]
    sample_changes = _build_sample_changes(df, changed_df, operation)

    return {
        "ok": True,
        "rows_affected": result["log_entry"].get("rows_affected", 0),
        "sample_changes": sample_changes,
        "log_entry": result["log_entry"],
        "warnings": result.get("warnings", []),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Dispatcher
# ─────────────────────────────────────────────────────────────────────────────

def _dispatch(df: pd.DataFrame, op_name: str, params: dict) -> dict:
    ops = {
        "trim_whitespace": _trim_whitespace,
        "normalize_case": _normalize_case,
        "remove_exact_duplicates": _remove_exact_duplicates,
        "remove_key_duplicates": _remove_key_duplicates,
        "fuzzy_deduplicate": _fuzzy_deduplicate,
        "standardize_dates": _standardize_dates,
        "convert_numeric": _convert_numeric,
        "fill_missing": _fill_missing,
        "remove_empty_rows": _remove_empty_rows,
        "remove_empty_columns": _remove_empty_columns,
        "normalize_email": _normalize_email,
        "normalize_text": _normalize_text,
        "rename_column": _rename_column,
        "drop_column": _drop_column,
        "reorder_columns": _reorder_columns,
    }
    return ops[op_name](df, params)


# ─────────────────────────────────────────────────────────────────────────────
# Individual operations
# ─────────────────────────────────────────────────────────────────────────────

def _trim_whitespace(df: pd.DataFrame, params: dict) -> dict:
    columns = params.get("columns") or _text_columns(df)
    df_new = df.copy()
    affected = 0
    examples = []
    for col in columns:
        if col not in df_new.columns:
            continue
        original = df_new[col].copy()
        df_new[col] = df_new[col].apply(
            lambda v: v.strip() if isinstance(v, str) else v
        )
        changed = (original != df_new[col]) & original.notna()
        n = int(changed.sum())
        affected += n
        if n > 0 and len(examples) < 3:
            idx = changed[changed].index[0]
            examples.append({
                "column": col,
                "before": str(original.iloc[idx]),
                "after": str(df_new[col].iloc[idx]),
            })

    return _ok_result(df_new, "trim_whitespace", columns, affected, examples)


def _normalize_case(df: pd.DataFrame, params: dict) -> dict:
    columns = params.get("columns") or _text_columns(df)
    mode = params.get("mode", "title")  # title | lower | upper
    df_new = df.copy()
    affected = 0
    examples = []
    for col in columns:
        if col not in df_new.columns:
            continue
        original = df_new[col].copy()
        if mode == "lower":
            df_new[col] = df_new[col].apply(lambda v: v.lower() if isinstance(v, str) else v)
        elif mode == "upper":
            df_new[col] = df_new[col].apply(lambda v: v.upper() if isinstance(v, str) else v)
        else:
            df_new[col] = df_new[col].apply(lambda v: v.title() if isinstance(v, str) else v)

        changed = (original != df_new[col]) & original.notna()
        n = int(changed.sum())
        affected += n
        if n > 0 and len(examples) < 3:
            idx = changed[changed].index[0]
            examples.append({
                "column": col,
                "before": str(original.iloc[idx]),
                "after": str(df_new[col].iloc[idx]),
            })

    return _ok_result(df_new, "normalize_case", columns, affected, examples)


def _remove_exact_duplicates(df: pd.DataFrame, params: dict) -> dict:
    before = len(df)
    df_new = df.drop_duplicates().reset_index(drop=True)
    removed = before - len(df_new)
    return _ok_result(df_new, "remove_exact_duplicates", [], removed, [])


def _remove_key_duplicates(df: pd.DataFrame, params: dict) -> dict:
    columns = params.get("columns", [])
    if not columns:
        return {"ok": False, "error": "Key columns required for remove_key_duplicates."}
    keep = params.get("keep", "first")  # first | last | none
    before = len(df)
    df_new = df.drop_duplicates(subset=columns, keep=keep if keep in ("first", "last") else False)
    df_new = df_new.reset_index(drop=True)
    removed = before - len(df_new)
    return _ok_result(df_new, "remove_key_duplicates", columns, removed, [])


def _fuzzy_deduplicate(df: pd.DataFrame, params: dict) -> dict:
    columns = params.get("columns") or _text_columns(df)
    if not columns:
        columns = list(df.columns)
    threshold = float(params.get("threshold", 0.85))
    keep = params.get("keep", "first")

    df_new = df.copy()
    before_len = len(df_new)
    if before_len < 2:
        return _ok_result(df_new, "fuzzy_deduplicate", columns, 0, [])

    rows_to_drop = set()
    signatures = [
        " ".join(str(df_new.at[i, c]).strip().lower() for c in columns if pd.notna(df_new.at[i, c]))
        for i in range(before_len)
    ]
    examples = []

    for i in range(before_len):
        if i in rows_to_drop:
            continue
        sig_i = signatures[i]
        if not sig_i:
            continue
        for j in range(i + 1, before_len):
            if j in rows_to_drop:
                continue
            sig_j = signatures[j]
            if not sig_j:
                continue
            sim = SequenceMatcher(None, sig_i, sig_j).ratio()
            if sim >= threshold:
                drop_idx = j if keep == "first" else i
                rows_to_drop.add(drop_idx)
                if len(examples) < 3:
                    examples.append({
                        "kept_row": int(i if keep == "first" else j),
                        "dropped_row": int(drop_idx),
                        "similarity": round(float(sim), 3),
                        "kept_text": sig_i if keep == "first" else sig_j,
                        "dropped_text": sig_j if keep == "first" else sig_i,
                    })
                if keep != "first":
                    break

    df_result = df_new.drop(index=list(rows_to_drop)).reset_index(drop=True)
    removed = len(rows_to_drop)
    return _ok_result(df_result, "fuzzy_deduplicate", columns, removed, examples)


def _standardize_dates(df: pd.DataFrame, params: dict) -> dict:
    columns = params.get("columns") or _date_candidate_columns(df)
    target_format = params.get("format", "%Y-%m-%d")
    dayfirst = bool(params.get("dayfirst", False))
    if "ambiguous_preference" in params:
        dayfirst = str(params["ambiguous_preference"]).upper() in ("DMY", "DAYFIRST")

    df_new = df.copy()
    affected = 0
    skipped = 0
    examples = []
    warnings = []

    for col in columns:
        if col not in df_new.columns:
            continue
        original = df_new[col].copy()
        new_vals = []
        for v in original:
            if pd.isna(v) or str(v).strip() == "":
                new_vals.append(v)
                continue
            try:
                parsed = dateutil_parser.parse(str(v), dayfirst=dayfirst)
                new_vals.append(parsed.strftime(target_format))
            except Exception:
                new_vals.append(v)
                skipped += 1
        df_new[col] = new_vals
        changed = (original != df_new[col]) & original.notna()
        n = int(changed.sum())
        affected += n
        if n > 0 and len(examples) < 3:
            idx = changed[changed].index[0]
            examples.append({
                "column": col,
                "before": str(original.iloc[idx]),
                "after": str(df_new[col].iloc[idx]),
            })

    if skipped:
        warnings.append(f"{skipped} values could not be parsed as dates and were left unchanged.")

    return _ok_result(df_new, "standardize_dates", columns, affected, examples, warnings)


def _convert_numeric(df: pd.DataFrame, params: dict) -> dict:
    columns = params.get("columns") or _numeric_text_columns(df)
    df_new = df.copy()
    affected = 0
    examples = []
    warnings = []

    for col in columns:
        if col not in df_new.columns:
            continue
        original = df_new[col].copy()
        converted = pd.to_numeric(df_new[col], errors="coerce")
        changed_mask = (converted.notna()) & (original != converted.astype(str))
        n = int(changed_mask.sum())
        affected += n
        df_new[col] = converted
        if n > 0 and len(examples) < 3:
            idx = changed_mask[changed_mask].index[0]
            examples.append({
                "column": col,
                "before": str(original.iloc[idx]),
                "after": str(df_new[col].iloc[idx]),
            })
        unconvertible = int(converted.isna().sum()) - int(original.isna().sum())
        if unconvertible > 0:
            warnings.append(f"{unconvertible} values in '{col}' could not be converted and became null.")

    return _ok_result(df_new, "convert_numeric", columns, affected, examples, warnings)


def _fill_missing(df: pd.DataFrame, params: dict) -> dict:
    columns = params.get("columns") or list(df.columns)
    method = params.get("method", "median")  # median | mean | mode | value | forward | backward
    fill_value = params.get("value", "")
    df_new = df.copy()
    affected = 0
    examples = []
    warnings = []

    for col in columns:
        if col not in df_new.columns:
            continue
        missing_mask = df_new[col].isna()
        n_missing = int(missing_mask.sum())
        if n_missing == 0:
            continue

        original_sample = df_new.loc[missing_mask, col].copy()

        if method == "median":
            num = pd.to_numeric(df_new[col], errors="coerce")
            med = num.median()
            if pd.isna(med):
                warnings.append(f"Cannot compute median for '{col}' (non-numeric). Skipped.")
                continue
            df_new.loc[missing_mask, col] = str(round(med, 4))
        elif method == "mean":
            num = pd.to_numeric(df_new[col], errors="coerce")
            mn = num.mean()
            if pd.isna(mn):
                warnings.append(f"Cannot compute mean for '{col}' (non-numeric). Skipped.")
                continue
            df_new.loc[missing_mask, col] = str(round(mn, 4))
        elif method == "mode":
            mode_vals = df_new[col].dropna().mode()
            if len(mode_vals) == 0:
                warnings.append(f"No mode value for '{col}'. Skipped.")
                continue
            df_new.loc[missing_mask, col] = str(mode_vals.iloc[0])
        elif method == "value":
            df_new.loc[missing_mask, col] = str(fill_value)
        elif method == "forward":
            df_new[col] = df_new[col].fillna(method="ffill")
        elif method == "backward":
            df_new[col] = df_new[col].fillna(method="bfill")
        else:
            warnings.append(f"Unknown fill method '{method}'. Skipped '{col}'.")
            continue

        affected += n_missing
        if len(examples) < 3 and n_missing > 0:
            idx = missing_mask[missing_mask].index[0]
            examples.append({
                "column": col,
                "before": "(missing)",
                "after": str(df_new[col].iloc[idx]),
            })

    return _ok_result(df_new, "fill_missing", columns, affected, examples, warnings)


def _remove_empty_rows(df: pd.DataFrame, params: dict) -> dict:
    before = len(df)
    df_new = df.dropna(how="all").reset_index(drop=True)
    removed = before - len(df_new)
    return _ok_result(df_new, "remove_empty_rows", [], removed, [])


def _remove_empty_columns(df: pd.DataFrame, params: dict) -> dict:
    empty_cols = [col for col in df.columns if df[col].isna().all()]
    df_new = df.drop(columns=empty_cols)
    return _ok_result(df_new, "remove_empty_columns", empty_cols, len(empty_cols), [])


def _clean_single_email(v, remove_invalid=True):
    if v is None or pd.isna(v):
        return v
    s = str(v).strip()
    if not s or s.lower() in ("nan", "none", "null", "n/a", "na", "-", "undefined"):
        return v

    # 1. Lowercase
    cleaned = s.lower()

    # 2. Remove all spaces inside email address (e.g. 'quinn @example.com' -> 'quinn@example.com')
    cleaned = re.sub(r"\s+", "", cleaned)

    # 3. Strip stray punctuation from edges (dots, commas, semicolons, angle brackets, quotes)
    cleaned = cleaned.strip(".,;:<>[](){}'\"")

    # 4. Collapse multiple consecutive '@' or '..'
    cleaned = re.sub(r"@+", "@", cleaned)
    cleaned = re.sub(r"\.+", ".", cleaned)
    cleaned = cleaned.replace(".@", "@").replace("@.", "@")

    # 5. Check valid email pattern
    email_pat = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
    if not email_pat.match(cleaned):
        if remove_invalid:
            return ""  # Clear corrupted/unfixable email strings
        if cleaned.endswith("@"):
            cleaned = cleaned.rstrip("@")

    return cleaned


def _normalize_email(df: pd.DataFrame, params: dict) -> dict:
    columns = params.get("columns") or _email_columns(df)
    remove_invalid = params.get("remove_invalid", True)
    df_new = df.copy()
    affected = 0
    examples = []

    for col in columns:
        if col not in df_new.columns:
            continue
        original = df_new[col].copy()
        df_new[col] = df_new[col].apply(
            lambda v: _clean_single_email(v, remove_invalid=remove_invalid)
        )
        changed = (original.fillna("") != df_new[col].fillna("")) & original.notna()
        n = int(changed.sum())
        affected += n
        if n > 0 and len(examples) < 3:
            for idx in changed[changed].index[:3]:
                examples.append({
                    "column": col,
                    "before": str(original.iloc[idx]),
                    "after": str(df_new[col].iloc[idx]),
                })
                if len(examples) >= 3:
                    break

    return _ok_result(df_new, "normalize_email", columns, affected, examples)


def _normalize_text(df: pd.DataFrame, params: dict) -> dict:
    """Remove extra internal whitespace and strip."""
    columns = params.get("columns") or _text_columns(df)
    df_new = df.copy()
    affected = 0
    examples = []

    for col in columns:
        if col not in df_new.columns:
            continue
        original = df_new[col].copy()
        df_new[col] = df_new[col].apply(
            lambda v: re.sub(r"\s+", " ", v).strip() if isinstance(v, str) else v
        )
        changed = (original != df_new[col]) & original.notna()
        n = int(changed.sum())
        affected += n
        if n > 0 and len(examples) < 3:
            idx = changed[changed].index[0]
            examples.append({
                "column": col,
                "before": str(original.iloc[idx]),
                "after": str(df_new[col].iloc[idx]),
            })

    return _ok_result(df_new, "normalize_text", columns, affected, examples)


def _rename_column(df: pd.DataFrame, params: dict) -> dict:
    old_name = params.get("old_name")
    new_name = params.get("new_name")
    if not old_name or not new_name:
        return {"ok": False, "error": "rename_column requires old_name and new_name params."}
    if old_name not in df.columns:
        return {"ok": False, "error": f"Column '{old_name}' not found."}
    df_new = df.rename(columns={old_name: new_name})
    return _ok_result(df_new, "rename_column", [old_name], 0, [])


def _drop_column(df: pd.DataFrame, params: dict) -> dict:
    columns = params.get("columns", [])
    if not columns:
        return {"ok": False, "error": "drop_column requires a list of columns."}
    df_new = df.drop(columns=[c for c in columns if c in df.columns])
    return _ok_result(df_new, "drop_column", columns, len(columns), [])


def _reorder_columns(df: pd.DataFrame, params: dict) -> dict:
    new_order = params.get("order", [])
    if not new_order:
        return {"ok": False, "error": "reorder_columns requires an order list."}
    valid = [c for c in new_order if c in df.columns]
    rest = [c for c in df.columns if c not in valid]
    df_new = df[valid + rest]
    return _ok_result(df_new, "reorder_columns", valid, 0, [])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _text_columns(df: pd.DataFrame) -> list:
    return [col for col in df.columns if df[col].dtype == object]


def _numeric_text_columns(df: pd.DataFrame) -> list:
    result = []
    for col in df.columns:
        if df[col].dtype == object:
            numeric_pct = pd.to_numeric(df[col], errors="coerce").notna().mean()
            if numeric_pct > 0.5:
                result.append(col)
    return result


def _date_candidate_columns(df: pd.DataFrame) -> list:
    from services.profiler import _is_date_like
    result = []
    for col in df.columns:
        if df[col].dtype == object:
            sample = df[col].dropna().astype(str).iloc[:20]
            date_count = sum(1 for v in sample if _is_date_like(v))
            if len(sample) > 0 and date_count / len(sample) > 0.5:
                result.append(col)
    return result


def _email_columns(df: pd.DataFrame) -> list:
    result = []
    for col in df.columns:
        if re.search(r"email|mail", col, re.I):
            result.append(col)
        elif df[col].dtype == object:
            if df[col].dropna().astype(str).iloc[:5].str.contains("@").any():
                result.append(col)
    return result


def _ok_result(df_new, op_name, columns, affected, examples, warnings=None) -> dict:
    return {
        "ok": True,
        "df": df_new,
        "log_entry": {
            "op": op_name,
            "columns": columns,
            "rows_affected": affected,
            "examples": examples,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "warnings": warnings or [],
    }


def _build_sample_changes(before_df: pd.DataFrame, after_df: pd.DataFrame, operation: dict) -> list:
    """Build a list of sample before/after cell changes."""
    samples = []
    try:
        if before_df.shape == after_df.shape:
            for col in before_df.columns:
                if col not in after_df.columns:
                    continue
                diff = before_df[col] != after_df[col]
                diff = diff & before_df[col].notna()
                for idx in diff[diff].index[:3]:
                    samples.append({
                        "row": int(idx),
                        "column": col,
                        "before": str(before_df.at[idx, col]),
                        "after": str(after_df.at[idx, col]),
                    })
                    if len(samples) >= 10:
                        break
                if len(samples) >= 10:
                    break
        else:
            samples.append({
                "note": f"Row count changed from {len(before_df)} to {len(after_df)}"
            })
    except Exception:
        pass
    return samples
