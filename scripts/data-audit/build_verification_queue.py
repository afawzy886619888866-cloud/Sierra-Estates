#!/usr/bin/env python3
"""
SIERRA BLU — PHASE C3/C4/C6 VERIFICATION QUEUE BUILDER
======================================================
Input : data/MASTER_INVENTORY_V1.csv  (real Phase-1 pipeline output — no fabrication)
Output: data/VERIFICATION_QUEUE_V1.csv / .xlsx + console summary

Implements the activation plan:
  C3 priority order   : 1. OWNER_DIRECT  2. PARTNER  3. HIGH-QUALITY BROKER  4. REMAINING BROKER
  C3 sub-priority     : quality + reachable contact + price present + beds present + strong compound
  C4 capture checklist: per-unit missing-field flags the verification call must capture
  C6 publishing gate  : readiness = satisfied gate criteria (verified, available, valid price,
                        valid type, usable location, valid contact, quality>=75, freshness)
  C5 photos policy    : photo_count >= 3 flagged for every unit (master inventory has none)

The queue EXCLUDES duplicates and already-expired units. It fabricates nothing:
every field reflects the pipeline's actual data; missing stays missing.
"""
import csv, os, sys
from collections import Counter

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

ROOT = os.environ.get('SE_PIPELINE_ROOT',
                      os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CSV_IN = f'{ROOT}/data/MASTER_INVENTORY_V1.csv'
CSV_OUT = f'{ROOT}/data/VERIFICATION_QUEUE_V1.csv'
XLSX_OUT = f'{ROOT}/data/VERIFICATION_QUEUE_V1.xlsx'
PILOT_N = 100          # shortlist size (first 50 = initial target, next 50 = pipeline)
PHOTO_MIN = 3          # C5 minimum real photos

# ---------------------------------------------------------------- load
with open(CSV_IN, encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

def b(v):  # blank -> None
    return v.strip() if v and v.strip() else None

# ---------------------------------------------------------------- gate helpers (C6)
def gate(r):
    """Which C6 publishing-gate criteria this unit ALREADY satisfies (pre-verification)."""
    ok = {}
    ok['g1_available']   = r['availability'] == 'available'
    ok['g2_price']       = r['price_validity'] == 'valid'
    ok['g3_type']        = b(r['property_type']) not in (None, 'Unknown')
    ok['g4_location']    = b(r['compound']) is not None
    ok['g5_contact']     = r['phone_state'] == 'valid'
    ok['g6_quality']     = int(r['quality_score']) >= 75
    ok['g7_freshness']   = r['freshness'] in ('Fresh', 'Aging')   # needs re-verify otherwise
    ok['g8_photos']      = int(r['photo_count'] or 0) >= PHOTO_MIN
    return ok

GATE_LABELS = {
    'g1_available': 'available', 'g2_price': 'price', 'g3_type': 'type',
    'g4_location': 'location', 'g5_contact': 'contact', 'g6_quality': 'quality>=75',
    'g7_freshness': 'fresh-verify', 'g8_photos': f'photos>={PHOTO_MIN}',
}

# ---------------------------------------------------------------- queue
queue, excluded = [], Counter()
for r in rows:
    ps = r['publish_status']
    if ps == 'DUPLICATE':  excluded['DUPLICATE'] += 1;  continue
    if ps == 'EXPIRED':    excluded['EXPIRED'] += 1;    continue

    g = gate(r)
    missing = [GATE_LABELS[k] for k, v in g.items() if not v]

    # C4 capture checklist — what the verification call must capture/confirm
    capture = []
    if not g['g1_available']:   capture.append('available?')
    if not g['g2_price']:       capture.append('price?+currency?')
    if not g['g3_type']:        capture.append('property_type?')
    if b(r['bedrooms']) is None:      capture.append('bedrooms?')
    if b(r['bathrooms']) is None:     capture.append('bathrooms?')
    if b(r['area_sqm']) is None:      capture.append('area?')
    if b(r['furnishing']) is None:    capture.append('furnishing?')
    if not g['g8_photos']:      capture.append(f'photos? (need {PHOTO_MIN}-5 real, prefer 10-15 HD)')
    if b(r['contact_name']) is None: capture.append('owner/broker name?')
    if not g['g5_contact']:     capture.append('reachable phone?')
    if not g['g4_location']:    capture.append('compound/location?')

    # C3 priority group
    cls = r['owner_or_broker']
    if cls == 'OWNER_DIRECT':          pri = 1
    elif cls == 'PARTNER':             pri = 2
    elif cls == 'BROKER' and int(r['quality_score']) >= 75: pri = 3   # high-quality broker
    else:                              pri = 4

    # C3 sub-priority: quality + reachable + price + beds + strong compound
    sub = (int(r['quality_score'])
           + (25 if g['g5_contact'] else 0)
           + (20 if g['g2_price'] else 0)
           + (15 if b(r['bedrooms']) is not None else 0)
           + (15 if g['g4_location'] else 0))

    q = dict(r)
    q['priority_group'] = pri
    q['readiness'] = 8 - len(missing)                # satisfied gate criteria (of 8)
    q['missing_criteria'] = '; '.join(missing)
    q['verify_checklist'] = '; '.join(capture)
    q['sub_priority_score'] = sub
    queue.append(q)

# sort: priority group -> readiness desc -> sub-score desc -> quality desc
queue.sort(key=lambda q: (q['priority_group'], -q['readiness'], -q['sub_priority_score'], -int(q['quality_score'])))

# ---------------------------------------------------------------- write CSV
FIELDS = list(queue[0].keys()) if queue else []
with open(CSV_OUT, 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=FIELDS)
    w.writeheader()
    w.writerows(queue)

# ---------------------------------------------------------------- write XLSX (ops deliverable)
HDR_FILL = PatternFill('solid', fgColor='0B2333')
HDR_FONT = Font(name='Calibri', bold=True, color='FFFFFF', size=11)
THIN_BORDER = openpyxl.styles.Border(*[openpyxl.styles.Side(style='thin', color='D0D7DE')] * 4)

def sheet_from_rows(ws, hdrs, recs, widths=None):
    ws.append(hdrs)
    for c in ws[1]:
        c.fill, c.font = HDR_FILL, HDR_FONT
        c.alignment = Alignment(horizontal='center')
    for rec in recs:
        ws.append([rec.get(h, '') for h in hdrs])
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.border = THIN_BORDER
    for i, h in enumerate(hdrs, 1):
        ws.column_dimensions[get_column_letter(i)].width = (widths or {}).get(h, 16)

wb = openpyxl.Workbook()

# Tab 1 — Pilot shortlist (first calls)
ws1 = wb.active
ws1.title = 'Pilot Shortlist'
pilot_hdrs = ['priority_group', 'public_code', 'compound', 'property_type', 'deal_type',
              'price', 'currency', 'bedrooms', 'area_sqm', 'owner_or_broker', 'contact_name',
              'phone', 'whatsapp', 'quality_score', 'readiness', 'missing_criteria',
              'verify_checklist', 'photo_count', 'last_verified_at', 'source']
sheet_from_rows(ws1, pilot_hdrs, queue[:PILOT_N],
                {'verify_checklist': 52, 'missing_criteria': 38, 'contact_name': 20, 'compound': 22})

# Tab 2 — Full queue
ws2 = wb.create_sheet('Full Queue')
sheet_from_rows(ws2, FIELDS, queue, {'verify_checklist': 52, 'missing_criteria': 38})

# Tab 3 — Group/segment summary
ws3 = wb.create_sheet('Summary')
by_group = Counter(q['priority_group'] for q in queue)
by_class = Counter(q['owner_or_broker'] for q in queue)
by_missing = Counter(len(q['missing_criteria'].split(';')) if q['missing_criteria'] else 0 for q in queue)
summary = [['Metric', 'Value']]
summary += [['Queue size (unique, non-duplicate, non-expired)', len(queue)]]
summary += [['Excluded duplicates', excluded['DUPLICATE']], ['Expired', excluded['EXPIRED']]]
summary += [[f'Priority group {g} units', n] for g, n in sorted(by_group.items())]
summary += [[f'{k} units', v] for k, v in by_class.most_common()]
summary += [[f'units missing exactly {m} gate criteria', n] for m, n in sorted(by_missing.items())]
sheet_from_rows(ws3, ['Metric', 'Value'], [{'Metric': a, 'Value': b} for a, b in summary], {'Metric': 52})

wb.save(XLSX_OUT)

# ---------------------------------------------------------------- console summary
print(f'Queue: {len(queue)} units (excluded: {dict(excluded)})')
print('Priority groups:', dict(sorted(by_group.items())))
print('Owner class:', dict(by_class.most_common()))
print('Missing-criteria histogram (gate criteria NOT yet satisfied, of 8):', dict(sorted(by_missing.items())))
best = max((8 - m for m in by_missing), default=0)
print(f'Best readiness in queue: {best}/8 — units at that level: {by_missing.get(8 - best, 0)}')
print(f'Wrote {CSV_OUT} ({len(queue)} rows)')
print(f'Wrote {XLSX_OUT} (tabs: Pilot Shortlist / Full Queue / Summary)')
print('\n=== PILOT SHORTLIST (first 25 of {}) ==='.format(PILOT_N))
for q in queue[:25]:
    print(f"G{q['priority_group']} | ready {q['readiness']}/8 | q{q['quality_score']:>3} | "
          f"{(q['compound'] or 'UNKNOWN'):<22} | {q['property_type']:<10} | {q['deal_type']:<4} | "
          f"{(q['price'] or 'NO PRICE'):<9} {q['currency'] or '':<3} | {q['owner_or_broker']:<12} | "
          f"{(q['phone'] if q['phone_state']=='valid' else 'phone INVALID'):<18} | missing: {q['missing_criteria']}")
