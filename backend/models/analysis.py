from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ImpactedRoute(BaseModel):
    method: str
    path: str
    service: str
    risk_reason: str


class BlastRadiusResult(BaseModel):
    risk_level: RiskLevel
    risk_score: int = Field(ge=0, le=100)
    impacted_routes: List[ImpactedRoute]
    impacted_models: List[str]
    summary: str


class FuzzPayload(BaseModel):
    name: str
    description: str
    payload: dict
    expected_failure: str


class FuzzPayloadsResult(BaseModel):
    payloads: List[FuzzPayload]


class SynthesizedTest(BaseModel):
    filename: str
    framework: str  # "pytest" | "vitest"
    content: str


class TestExecutionResult(BaseModel):
    passed: int
    failed: int
    errors: int
    regressions_caught: List[str]
    output: str
    success: bool


class RemediationPatch(BaseModel):
    file_path: str
    original_snippet: str
    patched_snippet: str
    explanation: str


class AnalysisRequest(BaseModel):
    diff: str
    openapi_spec: Optional[str] = None
    db_schema: Optional[str] = None
    pr_title: Optional[str] = "PR Analysis"
    pr_description: Optional[str] = ""
    target_framework: str = "pytest"  # "pytest" | "vitest"


class ExecutionMetrics(BaseModel):
    blast_radius_latency_ms: Optional[float] = None
    fuzz_constructor_latency_ms: Optional[float] = None
    test_synthesizer_latency_ms: Optional[float] = None
    remediation_latency_ms: Optional[float] = None
    total_pipeline_latency_ms: Optional[float] = None
    model_name: Optional[str] = None


class AnalysisReport(BaseModel):
    pr_title: str
    blast_radius: BlastRadiusResult
    fuzz_payloads: FuzzPayloadsResult
    synthesized_test: SynthesizedTest
    test_execution: Optional[TestExecutionResult] = None
    remediation: Optional[RemediationPatch] = None
    metrics: Optional[ExecutionMetrics] = None
    markdown_report: str

