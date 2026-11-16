---
name: openai-agents
description: OpenAI Agents SDK (openai-agents-python) integration for Sierra Estates. Author, execute, and evaluate multi-agent workflows, handoffs, and guardrails connected to Supabase and real estate intelligence.
---

# OpenAI Agents SDK (Python) · Sierra Estates

## Overview

The `openai-agents` Python SDK is the official OpenAI framework for building multi-agent workflows, handoffs, and tool execution. In this workspace, it is installed in the global Python environment and its source repository is linked at `tools/openai-agents-python`.

## Core Concepts

- **Agent**: Declarative definition of an agent with instructions, tools, model, and handoffs.
- **Runner**: Executes agents synchronously or asynchronously (`Runner.run()`).
- **Function Tools**: Type-safe Python functions decorated with `@function_tool`.
- **Handoffs**: Transfer execution seamlessly between specialized agents (e.g. Triage Agent -> Valuation Agent -> Viewing Scheduler).
- **Guardrails**: Input and output safety checks.

## Connecting to Sierra Estates

OpenAI Agents can query Sierra Estates Supabase records, evaluate property pricing arbitrage, and schedule viewings.

### Minimal Example (`scripts/agents/sierra_advisory_agent.py`)

```python
import os
import asyncio
from agents import Agent, Runner, function_tool

@function_tool
def get_property_valuation(compound_name: str, unit_type: str, price_egp: float) -> str:
    """Analyze real estate pricing against New Cairo market comps."""
    # Connects to Sierra Estates valuation logic
    return f"Compound: {compound_name}, Type: {unit_type}, Price: {price_egp:,.0f} EGP evaluated as FAIR VALUE."

advisor_agent = Agent(
    name="Sierra Estates Senior Advisor",
    instructions=(
        "You are an elite real estate advisor for Sierra Estates in New Cairo. "
        "Help clients evaluate compounds, pricing, and schedule viewings."
    ),
    tools=[get_property_valuation],
)

async def main():
    result = await Runner.run(advisor_agent, input="Can you evaluate a 2-bedroom in Mountain View for 15,000,000 EGP?")
    print(result.final_output)

if __name__ == "__main__":
    asyncio.run(main())
```

## Running Agent Tasks

Execute any agent script with:

```bash
python <script_path>.py
```

Environment variables are loaded from `.env.local` or process environment (`OPENAI_API_KEY`).
