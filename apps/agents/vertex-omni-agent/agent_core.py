import os
import vertexai
from vertexai.generative_models import GenerativeModel
from tools.registry import vertex_tools

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
