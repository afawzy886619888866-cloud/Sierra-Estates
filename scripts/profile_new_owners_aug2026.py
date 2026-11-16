from __future__ import annotations

import json
import shutil
import sys
from collections import Counter
from pathlib import Path

ROOT = Path('/home/ubuntu/whatsapp_inventory')
ARCHIVE_ROOT = ROOT / 'new_owners_aug2026'
PROFILE_SOURCE = ARCHIVE_ROOT / 'profile_source'
OUT = ARCHIVE_ROOT / 'profile'
CHAT = ARCHIVE_ROOT / 'WhatsApp Chat with Owners August 2026.txt'
MEDIA_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.mp4', '.mov', '.pdf', '.vcf'}

sys.path.insert(0, str(ROOT))
import extract_rental_candidates as extractor  # type: ignore


def main() -> None:
    if PROFILE_SOURCE.exists():
        shutil.rmtree(PROFILE_SOURCE)
    PROFILE_SOURCE.mkdir(parents=True, exist_ok=True)
    group_dir = PROFILE_SOURCE / 'WhatsApp_Chat_with_Owners_August_2026'
    group_dir.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(CHAT, group_dir / 'chat.txt')

    old_root = extractor.SOURCE_ROOT
    extractor.SOURCE_ROOT = PROFILE_SOURCE
    records, outcomes, parsed = extractor.process_file(group_dir / 'chat.txt')
    extractor.SOURCE_ROOT = old_root

    for i, record in enumerate(records, start=1):
        record['id'] = f'OWNERS-AUG26-{i:05d}'
        record['source_group'] = 'WhatsApp Chat with Owners August 2026'
        record['source_zip'] = 'WhatsAppChatwithOwnersAugust2026.zip'
        record['source_file'] = 'WhatsAppChatwithOwnersAugust2026.zip::WhatsApp Chat with Owners August 2026.txt'

    media = []
    for path in sorted(ARCHIVE_ROOT.rglob('*')):
        if path.is_file() and path.suffix.lower() in MEDIA_EXTENSIONS:
            media.append({'file_name': path.name, 'path': str(path), 'extension': path.suffix.lower(), 'bytes': path.stat().st_size})

    summary = {
        'archive': 'WhatsAppChatwithOwnersAugust2026.zip',
        'messages_parsed': parsed,
        'rental_candidates': len(records),
        'needs_review': sum(1 for r in records if r.get('candidate_status') == 'needs_review'),
        'ready_for_normalization': sum(1 for r in records if r.get('candidate_status') == 'ready_for_normalization'),
        'direct_owner': sum(1 for r in records if r.get('source_type') == 'direct_owner'),
        'broker': sum(1 for r in records if r.get('source_type') == 'broker'),
        'outcomes': dict(outcomes),
        'locations': Counter(r.get('location') or 'Unresolved' for r in records).most_common(30),
        'media_files': len(media),
        'media_extensions': dict(Counter(item['extension'] for item in media)),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'records.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
    (OUT / 'media_manifest.json').write_text(json.dumps(media, ensure_ascii=False, indent=2), encoding='utf-8')
    (OUT / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
