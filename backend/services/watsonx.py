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
def get_model(model_id: str, max_new_tokens: int = 2048) -> ModelInference:
    """
    Return a cached ModelInference instance for the given model and token limit.
    Avoids re-authenticating / re-instantiating the client on every call.
    """
    parameters = {
        GenParams.DECODING_METHOD: "greedy",
        GenParams.MAX_NEW_TOKENS: max_new_tokens,
        GenParams.MIN_NEW_TOKENS: 1,
        GenParams.TEMPERATURE: 0.0,
        GenParams.STOP_SEQUENCES: ["```\n\n", "</output>"],
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
    max_new_tokens: int = 2048,
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
    Apply heuristic sanitization to fix common LLM JSON syntax artifacts:
    - Remove markdown code fences
    - Remove trailing commas before closing braces/brackets
    - Extract the outermost JSON object { ... } or array [ ... ]
    """
    # 1. Extract markdown code block if present
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    text = text.strip()

    # 2. Extract outermost matching JSON brackets
    match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
    if match:
        text = match.group(1)

    # 3. Strip trailing commas before closing braces or brackets (e.g. [1, 2,] or {"a": 1,})
    text = re.sub(r",\s*(\]|\})", r"\1", text)

    return text.strip()


def generate_json(
    prompt: str,
    model_id: str = GRANITE_INSTRUCT,
    max_new_tokens: int = 2048,
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
                # Ask model to self-correct
                current_prompt = (
                    f"{prompt}\n\n"
                    f"## CRITICAL CORRECTION REQUIRED\n"
                    f"Your previous response caused a JSONDecodeError: {exc}.\n"
                    f"Your previous output was:\n{cleaned[:300]}\n\n"
                    f"Please output ONLY valid, well-formed JSON matching the exact schema with no trailing commas or markdown."
                )

    raise ValueError(f"Failed to parse valid JSON after {max_repair_attempts} attempts.\nRaw snippet: {last_raw[:500]}")
