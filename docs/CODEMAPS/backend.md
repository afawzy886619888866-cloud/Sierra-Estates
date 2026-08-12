<!-- Generated: 2026-08-02 | Files scanned: ~150 | Token estimate: ~600 -->

# Sierra Estates Backend Architecture

## API Routes & Integrations

### Admin Routes (`apps/api/` & `apps/admin-dashboard/app/api/`)
- `POST /api/admin/ingest` → Ingest property listings from Google Sheets or CSV.
- `GET /api/admin/properties` → Fetch properties for the admin dashboard.
- `POST /api/pf-webhook` → Property Finder webhook for new leads.
- `GET /api/whatsapp/webhook` → WhatsApp webhook verification.
- `POST /api/whatsapp/webhook` → Incoming WhatsApp messages.

### Key Logic & Handlers
- **Property Finder (`@sierra/property-finder-api`)**:
  - `PFIntegrationService.publishListing(id)` → Syncs a listing to Property Finder.
  - `handlePFLeadWebhook(body)` → Processes incoming leads, scores them via AI, and saves to Firestore.
- **WhatsApp Agent (`@sierra/whatsapp-agent`)**:
  - Responds to leads, coordinates viewing scheduling.
- **Memory Engine (`@sierra-estates/memory-engine`)**:
  - `upsertPropertyEmbedding()` → Generates and stores vector embeddings for semantic search.
  - `searchProperties(query)` → Performs RAG (Retrieval-Augmented Generation) style search.

## Background Jobs (GCP Cloud Scheduler / Vercel Cron)
- `sync-pf-analytics`: Fetches daily views and clicks from Property Finder.
- `whatsapp-followups`: Automatically follows up with inactive "warm" leads.
