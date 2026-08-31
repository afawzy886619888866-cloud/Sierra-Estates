# Sierra Estates — Development Guidelines

## Code Quality Standards

### TypeScript (Primary Language — apps/, packages/)

- **Strict mode enforced** — `tsconfig.base.json` with `strict: true`; `ignoreBuildErrors: false` in next.config.ts
- **Zod for all API inputs** — every API route handler validates request body with a Zod schema before processing
- **server-only imports** — use `import 'server-only'` in files that must never reach the browser bundle
- **No `any` types** — use explicit types or `unknown` with type guards
- **Result types** — `lib/types/result.ts` provides a typed Result pattern for service layer returns

### Python (apps/api, firebase/hermes-webui)

- **Module-level constants** use `SCREAMING_SNAKE_CASE` with inline documentation comments
- **Private helpers** prefixed with `_` (e.g. `_session_field`, `_normalize_host_port`)
- **Docstrings on all public functions** — single-line for simple helpers, multi-line for complex logic
- **Type annotations** on function signatures (Python 3.10+ union syntax `X | Y`)
- **Thread safety** — shared mutable state always protected by `threading.Lock()` or `threading.RLock()`
- **Graceful fallbacks** — `try/except ImportError` with lambda stubs for optional agent dependencies

### Rust (ECC/ecc2/)

- **`anyhow::Result<T>`** for all fallible functions; `.context("...")` on every `?` propagation
- **`#[derive(Debug, Clone, Serialize)]`** on all public structs
- **`#[serde(rename_all = "snake_case")]`** on enums serialized to JSON
- **`#[allow(clippy::too_many_arguments)]`** when function signatures are intentionally wide (builder pattern)
- **Async with Tokio** — `pub async fn` for I/O-bound operations; sync for pure computation
- **`impl fmt::Display`** on status types for human-readable CLI output

### C (firmware/esp32-csi-node/)

- **File-level Doxygen** — `@file`, `@brief` with signal model equations in comments
- **`#ifdef CONFIG_*`** guards — entire mock files wrapped in Kconfig guards so they compile to nothing in production
- **Named constants** — all magic numbers extracted to `#define` with units in comments
- **Static module state** — `static` prefix on all module-level variables; no globals
- **LFSR for deterministic noise** — avoids stdlib `rand()` for embedded portability

---

## Structural Conventions

### Next.js API Routes (`app/api/`)

```typescript
// Pattern: validate → authorize → service call → respond
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = MySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  
  const result = await myService.doWork(parsed.data);
  return NextResponse.json(result);
}
```

- Business logic lives in `lib/services/` — never inline in route handlers
- Auth guard via `lib/server/auth-guard.ts` — import and call at top of protected routes
- CORS via `lib/server/cors.ts` — applied in middleware or per-route
- Rate limiting via `lib/server/rate-limit.ts` (Upstash Redis)

### Service Layer (`lib/services/`)

- One file per domain (e.g. `matching-engine.ts`, `inventory-query.ts`)
- Export named async functions — no class instances unless stateful
- Use repository pattern for Firestore: `lib/db/repository.ts` → `lib/db/repositories.ts`
- Return typed results; throw only for unrecoverable errors

### Agent Pattern (`lib/agents/`, `packages/agents/`)

- Each agent exports a single `run(input)` async function
- Agents call `ObsidianMemory` for persistent state: `obsidian.set(id, value, tags)` / `obsidian.search(query, tags)`
- Stage numbers (S1–S10) are documented in function comments
- Agent prompts live in `lib/prompts/` — never inline in agent code

### Shared Memory (`packages/obsidian/`, `packages/memory-engine/`)

```typescript
// Store knowledge
await obsidian.set('deal-123', dealData, ['whatsapp-interaction', 'phone-+201234567890']);

// Search memory
const results = await obsidian.search('New Cairo luxury', ['shared-knowledge']);
```

---

## Semantic Patterns

### Zod Schema Validation

```typescript
import { z } from 'zod';

const LeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(/^\+\d{10,15}$/),
  budget: z.number().positive().optional(),
});

type Lead = z.infer<typeof LeadSchema>;
```

### Firebase Admin (Server-only)

```typescript
import { getFirestore } from 'lib/server/firebase-admin';

const db = getFirestore();
const doc = await db.collection('leads').doc(id).get();
```

- Never import `firebase-admin` in client components — it is aliased to `false` in webpack config
- Use `lib/stubs/firebase-admin.js` for test environments

### OpenTelemetry Tracing

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('sierra-estates');
const span = tracer.startSpan('matching-engine.run');
// ... work ...
span.end();
```

- Instrumentation bootstrapped in `instrumentation.ts` (Next.js instrumentation hook)
- Arize Phoenix receives traces via OTLP exporter

### i18n (next-intl)

```typescript
// messages/en.json and messages/ar.json
import { useTranslations } from 'next-intl';
const t = useTranslations('PropertyCard');
return <h2>{t('title')}</h2>;
```

- RTL support for Arabic via `settings_label_rtl` toggle
- BCP 47 language tags (`en-US`, `ar-EG`)

### Python Route Handler Pattern (Hermes WebUI)

```python
def handle_get(handler, parsed) -> bool:
    if parsed.path == "/api/resource":
        return j(handler, {"data": result})
    return False  # 404

def handle_post(handler, parsed, body: dict) -> bool:
    if not _check_csrf(handler):
        return bad(handler, _csrf_rejection_error(handler), status=403)
    # ... process ...
    return j(handler, {"ok": True})
```

- `j(handler, payload)` — JSON response helper
- `bad(handler, message, status=400)` — error response helper
- `_check_csrf(handler)` — CSRF validation on all POST routes
- Rate limiting via `_csp_report_rate_limited` / `_client_event_rate_limited` pattern

### Rust Session Management (ECC)

```rust
// Builder pattern for session creation
pub async fn create_session(db: &StateStore, cfg: &Config, task: &str, agent_type: &str, use_worktree: bool) -> Result<String> {
    create_session_with_profile_and_grouping(db, cfg, task, agent_type, use_worktree, None, SessionGrouping::default()).await
}

// Error propagation with context
let session = resolve_session(db, id)
    .context("Failed to resolve session for assignment")?;
```

- Public API functions delegate to internal `_with_runner_program` variants for testability
- `StateStore` is the single database abstraction — never raw SQL in business logic
- `SessionGrouping { project, task_group }` carries organizational metadata through the call chain

### C Signal Generation (ESP32 Firmware)

```c
// Scenario-based dispatch pattern
switch (active_scenario) {
    case MOCK_SCENARIO_EMPTY:       gen_empty(iq_buf, &channel, &rssi); break;
    case MOCK_SCENARIO_STATIC_PERSON: gen_static_person(iq_buf, &channel, &rssi); break;
    // ...
}
// Inject into pipeline
edge_enqueue_csi(iq_buf, iq_len, rssi, channel);
```

- Galois LFSR for deterministic pseudo-random noise (avoids stdlib `rand()`)
- `esp_timer_create` + `esp_timer_start_periodic` for hardware-independent timing
- `CONFIG_*` Kconfig guards on all test/mock code

---

## Naming Conventions

| Context | Convention | Example |
| --- | --- | --- |
| TypeScript files | camelCase functions, PascalCase classes/types | `matchingEngine.ts`, `MatchResult` |
| TypeScript constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| API routes | kebab-case directories | `app/api/viewing-requests/route.ts` |
| Python private helpers | `_snake_case` prefix | `_normalize_host_port()` |
| Python module constants | `SCREAMING_SNAKE_CASE` | `_CRON_OUTPUT_CONTENT_LIMIT` |
| Rust public functions | `snake_case` | `create_session_with_grouping()` |
| Rust types/structs | `PascalCase` | `SessionGrouping`, `AssignmentAction` |
| C macros/constants | `SCREAMING_SNAKE_CASE` | `BREATHING_FREQ_HZ`, `MOCK_IQ_LEN` |
| C static module vars | `s_` prefix | `s_state`, `s_timer`, `s_lfsr` |
| Firestore collections | camelCase | `rawScrapeData`, `portfolioAssets` |
| Environment variables | `SCREAMING_SNAKE_CASE` | `FIREBASE_PRIVATE_KEY` |

---

## Testing Patterns

### Jest (Next.js app)

```typescript
// __tests__/leads-route.test.ts
import { POST } from '@/app/api/leads/route';

describe('POST /api/leads', () => {
  it('creates a lead with valid data', async () => {
    const req = new Request('http://localhost/api/leads', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', phone: '+201234567890' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
```

- Test files in `__tests__/` directory, named `*.test.ts`
- `jest.config.js` with `jest-environment-node` for API route tests
- Mock Firebase Admin via `lib/stubs/firebase-admin.js`

### Rust Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    fn build_config(root: &Path) -> Config { /* ... */ }
    
    #[tokio::test(flavor = "current_thread")]
    async fn create_session_spawns_process_and_marks_session_running() -> Result<()> {
        let tempdir = TestDir::new("manager-create-session")?;
        // ... test body ...
        Ok(())
    }
}
```

- `TestDir` RAII wrapper for temp directories (auto-cleanup on drop)
- `#[tokio::test(flavor = "current_thread")]` for async tests
- Fake agent scripts (Python) for integration tests that spawn real processes

---

## Security Practices

- **CSRF protection** on all POST routes (Python: `_check_csrf`; Next.js: middleware)
- **Rate limiting** on public endpoints (Upstash Redis + `lib/server/rate-limit.ts`)
- **Input sanitization** — Zod (TypeScript) / whitelist field validation (Python `_CLIENT_EVENT_ALLOWED_FIELDS`)
- **Server-only packages** — `firebase-admin`, `@grpc/grpc-js`, OpenTelemetry SDK aliased to `false` in browser bundle
- **Secret management** — Google Secret Manager for production; `.env.local` for development (never committed)
- **HMAC verification** on PropertyFinder webhooks (`/api/webhooks/property-finder`)
- **Firestore Security Rules** — enforced at `firestore.rules`; never bypass with admin SDK in client-facing routes
- **Supply-chain defense** — `pnpm-workspace.yaml` `minimumReleaseAge` setting

---

## Deployment Rules

1. **Never push directly to `main`** — all changes via PR
2. **Vercel deploys via GitHub Actions only** — `deploy-vercel.yml`; Vercel native git auto-deploy is **DISABLED**
3. **Firebase deploy via `pnpm deploy:firebase`** — never use `firebase deploy` without `--only` flag
4. **Client routes protected** — never modify `app/(client)/` without explicit permission
5. **Environment variables** — add new vars to both `.env.example` AND `turbo.json` `globalEnv` array
6. **Build must pass TypeScript** — `ignoreBuildErrors: false`; fix type errors before merging
