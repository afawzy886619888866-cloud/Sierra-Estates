#!/usr/bin/env python3
"""Sierra Estates — map-viability recheck & publish (rebuilt 2026-10-11).

Re-examines every DEFERRED row (status=active, publish_status=REVIEW_REQUIRED)
and publishes the rows that are now map-viable. The gate mirrors what the app
actually DISPLAYS (derived from /api/listings/submit + the map card):

  REQUIRED (all must be real and coherent):
    · title · code · property_type · deal_type
    · location: compound OR location_area (geo follows below)
    · geo: real lat/lng, OR compound in the GPS-verified gazetteer
      (honest centroid pin, approxLocation=true — the route's designed
      matchedGeo placement)
    · price coherent: rent EGP 1k–5M/mo · sale/resale ≥ EGP 1M
  HOLD-BACKS (never auto-publish):
    · uniform placeholder EGP 5,000,000 (ingest default across the source chain)
    · rent-scale price on sale/resale rows (classification-vs-price conflict)
    · rent outside the plausible band (USD suspects etc.)
    · no location AND no resolvable compound → cannot place a pin
  OPTIONAL (missing is FINE — the map card renders '?' per PR #292):
    description · photos · bedrooms · bathrooms · area

Default DRY-RUN (prints the verdict per row). --apply publishes in batches of
100 with one audit_logs row per listing.

Usage:  python3 recheck_and_publish.py [--apply]
Env:    SUPABASE_URL / SUPABASE_SECRET_KEY (scripts/se.env fallback)
"""
import json, os, subprocess, sys
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
}

def rest(method, path, payload=None, extra=None):
    cmd = ['curl', '-s', '--max-time', '90', '-X', method, URL + path,
           '-H', 'apikey: ' + SEC, '-H', 'Authorization: Bearer ' + SEC]
    for h in (extra or []):
        cmd += ['-H', h]
    if payload is not None:
        cmd += ['-H', 'Content-Type: application/json', '-d', json.dumps(payload)]
    return subprocess.run(cmd, capture_output=True, text=True).stdout

def fetch_deferred():
    fields = ('id,code,ref_id,title,compound,location_area,property_type,deal_type,'
              'price,latitude,longitude,publish_status')
    rows, off = [], 0
    while True:
        out = rest('GET', f'/rest/v1/listings?select={fields}&status=eq.active'
                          f'&publish_status=eq.REVIEW_REQUIRED&order=id.asc'
                          f'&limit=1000&offset={off}')
        page = json.loads(out)
        if not page:
            break
        rows += page
        if len(page) < 1000:
            break
        off += 1000
    return rows

def verdict(l):
    """(viable, geo_patch, reason). geo_patch = centroid fill when compound
    is gazetteer-resolvable and coordinates are missing."""
    deal = (l.get('deal_type') or '').lower()
    price = l.get('price') or 0
    if not (l.get('title') and (l.get('code') or l.get('ref_id'))
            and l.get('property_type') and deal):
        return False, None, 'missing a displayed hard field (title/code/type/deal_type)'
    if not price:
        return False, None, 'no price — nothing honest to display on a price pin'
    if deal in ('sale', 'resale'):
        if price == 5000000:
            return False, None, 'placeholder EGP 5M (ingest default) — hold back'
        if price < 1000000:
            return False, None, f'rent-scale {price:,} on {deal} row — conflict, confirm with owner'
    elif deal == 'rent':
        if not (1000 <= price <= 5000000):
            return False, None, f'rent {price:,} outside plausible band — per-row check'
    compound = (l.get('compound') or '').strip()
    if not (compound or l.get('location_area')):
        return False, None, 'no location — cannot place a pin'
    if l.get('latitude') and l.get('longitude'):
        return True, None, 'geo present'
    if compound in GAZETTEER:
        lat, lng = GAZETTEER[compound]
        return True, {'latitude': lat, 'longitude': lng}, \
            f'geo via gazetteer centroid for {compound} (approxLocation)'
    return False, None, 'no coordinates and compound not in gazetteer'

def main():
    apply = '--apply' in sys.argv
    if not (URL and SEC):
        sys.exit('FATAL: SUPABASE_URL / SUPABASE_SECRET_KEY not set')

    rows = fetch_deferred()
    print(f'deferred rows: {len(rows)} · mode: {"APPLY" if apply else "DRY-RUN"}')

    viable, blocked = [], {}
    for l in rows:
        ok, geo, why = verdict(l)
        if ok:
            viable.append((l, geo, why))
        else:
            blocked[why.split('—')[0].strip()] = blocked.get(why.split('—')[0].strip(), 0) + 1

    print(f'viable: {len(viable)} · blocked: {len(rows) - len(viable)}')
    for k, n in sorted(blocked.items(), key=lambda x: -x[1]):
        print(f'  {n:>5}  {k}')

    now = datetime.now(timezone.utc).isoformat()
    published = 0
    for i in range(0, len(viable), 100):
        batch = viable[i:i + 100]
        if not apply:
            for l, geo, why in batch[:5]:
                print(f'  would publish {l["code"]}: {why}')
            continue
        ids = '(' + ','.join(f'"{l["id"]}"' for l, _, _ in batch) + ')'
        out = rest('PATCH', f'/rest/v1/listings?id=in.{ids}',
                   {'publish_status': 'PUBLISHABLE', 'updated_at': now},
                   ['Prefer: return=minimal'])
        if out.strip():
            print(f'FAIL batch {i // 100 + 1}: {out[:200]}'); continue
        published += len(batch)
        audit = [{
            'actor_email': 'agent@sierra-estates.local',
            'action': 'publish_status:PUBLISHABLE',
            'target': f'listings:{l["id"]}',
            'before': {'publish_status': 'REVIEW_REQUIRED'},
            'after': {'publish_status': 'PUBLISHABLE',
                      'note': f'enrichment recheck: map-viable ({why})'},
        } for l, _, why in batch]
        rest('POST', '/rest/v1/audit_logs', audit, ['Prefer: return=minimal'])
        print(f'published batch {i // 100 + 1}: {len(batch)} rows (+audit)')

    if apply:
        print(f'\npublished {published}/{len(viable)} — run generate_worklist.py '
              f'again for the remaining deferred rows')
    else:
        print('\ndry-run — nothing written. Re-run with --apply to publish.')

if __name__ == '__main__':
    main()
