# Amazonl Q — Everything Claude Code (ECC) & Obsidian Skills Integration

> **ECC Version:** 2.0.0
> **Skills Engine:** `.agent/skills/`, `.agents/skills/`, `@sierra-estates/obsidian`

---

## 🛡️ 1. Core Principles & Governance

1. **Immutability First:** Always create new objects/records; never mutate existing ones.
2. **Security First:** Validate all inputs at system boundaries. Secrets must remain in `.env` / environment variables only.
3. **Feature Branching Strategy:**
   - Client Portal: `feature/client-page`
   - Admin Dashboard: `feature/admin-page`
   - Agents & Bots: `feature/agents-and-bots`
   - Workflows & Automation: `feature/workflow`
4. **Testing & Verification:** Run `pnpm --filter sierra-estates-client-page build` and workspace test suites before marking tasks complete.

---

## ⚡ 2. Obsidian & ECC Unified Skill Matrix

Amazon Q and AI agents consume skills from the unified skill matrix:

- **Auto-Test Runner:** `.agents/skills/auto-test-runner/SKILL.md` — Runs workspace builds & tests automatically.
- **Obsidian Memory Skill:** `@sierra-estates/obsidian` — File-backed persistent long-term memory.
- **Agent Backend Patterns:** `.agent/skills/agent-backend-patterns/SKILL.md` — API design, Firestore, and microservice rules.
- **Modern Web Architect:** `.agent/skills/modern-web-architect/SKILL.md` — Next.js 16 App Router & Vite performance standards.
- **UI/UX Pro Max:** `.agent/skills/ui-ux-pro-max/SKILL.md` — Premium OLED Dark & Clay Light themes styling rules.
