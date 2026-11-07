---
name: docs
description: "Generate Project Strategy (Charter & PRD) from source documents for Sierra Estates"
---

# DOCS

This command automates the derivation of your Project Strategy (Charter and High-Level PRD).

1. **Read Source Documents**: Read every file in `.amphion/context/`.
2. **Derive Charter**: Fill every section marked `*[Derive from source documents]*` in the latest Project Charter in `.amphion/control-plane/`. Do not modify the "Operating Constraints" section.
3. **Read Charter**: Read the completed Project Charter to ensure alignment for the next step.
4. **Derive PRD**: Fill every section marked `*[Derive from source documents]*` in the latest High-Level PRD in `.amphion/control-plane/`.
5. **Cleanup**: Remove any remaining stub markers or introductory agent instructions from both the Charter and the PRD.
6. **Completion**:
    - Verify that both the Project Charter and High-Level PRD are canonical in `.amphion/control-plane/` and synced with Command Deck board artifacts.
    - Present a concise executive summary of the locked Charter and PRD (Target Users, Problem Statement, Core Value Proposition, and Hard Non-Goals) in chat.
    - Confirm Command Deck availability at `http://127.0.0.1:{resolvedPort}` (default `8888` from `.amphion/config.json`).
    - Halt tool execution and prompt the operator: *"The Project PRD and Strategy documents are complete and locked! You can review them in the Command Deck dashboard. When ready, authorize `/evaluate` to initiate Phase 1 (Research & Scoping) for the active milestone."*
