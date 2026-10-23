"""
Sierra PropTech — 24/7 Orchestrator & Inventory Engine (Evolution API)
Hardened edition (2026-10-23). English codebase.

WHAT THIS IS
    Day-shift (10:00-21:00 Africa/Cairo) outbound engine that:
      - Rotates across configured Evolution API WhatsApp instances
      - Sends owner-outreach messages from a Google Sheet lead list
      - Enforces a 30-messages / 30-minutes quota per instance with 45-65s jitter
      - Keeps an atomic checkpoint (row pointer, rotation index, contacted set,
        dead-letter queue) so restarts resume exactly where they stopped
      - Codes new sheet units (unit codes, Property Finder EN title/description)
        into a local Excel ledger with durable Dedup Key dedup

    In CI (GITHUB_ACTIONS=1 or CI_SINGLE_RUN=1) it runs ONE cycle and exits —
    used by .github/workflows/sierra.yml (manual dispatch only).

SECURITY MODEL (differs from the original draft on purpose)
    - NO credentials, phone numbers, instance names, or sheet IDs hardcoded.
      This file lives in a PUBLIC repo; everything sensitive is an env var.
    - Failed sends go to the dead-letter queue and are NEVER retried blindly.
    - Missing config is reported honestly (skips + log), never faked.

ENVIRONMENT
    EVOLUTION_API_URL   Evolution API base (default http://localhost:8080)
    EVOLUTION_API_KEY   REQUIRED for connectivity checks and sends
    SIERRA_INSTANCES    comma-separated instance names (REQUIRED for outbound)
    SHEET_CSV_URL       Google Sheet CSV export URL (REQUIRED for sheet+inventory)
    CHECKPOINT_FILE     default sierra_checkpoint.json
    MASTER_DB_FILE      default Sierra_Estates_Master_Units.xlsx
    CI_SINGLE_RUN=true  run a single cycle and exit (CI mode)

RUN (local 24/7)
    python sierra_master.py
"""

import os
import re
import json
import time
import random
import logging
from datetime import datetime, timedelta

import requests

try:
    import pandas as pd
except ImportError:  # honest degrade: sheet features unavailable
    pd = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("sierra-master")

API_URL = os.getenv("EVOLUTION_API_URL", "http://localhost:8080")
API_KEY = os.getenv("EVOLUTION_API_KEY", "")
INSTANCES = [x.strip() for x in os.getenv("SIERRA_INSTANCES", "").split(",") if x.strip()]
SHEET_CSV_URL = os.getenv("SHEET_CSV_URL", "")
CHECKPOINT_FILE = os.getenv("CHECKPOINT_FILE", "sierra_checkpoint.json")
MASTER_DB_FILE = os.getenv("MASTER_DB_FILE", "Sierra_Estates_Master_Units.xlsx")
IS_CI = os.getenv("GITHUB_ACTIONS") == "true" or os.getenv("CI_SINGLE_RUN") == "true"

GREETINGS = [
    "Hello,",
    "Good day,",
    "Greetings from Sierra Estates,",
    "Hi there:",
]

MESSAGES = [
    "This is the property management and marketing team at Sierra PropTech. Is your listed property still available for direct marketing to our verified clients?",
    "We are reaching out from Sierra Estates regarding your property listing—we have qualified clients ready for immediate viewing and closing.",
    "This is Sierra Asset Management. We would love to confirm the latest details of your unit so we can feature it to our active buyer/tenant network.",
]

try:
    from zoneinfo import ZoneInfo
    _CAIRO = ZoneInfo("Africa/Cairo")

    def get_cairo_time():
        return datetime.now(_CAIRO)
except Exception:  # tzdata not installed — fixed UTC+2 fallback (no DST)
    log.warning("zoneinfo/Africa/Cairo unavailable (pip install tzdata) — using fixed UTC+2")

    def get_cairo_time():
        return datetime.utcnow() + timedelta(hours=2)


def is_day_shift():
    now = get_cairo_time()
    return 10 <= now.hour < 21


def clean_phone(raw):
    """Normalize sheet phone cells (handles Excel float artifacts like 01032206443.0)."""
    if pd is not None and pd.isna(raw):
        return None
    raw_str = str(raw).split('.')[0].strip()
    digits = re.sub(r'\D', '', raw_str)
    if digits.startswith('00'):
        digits = digits[2:]
    if digits.startswith('201') and len(digits) == 12:
        return digits
    elif digits.startswith('01') and len(digits) == 11:
        return '2' + digits
    elif digits.startswith('1') and len(digits) == 10:
        return '20' + digits
    elif len(digits) >= 10:
        return digits
    return None


def detect_phone_col(df):
    for col in df.columns:
        if any(k in str(col).lower() for k in ['phone', 'mobile', 'contact', 'tel', 'number']):
            return col
    return df.columns[1] if len(df.columns) > 1 else df.columns[0]


def fetch_sheet_data(retries=3):
    if pd is None or not SHEET_CSV_URL:
        log.error("sheet fetch skipped: pandas missing or SHEET_CSV_URL not set")
        return None
    for attempt in range(retries):
        try:
            return pd.read_csv(SHEET_CSV_URL)
        except Exception as exc:
            log.warning("sheet download attempt %s/%s failed: %s", attempt + 1, retries, exc)
            time.sleep(5 * (attempt + 1))
    return None


def load_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            log.warning("checkpoint unreadable — starting fresh")
    return {"last_row": 0, "instance_idx": 0, "contacted": [], "failed_dead_letter": []}


def save_checkpoint(row, inst_idx, contacted, failed_dlq=None):
    tmp_file = f"{CHECKPOINT_FILE}.tmp"
    payload = {
        "last_row": row,
        "instance_idx": inst_idx,
        "contacted": list(contacted),
        "failed_dead_letter": list(failed_dlq) if failed_dlq is not None else [],
        "updated_at": get_cairo_time().strftime("%Y-%m-%d %H:%M:%S"),
    }
    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    os.replace(tmp_file, CHECKPOINT_FILE)


def is_instance_connected(instance):
    if not API_KEY:
        log.error("EVOLUTION_API_KEY not set — connectivity check impossible")
        return False
    url = f"{API_URL}/instance/connectionState/{instance}"
    headers = {"apikey": API_KEY}
    try:
        res = requests.get(url, headers=headers, timeout=8)
        if res.status_code == 200:
            data = res.json()
            state = data.get("instance", {}).get("state") or data.get("state")
            return state == "open"
        log.warning("connectionState %s -> HTTP %s", instance, res.status_code)
    except Exception as exc:
        log.warning("connectionState %s unreachable: %s", instance, exc)
    return False


def send_msg(instance, phone, text, retries=2):
    if not API_KEY:
        log.error("EVOLUTION_API_KEY not set — send skipped (no fake success)")
        return False
    url = f"{API_URL}/message/sendText/{instance}"
    headers = {"apikey": API_KEY, "Content-Type": "application/json"}
    payload = {"number": phone, "text": text, "delay": 1500}
    for attempt in range(retries):
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=20)
            log.info("sendText instance=%s to=%s -> HTTP %s", instance, phone, res.status_code)
            if res.status_code in [200, 201]:
                return True
        except Exception as exc:
            log.warning("send attempt %s to %s failed: %s", attempt + 1, phone, exc)
            time.sleep(3 * (attempt + 1))
    return False


COMPOUND_CODES = [
    ("mivida", "MIV"), ("rehab", "REH"), ("madinaty", "MAD"),
    ("square", "SQR"), ("lake", "LKV"),
]
TYPE_CODES = [
    ("villa", "VIL"), ("townhouse", "TH"), ("twinhouse", "TW"),
    ("duplex", "DUP"), ("penthouse", "PEN"), ("studio", "STD"),
    ("chalet", "CHL"), ("office", "OFF"),
]


def _unit_code(compound, prop_type, beds):
    c_code = "NC"
    c_lower = str(compound).lower()
    for needle, code in COMPOUND_CODES:
        if needle in c_lower:
            c_code = code
            break
    t_code = "APT"
    p_lower = str(prop_type).lower()
    for needle, code in TYPE_CODES:
        if needle in p_lower:
            t_code = code
            break
    bed_part = f"{beds}B" if beds else "NB"
    return f"{c_code}-{t_code}-{bed_part}-PF"


def process_inventory_coding(df):
    """Audit sheet rows, code units, build Property Finder EN copy, dedup to Excel."""
    log.info("[Inventory Engine] Auditing sheet data, generating unit codes, building PF listings...")
    if df is None or df.empty:
        log.warning("[Inventory Engine] Sheet is empty or unreachable.")
        return

    df_master = pd.DataFrame()
    if os.path.exists(MASTER_DB_FILE):
        try:
            df_master = pd.read_excel(MASTER_DB_FILE)
        except Exception as exc:
            log.warning("master ledger unreadable (%s) — rebuilding", exc)

    new_rows = []
    phone_col = detect_phone_col(df)

    for _, row in df.iterrows():
        phone = clean_phone(row[phone_col])
        if not phone:
            continue

        price = str(row.get('Monthly Rent (EGP)', row.get('Price', 'TBD')))
        dedup_key = f"{phone}_{price}"

        if (not df_master.empty and "Dedup Key" in df_master.columns
                and dedup_key in df_master["Dedup Key"].astype(str).values):
            continue

        # Honest field extraction: unknown stays unknown (no fabricated values)
        compound = str(row.get('Compound / Project', row.get('Compound', '')) or 'Unclassified')
        prop_type = str(row.get('Property Type', '') or 'Unclassified')
        beds_raw = row.get('Beds', row.get('Bedrooms', None))
        beds = None if pd.isna(beds_raw) or str(beds_raw).strip() == '' else str(beds_raw)

        unit_code = _unit_code(compound, prop_type, beds)
        bed_seg = f" | {beds} Bedrooms" if beds else ""
        pf_title_en = f"{prop_type} for Rent/Sale in {compound}{bed_seg} | Ref {unit_code}"
        pf_desc_en = (
            f"Prime {prop_type} available now in {compound}.\n"
            f"Layout: {beds} Bedrooms.\n" if beds else
            f"Prime {prop_type} available now in {compound}.\n"
            f"Layout: on request.\n"
        ) + (
            f"Asking Price: {price} EGP.\n"
            f"Reference Code: {unit_code}\n"
            f"Contact Sierra Estates Management directly to schedule a private viewing."
        )

        new_rows.append({
            "Unit Code": unit_code,
            "Compound": compound,
            "Property Type": prop_type,
            "Bedrooms": beds or "N/A",
            "Price": price,
            "Owner Phone": phone,
            "Dedup Key": dedup_key,
            "PF Title EN": pf_title_en,
            "PF Desc EN": pf_desc_en,
            "Processed At": get_cairo_time().strftime("%Y-%m-%d %H:%M"),
        })

    if new_rows:
        df_new = pd.DataFrame(new_rows)
        df_final = pd.concat([df_master, df_new], ignore_index=True)
        df_final.to_excel(MASTER_DB_FILE, index=False)
        log.info("[Inventory Engine] Coded and saved %s new units to %s", len(new_rows), MASTER_DB_FILE)
    else:
        log.info("[Inventory Engine] No new unrecorded units found.")


def run_cycle():
    df = fetch_sheet_data()
    cp = load_checkpoint()
    last_row = cp.get("last_row", 0)
    inst_idx = cp.get("instance_idx", 0)
    contacted = set(cp.get("contacted", []))
    failed_dlq = set(cp.get("failed_dead_letter", []))

    process_inventory_coding(df)

    if not INSTANCES:
        log.error("SIERRA_INSTANCES not configured — outbound messaging disabled")
        save_checkpoint(last_row, inst_idx, contacted, failed_dlq)
        return

    if is_day_shift():
        connected_inst = None
        for _ in range(len(INSTANCES)):
            candidate = INSTANCES[inst_idx]
            if is_instance_connected(candidate):
                connected_inst = candidate
                break
            log.warning("[Health Check] Instance [%s] is not connected/open. Trying next...", candidate)
            inst_idx = (inst_idx + 1) % len(INSTANCES)

        if not connected_inst:
            log.warning("[Warning] No connected WhatsApp instances. Skipping outbound for this cycle.")
            save_checkpoint(last_row, inst_idx, contacted, failed_dlq)
            return

        log.info("[Day Shift] Active WhatsApp Instance: [%s]", connected_inst)
        log.info("[Day Shift] Target quota: 30 messages over 30 minutes...")

        shift_start = time.time()
        sent_count = 0

        if df is not None and not df.empty:
            phone_col = detect_phone_col(df)
            rows_total = len(df)

            while sent_count < 30 and last_row < rows_total and is_day_shift():
                raw_val = df.iloc[last_row][phone_col]
                phone = clean_phone(raw_val)

                if phone and phone not in contacted and phone not in failed_dlq:
                    msg = f"{random.choice(GREETINGS)}\n{random.choice(MESSAGES)}"
                    log.info("[%s] Sending (%s/30) to: %s", connected_inst, sent_count + 1, phone)
                    if send_msg(connected_inst, phone, msg):
                        contacted.add(phone)
                        log.info("  -> Sent successfully")
                    else:
                        failed_dlq.add(phone)
                        log.warning("  -> Send failed (added to dead-letter queue, will not blind-retry)")

                    sent_count += 1
                    last_row += 1
                    save_checkpoint(last_row, inst_idx, contacted, failed_dlq)
                    if not IS_CI:
                        time.sleep(random.randint(45, 65))
                else:
                    # skip blank / already-contacted / dead-letter rows without
                    # consuming quota
                    last_row += 1
                    save_checkpoint(last_row, inst_idx, contacted, failed_dlq)

            if last_row >= rows_total:
                log.info("[Day Shift] Reached end of sheet. Resetting row pointer to 0.")
                last_row = 0

        inst_idx = (inst_idx + 1) % len(INSTANCES)
        save_checkpoint(last_row, inst_idx, contacted, failed_dlq)

        if not IS_CI:
            elapsed = time.time() - shift_start
            rem = 1800 - elapsed
            if rem > 0 and is_day_shift():
                log.info("[Day Shift] Quota finished for [%s]. Cooling down for %s minutes...",
                         connected_inst, int(rem / 60))
                time.sleep(rem)
    else:
        save_checkpoint(last_row, inst_idx, contacted, failed_dlq)
        if not IS_CI:
            now = get_cairo_time()
            target = ((now + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
                      if now.hour >= 21
                      else now.replace(hour=10, minute=0, second=0, microsecond=0))
            sleep_sec = int((target - now).total_seconds())
            log.info("[Night Shift] Outbound paused outside 10:00-21:00 Cairo. Resuming in %s hours...",
                     round(sleep_sec / 3600, 1))
            time.sleep(min(sleep_sec, 1800))


def main():
    log.info("=== Sierra PropTech 24/7 Workflow Orchestrator Started ===")
    if IS_CI:
        run_cycle()
        log.info("=== CI Single Cycle Completed Successfully ===")
    else:
        while True:
            run_cycle()


if __name__ == "__main__":
    main()
