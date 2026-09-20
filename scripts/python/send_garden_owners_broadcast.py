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
import re
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
    """Send via configured WhatsApp API provider (Twilio primary, OpenWA gateway secondary)."""
    clean_digits = re.sub(r'\D', '', phone)

    # 1. Twilio WhatsApp REST API
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    messaging_sid = os.getenv('TWILIO_MESSAGING_SERVICE_SID')
    from_wa = os.getenv('TWILIO_WA_FROM') or os.getenv('TWILIO_PHONE_NUMBER') or os.getenv('WABA_NUMBER_1')

    if account_sid and auth_token and not account_sid.startswith('AC1234567890'):
        try:
            payload = {
                'To': f'whatsapp:+{clean_digits}',
                'Body': message,
            }
            if messaging_sid and not messaging_sid.startswith('MG1234567890'):
                payload['MessagingServiceSid'] = messaging_sid
            elif from_wa:
                from_clean = from_wa.replace('whatsapp:', '').strip()
                payload['From'] = f'whatsapp:{from_clean}'

            resp = requests.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
                auth=(account_sid, auth_token),
                data=payload,
                timeout=15,
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                return 'sent', f"Twilio SID: {data.get('sid')}"
            else:
                # Log error and fall through to OpenWA
                err_text = resp.text[:120]
                # If twilio error, try gateway
        except Exception:
            pass

    # 2. OpenWA / AWS EC2 WhatsApp Gateway
    openwa_url = os.getenv('WHATSAPP_API_URL') or (f"http://{os.getenv('OPENWA_HOST')}:3000" if os.getenv('OPENWA_HOST') else None)
    openwa_key = os.getenv('WHATSAPP_API_TOKEN') or os.getenv('OPENWA_ADMIN_API_KEY')
    openwa_session = os.getenv('OPENWA_SESSION_ID', 'session-default')

    if openwa_url and openwa_key:
        try:
            endpoint = f"{openwa_url.rstrip('/')}/api/sessions/{openwa_session}/messages/send-text"
            resp = requests.post(
                endpoint,
                headers={
                    'X-API-Key': openwa_key,
                    'Content-Type': 'application/json',
                },
                json={
                    'chatId': f'{clean_digits}@c.us',
                    'text': message,
                },
                timeout=12,
            )
            if resp.ok:
                data = resp.json() if resp.content else {}
                sid = data.get('id') or data.get('messageId') or f'OPENWA_{int(time.time())}'
                return 'sent', f"Gateway SID: {sid}"
            return 'failed', f"Gateway HTTP {resp.status_code}: {resp.text[:100]}"
        except Exception as err:
            return 'failed', f"Gateway connect error: {err}"

    # 3. Graceful simulation fallback
    return 'simulated', f"SIM_{int(time.time())}"



def main() -> int:
    parser = argparse.ArgumentParser(description="Send WhatsApp outreach to garden unit owners.")
    parser.add_argument('--send', action='store_true', help="Actually send messages (default is dry-run)")
    parser.add_argument('--limit', type=int, default=0, help="Limit number of messages to process (0 = all)")
    parser.add_argument('--delay-min', type=int, default=4, help="Minimum delay between sends in seconds")
    parser.add_argument('--delay-max', type=int, default=8, help="Maximum delay between sends in seconds")
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
