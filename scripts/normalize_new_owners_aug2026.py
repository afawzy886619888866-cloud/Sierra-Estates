from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path('/home/ubuntu')
PROFILE = ROOT / 'whatsapp_inventory/new_owners_aug2026/profile'
SOURCE_CSV = ROOT / 'whatsapp_inventory/merged_inventory/Sierra_Estates_All_Inventory_Airtable.csv'
OUT_JSON = PROFILE / 'airtable_new_records.json'
OUT_REPORT = PROFILE / 'dedupe_report.json'

ARABIC_DIGITS = str.maketrans('٠١٢٣٤٥٦٧٨٩٫٬', '0123456789.,')
REQUEST_RE = re.compile(r'(?i)(مطلوب|محتاج|عايز|عميل طالب|client looking|looking for|wanted|tenant looking)')
SALE_ONLY_RE = re.compile(r'(?i)(للبيع|للبيع فقط|sale only|for sale)')
RENT_RE = re.compile(r'(?i)(إيجار|للايجار|للإيجار|ايجار|monthly|per month|rent|للإيجار|مفروش)')
MEDIA_RE = re.compile(r'(?i)([A-Z]{2,5}-\d{8}-WA\d{4}\.(?:jpg|jpeg|png|webp|gif|heic|mp4|mov|vcf))')
CODE_RE = re.compile(r'(?m)^\s*([A-Z]{1,8}(?:-[A-Z0-9]+){1,6})\s*$')


def text(v: Any) -> str:
    return str(v or '').replace('\u200e', '').replace('\u200f', '').replace('\xa0', ' ').strip()


def norm(v: Any) -> str:
    value = text(v).translate(ARABIC_DIGITS).lower()
    value = re.sub(r'[^a-z0-9\u0600-\u06ff]+', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


def number(token: str) -> int | None:
    try:
        return int(round(float(token.translate(ARABIC_DIGITS).replace(',', '').replace(' ', ''))))
    except ValueError:
        return None


def monthly_price(raw: str) -> tuple[int | None, str, str]:
    s = raw.translate(ARABIC_DIGITS)
    patterns = [
        (r'(\d[\d,\. ]*)\s*(?:جنيه|جنية|EGP|LE|ل\.?ه)?\s*(?:شهري(?:اً|ا)?|شهري|شهريا|monthly|per month|الشهر)', 'EGP'),
        (r'(?:الشهر|monthly)\s*(\d[\d,\. ]*)\s*(دولار|USD|\$)', 'USD'),
        (r'(\d[\d,\. ]*)\s*(دولار|USD|\$)\s*(?:شهري|الشهر|monthly)', 'USD'),
    ]
    for pattern, currency in patterns:
        match = re.search(pattern, s, re.I)
        if match:
            value = number(match.group(1))
            if value:
                return value, currency, match.group(0)
    # For a single explicit EGP asking price, use the first rent-linked amount.
    if RENT_RE.search(s) and not SALE_ONLY_RE.search(s):
        match = re.search(r'(\d[\d,\. ]*)\s*(?:جنيه|جنية|EGP|LE|ل\.ه)', s, re.I)
        if match:
            value = number(match.group(1))
            if value:
                return value, 'EGP', match.group(0)
    return None, '', ''


def infer_bathrooms(raw: str, existing: Any) -> int | None:
    if existing is not None:
        try: return int(existing)
        except (TypeError, ValueError): pass
    m = re.search(r'(\d+)\s*(?:حمام|حمامات|bath(?:room)?s?)', raw.translate(ARABIC_DIGITS), re.I)
    return int(m.group(1)) if m else None


def infer_media(raw: str) -> list[str]:
    return sorted(set(MEDIA_RE.findall(raw)))


def fingerprint(r: dict[str, Any]) -> str:
    code = norm(r.get('SourceCode'))
    if code:
        return 'code|' + code
    parts = [norm(r.get('Location')), norm(r.get('PropertyType')), str(r.get('Bedrooms') or ''), str(r.get('AreaSqm') or ''), str(r.get('PriceEGP') or '')]
    return 'unit|' + '|'.join(parts)


def existing_keys() -> set[str]:
    keys: set[str] = set()
    with SOURCE_CSV.open(encoding='utf-8-sig', newline='') as handle:
        for row in csv.DictReader(handle):
            code = norm(row.get('RecordID'))
            if code: keys.add('record|' + code)
            fp = text(row.get('UnitFingerprint'))
            if fp: keys.add(fp)
    return keys


def main() -> None:
    records = json.loads((PROFILE / 'records.json').read_text(encoding='utf-8'))
    existing = existing_keys()
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    excluded: list[dict[str, Any]] = []
    for source in records:
        raw = text(source.get('raw_message'))
        is_request = bool(REQUEST_RE.search(raw))
        sale_only = bool(SALE_ONLY_RE.search(raw)) and not bool(RENT_RE.search(raw))
        price, currency, evidence = monthly_price(raw)
        source_code_match = CODE_RE.search(raw)
        source_code = source_code_match.group(1).strip() if source_code_match else ''
        row = {
            'RecordID': source['id'],
            'ListingCategory': 'Client Request' if is_request else 'Available Listing',
            'InventoryStatus': 'Pending',
            'SourceType': 'Direct owner' if re.search(r'(?i)(owner|مالك|من المالك|مباشر)', raw) else 'Broker / group',
            'Location': source.get('location') or 'Unresolved',
            'Zone': source.get('zone') or '',
            'PropertyType': source.get('property_type') or 'Apartment',
            'Bedrooms': source.get('beds'),
            'Bathrooms': infer_bathrooms(raw, None),
            'AreaSqm': source.get('area_sqm'),
            'PriceEGP': price if currency == 'EGP' else None,
            'Furnished': source.get('furnished') or '',
            'Garden': bool(re.search(r'(?i)(garden|حديقة|جاردن)', raw)),
            'Pool': bool(re.search(r'(?i)(pool|swimming|حمام سباحة|سباحة|بول)', raw)),
            'AdditionalFeatures': raw[:4000],
            'Owner/Broker': source.get('source_contact') or source.get('source_type') or '',
            'Availability': 'Available' if source.get('message_has_availability_marker') else 'Needs confirmation',
            'Follow-Up Status': 'Pending',
            'Priority': 'Normal',
            'Assigned Agent': 'Unassigned',
            'Source File': source.get('source_file'),
            'Source Sheet': source.get('source_group'),
            'Unit Fingerprint': '',
            'Conflict Flag': False,
            'Conflict Summary': '',
            'Comment': f"Imported from WhatsAppChatwithOwnersAugust2026.zip; timestamp={source.get('message_timestamp')}; price evidence={evidence}; currency={currency or 'unknown'}; media files in source message={len(infer_media(raw))}.",
            'source_code': source_code,
            'media_files': infer_media(raw),
            'raw_timestamp': source.get('message_timestamp'),
            'raw_currency': currency,
            'raw_price_evidence': evidence,
        }
        row['Unit Fingerprint'] = fingerprint({**row, 'SourceCode': source_code})
        dedup_key = row['Unit Fingerprint']
        if sale_only:
            excluded.append({'RecordID': row['RecordID'], 'reason': 'sale_only', 'raw': raw[:500]})
        elif dedup_key in seen:
            excluded.append({'RecordID': row['RecordID'], 'reason': 'duplicate_within_new_archive', 'fingerprint': dedup_key})
        elif dedup_key in existing or 'record|' + norm(row['RecordID']) in existing:
            excluded.append({'RecordID': row['RecordID'], 'reason': 'duplicate_against_existing_inventory', 'fingerprint': dedup_key})
        else:
            seen.add(dedup_key)
            out.append(row)
    report = {'source_candidates': len(records), 'new_records': len(out), 'excluded': len(excluded), 'excluded_records': excluded, 'media_referenced_in_candidate_messages': sum(len(row['media_files']) for row in out), 'available_listings': sum(row['ListingCategory'] == 'Available Listing' for row in out), 'client_requests': sum(row['ListingCategory'] == 'Client Request' for row in out)}
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    OUT_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
