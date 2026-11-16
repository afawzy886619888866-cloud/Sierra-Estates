import logging
import os

import vertexai
from vertexai.generative_models import GenerativeModel, Part

from tools.executor import execute_tool_call
from tools.registry import vertex_tools

logger = logging.getLogger("uvicorn.error")

MAX_TOOL_HOPS = 3

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "sierra-estates-core")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
MODEL_NAME = os.getenv("VERTEX_MODEL_NAME", "gemini-1.5-pro")

try:
    vertexai.init(project=PROJECT_ID, location=LOCATION)
except Exception as e:
    print(f"Warning: Vertex AI initialization failed (Are credentials set?): {e}")

SYSTEM_INSTRUCTION = """
You are Titan, the Chief Operating Officer (COO) and Omni-Agent for Sierra Estates.
You have access to unified memory and the company database.
You operate across three distinct modes depending on the context of the incoming message:

1. ADMIN/BOSS MODE: If you receive a command from a verified admin, execute their request immediately using your tools.
2. SCRAPER MODE: If the message is from a broker WhatsApp group, extract the listing details and call the 'save_listing' tool. Do not reply to the group.
3. CONCIERGE MODE: If the message is a direct inquiry from a client, act as an elite luxury real estate closer. Reply professionally and concisely.

Always invoke appropriate tools when you need to read, write, or search property data.
"""

def get_titan_agent():
    model = GenerativeModel(
        MODEL_NAME,
        tools=[vertex_tools],
        system_instruction=[SYSTEM_INSTRUCTION]
    )
    return model


def run_agent_turn(prompt: str, max_tool_hops: int = MAX_TOOL_HOPS):
    """
    Sends `prompt` to Titan and, when the model responds with one or more
    function calls, executes them via tools.executor and feeds the results
    back for a final natural-language reply.

    Previously api.py called agent.generate_content(prompt) directly and
    returned whatever came back — including a bare function-call response
    with no text, since nothing executed the call or continued the turn.
    """
    model = get_titan_agent()
    chat = model.start_chat()
    response = chat.send_message(prompt)

    hops = 0
    while hops < max_tool_hops:
        candidate = response.candidates[0] if response.candidates else None
        if not candidate or not candidate.content.parts:
            break

        function_calls = [
            part.function_call
            for part in candidate.content.parts
            if getattr(part, "function_call", None) and part.function_call.name
        ]
        if not function_calls:
            break

        function_response_parts = []
        for fc in function_calls:
            args = dict(fc.args) if fc.args else {}
            logger.info("[Titan] Executing tool call: %s(%s)", fc.name, args)
            result = execute_tool_call(fc.name, args)
            function_response_parts.append(
                Part.from_function_response(name=fc.name, response={"content": result})
            )

        response = chat.send_message(function_response_parts)
        hops += 1

    return response
