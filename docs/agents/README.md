# Agent config migration notes

This repository now preserves the durable, human-authored agent references that were useful to migrate:

- `docs/CODEX.md`
- `docs/NEXUS_REGISTRY.md`
- `docs/implementation_plan.md`
- `docs/mcp/sierra-estates-mcp.json`

Session-specific folders from the donor repositories such as `.agent_memory/`, `.agents/`, `.claude/`, `.genkit/`, `.windsurf/`, and `.qwen/` were evaluated but not copied wholesale because they primarily contain tool/session state rather than durable repository documentation.

