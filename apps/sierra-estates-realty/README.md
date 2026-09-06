# Sierra Estates Realty

This app is the main Next.js codebase for Sierra Estates. The active deployment model is a Vercel-hosted web app backed by Supabase, with worker jobs isolated from the request path.

## Current runtime model

- Public site: `sierra-estates.net`
- Admin surface: `admin.sierra-estates.net`
- Canonical backend: Supabase (database, auth, storage, RLS, pgvector)
- External automation: n8n, `apps/api`, and scheduled GitHub Action jobs

Legacy Firebase deployment instructions are not part of the active runtime contract.

## Monorepo role

```text
apps/sierra-estates-realty/
├── app/                 # Next.js app routes and UI
├── components/          # reusable UI blocks
├── lib/                 # app logic, service layers, and integrations
├── scripts/             # app-specific tooling
├── public/              # static assets
├── tests/               # app-level validation
└── ...
```

## Key engineering principles

- Keep the app surface thin and deterministic.
- Put heavy jobs in workers instead of request handlers.
- Prefer Supabase for canonical state and auth.
- Fail loudly when canonical backend configuration is missing.

## Canonical commands

Run from the repo root:

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

## Notes

This is not a Firebase-hosted web app. The active architecture is Vercel + Supabase with isolated worker automation.