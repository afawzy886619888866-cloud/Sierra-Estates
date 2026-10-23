import csv
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.table import Table, TableStyleInfo

BASE_ID = os.environ.get("AIRTABLE_BASE_ID", "appN96kHujXsLkc0h")
TABLE_ID = os.environ.get("AIRTABLE_TABLE_ID", "tbli8jUq42wBb8AQa")
TOKEN = os.environ.get("AIRTABLE_PAT") or os.environ.get("AIRTABLE_API_KEY", "")
ROOT = Path(__file__).resolve().parents[1]
CSV_OUT = ROOT / "Inventory_with_Photos_Airtable.csv"
XLSX_OUT = ROOT / "Inventory_with_Photos.xlsx"
CHANGE_LOG_OUT = ROOT / "Inventory_sync_change_log.json"


def fetch_records() -> list[dict[str, Any]]:
    if not TOKEN:
        print("Warning: Neither AIRTABLE_PAT nor AIRTABLE_API_KEY is configured in environment.")
        return []
    records: list[dict[str, Any]] = []
    offset = None
    while True:
        params = {"pageSize": 100}
        if offset:
            params["offset"] = offset
        response = requests.get(
            f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}",
            headers={"Authorization": f"Bearer {TOKEN}"},
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        records.extend(payload.get("records", []))
        offset = payload.get("offset")
        if not offset:
            break
    return records


def normalize(records: list[dict[str, Any]]) -> tuple[list[str], list[dict[str, Any]]]:
    by_record_id: dict[str, dict[str, Any]] = {}
    for record in records:
        fields = dict(record.get("fields", {}))
        record_id = str(fields.get("RecordID") or fields.get("Record ID") or record["id"])
        fields["RecordID"] = record_id
        # Airtable attachment arrays are kept as JSON-like URLs in the export;
        # no media is invented when the field is absent or empty.
        attachments = fields.get("Photos") or fields.get("Photo Attachments") or []
        if isinstance(attachments, list):
            fields["PhotoURLs"] = "\n".join(str(item.get("url", "")) for item in attachments if isinstance(item, dict) and item.get("url"))
        elif fields.get("Media URLs"):
            fields["PhotoURLs"] = str(fields["Media URLs"])
        fields["PhotoStatus"] = "Matched media" if fields.get("PhotoURLs") else "No media attached"
        by_record_id[record_id] = fields
    rows = list(by_record_id.values())
    field_names = sorted({key for row in rows for key in row.keys()})
    preferred = [
        "RecordID", "ListingCategory", "InventoryStatus", "Location", "Zone", "PropertyType",
        "Bedrooms", "Bathrooms", "AreaSqm", "PriceEGP", "Furnished", "Garden", "Pool",
        "AdditionalFeatures", "PhotoStatus", "PhotoURLs", "ContactName", "ContactPhone",
        "OwnerBroker", "Availability", "FollowUpStatus", "Priority", "AssignedAgent",
        "SourceFile", "SourceSheet", "SourceRow", "UnitFingerprint", "ConflictFlag",
        "ConflictSummary", "Comment", "UpdatedAt",
    ]
    ordered = [field for field in preferred if field in field_names]
    ordered.extend(field for field in field_names if field not in ordered)
    return ordered, rows


def write_change_log(rows: list[dict[str, Any]]) -> None:
    previous: dict[str, dict[str, str]] = {}
    if CSV_OUT.exists():
        with CSV_OUT.open(encoding="utf-8-sig", newline="") as handle:
            for old in csv.DictReader(handle):
                rid = str(old.get("RecordID") or "")
                if rid:
                    previous[rid] = {key: str(value or "") for key, value in old.items()}
    current = {str(row.get("RecordID") or ""): {key: str(value or "") for key, value in row.items()} for row in rows}
    added = sorted(set(current) - set(previous))
    removed = sorted(set(previous) - set(current))
    changed = sorted(rid for rid in set(current) & set(previous) if current[rid] != previous[rid])
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "baseId": BASE_ID,
        "tableId": TABLE_ID,
        "currentUniqueRecords": len(current),
        "addedRecordIDs": added,
        "removedRecordIDs": removed,
        "changedRecordIDs": changed,
        "summary": {"added": len(added), "removed": len(removed), "changed": len(changed)},
    }
    CHANGE_LOG_OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_csv(fields: list[str], rows: list[dict[str, Any]]) -> None:
    with CSV_OUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fields})


def write_xlsx(fields: list[str], rows: list[dict[str, Any]]) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "All Inventory Units"
    sheet["A1"] = "SIERRA ESTATES / INVENTORY WITH PHOTOS"
    sheet["A2"] = "Generated from Airtable. Photo fields are populated only from real Airtable attachments."
    sheet["A1"].font = Font(name="Georgia", size=18, bold=True, color="173B4D")
    sheet["A2"].font = Font(name="Calibri", size=10, italic=True, color="5D6B73")
    header_row = 5
    for col, field in enumerate(fields, 1):
        cell = sheet.cell(header_row, col, field)
        cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="173B4D")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for row_index, row in enumerate(rows, header_row + 1):
        for col, field in enumerate(fields, 1):
            cell = sheet.cell(row_index, col, row.get(field, ""))
            cell.alignment = Alignment(vertical="top", wrap_text=field in {"AdditionalFeatures", "PhotoURLs", "ConflictSummary", "Comment"})
    last_row = header_row + len(rows)
    last_col = len(fields)
    if rows:
        ref = f"A{header_row}:{sheet.cell(header_row, last_col).column_letter}{last_row}"
        table = Table(displayName="AllInventoryUnits", ref=ref)
        table.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
        sheet.add_table(table)
    sheet.freeze_panes = "A6"
    sheet.auto_filter.ref = f"A{header_row}:{sheet.cell(header_row, last_col).column_letter}{last_row}"
    workbook.save(XLSX_OUT)


if __name__ == "__main__":
    fields, rows = normalize(fetch_records())
    write_change_log(rows)
    write_csv(fields, rows)
    write_xlsx(fields, rows)
    print(f"Synced {len(rows)} unique Airtable records to {CSV_OUT.name} and {XLSX_OUT.name}")
