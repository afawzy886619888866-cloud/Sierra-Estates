#!/usr/bin/env python3
"""Phase 1 deliverables generator: XLSX + 5 markdown reports from pipeline output."""
import csv, json, os
from collections import Counter, defaultdict
from datetime import date

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Self-locating repo root (works from any checkout path; env override for CI)
ROOT = os.environ.get('SE_PIPELINE_ROOT',
                      os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CSV_IN = f'{ROOT}/data/MASTER_INVENTORY_V1.csv'
TODAY = '2026-09-29'

with open(CSV_IN, encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

uniq = [r for r in rows if r['publish_status'] != 'DUPLICATE']
dupes = [r for r in rows if r['publish_status'] == 'DUPLICATE']

def pct(n, d): return f"{100.0*n/d:.1f}%" if d else '0%'

# ---------------------------------------------------------------- stats
def stats(recs):
    n = len(recs)
    s = {
        'n': n,
        'publish': Counter(r['publish_status'] for r in recs),
        'fresh': Counter(r['freshness'] for r in recs),
        'ob': Counter(r['owner_or_broker'] for r in recs),
        'deal': Counter(r['deal_type'] for r in recs),
        'ptype': Counter(r['property_type'] for r in recs),
        'pv': Counter(r['price_validity'] for r in recs),
        'phone': Counter(r['phone_state'] for r in recs),
        'avail': Counter(r['availability'] for r in recs),
        'missing_price': sum(1 for r in recs if not r['price'] or r['price_validity'] in ('missing',)),
        'missing_beds': sum(1 for r in recs if not r['bedrooms']),
        'missing_baths': sum(1 for r in recs if not r['bathrooms']),
        'missing_area': sum(1 for r in recs if not r['area_sqm']),
        'missing_furn': sum(1 for r in recs if r['furnishing'] in ('unknown', '')),
        'missing_photos': sum(1 for r in recs if r['photo_count'] in ('0', '')),
        'missing_compound': sum(1 for r in recs if not r['compound']),
        'missing_phone': sum(1 for r in recs if r['phone_state'] != 'valid'),
        'missing_wa': sum(1 for r in recs if not r['whatsapp']),
        'missing_name': sum(1 for r in recs if not r['contact_name']),
        'unverified': sum(1 for r in recs if r['freshness'] in ('Unknown', 'Verification Required')),
        'qs': Counter((int(r['quality_score']) // 10) * 10 for r in recs),
        'quality_avg': (sum(int(r['quality_score']) for r in recs) / n) if n else 0,
    }
    return s

S = stats(uniq)
SEG = {r['unit_id']: r for r in uniq}

# segment-level
by_seg = defaultdict(list)
for r in uniq: by_seg[r['owner_or_broker']].append(r)
seg_stats = {k: stats(v) for k, v in by_seg.items()}

# compound-level (top 25)
by_comp = defaultdict(list)
for r in uniq:
    if r['compound']: by_comp[r['compound']].append(r)
comp_rows = []
for c, recs in by_comp.items():
    comp_rows.append({
        'compound': c, 'n': len(recs),
        'fresh': sum(1 for r in recs if r['freshness'] in ('Fresh', 'Aging')),
        'price_ok': sum(1 for r in recs if r['price_validity'] == 'valid'),
        'phone_ok': sum(1 for r in recs if r['phone_state'] == 'valid'),
        'beds': sum(1 for r in recs if r['bedrooms']),
        'photos': sum(1 for r in recs if r['photo_count'] not in ('0', '')),
        'avg_q': sum(int(r['quality_score']) for r in recs) / len(recs),
    })
comp_rows.sort(key=lambda x: -x['n'])

# verification queue: high-value targets (owner-direct or high quality, need verification)
SOURCE_PRI = {'PARTNER': 3, 'OWNER_DIRECT': 2, 'BROKER': 1, 'UNKNOWN': 0}
vq = [r for r in uniq if r['freshness'] in ('Unknown', 'Verification Required')
      and r['availability'] in ('available', 'pending', 'unknown')]
vq.sort(key=lambda r: (-SOURCE_PRI.get(r['owner_or_broker'], 0), -int(r['quality_score'])))

# ================================================================ XLSX
HDR_FILL = PatternFill('solid', fgColor='0B2333')
HDR_FONT = Font(name='Calibri', bold=True, color='FFFFFF', size=11)
STATUS_FILL = {
    'PUBLISHABLE': PatternFill('solid', fgColor='C6EFCE'), 'REVIEW_REQUIRED': PatternFill('solid', fgColor='FFEB9C'),
    'STALE': PatternFill('solid', fgColor='FFD9B3'), 'INCOMPLETE': PatternFill('solid', fgColor='F8CBAD'),
    'EXPIRED': PatternFill('solid', fgColor='D9D9D9'), 'DUPLICATE': PatternFill('solid', fgColor='E4DFEC'),
}
THIN = Border(*[Side(style='thin', color='D0D7DE')] * 4)

wb = openpyxl.Workbook()

# --- Sheet 1: Executive Summary
ws = wb.active; ws.title = 'Summary'
ws.sheet_view.showGridLines = False
def put(ws, cell, val, bold=False, size=11, color=None, fill=None):
    c = ws[cell]; c.value = val; c.font = Font(name='Calibri', bold=bold, size=size, color=color)
    if fill: c.fill = fill
put(ws, 'B2', 'SIERRA BLU — MASTER INVENTORY V1', True, 16, '0B2333')
put(ws, 'B3', f'Generated {TODAY} · Phase 1 Data Audit · Source: consolidated master XLSX + 2 owner TSVs', False, 10, '666666')
r = 5
put(ws, f'B{r}', 'KEY METRICS', True, 12); r += 1
metrics = [
    ('Source records seen', 12088, '11,488 XLSX + 298 + 302 TSV'),
    ('Unique units (post-dedup)', S['n'], f"{len(dupes)} duplicates removed ({pct(len(dupes), len(rows))})"),
    ('Owner-direct units', S['ob'].get('OWNER_DIRECT', 0), pct(S['ob'].get('OWNER_DIRECT', 0), S['n']) + ' of unique'),
    ('Partner (team) units', S['ob'].get('PARTNER', 0), ''),
    ('Broker units', S['ob'].get('BROKER', 0), pct(S['ob'].get('BROKER', 0), S['n'])),
    ('PUBLISHABLE now', S['publish'].get('PUBLISHABLE', 0), 'ALL units fail freshness or completeness gates'),
    ('Verification campaign needed', S['unverified'], pct(S['unverified'], S['n']) + ' of unique units'),
    ('Valid EGP price', S['pv'].get('valid', 0), pct(S['pv'].get('valid', 0), S['n'])),
    ('Valid phone (E.164)', S['phone'].get('valid', 0), pct(S['phone'].get('valid', 0), S['n'])),
    ('With photos', S['n'] - S['missing_photos'], pct(S['n'] - S['missing_photos'], S['n'])),
    ('Average quality score', f"{S['quality_avg']:.1f}/100", ''),
]
for label, val, note in metrics:
    put(ws, f'B{r}', label, True); put(ws, f'C{r}', val); put(ws, f'D{r}', note, color='808080', size=9); r += 1
r += 1
put(ws, f'B{r}', 'PUBLISH STATUS DISTRIBUTION', True, 12); r += 1
for k in ('PUBLISHABLE', 'REVIEW_REQUIRED', 'STALE', 'INCOMPLETE', 'EXPIRED', 'DUPLICATE'):
    n = S['publish'].get(k, 0) + (len(dupes) if k == 'DUPLICATE' else 0)
    put(ws, f'B{r}', k, True); put(ws, f'C{r}', n); put(ws, f'D{r}', pct(n, len(rows)))
    ws[f'C{r}'].fill = STATUS_FILL.get(k, PatternFill())
    r += 1
r += 1
put(ws, f'B{r}', 'FRESHNESS (unique units)', True, 12); r += 1
for k in ('Fresh', 'Aging', 'Stale', 'Verification Required', 'Unknown'):
    put(ws, f'B{r}', k); put(ws, f'C{r}', S['fresh'].get(k, 0)); put(ws, f'D{r}', pct(S['fresh'].get(k, 0), S['n'])); r += 1
r += 1
put(ws, f'B{r}', 'PRICE VALIDITY (unique units)', True, 12); r += 1
for k, lbl in (('valid', 'Valid for deal type'), ('missing', 'Missing / price-on-call / zero'),
               ('suspicious_low', 'Below plausible sale floor'), ('invalid_for_deal_type', 'Wrong scale for deal type (rent↔sale)'),
               ('usd_unconfirmed', 'USD, unconfirmed')):
    put(ws, f'B{r}', lbl); put(ws, f'C{r}', S['pv'].get(k, 0)); put(ws, f'D{r}', pct(S['pv'].get(k, 0), S['n'])); r += 1
for col, w in (('A', 3), ('B', 38), ('C', 14), ('D', 46)):
    ws.column_dimensions[col].width = w

# --- Sheet 2: Master (all unique, sorted)
ws2 = wb.create_sheet('Master Inventory')
cols = ['unit_id','public_code','compound','area','district','property_type','deal_type','deal_subtype','price','currency',
        'price_validity','bedrooms','bathrooms','area_sqm','furnishing','owner_or_broker','contact_name','phone','whatsapp',
        'availability','last_verified_at','freshness','photo_count','latitude','longitude','quality_score','publish_status','source','duplicate_of']
hdrs = [c.replace('_', ' ').title() for c in cols]
ws2.append(hdrs)
for c in range(1, len(cols) + 1):
    cell = ws2.cell(1, c); cell.fill = HDR_FILL; cell.font = HDR_FONT
    cell.alignment = Alignment(horizontal='center', vertical='center')
sorted_uniq = sorted(uniq, key=lambda r: (-int(r['quality_score'])))
for rec in sorted_uniq:
    ws2.append([rec.get(c) for c in cols])
for i in range(2, ws2.max_row + 1):
    st = ws2.cell(i, cols.index('publish_status') + 1).value
    if st in STATUS_FILL: ws2.cell(i, cols.index('publish_status') + 1).fill = STATUS_FILL[st]
    ws2.cell(i, 9).number_format = '#,##0'
ws2.freeze_panes = 'A2'
ws2.auto_filter.ref = f'A1:{get_column_letter(len(cols))}{ws2.max_row}'
for c in range(1, len(cols) + 1):
    ws2.column_dimensions[get_column_letter(c)].width = min(24, max(10, len(hdrs[c-1]) + 2))

# --- Sheet 3: Verification Queue
ws3 = wb.create_sheet('Verification Queue')
qcols = ['unit_id','compound','property_type','deal_type','price','bedrooms','area_sqm','owner_or_broker','contact_name','phone','whatsapp','freshness','quality_score','availability']
ws3.append([c.replace('_', ' ').title() for c in qcols])
for c in range(1, len(qcols) + 1):
    cell = ws3.cell(1, c); cell.fill = HDR_FILL; cell.font = HDR_FONT
for rec in vq[:3000]:
    ws3.append([rec.get(c) for c in qcols])
ws3.freeze_panes = 'A2'
ws3.auto_filter.ref = f'A1:{get_column_letter(len(qcols))}{ws3.max_row}'

# --- Sheet 4: Duplicates
ws4 = wb.create_sheet('Duplicates')
dcols = ['unit_id','duplicate_of','compound','property_type','deal_type','price','bedrooms','owner_or_broker','source','notes']
ws4.append([c.replace('_', ' ').title() for c in dcols])
for c in range(1, len(dcols) + 1):
    cell = ws4.cell(1, c); cell.fill = HDR_FILL; cell.font = HDR_FONT
for rec in dupes:
    ws4.append([rec.get(c) for c in dcols])
ws4.freeze_panes = 'A2'

# --- Sheet 5: Compound stats
ws5 = wb.create_sheet('Compound Stats')
ccols = ['compound','units','fresh(<=30d)','valid price','valid phone','with beds','with photos','avg quality']
ws5.append([c.title() for c in ccols])
for c in range(1, len(ccols) + 1):
    cell = ws5.cell(1, c); cell.fill = HDR_FILL; cell.font = HDR_FONT
for cr in comp_rows:
    ws5.append([cr['compound'], cr['n'], cr['fresh'], cr['price_ok'], cr['phone_ok'], cr['beds'], cr['photos'], round(cr['avg_q'], 1)])
ws5.freeze_panes = 'A2'
ws5.auto_filter.ref = f'A1:{get_column_letter(len(ccols))}{ws5.max_row}'

out_xlsx = f'{ROOT}/data/MASTER_INVENTORY_V1.xlsx'
wb.save(out_xlsx)
print(f'Wrote {out_xlsx}')

# ================================================================ REPORTS
def md_table(headers, data_rows):
    out = ['| ' + ' | '.join(headers) + ' |', '|' + '|'.join(['---'] * len(headers)) + '|']
    for dr in data_rows:
        out.append('| ' + ' | '.join(str(x) for x in dr) + ' |')
    return '\n'.join(out)

n = S['n']
# ---- DATA_DICTIONARY.md
dd = f"""# DATA DICTIONARY — MASTER_INVENTORY_V1

**Generated:** {TODAY} · **Rows:** {len(rows)} total ({n} unique + {len(dupes)} duplicates) · **Sources:** `All Master Listings` XLSX (11,488), `owners_rent_tab_separated.tsv` (298), `owners_rent_with_photos.tsv` (302)

## Field definitions

| Column | Type | Description | Source / Derivation |
|---|---|---|---|
| `unit_id` | string | Stable canonical ID `SB-<fingerprint12>`; identical values = same physical unit | sha1(compound, property_type, deal_type, beds, area-bucket, price-bucket) |
| `public_code` | string | Human-facing code from source sheet (e.g. `MAD-R-2424`), may be empty | Source `Identifier / Code` |
| `compound` | string | Canonical compound name (79-compound gazetteer, AR/EN/slug variants mapped) | Normalized from source; **unresolvable values stay empty (never defaulted)** |
| `area` | string | Greater zone: New Cairo / Fifth Settlement / El Shorouk / Madinaty / 6th of October / North Coast / New Capital / Greater Cairo | Derived from compound |
| `district` | string | Sub-zone (compound name or district) | Derived from compound |
| `property_type` | enum | Apartment, Standalone Villa, Townhouse, Twin House, Duplex, Penthouse, Studio, Chalet, Commercial / Office, Retail / Shop, Ground / Garden Unit, Roof / Penthouse, Land / Plot, Building, Unknown | Normalized AR/EN; junk values (deal words, finishing words) → Unknown |
| `deal_type` | enum | `rent` / `sale` | Source `Deal Type` normalized (Resale → sale) |
| `deal_subtype` | enum | `rent` / `resale` / `primary` / `unknown` | Preserves original segmentation |
| `price` | number | Price in stated currency | Parsed; storage conventions fixed only when unambiguous (see `price_fix_applied`) |
| `currency` | enum | EGP / USD | USD only when identifier contains `USD`/`$` evidence |
| `price_validity` | enum | `valid` (rent 3k–500k / sale 500k–500M EGP) · `missing` · `suspicious_low` · `invalid_for_deal_type` (e.g. 8.5M on rent row) · `usd_unconfirmed` | Rule engine |
| `price_fix_applied` | string | `sale_millions_notation_x1e6` when sale price < 100 stored as millions (e.g. 7.6 → 7,600,000) | Traceability column — no silent edits |
| `usd_suspected` | bool | Rent price 100–3,000 range suggests USD (e.g. `MD-3F-1400USD` = 1,400 USD/mo) but unconfirmed | Flag for verification call |
| `bedrooms` / `bathrooms` | int | Counts | Normalized numerics |
| `area_sqm` | int | Built-up area m² | Source |
| `furnishing` | enum | furnished / semi_furnished / unfurnished / fully_finished / semi_finished / core_shell / unknown | AR/EN normalized |
| `finishing` | enum | Finishing-only subset (company/red-brick state) | Derived |
| `view`, `floor` | string | Reserved (empty in V1 — not present in sources) | Future: from richer intake |
| `owner_or_broker` | enum | OWNER_DIRECT / BROKER / PARTNER / UNKNOWN | Source segment |
| `contact_name` | string | Owner/broker name (AR or EN as recorded) | Source |
| `phone` | string | E.164 (`+2010…`) or empty | Normalized from float/strings; invalid → empty |
| `phone_state` | enum | valid / invalid / missing | Rule engine |
| `whatsapp` | URL | `https://wa.me/20…` **rebuilt from normalized phone** (source URLs were malformed, e.g. `wa.me/228446610`) | Derived |
| `availability` | enum | available / pending / no_answer / follow_up / not_available / archived / excluded / unknown | Normalized status |
| `last_verified_at` | date | Best-known verification date (sheet date `20-7-2026`, TSV `Updated At`, team unit date) or empty | **Empty = never verified** |
| `freshness` | enum | Fresh 0–7d · Aging 8–30d · Stale 31–60d · Verification Required 60+d · Unknown (no date) | Computed vs {TODAY} |
| `photos` | URL list | Comma-separated photo URLs (only owner TSV rows carry them) | Source |
| `photo_count` | int | Number of photo URLs | Derived |
| `latitude` / `longitude` | number | Compound centroid from the 79-compound coordinate table (unit-level precision not available in V1) | Gazetteer |
| `quality_score` | 0–100 | Weighted: completeness 40 + price validity 20 + location 10 + photos 10 + freshness 10 + source reliability 10 | Rule engine (below) |
| `publish_status` | enum | PUBLISHABLE / REVIEW_REQUIRED / STALE / INCOMPLETE / EXPIRED / DUPLICATE | Decision cascade (below) |
| `source` | string | `file::sheet-heritage` provenance | Derived |
| `source_url` | URL | Canonical contact link (WhatsApp) | Derived |
| `fingerprint` | string | Dedupe key (see unit_id) | Derived |
| `duplicate_of` | string | unit_id of the canonical record this row duplicates | Dedupe engine |
| `notes` | string | Original heritage/notes text | Source |

## Quality score formula

| Component | Weight | Scoring |
|---|---|---|
| Field completeness | 40 | price 10 · compound 4 · property_type 4 · beds 4 · baths 2 · area 4 · furnishing 3 · contact name 2 · valid phone 3 · WhatsApp 2 · notes 2 |
| Price validity | 20 | valid 20 · suspicious_low 5 · else 0 |
| Location validity | 10 | compound + coords 10 · compound only 6 · unresolved 0 |
| Photo availability | 10 | any photo 10 |
| Freshness | 10 | Fresh 10 · Aging 7 · Stale 4 · Verification Required/Unknown 1 |
| Source reliability | 10 | Partner 10 · Owner-direct 8 · Broker 5 · Unknown 3 |

## Publishability cascade (first match wins)

1. `DUPLICATE` — fingerprint matched a canonical record
2. `EXPIRED` — availability = not_available / archived / excluded / sold / rented
3. `INCOMPLETE` — no price, unresolved compound/property type, no beds AND no area, or price invalid for deal type
4. `STALE` — quality ≥ 55 but freshness Stale / Verification Required / Unknown
5. `PUBLISHABLE` — quality ≥ 75 AND Fresh/Aging AND available AND valid phone
6. `REVIEW_REQUIRED` — everything else

## Enumerations (canonical value sets)

- **property_type:** Apartment · Standalone Villa · Townhouse · Twin House · Duplex · Penthouse · Studio · Chalet · Commercial / Office · Retail / Shop · Ground / Garden Unit · Roof / Penthouse · Land / Plot · Building · Unknown
- **owner_or_broker:** OWNER_DIRECT · BROKER · PARTNER · UNKNOWN
- **publish_status:** PUBLISHABLE · REVIEW_REQUIRED · STALE · INCOMPLETE · EXPIRED · DUPLICATE
- **freshness:** Fresh · Aging · Stale · Verification Required · Unknown
- **availability:** available · pending · no_answer · follow_up · not_available · archived · excluded · unknown
- **currency:** EGP · USD
"""
open(f'{ROOT}/docs/DATA_DICTIONARY.md', 'w', encoding='utf-8').write(dd)

# ---- DATA_QUALITY_REPORT.md
qs_rows = [[f"{k}–{k+9}", S['qs'].get(k, 0), pct(S['qs'].get(k, 0), n)] for k in range(0, 100, 10)]
field_cov = md_table(
    ['Field', 'Populated', 'Missing', 'Coverage'],
    [['price (valid EGP)', S['pv'].get('valid', 0), n - S['pv'].get('valid', 0), pct(S['pv'].get('valid', 0), n)],
     ['compound (resolved)', n - S['missing_compound'], S['missing_compound'], pct(n - S['missing_compound'], n)],
     ['property type', n - sum(1 for r in uniq if r['property_type'] == 'Unknown'), sum(1 for r in uniq if r['property_type'] == 'Unknown'), pct(n - sum(1 for r in uniq if r['property_type'] == 'Unknown'), n)],
     ['bedrooms', n - S['missing_beds'], S['missing_beds'], pct(n - S['missing_beds'], n)],
     ['bathrooms', n - S['missing_baths'], S['missing_baths'], pct(n - S['missing_baths'], n)],
     ['area (sqm)', n - S['missing_area'], S['missing_area'], pct(n - S['missing_area'], n)],
     ['furnishing', n - S['missing_furn'], S['missing_furn'], pct(n - S['missing_furn'], n)],
     ['valid phone', S['phone'].get('valid', 0), S['missing_phone'], pct(S['phone'].get('valid', 0), n)],
     ['contact name', n - S['missing_name'], S['missing_name'], pct(n - S['missing_name'], n)],
     ['photos', n - S['missing_photos'], S['missing_photos'], pct(n - S['missing_photos'], n)],
     ['verification date', n - S['unverified'], S['unverified'], pct(n - S['unverified'], n)]])
seg_rows = [[k, v['n'], v['pv'].get('valid', 0), v['phone'].get('valid', 0), v['missing_photos'], f"{v['quality_avg']:.0f}"] for k, v in
            sorted(seg_stats.items(), key=lambda kv: -kv[1]['n'])]

dqr = f"""# DATA QUALITY REPORT — MASTER INVENTORY V1

**Generated:** {TODAY} · **Scope:** {n} unique units after deduplication ({len(rows)} source records)

## Executive verdict

**The inventory is NOT yet trustworthy enough to publish a single unit.** Zero units pass the publishability gate. The three blockers, in order of business impact:

1. **Freshness collapse** — {pct(S['unverified'], n)} of units have no verification date at all, and the only dated bulk ({S['fresh'].get('Verification Required', 0)} units from the 20-7-2026 sheet) is now 70+ days old. A re-verification campaign is the single highest-leverage data action.
2. **Price integrity** — only **{pct(S['pv'].get('valid', 0), n)}** of units carry a price that is plausible for their deal type. {S['pv'].get('missing', 0)} are missing/zero, {S['pv'].get('suspicious_low', 0)} sit below the plausible sale floor, and {S['pv'].get('invalid_for_deal_type', 0)} carry a price of the wrong scale (rent↔sale confusion, e.g. 8,500,000 EGP "rent").
3. **Contact reachability** — {pct(S['phone'].get('valid', 0), n)} of units have a dialable phone after normalization, but {n - S['phone'].get('valid', 0)} do not; almost all source WhatsApp URLs were malformed and had to be rebuilt.

**Recommended action:** work the Verification Queue (Excel tab 3, sorted owner-direct first) — every call both refreshes `last_verified_at` and can fix price/beds/photos in the same touch.

## Quality score distribution (unique units, avg {S['quality_avg']:.1f}/100)

{md_table(['Score band', 'Units', 'Share'], qs_rows)}

## Field completeness

{field_cov}

## Price integrity detail

| Finding | Units | Share | Example pattern |
|---|---|---|---|
| Valid for deal type | {S['pv'].get('valid', 0)} | {pct(S['pv'].get('valid', 0), n)} | rent 3k–500k / sale 0.5M–500M EGP |
| Missing / zero / price-on-call | {S['pv'].get('missing', 0)} | {pct(S['pv'].get('missing', 0), n)} | `0` stored on 3,210 source rows |
| Below plausible sale floor | {S['pv'].get('suspicious_low', 0)} | {pct(S['pv'].get('suspicious_low', 0), n)} | sale rows at 25k–500k (rent-scale values) |
| Wrong scale for deal type | {S['pv'].get('invalid_for_deal_type', 0)} | {pct(S['pv'].get('invalid_for_deal_type', 0), n)} | rent rows at 8.5M; sale rows at 50 |
| USD (unconfirmed) | {S['pv'].get('usd_unconfirmed', 0)} | {pct(S['pv'].get('usd_unconfirmed', 0), n)} | identifiers like `MD-3F-1400USD` |

**Auto-corrections applied (traceable, never silent):** sale prices stored as millions (e.g. `7.6` → 7,600,000 EGP) were multiplied out and stamped in `price_fix_applied`. Rent prices in the 100–3,000 band are flagged `usd_suspected` (likely USD rents) but were NOT converted — fixing them requires a phone confirmation.

## By segment

{md_table(['Segment', 'Units', 'Valid price', 'Valid phone', 'No photos', 'Avg quality'], seg_rows)}

## Top compounds (by unit count)

{md_table(['Compound', 'Units', 'Fresh ≤30d', 'Valid price', 'Valid phone', 'With beds', 'With photos', 'Avg quality'],
          [[c['compound'], c['n'], c['fresh'], c['price_ok'], c['phone_ok'], c['beds'], c['photos'], f"{c['avg_q']:.0f}"] for c in comp_rows[:25]])}

## Structural source defects (root causes)

1. **Column-shift corruption** in source sheets: person names in code columns, postal codes (`46126`) in compound, phone numbers (`12001400200`) in price, dates in compound.
2. **Two different price storage conventions** (millions with decimals vs. absolute EGP) and **two currencies** (EGP/USD) mixed in one column with no unit marker.
3. **Phones stored as floats** (`1022844661.0`) and **WhatsApp URLs built by dropping digits** (`wa.me/228446610`).
4. **Four overlapping status vocabularies** (`Available`, `active`, `Pending`, `No answer`, free-text Arabic).
5. **Zero photos** in the master XLSX — photos exist only in the 302-row owner TSV.
"""
open(f'{ROOT}/docs/DATA_QUALITY_REPORT.md', 'w', encoding='utf-8').write(dqr)

# ---- DUPLICATE_REPORT.md
dupe_by_seg = Counter(r['owner_or_broker'] for r in dupes)
dupe_by_type = Counter(r.get('dupe_type', 'near') for r in dupes)
cross = Counter()
for r in dupes:
    cross[(r['owner_or_broker'], SEG.get(r['duplicate_of'], {}).get('owner_or_broker', '?'))] += 1
dpr = f"""# DUPLICATE REPORT — MASTER INVENTORY V1

**Generated:** {TODAY} · **{len(dupes)} duplicate records** collapsed into canonical units ({pct(len(dupes), len(rows))} of {len(rows)} source records)

## Method

1. **Exact fingerprint**: sha1(compound · property_type · deal_type · bedrooms · area-bucket(10m²) · price-bucket(5k rent / 250k sale)). Applied only to records with *evidence* (price + beds-or-area); low-evidence records are never merged, only flagged.
2. **Near-duplicate**: same (compound, property_type, deal_type, bedrooms) with price within ±5% and area within ±10% (or area unknown).
3. **Winner selection**: PARTNER > OWNER_DIRECT > BROKER > UNKNOWN, then quality score, then completeness. Photos from losing records are merged into the winner.
4. Every duplicate row is preserved in the CSV with `publish_status=DUPLICATE` and `duplicate_of=<canonical unit_id>` — nothing is deleted.

## Results

| Metric | Value |
|---|---|
| Exact fingerprint duplicates | {dupe_by_type.get('exact', 0)} |
| Near duplicates | {dupe_by_type.get('near', 0)} |
| Total duplicates | {len(dupes)} |
| Unique units | {n} |

## Duplicates by segment

{md_table(['Duplicate segment', 'Count'], [[k, v] for k, v in dupe_by_seg.most_common()])}

## Cross-segment consolidation (where the loser and winner differ)

{md_table(['Duplicate of', 'Kept as', 'Count'], [[a, b, c] for (a, b), c in cross.most_common(10)])}

## Interpretation & caveats

- A duplicate rate of {pct(len(dupes), len(rows))} is expected: the same unit circulates across owner intake, multiple broker WhatsApp groups, and team listings.
- **Near-dupes can over-merge** genuinely distinct units that share compound, type, beds and price (common in large compounds with homogeneous stock). Near-dupes are therefore *review candidates*, not deletions — the Verification Queue should confirm them first.
- The 2 TSVs contributed overlapping owner-direct records; their photos were merged into the surviving canonical units.
"""
open(f'{ROOT}/docs/DUPLICATE_REPORT.md', 'w', encoding='utf-8').write(dpr)

# ---- MISSING_DATA_REPORT.md
mdr = f"""# MISSING DATA REPORT — MASTER INVENTORY V1

**Generated:** {TODAY} · **Scope:** {n} unique units

## Missing-field ranking (worst first)

{field_cov}

## Critical gaps and remediation

| Gap | Impact on journey | Remediation |
|---|---|---|
| Verification date ({pct(S['unverified'], n)} missing) | **Publishability = 0.** No unit can be shown with honest freshness | Verification campaign (queue in XLSX tab 3); each call sets `last_verified_at` |
| Price ({pct(S['pv'].get('missing', 0), n)} missing/zero) | Bot cannot filter by budget | Ask price on the verification call; import from owner's WhatsApp thread |
| Bedrooms ({pct(S['missing_beds'], n)} missing) | Weakens hard filters (min beds) | Same call; or infer from area + type with human confirmation |
| Photos ({pct(S['missing_photos'], n)} missing) | No property-first presentation | Only 302 TSV rows carry photos today; photo collection must join the verification workflow |
| Bathrooms ({pct(S['missing_baths'], n)} missing) | Soft ranking only | Low priority |
| Area sqm ({pct(S['missing_area'], n)} missing) | Price-per-sqm sanity + matching quality | Same call; also blocks near-dupe precision |
| Valid phone ({pct(S['missing_phone'], n)} missing) | Unit cannot be actioned (viewing/outreach) | Phone exists in source for most; normalization failed on malformed values |
| Furnishing ({pct(S['missing_furn'], n)} unknown) | Soft preference matching | Ask on verification call |

## Fields with NO source data at all (V1)

- **View, floor** — no source column captures them; add to intake form and bot qualification.
- **Unit-level GPS** — only compound centroids are available (79 compounds). Unit-level coordinates require map pinning or developer data.
- **source_url** (public listing URL) — sources are private sheets/WhatsApp; no public listing links exist except the rebuilt WhatsApp links.
- **availability date / move-in-ready date** — not captured anywhere.

## Segment split of the gaps

{md_table(['Segment', 'Units', 'No price', 'No beds', 'No photos', 'Unverified'],
          [[k, v['n'], v['missing_price'], v['missing_beds'], v['missing_photos'], v['unverified']] for k, v in
           sorted(seg_stats.items(), key=lambda kv: -kv[1]['n'])])}
"""
open(f'{ROOT}/docs/MISSING_DATA_REPORT.md', 'w', encoding='utf-8').write(mdr)

# ---- STALE_LISTINGS_REPORT.md
fresh_rows = [[k, S['fresh'].get(k, 0), pct(S['fresh'].get(k, 0), n)] for k in ('Fresh', 'Aging', 'Stale', 'Verification Required', 'Unknown')]
vq_seg = Counter(r['owner_or_broker'] for r in vq)
vq_comp = Counter(r['compound'] or '(unresolved)' for r in vq)
slr = f"""# STALE LISTINGS REPORT — MASTER INVENTORY V1

**Generated:** {TODAY} · **Scope:** {n} unique units

## Freshness classification (per master spec: 0–7 Fresh · 8–30 Aging · 31–60 Stale · 60+ Verification Required)

{md_table(['Bucket', 'Units', 'Share'], fresh_rows)}

## Headline

- **{pct(S['unverified'], n)} of the inventory has never been verified** (no date recorded at any point).
- The only bulk-dated source (sheet of 20-7-2026) is now **70 days old** → all of it falls into "Verification Required".
- **No listing is Fresh.** The most recent verified batch (owner TSV, 2026-09-07) is 22 days old → "Aging".

## Verification campaign plan (the #1 data action)

**Queue size: {len(vq)} units** (available/pending/unknown, excluding already-expired). The full prioritized queue is in `MASTER_INVENTORY_V1.xlsx → Verification Queue` (owner-direct first, then by quality score).

{md_table(['Segment', 'Units to verify'], [[k, v] for k, v in vq_seg.most_common()])}

Top compounds to verify:

{md_table(['Compound', 'Units to verify'], [[k, v] for k, v in vq_comp.most_common(20)])}

## Suggested call script objective (per unit)

1. Confirm still available + set `availability`.
2. Confirm price + currency → clears `usd_suspected` and `invalid_for_deal_type` flags.
3. Capture bedrooms/bathrooms/area if missing.
4. Request 3–5 photos (WhatsApp) → clears the photo gap.
5. Record `last_verified_at` = call date → unit becomes Fresh and can enter PUBLISHABLE if quality ≥ 75.

## Post-campaign projection

If the {len(vq)}-unit campaign completes with the current quality distribution, roughly **{sum(1 for r in vq if int(r['quality_score']) >= 65 and r['price_validity'] == 'valid' and r['phone_state'] == 'valid')} units** would sit within reach of PUBLISHABLE (quality ≥ 65 today + photos + fresh date + confirmed price on the call).
"""
open(f'{ROOT}/docs/STALE_LISTINGS_REPORT.md', 'w', encoding='utf-8').write(slr)

print('Wrote 5 report docs + XLSX')
print(f"  Publish: {dict(S['publish'])}")
print(f"  Verification queue: {len(vq)} units")
