# How to ship the /properties map redesign — STATUS: WORK IS DONE, 2 CLICKS LEFT

**2026-11-03.** The redesign is **already implemented, tested and re-verified** —
you do NOT need Antigravity for it. At your earlier "please you do" instruction I
implemented it directly against the deploy repo:

| Item | Value |
|---|---|
| Commit | `6a57729d` on branch `feat/map-ui-stitch` |
| Base | deploy-repo `main @ b38692a8` (re-checked today — still HEAD, so it applies clean) |
| Scope | 7 files, **+2709 / −51, presentation layer ONLY** (no `/api/inventory`, publish gates, RLS, migrations, coordinates) |
| Tests | `tsc` 0 errors · vitest **34/34** · live-data browser smoke (`/api/inventory` = real units) |
| Evidence | 6 screenshots in `stitch_redesign_evidence/` (4 variants + registry modal + proximity zoom) |
| Full report | `SIERRA_MAP_UI_REDESIGN_DELIVERY.md` |

**Re-verified today (2026-11-03):** patch applies clean on current `main`,
git-bundle fetch OK, bundle tree == patch tree, zero data-layer files touched,
zero secrets in the patch. The **only** step left is the push to GitHub, which
must run on your machine (this chat has no credentials — by design).

---

## Route A — RECOMMENDED: run the script (about 2 minutes + Vercel build)

1. **Download** `ship_map_redesign.zip` from this chat and extract it anywhere.
2. In the extracted folder, run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\DEPLOY_MAP_REDESIGN.ps1
   ```
   The script clones the deploy repo, recreates `feat/map-ui-stitch` from the
   verified git bundle (patch fallback included), pushes the branch, and opens
   the PR page. It **never touches `main`**.
3. On github.com: **Create pull request → Merge pull request.**
   Merging is what triggers the Vercel production deploy automatically.
4. Verify after the deploy finishes:
   ```powershell
   curl.exe -s -o NUL -w "home:  %{http_code}`n" https://sierra-estates.net
   curl.exe -s -o NUL -w "map:   %{http_code}`n" https://sierra-estates.net/properties
   curl.exe -s -o NUL -w "admin: %{http_code}`n" https://admin.sierra-estates.net
   ```
   All three must be `200`, then eyeball https://sierra-estates.net/properties
   (Light/Dark + EN/ع + AR|EN pills appear on the map).

**Rollback** (if anything looks wrong): Vercel dashboard → Deployments → last
good → **Instant Rollback**; or `git revert <merge-commit>` + push.

### Route A without the script (same thing, by hand)

```powershell
git clone https://github.com/sierrablue8866-droid/SE-Vercel-deploy-main.git
cd SE-Vercel-deploy-main
git fetch ..\map-ui-stitch.bundle feat/map-ui-stitch:feat/map-ui-stitch
git checkout feat/map-ui-stitch
git push -u origin feat/map-ui-stitch
```
→ open https://github.com/sierrablue8866-droid/SE-Vercel-deploy-main/compare/main...feat/map-ui-stitch?expand=1 → Create PR → Merge.
(Patch alternative: `git checkout -b feat/map-ui-stitch origin/main` then `git am ..\0001-map-masterplan-stitch-redesign.patch`.)

---

## Route B — ONLY if you insist on having Antigravity re-implement it

Not needed (my implementation is done and verified), but if you prefer: open
Google Antigravity on a **clone of the deploy repo**
(`sierrablue8866-droid/SE-Vercel-deploy-main`), attach
`sierra_map_redesign_antigravity_bundle.zip`, and paste:

```
Create branch feat/map-ui-stitch-v2 from main. Implement the attached order
(sierra_estates_map_redesign_order_v2.md) exactly: the approved Stitch
masterplan design for /properties — 4 variants (Light/Dark × EN/AR/bilingual),
glass compound pills with live count chips, zoom-driven proximity
magnification with golden focus aura at z≥14, Inventory Registry modal fed by
the FULL filtered live inventory, keyless Esri basemaps, golden compass + live
coordinates + real scale bar. Presentation layer ONLY: do not touch
/api/inventory, publish gates, RLS, migrations, or compounds-data.ts
coordinates. No demo values (order §21), no hotlinks to Stitch/Google CDNs,
keep react-leaflet. Verify with tsc + vitest, commit, push the branch, open a
PR to main. Do not merge.
```

The port-from-private-repo flow for that route is in `GIT_POWERSHELL_COMMANDS.md` §4.

---

## Still open (unchanged)

- 🔴 **Supabase key rotation** — the only remaining project task; yours, in the
  Supabase console (RUNBOOK §4): rotate the legacy service_role JWT and
  `sb_secret_…`, update both Vercel projects, redeploy.
- 🟡 Optional follow-ups found during implementation (see delivery report §5):
  CARTO "API KEY REQUIRED" watermark still affects admin views and /net radar;
  Vercel anon key differs from local se.env.

## Files in `ship_map_redesign.zip`

| File | Purpose |
|---|---|
| `DEPLOY_MAP_REDESIGN.ps1` | one-shot ship script (Route A) |
| `map-ui-stitch.bundle` | git bundle with the exact verified commit `6a57729d` |
| `0001-map-masterplan-stitch-redesign.patch` | the same change as a patch (fallback / PR review) |
| `HOW_TO_SHIP_MAP_REDESIGN.md` | this file |
| `SIERRA_MAP_UI_REDESIGN_DELIVERY.md` | full implementation + verification report |
