# RowBot Testing & Quality Assurance Guide

## 1. Test Strategy Overview

RowBot maintains a high-assurance testing philosophy. Because RowBot processes arbitrary user-supplied business datasets, the test suite verifies:
1. **Parser Resilience**: Handling tab-delimited, semicolon-delimited, missing headers, multi-sheet workbooks, and UTF-BOM encodings without crashing.
2. **Deterministic Transforms**: Ensuring mathematical idempotency and precision across cleaning algorithms.
3. **Immutability Invariants**: Guaranteeing that `original_df` never mutates under preview or apply actions.
4. **Formula Injection Sanitization**: Verifying that untrusted user cells beginning with `=, +, -, @` are safely disarmed upon export.
5. **AI Safety & Fallbacks**: Ensuring the assistant parser functions deterministically even when external API credentials are absent.

---

## 2. Test Suite Execution

All tests are implemented using standard `pytest`.

```bash
cd backend

# Run the complete test suite with verbose output:
python -m pytest tests/test_backend.py -v

# Run with short test output and timing:
python -m pytest tests/test_backend.py -q

# Run specific test classes:
python -m pytest tests/test_backend.py::TestProfiler -v
python -m pytest tests/test_backend.py::TestCleaningEngine -v
python -m pytest tests/test_backend.py::TestExporter -v
```

---

## 3. Test Coverage Breakdown

The test suite covers **45 automated test assertions** across 6 core test modules:

### 3.1 File Loader Tests (`TestFileLoader`)
- `test_load_csv_ok`: Standard CSV parsing with correct column and row shape.
- `test_load_csv_empty`: Graceful rejection of empty file payloads.
- `test_load_csv_header_only`: Safe handling of header-only files with 0 data rows.
- `test_load_csv_tab_delimited`: Automatic sniffing of tab and non-comma delimiters.
- `test_excel_multi_sheet`: Multi-sheet detection and sheet name enumeration in `.xlsx` files.

### 3.2 Profiler Tests (`TestProfiler`)
- `test_profile_basic`: Complete profile metadata generation (rows, columns, cell count).
- `test_detects_exact_duplicates`: Accurate identification of duplicate row counts.
- `test_detects_missing`: Cell-level missing value counting across all columns.
- `test_detects_whitespace`: Leading and trailing whitespace detection in text cells.
- `test_detects_date_inconsistency`: Multiple date format presence in candidate date columns.
- `test_issues_list_not_empty`: Aggregation of issue cards for user visibility.
- `test_detects_ambiguous_dates`: Flagging dates with ambiguous day/month order (e.g. `04/05/2023`).
- `test_detects_potential_duplicates`: Sequence matching similarity clustering for near-duplicate records.

### 3.3 Quality Score Tests (`TestQualityScore`)
- `test_score_range`: Verification that the score strictly satisfies $0 \le \text{Score} \le 100$.
- `test_score_decreases_with_more_issues`: Mathematical monotonicity of quality score penalties.
- `test_breakdown_present`: Presence of all 9 penalty breakdown categories.
- `test_grade_present`: Proper assignment of grades `A`, `B`, `C`, `D`, or `F`.

### 3.4 Cleaning Engine Tests (`TestCleaningEngine`)
- `test_trim_whitespace`: Removal of leading/trailing spaces without touching inner characters.
- `test_remove_exact_duplicates`: Row reduction matching duplicate count.
- `test_normalize_case_lower`: Complete lower-casing across object columns.
- `test_remove_empty_rows`: Pruning rows with 100% null values.
- `test_fill_missing_median`: Imputing missing numeric cells using median statistics.
- `test_standardize_dates`: Normalizing dates to ISO `YYYY-MM-DD`.
- `test_normalize_email`: Trimming and lower-casing email addresses.
- `test_invalid_operation`: Rejection of unallowlisted operations.
- `test_missing_column_error`: Validation that referenced columns exist in the DataFrame.
- `test_preview_does_not_mutate`: Strict immutability check verifying `preview_operation` does not alter source DataFrame.
- `test_drop_column`: Safe column removal.
- `test_rename_column`: Renaming specified columns.
- `test_fuzzy_deduplicate`: Clustering and dropping near-duplicate rows based on similarity thresholds.
- `test_reorder_columns`: Structural column order adjustment.
- `test_standardize_dates_dayfirst`: Day-first (`DMY`) vs Month-first (`MDY`) disambiguation.

### 3.5 Command Parser Tests (`TestCommandParser`)
- `test_parse_remove_duplicates`: Natural language mapping to `remove_exact_duplicates`.
- `test_parse_fuzzy_deduplicate`: Natural language mapping to `fuzzy_deduplicate`.
- `test_parse_reorder_columns`: Natural language mapping to `reorder_columns`.
- `test_parse_trim_whitespace`: Mapping whitespace commands to `trim_whitespace`.
- `test_parse_lowercase`: Mapping case commands to `normalize_case`.
- `test_parse_standardize_dates`: Mapping date formatting commands to `standardize_dates`.
- `test_parse_fill_median`: Parsing imputation instructions with median method.
- `test_parse_normalize_emails`: Parsing email cleaning commands.
- `test_parse_unknown_returns_suggestions`: Suggestion generator on unparseable queries.
- `test_detects_column_name`: Extracting referenced column names from natural phrases.

### 3.6 Exporter Tests (`TestExporter`)
- `test_sanitize_cell_formula_injection`: Neutralization of `=`, `+`, `-`, and `@` prefixes.
- `test_export_csv_roundtrip`: Generating CSV bytes and reloading them into Pandas without data degradation.
- `test_export_excel_roundtrip`: Generating OpenPyXL workbook bytes and reloading sheets without data degradation.

---

## 4. Frontend Verification

The frontend build and bundling pipeline is verified via:
```bash
cd frontend
npm run build
```
This validates JSX syntax, asset bundling, and rollup code generation.
