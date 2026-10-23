# Security posture

This repository is actively aligned around the Vercel + Supabase runtime model. Firebase-era instructions are legacy and should be treated as historical context, not as the current security contract.

## Current authoritative stack

- Vercel hosts the public and admin web surfaces
- Supabase is the canonical backend for database, auth, storage, and vector/search state
- Workflows and crawlers run in worker services outside the Next.js request lifecycle
- Service-role credentials remain server-only; public keys stay public-only

## Core guardrails

1. `NEXT_PUBLIC_*` values are public and must not contain secrets.
2. Supabase service-role keys are never exposed to browsers or client bundles.
3. Any canonical backend configuration missing at runtime should fail loudly instead of degrading to legacy paths.
4. Long-running external jobs should run in workers, not in request handlers.
5. Sensitive admin paths require proper auth and role enforcement before mutation.

## Active security checklist

- Keep env values in Vercel / Supabase / GitHub environment settings, not inside source control.
- Validate the public env contract with `pnpm check:public-env`.
- Validate the canonical backend contract with `pnpm check:backend`.
- Validate deployment readiness with `pnpm deploy:check`.
- Separate public endpoints from admin-only mutations and service jobs.

## Recommended operational pattern

- Use Supabase Auth and RLS for user/session boundaries.
- Store database, storage, and app state in Supabase-managed infrastructure.
- Keep worker automation outside the request path (n8n, `apps/api`, GitHub Actions).
- Treat any old Firebase rules, emulator instructions, or Firebase deploy commands as deprecated unless explicitly restored by a migration plan.

## Minimal production rules

- Never commit API keys, DB secrets, service-role keys, or bot tokens.
- Never silently fall back to a legacy backend when the canonical backend is unavailable.
- Keep secrets in environment stores and reference them through server-side code only.
- Validate before release: `pnpm lint`, `pnpm type-check`, `pnpm test:ci`, `pnpm check:backend`.