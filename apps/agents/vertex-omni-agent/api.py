"""Vertex Omni-Agent API."""
import logging
from typing import Optional, Dict, Any

from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
import uvicorn

from agent_core import run_agent_turn


# ── Service authentication (fail-closed) ─────────────────────────────────────
import os as _os, hmac as _hmac
from fastapi import Depends, Request, HTTPException as _HTTPException

_SERVICE_KEYS = [k for k in (_os.getenv("RUNNER_API_KEY", ""), _os.getenv("SBR_SECRET_KEY", "")) if k]

async def require_service_key(request: Request) -> None:
    if request.url.path == "/health":
        return
    if not _SERVICE_KEYS:
        raise _HTTPException(status_code=503, detail="service keys not configured (RUNNER_API_KEY / SBR_SECRET_KEY)")
    provided = request.headers.get("x-runner-key") or request.headers.get("x-sbr-secret-key") or ""
    if provided and any(_hmac.compare_digest(provided, k) for k in _SERVICE_KEYS):
        return
    raise _HTTPException(status_code=401, detail="unauthorized: service key required")

app = FastAPI(title="Vertex Omni-Agent (Titan)", dependencies=[Depends(require_service_key)])

logger = logging.getLogger("uvicorn.error")

class AgentRunPayload(BaseModel):
    """Payload for agent run request."""
    prompt: str
    mode: Optional[str] = "CONCIERGE"
    context: Optional[Dict[str, Any]] = None

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "Vertex Omni-Agent"}

@app.post("/agent/run")
async def run_agent(payload: AgentRunPayload):
    """
    Executes a direct command prompt through the Vertex Omni-Agent.
    """
    logger.info("Running agent in mode '%s' with prompt: %s...", payload.mode, payload.prompt[:80])
    try:
        full_prompt = f"Mode: {payload.mode}\nPrompt: {payload.prompt}"
        if payload.context:
            full_prompt += f"\nContext: {payload.context}"

        response = run_agent_turn(full_prompt)

        candidates = []
        if hasattr(response, 'candidates'):
            candidates = [c.to_dict() for c in response.candidates]

        return {
            "status": "success",
            "reply": response.text if response.text else None,
            "candidates": candidates
        }
    except Exception as e:
        logger.error("Execution error: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e

@app.post("/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    """
    Receives incoming WhatsApp messages from the scraper.
    """
    data = await request.json()
    message = data.get("Body", "")
    sender = data.get("from", "")
    is_group = data.get("isGroup", False)

    logger.info("Received message from %s (Group: %s)", sender, is_group)

    prompt = (
        f"Sender: {sender}\nIs Group: {is_group}\nMessage: {message}\n\n"
        "Execute directives based on system instructions."
    )

    try:
        response = run_agent_turn(prompt)
        reply_text = response.text if response.text else None

        return {"status": "processed", "replyMessage": reply_text if not is_group else None}

    except Exception as e:
        logger.error("Agent processing failed: %s", e)
        return {"error": str(e)}, 500

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
