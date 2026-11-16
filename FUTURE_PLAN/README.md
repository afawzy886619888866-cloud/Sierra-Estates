# FUTURE_PLAN — Sierra Estates

Rule: code that cannot be merged **safely and error-free today** is not merged. Its LOGIC is captured here as a spec, with explicit *apply-when* conditions. A daily check reviews whether any condition has been met.

| # | Item | Status | Blocker | Apply when |
| --- | --- | --- | --- | --- |
| 01 | Gravity Memory pipeline | Completed (Option 2 adapter on open-memory) | None — reimplemented via `packages/gravity-memory`, tests passing, 3 scripts unblocked | Condition met: reimplemented per spec |
| 02 | mempalace vector memory | Pending | Would be a 3rd memory system alongside open-memory + memory-engine | Owner decides: dependency vs replace |
| 03 | DSL parser stub replacement | Completed (Sprint 2) | None — full Sierra DSL v2 parser restored in @sierra-estates/db, tests green | Condition met: type-check passing, broker saved views shipped |
| 04 | Growth & market ideas (B, D, E) | Completed (Sprint 2) | None — Price Index, Inventory Service, Eco Tags, Proposal PDFs, Gated Reservations delivered | Written approval granted 2026-10-07 ("apply all yes plz") |
| 05 | Inventory wiring pass 1 & 2 | Completed (Gaps 1 & 2 resolved) | None — offerType toggle wired; PF size/area mapped & dupeCheckHash enabled | Additive-only pass completed |

Standing rules: no frontend changes without written approval · no secrets in code · nothing merged that fails import/type-check.
