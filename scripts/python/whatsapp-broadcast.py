#!/usr/bin/env python3
"""Send templated WhatsApp broadcast messages from CSV or Firestore leads."""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv('.env.local')
load_dotenv()


class SafeTemplateDict(dict[str, str]):
    """Dictionary that leaves unknown placeholders intact."""

    def __missing__(self, key: str) -> str:
        return '{' + key + '}'


def _read_supabase_leads() -> list[dict[str, Any]]:
    """Read leads from Supabase PostgreSQL public.leads."""
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL', 'https://gaxfqcietzoonlmatiot.supabase.co')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if not supabase_key:
        raise RuntimeError('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY required.')
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
    }
    resp = requests.get(f'{supabase_url}/rest/v1/leads?select=*', headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()


def _read_csv_leads(input_path: Path) -> list[dict[str, Any]]:
    """Read leads from a CSV file."""
    if not input_path.exists():
        raise FileNotFoundError(f'CSV input not found: {input_path}')
    with input_path.open('r', encoding='utf-8', newline='') as handle:
        return list(csv.DictReader(handle))


def _read_firestore_leads(project_id: str | None, collection_name: str) -> list[dict[str, Any]]:
    """Read leads from Firestore (legacy fallback — deprecated).

    Supabase is the only supported source since 2026-09-20. This stub remains
    so old CLI invocations fail with a clear message instead of crashing.
    """
    raise RuntimeError(
        'Firestore source is no longer supported. Re-run with --source=supabase (the default).'
    )


def _score_value(lead: dict[str, Any]) -> int:
    """Return the best available lead score field."""
    for key in ('lead_score', 'score', 'ai_score'):
        value = lead.get(key)
        if value in (None, ''):
            continue
        try:
            return int(float(str(value)))
        except ValueError:
            continue
    return 0


def _phone_value(lead: dict[str, Any]) -> str:
    """Return the best available phone number field."""
    for key in ('phone', 'mobile', 'whatsapp', 'phone_number'):
        value = str(lead.get(key, '')).strip()
        if value:
            return value
    return ''


def _render_message(template: str, lead: dict[str, Any]) -> str:
    """Render a templated WhatsApp message for a lead."""
    context = SafeTemplateDict(
        name=str(lead.get('name') or lead.get('full_name') or 'there'),
        compound=str(lead.get('compound') or lead.get('compound_target') or 'New Cairo'),
        price=str(lead.get('price') or lead.get('budget') or 'our latest availability'),
    )
    return template.format_map(context)


def _send_whatsapp_message(phone: str, message: str) -> tuple[str, str]:
    """Send a single WhatsApp message via the configured API."""
    api_url = os.getenv('WHATSAPP_API_URL')
    api_token = os.getenv('WHATSAPP_API_TOKEN')
    if not api_url or not api_token:
        raise RuntimeError('WHATSAPP_API_URL and WHATSAPP_API_TOKEN are required for WhatsApp broadcasts.')
    response = requests.post(
        api_url,
        headers={
            'X-API-Token': api_token,
            'Content-Type': 'application/json',
        },
        json={'to': phone, 'message': message},
        timeout=30,
    )
    if response.ok:
        return 'sent', response.text[:200]
    return 'failed', f'{response.status_code}: {response.text[:200]}'


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description='Broadcast templated WhatsApp messages to Sierra Estates leads.')
    parser.add_argument('--template', required=True, help='Message template, e.g. "Hi {name}".')
    parser.add_argument('--source', choices=('csv', 'firestore', 'supabase'), default='supabase', help='Lead source to read from (default: supabase).')
    parser.add_argument('--dry-run', action='store_true', help='Preview messages without sending them.')
    parser.add_argument('--min-score', type=int, default=0, help='Only send to leads at or above this score.')
    parser.add_argument('--input', default='leads.csv', help='CSV input path when --source=csv.')
    parser.add_argument('--output', default='reports/whatsapp-broadcast-report.csv', help='CSV report path.')
    parser.add_argument('--project-id', default=None, help='Optional Firebase project id override.')
    parser.add_argument('--collection', default='Leads', help='Firestore collection when --source=firestore.')
    return parser.parse_args()


def main() -> int:
    """CLI entry point."""
    args = parse_args()

    try:
        if args.source == 'csv':
            leads = _read_csv_leads(Path(args.input))
        elif args.source == 'supabase':
            leads = _read_supabase_leads()
        else:
            leads = _read_firestore_leads(args.project_id, args.collection)
        report_rows: list[dict[str, Any]] = []
        for lead in leads:
            if _score_value(lead) < args.min_score:
                continue
            phone = _phone_value(lead)
            message = _render_message(args.template, lead)
            if not phone:
                report_rows.append({**lead, 'status': 'failed', 'reason': 'Missing phone', 'rendered_message': message})
                continue
            if args.dry_run:
                report_rows.append({**lead, 'status': 'dry-run', 'reason': 'Preview only', 'rendered_message': message})
                continue
            status, reason = _send_whatsapp_message(phone, message)
            report_rows.append({**lead, 'status': status, 'reason': reason, 'rendered_message': message})
            time.sleep(1)

        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        fieldnames: list[str] = []
        for row in report_rows:
            for key in row.keys():
                if key not in fieldnames:
                    fieldnames.append(key)
        with output_path.open('w', encoding='utf-8', newline='') as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(report_rows)

        sent_count = sum(1 for row in report_rows if row.get('status') == 'sent')
        failed_count = sum(1 for row in report_rows if row.get('status') == 'failed')
        print(f'Broadcast complete. Sent={sent_count}, Failed={failed_count}, Report={output_path}')
        return 0
    except Exception as error:  # pragma: no cover - CLI error path
        print(f'Error sending WhatsApp broadcast: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
