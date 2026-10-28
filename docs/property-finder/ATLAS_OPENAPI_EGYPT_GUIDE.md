# Property Finder Enterprise API (Atlas v1 — OpenAPI 3.1.0) · Egypt Guide

Authoritative specification: [`docs/property-finder-spec.json`](../property-finder-spec.json) (`OpenAPI 3.1.0`).

---

## 1. Environments & Authentication

| Environment | Base Gateway URL | Env Variable (`PROPERTY_FINDER_ENV`) | Credentials Used |
|---|---|---|---|
| **Production** | `https://atlas.propertyfinder.com/v1` | `production` (default) | `PROPERTY_FINDER_API_KEY` + `PROPERTY_FINDER_API_SECRET` |
| **Sandbox** | `https://sandbox.atlas.propertyfinder.com/v1` | `sandbox` | `PROPERTY_FINDER_SANDBOX_API_KEY` + `PROPERTY_FINDER_SANDBOX_API_SECRET` |

- **OAuth2 Token Endpoint**: `POST /v1/auth/token` with `{ "apiKey": "...", "apiSecret": "..." }` → returns `{ accessToken, tokenType: "Bearer", expiresIn: 1800 }`.
- **Error Contract**: Always send header `X-PF-Error-Format: problem-json-v2` to receive structured RFC 9457 `ProblemDetail` (`type`, `title`, `status`, `detail`, `code`, `errors[]`).
- **Rate Limits**:
  - Standard API endpoints: **600 requests/min** (`POST /v1/auth/token`: **60 requests/min**).
  - Listing publish (`POST /v1/listings/{id}/publish`): **20 requests/sec**.

---

## 2. Verified Sierra Estates Production Scopes & Public Profiles

Live Production verification against `https://atlas.propertyfinder.com/v1`:

- **Granted Scopes**: `listings:read`, `listings:full_access`, `leads:read`, `users:read`, `webhooks:full_access`.
- **Optional Scope Not Enabled**: `credits:read` (`GET /v1/credits/balance` returns `403`; credit consumption is still handled server-side by Atlas during `publish`).
- **Active Public Profiles (`assignedTo.id`)**:
  - `79509` — **Sierra Estates** (Company Profile — default `PF_DEFAULT_PUBLIC_PROFILE_ID`)
  - `56571` — **Heba Mohamed** (`active`)
  - `50193` — **Ahmed Fawzy** (`active`, `+201061399688` / WhatsApp `line-3`)
  - `56492` — **Eman Zaki** (`active`)

---

## 3. Two-Step Egypt Listing Publication Flow (`request-combined-flat`)

Property Finder Enterprise API uses an explicit two-step flow:

1. **Create Draft**: `POST /v1/listings` (`request-combined-flat` schema):
   - Required fields for Egypt: `reference`, `category` (`residential` | `commercial`), `type`, `offeringType` (`sale` | `rent`), `location: { id: <integer> }`, `size` (numeric), `price: { type, amounts }`, `title: { en, ar? }`, `description: { en, ar? }`, `media: { images: [{ original: { url } }] }`, `assignedTo: { id: <publicProfileId> }`.
   - `bedrooms`: `"studio"` when `0`, else `"1"`..`"20"` / `"20+"`.
   - `bathrooms`: `"none"` when `0`, else `"1"`..`"20"` / `"20+"`.
   - Text rules: Plain text only (no HTML tags, no emojis).
   - Egypt allowed types:
     - **Residential**: `apartment`, `villa`, `townhouse`, `twin-house`, `penthouse`, `duplex`, `chalet`, `hotel-apartment`, `palace`, `roof`, `bungalow`, `cabin`, `land`, `whole-building`, `bulk-sale-unit`, `bulk-rent-unit`, `full-floor`, `half-floor`.
     - **Commercial**: `office-space`, `retail`, `shop`, `show-room`, `clinic`, `medical-facility`, `warehouse`, `whole-building`, `co-working-space`, `restaurant`, `cafeteria`, `factory`, `farm`, `land`, `hotel-apartment`, `staff-accommodation`, `villa`, `bulk-sale-unit`, `bulk-rent-unit`, `full-floor`, `half-floor`.
   - Egypt amenities restriction: No amenities allowed on `land` or `farm`.
2. **Publish Live**: `POST /v1/listings/{id}/publish` (asynchronous moderation; emits `listing.published` or `listing.publishFailed` webhook).

### Image Hosting Egress Allowlist
Property Finder's media fetcher downloads `media.images[].original.url` from:
- `18.142.143.195/32`
- `52.77.45.108/32`
- `3.0.123.23/32`

Ensure Supabase Storage buckets / CDN WAF rules never block these three egress IPs.

---

## 4. OpenAPI 3.1.0 Webhook Events (`/api/webhooks/property-finder`)

Subscription endpoint: `POST /v1/webhooks` with `{ eventId, url, secret }`.
HMAC verification: `HMAC-SHA256(rawBody, PF_WEBHOOK_SECRET)` via `X-Signature` / `X-PF-Signature`.

Supported `WHBaseEvent` types in [`route.ts`](../../apps/sierra-estates-realty/app/api/webhooks/property-finder/route.ts):
- `lead.created`, `lead.updated`, `lead.assigned` (`entity.id` = PF lead ID, `payload.sender.contacts[]` = `{ type: "phone" | "email" | "whatsappUsername", value }`, supports both buyer `listing` and `entityType: "seller"` `sellerProperty` leads).
- `listing.published`, `listing.unpublished`, `listing.action`, `listing.publishFailed` (`payload.reason`, `payload.reasons`), `listing.systemUpdated`.
