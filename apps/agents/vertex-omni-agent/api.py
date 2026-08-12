"""Vertex Omni-Agent API."""
import logging
from typing import Optional, Dict, Any

from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
import uvicorn

from agent_core import get_titan_agent

app = FastAPI(title="Vertex Omni-Agent (Titan)")
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
        agent = get_titan_agent()
        full_prompt = f"Mode: {payload.mode}\nPrompt: {payload.prompt}"
        if payload.context:
            full_prompt += f"\nContext: {payload.context}"

        response = agent.generate_content(full_prompt)

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

    agent = get_titan_agent()
    prompt = (
        f"Sender: {sender}\nIs Group: {is_group}\nMessage: {message}\n\n"
        "Execute directives based on system instructions."
    )

    try:
        response = agent.generate_content(prompt)
        reply_text = response.text if response.text else None

        return {"status": "processed", "replyMessage": reply_text if not is_group else None}

    except Exception as e:
        logger.error("Agent processing failed: %s", e)
        return {"error": str(e)}, 500

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
