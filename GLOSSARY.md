# RowBot Data Engineering & Quality Glossary

A comprehensive reference of data cleaning concepts, mathematical formulas, and terminology utilized throughout the RowBot application.

---

### **A**
- **Ambiguous Date**: A calendar date formatted with two integers $\le 12$ separated by delimiters (e.g., `04/05/2023`), where it cannot be deterministically inferred whether the format is `DD/MM/YYYY` (May 4th) or `MM/DD/YYYY` (April 5th) without explicit regional locale or user instruction.
- **Audit Trail**: An immutable, chronological sequence of logged operations recording the timestamp, targeted columns, transformation parameters, and number of cells/rows affected.

---

### **C**
- **Cardinality**: The number of unique values contained within a specific dataset column. High cardinality indicates near-unique identifiers (e.g., UUIDs or emails); low cardinality indicates categorical classifications (e.g., status flags or country codes).
- **Constant Column**: A dataset column where all populated rows contain the exact same single distinct value, contributing zero variance or analytical signal.
- **CSV Formula Injection (CSV Injection / DDE)**: A vulnerability where untrusted spreadsheet cells starting with symbols like `=`, `+`, `-`, or `@` trigger dynamic formula evaluation or operating system command execution when opened in spreadsheet software like Microsoft Excel or LibreOffice.

---

### **D**
- **Data Profiling**: The automated statistical and structural assessment of a dataset to determine data types, frequency distributions, null counts, distinct values, and pattern inconsistencies.
- **Data Quality Score**: A bounded integer between 0 and 100 assessing the overall health of a dataset based on weighted point deductions across measured quality dimensions (missingness, duplicates, whitespace, casing, date conflicts, and formatting anomalies).
- **Deterministic Parser**: A translation mechanism that produces identical, verifiable outputs for a given natural-language input without randomness or stochastic sampling.

---

### **E**
- **Exact Duplicate**: A row in a dataset where every single cell across all columns contains values identical to another existing row in the table.

---

### **F**
- **Fuzzy Deduplication (Near-Duplicate Detection)**: The process of identifying pairs or clusters of rows that possess high textual and structural similarity (typically $\ge 85\%$) but are not exact bitwise matches due to typographical mistakes, abbreviations, or differing punctuation (e.g., *"Acme Corp LLC"* vs *"Acme Corporation, LLC"*).

---

### **I**
- **Imputation**: The statistical technique of replacing missing (null) values in a column with substitute estimates derived from existing observations (e.g., mean, median, mode, or custom defaults).
- **Interquartile Range (IQR) Outlier Detection**: A robust non-parametric statistical method for identifying outliers. Defined as $\text{IQR} = Q_3 - Q_1$, where observations outside $[Q_1 - 1.5 \times \text{IQR},\, Q_3 + 1.5 \times \text{IQR}]$ are flagged as candidate anomalies.

---

### **N**
- **Normalization**: Transforming disparate text variations, encodings, or representations into a uniform canonical format (e.g., standardizing emails to lowercase, stripping internal double spaces, or converting multiple date styles to ISO 8601 `YYYY-MM-DD`).

---

### **S**
- **Sequence Matching Similarity**: An algorithm (derived from Ratcliff/Obershelp pattern matching) that calculates the ratio of twice the number of matching characters divided by the total number of characters in both strings, yielding a similarity metric in the range $[0.0,\, 1.0]$.

---

### **W**
- **Working Copy (`working_df`)**: The dynamic, in-memory representation of the dataset actively undergoing cleaning transformations, strictly isolated from the immutable initial upload (`original_df`).
