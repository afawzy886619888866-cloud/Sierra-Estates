#!/usr/bin/env python3
# ============================================================================
# recheck_and_publish.py — publish gate for the enrichment loop
# ----------------------------------------------------------------------------
# Re-fetches every queue row (status='active' AND publish_status != PUBLISHABLE),
# re-evaluates the 12-field completeness gate, and reports how many rows would
# pass. With --apply, passing rows are promoted to publish_status='PUBLISHABLE'
# (+ published_at / verified_at / verified_by) and an audit_logs row is written
# per promotion. Rows that still fail are left untouched — §21 no-fabrication:
# missing data stays unpublished until a human supplies real values.
#
# 12-FIELD GATE (a row must satisfy ALL):
#   title, description, price (present AND deal-sane), bedrooms, bathrooms,
#   area_sqm, location (area/city/compound), geo (lat+lng), photos, code
#   (code/unit_code/ref_id), property_type, deal_type
#   price sanity: rent 1,000..500,000 | sale/resale/primary >= 100,000
#
# Usage:
#   python3 recheck_and_publish.py            # dry-run report
#   python3 recheck_and_publish.py --apply    # promote passing rows
#   python3 recheck_and_publish.py --ids id1,id2   # limit to specific ids
# ============================================================================
import argparse
import csv
import datetime as dt
import json
import os
import sys
import urllib.request

PAGE = 1000
SEL = ("id,ref_id,code,unit_code,title,compound,location_area,city,deal_type,"
       "property_type,price,bedrooms,bathrooms,area_sqm,latitude,longitude,"
       "description,images,photo_count,publish_status")


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


def fetch(base, key, path):
    rows, cr = api(base, key, path)
    total = int(cr.split("/")[-1]) if cr and "/" in cr else len(rows)
    all_rows = list(rows)
    while len(all_rows) < total:
        lo, hi = len(all_rows), len(all_rows) + PAGE - 1
        page, _ = api(base, key, path, range_header=f"{lo}-{hi}")
        if not page:
            break
        all_rows.extend(page)
    return all_rows


def gate(r):
    """Returns (passed, [failed field names])."""
    fails = []
    if not (r.get("title") or "").strip():
        fails.append("title")
    if not (r.get("description") or "").strip():
        fails.append("description")
    price = float(r.get("price") or 0)
    deal = (r.get("deal_type") or "").lower()
    if price <= 0:
        fails.append("price")
    elif deal == "rent" and not (1000 <= price <= 500000):
        fails.append("price(sanity:rent)")
    elif deal in ("sale", "resale", "primary") and price < 100000:
        fails.append("price(sanity:sale)")
    if not (r.get("bedrooms") or 0):
        fails.append("bedrooms")
    if not (r.get("bathrooms") or 0):
        fails.append("bathrooms")
    if not float(r.get("area_sqm") or 0):
        fails.append("area_sqm")
    if not ((r.get("location_area") or r.get("city") or r.get("compound") or "").strip()):
        fails.append("location")
    if r.get("latitude") is None or r.get("longitude") is None:
        fails.append("geo")
    if not (r.get("images") or []) and not (r.get("photo_count") or 0):
        fails.append("photos")
    if not (r.get("code") or r.get("unit_code") or r.get("ref_id")):
        fails.append("code")
    if not (r.get("property_type") or "").strip():
        fails.append("property_type")
    if not deal:
        fails.append("deal_type")
    return (not fails), fails


def main():
    ap = argparse.ArgumentParser(
        description="Publish gate: recheck enrichment queue, promote passing rows")
    ap.add_argument("--apply", action="store_true",
                    help="promote passing rows (default: dry-run report)")
    ap.add_argument("--ids", default=None, help="comma-separated listing ids to limit to")
    ap.add_argument("--worklist", default=None,
                    help="optional worklist CSV — limits recheck to its ids")
    args = ap.parse_args()
    base, key = load_env()

    ids = None
    if args.ids:
        ids = [x.strip() for x in args.ids.split(",") if x.strip()]
    elif args.worklist:
        with open(args.worklist, newline="", encoding="utf-8-sig") as f:
            ids = [r["id"].strip() for r in csv.DictReader(f) if r.get("id")]

    path = f"listings?select={SEL}&status=eq.active&publish_status=neq.PUBLISHABLE&order=created_at.desc"
    if ids:
        path += f"&id=in.({','.join(ids)})"
    rows = fetch(base, key, path)

    passing = [(r, []) for r in rows if gate(r)[0]]
    failing = [(r, gate(r)[1]) for r in rows if not gate(r)[0]]

    print(f"Rechecked {len(rows)} queue rows"
          + (f" (limited to {len(ids)} ids)" if ids else "") + ":")
    print(f"  PASS the 12-field gate : {len(passing)}")
    print(f"  still failing          : {len(failing)}")
    from collections import Counter
    c = Counter(f for _, fl in failing for f in fl)
    for field, n in c.most_common(15):
        print(f"    {field:22s} {n:>6,}")

    if not args.apply:
        print("\nDRY-RUN: nothing written. Re-run with --apply to promote passing rows.")
        return
    if not passing:
        print("\nNothing to promote.")
        return

    now = dt.datetime.now(dt.timezone.utc).isoformat()
    wrote = 0
    for r, _ in passing:
        try:
            api(base, key, f"listings?id=eq.{r['id']}", method="PATCH", body={
                "publish_status": "PUBLISHABLE",
                "published_at": now,
                "verified_at": now,
                "verified_by": "sierra-enrichment-workflow",
            })
            api(base, key, "audit_logs", method="POST", body={
                "action": "enrichment.publish",
                "target": r["id"],
                "before": {"publish_status": r.get("publish_status")},
                "after": {"publish_status": "PUBLISHABLE",
                          "verified_by": "sierra-enrichment-workflow"},
                "actor_uid": "sierra-enrichment-workflow",
                "actor_email": "ops+enrichment@sierra-estates.net",
            })
            wrote += 1
        except Exception as e:  # noqa: BLE001
            print(f"  ERROR {r.get('code') or r['id']}: {e}")
    print(f"\nPromoted {wrote}/{len(passing)} rows to PUBLISHABLE. "
          f"They appear on the public map on the next request "
          f"(Vercel serves /api/inventory uncached/dynamically).")


if __name__ == "__main__":
    main()
