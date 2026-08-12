# 7-Layer Multi-Agent Fleet Architecture

> Reference architecture for Sierra Estates' multi-agent system. Describes the
> target layering for reliable agent coordination — the power is in the layers
> that connect the agents, not in any single agent.

## Context

The core objective is **reliable coordination**. Keep the user interface
decoupled from agent logic so the entire agent backend can be replaced without
changing the user-facing experience.

## The 7-layer ecosystem

### Layer 1 — User Application (the entry point)
A thin routing application that channels user requests into the system.

- **Rule:** Keep the UI completely decoupled from agent logic. The agent backend
  must be replaceable without altering the user-facing experience.

### Layer 2 — Orchestration (the brain)
The central coordinator: an intent classifier plus an agent registry.

- **Rule:** This layer is what separates "multi-agent" from "many agents." The
  right agent must automatically handle the right request — no disconnected bots.

### Layer 3 — Knowledge (what agents know)
Centralized source bases and vector databases that feed grounded, retrievable
data to every agent.

- **Rule:** Maintain a single source of truth. Without it, agents drift and
  contradict one another.

### Layer 4 — Storage (what agents remember)
The repository for conversation history and the agent state registry.

- **Rule:** Statelessness kills multi-agent systems. Agents must resume exactly
  where they left off and hand context to each other instead of starting cold.

### Layer 5 — Agent Layer (the workers)
A Supervisor Agent coordinating specialized local workers (running as MCP
clients) plus a remote layer for distributed tasks.

- **Rule:** Execute the Supervisor pattern. Delegate to specialists —
  specialization beats generalization and prevents single-agent overload.

### Layer 6 — Integration & MCP (reaching the world)
The standardized bridge connecting agent groups to external tools via Model
Context Protocol (MCP) servers.

- **Rule:** Enforce a single connector standard across local and remote agents.
  No bespoke, hardcoded per-tool integrations.

### Layer 7 — Observability & Evaluation (keeping it honest)
Cross-cutting monitoring plus dedicated evaluation spanning every layer.

- **Rule:** In distributed systems, failures are subtle. Use observability to
  pinpoint broken agents and evaluation to detect quality drift.

## Critical interdependencies (failure modes to avoid)

- **Orchestration without Knowledge/Memory** — requests get routed, but agents
  answer blind.
- **Knowledge without Orchestration** — every agent retrieves independently and
  chaotically.
- **Storage without Agents** — memory exists, but nobody uses it.
- **Agents without MCP** — they can reason, but they cannot act.
- **Everything without Observability** — failures go invisible.
