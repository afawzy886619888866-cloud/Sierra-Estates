---
name: ingest-listings
description: "Run unified WhatsApp listings ingestion, phone cable sync, photo validation, AI copywriting, and multi-channel inventory sync."
---

# INGEST LISTINGS

This workflow invokes the unified Sierra Estates listings ingestion pipeline.

1. **Check USB Phone Connection**:
   - Sweeps Samsung Galaxy S24 Ultra WhatsApp chat exports and photos over MTP.
   - Stages new archives into `data/whatsapp-phone-import/`.

2. **Ingest Listings & Media**:
   - Parses multi-message listings and binary image dimensions ($\ge 800\times 600\text{ px}$).
   - Uploads qualifying photos to Supabase Storage `property-media` bucket.
   - Enriches each listing with luxury Arabic & English marketing descriptions via `workflows/lib/listing-copywriter.js`.
   - Upserts into Supabase `public.listings`.

3. **Verify Property Finder Qualification**:
   - Gating: strictly $\ge 6$ qualifying photos for Property Finder ad candidates.
   - Updates Property Finder Approval Studio (`/admin/pf-approval`).

4. **Synchronize Map & Google Sheets**:
   - Updates `data/map-inventory.json` for the client GIS map.
   - Updates Google Sheet (`1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk`).

5. **Execution Command**:
   ```bash
   node scripts/ingest-listings.mjs
   ```
