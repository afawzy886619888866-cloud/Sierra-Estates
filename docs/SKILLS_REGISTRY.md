# Sierra Estates · Antigravity Skills & Plugins Registry

This registry provides the canonical catalog of all active AI agent skills, plugins, and MCP servers configured across the Sierra Estates development environment, mapped directly to the **4-Engine Autonomous Machine**.

---

## 1. Unified 4-Engine Skills Topology (`.agents/skills/`)

These 31 core skills are version-controlled in Git, held at **Priority 1 (Highest Precedence)**, and structured to power the self-learning, adaptive real estate engine.

### 🧠 Engine 1 · Memory Engine (Learning, Intent & Context)
*Tracks multi-turn buyer/owner episodes, learns shifting customer preferences, and maintains persistent CRM state.*

- **`ecc-memory-engine`**: Episodic Context Cache (ECC) & Entity Graph Memory Engine tracking multi-turn buyer/owner episodes, historical price drops, and entity relations.
- **`context-engineering`**: Session context budgeting, structured handoffs, and prevention of long-session drift.
- **`openai-agents`**: OpenAI Agents SDK integration for Sierra Estates multi-agent workflows, handoffs, and guardrails connected to Supabase.
- **`database-design`**: PostgreSQL schema design, indexing strategies, relationships, and serverless database optimization.
- **`supabase`**: Official Supabase agent skill for Database, Auth, Edge Functions, Realtime, Storage, Vectors, and CLI/MCP.
- **`supabase-postgres-best-practices`**: Official Postgres best practices maintained by Supabase (indexing, RLS security, EXPLAIN analysis, and pgvector).

### 🗺️ Engine 2 · RAG & GIS Map Engine (Inventory & Media Discovery)
*Matches buyer criteria against 20,281 listings across New Cairo compounds, spatial GIS coordinates, and verified media.*

- **`sierra-map-agent`**: GIS boundary verification, compound-to-inventory mapping, and automated WhatsApp media harvesting.
- **`rag-implementation`**: Retrieval-Augmented Generation architectures with vector stores and semantic search.
- **`whatsapp-inventory-harvester`**: Scraper and NLP extraction for real estate WhatsApp groups. Normalizes Arabic/English listings and deduplicates records.
- **`real-estate-excel-processor`**: End-to-end listing ingestion, bilingual column normalization, deduplication, and Excel workbook regeneration.

### ⚖️ Engine 3 · Evaluation & Reasoning Harness (Valuation, Arabic NLU & Quality Gates)
*Evaluates market prices with Cairo AVM, ensures mathematical accuracy, and validates code/data safety.*

- **`real-estate-valuation-analyzer`**: Evaluates rental and resale listings into financial decisions (Underpriced, Fair Value, Overpriced) via Cap Rates and pricing arbitrage.
- **`vertex-omni-agent`**: Vertex AI and Gemini multimodal reasoning agent for property analysis, multi-agent coordination, and architectural appraisal.
- **`notebookllm-agent`**: Grounded New Cairo real estate information bank, intelligent unit recommendation, and briefing generation.
- **`karpathy-guidelines`**: Andrej Karpathy operational guidelines — disciplined analysis, surgical edits, and goal-driven verification.
- **`security-reviewer`**: Security vulnerability detection and remediation specialist for Sierra Estates.
- **`code-reviewer`**: Modern AI-powered code reviewer ensuring idiomatic TypeScript, security boundaries, and regression safety.
- **`clean-code`**: Clean code principles: SOLID, DRY, naming conventions, and refactoring patterns.
- **`code-review-and-quality`**: Multi-dimensional code quality, maintainability, and regression prevention.

### ⚙️ Engine 4 · Workflows, Closer & Experience Engine (Speed, Action & UI/UX)
*Executes automated outreach, negotiates deals via closer bot, and delivers high-polish, ultra-fast client UX.*

- **`sierra-closer-agent`**: Stage-9 Closer Bot & high-value deal negotiation. Executes 5-stage closing workflows, post-viewing feedback, due diligence, and Arabic/English negotiation.
- **`openclaw-architect`**: Autonomous task execution and architectural agent for codebase analysis and background worker tasks.
- **`nodejs-backend-patterns`**: Scalable Node.js backend patterns, middleware pipelines, and error handling.
- **`ci-cd-and-automation`**: Modern CI/CD pipelines, automated testing gates, and deployment reliability.
- **`ui-ux-pro-max`**: Multi-domain design intelligence (79 styles, 192 product palettes, 74 font pairings, 119 UX guidelines, and interactive micro-interactions).
- **`impeccable`**: Elite frontend UI/UX refinement, micro-interactions, layout polish, accessible contrast, and visual hierarchy.
- **`taste-skill` (`design-taste-frontend`)**: Anti-slop frontend engineering, brief inference, and anti-default design architecture.
- **`gpt-tasteskill`**: Advanced GSAP motion engineering, scroll triggers, and wide editorial typography.
- **`stitch-design-taste`**: Google Stitch MCP integration for generative screens, variant testing, and `DESIGN.md` synthesis.
- **`tailwind-patterns`**: Tailwind CSS principles, container queries, modern patterns, and design token architecture.
- **`react-state-management`**: Modern React state architectures with Zustand, React Query, and Jotai.
- **`vercel-react-view-transitions`**: Fluid view transitions and seamless page-state choreography.
- **`using-agent-skills`**: Meta-skill for agent skill coordination, progressive activation, and tool discovery.

---

## 2. MCD Protocol Lifecycle Commands (`.agents/skills/`)

These command skills govern deterministic phase transitions in accordance with `AGENTS.md` and `.clinerules`:

- **`evaluate`**: Run MCD EVALUATE command to research, audit architecture, and present milestone findings.
- **`contract`**: Run MCD CONTRACT command to author milestone-bound contract cards with acceptance criteria via the Command Deck API.
- **`execute`**: Run MCD EXECUTE command to implement approved milestone contract cards and verify test and type-check gates.
- **`closeout`**: Run MCD CLOSEOUT command to verify compliance, record outcomes artifacts, and finalize clean atomic commits.
- **`help`**: Provide MCD and AmphionAgent workflow help using `.amphion/control-plane/MCD_HELP_SOURCE.md`.
- **`remember`**: Capture compact operational memory checkpoints via the Command Deck API.
- **`docs`**: Derive and synchronize Project Strategy (Charter and High-Level PRD).
- **`bug`**: Create and link prioritized bug cards on the active Command Deck milestone.
- **`ingest-listings`**: Automated listing ingestion pipeline workflow.

---

## 3. Archived Skills (`.agents/skills-archive/`)

The following 65 non-core skills were safely archived to keep the active agent runtime lightweight, fast, and 100% focused on the 4-Engine Real Estate Machine:

`ai-debt-detector`, `api-and-interface-design`, `async-python-patterns`, `auth-implementation-patterns`, `browser-testing-with-devtools`, `brutalist-skill`, `code-simplification`, `comps-analysis`, `concierge-lead-agent`, `constraint-driven-development`, `dcf-model`, `debugging-and-error-recovery`, `deploy-to-vercel`, `deprecation-and-migration`, `documentation-and-adrs`, `doubt-driven-development`, `e2e-testing-patterns`, `error-handling-patterns`, `excel-archive-processor`, `excel-author`, `frontend-ui-engineering`, `git-workflow-and-versioning`, `hybrid-search-implementation`, `idea-refine`, `image-to-code-skill`, `incremental-implementation`, `interview-me`, `inventory-csv-merger`, `minimalist-skill`, `nextjs-app-router-patterns`, `nextjs-supabase-auth`, `observability-and-instrumentation`, `output-skill`, `performance-optimization`, `planning-and-task-breakdown`, `postgresql-table-design`, `pptx-author`, `prompt-engineering-mastery`, `prompt-engineering-patterns`, `python-resilience`, `redesign-skill`, `SE-Vercel-deploy-main`, `security-and-hardening`, `session-guard`, `shipping-and-launch`, `sierra-deployment-ops`, `sierra-listing-pipeline-agent`, `silent-failure-hunter`, `soft-skill`, `source-driven-development`, `spec-driven-development`, `sql-optimization-patterns`, `stride-analysis-patterns`, `test-driven-development`, `threat-mitigation-mapping`, `typescript-advanced-types`, `vector-index-tuning`, `vercel-cli-with-tokens`, `vercel-composition-patterns`, `vercel-optimize`, `vercel-react-best-practices`, `vercel-react-native-skills`, `visual-edit-precision`, `web-design-guidelines`, `writing-guidelines`.
