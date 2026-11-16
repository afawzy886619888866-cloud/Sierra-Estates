#!/usr/bin/env python3
# ============================================================================
# generate_worklist.py — Sierra Estates enrichment queue → daily worklist CSV
# ----------------------------------------------------------------------------
# Queue = listings with status='active' AND publish_status != 'PUBLISHABLE'
# (the rows that CANNOT go on the public map yet — §21 no-fabrication: they
# stay unpublished until a human supplies real values).
#
# Each queue row is assigned exactly ONE priority defect group:
#   1. no_price            price is NULL/0
#   2. stub_5m             price == 5,000,000 (known placeholder pattern)
#   3. rent_level_on_sale  sale/resale/primary with 0 < price < 100,000
#                          (a monthly-rent number attached to a sale listing)
#   4. rent_anomaly        rent with 0 < price <= 999
#   5. no_coords           priced but latitude/longitude NULL
#   6. incomplete_fields   priced + geocoded but missing description/photos/
#                          bedrooms/bathrooms/area/code
#
# Output CSV carries current values (read-only reference) + empty `new_*`
# fill columns. Fill ONLY what you actually know — blanks are preserved
# (never invented). Then run apply_enrichment.py.
#
# Usage:
#   python3 generate_worklist.py [--out worklist_YYYY-MM-DD.csv]
# Credentials: SUPABASE_URL + SUPABASE_SECRET_KEY env vars, or an
# adjacent se.env file (SUPABASE_URL=... / SUPABASE_SECRET_KEY=...).
# ============================================================================
import argparse
import csv
import datetime as dt
import json
import os
import sys
import urllib.request

PAGE = 1000  # Supabase default max-rows silently truncates — always paginate


def load_env():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        here = os.path.dirname(os.path.abspath(__file__))
        for cand in ("se.env", "../scripts/se.env"):
            p = os.path.join(here, cand)
            if os.path.exists(p):
                for line in open(p, encoding="utf-8"):
                    line = line.strip()
                    if "=" in line and not line.startswith("#"):
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip())
                url = os.environ.get("SUPABASE_URL")
                key = os.environ.get("SUPABASE_SECRET_KEY")
                break
    if not url or not key:
        sys.exit("ERROR: set SUPABASE_URL / SUPABASE_SECRET_KEY (env or se.env)")
    return url.rstrip("/"), key


def api(base, key, path, range_header=None, method="GET", body=None):
    req = urllib.request.Request(
        f"{base}/rest/v1/{path}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "count=exact" if range_header is None else "return=minimal",
        },
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
    )
    if range_header:
        req.add_header("Range", range_header)
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read().decode()
        cr = r.headers.get("Content-Range") or ""
        return (json.loads(raw) if raw else []), cr


def fetch_queue(base, key):
    sel = ",".join([
        "id", "ref_id", "code", "unit_code", "title", "compound",
        "location_area", "city", "deal_type", "property_type", "price",
        "price_currency", "bedrooms", "bathrooms", "area_sqm", "latitude",
        "longitude", "description", "images", "photo_count", "owner_name",
        "owner_phone", "broker_name", "broker_phone", "sync_source",
        "created_at",
    ])
    path = (f"listings?select={sel}&status=eq.active"
            "&publish_status=neq.PUBLISHABLE&order=created_at.desc")
    rows, cr = api(base, key, path)
    total = int(cr.split("/")[-1]) if cr and "/" in cr else len(rows)
    all_rows = list(rows)
    while len(all_rows) < total:  # paginate past the 1000-row silent cap
        lo, hi = len(all_rows), len(all_rows) + PAGE - 1
        page, _ = api(base, key, path, range_header=f"{lo}-{hi}")
        if not page:
            break
        all_rows.extend(page)
    return all_rows, total


def num(v):
    return float(v) if v not in (None, "") else None


def classify(r):
    price = num(r.get("price"))
    deal = (r.get("deal_type") or "").lower()
    lat, lng = num(r.get("latitude")), num(r.get("longitude"))
    has_desc = bool((r.get("description") or "").strip())
    n_img = len(r.get("images") or []) or (r.get("photo_count") or 0)
    if price is None or price == 0:
        return "no_price", "price is NULL/0"
    if price == 5000000:
        return "stub_5m", "price == 5,000,000 placeholder"
    if deal in ("sale", "resale", "primary") and 0 < price < 100000:
        return "rent_level_on_sale", f"sale listing priced at rent level ({price:,.0f}/mo?)"
    if deal == "rent" and 0 < price <= 999:
        return "rent_anomaly", f"rent price <= 999 ({price:,.0f})"
    if lat is None or lng is None:
        return "no_coords", "priced but missing latitude/longitude"
    missing = []
    if not has_desc:
        missing.append("description")
    if not n_img:
        missing.append("photos")
    if not (r.get("bedrooms") or 0):
        missing.append("bedrooms")
    if not (r.get("bathrooms") or 0):
        missing.append("bathrooms")
    if not num(r.get("area_sqm")):
        missing.append("area_sqm")
    if not (r.get("code") or r.get("unit_code") or r.get("ref_id")):
        missing.append("code")
    return "incomplete_fields", "missing: " + ",".join(missing)


CSV_META = [
    "defect_group", "defect_detail", "id", "ref_id", "code", "title",
    "compound", "location_area", "deal_type", "property_type", "price",
    "bedrooms", "bathrooms", "area_sqm", "latitude", "longitude",
    "desc_preview", "photo_count", "owner_name", "owner_phone",
    "broker_name", "broker_phone", "sync_source",
]
CSV_FILL = [
    "new_price", "new_deal_type", "new_property_type", "new_bedrooms",
    "new_bathrooms", "new_area_sqm", "new_latitude", "new_longitude",
    "new_description", "new_image_urls", "new_owner_name", "new_owner_phone",
    "new_broker_name", "new_broker_phone", "notes",
]


def main():
    ap = argparse.ArgumentParser(
        description="Sierra Estates enrichment queue → daily worklist CSV")
    ap.add_argument("--out", default=None, help="output CSV path")
    args = ap.parse_args()
    base, key = load_env()
    out = args.out or dt.date.today().strftime("worklist_%Y-%m-%d.csv")

    rows, total = fetch_queue(base, key)
    if len(rows) != total:
        print(f"WARN: fetched {len(rows)} of {total} (pagination issue)")

    groups = {}
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(CSV_META + CSV_FILL)
        for r in rows:
            g, d = classify(r)
            groups[g] = groups.get(g, 0) + 1
            desc = (r.get("description") or "").strip().replace("\n", " ")
            w.writerow([
                g, d, r.get("id"), r.get("ref_id"), r.get("code") or r.get("unit_code"),
                (r.get("title") or "")[:80], r.get("compound"),
                r.get("location_area") or r.get("city"), r.get("deal_type"),
                r.get("property_type"), r.get("price"), r.get("bedrooms"),
                r.get("bathrooms"), r.get("area_sqm"), r.get("latitude"),
                r.get("longitude"), desc[:80],
                len(r.get("images") or []) or r.get("photo_count") or 0,
                r.get("owner_name"), r.get("owner_phone"),
                r.get("broker_name"), r.get("broker_phone"),
                r.get("sync_source"),
            ] + [""] * len(CSV_FILL))

    n_contact = sum(1 for r in rows if r.get("owner_phone") or r.get("broker_phone"))
    print(f"\nWorklist written: {out}")
    print(f"Queue rows: {len(rows)} (DB reports {total})")
    print("\nDefect groups (priority-ordered, mutually exclusive):")
    for g in ("no_price", "stub_5m", "rent_level_on_sale", "rent_anomaly",
              "no_coords", "incomplete_fields"):
        print(f"  {g:20s} {groups.get(g, 0):>6,}")
    print(f"  {'TOTAL':20s} {len(rows):>6,}")
    print(f"\nRows already carrying a phone contact: {n_contact} "
          f"({100.0 * n_contact / max(len(rows), 1):.1f}%) — verify/correct in new_* columns")
    print("\nNext: fill new_* columns for what you KNOW, then run apply_enrichment.py")


if __name__ == "__main__":
    main()
