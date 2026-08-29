"""
Edge-Case & Fuzz Payload Constructor Agent (Granite Instruct)

Generates boundary-condition and malicious payloads for the impacted routes
based on API contract rules extracted from the diff context.
"""
import json
from models.analysis import FuzzPayload, FuzzPayloadsResult
from services.watsonx import generate_json
from services.config import GRANITE_INSTRUCT


FUZZ_PAYLOAD_PROMPT_TEMPLATE = """
You are a security and QA engineer generating edge-case test payloads for a changed API.

Based on the changes below, generate boundary-condition and adversarial payloads that
would expose regressions caused by the modifications (e.g. null fields on newly-required
keys, type mismatches, schema violations, oversized values).

## Changed Symbols
{changed_symbols_json}

## API Contract Excerpt
{openapi_spec}

## Database Schema
{db_schema}

## Raw Diff
{raw_diff}

## Task
Respond ONLY with a valid JSON object (no markdown, no prose):
{{
  "payloads": [
    {{
      "name": "Short identifier e.g. null_billing_address",
      "description": "What regression this payload exposes",
      "payload": {{ ... }},
      "expected_failure": "Describe the expected error or assertion failure"
    }}
  ]
}}

Generate between 3 and 8 payloads. Focus on the most realistic regression scenarios.
""".strip()


def run_fuzz_constructor_agent(context: dict) -> FuzzPayloadsResult:
    """
    Invoke Granite Instruct to generate edge-case fuzz payloads.
    Returns a validated FuzzPayloadsResult.
    """
    prompt = FUZZ_PAYLOAD_PROMPT_TEMPLATE.format(
        changed_symbols_json=json.dumps(context.get("changed_symbols", []), indent=2)[:1200],
        openapi_spec=str(context.get("openapi_spec", "(not provided)"))[:1500],
        db_schema=str(context.get("db_schema", "(not provided)"))[:800],
        raw_diff=str(context.get("raw_diff", ""))[:1500],
    )

    data = generate_json(prompt, model_id=GRANITE_INSTRUCT)

    payloads = [FuzzPayload(**p) for p in data.get("payloads", [])]
    return FuzzPayloadsResult(payloads=payloads)
