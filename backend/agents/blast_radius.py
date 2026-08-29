"""
Blast Radius Tracer Agent (Granite Code)

Analyzes the structured diff context and ranks impacted API routes by risk score.
"""
import json
from models.analysis import BlastRadiusResult, ImpactedRoute, RiskLevel
from services.watsonx import generate_json
from services.config import GRANITE_CODE


BLAST_RADIUS_PROMPT_TEMPLATE = """
You are a senior backend engineer performing a blast-radius analysis on a pull request diff.

Given the following context, identify every API route, service, and downstream consumer
that could be broken by the code changes. Rank the overall risk and assign a risk score 0-100.

## Context
Changed files: {changed_files}
Changed symbols: {changed_symbols_json}
Downstream callers: {callers_json}

## API Contract (OpenAPI spec excerpt)
{openapi_spec}

## Database Schema
{db_schema}

## Raw Diff (first 2000 chars)
{raw_diff}

## Task
Respond ONLY with a valid JSON object matching this exact schema (no markdown, no prose):
{{
  "risk_level": "low" | "medium" | "high" | "critical",
  "risk_score": <integer 0-100>,
  "impacted_routes": [
    {{
      "method": "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
      "path": "/api/example",
      "service": "UserService",
      "risk_reason": "Short explanation of why this route is affected"
    }}
  ],
  "impacted_models": ["ModelName1", "ModelName2"],
  "summary": "One paragraph executive summary of the blast radius"
}}
""".strip()


def run_blast_radius_agent(context: dict) -> BlastRadiusResult:
    """
    Invoke Granite Code to trace blast radius from the diff context.
    Returns a validated BlastRadiusResult.
    """
    prompt = BLAST_RADIUS_PROMPT_TEMPLATE.format(
        changed_files=", ".join(context.get("changed_files", [])),
        changed_symbols_json=json.dumps(context.get("changed_symbols", []), indent=2)[:1500],
        callers_json=json.dumps(context.get("downstream_callers", {}), indent=2)[:1000],
        openapi_spec=str(context.get("openapi_spec", "(not provided)"))[:1500],
        db_schema=str(context.get("db_schema", "(not provided)"))[:800],
        raw_diff=str(context.get("raw_diff", ""))[:2000],
    )

    data = generate_json(prompt, model_id=GRANITE_CODE)

    impacted_routes = [
        ImpactedRoute(**route) for route in data.get("impacted_routes", [])
    ]

    return BlastRadiusResult(
        risk_level=RiskLevel(data.get("risk_level", "medium")),
        risk_score=int(data.get("risk_score", 50)),
        impacted_routes=impacted_routes,
        impacted_models=data.get("impacted_models", []),
        summary=data.get("summary", ""),
    )
