---
name: evaluate
description: Run MCD EVALUATE command for Sierra Estates to research, audit architecture, and persist canonical milestone findings via the Command Deck API.
---

# EVALUATE

This skill invokes the canonical MCD EVALUATE command.

1. Read the command instructions:
   [EVALUATE.md](file:///h:/Sierra%20Estates/.amphion/control-plane/mcd/EVALUATE.md)

2. Follow the step-by-step instructions in the file to complete the phase.

3. If launched from the Command Deck dashboard, run the deterministic memory intent hook first:
   - Write `phase.intent.evaluate` via `POST /api/memory/events` using `sourceType: verified-system`.
