# Sierra Estates — API Contract

This repo (`apps/sierra-estates-realty`) is the **backend / API** for Sierra Estates.
The customer-facing UI lives in a **separate frontend repo** and consumes the
`/api/*` routes documented here over HTTPS.

> Source of truth for auth classification: the **API Auth (hardened)** section of
> [`CLAUDE.md`](../CLAUDE.md). This document adds the HTTP shapes a frontend needs.

---

## 1. Base URL & environments

| Environment | Base URL |
|-------------|----------|
| Production  | `https://sierra-estates.net` |
| Local dev   | `http://localhost:3000` |

The frontend should read the base URL from its own env (e.g.
`NEXT_PUBLIC_API_BASE_URL`) and never hard-code it.

## 2. CORS

Cross-origin requests are gated by an **allowlist** (`ALLOWED_ORIGINS`,
comma-separated) enforced in `middleware.ts` (`lib/server/cors.ts`).

- The frontend origin **must** be added to `ALLOWED_ORIGINS` (prod domain +
  any preview domains + `http://localhost:3000` for dev).
- Requests may be **credentialed** (Firebase ID token / cookies); the server
  reflects the specific allowed origin (never `*`) and sets
  `Access-Control-Allow-Credentials: true`.
- Preflight `OPTIONS` is answered by middleware with `204`.

```env
ALLOWED_ORIGINS=http://localhost:3000,https://sierra-estates.net
```

## 3. Authentication

Four schemes are in use. A frontend only ever uses (a) and (b).

| Scheme | How | Used by |
| -------- | ----- | ---------- |
| **(a) Public** | No auth. Rate-limited. | Public site reads/writes |
| **(b) Admin (Firebase Bearer)** | `Authorization: Bearer <Firebase ID token>` where the user's `users/{uid}.role === 'admin'` (`verifyAdminRequest`) | Admin dashboard |
| **(c) Service + token** | Firebase Bearer **or** `X-SBR-SECRET-KEY: <SBR_SECRET_KEY>` (`verifyRequest`) | Trusted services / cron |
| **(d) Webhook / internal** | Per-integration secret or HMAC; `/api/orchestrate` requires `X-SBR-SECRET-KEY` | Third parties, automation |

Error responses use an HTTP status code (`400`, `401`, `404`, `429`, `500`) and typically include either:

- `{ success: false, error: string }`
- `{ error: string }`
- `{ success: false, message: string }` (less common, being standardized)

When integrating, rely on HTTP status codes as the primary error indicator; error field shapes may vary across endpoints and are being consolidated.

---

## 4. Public endpoints (frontend)

### `GET /api/listings`

List published units.

| Query | Type | Default | Notes |
|-------|------|---------|-------|
| `limit` | number | `12` | Page size |
| `id` | string | — | When set, returns a single listing |

#### Response (collection)

```json
{
  "success": true,
  "count": 12,
  "listings": [
    {
      "id": "SE-HYP-VLA-0001",
      "title": "Villa Émeraude",
      "price": 35000000,
      "compound": "Hyde Park",
      "beds": 6,
      "baths": 5,
      "area": 450,
      "image": "https://.../cover.jpg",
      "images": ["https://.../1.jpg"],
      "description": "…",
      "propertyType": "villa",
      "status": "available",
      "pfReferenceNumber": null
    }
  ]
}
```

**Response (`?id=…`)** → `{ "success": true, "listing": { …same shape… } }`
(`404` `{ success:false, error:"Listing not found" }` when missing).

### `POST /api/leads`

Create a website lead. Notifies the team via Telegram.

```json
// request
{ "name": "Ahmed", "email": "a@x.com", "phone": "+20…", "message": "…", "locale": "en" }
// response
{ "success": true, "id": "<leadId>" }
```

### `POST /api/leads/request-viewing`

Request a viewing for a unit (moves the lead to the agent-approval stage).

```json
// request  (portfolioId optional)
{ "leadId": "…", "unitId": "…", "portfolioId": "…" }
// response
{ "success": true, "viewingId": "…", "message": "Viewing request received. …" }
```

`400` `{ error: "Lead ID and Unit ID are required" }` when missing.

### Other public routes

| Method | Path | Purpose |
| -------- | ------ | --------- |
| POST | `/api/closer/initiate` | Kick off the Stage-9 closer flow |
| GET | `/api/concierge/[leadId]` | Fetch a client's concierge portfolio |
| GET | `/api/wealth/portfolio` | Investor portfolio view |
| GET | `/api/whatsapp/heartbeat` | Bot liveness probe |

> Rate limiting: public routes apply `publicEndpointLimiter`
> (`lib/server/rate-limit.ts`) and may return `429`.

## 5. Admin endpoints (Firebase Bearer, `role==='admin'`)

Send `Authorization: Bearer <Firebase ID token>`.

| Method | Path | Purpose |
| -------- | ------ | --------- |
| GET/POST | `/api/viewing-requests` | Manage viewing approvals |
| POST | `/api/concierge/send-whatsapp` | Send a concierge WhatsApp message |
| POST | `/api/telegram/setup` | Configure the Telegram bot |
| GET | `/api/wealth/roi` | ROI analytics |
| GET | `/api/admin/reports` | Dashboard analytics |
| GET/POST | `/api/admin/team` | Staff management |

> Other `/api/admin/*` routes back the in-repo admin dashboard. `POST
> /api/admin/ingest` is **service + token** (scheme **c**), not session-only.

## 6. Internal / cron / webhooks (not for the frontend)

Listed for completeness — these authenticate server-to-server and should
**not** be called from a browser.

| Path(s) | Auth |
| --------- | ------ |
| `/api/orchestrate` | `X-SBR-SECRET-KEY` (middleware + route) |
| `/api/cron/*` | `CRON_SECRET` (Vercel Cron) |
| `/api/telegram/webhook`, `/api/whatsapp/webhook`, `/api/ingest/whatsapp`, `/api/webhooks/*` | Per-integration secret / HMAC |

---

## 7. Example: calling the API from the frontend

```ts
const API = process.env.NEXT_PUBLIC_API_BASE_URL!; // e.g. https://sierra-estates.net

// Public read
const res = await fetch(`${API}/api/listings?limit=12`);
const { listings } = await res.json();

// Authenticated (admin) read — Firebase ID token
const token = await firebaseUser.getIdToken();
await fetch(`${API}/api/admin/reports`, {
  headers: { Authorization: `Bearer ${token}` },
  credentials: 'include', // only if you rely on cookies
});
```

Ensure the frontend's origin is in `ALLOWED_ORIGINS` on the API deployment,
or the browser will block the response.
