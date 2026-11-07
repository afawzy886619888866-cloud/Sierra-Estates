---
name: owner-outreach-simulation
description: Simulates the 8-line WhatsApp property owner outreach workflow in zero-risk dry-run mode. Validates candidate discovery from Google Sheets and Supabase, tests phone normalization, checks strict deduplication ledgers, verifies Arabic message generation, and ensures rate-limit slot quotas without sending real WhatsApp traffic.
---

# Owner Outreach Simulation Skill · Sierra Estates

## Purpose

This skill allows agents and operators to safely test, audit, and simulate the **Sierra Estates WhatsApp Owner Outreach Workflow (Workflow 09)** with **100% dry-run enforcement**.

It guarantees:
- **Zero Real Messages Sent**: `WF_DRY_RUN=1` is locked; no external traffic is dispatched to the OpenWA gateway or WhatsApp devices.
- **Zero Sheet Mutation**: Last-contact dates in Google Sheets are not modified during simulation.
- **Full Pipeline Verification**:
  1. **Candidate Discovery**: Fetches inventory rows from the Google Sheet (`UNITS_SHEET_ID: 1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk`) and authoritative Supabase listings (`public.listings`).
  2. **Phone Normalization**: Validates Egyptian mobile numbers (`201...`, 11 digits, stripped of separators).
  3. **Multi-Source Deduplication**: Cross-checks against the local JSONL ledger (`owner-outreach-ledger.jsonl`), Google Sheet last-contact cells, and opted-out numbers.
  4. **Multi-Lane Split Walk**: Simulates top/bottom cursor convergence across simulated lines (`dry-line-1` .. `dry-line-4`).
  5. **Arabic Template Generation**: Generates compound-specific, deal-aware Arabic outreach copy with the mandatory opt-out footer.
  6. **Quota & Rate-Limiting**: Honors slot batch caps (`WF_SLOT_BATCH`) and graceful slot deadlines.

---

## When to Use

Activate this skill whenever:
- Verifying the owner outreach engine after code changes, schema migrations, or sheet updates.
- Performing pre-flight checks before an operator activates the live WhatsApp gateway.
- Auditing message templates, Arabic phrasing, and compound metadata.
- Testing candidate volume and deduplication efficiency without burning daily quotas or risking WhatsApp bans.

---

## Execution Instructions

### Quick Simulation Run

Run the dedicated runner script:
```powershell
node "H:\Sierra Estates\scripts\simulate-owner-outreach.mjs" --batch 5
```

### CLI Parameters

| Flag | Default | Description |
|---|---|---|
| `--batch <N>` | `5` | Number of messages to simulate in the slot (e.g. `5`, `15`, `30`). |
| `--side <top\|bottom\|split>` | `split` | Walk direction: `split` (top & bottom meet in middle), `top`, or `bottom`. |
| `--respect-hours` | Off (`0-24`) | Enforces Cairo 09:00-22:00 active window check. Omit to simulate at any hour. |

---

## Verification Criteria

A successful simulation run must satisfy:
1. **Exit Code 0**: Process completes cleanly with `SUMMARY` JSON telemetry.
2. **Candidates > 0**: Candidate discovery successfully surfaces uncontacted owner inventory.
3. **No Network Sends**: Output prefixes simulated dispatches with `[dry-run]` and displays:
   ```text
   [dry-run][top][#1] would send → 01xxxxxxxxx (SE-CODE) via dry-line-1
   ```
4. **Batch Halted on Cap**: Process pauses gracefully when slot batch cap is reached.
5. **Deduplication Active**: Validated against `already-contacted ledger`.
