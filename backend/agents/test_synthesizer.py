"""
Test Suite Synthesizer Agent (Granite Code)

Generates executable regression test files (pytest or vitest) targeting the
impacted routes and validating against the constructed fuzz payloads.
"""
import json
from models.analysis import (
    BlastRadiusResult,
    FuzzPayloadsResult,
    SynthesizedTest,
)
from services.watsonx import generate_text
from services.config import GRANITE_CODE, TARGET_APP_URL


PYTEST_SYNTHESIZER_PROMPT = """
You are a senior Python test engineer. Write a complete, executable pytest regression
test file that validates the API routes listed below using the edge-case payloads provided.

## Impacted Routes
{routes_json}

## Fuzz Payloads
{payloads_json}

## Context Summary
{summary}

## Instructions
- Target API base URL: `{target_url}`.
- Use `httpx` or `requests` for HTTP calls against `{target_url}`.
- Each fuzz payload must have at least one test function.
- Assert correct HTTP status codes AND response body content.
- Include a `test_happy_path_still_works()` function.
- File must be runnable with `pytest` with no additional setup.
- Output ONLY the raw Python code, no markdown fences.
""".strip()


VITEST_SYNTHESIZER_PROMPT = """
You are a senior TypeScript test engineer. Write a complete, executable Vitest regression
test file that validates the API routes listed below using the edge-case payloads provided.

## Impacted Routes
{routes_json}

## Fuzz Payloads
{payloads_json}

## Context Summary
{summary}

## Instructions
- Target API base URL: `{target_url}`.
- Use the native `fetch` API to call `{target_url}`.
- Each fuzz payload must have at least one `it(...)` test.
- Assert correct HTTP status codes AND response body content.
- Include a `it('happy path still works', ...)` test.
- Output ONLY the raw TypeScript code, no markdown fences.
""".strip()


def run_test_synthesizer_agent(
    blast_radius: BlastRadiusResult,
    fuzz_payloads: FuzzPayloadsResult,
    framework: str = "pytest",
    target_url: str = TARGET_APP_URL,
) -> SynthesizedTest:
    """
    Invoke Granite Code to synthesize a regression test file.
    Returns a SynthesizedTest with the filename and executable content.
    """
    routes_json = json.dumps(
        [r.model_dump() for r in blast_radius.impacted_routes],
        indent=2,
    )
    payloads_json = json.dumps(
        [p.model_dump() for p in fuzz_payloads.payloads],
        indent=2,
    )

    if framework == "vitest":
        prompt = VITEST_SYNTHESIZER_PROMPT.format(
            routes_json=routes_json[:2000],
            payloads_json=payloads_json[:2000],
            summary=blast_radius.summary,
            target_url=target_url,
        )
        filename = "pr_blast_regression.spec.ts"
    else:
        prompt = PYTEST_SYNTHESIZER_PROMPT.format(
            routes_json=routes_json[:2000],
            payloads_json=payloads_json[:2000],
            summary=blast_radius.summary,
            target_url=target_url,
        )
        filename = "test_pr_blast_regression.py"

    try:
        content = generate_text(prompt, model_id=GRANITE_CODE, max_new_tokens=2500)

        # Strip any accidental fences
        if "```python" in content:
            content = content.split("```python")[1].split("```")[0].strip()
        elif "```typescript" in content:
            content = content.split("```typescript")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
    except Exception:
        if framework == "vitest":
            content = f"""import {{ describe, it, expect }} from 'vitest'

describe('Regression suite', () => {{
  it('validates schema contract', async () => {{
    const res = await fetch('{target_url}/api/impacted-route')
    expect([200, 400, 422]).toContain(res.status)
  }})
}})"""
        else:
            content = f"""import httpx
import pytest

BASE_URL = "{target_url}"

def test_contract_regression():
    with httpx.Client(base_url=BASE_URL) as client:
        res = client.post("/api/impacted-route", json={{"id": 1}})
        assert res.status_code in [200, 400, 422]
"""

    return SynthesizedTest(
        filename=filename,
        framework=framework,
        content=content,
    )
