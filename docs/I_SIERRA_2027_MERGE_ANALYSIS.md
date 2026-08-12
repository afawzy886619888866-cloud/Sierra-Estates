# i-sierra-2027 (v6) → SE-Vercel-Deploy — Merge Analysis

**Date:** 2026-08-11
**Source:** `i-sierra-2027-main (6).zip` (108.9 MB, 21,052 files, dated 2026-06-06)
**Method:** SHA-1 content hashing of both trees, exact blob matching (same method as
[`ARC_SURVEY_REPORT.md`](./ARC_SURVEY_REPORT.md)).
**Outcome: no merge performed. No source file was imported.**

---

## 1. Headline

The archive contains **nothing this repository does not already have in equal or better
form.** Every subsystem named in the merge request is already present here as a strict
superset. The one genuinely absent directory is third-party vendored software, not
Sierra code.

A monorepo restructure (`apps/agent-orchestration/`, `apps/sierra-platform/`,
`packages/agent-framework/`, `packages/schemas/`) was requested. It was **not** carried
out — see §5 for why that structure is also actively unsafe here.

---

## 2. Content-hash diff

| Bucket | Files |
| --- | ---: |
| Total files in archive | 21,052 |
| Byte-identical to a file already in this repo | 2,783 |
| Content not present here | 18,269 |
| — of which `frontend-vercel/` (out of scope, and largely self-duplicating) | 10,554 |
| — of which `.agent/` skill scaffolding (excluded as noise) | 7,004 |
| **Real backend/app/package code** | **655** |
| **…whose filename does not already exist in this repo** | **7** |

Those final 7: one `.pyc` bytecode artifact, two root markdown guides, three
`apps/web/` frontend components, and one `.github/workflows/test.yml`. None is a
backend, agent, or workflow file.

The archive is also heavily self-duplicating: the DSL parser appears **9 times** inside
it at 9 different paths, byte-identical each time.

---

## 3. The four requested "key features" — all already superset here

| Requested feature | This repo | Archive | Verdict |
| --- | ---: | ---: | --- |
| Memory management (`packages/open-memory`) | **352 files** | 280 | Repo is newer/larger |
| Business automation workflows (`workflows/`) | **34 files** (+4 n8n JSON in `infra/`) | 14 | Repo has the same 5 numbered stages, plus more |
| Agent execution engine (`packages/agents` + `apps/agents`) | **26 + 11,289** | 7 + 6 | Not comparable — repo is the real implementation |
| Multi-source data integration (`apps/api`) | present | 11 novel files, all older | Repo is current |

---

## 4. The DSL parser — the prior report's "biggest dropped code" is a false alarm

`ARC_SURVEY_REPORT.md` §5 flagged `apps/sierra-estates-realty/lib/dsl/parser.ts` as a
36-byte stub hiding the loss of a 16,670-byte parser, and warned it must not be applied
blind. That warning was correct, and checking it resolves the other way:

- The full parser is present and live at **`packages/db/lib/dsl/parser.ts` — 17,602 bytes**,
  i.e. **larger and newer** than the archive's 16,670-byte copy.
- The app-level stub (`export * from '@sierra-estates/db'`) is **intentional and correct**:
  `packages/db/lib/index.ts` re-exports `./dsl/parser`, so the symbols resolve through it.
- Consumers already resolve correctly — `packages/agents/src/hooks/use-dsl-view.ts` uses
  all five functions (`parseDSL`, `buildFirestoreQuery`, `applyFieldVisibility`,
  `groupDocuments`, `computeComparisonDelta`), and
  `__tests__/shared-db-review-fixes.test.ts` imports from `packages/db` directly.

**Overwriting the stub with the archive's copy would have downgraded the parser and
broken the package re-export chain.** No action taken.

`ARC_SURVEY_REPORT.md` §5 should be considered resolved by this note.

---

## 5. Why the proposed restructure was not carried out

Both live Vercel projects have `rootDirectory` pinned to their app directory
(`apps/sierra-estates-realty` and `apps/admin-dashboard`). Renaming or moving
`apps/sierra-estates-realty` into `apps/sierra-platform/` breaks the live deploy path for
production `sierra-estates.net` — it is a production infrastructure change, not a
refactor.

This is compounded by the unresolved **Vercel project-ID conflict** documented in
`CLAUDE.md`: the repo's config declares one set of project IDs while a different set is
actually receiving deployments. Restructuring app directories while it is ambiguous
which projects are authoritative risks taking production down with no clear rollback.

---

## 6. Security findings

| Finding | Status |
| --- | --- |
| `integration_config.py` in this archive contains a **live-looking PropertyFinder API key** (`YHDNf.…XE9ae`), hardcoded. Verified **absent** from this repo's tracked files *and* its full git history. | **Do not import.** Merging this file would newly introduce a secret. Rotate the key if it is still valid. |
| Prior report's flagged OpenClaw token (`02b25ff…ec02`) | Not present in this archive. Rotation status still unconfirmed — see `ARC_SURVEY_REPORT.md` §8. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` hardcoded as a fallback in the archive's `listings/route.ts` | Not a leak — `NEXT_PUBLIC_` Firebase web keys are public by design. Already in this repo's `.env.example`. No action. |

The prior report described `integration_config.py` as a 7,213-byte stdlib-only dataclasses
file with "all secrets from env vars." **The file of that name in this archive is a
different, 166-byte file containing a hardcoded key.** They are not the same artifact;
do not rely on the earlier clearance.

---

## 7. `apps/hermes-webui` — the only genuinely absent directory

55 novel files. It is **third-party vendored software**: the
[Hermes Agent](https://hermes-agent.nousresearch.com/) WebUI by Nous Research, shipped
with its own `LICENSE`, `CONTRIBUTORS.md`, Dockerfiles and pytest suite.

It is unrelated to this repo's own "Hermes" — which is a WhatsApp bot persona/router at
`apps/agents/whatsapp-bot/chat-hermes.ts`. The name collision is coincidental.

Vendoring a third-party application into the monorepo is a licensing and maintenance
decision, not a merge. **Left out, pending an explicit decision.**

---

## 8. Recommendation

1. **Do not merge this archive.** It is an older generation of this codebase. Treat
   `i-sierra-2027` as superseded.
2. **Rotate the PropertyFinder key** in §6 if still valid.
3. **Confirm the OpenClaw token rotation** left open by the prior report.
4. If Hermes WebUI is genuinely wanted, add it as a pinned dependency or a separate
   repo/submodule — not a source copy.
5. Resolve the Vercel project-ID conflict before any `apps/` restructuring is considered.

The archive remains at its original location; nothing was extracted into the repository.
