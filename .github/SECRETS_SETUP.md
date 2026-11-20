# GitHub Actions environment setup

The active deployment uses **Cloudflare Workers + Supabase** (unified worker
via `.github/workflows/deploy-cloudflare.yml`; Vercel was fully retired in
PR #74 — `VERCEL_*` secrets are obsolete and must NOT be recreated). Do not
add Firebase credentials or any other provider credentials to the active
workflow.

## Required values

Configure these in GitHub repository **Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` (secret) — wrangler deploy token
- `CLOUDFLARE_ACCOUNT_ID` (repository **variable**, not a secret — as wired in deploy-cloudflare.yml)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- `SBR_SECRET_KEY`
- `CRON_SECRET`

Add integration-specific secrets only when the corresponding worker is enabled.
Use the names in `scripts/setup-github-secrets.js`; it reads values from the
operator environment and never contains credentials itself.

## Validation

Run the following before enabling production deployment:

```bash
pnpm check:public-env
pnpm check:backend
pnpm deploy:check:env
pnpm deploy:check
```

Service-role keys and integration tokens must remain encrypted GitHub secrets.
Only public Supabase configuration may be stored as a repository variable.
