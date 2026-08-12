# 🗂️ Admin Console Map: Who Does What

> **Path:** `docs/obsidian-vault/Admin Console Map.md`
> **Code lives at:** `apps/sierra-estates-realty/app/admin/**` (single Next.js codebase — see root `CLAUDE.md`).
> **Aesthetic:** Obsidian-native Markdown with double-bracket `[[Links]]` for graph view.

This node maps the staff admin console itself: every route, who is allowed in, and which
backend worker each screen ultimately triggers. It exists so any agent or teammate opening
the vault can answer "if I click X in `/admin`, what actually runs?" without reading code.

---

## 🔐 Who gets in

Auth is client-gated in `app/admin/layout.tsx`: Firebase `onAuthStateChanged` → reads
`users/{uid}.role` from Firestore → only `admin` and `manager` pass; everyone else is
bounced to `/admin/login`. Server-side API routes re-check independently via
`verifyAdminRequest` (`lib/server/auth-guard.ts`), which additionally accepts `role: 'superadmin'`
and never trusts the client check alone.

| Role | Gets into `/admin` UI | Passes `verifyAdminRequest` (API) |
| --- | --- | --- |
| `admin` | ✅ | ✅ |
| `manager` | ✅ | ❌ (UI-only access today — API calls from manager-only accounts will 401) |
| `superadmin` | not checked client-side (gap — see below) | ✅ |
| `agent` / anything else | ❌ → redirected to login | ❌ |

**Known gap:** `manager` can load admin *pages* but several server actions those pages
trigger require `admin`/`superadmin` — a manager can see a button that 401s when clicked.
Worth flagging before wiring more manager-facing actions.

---

## 🧭 The four rooms (current routes)

```
/admin                    Dashboard   — live counts, quick actions
/admin/leads               Leads      — investment-stakeholder pipeline
/admin/listings            Listings   — portfolio / property inventory
/admin/intelligence-os      Intelligence OS — embedded Remix cognitive console
/admin/login                (public)  — the only unauthenticated admin route
```

### 1. Dashboard — `/admin` (`app/admin/page.tsx`)
Read-only live view. Subscribes to Firestore `leads` and `properties` collections via
`onSnapshot` and renders four stat cards (total/new leads, total/active listings) plus
three "Quick Action" buttons (View Leads / Manage Listings / Launch Intelligence OS —
currently links only, no dedicated logic). This is the page most likely to want the
visual map background, since it's the first screen staff see.

### 2. Leads — `/admin/leads`
Staff view of the investment-stakeholder pipeline fed by [[Sourcing Pipeline & Lead Aggregator]]
and the [[WhatsApp CRM & Hand-off Pipeline]]. Public intake happens through
`/api/leads` and `/api/leads/request-viewing` (no auth — anyone can submit); staff actions
on existing leads (e.g. viewing-request approval) go through `/api/viewing-requests`,
which is `admin`-only via `verifyAdminRequest`.

### 3. Listings — `/admin/listings`
Portfolio/inventory management. Backed by the public `/api/listings` (GET, no auth) for
reads; sync/writes are triggered — not performed — from here, via
`lib/server/python-api-client.ts` calling into the standalone `apps/api` Python service
(Cloud Run) for PropertyFinder sync, and `/api/sync` / `/api/sync/publish` for publish
actions. The admin page never runs the sync itself — it just calls the worker.

### 4. Intelligence OS — `/admin/intelligence-os`
Embeds the separate Remix "Intelligence OS" app (its own Cloud Run deployment) inside
`/admin/intelligence-os`. This is where [[Sierra Agent Intelligence]] and
[[Leila Agent Intelligence]] cognition, plus the [[Forecasting Engine]] and
[[Market Valuation Models]], surface for staff to inspect — the admin console only
frames/monitors it; the reasoning runs in the separate service.

### 5. Login — `/admin/login`
The one public admin route. Firebase email/password sign-in; on success the layout's
`onAuthStateChanged` picks up the session and re-checks role.

---

## ⚙️ Triggers, not workers — the golden rule

Per root `CLAUDE.md`: **admin pages/API routes only trigger or monitor background work —
they never run scrapers, syncs, or long jobs in the Next.js request path.** Two client
helpers enforce this split:

- `lib/server/n8n-client.ts` → `triggerN8nWebhook(path, payload)` — fires a registered
  n8n webhook (Docker, `:5678`) and no-ops with a warning if `N8N_BASE_URL` isn't set.
  This is how admin actions reach WhatsApp scraping / workflow automation
  (see [[WhatsApp CRM & Hand-off Pipeline]]).
- `lib/server/python-api-client.ts` → calls the Python `apps/api` service (Cloud Run) for
  PropertyFinder sync and bot integration.

```
Admin UI click
    └─→ Next.js API route (auth-checked)
            └─→ triggerN8nWebhook() ───────→ n8n (Docker :5678)   [scraping / automation]
            └─→ python-api-client.ts ──────→ apps/api (Cloud Run) [PF sync / bot]
            └─→ (Intelligence OS iframe) ──→ Intelligence OS (Cloud Run) [Sierra/Leila cognition]
```

None of the three worker paths can slow down or crash the public site — that's the whole
point of the split (see root `CLAUDE.md` → Deployment Architecture).

---

## 🖼️ Visual background

A generated diagram of this map (`docs/obsidian-vault/assets/admin-console-map.svg`) is
wired into `app/admin/layout.tsx` as a low-opacity fixed background behind the admin
shell, so the "who does what" picture is literally always on-screen for staff using the
console. Regenerate that SVG whenever a route, role, or worker wiring above changes —
it should never silently drift from this note.

---

## 🕸️ Related nodes

- [[Sierra Estates Memory Engine]] — the hub this map hangs off of.
- [[Sourcing Pipeline & Lead Aggregator]] — where Leads-page data originates.
- [[WhatsApp CRM & Hand-off Pipeline]] — n8n-triggered conversational hand-off.
- [[Sierra Agent Intelligence]] / [[Leila Agent Intelligence]] — what Intelligence OS surfaces.
- [[Forecasting Engine]] / [[Market Valuation Models]] — the models Intelligence OS exposes.
