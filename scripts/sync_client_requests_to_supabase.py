#!/usr/bin/env python3
"""
scripts/sync_client_requests_to_supabase.py

Syncs the 1,569 isolated client requests from
Sierra_Estates_Master_Inventory_Clean.xlsx into Supabase public.client_requests.
"""

import os
import openpyxl
from supabase import create_client

def load_env():
    env_paths = [
        os.path.join(os.path.dirname(__file__), "se.env"),
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env.local"),
        os.path.join(os.path.dirname(__file__), "..", "apps", "sierra-estates-realty", ".env.local"),
    ]
    for p in env_paths:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip().strip("'\""))

load_env()

URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SECRET_KEY")

if not URL or not KEY:
    print("[Error] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

sb = create_client(URL, KEY)

EXCEL_PATH = r"I:\supabase\Lm studio\Sierra_Estates_Master_Inventory_Clean.xlsx"
if not os.path.exists(EXCEL_PATH):
    EXCEL_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "Sierra_Estates_Master_Inventory_Clean.xlsx")

print(f"[Sync] Loading Client_Requests from {EXCEL_PATH}...")
wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True, read_only=True)
ws = wb["Client_Requests"]

rows = list(ws.iter_rows(values_only=True))
header = rows[0]
print(f"[Sync] Header: {header}")

requests_to_insert = []
seen_codes = set()

for idx, r in enumerate(rows[1:], start=1):
    req_code = str(r[0] or f"REQ-{idx:04d}").strip()
    if req_code in seen_codes:
        req_code = f"{req_code}-{idx}"
    seen_codes.add(req_code)

    name = str(r[1] or "Client").strip()
    phone = str(r[2] or "").strip()
    # Ensure phone_normalized is not empty for required column
    phone_normalized = phone if phone else f"0100000{idx:04d}"[-11:]
    if not phone_normalized.startswith("+"):
        if phone_normalized.startswith("01"):
            phone_normalized = "+20" + phone_normalized[1:]
        elif phone_normalized.startswith("20"):
            phone_normalized = "+" + phone_normalized

    deal_raw = str(r[4] or "Rent").strip().capitalize()
    deal_type = "Sale" if "Sale" in deal_raw or "Resale" in deal_raw else "Rent"

    compound = str(r[5] or "New Cairo").strip()
    budget = float(r[6]) if isinstance(r[6], (int, float)) else 0.0
    if budget > 999_999_999: # Cap anomalous numbers
        budget = None
    bedrooms = int(r[7]) if isinstance(r[7], (int, float)) else None
    area = float(r[8]) if isinstance(r[8], (int, float)) else None
    notes = str(r[9] or "").strip()

    payload = {
        "request_code": req_code,
        "client_name": name,
        "phone_normalized": phone_normalized,
        "transaction_type": deal_type,
        "property_type": "Apartment",
        "compound_zone": compound,
        "budget_egp": budget if (budget is not None and budget > 0) else None,
        "area_sqm": area if area and area > 0 else None,
        "bedrooms": bedrooms if bedrooms and bedrooms > 0 else None,
        "status": "New",
        "notes": notes if notes else f"Imported from Master Sheet {req_code}",
        "source": "master_excel_import"
    }
    requests_to_insert.append(payload)

wb.close()
print(f"[Sync] Prepared {len(requests_to_insert)} client requests.")

# Batch insert into Supabase
BATCH_SIZE = 100
total_inserted = 0

for i in range(0, len(requests_to_insert), BATCH_SIZE):
    batch = requests_to_insert[i:i+BATCH_SIZE]
    try:
        res = sb.table("client_requests").upsert(batch, on_conflict="request_code").execute()
        total_inserted += len(batch)
        print(f"[Sync] Upserted batch {i//BATCH_SIZE + 1} ({total_inserted}/{len(requests_to_insert)})")
    except Exception as e:
        print(f"[Sync] Batch {i//BATCH_SIZE + 1} error: {e}")

print(f"[Sync] Completed! Total client requests synced to Supabase: {total_inserted}")
