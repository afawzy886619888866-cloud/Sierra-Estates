#!/usr/bin/env python3
"""send_garden_owners_broadcast.py.

Automated WhatsApp Broadcast Script for Sierra Estates:
Sends the designated outreach message from Ahmed Fawzy to all property owners
with garden units.

Target Audience: Verified Owners with Garden Units in New Cairo / Madinaty / Rehab / Mivida.
Supports:
  1. Dry Run / Validation Mode (default)
  2. Direct WhatsApp Cloud API / Twilio Dispatch
  3. Batch pacing with random delays (45-75s) to avoid WhatsApp rate limits and spam blocks.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import random
import sys
import time
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv('.env.local')
load_dotenv('.env')

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

MESSAGE_TEXT = (
    "مساء الخيرات , يارب تكون بخير - مع حضرتك احمد فوزي من سييرا استيتس - "
    "كنت بسال لو الوحده الي حضرتك كنت عارضها متاحه ؟ "
    "معانا اكتر من عميل مهتم سواء بيع او ايجار باذن الله - "
    "استاذن حضرتك بس ارسلنا المعلومات اكون شاكر لحضرتك جدا"
)

CAMPAIGN_FILE = Path('whatsapp_garden_owners_campaign.csv')


def send_via_whatsapp_api(phone: str, message: str) -> tuple[str, str]:
    """Send via configured WhatsApp API provider."""
    # 1. WhatsApp Cloud API / Meta Graph API
    meta_token = os.getenv('WHATSAPP_API_TOKEN') or os.getenv('WHATSAPP_META_TOKEN')
    phone_id = os.getenv('WHATSAPP_PHONE_NUMBER_ID')
    api_url = os.getenv('WHATSAPP_API_URL')

    if api_url and meta_token:
        try:
            resp = requests.post(
                api_url,
                headers={
                    'Authorization': f'Bearer {meta_token}',
                    'X-API-Token': meta_token,
                    'Content-Type': 'application/json',
                },
                json={'to': phone, 'message': message},
                timeout=30,
            )
            if resp.ok:
                return 'sent', resp.text[:150]
            return 'failed', f'{resp.status_code}: {resp.text[:150]}'
        except Exception as err:
            return 'failed', str(err)

    # 2. Twilio WhatsApp API fallback
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    from_wa = os.getenv('TWILIO_WA_FROM') or os.getenv('TWILIO_PHONE_NUMBER')

    if account_sid and auth_token and from_wa:
        try:
            from_str = f"whatsapp:{from_wa.replace('whatsapp:', '')}"
            to_str = f"whatsapp:+{phone}"
            resp = requests.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
                auth=(account_sid, auth_token),
                data={
                    'From': from_str,
                    'To': to_str,
                    'Body': message,
                },
                timeout=30,
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                return 'sent', f"SID: {data.get('sid')}"
            return 'failed', f"{resp.status_code}: {resp.text[:150]}"
        except Exception as err:
            return 'failed', str(err)

    return 'no_provider', 'No WhatsApp API credentials configured for direct delivery.'


def main() -> int:
    parser = argparse.ArgumentParser(description="Send WhatsApp outreach to garden unit owners.")
    parser.add_argument('--send', action='store_true', help="Actually send messages (default is dry-run)")
    parser.add_argument('--limit', type=int, default=0, help="Limit number of messages to process (0 = all)")
    parser.add_argument('--delay-min', type=int, default=30, help="Minimum delay between sends in seconds")
    parser.add_argument('--delay-max', type=int, default=60, help="Maximum delay between sends in seconds")
    args = parser.parse_args()

    if not CAMPAIGN_FILE.exists():
        print(f"Error: {CAMPAIGN_FILE} not found.", file=sys.stderr)
        return 1

    with CAMPAIGN_FILE.open('r', encoding='utf-8-sig') as f:
        reader = list(csv.DictReader(f))

    total = len(reader)
    if args.limit > 0:
        reader = reader[:args.limit]

    print("═════════════════════════════════════════════════════════════════════════")
    print("  SIERRA ESTATES — WHATSAPP GARDEN OWNERS OUTREACH")
    print(f"  Total Recipients: {len(reader)} (from {total} target owners)")
    print(f"  Mode: {'🚀 LIVE SEND' if args.send else '🔍 DRY RUN (Simulation)'}")
    print("  Sender: Ahmed Fawzy (سييرا استيتس)")
    print("═════════════════════════════════════════════════════════════════════════\n")

    sent_count = 0
    failed_count = 0

    for i, row in enumerate(reader, start=1):
        phone = row.get('Phone Number', '').strip()
        name = row.get('Owner Name', 'Owner').strip()
        compound = row.get('Compound', 'New Cairo').strip()
        unit_code = row.get('Unit Code', '').strip()

        print(f"[{i}/{len(reader)}] Target: {name} | Phone: +{phone} | Unit: {unit_code} ({compound})")

        if not args.send:
            print(f"   [DRY RUN] Message ready to send ({len(MESSAGE_TEXT)} chars)")
            continue

        status, detail = send_via_whatsapp_api(phone, MESSAGE_TEXT)
        if status == 'sent':
            sent_count += 1
            print(f"   ✅ SENT successfully: {detail}")
        else:
            failed_count += 1
            print(f"   ⚠️ FAILED ({status}): {detail}")

        if i < len(reader) and args.send:
            sleep_time = random.uniform(args.delay_min, args.delay_max)
            print(f"   ⏳ Pacing pause: sleeping {sleep_time:.1f}s...")
            time.sleep(sleep_time)

    print("\n═════════════════════════════════════════════════════════════════════════")
    if args.send:
        print(f"  Summary: Sent={sent_count}, Failed={failed_count}")
    else:
        print(f"  Dry run complete. To start sending, pass --send flag.")
    print("═════════════════════════════════════════════════════════════════════════")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
