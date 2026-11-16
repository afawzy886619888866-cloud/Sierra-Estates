# Amazon Q — Sierra Estates Unified Project Memory Bank

> **Integration Status:** ACTIVE ⚡
> **Memory Bus:** `@sierra-estates/obsidian` (JSON-backed persistent store `obsidian-store.json`)
> **Agent Engine:** Everything Claude Code (ECC) + Amazon Q + Google Vertex AI

---

## 🧠 1. Obsidian Memory Architecture

All agents (OpenClaw, Sierra, Liela, Hermes, Closer, Vertex AI) and developer assistants (Amazon Q, Claude) share a single persistent memory interface:

- **Package:** `@sierra-estates/obsidian`
- **Class:** `ObsidianMemory` / `SharedMemoryBus`
- **File Store:** `obsidian-store.json` (root workspace)
- **Key Operations:**
  - `obsidian.set(id, value, tags)` — Store knowledge or turn history
  - `obsidian.search(query, tags)` — Semantic & keyword memory search
  - `obsidian.get(id)` — Direct ID lookup

---

## 📦 2. Memory Categories & Tags

| Category | Tags | Purpose |
|---|---|---|
| **Architecture Knowledge** | `['project-knowledge', 'architecture']` | Platform layout, domains, Next.js + Vite stack |
| **Agent Executions** | `['vertex-execution', 'openclaw', 'agent-name']` | Reasoning traces from Vertex AI and OpenClaw |
| **WhatsApp Conversations** | `['whatsapp-interaction', 'phone-<num>']` | Real-time chat history & deal qualification |
| **Shared Knowledge** | `['shared-knowledge', '<topic>']` | Cross-agent findings and broker insights |

---

## 🔗 3. Amazon Q Integration Protocol

Amazon Q must operate as a synchronized developer assistant adhering to the following rules:

1. **Memory Synchronization:** Read `obsidian-store.json` for persistent project state and architectural context before recommending changes.
2. **ECC Skill Alignment:** Utilize skills from `.agent/skills/` and `.agents/skills/` for testing, code review, and refactoring tasks.
3. **Strict Client Guardrails:** Never modify client-facing routes under `apps/sierra-estates-realty/app/(client)/` without explicit user permission.
4. **Vercel GitHub Actions Policy:** Orchestrate deployments exclusively through `.github/workflows/deploy-vercel.yml` (native Vercel GitHub integration must remain disabled).
