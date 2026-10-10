export const DEMO_ROWS = [
  { customer_id: 1, name: "Alice Johnson", email: "alice@example.com", phone: "+1-555-0101", country: "United States", signup_date: "2024-01-15", revenue: 1250.00, status: "Active" },
  { customer_id: 2, name: "bob smith", email: "BOB@EXAMPLE.COM", phone: "5550102", country: "USA", signup_date: "15/01/2024", revenue: 850.50, status: "active" },
  { customer_id: 3, name: "Alice Johnson", email: "alice@example.com", phone: "+1-555-0101", country: "United States", signup_date: "2024-01-15", revenue: 1250.00, status: "Active" },
  { customer_id: 4, name: "  Carol White  ", email: "carol.white@example.com", phone: "(555) 0103", country: "uk", signup_date: "Jan 20 2024", revenue: 3200.00, status: "ACTIVE" },
  { customer_id: 5, name: "David Brown", email: "david@", phone: "555-0104", country: "United Kingdom", signup_date: "2024/01/22", revenue: 950.00, status: "Active" },
  { customer_id: 6, name: "eve davis", email: "EVE@EXAMPLE.COM", phone: "+44 555 0105", country: "England", signup_date: "22-01-2024", revenue: 1100.75, status: "inactive" },
  { customer_id: 7, name: "Frank Miller", email: "frank@example.com", phone: "5550106", country: "Canada", signup_date: "2024-02-01", revenue: null, status: "Active" },
  { customer_id: 8, name: "Grace Lee", email: "grace@example.com", phone: "+1 (555) 0107", country: "canada", signup_date: "Feb 1 2024", revenue: 2200.00, status: "Active" },
  { customer_id: 9, name: null, email: "henry@example.com", phone: "5550108", country: "Australia", signup_date: "2024-02-10", revenue: 780.00, status: "active" },
  { customer_id: 10, name: "Iris Chen", email: "iris.chen", phone: "+61-555-0109", country: "australia", signup_date: "10/02/2024", revenue: 4500.00, status: "Active" },
  { customer_id: 11, name: "Jack Wilson", email: "jack@example.com", phone: "555-0110", country: "Germany", signup_date: "2024-02-15", revenue: 1650.00, status: "Active" },
  { customer_id: 12, name: "KAREN JONES", email: "karen@example.com", phone: "+49 555 0111", country: "germany", signup_date: "15-02-2024", revenue: 1650.00, status: "Active" },
  { customer_id: 13, name: "Liam Scott", email: "liam@example.com", phone: "5550112", country: "France", signup_date: "2024-03-01", revenue: 920.25, status: "Active" },
  { customer_id: 14, name: "mia taylor", email: "MIA@EXAMPLE.COM", phone: "+33 555 0113", country: "france", signup_date: "01/03/2024", revenue: 920.25, status: "active" },
  { customer_id: 15, name: "Noah Clark", email: "noah@example.com", phone: "555-0114", country: "Japan", signup_date: "2024-03-10", revenue: 5600.00, status: "Active" },
  { customer_id: 16, name: null, email: null, phone: null, country: null, signup_date: null, revenue: null, status: null },
  { customer_id: 17, name: "Olivia Hall", email: "olivia@example.com", phone: "5550116", country: "japan", signup_date: "10-03-2024", revenue: 5600.00, status: "Active" },
  { customer_id: 18, name: "Peter Young", email: "peter@example.com", phone: "+81 555 0117", country: "India", signup_date: "2024-03-20", revenue: 300.00, status: "Inactive" },
  { customer_id: 19, name: "Quinn Adams", email: "quinn @example.com", phone: "5550118", country: "india", signup_date: "20/03/2024", revenue: 300.00, status: "inactive" },
  { customer_id: 20, name: "Ryan King", email: "ryan@example.com", phone: "555-0119", country: "Brazil", signup_date: "2024-04-01", revenue: 1800.00, status: "Active" }
];

export const FALLBACK_SCORE = {
  score: 74,
  grade: "C",
  total_deductions: 26,
  breakdown: {
    missing_values: { penalty: 6, note: "9 missing cells (5.6%)", max_penalty: 30 },
    inconsistent_case: { penalty: 9, note: "3 columns with inconsistent casing", max_penalty: 10 },
    date_formats: { penalty: 5, note: "1 columns with inconsistent date formats", max_penalty: 10 },
    whitespace: { penalty: 0, note: "1 cells with whitespace issues", max_penalty: 10 },
    exact_duplicates: { penalty: 0, note: "0 duplicate rows (0.0%)", max_penalty: 20 },
    email_phone: { penalty: 2, note: "1 columns with email/phone format issues", max_penalty: 5 },
    outliers: { penalty: 4, note: "3 potential outlier values", max_penalty: 5 }
  }
};

export const FALLBACK_PROFILE = {
  row_count: 20,
  col_count: 8,
  total_cells: 160,
  total_missing: 9,
  missing_pct: 5.62,
  exact_duplicate_rows: 0,
  issues: [
    { id: "potential_duplicates", title: "Potential / Fuzzy Duplicates", severity: "medium", count: 1, description: "Found 1 groups of similar records with >= 85% text similarity." },
    { id: "missing_values", title: "Missing Values", severity: "medium", count: 9, description: "9 cells have missing values across 7 columns." },
    { id: "inconsistent_case", title: "Inconsistent Capitalisation", severity: "medium", count: 3, description: "Inconsistent casing found in: name, country, status." },
    { id: "date_formats", title: "Inconsistent Date Formats", severity: "medium", count: 1, description: "Multiple date formats detected in: signup_date." },
    { id: "whitespace", title: "Leading/Trailing Whitespace", severity: "low", count: 1, description: "1 cells have extra whitespace in: name." },
    { id: "email_issues", title: "Invalid Email Formats", severity: "medium", count: 1, description: "Email format issues found in: email." },
    { id: "outliers", title: "Potential Outliers", severity: "low", count: 3, description: "Statistical outliers detected in: revenue." }
  ],
  columns: [
    { name: "customer_id", type: "numeric", missing_count: 0, missing_pct: 0, unique_count: 20, stats: { min: 1, max: 20, mean: 10.5, median: 10.5 } },
    { name: "name", type: "text", missing_count: 1, missing_pct: 5, unique_count: 17, leading_trailing_spaces: 1, inconsistent_case: true },
    { name: "email", type: "text", missing_count: 1, missing_pct: 5, unique_count: 18, has_email_issues: true },
    { name: "phone", type: "mixed", missing_count: 1, missing_pct: 5, unique_count: 18, mixed_types: true },
    { name: "country", type: "text", missing_count: 1, missing_pct: 5, unique_count: 18, inconsistent_case: true },
    { name: "signup_date", type: "date", missing_count: 1, missing_pct: 5, unique_count: 18, date_formats_inconsistent: true, ambiguous_date_count: 3 },
    { name: "revenue", type: "numeric", missing_count: 2, missing_pct: 10, unique_count: 13, stats: { min: 300, max: 5600, mean: 1934.5, median: 1250 } },
    { name: "status", type: "text", missing_count: 1, missing_pct: 5, unique_count: 5, inconsistent_case: true }
  ]
};
