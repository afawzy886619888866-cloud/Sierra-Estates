#!/usr/bin/env python3
"""Export Firestore collections to JSON or CSV."""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

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
        raise RuntimeError('FIREBASE_SERVICE_ACCOUNT_JSON is required for Firestore exports.')
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


def _serialize_value(value: Any) -> Any:
    """Convert Firestore values into JSON-safe data."""
    if hasattr(value, 'isoformat'):
        try:
            return value.isoformat()
        except TypeError:
            pass
    if isinstance(value, dict):
        return {key: _serialize_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    return value


def _document_to_dict(document: Any, deep: bool) -> dict[str, Any]:
    """Serialize a document, optionally including nested subcollections."""
    payload = {'id': document.id, **_serialize_value(document.to_dict() or {})}
    if deep:
        payload['_subcollections'] = {}
        for subcollection in document.reference.collections():
            payload['_subcollections'][subcollection.id] = [
                _document_to_dict(subdocument, True)
                for subdocument in subcollection.stream()
            ]
    return payload


def _flatten_dict(data: dict[str, Any], prefix: str = '') -> dict[str, Any]:
    """Flatten nested dictionaries for CSV export."""
    flattened: dict[str, Any] = {}
    for key, value in data.items():
        compound_key = f'{prefix}.{key}' if prefix else key
        if isinstance(value, dict):
            flattened.update(_flatten_dict(value, compound_key))
        elif isinstance(value, list):
            flattened[compound_key] = json.dumps(value, ensure_ascii=False)
        else:
            flattened[compound_key] = value
    return flattened


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description='Export Firestore collections to JSON or CSV.')
    parser.add_argument('--collection', required=True, help='Firestore collection name to export.')
    parser.add_argument('--format', choices=('json', 'csv'), required=True, help='Export file format.')
    parser.add_argument('--output', required=True, help='Output file path.')
    parser.add_argument('--project-id', default=None, help='Optional Firebase project id override.')
    parser.add_argument('--deep', action='store_true', help='Include nested subcollections recursively.')
    return parser.parse_args()


def main() -> int:
    """CLI entry point."""
    args = parse_args()
    exported_at = datetime.now(timezone.utc).isoformat()

    try:
        client = _load_firestore_client(args.project_id)
        documents = [
            {**_document_to_dict(document, args.deep), 'exported_at': exported_at}
            for document in client.collection(args.collection).stream()
        ]
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if args.format == 'json':
            output_path.write_text(
                json.dumps(
                    {
                        'collection': args.collection,
                        'exported_at': exported_at,
                        'documents': documents,
                    },
                    indent=2,
                    ensure_ascii=False,
                ),
                encoding='utf-8',
            )
        else:
            flattened_documents = [_flatten_dict(document) for document in documents]
            fieldnames: list[str] = []
            for document in flattened_documents:
                for key in document.keys():
                    if key not in fieldnames:
                        fieldnames.append(key)
            with output_path.open('w', encoding='utf-8', newline='') as handle:
                writer = csv.DictWriter(handle, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(flattened_documents)

        print(f'Exported {len(documents)} documents from {args.collection} to {output_path}')
        return 0
    except Exception as error:  # pragma: no cover - CLI error path
        print(f'Error exporting Firestore data: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
