# Antigravity Project Guidelines · Sierra Estates (`SE-Vercel-deploy-main`)

## 1. Authoritative Backend & Architecture

- **Supabase is the Sole Authoritative Backend**: All database tables, Auth, pgvector embeddings, real-time queues, and media storage live in Supabase Postgres (`https://gaxfqcietzoonlmatiot.supabase.co`).
- **Legacy Deployments Retired**: Firebase deployments are permanently deactivated. Never deploy to Firebase or reintroduce Firebase hosting/rules workflows.
- **Environment & Secrets**: Never commit or expose service role keys, database secrets, or API tokens client-side. Always use `process.env.SUPABASE_SERVICE_ROLE_KEY` in server-only contexts and `NEXT_PUBLIC_*` strictly for public values.

## 2. Next.js App Router & TypeScript Standards

- **Server Components by Default**: Data fetching, metadata, and security-critical logic reside in Server Components.
- **Client Components**: Explicitly add `"use client"` only when hooks (`useState`, `useEffect`, `useCallback`) or browser events are required.
- **Type Safety**: Strictly avoid `any`. All schemas and RPC calls must be typed against Supabase definitions or Zod models.
- **Verification First**: Always verify type checking (`pnpm --filter sierra-estates-client-page type-check`) and test suites (`pnpm test:ci`) before concluding changes.

## 3. Design & User Experience

- **Aesthetics & Polish**: Use the `impeccable` and `frontend-design` skills for UI work. Ensure high-polish luxury real estate aesthetic, responsive layouts, smooth transitions, and accessible contrast.
- **Tailwind CSS**: Follow `tailwind-patterns`. Do not write ad-hoc utility soups where reusable component patterns or CVA tokens are established.

## 4. Installed Local & Global Skills

For the full catalog and architecture breakdown, see [`docs/SKILLS_REGISTRY.md`](file:///H:/last/Main/SE-Vercel-deploy-main/docs/SKILLS_REGISTRY.md). Key active skills include:

- **Real Estate Intelligence & Automation**: `sierra-closer-agent`, `concierge-lead-agent`, `whatsapp-inventory-harvester`, `real-estate-valuation-analyzer`, `ecc-memory-engine`, `excel-archive-processor`, `inventory-csv-merger`.
- **UI/UX & Design (Anti-Slop)**: `ui-ux-pro-max`, `impeccable`, `design-taste-frontend` (`taste-skill`), `high-end-visual-design` (`soft-skill`), `stitch-design-taste`, `minimalist-ui`, `industrial-brutalist-ui`, `gpt-taste`.
- **Code & Architecture**: `clean-code`, `code-reviewer`, `database-design`, `nextjs-supabase-auth`, `sierra-deployment-ops`.

<!-- BEGIN AWS Agent Toolkit rules -->

## 5. AWS Guidance

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

### Secret Safety

- MUST load the `aws-secrets-manager` skill first for any secret,
credential, API key, token, or password task. MUST NOT call
`secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST
NOT hit the Secrets Manager Agent daemon directly. MUST use
`{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with
`asm-exec` so the secret resolves at runtime without entering context.
<!-- END AWS Agent Toolkit rules -->