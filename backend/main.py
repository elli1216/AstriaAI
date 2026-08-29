"""
Astria AI — FastAPI Backend (with GitHub App webhook receiver)

Orchestrates the multi-agent pipeline:
  1. Parse the PR diff → build context payload
  2. Run Blast Radius Tracer (Granite Code)     ← parallel
  3. Run Fuzz Constructor (Granite Instruct)    ← parallel
  4. Run Test Synthesizer (Granite Code)        ← after 2 & 3
  5. Execute synthesized tests in sandbox
  6. (If failures) Run Remediation Agent
  7. Format and return the final report
"""
import asyncio
import concurrent.futures
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.analysis import AnalysisRequest, AnalysisReport
from services.diff_parser import parse_diff, trace_ast_callers, build_context_payload
from agents.blast_radius import run_blast_radius_agent
from agents.fuzz_constructor import run_fuzz_constructor_agent
from agents.test_synthesizer import run_test_synthesizer_agent
from agents.remediation import run_remediation_agent
from services.sandbox_executor import execute_synthesized_tests
from services.report_formatter import format_markdown_report
from services.config import FRONTEND_URL
from routers.github_webhook import router as github_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Astria AI",
    description="Autonomous PR blast-radius analyzer and regression test generator powered by IBM Granite on watsonx.ai",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(github_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "Astria AI"}


@app.post("/analyze", response_model=AnalysisReport)
async def analyze_pr(request: AnalysisRequest) -> AnalysisReport:
    """
    Full multi-agent analysis pipeline for a PR diff.

    Steps:
    - Parse diff → extract changed symbols
    - Trace AST callers (in-process)
    - Run Blast Radius and Fuzz Constructor agents in parallel
    - Synthesize regression tests
    - Execute tests in sandbox
    - Run remediation if failures detected
    - Return structured report with markdown
    """
    # ── Step 1: Parse diff & build context ───────────────────────────────────
    diff_summary = parse_diff(request.diff)
    symbol_names = [s.name for s in diff_summary.changed_symbols]
    callers = trace_ast_callers(symbol_names)  # no local codebase to scan, returns empty map

    context = build_context_payload(
        diff_summary=diff_summary,
        openapi_spec=request.openapi_spec,
        db_schema=request.db_schema,
        callers=callers,
    )

    # ── Step 2 & 3: Parallel Granite agents ──────────────────────────────────
    loop = asyncio.get_running_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        blast_future = loop.run_in_executor(pool, run_blast_radius_agent, context)
        fuzz_future = loop.run_in_executor(pool, run_fuzz_constructor_agent, context)

        try:
            blast_radius, fuzz_payloads = await asyncio.gather(blast_future, fuzz_future)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Agent pipeline error: {exc}")

    # ── Step 4: Test synthesis ────────────────────────────────────────────────
    try:
        synthesized_test = await loop.run_in_executor(
            None,
            run_test_synthesizer_agent,
            blast_radius,
            fuzz_payloads,
            request.target_framework,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Test synthesis error: {exc}")

    # ── Step 5: Execute tests in sandbox ─────────────────────────────────────
    test_execution = None
    remediation = None
    try:
        test_execution = await loop.run_in_executor(
            None, execute_synthesized_tests, synthesized_test
        )

        # ── Step 6: Remediation if failures ──────────────────────────────────
        if not test_execution.success and test_execution.regressions_caught:
            remediation = await loop.run_in_executor(
                None, run_remediation_agent, blast_radius, test_execution
            )
    except Exception:
        # Sandbox execution is best-effort; don't fail the entire request
        pass

    # ── Step 7: Format report ─────────────────────────────────────────────────
    report = AnalysisReport(
        pr_title=request.pr_title or "PR Analysis",
        blast_radius=blast_radius,
        fuzz_payloads=fuzz_payloads,
        synthesized_test=synthesized_test,
        test_execution=test_execution,
        remediation=remediation,
        markdown_report="",  # filled below
    )
    report.markdown_report = format_markdown_report(report)

    return report


@app.post("/analyze/demo", response_model=AnalysisReport)
async def analyze_demo() -> AnalysisReport:
    """
    Run the demo scenario from PLAN.md:
    User model billing_address changed from Optional → Required,
    breaking downstream Billing and Notification webhooks.
    """
    demo_request = AnalysisRequest(
        pr_title="feat: make billing_address required on User model",
        pr_description="Removes Optional[str] from billing_address to enforce data completeness.",
        diff=DEMO_DIFF,
        openapi_spec=DEMO_OPENAPI,
        db_schema=DEMO_DB_SCHEMA,
        target_framework="pytest",
    )
    return await analyze_pr(demo_request)


# ── Demo fixtures ─────────────────────────────────────────────────────────────

DEMO_DIFF = """
--- a/demo_target/models/user.py
+++ b/demo_target/models/user.py
@@ -8,7 +8,7 @@ class UserModel(BaseModel):
     id: int
     email: str
     name: str
-    billing_address: Optional[str] = None
+    billing_address: str
     created_at: datetime
""".strip()

DEMO_OPENAPI = """
openapi: 3.0.0
paths:
  /users/{id}:
    get:
      summary: Get user by ID
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /billing/charge:
    post:
      summary: Charge billing for user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              properties:
                user_id: { type: integer }
                billing_address: { type: string }  # was optional, now required
  /notifications/send:
    post:
      summary: Send notification to user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              properties:
                user_id: { type: integer }
                billing_address: { type: string, nullable: true }
""".strip()

DEMO_DB_SCHEMA = """
model User {
  id             Int      @id @default(autoincrement())
  email          String   @unique
  name           String
  billing_address String?   // was nullable — now required in app layer
  createdAt      DateTime @default(now())
}
""".strip()
