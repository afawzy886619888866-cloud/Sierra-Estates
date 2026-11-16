---
name: prompt-engineering-mastery
description: Elite prompt engineering, reasoning architecture, and agent alignment distilled from frontier system prompts (Google Antigravity, Claude Code, Cursor, OpenAI Deep Research). Use when authoring agent instructions, designing multi-agent workflows, crafting system prompts, or tuning LLM reasoning loops.
---

# Prompt Engineering Mastery & Agent Alignment Architecture

## Overview

This skill distills the verified architectural rules, prompt constraints, and reasoning protocols extracted from frontier AI agents (Google Antigravity, Claude Code, Cursor, and OpenAI Deep Research). It enables developers and agents to construct high-yield prompts, deterministic tool interfaces, and anti-hallucination guardrails.

---

## 1. Antigravity & Agent Protocol Rules

### A. Context & Memory Discipline

- **Discrete Context Windows**: Treat each milestone card or task as an isolated task context. Avoid cross-task context pollution.
- **Link Integrity**: Always use GitHub-style markdown clickable links with file protocol (`[filename](file:///absolute/path/to/file)`). For Windows paths, normalize backslashes to forward slashes.
- **No Fabrication**: Never fabricate file contents, tool outputs, mock IDs, or API responses (§21 no-fabrication policy). If data is absent, explicitly report absence.

### B. Reactive Asynchronous Workflows

- **Never Poll**: When launching background tasks, dev servers, or asynchronous processes, NEVER loop or poll `status`. End turn cleanly and let reactive messaging resume execution.
- **Surgical Code Modifications**: Prioritize `replace_file_content` for atomic single-block edits or `multi_replace_file_content` for non-contiguous changes over full overwrites.

---

## 2. Reasoning Architecture & Chain of Thought (CoT)

Frontier agent systems (Claude 3.7 / GPT-5 Thinking / Gemini 2.5 Pro) operate at peak capability when prompt instructions enforce the following cognitive steps:

```text
1. DISCOVERY & KI CHECK
   └── Inspect localized Knowledge Items and project constraints before querying external sources.

2. PROBLEM DECOMPOSITION (Hypothesis & Invariants)
   └── Explicitly state the invariant conditions that must hold true after execution.

3. ADVERSARIAL SELF-CRITIQUE (Doubt Loop)
   └── "What assumptions could fail here? Is this error silent or swallowed? Does this break SSR?"

4. SURGICAL EXECUTION
   └── Make minimal, targeted changes with exact line numbers and preserved comments.

5. VERIFICATION FIRST
   └── Execute unit tests, lint checks, and type checks before reporting completion.
```

---

## 3. Tool-Calling Precision & Robustness

- **Schema Strictness**: Always pass required fields with valid types. Do not leave required parameters null or omitted.
- **Defensive Error Handling**: Catch and handle external tool errors with actionable recovery suggestions rather than silent retries.
- **Output Budget Management**: In long-running tasks, truncate diagnostic logs while preserving exact stack traces and error codes.

---

## 4. UI/UX & Design Alignment (Anti-Slop Protocol)

- **High-End Visual Craft**: Avoid default browser colors, raw primary buttons, or generic card grids.
- **Typography & Atmosphere**: Integrate Google Fonts (`Cinzel`, `Josefin Sans`, `Plus Jakarta Sans`, `Inter`) tailored to domain mood.
- **Glassmorphism & Depth**: Multi-layer backdrop filters (`backdrop-blur-md`), subtle borders (`1px solid rgba(255,255,255,0.1)`), and smooth micro-interactions (150–300ms transitions).

---

## 5. Reference Library

Deep-dive system prompts and reference manuals are preserved in the workspace for architectural study:

- [Google Antigravity CLI Reference](file:///H:/Sierra%20Estates/docs/reference/system-prompts/Google/antigravity-cli.md)
- [Anthropic Claude Code Architecture](file:///H:/Sierra%20Estates/docs/reference/system-prompts/Anthropic/claude-code)
- [Anthropic Claude Design Taste](file:///H:/Sierra%20Estates/docs/reference/system-prompts/Anthropic/claude-design)
- [Cursor Agent Rules](file:///H:/Sierra%20Estates/docs/reference/system-prompts/Cursor/cursor.md)
- [OpenAI Deep Research Tool Design](file:///H:/Sierra%20Estates/docs/reference/system-prompts/OpenAI/tool-deep-research.md)
