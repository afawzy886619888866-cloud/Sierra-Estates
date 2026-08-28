# Implementation Plan: AI Orchestrator, DeepSeek Harness, Admin Scaffolds & Multi-Agent Infrastructure

Scaffold and integrate the complete Sierra Estates AI Orchestration ecosystem, including `deepseek-harness`, `ai-orchestrator`, `ai-agent-sdk`, Firestore migrations, Pub/Sub messaging with Redis fallback, PropertyFinder synchronization pipeline, modular Admin UI views, operational CLI scripts, health monitoring endpoints, GitHub Actions CI workflows, Sentry hooks, and deployment templates on git branch `harness-coordinator-full`.

---

## User Review Required

> [!NOTE]
> All new packages (`packages/deepseek-harness`, `packages/ai-orchestrator`, `packages/ai-agent-sdk`) will be registered in `pnpm-workspace.yaml` and will adhere to the repository's TypeScript and ESM conventions.

> [!IMPORTANT]
> The Pub/Sub broker is architected with dynamic fallback: in GCP production environments, it communicates directly with Google Cloud Pub/Sub; in local/development environments, it falls back seamlessly to Redis (or an in-memory event bus if Redis is offline).

---

## Proposed Changes

### 1. New Packages & Harness Submodule

#### [NEW] [packages/deepseek-harness/package.json](file:///h:/last/Main/SE-Vercel-deploy-main/packages/deepseek-harness/package.json)
#### [NEW] [packages/deepseek-harness/tsconfig.json](file:///h:/last/Main/SE-Vercel-deploy-main/packages/deepseek-harness/tsconfig.json)
#### [NEW] [packages/deepseek-harness/README.md](file:///h:/last/Main/SE-Vercel-deploy-main/packages/deepseek-harness/README.md)
#### [NEW] [packages/deepseek-harness/src/index.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/deepseek-harness/src/index.ts)
#### [NEW] [packages/deepseek-harness/src/harness.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/deepseek-harness/src/harness.ts)
#### [NEW] [packages/deepseek-harness/src/evaluator.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/deepseek-harness/src/evaluator.ts)
#### [NEW] [packages/deepseek-harness/src/scenarios.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/deepseek-harness/src/scenarios.ts)
#### [NEW] [packages/deepseek-harness/src/types.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/deepseek-harness/src/types.ts)
#### [NEW] [.gitmodules](file:///h:/last/Main/SE-Vercel-deploy-main/.gitmodules)

#### [NEW] [packages/ai-orchestrator/package.json](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-orchestrator/package.json)
#### [NEW] [packages/ai-orchestrator/tsconfig.json](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-orchestrator/tsconfig.json)
#### [NEW] [packages/ai-orchestrator/README.md](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-orchestrator/README.md)
#### [NEW] [packages/ai-orchestrator/src/index.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-orchestrator/src/index.ts)
#### [NEW] [packages/ai-orchestrator/src/orchestrator.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-orchestrator/src/orchestrator.ts)
#### [NEW] [packages/ai-orchestrator/src/coordinator.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-orchestrator/src/coordinator.ts)
#### [NEW] [packages/ai-orchestrator/src/workflow-runner.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-orchestrator/src/workflow-runner.ts)
#### [NEW] [packages/ai-orchestrator/src/pubsub-broker.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-orchestrator/src/pubsub-broker.ts)
#### [NEW] [packages/ai-orchestrator/src/types.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-orchestrator/src/types.ts)

#### [NEW] [packages/ai-agent-sdk/package.json](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-agent-sdk/package.json)
#### [NEW] [packages/ai-agent-sdk/tsconfig.json](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-agent-sdk/tsconfig.json)
#### [NEW] [packages/ai-agent-sdk/README.md](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-agent-sdk/README.md)
#### [NEW] [packages/ai-agent-sdk/src/index.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-agent-sdk/src/index.ts)
#### [NEW] [packages/ai-agent-sdk/src/client.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-agent-sdk/src/client.ts)
#### [NEW] [packages/ai-agent-sdk/src/agent-base.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-agent-sdk/src/agent-base.ts)
#### [NEW] [packages/ai-agent-sdk/src/memory-client.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-agent-sdk/src/memory-client.ts)
#### [NEW] [packages/ai-agent-sdk/src/types.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/ai-agent-sdk/src/types.ts)

---

### 2. Firestore Migrations, Rules & Indexes

#### [MODIFY] [pnpm-workspace.yaml](file:///h:/last/Main/SE-Vercel-deploy-main/pnpm-workspace.yaml)
- Register `packages/deepseek-harness`, `packages/ai-orchestrator`, `packages/ai-agent-sdk`.

#### [NEW] [packages/db/lib/migrations/20260821_engine_memory_and_workflows.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/db/lib/migrations/20260821_engine_memory_and_workflows.ts)
- Migration definitions and schema validations for:
  - `engine_memory`: Vector/episodic memory entries with tags, importance scores, and TTL.
  - `engine_memory_audit`: Immutable write and access audit log.
  - `ai_workflow_results`: Execution records for orchestrated multi-agent runs.
  - `propertyfinder_sync`: Checkpoints, delta cursors, and sync status for PropertyFinder ingestion.

#### [MODIFY] [firestore.rules](file:///h:/last/Main/SE-Vercel-deploy-main/firestore.rules)
- Add rules securing `engine_memory`, `engine_memory_audit`, `ai_workflow_results`, and `propertyfinder_sync`.

#### [MODIFY] [firestore.indexes.json](file:///h:/last/Main/SE-Vercel-deploy-main/firestore.indexes.json)
- Add composite indexes for querying workflow states, sync records, and memory timestamps.

---

### 3. Pub/Sub Wiring & PropertyFinder Sync

#### [NEW] [packages/shared/src/messaging/pubsub.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/shared/src/messaging/pubsub.ts)
- Implement `ai.recommendations` topic publisher/subscriber with Redis and in-memory dev fallbacks.

#### [MODIFY] [packages/property-finder-api/src/index.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/property-finder-api/src/index.ts)
- Add structured sync connector with pagination, backoff, and schema transformation.

#### [NEW] [scripts/sync-propertyfinder.ts](file:///h:/last/Main/SE-Vercel-deploy-main/scripts/sync-propertyfinder.ts)
- Operational script to execute PropertyFinder synchronization.

---

### 4. Admin UI Scaffolds

Scaffold 11 rich, responsive, and bilingual-ready admin views:
- [NEW] [apps/sierra-estates-realty/app/admin/views/DashboardView.tsx](file:///h:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/app/admin/views/DashboardView.tsx)
- [NEW] [apps/sierra-estates-realty/app/admin/views/HealthView.tsx](file:///h:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/app/admin/views/HealthView.tsx)
- [NEW] [apps/sierra-estates-realty/app/admin/views/SecurityView.tsx](file:///h:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/app/admin/views/SecurityView.tsx)
- [NEW] [apps/sierra-estates-realty/app/admin/views/MonitoringView.tsx](file:///h:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/app/admin/views/MonitoringView.tsx)
- [NEW] [apps/sierra-estates-realty/app/admin/views/RecommendationsView.tsx](file:///h:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/app/admin/views/RecommendationsView.tsx)
- [NEW] [apps/sierra-estates-realty/app/admin/views/AlertsView.tsx](file:///h:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/app/admin/views/AlertsView.tsx)
- [NEW] [apps/sierra-estates-realty/app/admin/views/ListingsView.tsx](file:///h:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/app/admin/views/ListingsView.tsx)
- [NEW] [apps/sierra-estates-realty/app/admin/views/AgentsView.tsx](file:///h:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/app/admin/views/AgentsView.tsx)
- [NEW] [apps/sierra-estates-realty/app/admin/views/RoleManagerView.tsx](file:///h:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/app/admin/views/RoleManagerView.tsx)
- [NEW] [apps/sierra-estates-realty/app/admin/views/DeepInsightsView.tsx](file:///h:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/app/admin/views/DeepInsightsView.tsx)
- [NEW] [apps/sierra-estates-realty/app/admin/views/ReportsView.tsx](file:///h:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/app/admin/views/ReportsView.tsx)
- [MODIFY] [apps/sierra-estates-realty/app/admin/AdminPortal.tsx](file:///h:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/app/admin/AdminPortal.tsx) - Wire view selector and navigation items.

---

### 5. Documentation, Operational Scripts & Health API

#### [NEW] [docs/roles.md](file:///h:/last/Main/SE-Vercel-deploy-main/docs/roles.md)
- Complete RBAC model, permissions matrix, and role assignment guide.

#### [NEW] [scripts/run-harness.ts](file:///h:/last/Main/SE-Vercel-deploy-main/scripts/run-harness.ts)
#### [NEW] [scripts/publish-recommendation.ts](file:///h:/last/Main/SE-Vercel-deploy-main/scripts/publish-recommendation.ts)
#### [NEW] [scripts/write-memory.ts](file:///h:/last/Main/SE-Vercel-deploy-main/scripts/write-memory.ts)
#### [NEW] [scripts/check-thresholds.ts](file:///h:/last/Main/SE-Vercel-deploy-main/scripts/check-thresholds.ts)
#### [MODIFY] [package.json](file:///h:/last/Main/SE-Vercel-deploy-main/package.json)
- Add npm scripts: `run-harness`, `publish-recommendation`, `write-memory`, `check-thresholds`, `sync-propertyfinder`.

#### [NEW] [apps/sierra-estates-realty/app/api/health/route.ts](file:///h:/last/Main/SE-Vercel-deploy-main/apps/sierra-estates-realty/app/api/health/route.ts)
- Multi-component health check endpoint.

---

### 6. CI Workflows, Sentry Hooks & Deployment Templates

#### [NEW] [.github/workflows/harness-eval.yml](file:///h:/last/Main/SE-Vercel-deploy-main/.github/workflows/harness-eval.yml)
#### [NEW] [.github/workflows/nightly.yml](file:///h:/last/Main/SE-Vercel-deploy-main/.github/workflows/nightly.yml)
#### [NEW] [packages/shared/src/sentry.ts](file:///h:/last/Main/SE-Vercel-deploy-main/packages/shared/src/sentry.ts)
#### [NEW] [infra/templates/docker-compose.orchestrator.yml](file:///h:/last/Main/SE-Vercel-deploy-main/infra/templates/docker-compose.orchestrator.yml)
#### [NEW] [infra/templates/cloudrun-service.yaml](file:///h:/last/Main/SE-Vercel-deploy-main/infra/templates/cloudrun-service.yaml)
#### [NEW] [infra/templates/k8s-orchestrator.yaml](file:///h:/last/Main/SE-Vercel-deploy-main/infra/templates/k8s-orchestrator.yaml)

---

### 7. Branch & Git Commit

- Create branch `harness-coordinator-full`:
  ```bash
  git checkout -b harness-coordinator-full
  git add .
  git commit -m "feat(ai-orchestrator): scaffold deepseek harness, orchestrator, sdk, firestore schemas, admin views, and ops scripts"
  ```

---

## Verification Plan

### Automated Tests
1. Verify package structure and workspace compilation:
   ```bash
   pnpm run type-check
   ```
2. Run harness verification script:
   ```bash
   npx tsx scripts/run-harness.ts
   ```
3. Run memory writer test:
   ```bash
   npx tsx scripts/write-memory.ts
   ```
4. Run threshold checker:
   ```bash
   npx tsx scripts/check-thresholds.ts
   ```
5. Run PubSub recommendation test:
   ```bash
   npx tsx scripts/publish-recommendation.ts
   ```

### Manual Verification
1. Inspect git status on `harness-coordinator-full` branch.
2. Verify all files and export links.
