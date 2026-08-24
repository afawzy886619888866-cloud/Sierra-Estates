# Sierra Estates inventory synchronization

Airtable base `appN96kHujXsLkc0h` is the operational source of truth. The `All Inventory Units` table is exported by `scripts/sync_airtable_inventory.py` into `Inventory_with_Photos_Airtable.csv` and `Inventory_with_Photos.xlsx`.

The GitHub Actions workflow `.github/workflows/sync-airtable-inventory.yml` supports manual execution and runs daily at 02:17 UTC. It requires the repository secret `AIRTABLE_PAT` with read access to the target base. Each run also writes `Inventory_sync_change_log.json`, which contains the unique RecordID count and added, removed, and changed RecordIDs compared with the prior CSV.

`RecordID` is the stable synchronization key. Records are deduplicated by RecordID during export. `Client Request` records remain in the CRM export but must not be promoted to public map pins. `Sale Excluded` records remain available for audit but are not treated as rental listings.

The `Units With Photos` Airtable table contains only high-confidence media matches from `WhatsAppChatwithOwnersAugust2026.zip`. It includes the true `Photo Attachments` field, the `Media URLs` field, and the source filename lineage. Review-only matches are excluded from this table and from public map photo output.

The full-stack CRM provides authenticated `syncPreview` and `refreshInventory` procedures. The preview reports the current Airtable unique-record count. The refresh stores an authenticated JSON snapshot in secure project storage for audit; it does not silently publish raw contact details or client requests to the map.

For immediate event-driven updates, connect an Airtable automation/webhook to the deployed refresh endpoint only after adding request-signature verification. The current safe default is the daily GitHub workflow plus the authenticated manual refresh control, because it avoids exposing an unauthenticated write endpoint.
