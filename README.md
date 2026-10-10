# RowBot — AI-Powered Data Cleaning & Preparation Studio

> **RowBot** is a production-grade, AI-assisted web application that cleans, normalizes, inspects, and restructures messy CSV and Excel datasets with mathematical transparency, immutable audit history, and deterministic safeguards.

---

## 🌟 Table of Contents
1. [Overview & Value Proposition](#overview--value-proposition)
2. [Key Capabilities](#key-capabilities)
3. [Architecture Overview](#architecture-overview)
4. [Technology Stack](#technology-stack)
5. [Competitive Differentiation Matrix](#competitive-differentiation-matrix)
6. [Getting Started (Local Development)](#getting-started-local-development)
7. [API Quick Reference](#api-quick-reference)
8. [Data Quality Scoring Formula](#data-quality-scoring-formula)
9. [Security & Formula Injection Protection](#security--formula-injection-protection)
10. [Test Suite](#test-suite)
11. [Project Documentation Suite](#project-documentation-suite)

---

## 🚀 Overview & Value Proposition

Traditional spreadsheet cleaning workflows are repetitive, error-prone, and lack reproducibility. Enterprise ETL tools (e.g., Alteryx, Dataiku) are complex and cost-prohibitive for knowledge workers, while open-source tools like OpenRefine require local Java runtimes and lack modern conversational interfaces.

**RowBot solves this by combining:**
- **Instant Profiling**: Zero-config detection of missing cells, inconsistent capitalisation, conflicting date formats, numbers stored as text, formula injection risks, and near-duplicate records.
- **Explainable Quality Score (0–100)**: Transparent point deductions with actionable remedies — never an opaque "black-box" metric.
- **Safety by Design**: The uploaded original dataset is completely **immutable**. All cleaning transforms only mutate a isolated working copy with instant single-click undo and full visual before/after diffs.
- **Allowlisted AI Assistant**: Optional Gemini conversational copilot translates natural English ("trim spaces", "standardize dates to DMY", "fuzzy deduplicate") into strictly validated, allowlisted JSON operations with zero execution risk.
- **Enterprise Spreadsheet Exports**: Cleaned datasets download as UTF-8 CSV or styled Excel `.xlsx` files with automatic CSV formula injection sanitisation.

---

## ⚡ Key Capabilities

| Capability | Description |
| :--- | :--- |
| **Multi-Format Ingestion** | Upload `.csv`, `.tsv`, `.xlsx`, or `.xls` up to 50MB. Automatic delimiter detection (comma, tab, semicolon, pipe) and Excel multi-sheet selector. |
| **Deep Data Profiling** | Type inference (`text`, `numeric`, `date`, `mixed`), cardinality metrics, IQR outlier analysis, email/phone format checks, and ambiguous date flagging. |
| **Fuzzy / Near-Duplicate Detection** | Sequence matching clustering identifies typo-based duplicates (e.g., *"Jonathan Swift"* vs *"Jonathon Swift"*) with custom similarity thresholds. |
| **Ambiguous Date Resolution** | Toggle between European (`DMY` / Day-First) and US (`MDY` / Month-First) interpretation for ambiguous dates like `04/05/2023`. |
| **Interactive Cleaning Studio** | 15+ 1-click operations including whitespace trimming, case normalization, empty row/column pruning, mode/median imputation, and column reordering. |
| **Visual Diff & Auditing** | Compare original vs working datasets side-by-side with color-coded cell changes and exportable transformation recipe logs. |
| **Gemini AI Copilot** | Natural language cleaning copilot with automatic graceful fallback to a deterministic rule-based parser if no API key is set. |

---

## 🏗️ Architecture Overview

```
 ┌────────────────────────────────────────────────────────┐
 │                   RowBot Web UI                       │
 │      (React 18 + Vite + Recharts + Lucide Icons)       │
 └───────────────────────────┬────────────────────────────┘
                             │ HTTP / JSON API
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │                    Flask Backend                       │
 │                     (Port 5000)                        │
 ├───────────────────────────┬────────────────────────────┤
 │      API Controllers      │      Services Layer        │
 │  • /api/upload            │  • file_loader.py          │
 │  • /api/jobs/<id>/profile │  • profiler.py             │
 │  • /api/jobs/<id>/preview │  • quality_score.py        │
 │  • /api/jobs/<id>/apply   │  • cleaning_engine.py      │
 │  • /api/jobs/<id>/undo    │  • command_parser.py       │
 │  • /api/jobs/<id>/export  │  • exporter.py             │
 ├───────────────────────────┴────────────────────────────┤
 │                  In-Memory Job Store                   │
 │     • original_df (IMMUTABLE, NEVER OVERWRITTEN)       │
 │     • working_df  (Stateful transformations)           │
 │     • undo_stack  (LIFO DataFrame snapshots)           │
 │     • operation_log (Chronological audit history)      │
 └────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite 6, React Router DOM v6, Recharts, Lucide Icons, React Hot Toast, Canvas Confetti.
- **Styling**: Vanilla CSS Design System with dark-mode aesthetic, CSS custom properties, and responsive CSS Grid / Flexbox layouts.
- **Backend**: Python 3.11+, Flask 3.1, Flask-CORS, Pandas 2.2, NumPy 2.2, OpenPyXL 3.1, Python-Dateutil, Chardet.
- **AI & Copilot**: Google Gemini 1.5 Flash (via REST) with deterministic rule-based regex fallback parser.

---

## 📊 Competitive Differentiation Matrix

| Feature | **RowBot** | OpenRefine | MS Power Query (Excel) | Alteryx Designer | Dataiku DSS |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Modern Web UI / Cloud Native** | ✅ **Yes** | ❌ Local desktop | ⚠️ Desktop/M365 only | ❌ Thick client only | ✅ Web UI |
| **Transparent Quality Score (0–100)**| ✅ **Yes (9 categories)** | ❌ None | ❌ Column quality only | ❌ Manual workflow | ⚠️ Add-on metric |
| **Immutable Original Safe Guard** | ✅ **Strict In-Memory Isolation** | ⚠️ Facet-based | ⚠️ Query dependent | ✅ Workflow-based | ✅ Flow-based |
| **Fuzzy / Near-Duplicate Detection** | ✅ **Integrated (difflib)** | ✅ GREL / Clustering | ⚠️ Power Query M only | ✅ Fuzzy Match Tool | ✅ Plugin/Python |
| **Ambiguous Date Resolution (DMY/MDY)**| ✅ **1-Click Preference** | ⚠️ Manual GREL | ⚠️ Locale change | ⚠️ DateTime tool | ⚠️ Formula |
| **Natural Language AI Copilot** | ✅ **Allowlisted Gemini + Fallback** | ❌ None | ⚠️ Copilot (M365 sub) | ⚠️ Add-on AI engine | ⚠️ LLM Recipe |
| **Spreadsheet Formula Injection Defense**| ✅ **Automatic Prefix Quote** | ❌ Manual | ❌ Application native | ⚠️ Configurable | ⚠️ Configurable |
| **Zero Setup / Instant Demo Mode** | ✅ **1-Click Demo Dataset** | ❌ Import required | ❌ Workbook required | ❌ Sample project | ❌ Complex setup |

---

## 💻 Getting Started (Local Development)

### 1. Prerequisites
- **Python**: 3.10+ (tested on Python 3.11, 3.12, 3.13)
- **Node.js**: v18+ and `npm`

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python app.py
```
*Backend runs on `http://127.0.0.1:5000`.*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

### 4. Optional Gemini AI Configuration
Create a `.env` file inside `backend/`:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
PORT=5000
FLASK_ENV=development
```
*(If unconfigured, RowBot functions 100% deterministically using the built-in regex rule parser with zero features disabled).*

---

## 📐 Data Quality Scoring Formula

RowBot calculates an explainable 0–100 quality score with point deductions based on measurable quality defects:

$$\text{Quality Score} = \max\left(0,\, 100 - \sum \text{Deductions}\right)$$

| Quality Dimension | Maximum Penalty | Deduction Logic |
| :--- | :---: | :--- |
| **Missing Values** | −30 pts | $\min(30, \text{round}(\text{missing\_cells} / \text{total\_cells} \times 100))$ |
| **Exact Duplicates** | −20 pts | $\min(20, \text{round}(\text{duplicate\_rows} / \text{total\_rows} \times 100))$ |
| **Whitespace Issues** | −10 pts | $\min(10, \text{round}(\text{whitespace\_cells} / \text{total\_cells} \times 50))$ |
| **Inconsistent Case** | −10 pts | $\min(10, \text{casing\_issue\_columns} \times 3)$ |
| **Date Format Inconsistencies** | −10 pts | $\min(10, \text{inconsistent\_date\_columns} \times 5)$ |
| **Numbers Stored as Text** | −5 pts | $\min(5, \text{numeric\_as\_text\_columns} \times 2)$ |
| **Email & Phone Format Errors** | −5 pts | $\min(5, \text{invalid\_contact\_columns} \times 2)$ |
| **Statistical Outliers** | −5 pts | $\min(5, \text{round}(\text{outliers} / \text{total\_cells} \times 200))$ |
| **Constant / Single-Value Columns** | −5 pts | $\min(5, \text{constant\_columns} \times 2)$ |

### Score Grade Thresholds
- **A**: 90 – 100 (Clean, production-ready)
- **B**: 75 – 89 (Minor cosmetic defects)
- **C**: 60 – 74 (Significant missing data or duplicates)
- **D**: 40 – 59 (Severe quality issues)
- **F**: 0 – 39 (Corrupt or unstandardized dataset)

---

## 🛡️ Security & Formula Injection Protection

Spreadsheet applications (Microsoft Excel, LibreOffice Calc, Google Sheets) evaluate cells beginning with `=, +, -, @, \t, \r` as formulas or DDE execution commands. If user-submitted records contain values like `=cmd|' /C calc'!A0`, exporting them directly poses a Remote Code Execution (RCE) or data exfiltration risk.

RowBot mitigates this in `services/exporter.py` by applying `sanitize_cell`:
```python
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")

def sanitize_cell(value) -> str:
    if isinstance(value, str) and value and value[0] in FORMULA_PREFIXES:
        return "'" + value
    return value
```
Spreadsheet engines treat cells prefixed with `'` as literal strings, neutralizing code and macro execution.

---

## 🧪 Test Suite

RowBot includes a comprehensive automated test suite verifying file ingestion, profiling, scoring, operations, copilot parsing, and export round-trips:

```bash
cd backend
python -m pytest tests/test_backend.py -v
```

**Results:**
- **45 unit tests passed (100%)**
- Total execution time: **< 2.0 seconds**

---

## 📚 Project Documentation Suite

For deeper technical specifications, refer to the accompanying documentation files in this repository:

- 📖 [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Architectural patterns, state isolation, and data pipelines.
- 🔌 [`API.md`](./API.md) — Complete REST API specification with request/response schemas.
- 🧪 [`TESTING.md`](./TESTING.md) — Test strategy, coverage report, and test authoring guidelines.
- 🚀 [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Production deployment guides (Docker, Render, Railway, Nginx).
- 🗄️ [`DATABASE.md`](./DATABASE.md) — Storage architecture, in-memory LRU store, and PostgreSQL/Supabase schema.
- 📖 [`GLOSSARY.md`](./GLOSSARY.md) — Comprehensive data cleaning and data engineering definitions.
