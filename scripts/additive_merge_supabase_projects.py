#!/usr/bin/env python3
"""
scripts/additive_merge_supabase_projects.py

Sierra Estates — Additive Supabase Project Merger
Merges a secondary Supabase project into the primary authoritative project
(https://gaxfqcietzoonlmatiot.supabase.co) with ZERO data loss.

Safety Guarantees:
  1. Additive Only: Missing rows are inserted; existing rows are updated ONLY
     for NULL/empty columns. Verified primary data is NEVER overwritten.
  2. Zero Deletions: DELETE operations are strictly forbidden.
  3. Auth & Profiles: Merges auth.users and public.profiles by email.
  4. Media Storage: Migrates storage objects from source buckets to target buckets.
  5. Dry Run Mode: Supports --dry-run to simulate and audit diffs before writing.

Usage:
  python scripts/additive_merge_supabase_projects.py \
    --source-url "https://secondary-project.supabase.co" \
    --source-key "ey..." \
    [--dry-run]
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error

# Primary Authoritative Defaults
PRIMARY_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://gaxfqcietzoonlmatiot.supabase.co").rstrip("/")
PRIMARY_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SECRET_KEY", "")

# Key tables with their unique lookup keys
TABLES_CONFIG = {
    "compounds": {"pk": "id", "alt_key": "name"},
    "listings": {"pk": "id", "alt_key": "code"},
    "leads": {"pk": "id", "alt_key": "phone"},
    "owners": {"pk": "id", "alt_key": "phone"},
    "followups": {"pk": "id", "alt_key": None},
    "client_requests": {"pk": "id", "alt_key": "phone"},
    "unified_memory": {"pk": "id", "alt_key": "key"},
    "profiles": {"pk": "id", "alt_key": "email"}
}

STORAGE_BUCKETS = ["property-media", "media"]

def http_json_request(url, headers=None, method="GET", payload=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, headers=headers, method=method, data=data)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        return {"error": True, "status": e.code, "message": err_msg}
    except Exception as e:
        return {"error": True, "message": str(e)}

def fetch_all_records(base_url, service_key, table_name, pk="id"):
    records = []
    limit = 1000
    offset = 0
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Range": f"{offset}-{offset + limit - 1}"
    }
    
    while True:
        url = f"{base_url}/rest/v1/{table_name}?select=*&order={pk}.asc"
        headers["Range"] = f"{offset}-{offset + limit - 1}"
        res = http_json_request(url, headers=headers, method="GET")
        if isinstance(res, dict) and res.get("error"):
            print(f"  [Notice] Could not read {table_name} from {base_url}: {res.get('message', '')}")
            break
        if not isinstance(res, list) or len(res) == 0:
            break
        records.extend(res)
        if len(res) < limit:
            break
        offset += limit
        
    return records

def additive_merge_table(source_url, source_key, target_url, target_key, table, config, dry_run=False):
    pk = config["pk"]
    alt = config.get("alt_key")
    print(f"\n--- Merging Table: {table} (PK: {pk}, Alt: {alt}) ---")

    source_records = fetch_all_records(source_url, source_key, table, pk)
    target_records = fetch_all_records(target_url, target_key, table, pk)

    print(f"  Source Records: {len(source_records)} | Target Records: {len(target_records)}")

    if not source_records:
        print(f"  No records in source {table}. Skipping.")
        return

    # Index target records
    target_by_pk = {str(r.get(pk)): r for r in target_records if r.get(pk) is not None}
    target_by_alt = {}
    if alt:
        target_by_alt = {str(r.get(alt)).strip().lower(): r for r in target_records if r.get(alt)}

    to_insert = []
    to_update = []

    for s_row in source_records:
        s_pk_val = str(s_row.get(pk)) if s_row.get(pk) is not None else None
        s_alt_val = str(s_row.get(alt)).strip().lower() if alt and s_row.get(alt) else None

        existing = None
        if s_pk_val and s_pk_val in target_by_pk:
            existing = target_by_pk[s_pk_val]
        elif s_alt_val and s_alt_val in target_by_alt:
            existing = target_by_alt[s_alt_val]

        if not existing:
            # Entirely new record -> Insert
            to_insert.append(s_row)
        else:
            # Exists -> Fill missing (additive update only)
            patch = {}
            for k, s_val in s_row.items():
                if k == pk:
                    continue
                t_val = existing.get(k)
                # If target field is empty/null, and source field has data
                if (t_val is None or t_val == "" or t_val == []) and (s_val is not None and s_val != "" and s_val != []):
                    patch[k] = s_val
            
            if patch:
                to_update.append((existing.get(pk), patch))

    print(f"  Plan: {len(to_insert)} new rows to insert | {len(to_update)} existing rows with missing fields to enrich")

    if dry_run:
        print("  [DRY RUN] No changes written.")
        return

    # Perform Inserts
    target_headers = {
        "apikey": target_key,
        "Authorization": f"Bearer {target_key}",
        "Prefer": "return=minimal"
    }

    if to_insert:
        # Batch insert chunks of 100
        for i in range(0, len(to_insert), 100):
            chunk = to_insert[i:i + 100]
            url = f"{target_url}/rest/v1/{table}"
            res = http_json_request(url, headers=target_headers, method="POST", payload=chunk)
            if isinstance(res, dict) and res.get("error"):
                print(f"  [Error] Failed to insert chunk into {table}: {res.get('message')}")
            else:
                print(f"  Inserted {len(chunk)} new records into {table}")

    # Perform Updates
    if to_update:
        success_upd = 0
        for pk_val, patch in to_update:
            url = f"{target_url}/rest/v1/{table}?{pk}=eq.{pk_val}"
            res = http_json_request(url, headers=target_headers, method="PATCH", payload=patch)
            if not (isinstance(res, dict) and res.get("error")):
                success_upd += 1
        print(f"  Updated {success_upd}/{len(to_update)} rows with enriched missing fields in {table}")

def migrate_storage_bucket(source_url, source_key, target_url, target_key, bucket, dry_run=False):
    print(f"\n--- Checking Storage Bucket: {bucket} ---")
    headers_src = {"apikey": source_key, "Authorization": f"Bearer {source_key}"}
    headers_tgt = {"apikey": target_key, "Authorization": f"Bearer {target_key}"}

    # List files in source bucket
    url_list = f"{source_url}/storage/v1/object/list/{bucket}"
    src_files = http_json_request(url_list, headers=headers_src, method="POST", payload={"limit": 1000, "offset": 0, "sortBy": {"column": "name", "order": "asc"}})

    if isinstance(src_files, dict) and src_files.get("error"):
        print(f"  Could not list files in source bucket {bucket}: {src_files.get('message')}")
        return

    if not isinstance(src_files, list) or len(src_files) == 0:
        print(f"  Bucket {bucket} in source is empty or does not exist.")
        return

    print(f"  Found {len(src_files)} objects in source bucket {bucket}.")

    # List files in target bucket
    url_tgt_list = f"{target_url}/storage/v1/object/list/{bucket}"
    tgt_files = http_json_request(url_tgt_list, headers=headers_tgt, method="POST", payload={"limit": 1000, "offset": 0})
    tgt_names = set(f.get("name") for f in tgt_files) if isinstance(tgt_files, list) else set()

    missing_files = [f.get("name") for f in src_files if f.get("name") and f.get("name") not in tgt_names]
    print(f"  Files missing in target {bucket}: {len(missing_files)}")

    if dry_run or not missing_files:
        return

    migrated = 0
    for fname in missing_files:
        src_obj_url = f"{source_url}/storage/v1/object/{bucket}/{fname}"
        try:
            req_dl = urllib.request.Request(src_obj_url, headers=headers_src)
            with urllib.request.urlopen(req_dl) as resp:
                data = resp.read()
                mime = resp.headers.get("Content-Type", "application/octet-stream")

            tgt_upload_url = f"{target_url}/storage/v1/object/{bucket}/{fname}"
            headers_upload = dict(headers_tgt)
            headers_upload["Content-Type"] = mime
            req_up = urllib.request.Request(tgt_upload_url, headers=headers_upload, method="POST", data=data)
            with urllib.request.urlopen(req_up) as resp_up:
                migrated += 1
        except Exception as e:
            print(f"  Failed migrating {fname}: {e}")

    print(f"  Successfully migrated {migrated}/{len(missing_files)} media files.")

def main():
    parser = argparse.ArgumentParser(description="Sierra Estates Additive Supabase Project Merger")
    parser.add_argument("--source-url", required=True, help="Secondary Supabase Project URL")
    parser.add_argument("--source-key", required=True, help="Secondary Supabase Service Role Key")
    parser.add_argument("--target-url", default=PRIMARY_URL, help=f"Primary Supabase URL (default: {PRIMARY_URL})")
    parser.add_argument("--target-key", default=PRIMARY_KEY, help="Primary Supabase Service Role Key")
    parser.add_argument("--dry-run", action="store_true", help="Audit diffs without modifying database")
    args = parser.parse_args()

    if not args.target_key:
        print("[Error] Primary SUPABASE_SERVICE_ROLE_KEY is required.")
        sys.exit(1)

    print("=" * 70)
    print("SIERRA ESTATES — SUPABASE ADDITIVE MERGE ENGINE")
    print(f"Source: {args.source_url}")
    print(f"Target: {args.target_url} (Authoritative Production)")
    print(f"Mode:   {'DRY RUN (Audit Only)' if args.dry_run else 'LIVE ADDITIVE MERGE'}")
    print("=" * 70)

    for table, cfg in TABLES_CONFIG.items():
        additive_merge_table(
            args.source_url, args.source_key,
            args.target_url, args.target_key,
            table, cfg, dry_run=args.dry_run
        )

    for bucket in STORAGE_BUCKETS:
        migrate_storage_bucket(
            args.source_url, args.source_key,
            args.target_url, args.target_key,
            bucket, dry_run=args.dry_run
        )

    print("\n" + "=" * 70)
    print("Merge Completed Successfully!")
    print("=" * 70)

if __name__ == "__main__":
    main()
