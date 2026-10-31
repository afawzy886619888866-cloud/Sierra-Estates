---
name: remember
description: Capture a compact operational memory checkpoint via the Command Deck API without triggering an MCD phase transition.
---

# REMEMBER

This skill invokes the canonical MCD REMEMBER command.

1. Read the command instructions:
   [REMEMBER.md](file:///h:/Sierra%20Estates/.amphion/control-plane/mcd/REMEMBER.md)

2. Follow the step-by-step instructions in the file to complete the phase.

3. If launched from the Command Deck dashboard, run the deterministic memory intent hook first:
   - Write `phase.intent.remember` via `POST /api/memory/events` using `sourceType: verified-system`.
