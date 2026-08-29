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
    list_app_installations,
    fetch_repo_prs,
    upsert_pr_comment,
    post_pr_comment,
    verify_webhook_signature,
)

router = APIRouter(prefix="/github", tags=["github"])

WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")
CONVEX_URL = os.getenv("CONVEX_URL", "")


# ── PR Comment endpoint ───────────────────────────────────────────────────────

class PrCommentRequest(BaseModel):
    installation_id: int | None = None
    owner: str
    repo: str
    pr_number: int
    markdown_report: str


@router.post("/pr-comment")
async def post_pr_comment_endpoint(req: PrCommentRequest):
    """
    Post or update a single markdown report as a GitHub PR comment.
    Edits existing Astria AI comment in-place to prevent comment spam.
    """
    inst_id = req.installation_id
    if not inst_id:
        try:
            installations = await list_app_installations()
            for inst in installations:
                cur_id = inst.get("id")
                if not cur_id:
                    continue
                repos = await list_installation_repos(cur_id)
                if any(r["full_name"].lower() == f"{req.owner}/{req.repo}".lower() for r in repos):
                    inst_id = cur_id
                    break
            if not inst_id and installations:
                inst_id = installations[0].get("id")
        except Exception as exc:
            print(f"[pr-comment] Failed to auto-resolve installation ID: {exc}")

    if not inst_id:
        raise HTTPException(status_code=404, detail="No GitHub App installation found for this repository")

    try:
        result = await upsert_pr_comment(
            installation_id=inst_id,
            owner=req.owner,
            repo=req.repo,
            pr_number=req.pr_number,
            body=req.markdown_report,
        )
        return {"success": True, "comment": result}
    except Exception as exc:
        print(f"[pr-comment] Failed to post/update PR comment: {exc}")
        raise HTTPException(status_code=403, detail=str(exc))


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


# ── On-demand direct sync endpoints ──────────────────────────────────────────

class SyncRepoPrsRequest(BaseModel):
    owner: str
    repo: str


@router.post("/sync-all")
async def sync_all_installations_and_repos():
    """
    On-demand synchronization: Queries the GitHub API for all installations
    and their accessible repositories, then writes them directly to Convex.
    """
    try:
        installations = await list_app_installations()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch GitHub App installations: {exc}")

    synced_count = 0
    for inst in installations:
        inst_id = inst.get("id")
        account = inst.get("account", {})
        account_login = account.get("login", "")
        account_type = account.get("type", "User")
        if not inst_id:
            continue

        try:
            repos = await list_installation_repos(inst_id)
            await _convex_action(
                "github:handleWebhookInstallation",
                {
                    "installationId": inst_id,
                    "accountLogin": account_login,
                    "accountType": account_type,
                    "action": "created",
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
            synced_count += len(repos)
        except Exception as exc:
            print(f"[sync-all] Failed to sync repos for installation {inst_id}: {exc}")

    return {"success": True, "installations": len(installations), "synced_repos": synced_count}


@router.post("/sync-repo-prs")
async def sync_repo_pull_requests(req: SyncRepoPrsRequest):
    """
    On-demand PR sync: Queries GitHub API for all PRs on a repository,
    fetches their unified diffs, and saves them directly to Convex.
    """
    try:
        installations = await list_app_installations()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to list installations: {exc}")

    target_inst_id = None
    for inst in installations:
        inst_id = inst.get("id")
        if not inst_id:
            continue
        try:
            repos = await list_installation_repos(inst_id)
            if any(r["full_name"].lower() == f"{req.owner}/{req.repo}".lower() for r in repos):
                target_inst_id = inst_id
                break
        except Exception:
            continue

    if not target_inst_id and installations:
        target_inst_id = installations[0].get("id")

    if not target_inst_id:
        raise HTTPException(status_code=404, detail="No GitHub App installation found for this repository")

    try:
        prs = await fetch_repo_prs(target_inst_id, req.owner, req.repo, state="all")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch PRs from GitHub: {exc}")

    synced_prs = 0
    for pr in prs:
        pr_number = pr.get("number")
        if not pr_number:
            continue

        diff_content = None
        try:
            diff_content = await fetch_pr_diff(target_inst_id, req.owner, req.repo, pr_number)
        except Exception as exc:
            print(f"[sync-repo-prs] Could not fetch diff for PR #{pr_number}: {exc}")

        pr_state = "open"
        if pr.get("merged_at"):
            pr_state = "merged"
        elif pr.get("state") == "closed":
            pr_state = "closed"

        try:
            await _convex_action(
                "github:handleWebhookPullRequest",
                {
                    "repoFullName": f"{req.owner}/{req.repo}",
                    "prNumber": pr_number,
                    "title": pr.get("title", f"PR #{pr_number}"),
                    "author": pr.get("user", {}).get("login", ""),
                    "headSha": pr.get("head", {}).get("sha", ""),
                    "baseSha": pr.get("base", {}).get("sha", ""),
                    "htmlUrl": pr.get("html_url", ""),
                    "state": pr_state,
                    "diffContent": diff_content,
                },
            )
            synced_prs += 1
        except Exception as exc:
            print(f"[sync-repo-prs] Failed to save PR #{pr_number} to Convex: {exc}")

    return {"success": True, "synced_prs": synced_prs}
