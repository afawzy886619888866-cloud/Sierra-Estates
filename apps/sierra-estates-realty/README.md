# Sierra Estates — Realty (Public Client Hub)

**Package:** `sierra-estates-realty` · **Surface:** Public, read-only

This is the public-facing Sierra Estates client hub. It is a **read-only** view over
the live Firestore data streams — listings, compounds, ROI/market intelligence, and
virtual tours. It performs **no privileged writes**: all write/control operations are
owned by the private admin portal and the Anti-Gravity backend engine.

## Role in the two-app layout

| App | Package | Surface | Responsibility |
|-----|---------|---------|----------------|
| **`apps/web`** (this app) | `sierra-estates-realty` | Public | Read-only client hub over Firestore streams |
| `apps/admin` | `sierra-estates-admin-portal` | Private | Master write/control admin CRM & bot telemetry |

## Data boundary (Anti-Gravity)

- The client reads from Firestore via the **client SDK** (`@/lib/firebase`) — staff-gated
  collections stay protected by Firestore security rules.
- Privileged server work uses the **Admin SDK** (`@/lib/server/firebase-admin`), which
  bypasses rules and is only invoked from authenticated API routes.
- The browser never holds `CRON_SECRET` / `SBR_SECRET_KEY` — secret-gated routes are
  proxied server-side.

## Commands

From the repo root:

```bash
pnpm dev:web      # run this app
pnpm build:web    # production build
pnpm type-check   # tsc --noEmit (real CI gate)
```
