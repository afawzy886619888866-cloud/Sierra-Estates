<!--
  Sierra Estates PR — see DEPLOYMENT.md for the deployment & architecture policy.
-->

## What & why


## Deployment & architecture policy ([DEPLOYMENT.md](../DEPLOYMENT.md))

- [ ] No heavy/long-running work added to a Next.js request or Vercel function (scrapers/agents/bulk sends run on a worker — Cloud Run / n8n / Actions).
- [ ] Admin changes (if any) stay in `apps/sierra-estates-realty/app/admin/` — no second admin UI.
- [ ] No secrets/service-account JSON committed; new env vars documented in `*.env.example` only.
- [ ] New app/service (if any) classified per §7 and **registered in the DEPLOYMENT.md matrix + CLAUDE.md**.
- [ ] Any new HTTP surface uses a `*.sierra-estates.net` subdomain.

## Checks

- [ ] `pnpm run lint` (hard CI gate)
- [ ] `pnpm type-check` run locally
- [ ] `pnpm build` run locally (until build is a hard gate)

## Deploy impact

<!-- e.g. "auto-deploys to Vercel prod on merge", "needs `firebase deploy` after", "Cloud Run only", "docs only — no deploy" -->
