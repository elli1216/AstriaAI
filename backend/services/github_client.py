"""
GitHub App & OAuth client wrapper.

Provides:
- get_installation_client(installation_id): authenticated Octokit-style client
  for acting as the GitHub App on a specific installation.
- fetch_pr_diff(client, owner, repo, pr_number): returns unified diff text
- verify_webhook_signature(payload, sig, secret): HMAC-SHA256 check
"""
import hashlib
import hmac
import os
import httpx
from functools import lru_cache
from pathlib import Path
from typing import Optional
import jwt
import time


def _get_app_jwt() -> str:
    """
    Generate a short-lived JWT signed with the App's private key.
    Required to generate installation access tokens.
    """
    app_id = os.getenv("GITHUB_APP_ID", "")
    key_path_str = os.getenv("GITHUB_APP_PRIVATE_KEY_PATH", "./github_app.pem")

    candidate_paths = [
        Path(key_path_str),
        Path.cwd() / key_path_str.lstrip("./"),
        Path(__file__).resolve().parent.parent / key_path_str.lstrip("./"),
        Path(__file__).resolve().parent.parent / "github_app.pem",
    ]

    private_key: Optional[str] = None
    for p in candidate_paths:
        if p.exists() and p.is_file():
            try:
                private_key = p.read_text()
                break
            except Exception:
                pass

    if not private_key:
        raise RuntimeError(
            f"GitHub App private key not found at {key_path_str}. Checked: {[str(p) for p in candidate_paths]}. "
            "Set GITHUB_APP_PRIVATE_KEY_PATH to the correct path."
        )

    now = int(time.time())
    payload = {
        "iat": now - 60,   # issued 60s ago to allow clock drift
        "exp": now + 540,  # 9 minute expiry (max is 10)
        "iss": app_id,
    }
    return jwt.encode(payload, private_key, algorithm="RS256")


async def get_installation_token(installation_id: int) -> str:
    """Exchange a GitHub App JWT for an installation access token."""
    app_jwt = _get_app_jwt()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.github.com/app/installations/{installation_id}/access_tokens",
            headers={
                "Authorization": f"Bearer {app_jwt}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        resp.raise_for_status()
        return resp.json()["token"]


async def fetch_pr_diff(
    installation_id: int,
    owner: str,
    repo: str,
    pr_number: int,
) -> str:
    """
    Fetch the unified diff for a pull request using the installation token.
    Returns the raw diff text.
    """
    token = await get_installation_token(installation_id)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3.diff",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        resp.raise_for_status()
        return resp.text


async def fetch_repo_contents(
    installation_id: int,
    owner: str,
    repo: str,
    path: str = "",
) -> list[dict]:
    """List files/dirs at a path in the repo."""
    token = await get_installation_token(installation_id)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/contents/{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        resp.raise_for_status()
        return resp.json()


COMMENT_TAG = "<!-- ASTRIA_AI_ANALYSIS_SUMMARY -->"


async def upsert_pr_comment(
    installation_id: int,
    owner: str,
    repo: str,
    pr_number: int,
    body: str,
) -> dict:
    """
    Post or update a single summary markdown comment on a GitHub PR.
    If an existing Astria AI comment is found, edit (PATCH) it in-place.
    Otherwise, create (POST) a new comment.
    """
    token = await get_installation_token(installation_id)

    formatted_body = body
    if COMMENT_TAG not in formatted_body:
        formatted_body = f"{COMMENT_TAG}\n{body}"

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    async with httpx.AsyncClient() as client:
        # 1. Search for existing Astria AI comment on this PR
        existing_comment_id = None
        try:
            resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/issues/{pr_number}/comments",
                headers=headers,
                params={"per_page": 100},
            )
            if resp.is_success:
                comments = resp.json()
                for c in comments:
                    if COMMENT_TAG in c.get("body", ""):
                        existing_comment_id = c.get("id")
                        break
        except Exception as exc:
            print(f"[github] Error searching existing PR comments: {exc}")

        # 2. Update in-place if found, or post new comment
        if existing_comment_id:
            print(f"[github] Updating existing PR comment #{existing_comment_id} on {owner}/{repo}#{pr_number}")
            patch_resp = await client.patch(
                f"https://api.github.com/repos/{owner}/{repo}/issues/comments/{existing_comment_id}",
                headers=headers,
                json={"body": formatted_body},
            )
            if patch_resp.status_code == 403:
                raise RuntimeError(
                    f"GitHub App 403 Forbidden on comment update: {patch_resp.text}. "
                    "Ensure your GitHub App has 'Pull requests: Read and write' and 'Issues: Read and write' permissions."
                )
            patch_resp.raise_for_status()
            return patch_resp.json()
        else:
            print(f"[github] Posting new PR comment on {owner}/{repo}#{pr_number}")
            post_resp = await client.post(
                f"https://api.github.com/repos/{owner}/{repo}/issues/{pr_number}/comments",
                headers=headers,
                json={"body": formatted_body},
            )
            if post_resp.status_code == 403:
                # Fallback to Pull Request Review API
                print("[github] Issue comments returned 403, attempting PR Review fallback...")
                review_resp = await client.post(
                    f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/reviews",
                    headers=headers,
                    json={"body": formatted_body, "event": "COMMENT"},
                )
                if review_resp.is_success:
                    return review_resp.json()
                raise RuntimeError(
                    f"GitHub App 403 Forbidden: {post_resp.text}. "
                    "Please go to GitHub App Settings -> 'Permissions & events' -> Repository permissions, "
                    "set 'Pull requests' to 'Read and write' and 'Issues' to 'Read and write', then accept the updated permissions."
                )
            post_resp.raise_for_status()
            return post_resp.json()


async def post_pr_comment(
    installation_id: int,
    owner: str,
    repo: str,
    pr_number: int,
    body: str,
) -> dict:
    """Alias for upsert_pr_comment to prevent duplicate comments."""
    return await upsert_pr_comment(
        installation_id=installation_id,
        owner=owner,
        repo=repo,
        pr_number=pr_number,
        body=body,
    )


async def list_installation_repos(installation_id: int) -> list[dict]:
    """List all repositories accessible to this installation."""
    token = await get_installation_token(installation_id)
    repos: list[dict] = []
    page = 1
    async with httpx.AsyncClient() as client:
        while True:
            resp = await client.get(
                "https://api.github.com/installation/repositories",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                params={"per_page": 100, "page": page},
            )
            resp.raise_for_status()
            data = resp.json()
            repos.extend(data.get("repositories", []))
            if len(data.get("repositories", [])) < 100:
                break
            page += 1
    return repos


async def list_app_installations() -> list[dict]:
    """List all installations for this GitHub App."""
    app_jwt = _get_app_jwt()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.github.com/app/installations",
            headers={
                "Authorization": f"Bearer {app_jwt}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_repo_prs(
    installation_id: int,
    owner: str,
    repo: str,
    state: str = "open",
) -> list[dict]:
    """Fetch pull requests for a repository."""
    token = await get_installation_token(installation_id)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/pulls",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            params={"state": state, "per_page": 20},
        )
        resp.raise_for_status()
        return resp.json()


def verify_webhook_signature(
    payload_bytes: bytes,
    signature_header: str,
    secret: str,
) -> bool:
    """
    Verify the GitHub webhook HMAC-SHA256 signature.
    signature_header is the value of X-Hub-Signature-256.
    """
    if not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(  # noqa: E501 — hmac.new is the stdlib constructor
        secret.encode(),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    received = signature_header[len("sha256="):]
    return hmac.compare_digest(expected, received)
