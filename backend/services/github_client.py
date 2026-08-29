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
import jwt
import time


def _get_app_jwt() -> str:
    """
    Generate a short-lived JWT signed with the App's private key.
    Required to generate installation access tokens.
    """
    app_id = os.getenv("GITHUB_APP_ID", "")
    key_path = os.getenv("GITHUB_APP_PRIVATE_KEY_PATH", "./github_app.pem")

    try:
        private_key = Path(key_path).read_text()
    except FileNotFoundError:
        raise RuntimeError(
            f"GitHub App private key not found at {key_path}. "
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


async def post_pr_comment(
    installation_id: int,
    owner: str,
    repo: str,
    pr_number: int,
    body: str,
) -> None:
    """Post a markdown comment to a pull request."""
    token = await get_installation_token(installation_id)
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.github.com/repos/{owner}/{repo}/issues/{pr_number}/comments",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            json={"body": body},
        )
        resp.raise_for_status()


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
