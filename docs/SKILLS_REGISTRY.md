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
- **`database-design`**: PostgreSQL schema design, indexing strategies, relationships, and serverless database optimization.
- **`nextjs-supabase-auth`**: Session management, middleware security gates, protected routes, and Row Level Security (RLS) policies.
- **`sierra-deployment-ops`**: Deployment and infrastructure management for Vercel, Supabase PostgreSQL / pgvector schemas, and Cloud Storage.
- **`full-output-enforcement` (`output-skill`)**: Enforces complete, unabridged code generation and bans placeholder patterns.

---

## 2. Google Cloud Developer Plugin (Uninstalled)

*Status: Uninstalled via `agy plugin uninstall google-cloud-developer`.*

Previously provided the following 5 catalog/CLI skills:
- **`finding-google-skills`**: Dynamic discovery of remote Google Cloud skills.
- **`gcloud`**: CLI safety guardrails and syntax validation.
- **`google-cloud-recipe-auth`**: ADC and service account patterns.
- **`google-cloud-recipe-onboarding`**: Initial project onboarding guides.
- **`retrieving-developer-knowledge`**: Official Google developer doc retrieval via MCP.

---

## 3. Global Data & ML Skills (`~/.gemini/config/skills/`)

- **BigQuery Ecosystem**: `bigquery-sql`, `bigquery-ai-ml`, `bigquery-graph`, `bigquery-bigframes`, `bigquery-data-transfer-service`, `dataform-bigquery`, `dbt-bigquery`.
- **Cloud Pipelines & Spark**: `gcp-data-pipelines`, `gcp-dataflow`, `gcp-spark`, `gcp-composer-troubleshooting`, `gcp-managed-airflow-dag-authoring`, `gcp-pipeline-orchestration`.
- **Storage & Security**: `google-cloud-storage-basics`, `google-cloud-storage-bucket-architect`, `google-cloud-storage-fuse`, `gcs-security-assessment`, `accidental-data-loss-prevention`.
- **Data Applications & ML**: `building-data-apps`, `data-autocleaning`, `discovering-gcp-data-assets`, `ml-best-practices`, `notebook-guidance`, `managing-python-dependencies`, `schema-mapping`.

---

## 4. Built-in Antigravity Skills

Located in `~/.gemini/antigravity-ide/builtin/skills/`:
- **`agy-customizations`**: Complete guide to the Antigravity customization engine (priority hierarchy, progressive disclosure, discovery).
- **`antigravity-guide`**: Comprehensive reference and sitemap for Google Antigravity CLI, IDE, and subagent orchestration.

---

## 5. Active MCP Tool Servers (`agy mcp list`)

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

## 6. Antigravity Skill Loading Hierarchy

When answering queries or executing tools, Antigravity resolves customizations in strict order:

1. **Workspace Project (`.agents/skills/`, `GEMINI.md`, `AGENTS.md`)** *(Overrides all others)*
2. **Explicit Workspace Declarations (`plugins.json`, `skills.json`)**
3. **Global Plugins & Customizations (`~/.gemini/config/plugins/`, `~/.gemini/config/skills/`)**
4. **Built-in Application Skills (`builtin/skills/`)**
5. **Global Declared Defaults**
