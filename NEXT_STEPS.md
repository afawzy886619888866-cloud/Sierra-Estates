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

## Completed in this session (2026-09-12)

- **Track A (Critical Security Remediation)**: Resolved lone Critical Dependabot advisory (CVE-2026-59873, GHSA-23hp-3jrh-7fpw) by updating `tar` from vulnerable `6.2.1` to patched `7.5.22` in `pnpm-workspace.yaml` overrides and re-locking in `pnpm-lock.yaml`.
- **Track B (Remote MCP Endpoint & OAuth 2.1)**: Executed live smoke validation against `https://sierra-estates.net` — 19/19 assertions passed across RFC 8414 metadata, RFC 7591 DCR, PKCE authorization flow, token exchange, and Streamable-HTTP tool listing. All 29 unit tests in `oauth-mcp.test.ts`, `mcp-http-route.test.ts`, and `tool-bridge.test.ts` pass cleanly.
- **Track C (CI/CD Diagnostics)**: Root-caused GitHub Actions `startup_failure` (2,000 monthly quota exhaustion on private repo under GitHub Free plan). Verified local pre-flight gates (`type-check`, `check-backend-policy`, `check-public-env-safety`, `check-no-compiled-twins`).
- **Track D (Canonical Supabase Enforcement)**: Verified Supabase Postgres/pgvector as the sole authoritative backend for all writes (`InventoryDomainService`, `records.ts`, `listings`). Cleaned residual legacy references in system prompts.

## Immediate next steps

1. Monitor GitHub Dependabot alert re-index to confirm closure of critical alert #44.
2. Consider enabling GitHub Actions spending limit or self-hosted runner to resume automated CI runs on PRs.
3. Keep the architecture docs synchronized with code-level implementation.
4. Continue expanding PostGIS spatial queries into client-side map filtering and recommendation feeds.