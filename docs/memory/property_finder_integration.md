# 📡 Property Finder API Gateway & Webhook Integration
> **Path:** `docs/memory/property_finder_integration.md`  
> **Parent Node:** `docs/memory/index.md`

This document details the active credentials, API routes, and webhook synchronization mechanisms for the **Property Finder (PF) Enterprise API** integration in Sierra Estates.

---

## 🔑 Active Credentials (PROVISIONED BY USER)

These credentials have been loaded into your local environment (`.env` and `apps/web/.env.local`):

*   **API Gateway URL:** `https://atlas.propertyfinder.com`
*   **API Key:** `dghXI.xvR0qLbmNzhEy4APzqRRTotc8JJZHTHKP2`
*   **API Secret:** `WXod450Dj5eVNISsmFA1DCr0oPNuyucH`

*Note: Access tokens expire every 30 minutes. The `PropertyFinderClient` class automatically handles token retrieval and refresh on demand.*

---

## 🔀 Endpoint & Data Synchronizations

### 1. Show Property Finder Listings on Your Site
*   **Endpoint:** `GET /v1/listings` (requires scope `listings:read`)
*   **Next.js Route:** `GET /api/property-finder?action=search-listings`
*   **How it works:**
    1. During client visits or dashboard render, the system queries the internal Next.js API.
    2. The API fetches active published listings from Property Finder's Atlas server.
    3. The frontend displays these listings directly on your homepage and admin panel, ensuring your site is an **exact mirror of your Property Finder inventory**.

### 2. Lead Sync into the CRM
*   **Endpoint:** `GET /v1/leads` (requires scope `leads:read`)
*   **Next.js Route:** `POST /api/property-finder?action=sync-leads`
*   **How it works:**
    1. A webhook (`lead.created`) or a recurring n8n scheduled cron triggers the lead sync endpoint.
    2. The system downloads new inquiries, telephone numbers, and email messages from Property Finder.
    3. Firestore maps these inquiries into the `leads` collection under staff protection.

---

## 🪝 Webhook Event Handlers

The system is configured to verify webhooks from Property Finder at `/api/ingest/property-finder`. 

### Key Event Types:
*   `listing.published` — Triggers local site cache updates to display the new listing instantly.
*   `lead.created` — Triggers instant **Telegram Bot Alerts** to notify agents of high-priority VIP inquiries.

### Webhook Verification Code:
Webhooks are verified using a conditional secret hash:
```typescript
const signature = request.headers.get('X-PF-Signature');
const expected = crypto.createHmac('sha256', process.env.PF_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');
if (signature !== expected) {
  return NextResponse.json({ error: 'Invalid Webhook Signature' }, { status: 401 });
}
```

---

## 🛠️ Diagnostics and Manual Ingestion
You can manually run a listing synchronization directly from the Admin Panel, which runs the internal `pfService.fetchListings()` hook, ensuring zero latency when listing updates occur.

