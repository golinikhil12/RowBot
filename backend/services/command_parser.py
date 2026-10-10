"""
command_parser.py
Translates natural-language cleaning instructions into structured operations.
Uses a deterministic rule-based parser first; no external AI required.
"""
import os
import re
import json
import urllib.request
from services.cleaning_engine import ALLOWED_OPERATIONS


# ─────────────────────────────────────────────────────────────────────────────
# Rule table — ordered by priority, most specific first
# ─────────────────────────────────────────────────────────────────────────────

RULES = [
    # Fuzzy / potential duplicates
    {
        "patterns": [
            r"fuzzy\s+dedup(?:e|licate)?",
            r"(?:find|remove)\s+(?:fuzzy|potential|similar)\s+duplicates?",
            r"remove\s+similar\s+rows?",
        ],
        "op": "fuzzy_deduplicate",
        "params": {"threshold": 0.85},
        "description": "Remove near-duplicate rows with >= 85% similarity.",
    },
    # Duplicates
    {
        "patterns": [
            r"remove\s+(?:exact\s+)?duplicates?",
            r"dedupe",
            r"deduplicate",
            r"drop\s+duplicates?",
        ],
        "op": "remove_exact_duplicates",
        "params": {},
        "description": "Remove exact duplicate rows.",
    },
    # Trim whitespace
    {
        "patterns": [
            r"trim\s+(?:extra\s+)?(?:whitespace|spaces?)",
            r"strip\s+(?:whitespace|spaces?)",
            r"remove\s+(?:extra\s+)?spaces?",
            r"fix\s+(?:leading|trailing)\s+(?:whitespace|spaces?)",
        ],
        "op": "trim_whitespace",
        "params": {},
        "description": "Trim leading and trailing whitespace from all text columns.",
    },
    # Normalize emails (before general case conversion)
    {
        "patterns": [
            r"(?:normalize|standardize|lowercase|clean|fix)\s+email(?:\s+addresses?|\s+formats?|s)?",
            r"emails?\s+(?:to\s+lowercase|normalization|cleaning)",
        ],
        "op": "normalize_email",
        "params": {},
        "description": "Normalize email addresses to lowercase and trim spaces.",
    },
    # Normalize to lowercase
    {
        "patterns": [
            r"(?:convert|change|make)\s+(?:all\s+)?(?:text\s+)?to\s+lower(?:case)?",
            r"lowercase",
            r"lower\s+case",
        ],
        "op": "normalize_case",
        "params": {"mode": "lower"},
        "description": "Convert all text to lowercase.",
    },
    # Normalize to uppercase
    {
        "patterns": [
            r"(?:convert|change|make)\s+(?:all\s+)?(?:text\s+)?to\s+upper(?:case)?",
            r"uppercase",
            r"upper\s+case",
        ],
        "op": "normalize_case",
        "params": {"mode": "upper"},
        "description": "Convert all text to uppercase.",
    },
    # Normalize to title case
    {
        "patterns": [
            r"title\s*case",
            r"capitalize\s+(?:words|each\s+word|names?)",
            r"proper\s+case",
            r"standardize\s+(?:names?|text)\s+capitaliz",
        ],
        "op": "normalize_case",
        "params": {"mode": "title"},
        "description": "Convert text to Title Case.",
    },
    # Standardize dates
    {
        "patterns": [
            r"standardize\s+dates?",
            r"normalize\s+dates?",
            r"fix\s+date\s+formats?",
            r"convert\s+dates?\s+(?:to|into)\s+(?:iso|yyyy[-/]mm[-/]dd|standard)",
        ],
        "op": "standardize_dates",
        "params": {"format": "%Y-%m-%d"},
        "description": "Standardize all date values to YYYY-MM-DD format.",
    },
    # Convert numeric
    {
        "patterns": [
            r"convert\s+(?:numbers?|numeric\s+values?)\s+(?:to\s+numeric|from\s+text)",
            r"fix\s+numeric\s+(?:columns?|values?)",
            r"numbers?\s+stored\s+as\s+text",
        ],
        "op": "convert_numeric",
        "params": {},
        "description": "Convert numeric-looking text values to actual numbers.",
    },
    # Fill missing – median
    {
        "patterns": [
            r"fill\s+missing\s+(?:values?|cells?)\s+(?:with|using)\s+median",
            r"(?:replace|impute)\s+(?:nulls?|missing)\s+(?:with|using)\s+median",
        ],
        "op": "fill_missing",
        "params": {"method": "median"},
        "description": "Fill missing numeric values with the column median.",
    },
    # Fill missing – mean
    {
        "patterns": [
            r"fill\s+missing\s+(?:with|using)\s+(?:the\s+)?mean",
            r"(?:replace|impute)\s+(?:nulls?|missing)\s+(?:with|using)\s+mean",
        ],
        "op": "fill_missing",
        "params": {"method": "mean"},
        "description": "Fill missing numeric values with the column mean.",
    },
    # Fill missing – mode
    {
        "patterns": [
            r"fill\s+missing\s+(?:with|using)\s+(?:the\s+)?mode",
            r"(?:replace|impute)\s+(?:nulls?|missing)\s+(?:with|using)\s+mode",
        ],
        "op": "fill_missing",
        "params": {"method": "mode"},
        "description": "Fill missing values with the most common value (mode).",
    },
    # Remove empty rows
    {
        "patterns": [
            r"remove\s+(?:blank|empty)\s+rows?",
            r"drop\s+(?:blank|empty)\s+rows?",
            r"delete\s+(?:blank|empty)\s+rows?",
        ],
        "op": "remove_empty_rows",
        "params": {},
        "description": "Remove rows where all cells are empty.",
    },
    # Remove empty columns
    {
        "patterns": [
            r"remove\s+(?:blank|empty)\s+columns?",
            r"drop\s+(?:blank|empty)\s+columns?",
        ],
        "op": "remove_empty_columns",
        "params": {},
        "description": "Remove columns where all cells are empty.",
    },
    # Normalize text (extra spaces)
    {
        "patterns": [
            r"normalize\s+(?:all\s+)?text",
            r"clean\s+(?:up\s+)?text",
            r"remove\s+extra\s+(?:internal\s+)?spaces?",
            r"fix\s+(?:extra|double)\s+spaces?",
        ],
        "op": "normalize_text",
        "params": {},
        "description": "Remove extra internal whitespace from all text columns.",
    },
    # Reorder columns
    {
        "patterns": [
            r"reorder\s+columns?",
            r"move\s+columns?",
            r"rearrange\s+columns?",
        ],
        "op": "reorder_columns",
        "params": {},
        "description": "Reorder columns in the working dataset.",
    },
]


def _parse_with_gemini(instruction: str, available_columns: list, api_key: str = None, model: str = None) -> dict | None:
    """
    Attempt to parse instruction using Gemini AI if GEMINI_API_KEY is configured.
    Strictly validates resulting operation against ALLOWED_OPERATIONS.
    Returns structured operation dict or None on failure/fallback.
    """
    try:
        from services.gemini_service import parse_instruction_with_gemini
        result = parse_instruction_with_gemini(instruction, available_columns, api_key=api_key, model=model)
        if result and result.get("ok"):
            return result
    except Exception:
        pass

    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return None

    try:
        active_model = model or "gemini-1.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{active_model}:generateContent?key={api_key}"
        prompt = (
            f'You are an AI data cleaning assistant for RowBot. Translate this instruction into JSON:\n'
            f'Instruction: "{instruction}"\n'
            f'Columns: {json.dumps(available_columns)}\n'
            f'Allowed operations: {json.dumps(sorted(list(ALLOWED_OPERATIONS)))}\n'
            f'Respond ONLY with valid JSON with format:\n'
            f'{{"ok": true, "op": "<one_of_allowed_operations>", "params": {{}}, "description": "<summary>", "confidence": "high"}}\n'
            f'If instruction cannot be mapped to an allowed operation, respond with {{"ok": false, "error": "<reason>"}}.'
        )
        req_data = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 200}
        }).encode("utf-8")
        req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            candidate_text = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
            if candidate_text.startswith("```"):
                candidate_text = re.sub(r"^```(?:json)?\s*", "", candidate_text)
                candidate_text = re.sub(r"\s*```$", "", candidate_text)
            parsed = json.loads(candidate_text)
            if parsed.get("ok") and parsed.get("op") in ALLOWED_OPERATIONS:
                return parsed
    except Exception:
        pass
    return None


def parse_command(instruction: str, available_columns: list, api_key: str = None, model: str = None) -> dict:
    """
    Parse a natural-language instruction into a structured operation.
    Tries Gemini AI if API key is present, falling back to deterministic rule-based parser.
    Returns: {ok, op, params, description, confidence, columns_detected}
    or: {ok: False, error, suggestions}
    """
    text = instruction.strip().lower()

    # Optional Gemini AI Assistant attempt
    ai_result = _parse_with_gemini(instruction, available_columns, api_key=api_key, model=model)
    if ai_result:
        return ai_result

    # Try each rule in priority order
    for rule in RULES:
        for pattern in rule["patterns"]:
            if re.search(pattern, text, re.I):
                op = rule["op"]
                params = dict(rule["params"])

                # Try to extract column names from the instruction
                detected_columns = _extract_columns(text, available_columns)
                if detected_columns:
                    params["columns"] = detected_columns

                # Handle fill_missing value extraction
                if op == "fill_missing":
                    value_match = re.search(r"with\s+[\"']?([^\"']+)[\"']?$", text)
                    if value_match and "method" not in params:
                        params["method"] = "value"
                        params["value"] = value_match.group(1).strip()

                return {
                    "ok": True,
                    "op": op,
                    "params": params,
                    "description": rule["description"],
                    "confidence": "high",
                    "columns_detected": detected_columns,
                }

    # No match found – suggest similar commands
    suggestions = _suggest_commands(text)
    return {
        "ok": False,
        "error": f"I couldn't understand: \"{instruction}\"",
        "suggestions": suggestions,
        "note": "Try phrasing your request differently or use one of the suggestions above.",
    }


def _extract_columns(text: str, available_columns: list) -> list:
    """Extract column names mentioned in the instruction text."""
    found = []
    for col in available_columns:
        col_lower = col.lower()
        # Match whole word
        pattern = r"\b" + re.escape(col_lower) + r"\b"
        if re.search(pattern, text, re.I):
            found.append(col)
    return found


def _suggest_commands(text: str) -> list:
    """Return top suggestions based on keywords in input."""
    all_suggestions = [
        "Remove duplicate rows",
        "Trim whitespace from all columns",
        "Convert text to lowercase",
        "Convert text to Title Case",
        "Standardize dates to YYYY-MM-DD",
        "Fill missing values with median",
        "Fill missing values with mode",
        "Remove empty rows",
        "Normalize email addresses",
        "Convert numeric columns from text",
    ]

    # Score by keyword overlap
    words = set(re.findall(r"\w+", text.lower()))
    scored = []
    for s in all_suggestions:
        s_words = set(re.findall(r"\w+", s.lower()))
        score = len(words & s_words)
        scored.append((score, s))

    scored.sort(key=lambda x: -x[0])
    return [s for _, s in scored[:4]]


def get_command_examples() -> list:
    """Return a curated list of example commands for the UI."""
    return [
        "Remove duplicate rows",
        "Trim whitespace from all columns",
        "Standardize all dates to YYYY-MM-DD",
        "Convert text to Title Case",
        "Fill missing values with median",
        "Normalize email addresses to lowercase",
        "Remove empty rows",
        "Convert numeric columns from text",
        "Remove blank columns",
        "Fill missing values with mode",
    ]
