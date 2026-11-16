#!/usr/bin/env python3
"""Sierra Estates — enrichment worklist generator (v3, rebuilt 2026-10-11).

Pulls every DEFERRED row (status=active, publish_status=REVIEW_REQUIRED) from
Supabase, classifies each into a cohort, joins REAL contacts from the
consolidated master xlsx (broker Record IDs + owner sheets via the INV- code
scheme), and emits a priority-ordered staff worklist CSV.

Staff fills ONLY the new_* columns by calling owners/brokers. The apply step
(apply_enrichment.py) enforces fill-EMPTY-only + price-coherence — a filled
value can never overwrite real existing data, and nothing is ever invented.

Usage:
  python3 generate_worklist.py [out.csv]
Env: SUPABASE_URL, SUPABASE_SECRET_KEY (reads /home/z/my-project/scripts/se.env
as fallback). XLSX path defaults to repo/data/…_All_Sheets.xlsx.
"""
import csv, hashlib, json, os, re, subprocess, sys
from datetime import datetime, timezone

# ── env ──────────────────────────────────────────────────────────────────────
def load_env():
    for line in open(os.path.join(os.path.dirname(__file__), '..', '..', 'scripts', 'se.env')):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

load_env()
URL = os.environ.get('SUPABASE_URL')
SEC = os.environ.get('SUPABASE_SECRET_KEY')
if not URL or not SEC:
    sys.exit('FATAL: SUPABASE_URL / SUPABASE_SECRET_KEY not set')

XLSX = os.environ.get('SE_XLSX', os.path.join(
    os.path.dirname(__file__), '..', '..', 'repo', 'data',
    'Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx'))

# ── compound gazetteer (from components/Maps/compounds-data.ts, GPS-verified) ─
GAZETTEER = {
    "Hyde Park": (30.008, 31.645), "Mountain View iCity": (30.014, 31.618),
    "Mivida": (30.007, 31.589), "Madinaty": (30.0984, 31.6288),
    "Cairo Plaza": (30.129, 31.312), "Al Rehab": (30.0608, 31.4936),
    "Uptown Cairo": (30.0189, 31.3094), "Cairo Festival City": (30.0275, 31.4089),
    "Eastown": (30.0195, 31.4985), "Villette": (30.0125, 31.5312),
    "Palm Hills New Cairo": (30.0118, 31.5188), "Swan Lake Residence": (30.0521, 31.4682),
    "Fifth Square": (30.0412, 31.5123), "Taj City": (30.065, 31.531),
    "Lake View Residence": (30.0225, 31.4812), "Badya": (29.9281, 30.8711),
    "Zed East": (30.095, 31.61), "Katameya Heights": (29.99, 31.48),
    "The Waterway": (30.028, 31.612), "Stone Residence": (30.028, 31.557),
    "The Square": (30.033, 31.542), "El Patio Oro": (30.029, 31.56),
    "90 Avenue": (30.028, 31.572), "Galleria Moon Valley": (30.02, 31.55),
    "District 5": (30.012, 31.5), "Sarai": (30.005, 31.66),
    "Bloomfields": (30.06, 31.67), "Al Narges": (30.052, 31.47),
    "Al Banafsaj": (30.045, 31.485), "Al Andalus": (30.052, 31.49),
    "South Academy": (30.005, 31.44), "North 90th": (30.03, 31.47),
    "Gardenia City": (30.082, 31.412),
    "General New Cairo Area (Unspecified Sector)": (30.0263, 31.4913),
    "El Narges & Choueifat Area": (30.0142, 31.4421),
}

def rest(path, extra_h=None, method='GET', payload=None):
    cmd = ['curl', '-s', '--max-time', '90', '-X', method, URL + path,
           '-H', 'apikey: ' + SEC, '-H', 'Authorization: Bearer ' + SEC]
    for h in (extra_h or []):
        cmd += ['-H', h]
    if payload is not None:
        cmd += ['-H', 'Content-Type: application/json', '-d', json.dumps(payload)]
    return subprocess.run(cmd, capture_output=True, text=True).stdout

def fetch_deferred():
    """All REVIEW_REQUIRED active listings, paginated 1000/page (.range —
    Supabase max-rows silently caps plain requests, see PR #294)."""
    fields = ('id,code,ref_id,title,compound,location_area,city,property_type,deal_type,'
              'price,price_currency,bedrooms,bathrooms,area_sqm,description,images,'
              'owner_name,owner_phone,broker_name,broker_phone,latitude,longitude,'
              'source_channel,publish_status,'
              'updated_at')
    rows, off = [], 0
    while True:
        out = rest(f'/rest/v1/listings?select={fields}&status=eq.active'
                   f'&publish_status=eq.REVIEW_REQUIRED&order=id.asc'
                   f'&limit=1000&offset={off}')
        try:
            page = json.loads(out)
        except Exception:
            sys.exit(f'FATAL: bad Supabase response at offset {off}: {out[:200]}')
        if not page:
            break
        rows += page
        if len(page) < 1000:
            break
        off += 1000
    return rows

# ── xlsx contacts (broker sheets by Record ID; owner sheets via INV- scheme) ─
def norm_phone(p):
    d = re.sub(r'\D', '', str(p or ''))
    return d[-10:] if len(d) >= 10 else d

def inv_id(phone, code):
    key = f'{norm_phone(phone)}|{str(code or "").strip().upper()}'
    return 'INV-' + hashlib.sha256(key.encode()).hexdigest()[:12].upper()

def load_contacts():
    import openpyxl
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    by_rec, by_inv = {}, {}
    def rowv(r, i):
        return r[i] if i < len(r) else None
    for sheet, cols in [
        ('Broker Rent Network', {'rec': 0, 'name': 11, 'phone': 12, 'wa': 13, 'price': 6}),
        ('Broker Sale & Resale', {'rec': 0, 'name': 11, 'phone': 12, 'wa': 13, 'price': 6}),
    ]:
        ws = wb[sheet]
        it = ws.iter_rows(values_only=True)
        next(it)  # header
        for r in it:
            rec = str(rowv(r, cols['rec']) or '').strip()
            if not rec:
                continue
            by_rec[rec] = {
                'contact_name': str(rowv(r, cols['name']) or '').strip() or None,
                'phone': str(rowv(r, cols['phone']) or '').strip() or None,
                'whatsapp': str(rowv(r, cols['wa']) or '').strip() or None,
                'src_price': rowv(r, cols['price']),
            }
    for sheet, cols in [
        ('Direct Owners - Rent', {'code': 0, 'name': 1, 'phone': 2, 'wa': 12, 'price': 8}),
        ('Direct Owners - Resale', {'code': 0, 'name': 1, 'phone': 2, 'wa': 13, 'price': 5}),
    ]:
        ws = wb[sheet]
        it = ws.iter_rows(values_only=True)
        next(it)
        for r in it:
            code = str(rowv(r, cols['code']) or '').strip()
            phone = rowv(r, cols['phone'])
            if not code or not phone:
                continue
            iid = inv_id(phone, code)
            by_inv[iid] = {
                'contact_name': str(rowv(r, cols['name']) or '').strip() or None,
                'phone': str(phone or '').strip() or None,
                'whatsapp': str(rowv(r, cols['wa']) or '').strip() or None,
                'src_price': rowv(r, cols['price']),
            }
    return by_rec, by_inv

# ── cohort / diagnosis ───────────────────────────────────────────────────────
def classify(l):
    """Returns (cohort, price_issue, missing_fields, diagnosis)."""
    price = l.get('price') or 0
    deal = (l.get('deal_type') or '').lower()
    missing = []
    if not l.get('description'):
        missing.append('description')
    if not (l.get('images') or []):
        missing.append('photos')
    if l.get('bedrooms') is None:
        missing.append('bedrooms')
    if l.get('bathrooms') is None:
        missing.append('bathrooms')
    if not (l.get('area_sqm') or 0):
        missing.append('area_sqm')

    geo_ok = bool(l.get('latitude') and l.get('longitude'))
    compound = (l.get('compound') or '').strip()
    geo_resolvable = compound in GAZETTEER

    price_issue, cohort, diag = None, None, None
    if deal in ('sale', 'resale'):
        if price == 5000000:
            cohort, price_issue = 'placeholder_5M', 'placeholder'
            diag = ('uniform EGP 5M across source chain = ingest default, '
                    'not a real asking price')
        elif 0 < price < 1000000:
            cohort, price_issue = 'rent_scale_on_sale', 'rent_scale'
            diag = ('price < EGP 1M on a sale/resale row — source sheet carries '
                    'the same value; confirm with owner')
    elif deal == 'rent':
        if price and (price < 1000 or price > 5000000):
            cohort, price_issue = 'rent_out_of_band', 'out_of_band'
            diag = ('rent outside plausible EGP 1k–5M/mo band — per-row check: '
                    'USD suspect / sale-scale-on-rent / phone-as-price')
        elif not price:
            cohort, price_issue = 'no_price', 'missing'
    if price and deal in ('sale', 'resale') and not price_issue and price < 1000000:
        pass  # covered above
    if not price and cohort is None:
        cohort, price_issue = 'no_price', 'missing'
    if not geo_ok and not geo_resolvable and cohort is None:
        cohort = 'no_geo'
        diag = 'no coordinates and compound not in gazetteer — cannot place a pin'
    if cohort is None:
        cohort = 'incomplete_fields'
    return cohort, price_issue, missing, diag

PRIORITY = {'no_price': 0, 'rent_scale_on_sale': 1, 'placeholder_5M': 2,
            'rent_out_of_band': 3, 'rent_scale_on_resale': 1,
            'no_geo': 5, 'incomplete_fields': 4}

def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        f'worklist_enrichment_{datetime.now():%Y%m%d}.csv')

    print('fetching deferred rows from Supabase …')
    rows = fetch_deferred()
    print(f'  deferred rows: {len(rows)}')
    print('loading xlsx contacts …')
    by_rec, by_inv = load_contacts()
    print(f'  broker Record IDs: {len(by_rec)} · owner INV- IDs: {len(by_inv)}')

    out = []
    for l in rows:
        cohort, price_issue, missing, diag = classify(l)
        code = l.get('code') or l.get('ref_id') or ''
        c = by_rec.get(str(code).strip()) or by_inv.get(str(code).strip())
        suggested = {
            'no_price': 'call contact: get monthly rent or sale price (EGP)',
            'rent_scale_on_sale': 'confirm with owner: real sale price or relabel deal_type',
            'placeholder_5M': 'confirm with owner: real asking price (EGP 5M is an ingest default)',
            'rent_out_of_band': 'verify price + currency on call (USD suspect?)',
            'no_geo': 'get compound/area or coordinates from owner',
            'incomplete_fields': 'fill missing fields from owner call',
        }[cohort]
        out.append({
            'listing_id': l['id'], 'code': code, 'title': l.get('title') or '',
            'compound': l.get('compound') or l.get('location_area') or '',
            'deal_type': l.get('deal_type') or '', 'property_type': l.get('property_type') or '',
            'db_price': l.get('price') or '', 'price_issue': price_issue or '',
            'cohort': cohort, 'missing_fields': '|'.join(missing),
            'diagnosis': diag or '', 'owner_name': l.get('owner_name') or '',
            'owner_phone': l.get('owner_phone') or '',
            'broker_name': l.get('broker_name') or '',
            'broker_phone': l.get('broker_phone') or '',
            'contact_name': (c or {}).get('contact_name') or '',
            'contact_phone': (c or {}).get('phone') or '',
            'whatsapp': (c or {}).get('whatsapp') or '',
            'src_price_hint': (c or {}).get('src_price') or '',  # VERIFY ON CALL — never auto-applied
            'suggested_action': suggested,
            # ── staff fills ONLY these (apply step enforces the guards) ──
            'new_price': '', 'new_price_currency': '',
            'new_deal_type': '', 'new_description': '',
            'new_photo_urls': '', 'new_bedrooms': '', 'new_bathrooms': '',
            'new_area_sqm': '', 'new_compound_or_area': '',
            'new_latitude': '', 'new_longitude': '',
            'verified_by': '', 'call_notes': '',
        })

    out.sort(key=lambda r: (PRIORITY.get(r['cohort'], 9),
                            0 if (r['contact_phone'] or r['whatsapp']) else 1))
    with open(out_path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
        w.writeheader()
        w.writerows(out)

    n_contact = sum(1 for r in out if r['contact_phone'] or r['whatsapp'])
    print(f'\nwrote {out_path}: {len(out)} rows')
    from collections import Counter
    print('cohorts:', dict(Counter(r['cohort'] for r in out)))
    print(f'rows with real contacts: {n_contact} '
          f'({100 * n_contact // max(1, len(out))}%)')

if __name__ == '__main__':
    main()
