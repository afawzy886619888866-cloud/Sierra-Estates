#!/usr/bin/env python3
# ============================================================================
# apply_enrichment.py — apply human-filled new_* columns to the live database
# ----------------------------------------------------------------------------
# Reads the worklist CSV produced by generate_worklist.py. For every row where
# at least one `new_*` column is filled, validates the fill against the
# anti-fabrication guards, then (with --apply) PATCHes the listing and writes
# an audit_logs row. WITHOUT --apply it is a pure dry-run: ZERO writes.
#
# GUARDS (§21 no-fabrication — rejecting a fill is the system working):
#   G1  new_price must parse to a positive number
#   G2  deal rent            : 1,000 <= price <= 500,000  (EGP/month)
#   G3  deal sale/resale/etc.: price >= 100,000            (45,000 = rent
#                               level on a sale listing -> REJECTED)
#                               price <= 500,000,000 sanity ceiling
#   G4  price == 5,000,000 on a stub_5m row -> REJECTED unless notes contains
#       '5m-confirmed' (it is the known placeholder pattern)
#   G5  rent price <= 999 -> REJECTED (placeholder pattern)
#   G6  new_latitude  in 22.0..31.6, new_longitude in 24.0..37.0 (Egypt bounds)
#   G7  new_image_urls: http(s):// only — file:// or bare paths REJECTED
#   G8  new_description: >= 20 non-space characters
#   G9  new_deal_type in {sale, rent, resale, primary}
#   G10 numeric columns (bedrooms/bathrooms/area_sqm) must parse clean
#
# Usage:
#   python3 apply_enrichment.py worklist_2026-10-12.csv           # dry-run
#   python3 apply_enrichment.py worklist_2026-10-12.csv --apply   # write
# ============================================================================
import argparse
import csv
import datetime as dt
import json
import os
import sys
import urllib.request

FILLABLE = {
    "new_price": ("price", "float"),
    "new_deal_type": ("deal_type", "deal"),
    "new_property_type": ("property_type", "str"),
    "new_bedrooms": ("bedrooms", "int"),
    "new_bathrooms": ("bathrooms", "int"),
    "new_area_sqm": ("area_sqm", "float"),
    "new_latitude": ("latitude", "float"),
    "new_longitude": ("longitude", "float"),
    "new_description": ("description", "str"),
    "new_image_urls": ("images", "images"),
    "new_owner_name": ("owner_name", "str"),
    "new_owner_phone": ("owner_phone", "str"),
    "new_broker_name": ("broker_name", "str"),
    "new_broker_phone": ("broker_phone", "str"),
}
DEALS = {"sale", "rent", "resale", "primary"}


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


def api(base, key, path, method="GET", body=None):
    req = urllib.request.Request(
        f"{base}/rest/v1/{path}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation" if method == "GET" else "return=minimal",
        },
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read().decode()
        return json.loads(raw) if raw else []


def parse_val(col, raw, row):
    """Validate one fill. Returns (ok, value_or_reason)."""
    kind = FILLABLE[col][1]
    s = (raw or "").strip()
    if kind == "float":
        try:
            v = float(s.replace(",", ""))
        except ValueError:
            return False, f"{col}: not a number ({s!r})"
        if col == "new_price":
            if v <= 0:
                return False, "new_price must be positive"
            deal = (row.get("new_deal_type") or row.get("deal_type") or "").strip().lower()
            if deal == "rent":
                if v <= 999:
                    return False, f"rent price {v:,.0f} <= 999 (placeholder pattern)"
                if v > 500000:
                    return False, f"rent price {v:,.0f} > 500,000/month (sale level?)"
            elif deal in DEALS:
                if v < 100000:
                    return False, (f"sale price {v:,.0f} < 100,000 — looks like a "
                                   f"monthly rent on a sale listing")
                if v > 500000000:
                    return False, f"sale price {v:,.0f} above 500M sanity ceiling"
            if v == 5000000 and row.get("defect_group") == "stub_5m":
                if "5m-confirmed" not in (row.get("notes") or "").lower():
                    return False, ("price 5,000,000 equals the stub pattern — put "
                                   "'5m-confirmed' in notes if genuinely 5M")
        if col == "new_latitude" and not (22.0 <= v <= 31.6):
            return False, f"latitude {v} outside Egypt bounds 22.0..31.6"
        if col == "new_longitude" and not (24.0 <= v <= 37.0):
            return False, f"longitude {v} outside Egypt bounds 24.0..37.0"
        return True, v
    if kind == "int":
        try:
            v = int(float(s))
        except ValueError:
            return False, f"{col}: not an integer ({s!r})"
        return True, v
    if kind == "deal":
        if s.lower() not in DEALS:
            return False, f"new_deal_type {s!r} not in {sorted(DEALS)}"
        return True, s.lower()
    if kind == "images":
        urls = [u.strip() for u in s.split(",") if u.strip()]
        for u in urls:
            if not u.lower().startswith(("http://", "https://")):
                return False, f"image URL rejected ({u[:60]}…): http(s):// only, file:// forbidden"
        return True, urls
    if col == "new_description" and len(s) < 20:
        return False, f"new_description too short ({len(s)} chars, need >= 20)"
    return True, s


def main():
    ap = argparse.ArgumentParser(
        description="Apply worklist new_* fills (guarded, audited, dry-run by default)")
    ap.add_argument("csv", help="worklist CSV from generate_worklist.py")
    ap.add_argument("--apply", action="store_true",
                    help="actually write (default: dry-run, zero writes)")
    args = ap.parse_args()
    base, key = load_env()

    with open(args.csv, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    plans, rejects, skipped = [], [], 0
    for row in rows:
        fills = {c: row[c].strip() for c in FILLABLE if (row.get(c) or "").strip()}
        if not fills:
            skipped += 1
            continue
        changes, reasons = {}, []
        for col, raw in fills.items():
            ok, val = parse_val(col, raw, row)
            if ok:
                changes[FILLABLE[col][0]] = val
            else:
                reasons.append(val)
        if reasons:
            rejects.append((row.get("id"), row.get("code") or row.get("ref_id"), reasons))
        else:
            plans.append((row.get("id"), row.get("code") or row.get("ref_id"), changes))

    print(f"Worklist rows:     {len(rows)}")
    print(f"  no fills:        {skipped}")
    print(f"  accepted plans:  {len(plans)}")
    print(f"  rejected fills:  {len(rejects)}  (guards held — see below)")
    for rid, code, reasons in rejects[:40]:
        print(f"    REJECT {code or rid}: " + "; ".join(reasons))
    if len(rejects) > 40:
        print(f"    … and {len(rejects) - 40} more")

    if not args.apply:
        print("\nDRY-RUN: no database writes happened. Re-run with --apply to write.")
        for rid, code, ch in plans[:10]:
            print(f"  would PATCH {code or rid}: {json.dumps(ch, ensure_ascii=False)[:160]}")
        if len(plans) > 10:
            print(f"  … and {len(plans) - 10} more")
        return

    if not plans:
        print("\nNothing to apply.")
        return

    wrote, failed = 0, 0
    for rid, code, ch in plans:
        try:
            cur = api(base, key,
                      f"listings?select=id,price,deal_type,latitude,longitude,"
                      f"description,images,bedrooms,bathrooms,area_sqm&id=eq.{rid}")
            before = {k: cur[0].get(k) for k in ch} if cur else {}
            api(base, key, f"listings?id=eq.{rid}", method="PATCH", body=ch)
            api(base, key, "audit_logs", method="POST", body={
                "action": "enrichment.apply",
                "target": rid,
                "before": before,
                "after": ch,
                "actor_uid": "sierra-enrichment-workflow",
                "actor_email": "ops+enrichment@sierra-estates.net",
            })
            wrote += 1
            print(f"  WROTE {code or rid}: {list(ch.keys())}")
        except Exception as e:  # noqa: BLE001 — report and continue
            failed += 1
            print(f"  ERROR {code or rid}: {e}")
    print(f"\nApplied: {wrote} rows, {failed} errors. "
          f"Run recheck_and_publish.py to move passing rows to PUBLISHABLE.")


if __name__ == "__main__":
    main()
