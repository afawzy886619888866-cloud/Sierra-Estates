#!/usr/bin/env python3
"""Generate Sierra Estates business analytics reports from Firestore."""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path
from textwrap import dedent
from typing import Any

import requests
from dotenv import load_dotenv

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:  # pragma: no cover - optional dependency
    firebase_admin = None
    credentials = None
    firestore = None

load_dotenv()


def _load_firestore_client(project_id: str | None):
    """Initialize and return a Firestore client."""
    if firebase_admin is None or credentials is None or firestore is None:
        raise RuntimeError('firebase-admin is required. Install dependencies from scripts/python/requirements.txt.')
    service_account_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
    if not service_account_json:
        raise RuntimeError('FIREBASE_SERVICE_ACCOUNT_JSON is required for Firestore analytics.')
    try:
        app = firebase_admin.get_app()
    except ValueError:
        options = {'projectId': project_id} if project_id else None
        if options is None:
            app = firebase_admin.initialize_app(credentials.Certificate(json.loads(service_account_json)))
        else:
            app = firebase_admin.initialize_app(
                credentials.Certificate(json.loads(service_account_json)),
                options,
            )
    return firestore.client(app=app)


def _serialize(value: Any) -> Any:
    """Convert Firestore values into JSON-safe data."""
    if hasattr(value, 'isoformat'):
        try:
            return value.isoformat()
        except TypeError:
            pass
    if isinstance(value, dict):
        return {key: _serialize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    return value


def _load_collection(client: Any, name: str) -> list[dict[str, Any]]:
    """Load and serialize a Firestore collection."""
    return [{**_serialize(document.to_dict() or {}), 'id': document.id} for document in client.collection(name).stream()]


def _extract_datetime(document: dict[str, Any]) -> datetime | None:
    """Extract a reasonable timestamp from a Firestore document."""
    for key in ('created_at', 'createdAt', 'updated_at', 'updatedAt', 'last_sync_timestamp', 'timestamp'):
        value = document.get(key)
        if value is None:
            continue
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                continue
    return None


def _parse_date_range(raw_value: str | None) -> tuple[datetime | None, datetime | None]:
    """Parse YYYY-MM-DD:YYYY-MM-DD date ranges."""
    if not raw_value:
        return None, None
    parts = raw_value.split(':', 1)
    if len(parts) != 2:
        raise ValueError('date range must use START:END format (YYYY-MM-DD:YYYY-MM-DD)')
    start = datetime.fromisoformat(parts[0]).replace(tzinfo=timezone.utc)
    end = datetime.fromisoformat(parts[1]).replace(tzinfo=timezone.utc)
    return start, end


def _within_range(document: dict[str, Any], start: datetime | None, end: datetime | None) -> bool:
    """Return True when a document falls within the requested range."""
    if start is None and end is None:
        return True
    stamp = _extract_datetime(document)
    if stamp is None:
        return True
    if start is not None and stamp < start:
        return False
    if end is not None and stamp > end:
        return False
    return True


def _score_value(lead: dict[str, Any]) -> float | None:
    """Extract a lead score as a float if available."""
    for key in ('lead_score', 'score', 'ai_score'):
        value = lead.get(key)
        if value in (None, ''):
            continue
        try:
            return float(str(value))
        except ValueError:
            continue
    return None


def _is_converted_lead(lead: dict[str, Any]) -> bool:
    """Return True when a lead appears converted/closed."""
    status_text = ' '.join(str(lead.get(key, '')) for key in ('status', 'stage', 'pipeline_stage')).lower()
    return any(term in status_text for term in ('converted', 'closed', 'won', 'booked', 'sale'))


def _top_counter_rows(counter: Counter[str], limit: int = 5) -> str:
    """Render markdown rows for the top counter items."""
    if not counter:
        return '| — | 0 |'
    return '\n'.join(f'| {name} | {count} |' for name, count in counter.most_common(limit))


def _send_telegram_summary(report_title: str, totals: dict[str, Any]) -> None:
    """Send a short report summary to Telegram."""
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    channel_id = os.getenv('TELEGRAM_CHANNEL_ID')
    if not token or not channel_id:
        raise RuntimeError('TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID are required to send Telegram summaries.')
    summary = (
        f"{report_title}\n"
        f"Total leads: {totals['total_leads']}\n"
        f"Average score: {totals['avg_score']}\n"
        f"Conversion rate: {totals['conversion_rate']}"
    )
    response = requests.post(
        f'https://api.telegram.org/bot{token}/sendMessage',
        json={'chat_id': channel_id, 'text': summary},
        timeout=30,
    )
    response.raise_for_status()


def main() -> int:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Generate Sierra Estates business analytics reports.')
    parser.add_argument('--date-range', default=None, help='Optional YYYY-MM-DD:YYYY-MM-DD date range filter.')
    parser.add_argument('--output-dir', default='reports', help='Directory for markdown output.')
    parser.add_argument('--send-telegram', action='store_true', help='Send the summary to Telegram after generation.')
    parser.add_argument('--project-id', default=None, help='Optional Firebase project id override.')
    args = parser.parse_args()

    try:
        start, end = _parse_date_range(args.date_range)
        client = _load_firestore_client(args.project_id)
        leads = [lead for lead in _load_collection(client, 'Leads') if _within_range(lead, start, end)]
        properties = [item for item in _load_collection(client, 'Properties') if _within_range(item, start, end)]
        owners = [item for item in _load_collection(client, 'Owners') if _within_range(item, start, end)]

        scored_leads = [score for score in (_score_value(lead) for lead in leads) if score is not None]
        avg_score = round(sum(scored_leads) / len(scored_leads), 2) if scored_leads else 0.0
        conversion_rate = round((sum(1 for lead in leads if _is_converted_lead(lead)) / len(leads)) * 100, 2) if leads else 0.0

        compound_counter = Counter(
            str(value).strip()
            for value in [
                *(lead.get('compound_target') or lead.get('compound') for lead in leads),
                *(item.get('compound_name') or item.get('location') for item in properties),
            ]
            if value
        )
        agent_counter = Counter(
            str(value).strip()
            for value in [
                *(lead.get('agent_name') or lead.get('assigned_agent') for lead in leads),
                *(item.get('agent_name') for item in properties),
            ]
            if value
        )

        report_date = date.today().isoformat()
        report_title = f'# Sierra Estates Analytics Report — {report_date}'
        report_body = dedent(f'''\
        {report_title}

        - **Generated at:** {datetime.now(timezone.utc).isoformat()}
        - **Date range:** {args.date_range or 'All available data'}
        - **Leads analyzed:** {len(leads)}
        - **Properties analyzed:** {len(properties)}
        - **Owners analyzed:** {len(owners)}

        ## KPI Summary

        | KPI | Value |
        | --- | --- |
        | Total leads | {len(leads)} |
        | Average score | {avg_score} |
        | Conversion rate | {conversion_rate}% |
        | Top compound count | {sum(compound_counter.values())} |
        | Top agent count | {sum(agent_counter.values())} |

        ## Top Compounds

        | Compound | Mentions |
        | --- | --- |
        {_top_counter_rows(compound_counter)}

        ## Top Agents

        | Agent | Mentions |
        | --- | --- |
        {_top_counter_rows(agent_counter)}
        ''')

        output_dir = Path(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f'analytics-{report_date}.md'
        output_path.write_text(report_body, encoding='utf-8')

        if args.send_telegram:
            _send_telegram_summary(
                report_title,
                {
                    'total_leads': len(leads),
                    'avg_score': avg_score,
                    'conversion_rate': f'{conversion_rate}%',
                },
            )

        print(f'Analytics report written to {output_path}')
        return 0
    except Exception as error:  # pragma: no cover - CLI error path
        print(f'Error generating analytics report: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
