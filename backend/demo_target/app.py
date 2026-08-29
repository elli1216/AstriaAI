"""
Demo Target Repository — Lightweight FastAPI API

This is the "subject" codebase that ImpactTest AI analyzes.
It intentionally contains a breaking change:
  - billing_address was Optional[str] but is now required str
  - The /billing/charge and /notifications/send routes still treat it as optional,
    causing a regression when null is passed.

Run with: uvicorn demo_target.app:app --port 8001
"""
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Demo Target API", version="1.0.0")


# ── Models ────────────────────────────────────────────────────────────────────

class UserModel(BaseModel):
    id: int
    email: str
    name: str
    # BREAKING CHANGE: was Optional[str] = None
    billing_address: str
    created_at: str = "2024-01-01T00:00:00Z"


class BillingChargeRequest(BaseModel):
    user_id: int
    # BUG: still Optional here — not updated to match UserModel
    billing_address: Optional[str] = None
    amount: float = 0.0


class NotificationRequest(BaseModel):
    user_id: int
    message: str
    # BUG: still Optional here — will fail if billing_address is used downstream
    billing_address: Optional[str] = None


# ── In-memory "database" ──────────────────────────────────────────────────────

_users: dict[int, dict] = {
    1: {
        "id": 1,
        "email": "alice@example.com",
        "name": "Alice",
        "billing_address": "123 Main St",
        "created_at": "2024-01-01T00:00:00Z",
    },
    2: {
        "id": 2,
        "email": "bob@example.com",
        "name": "Bob",
        # Simulates a legacy record where billing_address was never set
        "billing_address": None,
        "created_at": "2024-01-01T00:00:00Z",
    },
}


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/users/{user_id}", response_model=UserModel)
def get_user(user_id: int):
    user = _users.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["billing_address"] is None:
        # Will fail Pydantic validation now that billing_address is required str
        raise HTTPException(
            status_code=422,
            detail="billing_address is required but missing on this user record",
        )
    return user


@app.post("/billing/charge")
def charge_billing(req: BillingChargeRequest):
    """
    REGRESSION: Does not validate billing_address is non-null
    before passing to the payment processor.
    """
    if req.billing_address is None:
        # This should raise a 400 but currently passes through, causing a downstream crash
        return {"status": "error", "detail": "billing_address is required for charges"}
    return {"status": "charged", "user_id": req.user_id, "amount": req.amount}


@app.post("/notifications/send")
def send_notification(req: NotificationRequest):
    """
    REGRESSION: Ignores missing billing_address when sending billing-related notifications.
    """
    return {
        "status": "sent",
        "user_id": req.user_id,
        "message": req.message,
        "billing_address_used": req.billing_address,
    }
