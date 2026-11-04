# Dispatch for Explorer 2 (Supply Engine, Easy Listing, DQE & Supabase Sync)

Read `H:\Sierra Estates\.agents\teamwork\ORIGINAL_REQUEST.md` carefully.
Investigate the codebase focusing on:
1. R2: The Supply Engine: Owner Bots, Scrapers & Easy Listing
   - OpenWA multi-line pool setup (`:2785`, lines 1-8), Owners Sheet integration, daily scheduling (30 msgs/2h between 12:00 PM and 8:00 PM Africa/Cairo), human typing simulation (45-55s), and Admin OS approval gate.
   - Cold Outreach Queue for unverified apartment owners.
   - Ingestion hooks for WhatsApp Broker Groups and scrapers.
   - Easy Listing instant parser (BMM codes `[O/B][CompoundInitial][AgentInitials]-[ID]` and Sierra attribute codes `[CompoundCode]-[Rooms][Furnishing]-[Price][K/$]+[Features]`).
   - Acquisition-to-CRM latency tracking (>24h penalty indicator).
2. R3: Data Quality Estimation (DQE), Spreadsheet & Supabase Hybrid Sync
   - Mandatory phone gate rejecting missing numbers and normalizing to E.164.
   - Empty cell handling ("NULL").
   - Price sanity checks (Rent <= 400,000 EGP/month, reclassifying >= 1,000,000 EGP as Resale).
   - Canonical compound dictionary mapping Arabic/English aliases.
   - DQE deduplication using `sync_hash` across Listings, Owners, Duplicates.
   - `Real_Available_Units` sheet tab and public catalog mirroring.
3. Report current implementations, packages, modules, gaps, test coverage, and exact files to modify.
Write your structured findings to `H:\Sierra Estates\.agents\teamwork\teamwork_explorer_survey_2\survey_report.md` and complete with `handoff.md`.


## 2026-11-04T21:24:32Z
You are Explorer 2 (Supply Engine, Easy Listing, DQE & Supabase Sync).
Your working directory is: H:\Sierra Estates\.agents\teamwork\teamwork_explorer_survey_2\
Read H:\Sierra Estates\.agents\teamwork\ORIGINAL_REQUEST.md and your dispatch instructions at H:\Sierra Estates\.agents\teamwork\teamwork_explorer_survey_2\DISPATCH.md.

Investigate:
1. R2: The Supply Engine: Owner Bots, Scrapers & Easy Listing
   - OpenWA multi-line pool setup (`:2785`, lines 1-8), Owners Sheet integration, daily scheduling (30 msgs/2h between 12:00 PM and 8:00 PM Africa/Cairo = 240 msgs/day), human typing simulation (45-55s), 1-click human approval gate in Admin OS.
   - Cold Outreach Queue for unverified apartment owners.
   - Ingestion hooks for WhatsApp Broker Groups and scrapers.
   - Easy Listing instant parser (BMM codes `[O/B][CompoundInitial][AgentInitials]-[ID]` and Sierra attribute codes `[CompoundCode]-[Rooms][Furnishing]-[Price][K/$]+[Features]`).
   - Acquisition-to-CRM latency tracking (>24h penalty indicator).
2. R3: Data Quality Estimation (DQE), Spreadsheet & Supabase Hybrid Sync
   - Mandatory phone gate rejecting missing numbers and normalizing to E.164.
   - Empty cell handling ("NULL").
   - Price sanity checks (Rent <= 400,000 EGP/month, reclassifying >= 1,000,000 EGP as Resale).
   - Canonical compound dictionary mapping Arabic/English aliases.
   - DQE deduplication using `sync_hash` across Listings, Owners, Duplicates collections.
   - `Real_Available_Units` sheet tab and public catalog mirroring.

Document all findings, existing files, missing implementations, and exact code changes needed in H:\Sierra Estates\.agents\teamwork\teamwork_explorer_survey_2\survey_report.md and write handoff.md. Send a completion message when done.
