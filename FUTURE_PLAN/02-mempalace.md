# 02 — mempalace vector memory (decision pending)

**Source (arc):** `mempalace/` — production-grade vector memory library.
**Contents:** backends for ChromaDB (89 KB), pgvector (59 KB), Qdrant (52 KB), SQLite-exact (40 KB), embedding wrapper, sidecar process, MCP server (`mcp.json` + stdio protection), conformance + stress test suites, plugin configs for Claude/Cursor/Antigravity.

**Why not copied:** Sierra-Deploy already has `packages/open-memory` (277 files) and `packages/memory-engine`. A third memory system = permanent confusion.

**Value if adopted:** open-memory appears bespoke; mempalace has multi-backend portability + real test coverage + MCP-native recall for agents (Scribe/Curator could recall past listings/negotiations via MCP).

**Options:**
1. Add mempalace as an external dependency; retire memory-engine (8 files, likely vestigial). Effort: S.
2. Vendor into `packages/` and migrate open-memory callers. Effort: L. Only if open-memory is failing.
3. Do nothing (default).

**Apply-when:** owner picks an option. Recommend option 1 with the SQLite-exact backend first (zero infra).
