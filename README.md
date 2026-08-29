# Astria AI ⚡

> **Autonomous PR Blast-Radius Analyzer & Regression Test Generator**  
> Powered by **IBM Granite on watsonx.ai** · Built with **IBM Bob 2.0** · Real-time sync via **Convex**

---

## What It Does

Astria AI ingests a pull request diff, parses API contracts and database schemas, then coordinates **three parallel IBM Granite subagents** to:

1. **Trace the Blast Radius** — identify every downstream API route, service, and DB model broken by the change
2. **Construct Edge-Case Payloads** — generate boundary-condition and adversarial test data (null fields, type mismatches, SQL injection vectors)
3. **Synthesize Regression Tests** — produce executable `pytest` / `vitest` files with strict assertions
4. **Execute Tests in Sandbox** — run tests and capture regressions automatically
5. **Generate 1-Click Patches** — auto-fix the downstream consumer when a regression is caught
6. **Post to GitHub PR** — write a full "Blast Radius & Safety Report" comment directly on the pull request

---

## Architecture

```
PR Diff + API Contract
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (Python)                       │
│                                                                  │
│  1. Diff Parser + Python AST Tracer                             │
│  2. Context Assembly (diff + openapi + db_schema)               │
│                                                                  │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │  IBM Granite Code    │    │   IBM Granite Instruct       │  │
│  │  Blast Radius Agent  │    │   Fuzz Constructor Agent     │  │
│  │  (ibm/granite-20b-   │    │   (ibm/granite-3-8b-         │  │
│  │   code-instruct)     │    │    instruct)                 │  │
│  └──────────┬───────────┘    └──────────────┬───────────────┘  │
│             └───────────────┬───────────────┘                   │
│                             ▼                                    │
│             IBM Granite Code Test Synthesizer                   │
│                             │                                    │
│             Test Execution Sandbox (subprocess)                 │
│                             │                                    │
│             IBM Granite Code Remediation Agent                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ POST /github/pr-comment
                              │ Convex runAnalysis action
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              React Dashboard (TanStack Start + SSR)              │
│                                                                  │
│  • GitHub OAuth sign-in via Convex Auth                         │
│  • Live analysis status via Convex real-time subscriptions      │
│  • React Flow blast-radius impact graph                         │
│  • Test code preview + execution output                          │
│  • 1-click patch diff viewer                                     │
│  • Automatic GitHub PR comment after analysis completes         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| AI Engine | IBM Granite 3 8B Instruct + Granite 20B Code on watsonx.ai |
| Backend | FastAPI + Python 3.12 |
| AST Parsing | Python `ast` module + regex fallback |
| Frontend | React 19, TanStack Start (SSR), TanStack Router |
| Styling | Tailwind CSS v4 + GitHub Primer design tokens |
| Real-Time Sync | Convex (live subscriptions) |
| Auth | Convex Auth + GitHub OAuth |
| Graph Visualization | React Flow (`@xyflow/react`) |
| State | Zustand |
| GitHub Integration | GitHub App (webhooks + REST API) |

---

## Project Structure

```
ImpactTextAI/
├── backend/                    # FastAPI multi-agent pipeline
│   ├── main.py                 # Orchestrator + /analyze + /analyze/demo endpoints
│   ├── requirements.txt
│   ├── .env.example
│   ├── agents/
│   │   ├── blast_radius.py     # Granite Code — blast radius tracer
│   │   ├── fuzz_constructor.py # Granite Instruct — edge-case payload generator
│   │   ├── test_synthesizer.py # Granite Code — pytest/vitest file synthesizer
│   │   └── remediation.py      # Granite Code — 1-click patch generator
│   ├── services/
│   │   ├── config.py           # Environment variable loader
│   │   ├── watsonx.py          # IBM watsonx.ai client wrapper (retry + JSON parsing)
│   │   ├── diff_parser.py      # Unified diff parser + Python AST caller tracer
│   │   ├── sandbox_executor.py # subprocess pytest/vitest runner + output parser
│   │   ├── report_formatter.py # GitHub-ready markdown report formatter
│   │   └── github_client.py    # GitHub App JWT, installation tokens, PR comments
│   ├── routers/
│   │   └── github_webhook.py   # POST /github/webhook + POST /github/pr-comment
│   └── demo_target/
│       └── app.py              # Demo FastAPI with intentional billing_address regression
│
└── frontend/                   # TanStack Start SSR dashboard
    ├── convex/
    │   ├── schema.ts           # installations, repos, pullRequests, analyses + authTables
    │   ├── analyses.ts         # listAnalyses, getAnalysis, createAnalysis, runAnalysis
    │   ├── github.ts           # listInstallations, listRepos, linkInstallationsToUser, …
    │   ├── auth.ts             # convexAuth(GitHub) + viewer query
    │   └── auth.config.ts      # CONVEX_SITE_URL
    └── src/
        ├── routes/
        │   ├── index.tsx           # / — Landing page
        │   ├── login.tsx           # /login — GitHub OAuth
        │   ├── dashboard.tsx       # /dashboard — Installations + analyses
        │   ├── dashboard.$owner.$repo.tsx  # /dashboard/:owner/:repo — PR list
        │   ├── dashboard.manual.tsx        # /dashboard/manual — Paste diff
        │   └── analysis.$id.tsx    # /analysis/:id — Full report
        └── components/
            ├── BlastRadiusGraph.tsx # React Flow impact graph
            ├── AnalysisReportView.tsx
            ├── StatusStepper.tsx
            ├── AnalysisForm.tsx
            ├── NavBar.tsx
            └── RiskBadge.tsx
```

---

## Setup

### Prerequisites

- **Python 3.11+** and pip/venv
- **Node.js 20+** and [pnpm](https://pnpm.io)
- **IBM watsonx.ai** account — [cloud.ibm.com](https://cloud.ibm.com) → create a project → copy API key + Project ID
- **Convex** account — [convex.dev](https://dashboard.convex.dev) → create a project
- **GitHub App** (for automatic webhook analysis) — optional, the manual paste flow works without it

---

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — minimum required:
#   WATSONX_API_KEY=...
#   WATSONX_PROJECT_ID=...
```

Start the API server:

```bash
uvicorn main:app --reload --port 8000
```

API is now at `http://localhost:8000`.  
Swagger UI: `http://localhost:8000/docs`

---

### 2. Convex deployment

```bash
cd frontend
pnpm install
npx convex dev --once   # creates your deployment + syncs schema
```

Set server-side environment variables (do **not** put these in `.env` files):

```bash
npx convex env set GITHUB_CLIENT_ID       <your-github-oauth-app-client-id>
npx convex env set GITHUB_CLIENT_SECRET   <your-github-oauth-app-client-secret>
npx convex env set GITHUB_APP_ID          <your-github-app-id>
npx convex env set BACKEND_URL            http://localhost:8000
npx convex env set CONVEX_SITE_URL        https://<your-deployment>.convex.site
```

---

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Set VITE_CONVEX_URL to your Convex deployment URL
# e.g. VITE_CONVEX_URL=https://happy-animal-123.convex.cloud

pnpm dev
```

Dashboard is now at `http://localhost:3000`.

---

### 4. GitHub App (optional — enables automatic PR analysis)

Create a GitHub App at `https://github.com/settings/apps/new`:

| Setting | Value |
| --- | --- |
| Homepage URL | `http://localhost:3000` |
| Webhook URL | `http://your-backend-host:8000/github/webhook` |
| Webhook secret | Generate a random secret → set as `GITHUB_WEBHOOK_SECRET` in `backend/.env` |
| Permissions | Pull requests: Read & write, Contents: Read |
| Events | Pull request, Installation |

After creating the app:

1. Download the private key → save as `backend/github_app.pem`  
   (or set `GITHUB_APP_PRIVATE_KEY_PATH` in `backend/.env`)
2. Set in `backend/.env`:

   ```
   GITHUB_APP_ID=<your-app-id>
   GITHUB_WEBHOOK_SECRET=<your-webhook-secret>
   CONVEX_URL=https://<your-deployment>.convex.cloud
   ```

3. Install the app on your target repository

When a developer opens a PR, the pipeline fires automatically and posts a comment like:

```
## ⚡ Astria AI — Blast Radius Report

**Risk Level:** 🔴 HIGH (score: 78/100)

### Impacted Routes
| Method | Path | Service | Risk |
|--------|------|---------|------|
| POST | /billing/charge | billing-service | billing_address now required |
| POST | /notifications/send | notifications | null payload breaks consumer |

### Synthesized Regression Test
[pytest file excerpt]

### Recommended Patch
[unified diff]
```

---

### 5. OAuth Application (for GitHub sign-in)

Create a GitHub OAuth App at `https://github.com/settings/developers`:

| Setting | Value |
| --- | --- |
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `https://<your-deployment>.convex.site/api/auth/callback/github` |

Copy the Client ID and Secret → set via `npx convex env set` (see step 2 above).

---

## Demo Scenario

The built-in demo reproduces the **invisible breaking change** from the architecture plan:

1. Developer changes `billing_address: Optional[str] = None` → `billing_address: str` on the `User` model
2. Existing unit tests pass (only user service was tested)
3. Astria AI:
   - Maps blast radius to `/billing/charge` and `/notifications/send`
   - Generates `null` payload edge cases
   - Synthesizes regression tests that **immediately catch the failure**
   - Proposes a 1-click patch

**To run:**

Click **✨ Load Demo Scenario** on the manual analysis page, then hit **Run Blast Radius Analysis**.

Or hit the API directly:

```bash
curl -X POST http://localhost:8000/analyze/demo | python -m json.tool
```

---

## API Reference

### `POST /analyze`

Full analysis pipeline.

```json
{
  "diff": "--- a/models/user.py\n+++ b/models/user.py\n...",
  "openapi_spec": "openapi: 3.0.0\n...",
  "db_schema": "model User { id Int ... }",
  "pr_title": "feat: make billing_address required",
  "target_framework": "pytest"
}
```

### `POST /analyze/demo`

Runs the built-in billing_address demo scenario. No body required.

### `POST /github/webhook`

GitHub App webhook receiver. Handles `installation`, `installation_repositories`, and `pull_request` events. Verified via `X-Hub-Signature-256`.

### `POST /github/pr-comment`

Posts a markdown report as a comment on a GitHub PR. Called by the Convex `runAnalysis` action.

```json
{
  "installation_id": 12345678,
  "owner": "my-org",
  "repo": "my-repo",
  "pr_number": 42,
  "markdown_report": "## ⚡ Astria AI ..."
}
```

### `GET /health`

`{"status": "ok", "service": "Astria AI"}`

### `GET /docs`

FastAPI Swagger UI with interactive playground.

---

## IBM Bob 2.0 Usage

This project was built end-to-end using **IBM Bob 2.0** as the development partner:

| Bob Feature | How It Was Used |
| --- | --- |
| **Document Understanding** | `PLAN.md` fed as project context; OpenAPI spec + Prisma schema ingested to generate Pydantic models and FastAPI endpoints |
| **Agent Mode / Parallel Subagents** | Three subagents built concurrently: AST parser, watsonx.ai client wrapper, and React dashboard |
| **Scaffolding** | Full monorepo structure (FastAPI + TanStack Start + Convex) scaffolded via Bob in a single session |
| **Code Review** | Bob reviewed all agent prompts for hallucination risk and output schema compliance |

---

## License

MIT
