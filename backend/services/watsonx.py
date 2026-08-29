"""
IBM watsonx.ai client wrapper with retry logic, client caching, and self-healing JSON parser.
Uses ibm-watsonx-ai SDK to interface with Granite foundation models.
"""
import functools
import json
import logging
import re
import time
from typing import Optional
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
from services.config import (
    WATSONX_URL,
    WATSONX_API_KEY,
    WATSONX_PROJECT_ID,
    GRANITE_INSTRUCT,
    GRANITE_CODE,
)

logger = logging.getLogger("watsonx")


def _get_credentials() -> dict:
    return {
        "url": WATSONX_URL,
        "apikey": WATSONX_API_KEY,
    }


@functools.lru_cache(maxsize=16)
def get_model(model_id: str, max_new_tokens: int = 2500) -> ModelInference:
    """
    Return a cached ModelInference instance for the given model and token limit.
    Avoids re-authenticating / re-instantiating the client on every call.
    """
    parameters = {
        GenParams.DECODING_METHOD: "greedy",
        GenParams.MAX_NEW_TOKENS: max_new_tokens,
        GenParams.MIN_NEW_TOKENS: 1,
        GenParams.TEMPERATURE: 0.0,
        GenParams.STOP_SEQUENCES: ["</output>"],
    }
    return ModelInference(
        model_id=model_id,
        params=parameters,
        credentials=_get_credentials(),
        project_id=WATSONX_PROJECT_ID,
    )


def generate_text(
    prompt: str,
    model_id: str = GRANITE_INSTRUCT,
    max_new_tokens: int = 2500,
    retries: int = 3,
    delay: float = 1.5,
) -> str:
    """
    Generate text from a Granite model with retry logic and exponential backoff.
    """
    model = get_model(model_id, max_new_tokens)
    last_exc: Optional[Exception] = None
    for attempt in range(retries):
        try:
            response = model.generate_text(prompt=prompt)
            return response if isinstance(response, str) else str(response)
        except Exception as exc:
            last_exc = exc
            logger.warning("watsonx generation attempt %d/%d failed: %s", attempt + 1, retries, exc)
            if attempt < retries - 1:
                time.sleep(delay * (attempt + 1))
    raise RuntimeError(f"watsonx generation failed after {retries} retries: {last_exc}")


def _repair_json_string(text: str) -> str:
    """
    Apply robust heuristic sanitization to fix common LLM JSON syntax artifacts:
    - Remove markdown code fences
    - Extract from the first opening brace { or [
    - Auto-heal truncated JSON arrays/objects by closing unclosed brackets/braces
    - Remove trailing commas before closing braces/brackets
    """
    # 1. Extract markdown code block if present
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    text = text.strip()

    # 2. Find starting { or [
    start_idx = -1
    for i, ch in enumerate(text):
        if ch in ("{", "["):
            start_idx = i
            break
    if start_idx != -1:
        text = text[start_idx:]

    # 3. First attempt clean trailing commas
    cleaned = re.sub(r",\s*(\]|\})", r"\1", text)
    try:
        json.loads(cleaned)
        return cleaned
    except Exception:
        pass

    # 4. If truncated mid-string or mid-object, slice up to the last valid '}' and close open containers
    last_brace = text.rfind("}")
    if last_brace != -1:
        truncated = text[: last_brace + 1]
        open_braces = truncated.count("{") - truncated.count("}")
        open_brackets = truncated.count("[") - truncated.count("]")

        truncated = re.sub(r",\s*$", "", truncated)

        if open_brackets > 0:
            truncated += "]" * open_brackets
        if open_braces > 0:
            truncated += "}" * open_braces

        truncated = re.sub(r",\s*(\]|\})", r"\1", truncated)
        try:
            json.loads(truncated)
            return truncated
        except Exception:
            pass

    return cleaned


def generate_json(
    prompt: str,
    model_id: str = GRANITE_INSTRUCT,
    max_new_tokens: int = 2500,
    max_repair_attempts: int = 2,
) -> dict:
    """
    Generate text and parse as JSON with self-healing repair and model retry fallback.
    """
    current_prompt = prompt
    last_raw = ""

    for attempt in range(max_repair_attempts):
        raw = generate_text(current_prompt, model_id=model_id, max_new_tokens=max_new_tokens)
        last_raw = raw
        cleaned = _repair_json_string(raw)

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as exc:
            logger.warning("JSON parse failed on attempt %d: %s", attempt + 1, exc)
            if attempt < max_repair_attempts - 1:
                current_prompt = (
                    f"{prompt}\n\n"
                    f"## CRITICAL INSTRUCTION\n"
                    f"Output ONLY valid JSON. Keep answers concise. Do not output prose or markdown.\n"
                )

    raise ValueError(f"Failed to parse valid JSON after {max_repair_attempts} attempts.\nRaw snippet: {last_raw[:500]}")
