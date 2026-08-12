# FUTURE_PLAN — Sierra Estates

Rule: code that cannot be merged **safely and error-free today** is not merged. Its LOGIC is captured here as a spec, with explicit *apply-when* conditions. A daily check reviews whether any condition has been met.

| # | Item | Blocker | Apply when |
|---|---|---|---|
| 01 | Gravity Memory pipeline | `memory/gravity_core` module missing from both repos | Module found (check F:\arc / local disks) OR reimplemented per spec |
| 02 | mempalace vector memory | Would be a 3rd memory system alongside open-memory + memory-engine | Owner decides: dependency vs replace |
| 03 | DSL parser stub replacement | 36-byte stub may have consumers resolving to @sierra-estates/db | Consumer check + type-check pass |
| 04 | Growth & market ideas | Not blockers — prioritization backlog | Owner picks items per sprint |

Standing rules: no frontend changes without written approval · no secrets in code · nothing merged that fails import/type-check.
