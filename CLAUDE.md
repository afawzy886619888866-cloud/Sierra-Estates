# CLAUDE.md — Sierra Estates

This file is the operational briefing for Claude Code and AI assistant sessions. Keep it consistent with `DEPLOYMENT.md`; if the deployment policy changes, update both files in the same edit.

## 1. Current architecture

Sierra Estates is a Turborepo monorepo built around a Next.js app and a Supabase-first backend.

- Public site: `apps/sierra-estates-realty` on `sierra-estates.net`
- Admin console: same app on `admin.sierra-estates.net`
- Canonical backend: Supabase (Postgres, Auth, Storage, RLS, pgvector)
- Workers: n8n, Python API (`apps/api`), and GitHub Actions scheduled jobs
- Long-running jobs stay outside Next.js request handlers

This is the active model. Legacy Firebase deployment references are intentionally not part of the operational workflow.

---

## 2. Backend workflow

```text
Web app surfaces (Vercel)
  └─ trigger / monitor
       └─ Supabase (authoritative data + auth + storage)
              ├─ listing data
              ├─ user/auth state
              ├─ media and documents
              └─ vector/search state

Workers (outside request path)
  ├─ n8n / Docker / VPS -> WhatsApp, scrapers, automations
  ├─ apps/api / Cloud Run -> PropertyFinder sync, bot integration
  └─ GitHub Actions -> scheduled sync / automation
```

The web surfaces remain thin and operationally safe. Actual heavy work is delegated to worker processes rather than running inside Next.js request paths.

---

## 3. Repository layout

- `apps/sierra-estates-realty` — main web app and admin codebase
- `apps/api` — Python worker service for external sync and bot hooks
- `workflows/` — automation scripts and data-pipeline work
- `packages/*` — shared libraries and service code
- `docs/` — architecture and deployment documentation

---

## 4. Canonical command set

Run the commands below from the repo root. Keep this list as the one true command set.

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

Do not rely on legacy Firebase commands such as `pnpm deploy:rules` or `pnpm deploy:functions`; they are not part of the current architecture.

---

## 5. Security and deployment rules

- Supabase is the canonical backend for all primary reads/writes.
- Service-role keys stay server-side only.
- `NEXT_PUBLIC_*` values stay public-only.
- Worker jobs should not run inside the Next.js request lifecycle.
- Fail loudly when the canonical backend configuration is missing; do not silently fall back to legacy paths.

---

## 6. Operational guardrails

- Keep the architecture docs synchronized with the codebase.
- Prefer worker-based workflows for scrapers, bot tasks, and long-running jobs.
- Treat stale Firebase instructions as deprecated unless they are explicitly restored by a migration plan.
- Validate before shipping: `pnpm lint`, `pnpm type-check`, `pnpm test:ci`, `pnpm check:backend`.

<!-- BEGIN AWS Agent Toolkit rules -->
## AWS Guidance

- Where these AWS rules conflict with the project's own instructions, the
  project's instructions take precedence.
- Prefer the AWS MCP Server for AWS interactions — it provides sandboxed
  execution, observability, and audit logging. If unavailable, use the
  AWS CLI directly.
- Before starting a task, check whether a relevant AWS skill is available.
  Load the skill with `retrieve_skill` and prefer its guidance over
  general knowledge.
- When uncertain about specific AWS details (API parameters, permissions,
  limits, error codes), verify against documentation rather than guessing.
  State uncertainty explicitly if you cannot confirm.
- When creating infrastructure, prefer infrastructure-as-code (AWS CDK or
  CloudFormation) over direct CLI commands.
- When working with infrastructure, follow AWS Well-Architected Framework
  principles.
- Do not use em dashes in AWS resource names or descriptions. Use
  hyphens instead.

## Secret Safety

- MUST load the `aws-secrets-manager` skill first for any secret,
  credential, API key, token, or password task. MUST NOT call
  `secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST
  NOT hit the Secrets Manager Agent daemon directly. MUST use
  `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with
  `asm-exec` so the secret resolves at runtime without entering context.
<!-- END AWS Agent Toolkit rules -->
