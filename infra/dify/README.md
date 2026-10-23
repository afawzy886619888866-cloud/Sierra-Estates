# Sierra Estates & Dify Autonomous Agent Engine

This deployment infrastructure bridges **[Dify](https://github.com/langgenius/dify)** with the Sierra Estates autonomous agent ecosystem:

- **`@sierra-estates/ai-orchestrator`**: Coordinates event-driven pipelines.
- **`@sierra-estates/memory-engine`**: Episodic Context Cache (ECC) and Obsidian vector memory.
- **`@sierra-estates/deepseek-harness`**: DeepSeek evaluation, reasoning, and benchmark runner.
- **Supabase PostgreSQL**: Sole authoritative persistent store.

---

## 1. Quick Start / Deployment

### Prerequisites

- Docker & Docker Compose v2+
- Git

### Launching the Dify Cluster

```bash
cd infra/dify
cp .env.dify.example .env
docker compose -f docker-compose.dify.yml up -d
```

### Access Points

- **Dify Console**: `http://localhost:3001`
- **Dify API**: `http://localhost:5001`
- **Sierra Agent Bridge**: Interacts internally over `sierra-dify-net`

---

## 2. Integrated Agent Roles

| Persona            | Role                | Responsibility                                             | Memory Hook                  |
| ------------------ | ------------------- | ---------------------------------------------------------- | ---------------------------- |
| **The Scribe**     | NLP Extraction      | WhatsApp, Telegram, and portal chat parsing                | Raw message audit            |
| **The Curator**    | Asset Normalization | Deduplication, AVM benchmarking, compound mapping          | Historical price cache       |
| **The Matchmaker** | Buyer Alignment     | Vector similarity search, budget & preference matching     | Buyer persona embeddings     |
| **The Closer**     | Negotiation Engine  | Stage-9 deal closing, viewing schedule, objection handling | Multi-turn negotiation cache |
| **The Evaluator**  | DeepSeek Harness    | Self-improving evaluation, benchmark scoring, guardrails   | Benchmark metrics registry   |

---

## 3. Waking Up the Engine

Run the unified team runner:

```bash
pnpm tsx scripts/wakeup-unified-engine.ts
```
