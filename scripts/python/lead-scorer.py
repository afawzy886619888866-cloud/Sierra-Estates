#!/usr/bin/env python3
"""Score Sierra Estates leads from CSV files or Firestore collections."""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

from dotenv import load_dotenv

try:
    from tabulate import tabulate
except ImportError:  # pragma: no cover - optional dependency
    tabulate = None

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:  # pragma: no cover - optional dependency
    firebase_admin = None
    credentials = None
    firestore = None

load_dotenv()

KNOWN_PREMIUM_COMPOUNDS = {
    'mivida',
    'eastown',
    'villette',
    'hyde park',
    'taj city',
    'mountain view',
    'sodic east',
    'palm hills',
    'katameya dunes',
    'fifth square',
    'lake view',
    'sarai',
    'madinaty',
    'waterway',
    'stone residence',
}


class LeadScorer:
    """Lead scoring engine that returns a score from 1 to 10."""

    def score_lead(self, lead: dict[str, Any]) -> int:
        """Return a normalized 1–10 lead score for a lead payload."""
        raw_score = (
            self._score_intent(lead)
            + self._score_budget(lead)
            + self._score_timeline(lead)
            + self._score_compound_target(lead)
        )
        return max(1, min(10, raw_score))

    def _score_intent(self, lead: dict[str, Any]) -> int:
        intent_value = ' '.join(
            str(lead.get(key, ''))
            for key in ('intent', 'stage', 'status', 'notes', 'message')
        ).lower()
        if any(term in intent_value for term in ('ready', 'book', 'visit', 'viewing', 'buy now', 'serious')):
            return 3
        if any(term in intent_value for term in ('buy', 'purchase', 'invest', 'owner occupier', 'qualified')):
            return 2
        if any(term in intent_value for term in ('rent', 'lease', 'explore', 'browse', 'inquiry', 'lead')):
            return 1
        return 1 if intent_value.strip() else 0

    def _score_budget(self, lead: dict[str, Any]) -> int:
        for key in ('budget', 'budget_egp', 'price', 'max_budget'):
            amount = _parse_amount(lead.get(key))
            if amount is None:
                continue
            if amount >= 20_000_000:
                return 3
            if amount >= 10_000_000:
                return 2
            if amount > 0:
                return 1
        text_budget = str(lead.get('budget', '')).lower()
        if any(term in text_budget for term in ('luxury', 'premium', 'vip', 'high')):
            return 3
        return 0

    def _score_timeline(self, lead: dict[str, Any]) -> int:
        timeline_value = ' '.join(
            str(lead.get(key, ''))
            for key in ('timeline', 'target_move_in', 'notes', 'message')
        ).lower()
        if any(term in timeline_value for term in ('today', 'this week', 'urgent', 'immediately', 'now')):
            return 2
        if any(term in timeline_value for term in ('this month', '30 days', '1 month', '2 months', 'q1')):
            return 2
        if any(term in timeline_value for term in ('quarter', '3 months', '6 months', 'soon')):
            return 1
        return 0

    def _score_compound_target(self, lead: dict[str, Any]) -> int:
        compound_value = ' '.join(
            str(lead.get(key, ''))
            for key in ('compound', 'compound_target', 'preferred_compound', 'location')
        ).strip()
        if not compound_value:
            return 0
        normalized = compound_value.lower()
        return 2 if any(name in normalized for name in KNOWN_PREMIUM_COMPOUNDS) else 1


_AMOUNT_SUFFIX_RE = re.compile(r'([\d,]+(?:\.\d+)?)\s*([km])(?![a-zA-Z\d])')
_FIRST_AMOUNT_RE = re.compile(r'[\d,]+(?:\.\d+)?')


def _parse_amount(value: Any) -> float | None:
    """Return a numeric amount parsed from a free-form price value."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().lower()
    if not text:
        return None
    match = _AMOUNT_SUFFIX_RE.search(text)
    if match:
        try:
            digits = float(match.group(1).replace(',', ''))
            multiplier = 1_000_000.0 if match.group(2) == 'm' else 1_000.0
            return digits * multiplier
        except ValueError:
            return None
    first = _FIRST_AMOUNT_RE.search(text)
    if first:
        try:
            return float(first.group().replace(',', ''))
        except ValueError:
            return None
    return None


def _load_firestore_client(project_id: str | None):
    """Initialize and return a Firestore client."""
    if firebase_admin is None or credentials is None or firestore is None:
        raise RuntimeError('firebase-admin is required. Install dependencies from scripts/python/requirements.txt.')
    service_account_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
    if not service_account_json:
        raise RuntimeError('FIREBASE_SERVICE_ACCOUNT_JSON is required for Firestore access.')
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


def _read_csv_leads(input_path: Path) -> list[dict[str, Any]]:
    """Read leads from a CSV file."""
    if not input_path.exists():
        raise FileNotFoundError(f'CSV input not found: {input_path}')
    with input_path.open('r', encoding='utf-8', newline='') as handle:
        return list(csv.DictReader(handle))


def _read_firestore_leads(project_id: str | None, collection_name: str) -> list[dict[str, Any]]:
    """Read leads from Firestore."""
    client = _load_firestore_client(project_id)
    documents = client.collection(collection_name).stream()
    return [{**(document.to_dict() or {}), 'id': document.id} for document in documents]


def _write_report(output_path: Path, rows: Iterable[dict[str, Any]]) -> int:
    """Write scored leads to a CSV report."""
    scored_rows = list(rows)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames: list[str] = []
    for row in scored_rows:
        for key in row.keys():
            if key not in fieldnames:
                fieldnames.append(key)
    with output_path.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(scored_rows)
    return len(scored_rows)


def _render_summary(total: int, kept: int, score_distribution: Counter[int]) -> str:
    """Render a score summary table using tabulate when available."""
    rows = [
        ('Total leads scanned', total),
        ('Leads in report', kept),
        ('Score distribution', ', '.join(f'{score}:{count}' for score, count in sorted(score_distribution.items())) or 'n/a'),
    ]
    if tabulate is not None:
        return tabulate(rows, headers=('Metric', 'Value'), tablefmt='github')
    return '\n'.join(f'{label}: {value}' for label, value in rows)


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description='Score Sierra Estates leads from CSV or Firestore.')
    parser.add_argument('--source', choices=('csv', 'firestore'), required=True, help='Lead source to read from.')
    parser.add_argument('--output', required=True, help='Path to the scored CSV report.')
    parser.add_argument('--min-score', type=int, default=1, help='Only include leads at or above this score.')
    parser.add_argument('--input', default='leads.csv', help='CSV input path when --source=csv.')
    parser.add_argument('--project-id', default=None, help='Optional Firebase project id override.')
    parser.add_argument('--collection', default='Leads', help='Firestore collection when --source=firestore.')
    return parser.parse_args()


def main() -> int:
    """CLI entry point."""
    args = parse_args()
    scorer = LeadScorer()

    try:
        leads = (
            _read_csv_leads(Path(args.input))
            if args.source == 'csv'
            else _read_firestore_leads(args.project_id, args.collection)
        )
        scored_rows: list[dict[str, Any]] = []
        distribution: Counter[int] = Counter()
        for lead in leads:
            score = scorer.score_lead(lead)
            distribution[score] += 1
            if score < args.min_score:
                continue
            scored_rows.append({**lead, 'lead_score': score})

        written = _write_report(Path(args.output), scored_rows)
        print(_render_summary(len(leads), written, distribution))
        print(f'\nSaved scored leads report to {args.output}')
        return 0
    except Exception as error:  # pragma: no cover - CLI error path
        print(f'Error scoring leads: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
