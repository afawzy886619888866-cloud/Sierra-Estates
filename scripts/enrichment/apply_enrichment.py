#!/usr/bin/env python3
"""Sierra Estates — guarded enrichment apply (rebuilt 2026-10-11).

Reads the staff-filled worklist CSV and patches Supabase rows with the new_*
values. GUARDS (anti-fabrication, §21 — these are features, not bugs):

  · price is settable ONLY where the DB price is empty/0 OR the row is flagged
    price_issue (placeholder / rent-scale / out-of-band / missing)
  · price coherence is validated before writing:
      rent      → EGP 1,000 – 5,000,000 / month
      sale/resale → EGP ≥ 1,000,000
    (incoherent values are REJECTED with the reason — the row stays deferred)
  · description / photos / bedrooms / bathrooms / area are FILL-EMPTY-ONLY
  · photo URLs must be http(s)://
  · every patch is written to audit_logs (actor, target, before, after)

Default is DRY-RUN (prints the plan, writes nothing). Use --apply to write.

Usage:  python3 apply_enrichment.py worklist.csv [--apply]
Env:    SUPABASE_URL / SUPABASE_SECRET_KEY (scripts/se.env fallback)
"""
import csv, json, os, subprocess, sys
from datetime import datetime, timezone

def load_env():
    for line in open(os.path.join(os.path.dirname(__file__), '..', '..', 'scripts', 'se.env')):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

load_env()
URL = os.environ.get('SUPABASE_URL')
SEC = os.environ.get('SUPABASE_SECRET_KEY')

H = ['apikey: ' + SEC, 'Authorization: Bearer ' + SEC, 'Content-Type: application/json']

def rest(method, path, payload=None, extra=None):
    cmd = ['curl', '-s', '--max-time', '90', '-X', method, URL + path]
    for h in H + (extra or []):
        cmd += ['-H', h]
    if payload is not None:
        cmd += ['-d', json.dumps(payload)]
    return subprocess.run(cmd, capture_output=True, text=True).stdout

def fetch_row(listing_id):
    out = rest('GET', f'/rest/v1/listings?id=eq.{listing_id}&select=*')
    try:
        rows = json.loads(out)
        return rows[0] if rows else None
    except Exception:
        return None

def price_ok(deal, price):
    if deal == 'rent':
        return 1000 <= price <= 5000000, f'rent {price:,} outside EGP 1k–5M/mo band'
    if deal in ('sale', 'resale'):
        return price >= 1000000, f'{deal} {price:,} below EGP 1M floor'
    return True, ''

def num(v):
    try:
        return float(str(v).replace(',', '').strip())
    except (TypeError, ValueError):
        return None

def main():
    if len(sys.argv) < 2:
        sys.exit('usage: apply_enrichment.py worklist.csv [--apply]')
    path = sys.argv[1]
    apply = '--apply' in sys.argv
    if not (URL and SEC):
        sys.exit('FATAL: SUPABASE_URL / SUPABASE_SECRET_KEY not set')

    filled = [r for r in csv.DictReader(open(path))
              if any(r.get(k) for k in r if k.startswith('new_'))]
    print(f'worklist rows: {sum(1 for _ in open(path)) - 1} · rows with new_* '
          f'values: {len(filled)} · mode: {"APPLY" if apply else "DRY-RUN"}\n')

    planned, rejected, applied = [], [], 0
    for r in filled:
        lid, note = r['listing_id'], []
        db = fetch_row(lid)
        if not db:
            rejected.append((lid, 'row not found in DB')); continue
        deal = (r.get('new_deal_type') or db.get('deal_type') or '').lower()

        patch, before = {}, {}
        # price — guarded
        np_ = num(r.get('new_price'))
        if np_ is not None:
            db_price = db.get('price') or 0
            flag_issue = bool(r.get('price_issue'))
            if db_price and not flag_issue:
                rejected.append((lid, f'price already set ({db_price:,}) and not flagged — fill-empty-only rule'))
                continue
            ok, why = price_ok(deal, np_)
            if not ok:
                rejected.append((lid, 'price coherence: ' + why)); continue
            patch['price'] = np_; before['price'] = db_price
            if r.get('new_price_currency'):
                patch['price_currency'] = r['new_price_currency']
        if r.get('new_deal_type'):
            patch['deal_type'] = r['new_deal_type']; before['deal_type'] = db.get('deal_type')
            deal = r['new_deal_type'].lower()
            if 'price' in patch:
                ok, why = price_ok(deal, patch['price'])
                if not ok:
                    rejected.append((lid, 'price coherence after relabel: ' + why)); continue
        # fill-EMPTY-only fields
        for col, field in [('new_description', 'description'), ('new_bedrooms', 'bedrooms'),
                           ('new_bathrooms', 'bathrooms'), ('new_area_sqm', 'area_sqm'),
                           ('new_compound_or_area', 'compound')]:
            v = (r.get(col) or '').strip()
            if not v:
                continue
            if db.get(field) not in (None, '', 0):
                note.append(f'{field}: DB already set — skipped')
                continue
            patch[field] = num(v) if field in ('bedrooms', 'bathrooms', 'area_sqm') else v
            before[field] = db.get(field)
        # photos — http(s) only
        if r.get('new_photo_urls'):
            urls = [u.strip() for u in r['new_photo_urls'].split('|') if u.strip()]
            bad = [u for u in urls if not u.lower().startswith('http')]
            if bad:
                rejected.append((lid, f'non-http photo urls: {bad[:2]}')); continue
            if not (db.get('images') or []):
                patch['images'] = urls; before['images'] = db.get('images')
            else:
                note.append('photos: DB already set — skipped')
        # geo
        for col, field in [('new_latitude', 'latitude'), ('new_longitude', 'longitude')]:
            v = num(r.get(col))
            if v is not None and not db.get(field):
                patch[field] = v; before[field] = db.get(field)

        if not patch:
            rejected.append((lid, 'nothing applicable (all fill-only fields already set)'))
            continue
        patch['updated_at'] = datetime.now(timezone.utc).isoformat()
        planned.append((lid, patch, before, note, r.get('verified_by') or 'staff',
                        r.get('call_notes') or ''))

    for lid, patch, before, note, actor, cn in planned:
        print(f'PLANNED {lid}: {list(patch.keys())}' + (f'  [{"; ".join(note)}]' if note else ''))
    for lid, why in rejected:
        print(f'REJECTED {lid}: {why}')

    if not apply:
        print(f'\ndry-run: {len(planned)} planned, {len(rejected)} rejected — nothing written')
        return

    for lid, patch, before, note, actor, cn in planned:
        out = rest('PATCH', f'/rest/v1/listings?id=eq.{lid}', patch, ['Prefer: return=minimal'])
        if out.strip():
            print(f'FAIL {lid}: {out[:160]}'); continue
        applied += 1
        audit = {
            'actor_email': 'enrichment@sierra-estates.local',
            'action': 'enrichment:staff_fill',
            'target': f'listings:{lid}',
            'before': before,
            'after': {**patch, 'note': f'staff enrichment via worklist (verified_by={actor}; {cn[:200]})'},
        }
        rest('POST', '/rest/v1/audit_logs', [audit], ['Prefer: return=minimal'])
        print(f'APPLIED {lid} (+audit)')

    print(f'\napplied {applied}/{len(planned)} · rejected {len(rejected)} '
          f'(rejected rows stay deferred — that is the gate working)')

if __name__ == '__main__':
    main()
