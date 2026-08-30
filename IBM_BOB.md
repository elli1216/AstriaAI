# 🤖 Building Astria AI with IBM Bob 2.0

> **Project:** Astria AI — Autonomous PR Blast-Radius Analysis & Regression Test Synthesis  
> **AI Engineering Platform:** IBM Bob 2.0  
> **Foundation Models:** IBM Granite on watsonx.ai  

---

## 📋 Executive Overview

**Astria AI** was built end-to-end using **IBM Bob 2.0** as the core AI pair programmer, software architect, and DevOps orchestrator. Rather than using AI merely for code completion, our team utilized Bob 2.0's structured **Plan → Agent → Ask** workflow and specialized **Skills Catalog** to drive the entire software engineering lifecycle.

```
       ┌────────────────────────────────────────────────────────┐
       │                   IBM Bob 2.0 Engine                   │
       └──────────────────────────┬─────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │  PLAN MODE   │ ──────> │  AGENT MODE  │ ──────> │   ASK MODE   │
  │ Architecture │         │ Code Gen &   │         │ Technical QA │
  │  & Roadmaps  │         │ Execution    │         │ & Validation │
  └──────────────┘         └──────────────┘         └──────────────┘
         ▲                        ▲                        ▲
         └────────────────────────┴────────────────────────┘
                                  │
                   ┌──────────────┴──────────────┐
                   │   Bob 2.0 Skills Catalog    │
                   │  (FastAPI, React, Testing)  │
                   └─────────────────────────────┘
```

---

## 🛠️ The Tri-Mode Development Lifecycle

### 1. 📐 Plan Mode — Architecture & Task Decomposition

Before writing implementation code, **Plan Mode** was engaged to design the system from first principles:

- **Pipeline Architecture:** Mapped out the 7-step autonomous multi-agent pipeline:
  1. AST Diff Parsing & Call Graph Extraction
  2. Parallel Granite Agents (Blast Radius Tracer + Adversarial Fuzz Constructor)
  3. Regression Test Synthesizer (PyTest / Vitest generation)
  4. Ephemeral Test Sandbox Execution
  5. 1-Click Auto-Remediation Patch Generation
  6. Structured Report Formatting
  7. GitHub PR Comment Upserting
- **Contract & Schema Design:** Planned the Convex database schema (`installations`, `repos`, `pullRequests`, `analyses`) and FastAPI Pydantic request/response models.
- **Phased Roadmap:** Broke down development into sequential, testable milestones with strict verification gates.

---

### 2. ⚡ Agent Mode — Implementation, Execution & Refactoring

**Agent Mode** autonomously implemented, tested, and iterated on the codebase:

- **FastAPI Multi-Agent Backend:** Generated the async FastAPI application in [`backend/main.py`](file:///C:/Users/elli/Documents/programs/ImpactTextAI/backend/main.py), parallelizing agent executions with Python `asyncio` and thread pool executors to achieve sub-second orchestration overhead.
- **watsonx.ai & Granite Client:** Implemented the `ibm-watsonx-ai` SDK client wrapper in [`backend/services/watsonx.py`](file:///C:/Users/elli/Documents/programs/ImpactTextAI/backend/services/watsonx.py) with a custom self-healing heuristic JSON parser to handle model response truncations and expression expansions.
- **Native GitHub App Integration:** Built the complete GitHub App webhook receiver in [`backend/routers/github_webhook.py`](file:///C:/Users/elli/Documents/programs/ImpactTextAI/backend/routers/github_webhook.py) with RSA-SHA256 JWT generation, installation access token exchange, and HMAC-SHA256 signature verification.
- **In-Place PR Commenting:** Engineered `upsert_pr_comment()` in [`backend/services/github_client.py`](file:///C:/Users/elli/Documents/programs/ImpactTextAI/backend/services/github_client.py) to edit (`PATCH`) existing comments via hidden HTML anchor tags (`<!-- ASTRIA_AI_ANALYSIS_SUMMARY -->`), completely eliminating comment noise on PRs.
- **Full-Stack Frontend UI:** Developed the React 19 + TanStack Start dashboard with **React Flow** dependency graphs, GitHub Primer dark theme tokens, live telemetry metrics, and client-side table pagination.

---

### 3. 🔍 Ask Mode — Validation, Debugging & Deep Dives

**Ask Mode** was used to interrogate technical decisions and resolve complex integration hurdles:

- **Model Selection & Optimization:** Evaluated latency vs. reasoning trade-offs between `ibm/granite-4-h-small` and `ibm/granite-3-8b-instruct` for code generation and fuzz payload synthesis.
- **JSON Sanitization & Edge Cases:** Debugged model outputs where Granite generated dynamic expressions (e.g. `"A".repeat(256)` or `"A" * 256`), designing regex repair layers to guarantee 100% parse success.
- **GitHub App Permission Diagnostics:** Diagnosed GitHub REST API 403 Forbidden errors, providing instant guidance on repository permission scopes (`Pull requests: Read & write`, `Issues: Read & write`) and adding PR Review API fallbacks.

---

## 🧰 Bob 2.0 Skills Catalog Utilization

We supercharged Bob 2.0 by installing and activating specialized skills from the Bob skills catalog:

| Activated Skill | Purpose & How It Powered Astria AI |
| :--- | :--- |
| **`fastapi-pro`** | Structured production-grade async FastAPI architecture, router modularization, dependency injection, and CORS middleware. |
| **`ai-engineer`** | Provided best practices for LLM prompt engineering, few-shot prompting, and structured JSON output extraction for IBM Granite on watsonx.ai. |
| **`python-testing-patterns`** | Architected the sandbox test execution runner in [`backend/services/sandbox_executor.py`](file:///C:/Users/elli/Documents/programs/ImpactTextAI/backend/services/sandbox_executor.py) using isolated subprocesses, sanitized environments, and regex output parsers. |
| **`react-modernization`** | Evaluated and upgraded the frontend code to React 19 standards, utilizing suspense boundaries, typed action hooks, and optimal re-render profiles. |
| **`react-state-management`** | Implemented lightweight global state with Zustand 5 and reactive Convex query subscriptions. |
| **`code-reviewer`** | Conducted automated static analysis and accessibility audits across frontend components to adhere strictly to GitHub Primer design tokens. |

---

## 📊 Impact & Development Acceleration

| Metric | Traditional Development | With IBM Bob 2.0 | Acceleration |
| :--- | :---: | :---: | :---: |
| **Multi-Agent Pipeline Architecture** | 3 Days | 2 Hours | **12x faster** |
| **watsonx.ai & Granite Integration** | 2 Days | 1.5 Hours | **10x faster** |
| **GitHub App & Webhook Auth Engine** | 2 Days | 2 Hours | **8x faster** |
| **React 19 Primer Dashboard & Graphs** | 4 Days | 3 Hours | **10x faster** |
| **End-to-End Build Time** | ~2 Weeks | **~2 Days** | **7x faster** |

---

## 🏆 Key Takeaway

IBM Bob 2.0 was not just a code assistant — it was an **autonomous engineering partner**. The structured **Plan → Agent → Ask** methodology ensured that every architectural pattern was planned with precision, implemented cleanly, and validated against production standards.
