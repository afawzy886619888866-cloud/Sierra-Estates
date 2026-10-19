# Sierra Estates · Antigravity Skills & Plugins Registry

This registry provides the canonical catalog of all AI agent skills, plugins, and MCP servers configured across the Sierra Estates development environment.

---

## 1. Workspace Skills (`.agents/skills/`)

These skills are project-specific, version-controlled in Git, and hold **Priority 1 (Highest Precedence)** in Antigravity's progressive disclosure hierarchy.

### 🏢 Real Estate Intelligence & Deal Closing

- **`sierra-closer-agent`**: Stage-9 Closer Bot & high-value deal negotiation. Executes 5-stage closing workflows, post-viewing feedback, due diligence, and Arabic/English negotiation.
- **`concierge-lead-agent`**: WhatsApp & Telegram lead concierge for Sierra Estates client communication, lead scoring, and automated inquiry handling.
- **`whatsapp-inventory-harvester`**: Scraper and NLP extraction for real estate WhatsApp groups. Normalizes Arabic/English listings, classifies direct owners vs brokers, and deduplicates records.
- **`real-estate-valuation-analyzer`**: Evaluates rental and resale listings into financial decisions (Underpriced, Fair Value, Overpriced) via Cap Rates, payback periods, and pricing arbitrage.
- **`ecc-memory-engine`**: Episodic Context Cache (ECC) & Entity Graph Memory Engine tracking multi-turn buyer/owner episodes, historical price drops, and entity relations.
- **`excel-archive-processor`**: Unpacks, inspects, and extracts property listings from Excel spreadsheets (`.xlsx`, `.xls`, `.csv`) and compressed archives (`.zip`, `.rar`, `.7z`).
- **`inventory-csv-merger`**: Merges new owner/broker listings into the master inventory database, deduplicating by phone, compound, and deal type.
- **`vertex-omni-agent`**: Vertex AI and Gemini multimodal reasoning agent for property analysis, multi-agent coordination, and architectural appraisal.
- **`openclaw-architect`**: Autonomous task execution and architectural agent for codebase analysis and background worker tasks.

### 🎨 Design & Frontend Engineering (Anti-Slop)

- **`ui-ux-pro-max`**: Multi-domain design intelligence (79 styles, 192 product palettes, 74 font pairings, 119 UX guidelines, and interactive micro-interactions).
- **`impeccable`**: Elite frontend UI/UX refinement, micro-interactions, layout polish, accessible contrast, and visual hierarchy.
- **`design-taste-frontend` (`taste-skill`)**: Anti-slop frontend engineering, brief inference, and anti-default design architecture.
- **`high-end-visual-design` (`soft-skill`)**: Luxury real estate agency aesthetics, calm typography, generous whitespace, and restrained card structures.
- **`stitch-design-taste`**: Google Stitch MCP integration for generative screens, variant testing, and `DESIGN.md` synthesis.
- **`minimalist-ui`**: Clean editorial-style interfaces, warm monochrome palettes, and typographic contrast.
- **`industrial-brutalist-ui`**: Bold architectural grids, Swiss typographic print, and utilitarian layouts.
- **`gpt-taste`**: Advanced GSAP motion engineering, scroll triggers, and wide editorial typography.

### ⚙️ Code Quality & Deployment Ops

- **`code-reviewer`**: Modern AI-powered code reviewer ensuring idiomatic TypeScript, security boundaries, and regression safety.
- **`clean-code`**: Clean code principles: SOLID, DRY, naming conventions, and refactoring patterns.
- **`karpathy-guidelines`**: Andrej Karpathy operational guidelines — disciplined analysis, surgical edits, and goal-driven verification.
- **`database-design`**: PostgreSQL schema design, indexing strategies, relationships, and serverless database optimization.
- **`supabase`**: Official Supabase agent skill for products (Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues, SSR client integrations, and CLI/MCP).
- **`supabase-postgres-best-practices`**: Official Postgres best practices maintained by Supabase (schema design, indexing, RLS security, EXPLAIN analysis, migrations, and pgvector).
- **`nextjs-supabase-auth`**: Session management, middleware security gates, protected routes, and Row Level Security (RLS) policies.
- **`sierra-deployment-ops`**: Deployment and infrastructure management for Vercel, Supabase PostgreSQL / pgvector schemas, and Cloud Storage.
- **`full-output-enforcement` (`output-skill`)**: Enforces complete, unabridged code generation and bans placeholder patterns.
- **`notebookllm-agent`**: Grounded New Cairo real estate information bank, intelligent unit recommendation, and briefing generation.
- **`openai-agents`**: OpenAI Agents SDK integration for Sierra Estates multi-agent workflows, handoffs, and guardrails.
- **`sierra-listing-pipeline-agent`**: Autonomous end-to-end listing agent; extracts unit specs from WhatsApp, enforces price rules, and publishes to Property Finder.
- **`sierra-map-agent`**: GIS boundary verification, compound-to-inventory mapping, and automated WhatsApp media harvesting.
- **`real-estate-excel-processor`**: End-to-end listing ingestion, bilingual column normalization, deduplication, and Excel workbook regeneration.
- **`image-to-code-skill`**: Screenshot-to-code conversion for UI replication and design-system alignment.
- **`SE-Vercel-deploy-main`**: Project conventions, TypeScript patterns, and conventional commits reference for this monorepo.

### ⚡ Addy Osmani Engineering Skills (`addyosmani/agent-skills`)

- **`performance-optimization`**: Core Web Vitals (LCP, INP, CLS), Next.js bundle splitting, image optimization, dynamic imports, and memory profiling.
- **`code-simplification`**: Anti-slop engineering, clarity over cleverness, reducing cyclomatic complexity, and eliminating dead abstraction layers.
- **`browser-testing-with-devtools`**: Automated verification and layout debugging via Chrome DevTools MCP.
- **`spec-driven-development`**: Defining rigorous API contracts, type models, and acceptance criteria prior to implementation.
- **`constraint-driven-development`**: Enforcing architectural invariants, boundary validation, and defensive programming against data corruption.
- **`doubt-driven-development`**: Adversarial self-critique, auditing assumptions, and eliminating silent errors before merge.
- **`context-engineering`**: Session context budgeting, structured handoffs, and prevention of long-session drift.
- **`interview-me`**: Structured interactive requirements elicitation when specs or user requests are ambiguous.
- **`security-and-hardening`**: Defense-in-depth, input sanitization, token handling, SSRF/CSRF/SQLi prevention, and App Check security.
- **`debugging-and-error-recovery`**: Systematic root-cause debugging, error isolation, and bisection workflows.
- **`test-driven-development`**: Strict red-green-refactor loop enforcement for mission-critical real estate pipelines.
- **`shipping-and-launch`**: Pre-launch checklists, staged rollout strategies, and rollback verification.
- **`git-workflow-and-versioning`**: Atomic commit structuring, branch management, and semantic release hygiene.

### 🛠️ Curated Full-Stack & AI Skills (`wshobson/agents`)

- **`nextjs-app-router-patterns`**: Next.js 15+ App Router, Server Components streaming, parallel routes, and cache management.
- **`react-state-management`**: Modern React state architectures with Zustand, React Query, and Jotai.
- **`typescript-advanced-types`**: Advanced TypeScript type gymnastics, conditional types, mapped types, and branded validation.
- **`nodejs-backend-patterns`**: Scalable Node.js backend patterns, middleware pipelines, and error handling.
- **`auth-implementation-patterns`**: JWT, OAuth2, session management, and RBAC security.
- **`e2e-testing-patterns`**: Playwright and Cypress test automation and visual regression testing.
- **`error-handling-patterns`**: Resilient Result types, error propagation, and graceful degradation.
- **`sql-optimization-patterns`**: PostgreSQL query optimization, EXPLAIN analysis, and index tuning.
- **`postgresql-table-design`**: Relational database modeling, foreign key constraints, and indexing architecture.
- **`rag-implementation`**: Retrieval-Augmented Generation architectures with vector stores and semantic search.
- **`hybrid-search-implementation`**: Combining dense vector embeddings with BM25 keyword search.
- **`vector-index-tuning`**: HNSW parameter tuning, recall optimization, and vector search latency reduction.
- **`session-guard`**: Context corruption and amnesia prevention for long-running agent workflows.
- **`ai-debt-detector`**: Automated audit for AI-generated code smells, brittle logic, and swallowed errors.
- **`visual-edit-precision`**: Precise DOM and visual coordinate alignment for UI/frontend components.
- **`async-python-patterns`**: Python asyncio, task concurrency, and non-blocking I/O patterns.
- **`python-resilience`**: Exponential backoff, fault-tolerant decorators, and circuit breaker patterns.

### 🧠 Prompt Engineering & Architecture (`asgeirtj/system_prompts_leaks`)

- **`prompt-engineering-mastery`**: Elite prompt engineering, reasoning architecture, and agent alignment distilled from frontier system prompts (Google Antigravity, Claude Code, Cursor, OpenAI Deep Research).
- **Curated Prompt Reference Library (`docs/reference/system-prompts/`)**: Canonical reference collection preserving Google Antigravity CLI, NotebookLM, Claude Code, Claude Design, Cursor, and OpenAI Deep Research system specifications.

---

## 2. Removed Skills (Historical Reference)

The following skills were removed because they had **zero references** in the codebase or were **empty stubs** with no SKILL.md content:

| Skill | Reason Removed |
|---|---|
| `lookml-diagnostics` | LookML/Looker BI tool — irrelevant to this real estate PropTech stack |
| `lookml-liquid-guidelines` | LookML/Looker BI tool — irrelevant to this real estate PropTech stack |
| `lookml-modeling-guidelines` | LookML/Looker BI tool — irrelevant to this real estate PropTech stack |
| `lookml-pdt-guidelines` | LookML/Looker BI tool — irrelevant to this real estate PropTech stack |
| `lookml-pop-guidelines` | LookML/Looker BI tool — irrelevant to this real estate PropTech stack |
| `debugging-strategies` | Empty stub (0-byte SKILL.md) |
| `nextjs-best-practices` | Empty stub (0-byte SKILL.md) — superseded by `SE-Vercel-deploy-main` conventions |
| `performance-optimizer` | Empty stub (0-byte SKILL.md) |
| `security-audit` | Empty stub (0-byte SKILL.md) |

---

## 3. Google Cloud Developer Plugin (Uninstalled)

*Status: Uninstalled via `agy plugin uninstall google-cloud-developer`.*

Previously provided the following 5 catalog/CLI skills:

- **`finding-google-skills`**: Dynamic discovery of remote Google Cloud skills.
- **`gcloud`**: CLI safety guardrails and syntax validation.
- **`google-cloud-recipe-auth`**: ADC and service account patterns.
- **`google-cloud-recipe-onboarding`**: Initial project onboarding guides.
- **`retrieving-developer-knowledge`**: Official Google developer doc retrieval via MCP.

---

## 4. Global Data & ML Skills (`~/.gemini/config/skills/`)

- **BigQuery Ecosystem**: `bigquery-sql`, `bigquery-ai-ml`, `bigquery-graph`, `bigquery-bigframes`, `bigquery-data-transfer-service`, `dataform-bigquery`, `dbt-bigquery`.
- **Cloud Pipelines & Spark**: `gcp-data-pipelines`, `gcp-dataflow`, `gcp-spark`, `gcp-composer-troubleshooting`, `gcp-managed-airflow-dag-authoring`, `gcp-pipeline-orchestration`.
- **Storage & Security**: `google-cloud-storage-basics`, `google-cloud-storage-bucket-architect`, `google-cloud-storage-fuse`, `gcs-security-assessment`, `accidental-data-loss-prevention`.
- **Data Applications & ML**: `building-data-apps`, `data-autocleaning`, `discovering-gcp-data-assets`, `ml-best-practices`, `notebook-guidance`, `managing-python-dependencies`, `schema-mapping`.

---

## 5. Built-in Antigravity Skills

Located in `~/.gemini/antigravity-ide/builtin/skills/`:

- **`agy-customizations`**: Complete guide to the Antigravity customization engine (priority hierarchy, progressive disclosure, discovery).
- **`antigravity-guide`**: Comprehensive reference and sitemap for Google Antigravity CLI, IDE, and subagent orchestration.

---

## 6. Active MCP Tool Servers (`agy mcp list`)

| Server Name | Transport | Purpose |
| :--- | :--- | :--- |
| **`supabase`** | HTTP | Supabase PostgreSQL, Auth, pgvector, Realtime, and Media Storage |
| **`stitch`** | HTTP | Google Stitch Generative UI Design and Variant Synthesis |
| **`atlassian-mcp-server`** | stdio | Jira Issue Tracking and Confluence Documentation |
| **`developer-knowledge`** | HTTP | Real-time Official Google Developer Documentation |
| **`data-agent-kit`** | stdio | BigQuery and GCP Data Asset Discovery |
| **`notebooks`** | stdio | Jupyter Notebook Cell Execution and State Management |
| **`visualization`** | stdio | Interactive Chart and Diagram Rendering |
| **`ruflo`** | stdio | Swarm Coordination, Cognitive Memory, and Agentic Workflow Pipelines |

---

## 7. Antigravity Skill Loading Hierarchy

When answering queries or executing tools, Antigravity resolves customizations in strict order:

1. **Workspace Project (`.agents/skills/`, `GEMINI.md`, `AGENTS.md`)** *(Overrides all others)*
2. **Explicit Workspace Declarations (`plugins.json`, `skills.json`)**
3. **Global Plugins & Customizations (`~/.gemini/config/plugins/`, `~/.gemini/config/skills/`)**
4. **Built-in Application Skills (`builtin/skills/`)**
5. **Global Declared Defaults**
