# RowBot Architecture & Technical Design

## 1. System Overview

RowBot is designed as an interactive, stateless data preparation and cleaning studio. Its design philosophy centers on **predictability**, **auditability**, and **zero-loss data safety**.

```
+--------------------------------------------------------------------------+
|                              Client Layer                                |
|   React 18 SPA (Vite) · Context State Machine · Recharts Visualizations  |
+------------------------------------┬-------------------------------------+
                                     │ JSON / Multipart HTTP
                                     ▼
+--------------------------------------------------------------------------+
|                             API Gateway / Flask                          |
|   CORS Middleware · Request Validation · File Limiters · Error Boundary  |
+------------------------------------┬-------------------------------------+
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
+─────────────────────────────────+     +──────────────────────────────────+
|         Services Layer          |     |        Job Store (Memory)        |
| • File Loader (CSV/XLSX Parser) |     |  Per-session state container:    |
| • Profiler (Type & Issue Logic) |◄───►|  • original_df (read-only)       |
| • Quality Scorer (0-100 Math)   |     |  • working_df (current state)    |
| • Cleaning Engine (Allowlisted) |     |  • undo_stack (DataFrame list)   |
| • Exporter (Sanitized CSV/XLSX) |     |  • operation_log (Audit trail)   |
| • Command Parser (AI + Regex)   |     +──────────────────────────────────+
+─────────────────────────────────+
```

---

## 2. Core Architectural Principles

### 2.1 Immutability of Original Upload
When a user uploads a dataset, it is parsed and assigned a unique UUID `job_id`. 
The resulting Pandas DataFrame is stored as `original_df` inside `backend/job_store.py`:
- `original_df` is **never modified** throughout the session.
- Any operation (`trim_whitespace`, `fill_missing`, `drop_column`, etc.) clones the current `working_df`.
- Before mutating `working_df`, a deep copy is pushed onto the session's `undo_stack`.
- The user can inspect the exact side-by-side comparison between `original_df` and `working_df` at any time via `/api/jobs/<id>/comparison`.

### 2.2 Allowlisted Operation Dispatch
To eliminate Remote Code Execution (RCE) and unintended Pandas operations, RowBot employs an allowlisted dispatch architecture in `backend/services/cleaning_engine.py`:

```python
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
```
Any operation request specifying an unapproved `op` string is immediately rejected with an HTTP 400 error. Arbitrary code strings (`eval()`, `exec()`, or raw SQL) are strictly banned.

### 2.3 Transparent Quality Scoring Engine
Unlike heuristic tools that assign opaque health scores, RowBot's quality score in `services/quality_score.py` is calculated mathematically from 9 observable error counts.
Every point deducted has:
1. `max_penalty`: Maximum allowable penalty cap for that category.
2. `penalty`: Exact point penalty assessed.
3. `note`: Human-readable justification (e.g., *"14 cells with whitespace issues"*).

---

## 3. Data Processing Flow

```
1. Upload & Parsing:
   File Bytes ──► chardet (Encoding) ──► loader.py ──► Validate Shape ──► Register in JobStore

2. Profiling & Scoring:
   working_df ──► profiler.py (Scan cols, types, dates, duplicates) ──► quality_score.py ──► Score JSON

3. Interactive Transform:
   UI Action / AI Command ──► command_parser.py ──► Validate Op & Params
                                                           │
                                                           ▼
   JobStore: Push working_df to undo_stack ◄─── cleaning_engine.py (Apply Transform)
                                                           │
                                                           ▼
   working_df Updated ──► Recompute Score & Log ──► Return to Client

4. Export & Download:
   working_df ──► exporter.py (Apply sanitize_cell to formula characters) ──► CSV/Excel Binary Stream
```

---

## 4. AI Assistant Design: Allowlist-Constrained Hybrid

The Copilot assistant in `services/command_parser.py` uses a dual-engine architecture:

1. **Deterministic Rule Engine (Primary Fallback)**:
   - High-performance regex patterns recognize common natural phrases:
     - *"remove duplicates"* ➔ `remove_exact_duplicates`
     - *"trim whitespace"* ➔ `trim_whitespace`
     - *"standardize dates to YYYY-MM-DD"* ➔ `standardize_dates`
     - *"fuzzy deduplicate"* ➔ `fuzzy_deduplicate`
     - *"fill missing with median"* ➔ `fill_missing`
   - Runs locally in `< 1ms` with 0 network latency and 0 cost.

2. **Gemini 1.5 Flash (Conversational Copilot)**:
   - Activated automatically when `GEMINI_API_KEY` is present.
   - Constrained by a strict system prompt requiring raw JSON output conforming strictly to `ALLOWED_OPERATIONS`.
   - The returned JSON is validated server-side; if the suggested operation is not in `ALLOWED_OPERATIONS`, RowBot falls back seamlessly to the deterministic rule engine.
   - Ensures resilience even during network outages, rate limits, or invalid API keys.

---

## 5. Security Posture

| Risk Area | Mitigation Implemented |
| :--- | :--- |
| **Formula Injection (CSV/XLSX)** | All cell values beginning with `=, +, -, @, \t, \r` are prefixed with `'` during export via `sanitize_cell()`. |
| **Unbounded Memory Usage** | Maximum upload size capped at 50MB; in-memory JobStore discards inactive sessions using LRU expiration. |
| **Path Traversal** | Filenames are sanitized and files are parsed entirely in memory (`io.BytesIO`) without writing temporary files to disk. |
| **Cross-Origin Requests (CORS)** | Configured with `Flask-CORS` allowing only authorized frontend origins. |
