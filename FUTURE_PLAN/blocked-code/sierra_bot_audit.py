import sys
import os
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '11_Core_Intelligence'))

# Local imports
from memory.gravity_core import GravityMemory
from config import SIERRA_PERSONA

class SierraBot:
    """
    SIERRA MASTER BOT — V12.0
    The central intelligence for Sierra Blu Realty.
    """
    def __init__(self):
        print(f"Initializing {SIERRA_PERSONA['name']} Intelligence Core...")
        # Vault stored in 11_Core_Intelligence/memory/
        vault_path = os.path.join(os.path.dirname(__file__), '..', '11_Core_Intelligence', 'memory', 'vault.json')
        self.memory = GravityMemory(vault_path=vault_path)
        self.start_time = datetime.now()
        
    def process_interaction(self, user_input: str, user_metadata: dict = None):
        """Processes a client interaction and updates Gravity Memory."""
        print(f"[{SIERRA_PERSONA['name']}]: Processing Operational Input...")
        
        # 1. LOG INPUT
        self.memory.ingest_fact("operational_logs", "interactions", {
            "input": user_input,
            "metadata": user_metadata,
            "stage": "INTAKE"
        })
        
        # 2. MATCHING LOGIC (Placeholder for Neural Matching)
        # In a real scenario, this would call the Neural Matchmaker API
        print(f"[{SIERRA_PERSONA['name']}]: Calculating Match against 25,000 records...")
        
        # 3. GENERATE RESPONSE
        # (Usually handled by the LLM, but we log the protocol here)
        return "Operational Input Received. Initiating Search & Match Protocol."

    def learn_from_data(self, source: str, data: dict):
        """Standard method for 'Learning' and 'Gathering Information' into Gravity."""
        print(f"[{SIERRA_PERSONA['name']}]: Learning new intelligence from {source}...")
        self.memory.ingest_fact("market_trends", source, data, weight=10)

    def status(self):
        uptime = datetime.now() - self.start_time
        return {
            "status": "Online",
            "persona": SIERRA_PERSONA['name'],
            "uptime": str(uptime),
            "total_knowledge_chunks": self.memory.memory["metadata"]["total_facts"]
        }

if __name__ == "__main__":
    bot = SierraBot()
    # Initial self-learning step
    bot.learn_from_data("system_init", {"event": "Persona Migration Completed", "entities": ["Laila", "OpenClaw"]})
    print(f"Bot Status: {bot.status()}")
