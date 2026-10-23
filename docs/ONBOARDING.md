# Sierra Estates — Developer Onboarding

Quick start for anyone joining the monorepo.

## 1. Prerequisites

- Node.js ≥ 20 (recommended 22+)
- pnpm 9.x (`corepack enable && corepack prepare pnpm@9.15.4 --activate`)
- Access to the Supabase project + Vercel project

## 2. Clone & Install

```bash
git clone https://github.com/afawzy886619888866-cloud/Sierra-Estates.git
cd Sierra-Estates
pnpm install
```

## 3. Environment

```bash
cp .env.example .env.local
```

Fill the required keys (never commit real secrets):

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `MEMORY_PERSISTENCE=database`  ← **required** for the Learning System to work

See `.env.example` for the full list.

## 4. Run Locally

```bash
# Client + Admin (dual-domain)
pnpm dev:web

# Full monorepo (if needed)
pnpm dev
```

- Public site → http://localhost:3000
- Admin → http://localhost:3000 (host-aware routing)

## 5. Key Packages You Will Touch

| Package | Purpose |
|---------|---------|
| `apps/sierra-estates-realty` | Next.js 16 dual-domain app |
| `packages/memory-engine` | Unified memory + Learning System + RAG Brain |
| `packages/db` | Typed Supabase client & policies |
| `packages/agents*` | Multi-agent fleet |
| `packages/ui` | Shared luxury UI components |

## 6. Memory Engine in 30 seconds

```ts
import { memoryEngine, memoryBrain, chooseSkills } from '@sierra-estates/memory-engine'

// Get context for an agent
const ctx = memoryEngine.getContext('hermes')

// RAG over Obsidian vault + ECC
const directive = memoryBrain.queryBrainRAG(userMessage, { entityId })

// Choose best skills based on real history
const skills = chooseSkills(
  memoryEngine.getApplicableSkills(ctx),
  await memoryEngine.getExecutions({ agentId: 'hermes' })
)

// Always log after execution (this is how the system learns)
memoryEngine.logExecution({
  agentId: 'hermes',
  action: 'qualify-lead',
  success: true,
  skillsUsed: skills.map(s => s.id),
  timestamp: new Date()
})
```

## 7. Validation Before Every PR

```bash
pnpm lint
pnpm type-check
pnpm test:ci
pnpm deploy:check
```

## 8. Important Rules

1. **Supabase is the only source of truth** — never write new Firebase paths.
2. Long-running work belongs in workers / `apps/api` / n8n, never inside a Next.js request.
3. Service-role keys stay server-side only.
4. Keep the Learning System fed: always call `logExecution` after agent actions.

## 9. Where to Read Next

- `ARCHITECTURE.md` — runtime boundaries
- `DEPLOYMENT.md` — how production is shipped
- `packages/memory-engine/MEMORY-ENGINE.md` — full memory architecture
- `SECURITY.md` — current security posture
- `CONTRIBUTING.md` — PR & commit conventions

Welcome aboard.
