**Astria AI** is an autonomous developer workflow engine that ingests PR diffs, parses API contracts and schemas, coordinates parallel subagents to calculate downstream blast radius, and writes targeted regression test suites before code hits staging.

---

## 1. System Architecture & Workflow Pipeline

* **IBM Bob 2.0 (Development Partner & Workflow Automation):** The AI coding agent used to scaffold the repository, manage parallel subagent development tasks, ingest API contracts, and automate testing/build scripts via Bob Shell.
* **IBM watsonx.ai & Granite (Runtime Application Engine):** The foundation models (e.g., `ibm/granite-3-8b-instruct`, `ibm/granite-20b-code`) and embeddings (e.g., `ibm/slate-30m-english-rtrvr-v2`) invoked via API inside the FastAPI backend to execute diff analysis, blast-radius dependency tracing, and synthetic test generation at runtime.

---

```
                     ┌────────────────────────────────────────────────────────┐
                     │            Incoming PR / Git Webhook Trigger           │
                     └───────────────────────────┬────────────────────────────┘
                                                 │
                                                 ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                IBM Bob 2.0 Context Engine                                             │
│                                                                                                        │
│  • Document Understanding: Parses OpenAPI specs, schema.prisma / SQL DDLs, and PR requirements.        │
│  • Codebase Indexing: Builds dependency trees and AST call graphs.                                     │
└────────────────────────────────────────┬───────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              Parallel Subagents (Bob Agent Mode)                                       │
│                                                                                                        │
│   ┌──────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────────────┐  │
│   │   Subagent 1: Blast      │  │  Subagent 2: Edge-Case    │  │   Subagent 3: Test Suite          │  │
│   │   Radius Tracer          │  │  Data Constructor         │  │   Synthesizer                     │  │
│   │                          │  │                           │  │                                   │  │
│   │ Maps breaking changes to │  │ Generates malicious /     │  │ Generates executable integration   │  │
│   │ downstream routes & APIs │  │ boundary-condition mocks  │  │ & unit tests (Vitest / Pytest)     │  │
│   └─────────────┬────────────┘  └─────────────┬─────────────┘  └─────────────────┬─────────────────┘  │
└─────────────────┼─────────────────────────────┼──────────────────────────────────┼─────────────────────┘
                  │                             │                                  │
                  └─────────────────────────────┼──────────────────────────────────┘
                                                │
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               Test Execution & PR Orchestrator                                         │
│                                                                                                        │
│   • Executes synthesized test suites in an isolated sandbox.                                           │
│   • Captures regression failures and provides automated inline code fixes.                            │
│   • Writes a comprehensive "Blast Radius & Safety Report" directly to GitHub and Developer UI.         │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

```

---

## 2. Deep Dive: IBM Bob 2.0 Feature Utilization

* **Document Understanding Engine:**
* Ingests project contracts (OpenAPI/Swagger JSON, GraphQL schemas, database migration files, and `README.md` integration rules).
* Parses PR descriptions and issue tracker criteria to extract functional intent rather than just performing raw diff inspection.

* **Agent Mode & Parallel Subagents:**
* **Subagent A (Blast Radius Tracer):** Analyzes the Git diff against the AST to identify all indirect consumers, un-migrated database queries, and broken API contracts.
* **Subagent B (Edge-Case & Fuzz Payload Constructor):** Inspects input boundaries defined in the schema documents to generate boundary-testing inputs (null values, SQL injection vectors, schema mismatch objects).
* **Subagent C (Test Suite Synthesizer):** Concurrently drafts executable end-to-end integration and unit tests matching the repository's test framework standards.

* **Orchestration & Remediation Loop:**
* Runs the generated tests against the PR branch.
* If a regression is caught, the orchestrator triggers an inline remediation subagent to patch the code or leaves an explanatory comment on the exact line of failure.

---

## 3. Recommended Tech Stack

* **Frontend (DevOps Safety Dashboard):** React, TanStack Router, Tailwind CSS, shadcn/ui.
* **Backend & Orchestration API:** Python (FastAPI) or TypeScript (Node.js).
* **AI Engine:** IBM Bob 2.0 (Agent Mode, Subagents, Document Understanding APIs).
* **Database & Real-Time Sync:** Convex (for live task updates as subagents run) or Supabase.
* **Integrations:** GitHub REST API / Webhooks, Vitest / Pytest runners.

---

## 4. Phase-by-Phase Implementation Roadmap

**Day 1: Core Engine & Watsonx Agent Pipeline (Hours 0–24)**

**Block 1 (Hours 0–4): Scaffolding & Target Repo Setup**

* Use **IBM Bob 2.0** in Agent Mode to scaffold the full project monorepo: FastAPI backend, React dashboard, and IBM watsonx.ai client wrappers.
* Create a lightweight "Target Demo Repository" (e.g., a simple Fastify/Express or FastAPI API with a shared database model, user route, and payment webhook) to serve as the subject for PR diffs.
* Set up a sample PR diff that introduces a breaking change (e.g., converting a nullable `billing_address` field to required without updating the notification consumer).

**Block 2 (Hours 4–12): AST Parsing & Document Understanding**

* Implement a git diff parser and AST dependency tracer (using Python's `ast` or `tree-sitter`) to isolate changed symbols and downstream function calls.
* Feed the target repository's OpenAPI spec (`openapi.json`) and database schema into **IBM Bob 2.0 Document Understanding** to generate structured API context maps.
* Build the context assembly module that packages the diff, changed routes, and affected API contracts into a structured payload.

**Block 3 (Hours 12–20): Watsonx.ai Agent Graph (IBM Granite)**

* Wire up the multi-agent pipeline using **IBM Granite** (`ibm/granite-3-8b-instruct` / `ibm/granite-20b-code`) on watsonx.ai:
* **Blast Radius Agent:** Analyzes the call graph and ranks impacted routes by risk score.
* **Synthetic Fuzz Agent:** Generates boundary and edge-case payloads (e.g., legacy `null` payloads, type mismatches).
* **Test Synthesizer Agent:** Generates executable `test_pr_regression.py` or `.spec.ts` files with strict assertions.

* Enforce temperature-0 greedy decoding and JSON schema outputs for deterministic parsing.

**Block 4 (Hours 20–24): Automated Test Execution Sandbox**

* Build a local execution worker in FastAPI that writes the synthesized test file into the target repository and executes it via a headless `subprocess` (`pytest` / `vitest`).
* Parse test output logs into a structured JSON report (Passed, Failed, Regressions Caught, Blast Radius Count).

---

**Day 2: Developer Dashboard, Polish & Demo Assets (Hours 24–48)**

**Block 5 (Hours 24–32): React Visual Command Center**

* Scaffold the frontend using React, TanStack Router, and Tailwind CSS.
* Integrate **React Flow** to render an interactive node graph showing the blast radius: `Modified Model ➔ Impacted Endpoints ➔ Failing Downstream Consumer`.
* Add real-time status steppers displaying subagent execution states and generated test previews with syntax highlighting.

**Block 6 (Hours 32–38): Auto-Remediation & PR Report Generator**

* Implement the remediation fallback: if the synthesized regression test fails, trigger Granite Code to generate a 1-click patch for the downstream consumer.
* Build the markdown report formatter that formats a GitHub-ready PR comment detailing:
* Blast Radius Risk Score (Low / Medium / High / Critical)
* Visual impact tree
* Synthesized regression test code
* Recommended patch diff

**Block 7 (Hours 38–44): End-to-End Testing & Demo Rehearsal**

* Run end-to-end integration tests: Trigger a PR diff ➔ Run AST tracer ➔ Invoke Watsonx Granite agents ➔ Run synthesized test in sandbox ➔ Render live in React UI.
* Seed edge-case scenarios to verify Granite Guardian catches hallucinations or malformed assertions.
* Refactor and clean up the codebase using **IBM Bob 2.0** for linting, documentation, and error handling.

**Block 8 (Hours 44–48): Submission & Video Recording**

* Record a concise 3-minute video walkthrough:

1. Show the invisible breaking change in the PR diff.
2. Show Astria AI running multi-agent analysis via Watsonx Granite.
3. Show the generated regression test catching the failure in the UI.
4. Show the 1-click patch applied.

* Finalize the `README.md` highlighting the architecture, IBM Bob 2.0 agent usage, watsonx models, and setup instructions.

---

## 5. Winning Demo Scenario for Judges

1. **The Trigger:** A developer opens a PR modifying a core `User` model, changing a field from `optional` to `required`.
2. **The Invisible Bug:** Existing unit tests pass because only the user service was tested, but the downstream `Billing` and `Notification` webhooks break on `null` payloads.
3. **The AI Action:**

* Bob 2.0 ingests the API contract and maps the blast radius across `Billing` and `Notification` services.
* Subagents generate edge-case tests with legacy `null` payloads in parallel.
* The test suite executes, immediately flags the failure, and posts a visual blast-radius map and a 1-click patch commit to the PR.

### The Runtime Multi-Agent Pipeline (FastAPI + watsonx.ai)

When a pull request is submitted, the FastAPI backend initiates a coordinated agent graph powered by **IBM Granite**:

* **Diff & Contract Ingestion Agent:** Uses IBM Slate embeddings to query Convex for stored OpenAPI schemas, database definitions (`schema.prisma` / DDL), and related historical PRs matching the touched files.
* **Blast-Radius Tracer Agent (Granite Code):** Traverses the AST call graph to determine every route, downstream consumer, and database model affected by modified functions or schema changes.
* **Synthetic Edge-Case Constructor (Granite Instruct):** Generates boundary-condition payloads (such as `null` fields on newly required keys, type-coercion errors, or malformed JSON) based on contract rules.
* **Test Suite Synthesizer Agent (Granite Code):** Outputs runnable test files (e.g., `tests/regressions/pr_42_blast_test.py` or `.spec.ts`) configured for native test runners (Vitest or Pytest).
* **Safety & Assertion Validator (Granite Guardian):** Ensures generated assertions directly validate contract boundaries without hallucinations or false-positive assertions.

---

### How IBM Bob 2.0 is Leveraged in the Build

To maximize the hackathon evaluation criteria, Bob 2.0 is applied across key development workflows:

* **Document Understanding:** Feed OpenAPI specifications and database migration scripts into Bob 2.0 to generate boilerplate FastAPI endpoints, Pydantic validation models, and mock datasets.
* **Agent Mode & Parallel Subagents:**
* *Subagent 1:* Builds the AST parsing and Git diff comparison utility in Python.
* *Subagent 2:* Implements the watsonx.ai client wrapper with retry logic, streaming, and error handling.
* *Subagent 3:* Scaffolds the React + Tailwind frontend dashboard displaying real-time blast-radius visual graphs.

* **Bob Shell Automation:** Uses Bob's CLI integration to script regression test runs, benchmark execution latency, and validate sandboxed PR checks.

---

### Backend & watsonx Configuration

**Backend Dependencies (`requirements.txt`):**

```text
fastapi>=0.110.0
uvicorn>=0.28.0
ibm-watsonx-ai>=1.0.0
langgraph>=0.0.30
pydantic>=2.6.0
convex>=0.6.0
tree-sitter>=0.21.0
pytest>=8.0.0

```

**watsonx Client Integration (`backend/services/watsonx.py`):**

```python
from ibm_watsonx_ai.foundation_models import Model
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
import os

def get_granite_model(model_id: str = "ibm/granite-3-8b-instruct") -> Model:
    parameters = {
        GenParams.DECODING_METHOD: "greedy",
        GenParams.MAX_NEW_TOKENS: 1024,
        GenParams.MIN_NEW_TOKENS: 1,
        GenParams.TEMPERATURE: 0.0,
    }
    
    return Model(
        model_id=model_id,
        params=parameters,
        credentials={
            "url": os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com"),
            "apikey": os.getenv("WATSONX_API_KEY")
        },
        project_id=os.getenv("WATSONX_PROJECT_ID")
    )

```
