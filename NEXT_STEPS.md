# Active backlog and legacy archive

This file is intentionally short and status-based. It records the current engineering priorities and separates them from stale legacy plans that were superseded by the canonical Vercel + Supabase architecture.

## Current focus

- Enforce canonical backend usage across high-volume write boundaries.
- Keep worker jobs separated from request-path code.
- Validate deployment and backend policy early in CI/CD and release checks.
- Keep docs and runbooks aligned with the active architecture.

## In active use

- `DEPLOYMENT.md` as the canonical architecture and deployment policy
- `CLAUDE.md` as the AI/session operating brief
- `packages/db/lib/backend-policy.ts` and `scripts/check-backend-policy.mjs` as backend guardrails
- `pnpm check:backend` and `pnpm deploy:check` as release validation steps

## Legacy material

Older Firebase-era deployment notes, emulator playbooks, and direct Firebase-hosting guidance are kept only as archived context. They are not part of the active workflow and should not be used as operational instructions.

## Immediate next steps

1. Expand the canonical backend enforcement to additional high-value write paths.
2. Audit remaining app/service-level writes for silent legacy fallback behavior.
3. Keep the architecture docs synchronized with code-level implementation.
4. Archive or remove truly unused legacy code only after all active flows move to Supabase.