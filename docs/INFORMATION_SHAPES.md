# Bidirectional Information Shapes — Employees ↔ Agents ↔ Bots

**Mission 5 contract (2026-11-01).** These structured shapes are the enforced
communication schemas across the Telegram groups and the Admin Dashboard.
The bots accept BOTH raw unstructured Arabic/English text + photos (the
deterministic parser) AND these cards — **the card wins when present**,
because every field is explicit (§21 no-fabrication: an explicit value beats
a guess; a missing card field falls back to the regex extractor).

Implementation: `workflows/lib/info-shapes.js` (parsers + renderers), wired
into `workflows/12-telegram-intake/parser.js#parseListing`.

---

## S1 — Agent → Bot: `📥 [UNIT INTAKE]`

Send in any configured agent group ("Fareda units", "Christina units",
"Heba Units") or via `/list-property` ("Easy Listing").

```text
📥 [UNIT INTAKE]
• Deal: Rent / Resale
• Compound: [Compound Name]
• Type & Specs: [Type] | [Area]m² | [Beds]B/[Baths]B | Floor: [Floor]
• Furnishing: [Furnished / Semi / Unfurnished]
• Price & Terms: [Price EGP/USD] | [Payment Terms] | Deposit: [Deposit]
• Owner (PRIVATE): [Name] | [01xxxxxxxxx] | Unit #: [Private]
• Notes: [View / Key Status]
```

Rules:
- **Owner (PRIVATE)** is stored ONLY in the Master Sheet internal columns —
  never broadcast, never public. The concierge reference is the unit code.
- Compound accepts any alias (`cfc`, `كايرو فيستيفال`, `mvd`, `هايد بارك`,
  `اب تاون`, `ماونتن فيو اي سيتي` …) — it is canonicalized on intake.
- `Deal: Resale` is preserved as `Resale` in the ledger (deal-type gate:
  rent ≥ 1,000,000 EGP auto-classifies as Resale).
- Bot replies within **< 500 ms** with `⏳ Unit received — parsing &
  verifying...`, then processes asynchronously.

## S2 — Bot → Agent: `✅ [UNIT VERIFIED]`

```text
✅ [UNIT VERIFIED]
• Code: SE-RENT-0204
• Master Sheet Row: 1287
• Status: Pending Verification
• 💎 GEM candidate detected — flagged for priority marketing   (optional)
• Broadcast: General group notified (sanitized)
• Owner contact: stored internally only — never broadcast.
```

Also emitted as re-list refresh (`♻️`) and DQE price-variance (`📊`) variants.

## S3 — Owner → Bot: `📞 [OWNER REPLY]`

Structured form (optional — free Arabic/English replies classify the same way):

```text
📞 [OWNER REPLY]
• Unit: SE-RENT-0204
• Answer: Available / Sold / Rented / Later
```

`answer` maps to `Contact_Status`: `available` → **Verified Available**
(+ `Verified_Available_Date` stamp, enters Real_Available_Units);
`sold`/`rented` → archived + removed from Tab 2 + unpublished from external
feeds; no answer → `Contacted - No Answer`.

## S4 — Buyer → Bot: `🏠 [BUYER INQUIRY]`

Emitted by the Buyer Concierge Guardian (Bot 4) for Property Finder /
Website inquiries; consumed by the CRM + sales-rep Telegram brief:

```text
🏠 [BUYER INQUIRY]
• Client: [Name]
• Interest: [Rent / Buy / Compound]
• Budget: [Max EGP]
• Preferred: [Compound / Area]
• Source: [Website / Property Finder]
• Top matches:
   1. [Unit Code] — [Compound] · [Price] EGP
   2. … (3–5 matches)
```

## S5 — Employee → Bot: `⚙️ [COMMAND]`

Admin commands accepted in the exec Telegram chat / Admin OS console:

```text
⚙️ [COMMAND] /reset_outreach_status
⚙️ [COMMAND] /ping
⚙️ [COMMAND] broadcast [unit_code]
```

`reset_outreach_status` is also exposed as
`node workflows/14-sheets-supabase-sync/sync.js --reset-outreach` and via the
Apps Script menu (🛰️ Sierra Sync → 🔒 /reset_outreach_status).

## S6 — Bot → Admin OS: `🚨 [ALERT]`

```text
🚨 [ALERT]
• Severity: critical / warning / info
• Source: [guardian bot id]
• Unit: [code]            (optional)
• [message]
• Action: [taken / required]
```

Escalations (12 h unanswered photo requests, zero OpenWA lines, DQE
anomalies, queue backlogs) arrive in this shape on Telegram + the Admin
activities feed.
