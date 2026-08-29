"""
Auto-Remediation Agent (Granite Code)

If the synthesized regression test fails, this agent generates a 1-click patch
for the downstream consumer responsible for the failure.
"""
import json
from models.analysis import RemediationPatch, TestExecutionResult, BlastRadiusResult
from services.watsonx import generate_json
from services.config import GRANITE_CODE


REMEDIATION_PROMPT_TEMPLATE = """
You are a senior software engineer. A regression test suite has caught failures caused
by a recent pull request. Generate a minimal targeted patch to fix the downstream
consumer(s) responsible.

## Blast Radius Summary
{summary}

## Impacted Routes
{routes_json}

## Test Failures
{failures_json}

## Task
Respond ONLY with a valid JSON object (no markdown):
{{
  "file_path": "path/to/affected/file.py",
  "original_snippet": "The exact code block that needs changing",
  "patched_snippet": "The fixed replacement code",
  "explanation": "Concise explanation of the fix applied"
}}
""".strip()


def run_remediation_agent(
    blast_radius: BlastRadiusResult,
    test_result: TestExecutionResult,
) -> RemediationPatch:
    """
    Invoke Granite Code to generate a patch for caught regressions.
    Returns a RemediationPatch.
    """
    prompt = REMEDIATION_PROMPT_TEMPLATE.format(
        summary=blast_radius.summary,
        routes_json=json.dumps(
            [r.model_dump() for r in blast_radius.impacted_routes[:5]], indent=2
        ),
        failures_json=json.dumps(test_result.regressions_caught[:10], indent=2),
    )

    data = generate_json(prompt, model_id=GRANITE_CODE)

    return RemediationPatch(
        file_path=data.get("file_path", "unknown"),
        original_snippet=data.get("original_snippet", ""),
        patched_snippet=data.get("patched_snippet", ""),
        explanation=data.get("explanation", ""),
    )
