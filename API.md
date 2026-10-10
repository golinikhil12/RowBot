# RowBot REST API Specification

RowBot exposes a comprehensive RESTful API under the `/api` prefix. All requests and responses use JSON format unless streaming binary downloads.

---

## 1. Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/upload` | Upload CSV or Excel file and initialize a cleaning job |
| `POST` | `/api/demo` | Initialize a sample demo dataset session with deliberate quality defects |
| `GET` | `/api/jobs/<job_id>/profile` | Retrieve complete quality profile and score for the working copy |
| `GET` | `/api/jobs/<job_id>/data` | Retrieve paginated table rows with column metadata |
| `POST` | `/api/jobs/<job_id>/preview` | Preview the impact of a cleaning operation without applying it |
| `POST` | `/api/jobs/<job_id>/apply` | Apply a validated cleaning operation to the working dataset |
| `POST` | `/api/jobs/<job_id>/undo` | Undo the last applied operation and restore previous DataFrame state |
| `GET` | `/api/jobs/<job_id>/log` | Retrieve the chronological operation audit log |
| `GET` | `/api/jobs/<job_id>/comparison` | Retrieve statistical comparison between original and working copies |
| `GET` | `/api/jobs/<job_id>/export` | Download the cleaned dataset in CSV or styled Excel `.xlsx` format |
| `POST` | `/api/jobs/<job_id>/assistant` | Translate natural-language instructions into structured cleaning operations |
| `GET` | `/api/assistant/examples` | Retrieve curated example prompt templates for natural-language cleaning |

---

## 2. Endpoint Details

### 2.1 File Upload
`POST /api/upload`
Uploads a user dataset and registers a new job session.

- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file`: File binary (`.csv`, `.tsv`, `.xlsx`, `.xls`). Max size: 50MB.
  - `sheet_name` (optional): Specific sheet name for Excel files.

**Response (200 OK - CSV or Single-Sheet Excel)**:
```json
{
  "ok": true,
  "job_id": "aa545822-6930-4d59-8868-3bac05587dfb",
  "filename": "messy_customers.csv",
  "row_count": 1500,
  "col_count": 8,
  "file_size": 142050,
  "profile": { ... },
  "score": {
    "score": 64,
    "grade": "C",
    "total_deductions": 36,
    "breakdown": { ... }
  }
}
```

**Response (200 OK - Multi-Sheet Excel)**:
```json
{
  "ok": true,
  "requires_sheet_selection": true,
  "sheet_names": ["Q1_Sales", "Q2_Sales", "Reference_Data"]
}
```

---

### 2.2 Instant Demo Dataset
`POST /api/demo`
Instantiates a pre-loaded demonstration job populated with realistic messy data (inconsistent capitalisation, ambiguous dates, whitespace, exact duplicates, and missing values).

**Response (200 OK)**: Same payload structure as `/api/upload`.

---

### 2.3 Quality Profile
`GET /api/jobs/<job_id>/profile`
Computes and returns the complete data quality profile and explainable score.

**Response (200 OK)**:
```json
{
  "ok": true,
  "job_id": "aa545822-6930-4d59-8868-3bac05587dfb",
  "profile": {
    "row_count": 1500,
    "col_count": 8,
    "total_cells": 12000,
    "exact_duplicate_rows": 24,
    "potential_duplicate_groups": [
      {
        "base_row_index": 4,
        "base_preview": { "name": "Jonathan Swift", "city": "Dublin" },
        "matches": [
          { "row_index": 12, "similarity": 0.933, "preview": { "name": "Jonathon Swift", "city": "Dublin" } }
        ]
      }
    ],
    "total_missing": 142,
    "missing_pct": 1.18,
    "columns": [
      {
        "name": "registration_date",
        "type": "date",
        "missing_count": 0,
        "unique_count": 480,
        "date_formats_inconsistent": true,
        "ambiguous_date_count": 34
      }
    ],
    "issues": [
      {
        "id": "exact_duplicates",
        "severity": "high",
        "title": "Exact Duplicate Rows",
        "count": 24,
        "description": "24 rows are exact copies of another row."
      }
    ]
  },
  "score": {
    "score": 68,
    "grade": "C",
    "total_deductions": 32,
    "breakdown": {
      "missing_values": { "max_penalty": 30, "penalty": 2, "note": "142 missing cells (1.2%)" },
      "exact_duplicates": { "max_penalty": 20, "penalty": 4, "note": "24 duplicate rows (1.6%)" }
    }
  }
}
```

---

### 2.4 Paginated Data Fetch
`GET /api/jobs/<job_id>/data?page=1&page_size=50&search=alice`
Returns paginated row records for the working dataset.

- **Query Parameters**:
  - `page` (default: 1): Page number.
  - `page_size` (default: 50): Number of rows per page (max: 200).
  - `search` (optional): Filter text matching across columns.

**Response (200 OK)**:
```json
{
  "ok": true,
  "columns": ["id", "name", "email", "country", "date", "revenue"],
  "column_types": { "id": "numeric", "name": "text", "revenue": "numeric" },
  "rows": [
    { "id": "1", "name": "Alice Johnson", "email": "alice@example.com", "revenue": "1250" }
  ],
  "total_rows": 1500,
  "page": 1,
  "page_size": 50,
  "total_pages": 30
}
```

---

### 2.5 Preview Operation
`POST /api/jobs/<job_id>/preview`
Calculates a diff preview of an operation without modifying the working dataset.

**Request Body**:
```json
{
  "op": "trim_whitespace",
  "params": {
    "columns": ["name", "email"]
  }
}
```

**Response (200 OK)**:
```json
{
  "ok": true,
  "rows_affected": 88,
  "sample_changes": [
    {
      "column": "name",
      "before": "  bob smith  ",
      "after": "bob smith"
    }
  ],
  "warnings": []
}
```

---

### 2.6 Apply Operation
`POST /api/jobs/<job_id>/apply`
Applies an allowlisted operation to the working dataset.

**Request Body**:
```json
{
  "op": "fuzzy_deduplicate",
  "params": {
    "threshold": 0.85,
    "keep": "first"
  }
}
```

**Response (200 OK)**:
```json
{
  "ok": true,
  "log_entry": {
    "op": "fuzzy_deduplicate",
    "columns": ["name", "email", "city"],
    "rows_affected": 12,
    "timestamp": "2026-10-10T06:15:00Z"
  },
  "score": {
    "score": 78,
    "grade": "B",
    "total_deductions": 22
  }
}
```

---

### 2.7 Undo Operation
`POST /api/jobs/<job_id>/undo`
Pops the latest snapshot from the undo stack and restores previous working DataFrame state.

**Response (200 OK)**:
```json
{
  "ok": true,
  "message": "Operation undone.",
  "undone_operation": { "op": "fuzzy_deduplicate" },
  "score": { "score": 68, "grade": "C" }
}
```

---

### 2.8 Export Dataset
`GET /api/jobs/<job_id>/export?format=csv`
`GET /api/jobs/<job_id>/export?format=excel`
Streams downloadable cleaned dataset.

- **Query Parameters**:
  - `format`: `csv` (default) or `excel`.
- **Response Headers**:
  - `Content-Type`: `text/csv` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition`: `attachment; filename="dataset_cleaned_20261010_120000.csv"`

---

### 2.9 AI Assistant Copilot
`POST /api/jobs/<job_id>/assistant`
Translates natural-language commands into structured cleaning operations.

**Request Body**:
```json
{
  "instruction": "standardize dates interpreting 04/05 as 4th of May"
}
```

**Response (200 OK)**:
```json
{
  "ok": true,
  "op": "standardize_dates",
  "params": {
    "format": "%Y-%m-%d",
    "ambiguous_preference": "DMY"
  },
  "description": "Standardize dates assuming Day/Month/Year order.",
  "confidence": "high"
}
```
