# ImpactTest AI

> **Autonomous PR Blast-Radius Analyzer & Regression Test Generator**
> Powered by IBM Granite on watsonx.ai · Built with IBM Bob 2.0

---

## What It Does

ImpactTest AI ingests a PR diff, parses API contracts and database schemas, then coordinates parallel IBM Granite subagents to:

1. **Trace the Blast Radius** — identify every downstream API route, service, and DB model broken by the change
2. **Construct Edge-Case Payloads** — generate boundary-condition and adversarial test data
3. **Synthesize Regression Tests** — produce executable `pytest` / `vitest` files with strict assertions
4. **Execute Tests in Sandbox** — run the tests and capture regressions automatically
5. **Generate 1-Click Patches** — auto-fix the downstream consumer when a regression is caught

---

## Architecture

```
PR Diff + API Contract
        │
        ▼
┌─────────────────────────────────────────────────┐
│              FastAPI Backend (Python)            │
│                                                  │
│  1. Diff Parser + AST Tracer                    │
│  2. Context Assembly (diff + openapi + schema)  │
│                                                  │
│  ┌──────────────┐    ┌────────────────────────┐ │
│  │ Granite Code │    │   Granite Instruct     │ │
│  │ Blast Radius │    │   Fuzz Constructor     │ │
│  │ Tracer Agent │    │   Agent                │ │
│  └──────┬───────┘    └──────────┬─────────────┘ │
│         └────────────┬──────────┘               │
│                      ▼                           │
│           Granite Code Test Synthesizer         │
│                      │                           │
│           Test Execution Sandbox (subprocess)   │
│                      │                           │
│           Granite Code Remediation Agent        │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│           React Dashboard (TanStack Start)        │
│                                                   │
│  • Live status via Convex real-time sync          │
│  • React Flow blast-radius impact graph           │
│  • Test code preview + execution output           │
│  • 1-click patch diff viewer                      │
└──────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI Engine | IBM Granite 3 8B Instruct + Granite 20B Code (watsonx.ai) |
| Backend | FastAPI + Python 3.12 |
| AST Parsing | Python `ast` module + regex fallback |
| Frontend | React 19, TanStack Router, TailwindCSS v4 |
| Real-Time Sync | Convex |
| Graph Visualization | React Flow (@xyflow/react) |

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 20+ / pnpm
- IBM watsonx.ai API key + Project ID

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Configure credentials
cp .env.example .env
# Edit .env with your WATSONX_API_KEY and WATSONX_PROJECT_ID

# Start the API
uvicorn main:app --reload --port 8000
```

### Demo Target (optional — needed for live test execution)

```bash
# In a second terminal, from backend/
uvicorn demo_target.app:app --port 8001
```

### Frontend

```bash
cd frontend
pnpm install

# Set your Convex deployment URL (created via `npx convex dev`)
# VITE_CONVEX_URL is set automatically by `convex dev`

pnpm dev
```

---

## Demo Scenario

The built-in demo reproduces the **invisible breaking change** from PLAN.md:

1. Developer changes `billing_address: Optional[str] = None` → `billing_address: str` on the `User` model
2. Existing unit tests pass (only user service was tested)
3. ImpactTest AI:
   - Maps blast radius to `/billing/charge` and `/notifications/send`
   - Generates `null` payload edge cases
   - Synthesizes regression tests that **immediately catch the failure**
   - Proposes a 1-click patch

Click **✨ Load Demo Scenario** in the UI and hit **Run Blast Radius Analysis**.

---

## IBM Bob 2.0 Usage

This project was built using IBM Bob 2.0 as the development partner:

- **Document Understanding** — PLAN.md fed directly as project context
- **Agent Mode** — Parallel subagents built the AST parser, watsonx client, and frontend dashboard concurrently
- **Scaffolding** — Full monorepo structure (FastAPI + TanStack Start + Convex) scaffolded via Bob

---

## API Reference

```
POST /analyze           # Full analysis pipeline
POST /analyze/demo      # Run the built-in demo scenario
GET  /health            # Service health check
GET  /docs              # FastAPI Swagger UI
```

### Request body (`POST /analyze`)

```json
{
  "diff": "--- a/file.py\n+++ b/file.py\n...",
  "openapi_spec": "openapi: 3.0.0\n...",
  "db_schema": "model User { ... }",
  "pr_title": "feat: make billing_address required",
  "target_framework": "pytest"
}
```

---

## License

MIT
