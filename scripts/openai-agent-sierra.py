"""
Sierra Estates - OpenAI Agents SDK Runner
Powered by openai-agents Python SDK
"""
import os
import sys
import asyncio
from typing import Optional

try:
    from agents import Agent, Runner, function_tool
except ImportError:
    print("Error: openai-agents is not installed. Install with: pip install openai-agents")
    sys.exit(1)


@function_tool
def check_compound_market(compound_name: str) -> str:
    """Look up active market conditions and average price per sqm for New Cairo compounds."""
    market_data = {
        "mountain view": "Mountain View iCity: Avg Sale 85,000 EGP/sqm, Rent 45,000-75,000 EGP/month.",
        "palm hills": "Palm Hills New Cairo: Avg Sale 95,000 EGP/sqm, Rent 55,000-90,000 EGP/month.",
        "mivida": "Mivida Emaar: Avg Sale 110,000 EGP/sqm, Rent 60,000-110,000 EGP/month.",
        "villette": "Villette Sodic: Avg Sale 90,000 EGP/sqm, Rent 50,000-85,000 EGP/month.",
    }
    key = compound_name.lower().strip()
    for name, data in market_data.items():
        if name in key:
            return data
    return f"Compound '{compound_name}' recognized in New Cairo sector. Contact Sierra Estates desk for localized comps."


@function_tool
def schedule_property_viewing(client_name: str, property_code: str, preferred_date: str) -> str:
    """Schedule a physical or virtual property viewing with a Sierra Estates licensed broker."""
    return f"Confirmed: Viewing booked for {client_name} for property '{property_code}' on {preferred_date}."


sierra_advisor = Agent(
    name="Sierra Estates Advisor",
    instructions=(
        "You are an expert luxury real estate advisor for Sierra Estates in New Cairo, Egypt. "
        "Provide factual, high-clarity answers regarding compounds, rental yields, and property viewings."
    ),
    tools=[check_compound_market, schedule_property_viewing],
)


if sys.platform == "win32":
    reconfigure_fn = getattr(sys.stdout, "reconfigure", None)
    if callable(reconfigure_fn):
        try:
            reconfigure_fn(encoding="utf-8")
        except Exception:
            pass


async def run_demo(query: str = "What are the current prices in Mountain View and can I view unit SB-101 tomorrow?"):
    print("\n" + "=" * 60)
    print("[SIERRA ESTATES] OPENAI AGENTS SDK RUNNER")
    print("=" * 60)
    print(f"Query: {query}\n")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[Notice] OPENAI_API_KEY not set in current shell. Provide OPENAI_API_KEY to run live LLM completion.")
        print(f"Agent '{sierra_advisor.name}' configured with {len(sierra_advisor.tools)} tools:")
        for t in sierra_advisor.tools:
            print(f"  - Tool: {getattr(t, '__name__', str(t))}")
        print("Ready for live execution with `set OPENAI_API_KEY=... && python scripts/openai-agent-sierra.py`")
        return

    result = await Runner.run(sierra_advisor, input=query)
    print("Response:\n", result.final_output)
    print("=" * 60)


if __name__ == "__main__":
    prompt = sys.argv[1] if len(sys.argv) > 1 else "What are the current prices in Mountain View and can I view unit SB-101 tomorrow?"
    asyncio.run(run_demo(prompt))
