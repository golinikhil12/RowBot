"""
gemini_service.py
Google Gemini AI Integration for RowBot.
Supports Gemini 1.5 Flash, Gemini 2.0 Flash, and Gemini 1.5 Pro.
Provides:
1. Natural language instruction translation to validated allowlisted operations.
2. Conversational dataset diagnosis & advisory.
3. Automated cleaning recipe recommendations.
"""
import os
import json
import re
import urllib.request
import urllib.error
from services.cleaning_engine import ALLOWED_OPERATIONS

# Global in-memory configuration
_GEMINI_CONFIG = {
    "api_key": os.environ.get("GEMINI_API_KEY", ""),
    "model": os.environ.get("GEMINI_MODEL", "gemini-1.5-flash"),
}

SUPPORTED_MODELS = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
]


def set_gemini_config(api_key: str = None, model: str = None):
    """Update runtime Gemini configuration."""
    if api_key is not None:
        _GEMINI_CONFIG["api_key"] = api_key.strip()
        os.environ["GEMINI_API_KEY"] = api_key.strip()
    if model and model in SUPPORTED_MODELS:
        _GEMINI_CONFIG["model"] = model
        os.environ["GEMINI_MODEL"] = model


def get_gemini_config() -> dict:
    """Get active configuration with masked API key."""
    key = _GEMINI_CONFIG["api_key"] or os.environ.get("GEMINI_API_KEY", "")
    masked = f"{key[:4]}...{key[-4:]}" if len(key) >= 10 else ("configured" if key else "not_configured")
    return {
        "configured": bool(key),
        "model": _GEMINI_CONFIG["model"],
        "supported_models": SUPPORTED_MODELS,
        "masked_key": masked,
        "provider": "Google Gemini",
    }


def _call_gemini_api(prompt: str, system_instruction: str = None, api_key: str = None, model: str = None, max_tokens: int = 800) -> dict:
    """Internal helper to execute REST request against Google Gemini."""
    active_key = api_key or _GEMINI_CONFIG["api_key"] or os.environ.get("GEMINI_API_KEY", "")
    if not active_key:
        return {"ok": False, "error": "No Gemini API key configured. Provide GEMINI_API_KEY."}

    active_model = model or _GEMINI_CONFIG["model"] or "gemini-1.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{active_model}:generateContent?key={active_key}"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": max_tokens,
        }
    }
    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    try:
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=12) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            candidates = res_json.get("candidates", [])
            if not candidates:
                return {"ok": False, "error": "Gemini returned no response candidates."}
            part_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
            return {"ok": True, "text": part_text, "model": active_model}
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8")
            err_json = json.loads(err_body)
            err_msg = err_json.get("error", {}).get("message", str(e))
        except Exception:
            err_msg = f"HTTP Error {e.code}: {e.reason}"
        return {"ok": False, "error": f"Google Gemini API error: {err_msg}"}
    except Exception as e:
        return {"ok": False, "error": f"Failed to connect to Google Gemini: {str(e)}"}


def parse_instruction_with_gemini(instruction: str, available_columns: list, api_key: str = None, model: str = None) -> dict | None:
    """
    Translate natural language instruction into a safe, allowlisted RowBot operation using Google Gemini.
    Returns structured operation dict or None.
    """
    system_inst = (
        "You are the official Google Gemini AI data cleaning engine for RowBot. "
        "Your task is to translate natural language user cleaning requests into strict, validated JSON operations. "
        f"The ONLY allowed operations are: {json.dumps(sorted(list(ALLOWED_OPERATIONS)))}. "
        "Never invent new operation names. If the user asks for something outside these operations, state so in the error field."
    )

    prompt = (
        f'Dataset available columns: {json.dumps(available_columns)}\n'
        f'User Instruction: "{instruction}"\n\n'
        'Respond ONLY with valid JSON in one of these two formats:\n\n'
        'Format 1 (Successful mapping):\n'
        '{\n'
        '  "ok": true,\n'
        '  "op": "<one_of_allowed_operations>",\n'
        '  "params": {},\n'
        '  "description": "<concise human explanation of the action>",\n'
        '  "columns_detected": ["<col1>"],\n'
        '  "confidence": "high",\n'
        '  "reasoning": "<why this operation was selected>"\n'
        '}\n\n'
        'Format 2 (Cannot be mapped):\n'
        '{\n'
        '  "ok": false,\n'
        '  "error": "<explanation why instruction cannot be executed>",\n'
        '  "suggestions": ["<suggestion 1>", "<suggestion 2>"]\n'
        '}'
    )

    result = _call_gemini_api(prompt, system_instruction=system_inst, api_key=api_key, model=model, max_tokens=350)
    if not result.get("ok"):
        return None

    raw_text = result.get("text", "").strip()
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

    try:
        parsed = json.loads(raw_text)
        if parsed.get("ok") and parsed.get("op") in ALLOWED_OPERATIONS:
            parsed["ai_mode"] = "gemini"
            parsed["model"] = result.get("model", "gemini-1.5-flash")
            parsed["disclosure"] = f"Parsed by Google Gemini ({result.get('model', 'gemini-1.5-flash')}) with strict allowlist enforcement."
            return parsed
        elif not parsed.get("ok"):
            parsed["ai_mode"] = "gemini"
            parsed["model"] = result.get("model", "gemini-1.5-flash")
            return parsed
    except Exception:
        pass

    return None


def chat_with_gemini(message: str, dataset_context: dict, api_key: str = None, model: str = None) -> dict:
    """
    Conversational dataset analysis & copilot advisory with Google Gemini.
    Provides expert data engineering recommendations, explanations, and actionable operation suggestions.
    """
    cols = dataset_context.get("columns", [])
    row_count = dataset_context.get("row_count", 0)
    score = dataset_context.get("score", {})
    issues = dataset_context.get("issues", [])

    system_inst = (
        "You are RowBot's Google Gemini Data Engineer & Quality Copilot. "
        "You help users understand data hygiene, explain anomalies, and recommend precise cleaning steps. "
        f"Allowed RowBot operations for suggestions: {json.dumps(sorted(list(ALLOWED_OPERATIONS)))}. "
        "Always be concise, authoritative, professional, and practical."
    )

    prompt = (
        f"Dataset Overview:\n"
        f"- Records: {row_count}\n"
        f"- Columns: {json.dumps(cols[:30])}\n"
        f"- Quality Score: {score.get('score', 'N/A')} (Grade: {score.get('grade', 'N/A')})\n"
        f"- Identified Issues: {json.dumps(issues[:10])}\n\n"
        f"User Inquiry:\n\"{message}\"\n\n"
        "Provide a helpful markdown response. If relevant, include 1 to 3 recommended RowBot operations the user can apply. "
        "Format your entire response as valid JSON:\n"
        "{\n"
        '  "reply": "<markdown formatted reply with insights and tips>",\n'
        '  "suggested_actions": [\n'
        '    {\n'
        '      "title": "<short title>",\n'
        '      "instruction": "<natural language command>",\n'
        '      "op": "<allowed_op>",\n'
        '      "params": {}\n'
        '    }\n'
        '  ]\n'
        "}"
    )

    result = _call_gemini_api(prompt, system_instruction=system_inst, api_key=api_key, model=model, max_tokens=900)
    if not result.get("ok"):
        return result

    raw_text = result.get("text", "").strip()
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

    try:
        parsed = json.loads(raw_text)
        # Validate suggested actions against ALLOWED_OPERATIONS
        clean_actions = []
        for act in parsed.get("suggested_actions", []):
            if act.get("op") in ALLOWED_OPERATIONS:
                clean_actions.append(act)
        parsed["suggested_actions"] = clean_actions
        parsed["ok"] = True
        parsed["model"] = result.get("model")
        return parsed
    except Exception:
        # If model returned pure text instead of JSON, package it gracefully
        return {
            "ok": True,
            "reply": result.get("text", ""),
            "suggested_actions": [],
            "model": result.get("model")
        }


def generate_auto_cleaning_recipe(dataset_context: dict, api_key: str = None, model: str = None) -> dict:
    """
    Generate an optimal multi-step cleaning recipe tailored to the dataset.
    """
    prompt = (
        f"Analyze this dataset's issues and design an optimal multi-step cleaning pipeline.\n"
        f"Row count: {dataset_context.get('row_count')}\n"
        f"Quality score: {dataset_context.get('score', {}).get('score')} / Grade {dataset_context.get('score', {}).get('grade')}\n"
        f"Columns: {json.dumps(dataset_context.get('columns', []))}\n"
        f"Issues detected: {json.dumps(dataset_context.get('issues', []))}\n\n"
        f"Allowed operations: {json.dumps(sorted(list(ALLOWED_OPERATIONS)))}\n\n"
        "Respond ONLY with valid JSON in this structure:\n"
        "{\n"
        '  "ok": true,\n'
        '  "summary": "<overview of the recommended cleaning strategy>",\n'
        '  "steps": [\n'
        '    {\n'
        '      "step": 1,\n'
        '      "op": "<one_of_allowed_operations>",\n'
        '      "params": {},\n'
        '      "description": "<why this step is needed and what it cleans>",\n'
        '      "expected_impact": "<e.g. +8 score pts, resolves 14 nulls>"\n'
        '    }\n'
        '  ]\n'
        "}"
    )

    result = _call_gemini_api(prompt, api_key=api_key, model=model, max_tokens=700)
    if not result.get("ok"):
        return result

    raw_text = result.get("text", "").strip()
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

    try:
        parsed = json.loads(raw_text)
        if parsed.get("ok"):
            # Filter steps to only allowed operations
            valid_steps = [s for s in parsed.get("steps", []) if s.get("op") in ALLOWED_OPERATIONS]
            parsed["steps"] = valid_steps
            parsed["model"] = result.get("model")
            return parsed
    except Exception:
        pass

    return {"ok": False, "error": "Failed to parse Gemini recipe output."}
