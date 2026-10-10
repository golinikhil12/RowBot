# RowBot Storage & Database Architecture

## 1. Current Storage Architecture: In-Memory Session Store

RowBot currently uses an in-memory session store (`backend/job_store.py`) designed for zero-latency data manipulation and instant interactive response times.

### 1.1 In-Memory Job Structure
Each job is tracked under an isolated UUID `job_id`:

```python
{
    "job_id": "aa545822-6930-4d59-8868-3bac05587dfb",
    "filename": "customer_export.csv",
    "file_size": 142050,
    "row_count": 1500,
    "col_count": 8,
    "original_df": pd.DataFrame,      # Read-only snapshot of the initial upload
    "working_df": pd.DataFrame,       # Current DataFrame containing all transformations
    "undo_stack": [pd.DataFrame, ...],# LIFO snapshots of working_df prior to each op
    "operation_log": [dict, ...],     # Audit history of operations, affected rows & timestamps
    "created_at": datetime,
    "updated_at": datetime
}
```

### 1.2 Invariants & Lifecycle
- **Zero Disk Exposure**: Datasets are parsed and transformed entirely in RAM. No temporary CSV/Excel files are persisted on server disks.
- **TTL & Garbage Collection**: Jobs older than 2 hours without user activity are automatically purged to prevent memory leaks.
- **Scale**: A standard 50,000-row DataFrame consumes approximately 8MB to 15MB of RAM in Pandas memory format.

---

## 2. Optional Persistent Multi-Tenant Schema (PostgreSQL / Supabase)

For teams requiring multi-user authentication, collaborative cleaning recipes, or long-term dataset storage, RowBot includes pre-configured compatibility with PostgreSQL / Supabase via `supabase-py`.

### 2.1 Entity Relationship Diagram (ERD)

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────────┐
│      users      │       │      jobs       │       │   operation_logs     │
├─────────────────┤       ├─────────────────┤       ├──────────────────────┤
│ id (PK, UUID)   │1     *│ id (PK, UUID)   │1     *│ id (PK, UUID)        │
│ email (TEXT)    ├───────┤ user_id (FK)    ├───────┤ job_id (FK)          │
│ name (TEXT)     │       │ filename (TEXT) │       │ op_name (TEXT)       │
│ created_at      │       │ file_size (INT) │       │ params (JSONB)       │
└─────────────────┘       │ row_count (INT) │       │ rows_affected (INT)  │
                          │ s3_raw_path     │       │ created_at           │
                          │ s3_clean_path   │       └──────────────────────┘
                          │ quality_score   │
                          │ created_at      │
                          └─────────────────┘
```

### 2.2 PostgreSQL DDL Migration Script

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Cleaning Jobs Table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    row_count INTEGER NOT NULL,
    col_count INTEGER NOT NULL,
    raw_storage_uri TEXT,
    clean_storage_uri TEXT,
    initial_score INTEGER,
    current_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Operation Audit Trail
CREATE TABLE operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    op_name TEXT NOT NULL,
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    rows_affected INTEGER NOT NULL DEFAULT 0,
    examples JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_operation_logs_job_id ON operation_logs(job_id);
```
