# Contributing to Sierra Estates

This repository is active around a Vercel + Supabase stack. Keep contributions aligned with the canonical architecture in `DEPLOYMENT.md` and `CLAUDE.md`.

## Active architecture

- Web app: `apps/sierra-estates-realty` on Vercel
- Public host: `sierra-estates.net`
- Admin host: `admin.sierra-estates.net`
- Canonical backend: Supabase PostgreSQL + Auth + Storage + pgvector + RLS
- Worker services: `apps/api`, n8n, GitHub Actions, scheduled jobs

Legacy Firebase deployment instructions are retired and should not be used for active work.

## Local setup

```bash
git clone https://github.com/sierrablue8866-droid/SE-Vercel-deploy-main.git
cd SE-Vercel-deploy-main
pnpm install
```

Use the repo-root environment and secrets management process; do not add service-role keys or secrets to the frontend or repo files.

## Working conventions

### Branching

Create a branch from `main` using a clear, task-based name:

- `feature/...`
- `fix/...`
- `refactor/...`
- `docs/...`
- `chore/...`

### Validation before PR

Run the active validation set before shipping:

```bash
pnpm lint
pnpm type-check
pnpm test:ci
pnpm check:backend
pnpm deploy:check
```

### Code standards

- Prefer typed server-side logic over implicit runtime behavior.
- Fail loudly when the canonical backend config is missing; do not silently fall back to legacy paths.
- Keep long-running work in workers and services, not in the Next.js request lifecycle.
- Keep docs and scripts consistent with the active Vercel + Supabase deployment model.

## Canonical commands

Use the repo root commands below as the source of truth:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm type-check
pnpm test:ci
pnpm check:public-env
pnpm check:backend
pnpm deploy:check
pnpm deploy:supabase
pnpm migrate:supabase
```

Do not rely on Firebase-era commands such as `pnpm deploy:rules` or `pnpm deploy:functions` for regular development or deployment.

## Commit and PR guidance

Follow conventional commits where practical, for example:

```text
feat(listings): add inventory sync guard
fix(auth): enforce server-only backend access
refactor(db): centralize canonical backend assertions
```

Then open a pull request with a concise summary of what changed and what was validated.

## Main references

- `DEPLOYMENT.md` — authoritative architecture and deployment contract
- `CLAUDE.md` — AI/session operating brief
- `SECURITY.md` — current security posture and guardrails
- `README.md` — repo-level overview
