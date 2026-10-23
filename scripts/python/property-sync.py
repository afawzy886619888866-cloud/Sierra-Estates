#!/usr/bin/env python3
"""Sync Property Finder listings into the Firestore Properties collection."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv('.env.local')
load_dotenv()

DEFAULT_PF_BASE_URL = 'https://api.property-finder.eg/v2'


def sync_to_supabase(normalized: dict[str, Any]) -> str:
    """Sync a normalized Property Finder listing to Supabase public.listings."""
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL', 'https://gaxfqcietzoonlmatiot.supabase.co')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if not supabase_key:
        raise RuntimeError('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY required.')
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
    }
    record = {
        'code': normalized.get('sync_hash'),
        'title': normalized.get('title') or normalized.get('compound_name'),
        'compound': normalized.get('compound_name'),
        'price': normalized.get('price_egp') or 0,
        'bedrooms': normalized.get('bedrooms') or 0,
        'bathrooms': normalized.get('bathrooms') or 0,
        'area': normalized.get('area_sqm') or 0,
        'property_type': (normalized.get('property_type') or 'apartment').lower(),
        'status': 'available',
        'source': 'property_finder',
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }
    resp = requests.post(
        f'{supabase_url}/rest/v1/listings',
        headers=headers,
        json=[record],
        timeout=30,
    )
    resp.raise_for_status()
    return 'synced'


def _load_firestore_client(project_id: str | None):
    """Deprecated. Firestore target removed on 2026-09-20."""
    raise RuntimeError(
        'Firestore target is no longer supported. Re-run with --target=supabase (the default).'
    )


_NUMBER_SUFFIX_RE = re.compile(r'([\d,]+(?:\.\d+)?)\s*([km])(?![a-zA-Z\d])')
_FIRST_NUMBER_RE = re.compile(r'[\d,]+(?:\.\d+)?')


def _parse_number(value: Any) -> float:
    """Parse a numeric value from numbers or price-like strings."""
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value or '').strip().lower()
    if not text:
        return 0.0
    match = _NUMBER_SUFFIX_RE.search(text)
    if match:
        try:
            digits = float(match.group(1).replace(',', ''))
            multiplier = 1_000_000.0 if match.group(2) == 'm' else 1_000.0
            return digits * multiplier
        except ValueError:
            return 0.0
    first = _FIRST_NUMBER_RE.search(text)
    if first:
        try:
            return float(first.group().replace(',', ''))
        except ValueError:
            return 0.0
    return 0.0


def _extract_location(listing: dict[str, Any]) -> str:
    """Return the best available compound/location value."""
    location = listing.get('Location') or listing.get('compound') or listing.get('location')
    if isinstance(location, dict):
        return str(location.get('name') or location.get('compound') or location.get('address') or 'New Cairo').strip()
    return str(location or 'New Cairo').strip()


def _extract_owner(listing: dict[str, Any]) -> str:
    """Return the best available owner label."""
    owner = listing.get('Owner') or listing.get('owner')
    if isinstance(owner, dict):
        return str(owner.get('name') or owner.get('full_name') or 'Direct Investor').strip()
    return str(owner or 'Direct Investor').strip()


def compute_sync_hash(listing: dict[str, Any]) -> str:
    """Mirror the CRM route hash logic with sensible source-field fallbacks."""
    location = _extract_location(listing)
    rent_period_type = str(listing.get('RentPeriodType') or listing.get('bua_m2') or listing.get('area') or '150').strip()
    code = str(listing.get('Code') or listing.get('code') or listing.get('id') or '0').strip()
    owner = _extract_owner(listing)
    raw_signature = f'{location}-{rent_period_type}-{code}-{owner}'.lower().strip()
    return hashlib.sha256(raw_signature.encode('utf-8')).hexdigest()


def _default_arabic_title(property_type: str) -> str:
    """Return the default Arabic title fallback for a property type."""
    return 'فيلا مستقلة فاخرة' if property_type.lower() == 'villa' else 'شقة سكنية موثقة العرض'


def normalize_property(listing: dict[str, Any]) -> dict[str, Any]:
    """Normalize Property Finder listing data into the Firestore schema."""
    location = _extract_location(listing)
    sync_hash = compute_sync_hash(listing)
    price = _parse_number(listing.get('UnitPrice') or listing.get('price'))
    beds = int(_parse_number(listing.get('BedRooms') or listing.get('bedrooms') or listing.get('beds') or 0))
    property_type = str(listing.get('PropertyType') or listing.get('property_type') or listing.get('type') or 'Apartment').strip()
    owner = _extract_owner(listing)
    code = str(listing.get('Code') or listing.get('code') or listing.get('id') or '').strip()
    rent_period_type = str(listing.get('RentPeriodType') or listing.get('area') or listing.get('bua_m2') or '150').strip()
    furnished = str(listing.get('Furniture') or listing.get('furnishing') or '').lower()
    furnished_tag = 'F' if 'furnish' in furnished else 'U'
    price_abbrev = f"{int(price / 1_000_000)}M" if price >= 1_000_000 else f"{max(1, int(price / 1_000))}K"
    unit_prefix = location[:3].upper() if location else 'SBR'

    return {
        'id': sync_hash,
        'sync_hash': sync_hash,
        'unit_code': f'{unit_prefix}-{beds or 0}{furnished_tag}-{price_abbrev}',
        'pf_reference_id': code or f'SBR-AUTO-{sync_hash[:5].upper()}',
        'compound_name': location,
        'location': location,
        'price': price,
        'beds': beds,
        'type': property_type,
        'title_en': str(listing.get('Name') or listing.get('title') or f'{property_type} in {location}').strip(),
        'title_ar': str(listing.get('title_ar') or _default_arabic_title(property_type)).strip(),
        'purpose': str(listing.get('Availability') or listing.get('purpose') or 'RENT').upper(),
        'currency': str(listing.get('currency') or 'EGP').upper(),
        'owner_name': owner,
        'agent_name': str(listing.get('AgentName') or listing.get('agent_name') or 'Ahmed Fawzy').strip(),
        'bua_m2': _parse_number(rent_period_type),
        'last_sync_timestamp': datetime.now(timezone.utc).isoformat(),
        'raw_property_finder_payload': listing,
    }


def fetch_property_finder_listings(limit: int | None, compound: str | None) -> list[dict[str, Any]]:
    """Fetch listings from the Property Finder API."""
    api_key = os.getenv('PF_API_KEY')
    api_secret = os.getenv('PF_API_SECRET')
    if not api_key or not api_secret:
        raise RuntimeError('PF_API_KEY and PF_API_SECRET are required for Property Finder sync.')

    base_url = os.getenv('PF_API_BASE_URL', DEFAULT_PF_BASE_URL).rstrip('/')
    params: dict[str, Any] = {}
    if limit is not None:
        params['limit'] = limit
    if compound:
        params['compound'] = compound

    response = requests.get(
        f'{base_url}/properties/latest',
        headers={
            'X-API-Key': api_key,
            'X-API-Secret': api_secret,
            'Content-Type': 'application/json',
        },
        params=params,
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    listings = payload.get('results') or payload.get('listings') or payload.get('data') or []
    if not isinstance(listings, list):
        raise RuntimeError('Unexpected Property Finder response shape; expected a list of listings.')
    return [item for item in listings if isinstance(item, dict)]


def main() -> int:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Sync Property Finder listings into Supabase.')
    parser.add_argument('--target', choices=('supabase', 'firestore'), default='supabase', help='Database target (default: supabase). Firestore is deprecated.')
    parser.add_argument('--dry-run', action='store_true', help='Show sync actions without writing.')
    parser.add_argument('--limit', type=int, default=None, help='Maximum number of Property Finder listings to fetch.')
    parser.add_argument('--compound', default=None, help='Optional compound name filter.')
    parser.add_argument('--project-id', default=None, help='(Deprecated) Firebase project id override — ignored.')
    args = parser.parse_args()

    try:
        if args.target == 'firestore':
            raise RuntimeError('Firestore target is no longer supported. Re-run with --target=supabase (the default).')
        listings = fetch_property_finder_listings(args.limit, args.compound)

        new_records = 0
        updated_records = 0
        skipped_duplicates = 0

        for listing in listings:
            normalized = normalize_property(listing)
            if args.dry_run:
                print(f"[DRY RUN] Would upsert {normalized['sync_hash']} ({normalized['compound_name']})")
                continue

            sync_to_supabase(normalized)
            new_records += 1

        print('Sync summary')
        print(f'  New records: {new_records}')
        print(f'  Updated records: {updated_records}')
        print(f'  Skipped duplicates: {skipped_duplicates}')
        if args.dry_run:
            print(f'  Dry-run listings inspected: {len(listings)}')
        return 0
    except Exception as error:  # pragma: no cover - CLI error path
        print(f'Error syncing properties: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
