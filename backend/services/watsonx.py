"""
IBM watsonx.ai client wrapper with retry logic and error handling.
Uses ibm-watsonx-ai SDK to interface with Granite foundation models.
"""
import json
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


def _get_credentials() -> dict:
    return {
        "url": WATSONX_URL,
        "apikey": WATSONX_API_KEY,
    }


def get_model(model_id: str, max_new_tokens: int = 2048) -> ModelInference:
    """Return a configured ModelInference instance for the given model."""
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
    delay: float = 2.0,
) -> str:
    """
    Generate text from a Granite model with retry logic.
    Returns raw text string on success, raises on persistent failure.
    """
    model = get_model(model_id, max_new_tokens)
    last_exc: Optional[Exception] = None
    for attempt in range(retries):
        try:
            response = model.generate_text(prompt=prompt)
            return response if isinstance(response, str) else str(response)
        except Exception as exc:
            last_exc = exc
            if attempt < retries - 1:
                time.sleep(delay * (attempt + 1))
    raise RuntimeError(f"watsonx generation failed after {retries} retries: {last_exc}")


def generate_json(
    prompt: str,
    model_id: str = GRANITE_INSTRUCT,
    max_new_tokens: int = 2048,
) -> dict:
    """
    Generate text and parse as JSON. Strips markdown fences if present.
    """
    raw = generate_text(prompt, model_id=model_id, max_new_tokens=max_new_tokens)
    # Strip markdown code fences
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0]
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0]
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Failed to parse JSON from model output: {exc}\nRaw: {raw[:500]}")
