"""
profiler.py
Analyses a pandas DataFrame and produces a detailed data-quality profile.
"""
import re
import pandas as pd
import numpy as np
from difflib import SequenceMatcher
from dateutil import parser as dateutil_parser


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────

def profile_dataframe(df: pd.DataFrame) -> dict:
    """Return a complete quality profile for *df*."""
    total_rows, total_cols = df.shape
    total_cells = total_rows * total_cols

    columns = []
    for col in df.columns:
        col_profile = _profile_column(df[col], total_rows)
        columns.append(col_profile)

    # Duplicate analysis
    exact_dupes = int(df.duplicated().sum())
    potential_dupes = _detect_potential_duplicates(df)

    # Overall missing
    total_missing = sum(c["missing_count"] for c in columns)
    missing_pct = round(total_missing / total_cells * 100, 2) if total_cells else 0

    # Aggregate issue counts
    issues = _aggregate_issues(columns, exact_dupes, potential_dupes)

    return {
        "row_count": total_rows,
        "col_count": total_cols,
        "total_cells": total_cells,
        "exact_duplicate_rows": exact_dupes,
        "potential_duplicate_groups": potential_dupes,
        "total_missing": total_missing,
        "missing_pct": missing_pct,
        "columns": columns,
        "issues": issues,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Column profiling
# ─────────────────────────────────────────────────────────────────────────────

def _profile_column(series: pd.Series, total_rows: int) -> dict:
    col_name = str(series.name)
    n = len(series)

    # Treat NaN (from na_values in loader) as missing
    missing_mask = series.isna()
    missing_count = int(missing_mask.sum())
    non_null = series[~missing_mask]
    unique_count = int(non_null.nunique())

    # Inferred dtype
    inferred_type = _infer_type(non_null)

    # Whitespace issues
    if inferred_type in ("text", "mixed"):
        str_series = non_null.astype(str)
        leading_trailing = int((str_series != str_series.str.strip()).sum())
        inconsistent_case = _check_inconsistent_case(str_series)
    else:
        leading_trailing = 0
        inconsistent_case = False

    # Date format inconsistency and ambiguity
    date_formats_inconsistent = False
    ambiguous_date_count = 0
    if inferred_type in ("text", "date"):
        date_formats_inconsistent = _check_date_format_inconsistency(non_null)
        ambiguous_date_count = _count_ambiguous_dates(non_null)

    # Numeric-as-text
    numeric_as_text = False
    if inferred_type == "text":
        numeric_as_text = _check_numeric_as_text(non_null)

    # Email check
    has_email_issues = False
    if inferred_type == "text" and _looks_like_email_column(col_name, non_null):
        has_email_issues = _check_email_issues(non_null)

    # Phone check
    has_phone_issues = False
    if inferred_type == "text" and _looks_like_phone_column(col_name):
        has_phone_issues = _check_phone_issues(non_null)

    # Mixed types
    mixed_types = inferred_type == "mixed"

    # Constant column
    is_constant = unique_count <= 1 and n > 0

    # Outlier detection for numeric columns
    outliers = []
    if inferred_type == "numeric":
        outliers = _detect_outliers(non_null)

    # Stats for numeric
    stats = {}
    if inferred_type == "numeric":
        num_series = pd.to_numeric(non_null, errors="coerce").dropna()
        if len(num_series) > 0:
            stats = {
                "min": round(float(num_series.min()), 4),
                "max": round(float(num_series.max()), 4),
                "mean": round(float(num_series.mean()), 4),
                "median": round(float(num_series.median()), 4),
                "std": round(float(num_series.std()), 4),
            }

    # Sample values (first 5 non-null)
    sample_values = non_null.dropna().iloc[:5].tolist() if len(non_null) > 0 else []

    profile = {
        "name": col_name,
        "type": inferred_type,
        "total": n,
        "missing_count": missing_count,
        "missing_pct": round(missing_count / n * 100, 2) if n else 0,
        "unique_count": int(unique_count),
        "is_constant": bool(is_constant),
        "leading_trailing_spaces": int(leading_trailing),
        "inconsistent_case": bool(inconsistent_case),
        "date_formats_inconsistent": bool(date_formats_inconsistent),
        "ambiguous_date_count": int(ambiguous_date_count),
        "numeric_as_text": bool(numeric_as_text),
        "has_email_issues": bool(has_email_issues),
        "has_phone_issues": bool(has_phone_issues),
        "mixed_types": bool(mixed_types),
        "outlier_count": int(len(outliers)),
        "stats": stats,
        "sample_values": [str(v) for v in sample_values],
    }
    return profile


# ─────────────────────────────────────────────────────────────────────────────
# Type inference
# ─────────────────────────────────────────────────────────────────────────────

def _infer_type(series: pd.Series) -> str:
    """Infer a high-level type label for a non-null series (loaded as str)."""
    if len(series) == 0:
        return "text"

    sample = series.dropna().astype(str)
    if len(sample) == 0:
        return "text"

    n = len(sample)
    numeric_count = pd.to_numeric(sample, errors="coerce").notna().sum()
    date_count = _count_parseable_dates(sample)

    numeric_ratio = numeric_count / n
    date_ratio = date_count / n

    if numeric_ratio > 0.8:
        return "numeric"
    if date_ratio > 0.8:
        return "date"
    if 0.3 < numeric_ratio <= 0.8:
        return "mixed"
    return "text"


def _count_parseable_dates(sample: pd.Series, limit: int = 50) -> int:
    """Count how many values look like dates (sample up to *limit* rows)."""
    subset = sample.iloc[:limit]
    count = 0
    for v in subset:
        v = str(v).strip()
        if _is_date_like(v):
            count += 1
    # Scale back to full sample
    return int(count / len(subset) * len(sample)) if len(subset) > 0 else 0


def _is_date_like(v: str) -> bool:
    """Heuristic: does this string look like a date?"""
    # Quick reject for purely numeric
    if re.fullmatch(r"\d{1,4}", v):
        return False
    date_patterns = [
        r"\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}",
        r"\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2}",
        r"[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}",
        r"\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}",
    ]
    for pat in date_patterns:
        if re.search(pat, v):
            return True
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Issue checks
# ─────────────────────────────────────────────────────────────────────────────

def _check_inconsistent_case(series: pd.Series) -> bool:
    """Return True if text column has inconsistent capitalisation."""
    alpha_only = series[series.str.match(r"^[A-Za-z\s]+$")]
    if len(alpha_only) < 2:
        return False
    upper_count = (alpha_only == alpha_only.str.upper()).sum()
    lower_count = (alpha_only == alpha_only.str.lower()).sum()
    title_count = (alpha_only == alpha_only.str.title()).sum()
    n = len(alpha_only)
    max_consistent = max(upper_count, lower_count, title_count)
    return max_consistent < (n * 0.9)


def _check_date_format_inconsistency(series: pd.Series) -> bool:
    """Detect if dates appear in multiple formats."""
    date_vals = series[series.apply(lambda v: _is_date_like(str(v)))]
    if len(date_vals) < 2:
        return False
    formats_seen = set()
    for v in date_vals.iloc[:50]:
        fmt = _guess_date_format(str(v))
        if fmt:
            formats_seen.add(fmt)
    return len(formats_seen) > 1


def _guess_date_format(v: str) -> str | None:
    patterns = [
        (r"^\d{4}-\d{2}-\d{2}$", "ISO"),
        (r"^\d{2}/\d{2}/\d{4}$", "MM/DD/YYYY"),
        (r"^\d{2}-\d{2}-\d{4}$", "MM-DD-YYYY"),
        (r"^\d{1,2}/\d{1,2}/\d{2,4}$", "SHORT_SLASH"),
        (r"^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$", "LONG"),
        (r"^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$", "EU_LONG"),
        (r"^\d{8}$", "YYYYMMDD"),
    ]
    for pat, label in patterns:
        if re.match(pat, v.strip()):
            return label
    return None


def _check_numeric_as_text(series: pd.Series) -> bool:
    """Return True if >50% of values are numeric-looking strings."""
    numeric_pct = pd.to_numeric(series, errors="coerce").notna().mean()
    return 0.5 < numeric_pct < 1.0  # some are numeric, not all


def _looks_like_email_column(col_name: str, series: pd.Series) -> bool:
    if re.search(r"email|e[-_]?mail|mail", col_name, re.I):
        return True
    if len(series) > 0:
        return series.iloc[:5].astype(str).str.contains("@").any()
    return False


def _check_email_issues(series: pd.Series) -> bool:
    """Return True if any non-empty value in an email column has formatting issues."""
    email_pat = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
    # Filter out empty, NaN, or placeholder strings so missing values are not falsely treated as invalid emails
    non_blank = series.dropna().astype(str).str.strip()
    non_blank = non_blank[~non_blank.str.lower().isin(["", "nan", "none", "null", "n/a", "na", "-", "undefined"])]
    if len(non_blank) == 0:
        return False
    # Check for whitespace inside the email address, uppercase letters, or invalid pattern
    has_ws = non_blank.str.contains(r"\s").any()
    has_upper = (non_blank != non_blank.str.lower()).any()
    invalid_structure = (~non_blank.str.match(email_pat)).sum()
    return bool(has_ws or has_upper or (invalid_structure > 0))


def _looks_like_phone_column(col_name: str) -> bool:
    return bool(re.search(r"phone|mobile|cell|tel", col_name, re.I))


def _check_phone_issues(series: pd.Series) -> bool:
    """Return True if phone numbers appear in inconsistent formats."""
    formats = set()
    for v in series.iloc[:50].astype(str):
        v_stripped = re.sub(r"\D", "", v)
        if len(v_stripped) >= 7:
            # Classify by format cues
            if v.startswith("+"):
                formats.add("intl")
            elif "(" in v:
                formats.add("us_paren")
            elif "-" in v:
                formats.add("dashes")
            else:
                formats.add("digits")
    return len(formats) > 1


def _detect_outliers(series: pd.Series) -> list:
    """Detect outliers using IQR method."""
    nums = pd.to_numeric(series, errors="coerce").dropna()
    if len(nums) < 4:
        return []
    q1, q3 = nums.quantile(0.25), nums.quantile(0.75)
    iqr = q3 - q1
    if iqr == 0:
        return []
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    outlier_vals = nums[(nums < lower) | (nums > upper)]
    return outlier_vals.tolist()


# ─────────────────────────────────────────────────────────────────────────────
# Ambiguous dates & potential duplicates
# ─────────────────────────────────────────────────────────────────────────────

def _count_ambiguous_dates(series: pd.Series) -> int:
    """
    Count dates where day and month cannot be unambiguously distinguished
    e.g., '03/04/2023' where both 03 and 04 are <= 12.
    """
    count = 0
    ambig_pattern = re.compile(r"^\s*0?([1-9]|1[0-2])[/\-\.](0?[1-9]|1[0-2])[/\-\.](\d{2,4})\s*$")
    for v in series.dropna().astype(str).iloc[:200]:
        v_str = v.strip()
        m = ambig_pattern.match(v_str)
        if m:
            count += 1
    return count


def _detect_potential_duplicates(df: pd.DataFrame, threshold: float = 0.85, max_rows: int = 300) -> list:
    """
    Find clusters or pairs of rows that have high text similarity but are not exact duplicates.
    Restricted to sample up to max_rows to ensure fast response times.
    """
    if len(df) < 2:
        return []

    text_cols = [c for c in df.columns if df[c].dtype == object]
    if not text_cols:
        text_cols = list(df.columns)

    sample_df = df.iloc[:max_rows]
    signatures = []
    for idx, row in sample_df.iterrows():
        sig = " ".join(str(row[c]).strip().lower() for c in text_cols if pd.notna(row[c]))
        signatures.append((idx, sig))

    groups = []
    seen_indices = set()
    n = len(signatures)

    for i in range(n):
        idx_i, sig_i = signatures[i]
        if not sig_i or idx_i in seen_indices:
            continue
        current_group = []
        for j in range(i + 1, min(n, i + 50)):
            idx_j, sig_j = signatures[j]
            if idx_j in seen_indices or not sig_j:
                continue
            if sig_i == sig_j:
                continue
            len_ratio = len(sig_i) / max(len(sig_j), 1)
            if len_ratio < 0.6 or len_ratio > 1.6:
                continue
            sim = SequenceMatcher(None, sig_i, sig_j).ratio()
            if sim >= threshold:
                current_group.append({
                    "row_index": int(idx_j),
                    "similarity": round(float(sim), 3),
                    "preview": {str(c): str(sample_df.at[idx_j, c]) for c in text_cols[:3]},
                })
                seen_indices.add(idx_j)

        if current_group:
            seen_indices.add(idx_i)
            groups.append({
                "base_row_index": int(idx_i),
                "base_preview": {str(c): str(sample_df.at[idx_i, c]) for c in text_cols[:3]},
                "matches": current_group,
            })
            if len(groups) >= 20:
                break

    return groups


# ─────────────────────────────────────────────────────────────────────────────
# Issue aggregation
# ─────────────────────────────────────────────────────────────────────────────

def _aggregate_issues(columns: list, exact_dupes: int, potential_dupes: list = None) -> list:
    issues = []

    if exact_dupes > 0:
        issues.append({
            "id": "exact_duplicates",
            "severity": "high",
            "title": "Exact Duplicate Rows",
            "count": exact_dupes,
            "description": f"{exact_dupes} rows are exact copies of another row.",
        })

    if potential_dupes:
        issues.append({
            "id": "potential_duplicates",
            "severity": "medium",
            "title": "Potential / Fuzzy Duplicates",
            "count": len(potential_dupes),
            "description": f"Found {len(potential_dupes)} groups of similar records with >= 85% text similarity.",
        })

    total_missing = sum(c["missing_count"] for c in columns)
    if total_missing > 0:
        issues.append({
            "id": "missing_values",
            "severity": "high" if total_missing > 10 else "medium",
            "title": "Missing Values",
            "count": total_missing,
            "description": f"{total_missing} cells have missing values across {sum(1 for c in columns if c['missing_count'] > 0)} columns.",
        })

    ws_cols = [c["name"] for c in columns if c["leading_trailing_spaces"] > 0]
    if ws_cols:
        total_ws = sum(c["leading_trailing_spaces"] for c in columns)
        issues.append({
            "id": "whitespace",
            "severity": "low",
            "title": "Leading/Trailing Whitespace",
            "count": total_ws,
            "description": f"{total_ws} cells have extra whitespace in: {', '.join(ws_cols[:5])}{'...' if len(ws_cols) > 5 else ''}.",
        })

    case_cols = [c["name"] for c in columns if c["inconsistent_case"]]
    if case_cols:
        issues.append({
            "id": "inconsistent_case",
            "severity": "medium",
            "title": "Inconsistent Capitalisation",
            "count": len(case_cols),
            "description": f"Inconsistent casing found in: {', '.join(case_cols[:5])}{'...' if len(case_cols) > 5 else ''}.",
        })

    date_cols = [c["name"] for c in columns if c["date_formats_inconsistent"]]
    if date_cols:
        issues.append({
            "id": "date_formats",
            "severity": "medium",
            "title": "Inconsistent Date Formats",
            "count": len(date_cols),
            "description": f"Multiple date formats detected in: {', '.join(date_cols)}.",
        })

    ambig_date_cols = [c["name"] for c in columns if c.get("ambiguous_date_count", 0) > 0]
    if ambig_date_cols:
        total_ambig = sum(c.get("ambiguous_date_count", 0) for c in columns)
        issues.append({
            "id": "ambiguous_dates",
            "severity": "medium",
            "title": "Ambiguous Date Formats",
            "count": total_ambig,
            "description": f"{total_ambig} dates could be interpreted as MM/DD or DD/MM in: {', '.join(ambig_date_cols)}.",
        })

    num_text_cols = [c["name"] for c in columns if c["numeric_as_text"]]
    if num_text_cols:
        issues.append({
            "id": "numeric_as_text",
            "severity": "low",
            "title": "Numbers Stored as Text",
            "count": len(num_text_cols),
            "description": f"Numeric-looking values stored as text in: {', '.join(num_text_cols[:5])}.",
        })

    email_cols = [c["name"] for c in columns if c["has_email_issues"]]
    if email_cols:
        issues.append({
            "id": "email_issues",
            "severity": "medium",
            "title": "Invalid Email Formats",
            "count": len(email_cols),
            "description": f"Email format issues found in: {', '.join(email_cols)}.",
        })

    phone_cols = [c["name"] for c in columns if c["has_phone_issues"]]
    if phone_cols:
        issues.append({
            "id": "phone_issues",
            "severity": "low",
            "title": "Inconsistent Phone Formats",
            "count": len(phone_cols),
            "description": f"Phone format inconsistencies in: {', '.join(phone_cols)}.",
        })

    constant_cols = [c["name"] for c in columns if c["is_constant"] and c["total"] > 0]
    if constant_cols:
        issues.append({
            "id": "constant_columns",
            "severity": "low",
            "title": "Constant Columns",
            "count": len(constant_cols),
            "description": f"These columns have only one unique value: {', '.join(constant_cols)}.",
        })

    outlier_cols = [c["name"] for c in columns if c["outlier_count"] > 0]
    if outlier_cols:
        issues.append({
            "id": "outliers",
            "severity": "low",
            "title": "Potential Outliers",
            "count": sum(c["outlier_count"] for c in columns),
            "description": f"Statistical outliers detected in: {', '.join(outlier_cols[:5])}. Review before removing.",
        })

    return issues
