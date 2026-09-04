#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Inventory and Active Memory Comprehensive Comparison & Spreadsheet Generator
Reconciles master inventory (Airtable/Excel) with agent active memory (obsidian-store.json)
"""

import os
import sys
import csv
import json
from collections import Counter

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OBSIDIAN_PATH = os.path.join(ROOT_DIR, "obsidian-store.json")
CSV_INVENTORY_PATH = os.path.join(ROOT_DIR, "Inventory_with_Photos_Airtable.csv")
OUTPUT_ALL_CSV = os.path.join(ROOT_DIR, "inventory_all_units_and_memory_comparison.csv")
OUTPUT_AUDIT_CSV = os.path.join(ROOT_DIR, "memory_units_audit.csv")

def main():
    print("=" * 60)
    print("📊 Loading Inventory and Memory Records...")
    print("=" * 60)

    # 1. Load memory listings from obsidian-store.json
    if not os.path.exists(OBSIDIAN_PATH):
        print(f"Error: {OBSIDIAN_PATH} not found!")
        sys.exit(1)

    with open(OBSIDIAN_PATH, "r", encoding="utf-8") as f:
        obsidian_data = json.load(f)

    memory_listings = {}
    for k, v in obsidian_data.items():
        item = v.get("value", v)
        if isinstance(item, dict) and (k.startswith("listing-") or "sierraCode" in item or "price" in item):
            memory_listings[k] = {
                "memory_id": k,
                "sierraCode": str(item.get("sierraCode", "")).strip(),
                "type": str(item.get("type", "")).strip(),
                "location": str(item.get("location", "")).strip(),
                "compound": str(item.get("compound", "")).strip(),
                "price": float(item.get("price", 0) or 0),
                "currency": str(item.get("currency", "EGP")).strip(),
                "area_sqm": float(item.get("area_sqm", 0) or 0),
                "bedrooms": int(item.get("bedrooms", 0) or 0),
                "bathrooms": int(item.get("bathrooms", 0) or 0),
                "finishing": str(item.get("finishing", "")).strip(),
                "status": str(item.get("status", "available")).strip(),
                "sourceType": str(item.get("sourceType", "agent-memory")).strip(),
                "contact_info": str(item.get("contact_info", "")).strip(),
                "whatsappGroupId": str(item.get("whatsappGroupId", "")).strip(),
                "whatsappGroupName": str(item.get("whatsappGroupName", "")).strip(),
                "notes": str(item.get("notes", "")).replace("\r", " ").replace("\n", " ").strip(),
                "createdAt": str(item.get("createdAt", v.get("createdAt", ""))).strip(),
                "matched_inventory_ids": []
            }

    print(f"✅ Loaded {len(memory_listings)} units from active agent memory (obsidian-store.json)")

    # 2. Load inventory CSV
    if not os.path.exists(CSV_INVENTORY_PATH):
        print(f"Error: {CSV_INVENTORY_PATH} not found!")
        sys.exit(1)

    inventory_records = []
    with open(CSV_INVENTORY_PATH, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            inventory_records.append(row)

    print(f"✅ Loaded {len(inventory_records)} units from master catalog CSV")

    # 3. Matching & Reconciliation
    print("\n🔍 Cross-referencing Inventory records with Agent Memory...")
    
    # Pre-index memory by normalized keys for rapid multi-dimensional matching
    mem_by_code = {}
    for k, m in memory_listings.items():
        if m["sierraCode"]:
            mem_by_code[m["sierraCode"].lower()] = k

    matched_inventory_count = 0
    inventory_with_memory_matches = []

    for inv in inventory_records:
        rec_id = inv.get("\ufeffRecordID") or inv.get("RecordID") or ""
        inv_loc = (inv.get("Location") or inv.get("Zone") or "").strip().lower()
        inv_type = (inv.get("PropertyType") or "").strip().lower()
        inv_fp = (inv.get("UnitFingerprint") or "").strip().lower()
        try:
            inv_price = float(inv.get("PriceEGP") or 0)
        except:
            inv_price = 0.0
        try:
            inv_area = float(inv.get("AreaSqm") or 0)
        except:
            inv_area = 0.0

        matched_mem_id = None
        match_type = None

        # Check Strategy 1: Code in Fingerprint
        for code_lower, mem_id in mem_by_code.items():
            if code_lower in inv_fp:
                matched_mem_id = mem_id
                match_type = "CODE_FINGERPRINT_MATCH"
                break

        # Check Strategy 2: Location + Type + Price exact
        if not matched_mem_id and inv_price > 0:
            for mem_id, mem in memory_listings.items():
                m_loc = (mem["compound"] or mem["location"]).lower()
                m_type = mem["type"].lower()
                if mem["price"] == inv_price:
                    if (m_loc in inv_loc or inv_loc in m_loc) and (m_type in inv_type or inv_type in m_type):
                        matched_mem_id = mem_id
                        match_type = "EXACT_LOCATION_TYPE_PRICE"
                        break

        # Check Strategy 3: Price + Area exact
        if not matched_mem_id and inv_price > 0 and inv_area > 0:
            for mem_id, mem in memory_listings.items():
                if mem["price"] == inv_price and mem["area_sqm"] == inv_area and mem["area_sqm"] > 0:
                    matched_mem_id = mem_id
                    match_type = "PRICE_AREA_MATCH"
                    break

        if matched_mem_id:
            matched_inventory_count += 1
            memory_listings[matched_mem_id]["matched_inventory_ids"].append(rec_id)
            inv["PresenceStatus"] = "IN_BOTH (Inventory & Memory)"
            inv["MemoryID"] = matched_mem_id
            inv["MatchType"] = match_type
            inv["SierraCode"] = memory_listings[matched_mem_id]["sierraCode"]
            inv["MemoryNotes"] = memory_listings[matched_mem_id]["notes"]
            inv["MemoryCreatedAt"] = memory_listings[matched_mem_id]["createdAt"]
        else:
            inv["PresenceStatus"] = "INVENTORY_ONLY (Catalog)"
            inv["MemoryID"] = ""
            inv["MatchType"] = "NONE"
            inv["SierraCode"] = ""
            inv["MemoryNotes"] = ""
            inv["MemoryCreatedAt"] = ""

        inventory_with_memory_matches.append(inv)

    # 4. Identify Memory-Exclusive Units (Fresh agent intake)
    memory_only_units = []
    for mem_id, mem in memory_listings.items():
        if not mem["matched_inventory_ids"]:
            memory_only_units.append(mem)

    matched_memory_count = len(memory_listings) - len(memory_only_units)

    print(f"\n📊 Reconciliation Summary:")
    print(f"  • Master Catalog Units:        {len(inventory_records):,}")
    print(f"  • Total Active Memory Units:    {len(memory_listings):,}")
    print(f"  • Reconciled (In Both):         {matched_memory_count:,}")
    print(f"  • Memory-Only (New Intake):     {len(memory_only_units):,}")
    print(f"  • Catalog-Only (Not in Memory): {len(inventory_records) - matched_inventory_count:,}")
    print(f"  • Grand Total Available Units:  {len(inventory_records) + len(memory_only_units):,}")

    # 5. Build Master Unified Spreadsheet (CSV with UTF-8 BOM for Excel)
    print(f"\n💾 Writing master consolidated spreadsheet: {OUTPUT_ALL_CSV}...")

    fieldnames = [
        "PresenceStatus",
        "MemoryID",
        "RecordID",
        "SierraCode",
        "ListingCategory",
        "InventoryStatus",
        "SourceType",
        "Location",
        "Zone",
        "PropertyType",
        "Bedrooms",
        "Bathrooms",
        "AreaSqm",
        "PriceEGP",
        "Furnished",
        "Garden",
        "Pool",
        "ContactName",
        "ContactPhone",
        "OwnerBroker",
        "Availability",
        "FollowUpStatus",
        "Priority",
        "PhotoMatchStatus",
        "PhotoURLs",
        "MemoryNotes",
        "MemoryCreatedAt",
        "MatchType"
    ]

    with open(OUTPUT_ALL_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()

        # Write all inventory records (including matched ones)
        for inv in inventory_with_memory_matches:
            rec_id = inv.get("\ufeffRecordID") or inv.get("RecordID") or ""
            row_data = {
                "PresenceStatus": inv["PresenceStatus"],
                "MemoryID": inv["MemoryID"],
                "RecordID": rec_id,
                "SierraCode": inv["SierraCode"],
                "ListingCategory": inv.get("ListingCategory", ""),
                "InventoryStatus": inv.get("InventoryStatus", "Available"),
                "SourceType": inv.get("SourceType", ""),
                "Location": inv.get("Location", ""),
                "Zone": inv.get("Zone", ""),
                "PropertyType": inv.get("PropertyType", ""),
                "Bedrooms": inv.get("Bedrooms", ""),
                "Bathrooms": inv.get("Bathrooms", ""),
                "AreaSqm": inv.get("AreaSqm", ""),
                "PriceEGP": inv.get("PriceEGP", ""),
                "Furnished": inv.get("Furnished", ""),
                "Garden": inv.get("Garden", ""),
                "Pool": inv.get("Pool", ""),
                "ContactName": inv.get("ContactName", ""),
                "ContactPhone": inv.get("ContactPhone", ""),
                "OwnerBroker": inv.get("OwnerBroker", ""),
                "Availability": inv.get("Availability", ""),
                "FollowUpStatus": inv.get("FollowUpStatus", ""),
                "Priority": inv.get("Priority", ""),
                "PhotoMatchStatus": inv.get("PhotoMatchStatus", ""),
                "PhotoURLs": inv.get("PhotoURLs", ""),
                "MemoryNotes": inv["MemoryNotes"],
                "MemoryCreatedAt": inv["MemoryCreatedAt"],
                "MatchType": inv["MatchType"]
            }
            writer.writerow(row_data)

        # Write memory-only records (fresh additions)
        for mem in memory_only_units:
            row_data = {
                "PresenceStatus": "MEMORY_ONLY (New Agent Ingestion)",
                "MemoryID": mem["memory_id"],
                "RecordID": f"MEM-{mem['memory_id']}",
                "SierraCode": mem["sierraCode"],
                "ListingCategory": "Broker WhatsApp Intake",
                "InventoryStatus": mem["status"],
                "SourceType": mem["sourceType"],
                "Location": mem["compound"] or mem["location"],
                "Zone": mem["location"],
                "PropertyType": mem["type"],
                "Bedrooms": mem["bedrooms"],
                "Bathrooms": mem["bathrooms"],
                "AreaSqm": mem["area_sqm"],
                "PriceEGP": mem["price"],
                "Furnished": mem["finishing"],
                "Garden": "",
                "Pool": "",
                "ContactName": mem["contact_info"],
                "ContactPhone": mem["contact_info"],
                "OwnerBroker": mem["whatsappGroupName"],
                "Availability": "Available",
                "FollowUpStatus": "Pending Catalog Import",
                "Priority": "High",
                "PhotoMatchStatus": "No Photos Matched",
                "PhotoURLs": "",
                "MemoryNotes": mem["notes"],
                "MemoryCreatedAt": mem["createdAt"],
                "MatchType": "NEW_INGESTION"
            }
            writer.writerow(row_data)

    print(f"✅ Generated {OUTPUT_ALL_CSV} with {len(inventory_records) + len(memory_only_units):,} total rows.")

    # 6. Write focused Memory Audit CSV
    print(f"\n💾 Writing memory audit spreadsheet: {OUTPUT_AUDIT_CSV}...")
    mem_audit_fields = [
        "MemoryID",
        "SierraCode",
        "CompoundOrLocation",
        "PropertyType",
        "PriceEGP",
        "AreaSqm",
        "Bedrooms",
        "Bathrooms",
        "Status",
        "SourceType",
        "WhatsAppGroup",
        "ContactInfo",
        "MatchStatus",
        "MatchedInventoryRecordIDs",
        "Notes",
        "CreatedAt"
    ]

    with open(OUTPUT_AUDIT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=mem_audit_fields)
        writer.writeheader()
        for mem_id, mem in memory_listings.items():
            is_matched = len(mem["matched_inventory_ids"]) > 0
            writer.writerow({
                "MemoryID": mem_id,
                "SierraCode": mem["sierraCode"],
                "CompoundOrLocation": mem["compound"] or mem["location"],
                "PropertyType": mem["type"],
                "PriceEGP": mem["price"],
                "AreaSqm": mem["area_sqm"],
                "Bedrooms": mem["bedrooms"],
                "Bathrooms": mem["bathrooms"],
                "Status": mem["status"],
                "SourceType": mem["sourceType"],
                "WhatsAppGroup": mem["whatsappGroupName"],
                "ContactInfo": mem["contact_info"],
                "MatchStatus": "MATCHED_IN_CATALOG" if is_matched else "NEW_EXCLUSIVE_TO_MEMORY",
                "MatchedInventoryRecordIDs": "; ".join(mem["matched_inventory_ids"]),
                "Notes": mem["notes"],
                "CreatedAt": mem["createdAt"]
            })

    print(f"✅ Generated {OUTPUT_AUDIT_CSV} with {len(memory_listings):,} memory audit rows.")

if __name__ == "__main__":
    main()
