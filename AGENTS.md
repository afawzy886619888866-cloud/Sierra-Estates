# Sierra Estates Multi-Agent System (AGENTS.md)

Welcome to the Sierra Estates Multi-Agent workspace. This file defines the roster of intelligent agents, their designated boundaries, token handling rules, and task execution commands.

---

## Agent Roster

| Agent Name | Scope & Entry Point | Primary Tasks | Tokens & Keys Used |
| :--- | :--- | :--- | :--- |
| **OpenClaw Architect** | `packages/agents/openclaw.ts`, `scripts/openclaw-task-runner.ts` | Codebase architecture, plan creation, automated tasks, shared memory retrieval | `GOOGLE_AI_API_KEY`, `GOOGLE_GENAI_API_KEY`, `ANTIGRAVITY_API_KEY` |
| **Vertex Omni Agent** | `packages/agents-core/`, `apps/agents/vertex-omni-agent/` | Multi-modal real estate intelligence, property valuation scoring, vector search | Google Application Default Credentials (ADC), `GOOGLE_CLOUD_LOCATION` |
| **Concierge & Outreach Agent** | `apps/agents/whatsapp-bot/`, `packages/whatsapp-agent/` | Inbound WhatsApp & Telegram webhooks, lead scoring, live routing | `WHATSAPP_API_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TWILIO_AUTH_TOKEN` |
| **Sierra Deployment Ops** | `scripts/deploy/`, `vercel.json`, `firebase.json` | Vercel Edge/Serverless deployments, Firebase security rules and storage rules | `VERCEL_TOKEN`, `FIREBASE_SERVICE_ACCOUNT_JSON` |

---

## Token & Credential Usage Rules

1. **Environment Tokens Priority**:
   - Always read keys from local `.env.local` or environment variables.
   - For Gemini/Vertex calls, resolve in order: `GOOGLE_GENAI_API_KEY` -> `GOOGLE_AI_API_KEY` -> `NEXT_PUBLIC_GEMINI_API_KEY`.
2. **Memory Persistence**:
   - OpenClaw and Vertex agents automatically read and write execution context to `obsidian-store.json` using the `@sierra-estates/obsidian` package.
3. **Safety Limits**:
   - Automated agents are constrained from modifying `.env.local`, secret keys, or pushing directly to production branches without review.

---

## Running Tasks with OpenClaw

To execute automated tasks via OpenClaw from within this workspace:

```bash
pnpm openclaw:task "Your task prompt here"
```

Or with custom flags:

```bash
pnpm openclaw:task --prompt "Analyze new listings in New Cairo" --agent openclaw
```
