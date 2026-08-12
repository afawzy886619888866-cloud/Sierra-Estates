# 03 — DSL parser stub replacement (staged, needs one check)

**Live file:** `apps/sierra-estates-realty/lib/dsl/parser.ts` = 36 bytes: `export * from '@sierra-estates/db'`
**Recovered full version (16,670 B):** staged at `staged/apps/sierra-estates-realty/lib/dsl/parser.ts` — from repo's own `firebase/.../back/i-sierra-2027/main` (also confirmed identical in arc).

**What it restores:** Sierra DSL V2.0 — text DSL → typed `ParsedView` (filters/sorts/compare/chart/cover/visibility) → `buildFirestoreQuery`, plus `applyFieldVisibility` (public/broker/investor/internal), `groupDocuments`, `computeComparisonDelta`. Powers saved views / admin report definitions.

**Risk:** consumers may currently import DB types *through* this stub. Replacement procedure:
1. `grep -r "lib/dsl/parser" apps/ packages/ --include=*.ts`
2. If consumers use db re-exports → keep a `export * from '@sierra-estates/db'` line appended, or fix imports.
3. `pnpm type-check` must pass. Ship as its own commit (Commit 2).

**Apply-when:** the grep + type-check above pass. ~30 min with repo write access.
