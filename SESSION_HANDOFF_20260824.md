# Sierra Estates — Session Handoff Prompt

Copy everything inside the block below into a new Claude session.

---

```
Sierra Estates monorepo — continuing work from a previous session.

REPO: H:\last\Main\SE-Vercel-deploy-main  (connect this folder first)
GitHub: sierrablue8866-droid/SE-Vercel-deploy-main
Vercel: prj_ieVcIcoeTtHndspXMzlE0cwLl89c / team_UvdJ5ezVTaqEKyhqZ5QVqOKJ
Live: https://sierra-estates.net

Read CLAUDE.md first — this repo follows the MCD protocol (Command Deck board at
http://127.0.0.1:8888, board_c6e3065cb0). Prior findings are stored there under memory keys
incident.commit-attribution.handoff and task.security-remediation.handoff — read both before
starting. Full written report:
https://claude.ai/code/artifact/4a5bf32f-dcd1-4f20-9e2f-4f2cc6d420c9

STATE AS OF LAST SESSION (all pushed to main, CI green at 7e643496):
- Dependabot advisories cut 92 -> 16. Critical 1 -> 0, high 40 -> 5.
- The 5 remaining high have NO upstream patch: extract-zip x3 (2.0.1 is latest and vulnerable,
  transitive under puppeteer via whatsapp-web.js which is already latest, plus the hint linter),
  image-size x2 (2.0.2 latest and vulnerable, dev-only via hint). Do not chase these.
- 8 remaining moderates need semver-major jumps (firebase-admin 10/13->14, googleapis->176) in
  the standalone npm projects. Operator decision, not done.
- Ghost .gitmodules removed; xlsx migrated to the SheetJS CDN tarball 0.20.3 (npm has no fixed
  release).
- Two CI guards added: "Commit author attribution" and "Security overrides in sync". Both work.

OPEN WORK, in priority order:
1. A cloud agent (UTC environment, authenticated as sierrablue8866-droid) keeps pushing commits
   whose author email is 2.63279258e+08+sierrablue8866-droid@users.noreply.github.com — the
   GitHub user id 263279258 float-formatted. GitHub returns an EMPTY author.login for these, so
   Vercel rejects the deploy as BLOCKED before any build. It is NOT on this machine (searched)
   and not in the repo. I need to identify what runs the Airtable inventory sync remotely and fix
   its git identity. That same agent also edits app/(site)/ and components/, which CLAUDE.md
   Protected Core Rules put behind explicit approval — it should be reined in.
2. Milestone M10-001 on the Command Deck has 4 approved contract cards for a remote MCP endpoint
   with OAuth 2.1 at https://sierra-estates.net/api/mcp. Nothing is built yet; EXECUTE was never
   authorized. Context: the old "SE-Vercel-deploy-main" connector failed because its URL was a
   GitHub repo URL and github.com does not implement dynamic client registration. Vercel SSO is
   all_except_custom_domains, so the custom domain is already exempt — no bypass token needed.
3. Vercel free-tier upload quota (api-upload-free) has blocked releases twice. Currently working
   via archive-mode uploads. Worth a plan decision.

GOTCHAS THAT COST ME TIME — please carry these forward:
- pnpm: the shim on PATH is a v11 global but the repo pins 9.15.4. Security overrides MUST stay
  identical in BOTH package.json pnpm.overrides AND pnpm-workspace.yaml overrides. The workspace
  overrides map has 111 entries; some pins (js-yaml, typescript) live outside the marker block,
  and re-adding them creates duplicate YAML keys that pnpm rejects outright.
- DO NOT let TypeScript go to 7.x. ts-jest cannot run on it and the whole suite dies, while
  type-check still passes so it looks fine. Pin ^5.8.2. A Dependabot PR did exactly this and
  broke main.
- Always run `pnpm test:ci`, not just `pnpm type-check` — type-check alone will not catch that
  class of break.
- .amphion/command-deck/data/amphion.db is held open by the Command Deck server and blocks git
  rebase/stash. Stop the process on port 8888, stash it, rebase, push, pop, restart.
- In PowerShell, [System.IO.File] uses the process CWD (C:\Windows\System32), not your location.
  Use absolute paths or it silently writes nothing.
- Another agent pushes to main frequently. Always fetch/rebase in a retry loop before pushing.

RULES:
- Never lose work. A safety tag safety/pre-cleanup-20260824 is on origin, 20 refs/salvage/* refs
  are local, and full bundles sit in H:\last\Main\_repo-safety-backup-20260824. Verified last
  session that no human work is stranded: every non-Dependabot branch is fully merged, no
  stashes, no conflict markers.
- Never delete anything without proving it is unreferenced AND byte-identical to a surviving
  twin. BILING_INTEGRATION_REPORT.md is the ARABIC edition of BILINGUAL_INTEGRATION_REPORT.md —
  not a duplicate.
- No force pushes, no history rewrites.
- Verify before every push: pnpm install, pnpm test:ci, pnpm type-check.

Start by checking git status, whether main is green in CI, and the current Dependabot alert
count, then tell me what you find before changing anything.
```

---

## Reference — where things live

| Thing | Location |
|---|---|
| Safety tag (pre-cleanup state) | `safety/pre-cleanup-20260824` on origin -> `c318361a` |
| Salvaged dangling commits | 20 x `refs/salvage/*` (local only) |
| Full repo bundles + local data | `H:\last\Main\_repo-safety-backup-20260824` |
| Written report | https://claude.ai/code/artifact/4a5bf32f-dcd1-4f20-9e2f-4f2cc6d420c9 |
| Command Deck memory | `incident.commit-attribution.handoff`, `task.security-remediation.handoff` |
| Last green commit | `7e643496` — CI success on all three jobs |

## Commits shipped this session

| SHA | Change |
|---|---|
| `da02f8e0` | Remove ghost submodule entry |
| `94e24df7` | Fix inventory-sync commit identity |
| `1021d82a` | Six pnpm security overrides — 1 critical + 16 high |
| `4ebc5017` | Python + nested npm advisories — 12 high |
| `940814b6` | Drop vestigial npm lockfile |
| `fc619e7d` | xlsx -> SheetJS 0.20.3 — 6 high |
| `c318361a` | Declare hoisted xlsx dep + CI attribution guard |
| `e8c45a95` | Remove two provably dead duplicates |
| `21b31128` | Revert TypeScript 7, sync all 18 overrides, add override guard |
| `7e643496` | Stop cancelling CI runs on main |
