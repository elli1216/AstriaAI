"""
GitHub App webhook receiver.

Handles:
- installation (created / deleted / suspend / unsuspend)
- installation_repositories (added / removed)
- pull_request (opened / synchronize / reopened)

On receiving a PR event, fetches the diff and fires the analysis pipeline.
Writes results back to Convex via HTTP API.
"""
import json
import os
import asyncio
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from services.github_client import (
    fetch_pr_diff,
    list_installation_repos,
    post_pr_comment,
    verify_webhook_signature,
)

router = APIRouter(prefix="/github", tags=["github"])

WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")
CONVEX_URL = os.getenv("CONVEX_URL", "")


# ── PR Comment endpoint ───────────────────────────────────────────────────────

class PrCommentRequest(BaseModel):
    installation_id: int
    owner: str
    repo: str
    pr_number: int
    markdown_report: str


@router.post("/pr-comment", status_code=204)
async def post_pr_comment_endpoint(req: PrCommentRequest):
    """
    Post a markdown report as a GitHub PR comment.
    Called by the Convex `runAnalysis` action after analysis completes.
    """
    await post_pr_comment(
        installation_id=req.installation_id,
        owner=req.owner,
        repo=req.repo,
        pr_number=req.pr_number,
        body=req.markdown_report,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _convex_action(action_name: str, args: dict) -> dict:
    """
    Call a Convex action via the HTTP API.
    action_name: e.g. "github:handleWebhookPullRequest"
    """
    import httpx
    if not CONVEX_URL:
        raise RuntimeError("CONVEX_URL is not set")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{CONVEX_URL}/api/action",
            json={"path": action_name, "args": args},
            headers={"Content-Type": "application/json"},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()


# ── Webhook endpoint ──────────────────────────────────────────────────────────

@router.post("/webhook")
async def github_webhook(request: Request):
    payload_bytes = await request.body()
    sig = request.headers.get("X-Hub-Signature-256", "")

    if WEBHOOK_SECRET and not verify_webhook_signature(payload_bytes, sig, WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event = request.headers.get("X-GitHub-Event", "")
    try:
        payload = json.loads(payload_bytes)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Fire-and-forget; return 200 immediately to GitHub
    asyncio.create_task(_handle_event(event, payload))
    return {"received": True}


async def _handle_event(event: str, payload: dict) -> None:
    try:
        if event == "installation":
            await _handle_installation(payload)
        elif event == "installation_repositories":
            await _handle_installation_repos(payload)
        elif event == "pull_request":
            await _handle_pull_request(payload)
    except Exception as exc:
        # Log but don't crash the background task
        print(f"[webhook] Error handling {event}: {exc}")


async def _handle_installation(payload: dict) -> None:
    action = payload.get("action", "")
    inst = payload.get("installation", {})
    account = inst.get("account", {})
    repos = payload.get("repositories", [])

    installation_id = inst.get("id")
    account_login = account.get("login", "")
    account_type = account.get("type", "User")

    await _convex_action(
        "github:handleWebhookInstallation",
        {
            "installationId": installation_id,
            "accountLogin": account_login,
            "accountType": account_type,
            "action": action,
            "repositories": [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "fullName": r["full_name"],
                    "private": r.get("private", False),
                }
                for r in repos
            ],
        },
    )

    # If created, also fetch full repo list via API
    if action == "created" and installation_id:
        try:
            full_repos = await list_installation_repos(installation_id)
            for repo in full_repos:
                await _convex_action(
                    "github:handleWebhookInstallation",
                    {
                        "installationId": installation_id,
                        "accountLogin": account_login,
                        "accountType": account_type,
                        "action": "repo_sync",
                        "repositories": [
                            {
                                "id": repo["id"],
                                "name": repo["name"],
                                "fullName": repo["full_name"],
                                "private": repo.get("private", False),
                            }
                        ],
                    },
                )
        except Exception as exc:
            print(f"[webhook] Failed to sync repos for installation {installation_id}: {exc}")


async def _handle_installation_repos(payload: dict) -> None:
    action = payload.get("action", "")
    inst = payload.get("installation", {})
    installation_id = inst.get("id")
    account = inst.get("account", {})
    account_login = account.get("login", "")
    account_type = account.get("type", "User")

    repos_added = payload.get("repositories_added", [])
    if repos_added:
        await _convex_action(
            "github:handleWebhookInstallation",
            {
                "installationId": installation_id,
                "accountLogin": account_login,
                "accountType": account_type,
                "action": "repo_added",
                "repositories": [
                    {
                        "id": r["id"],
                        "name": r["name"],
                        "fullName": r["full_name"],
                        "private": r.get("private", False),
                    }
                    for r in repos_added
                ],
            },
        )


async def _handle_pull_request(payload: dict) -> None:
    action = payload.get("action", "")
    if action not in ("opened", "synchronize", "reopened"):
        return

    pr = payload.get("pull_request", {})
    repo = payload.get("repository", {})
    installation_id = payload.get("installation", {}).get("id")

    owner = repo.get("owner", {}).get("login", "")
    repo_name = repo.get("name", "")
    repo_full_name = repo.get("full_name", "")
    pr_number = pr.get("number")
    pr_state = "open" if pr.get("state") == "open" else "closed"
    if pr.get("merged"):
        pr_state = "merged"

    # Fetch the actual unified diff
    diff_content = ""
    if installation_id and pr_number:
        try:
            diff_content = await fetch_pr_diff(
                installation_id, owner, repo_name, pr_number
            )
        except Exception as exc:
            print(f"[webhook] Failed to fetch diff for PR #{pr_number}: {exc}")

    await _convex_action(
        "github:handleWebhookPullRequest",
        {
            "repoFullName": repo_full_name,
            "prNumber": pr_number,
            "title": pr.get("title", ""),
            "author": pr.get("user", {}).get("login", ""),
            "headSha": pr.get("head", {}).get("sha", ""),
            "baseSha": pr.get("base", {}).get("sha", ""),
            "htmlUrl": pr.get("html_url", ""),
            "state": pr_state,
            "diffContent": diff_content,
        },
    )

    # Auto-trigger analysis pipeline when we have a diff
    if diff_content and pr_number and installation_id:
        try:
            # Create a pending analysis record in Convex, then fire the pipeline
            create_result = await _convex_action(
                "analyses:createAnalysis",
                {
                    "pr_title": pr.get("title", f"PR #{pr_number}"),
                    "diff": diff_content,
                    "target_framework": "pytest",
                    "source": "github_pr",
                },
            )
            analysis_id = create_result.get("value")
            if analysis_id:
                await _convex_action(
                    "analyses:runAnalysis",
                    {
                        "analysisId": analysis_id,
                        "diff": diff_content,
                        "pr_title": pr.get("title", f"PR #{pr_number}"),
                        "target_framework": "pytest",
                        "github_installation_id": installation_id,
                        "github_owner": owner,
                        "github_repo": repo_name,
                        "github_pr_number": pr_number,
                    },
                )
        except Exception as exc:
            print(f"[webhook] Failed to auto-trigger analysis for PR #{pr_number}: {exc}")
