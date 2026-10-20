import os
import re
import json
import time
import random
import requests
import pandas as pd
from datetime import datetime, timedelta

API_URL = "http://localhost:8080"
API_KEY = "sierra_secret_key_2026"

INSTANCES = [
    "sierra_01032206443",
    "sierra_01092048333",
    "sierra_01031622600",
    "sierra_01061399688"
]

SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/export?format=csv"
CHECKPOINT_FILE = "sierra_checkpoint.json"
MASTER_DB_FILE = "Sierra_Estates_Master_Units.xlsx"

GREETINGS = [
    "أهلاً بحضرتك يا فندم،",
    "مساء الخير،",
    "تحياتي لحضرتك،",
    "السلام عليكم ورحمة الله،"
]

MESSAGES = [
    "معاك فريق إدارة وتسويق العقارات بسييرا، بخصوص وحدتكم المعروضة هل ما زالت متاحة للتسويق المباشر؟",
    "بنتواصل مع حضرتك بخصوص تسويق العقار لقاعدة عملاء جاهزة للتنفيذ الفوري.",
    "مع حضرتك سييرا لإدارة الأصول، حابين ننسق مع حضرتك بخصوص تفاصيل الوحدة لتسجيلها وعرضها."
]

def is_day_shift():
    now = datetime.now()
    return 10 <= now.hour < 21

def clean_phone(raw):
    if pd.isna(raw):
        return None
    raw_str = str(raw).split('.')[0].strip()
    digits = re.sub(r'\D', '', raw_str)
    if digits.startswith('201') and len(digits) == 12:
        return digits
    elif digits.startswith('01') and len(digits) == 11:
        return '2' + digits
    elif digits.startswith('1') and len(digits) == 10:
        return '20' + digits
    elif len(digits) >= 10:
        return digits
    return None

def fetch_sheet_data():
    try:
        df = pd.read_csv(SHEET_CSV_URL)
        return df
    except Exception as e:
        print(f"[Sheet Sync] يتعذر تحميل الشيت حالياً: {e}")
        return None

def load_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"last_row": 0, "instance_idx": 0, "contacted": []}

def save_checkpoint(row, inst_idx, contacted):
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "last_row": row,
            "instance_idx": inst_idx,
            "contacted": list(contacted),
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }, f, ensure_ascii=False, indent=2)

def send_msg(instance, phone, text):
    url = f"{API_URL}/message/sendText/{instance}"
    headers = {"apikey": API_KEY, "Content-Type": "application/json"}
    payload = {"number": phone, "text": text, "delay": 1500}
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=20)
        return res.status_code in [200, 201]
    except Exception:
        return False

def process_night_shift(df):
    print("\n🌙 [وردية الليل] فحص البيانات، التكويد الذكي، وإعداد إعلانات Property Finder...")
    if df is None or df.empty:
        return

    df_master = pd.DataFrame()
    if os.path.exists(MASTER_DB_FILE):
        try:
            df_master = pd.read_excel(MASTER_DB_FILE)
        except Exception:
            pass

    new_rows = []
    phone_col = None
    for col in df.columns:
        if any(k in str(col).lower() for k in ['phone', 'mobile', 'هاتف', 'موبايل']):
            phone_col = col
            break
    if not phone_col:
        phone_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]

    for idx, row in df.iterrows():
        phone = clean_phone(row[phone_col])
        if not phone:
            continue

        price = str(row.get('Monthly Rent (EGP)', row.get('Price', 'غير محدد')))
        dedup_key = f"{phone}_{price}"

        if not df_master.empty and "Dedup Key" in df_master.columns and dedup_key in df_master["Dedup Key"].astype(str).values:
            continue

        compound = str(row.get('Compound / Project', row.get('Compound', 'القاهرة الجديدة')))
        prop_type = str(row.get('Property Type', 'شقة'))
        beds = str(row.get('Beds', row.get('Bedrooms', '3')))
        
        c_code = "NC"
        if "mivida" in compound.lower(): c_code = "MIV"
        elif "rehab" in compound.lower(): c_code = "REH"
        elif "madinaty" in compound.lower(): c_code = "MAD"
        elif "square" in compound.lower(): c_code = "SQR"
        elif "lake" in compound.lower(): c_code = "LKV"

        unit_code = f"{c_code}-APT-{beds}B-PF"

        pf_title_ar = f"{prop_type} للإيجار/البيع في {compound} | {beds} غرف | كود {unit_code}"
        pf_desc_ar = f"متاح الآن {prop_type} راقية داخل {compound}.\nالتقسيم: {beds} غرف نوم.\nالقيمة: {price} ج.م.\nكود المعاينة: {unit_code}\nللحجز والتواصل المباشر مع إدارة سييرا."

        new_rows.append({
            "Unit Code": unit_code,
            "Compound": compound,
            "Property Type": prop_type,
            "Bedrooms": beds,
            "Price": price,
            "Owner Phone": phone,
            "Dedup Key": dedup_key,
            "PF Title AR": pf_title_ar,
            "PF Desc AR": pf_desc_ar,
            "Processed At": datetime.now().strftime("%Y-%m-%d %H:%M")
        })

    if new_rows:
        df_new = pd.DataFrame(new_rows)
        df_final = pd.concat([df_master, df_new], ignore_index=True)
        df_final.to_excel(MASTER_DB_FILE, index=False)
        print(f"✓ تم تكويد وتسجيل {len(new_rows)} وحدة جديدة وتوليد إعلاناتها في: {MASTER_DB_FILE}")
    else:
        print("✓ لا توجد وحدات جديدة غير مسجلة.")

def main():
    print("=== بدء تشغيل سيرفر سييرا الذكي (24/7 Automation) ===")
    while True:
        df = fetch_sheet_data()
        cp = load_checkpoint()
        last_row = cp.get("last_row", 0)
        inst_idx = cp.get("instance_idx", 0)
        contacted = set(cp.get("contacted", []))

        if is_day_shift():
            active_inst = INSTANCES[inst_idx]
            print(f"\n☀️ [وردية النهار] تشغيل الرقم: [{active_inst}]")
            print(f"المستهدف: 30 رسالة خلال 30 دقيقة...")

            shift_start = time.time()
            sent_count = 0

            if df is not None:
                phone_col = None
                for col in df.columns:
                    if any(k in str(col).lower() for k in ['phone', 'mobile', 'هاتف', 'موبايل']):
                        phone_col = col
                        break
                if not phone_col:
                    phone_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]

                rows_total = len(df)
                while sent_count < 30 and last_row < rows_total and is_day_shift():
                    raw_val = df.iloc[last_row][phone_col]
                    phone = clean_phone(raw_val)

                    if phone and phone not in contacted:
                        msg = f"{random.choice(GREETINGS)}\n{random.choice(MESSAGES)}"
                        print(f"[{active_inst}] إرسال ({sent_count + 1}/30) إلى: {phone}")
                        success = send_msg(active_inst, phone, msg)
                        if success:
                            contacted.add(phone)
                            print("  ✓ تم الإرسال")
                        else:
                            print("  ✗ تعذر الإرسال")

                        sent_count += 1
                        last_row += 1
                        save_checkpoint(last_row, inst_idx, contacted)
                        time.sleep(random.randint(45, 65))
                    else:
                        last_row += 1
                        save_checkpoint(last_row, inst_idx, contacted)

            elapsed = time.time() - shift_start
            rem = 1800 - elapsed
            if rem > 0 and is_day_shift():
                print(f"اكتملت حصة [{active_inst}]. راحة {int(rem/60)} دقيقة قبل تسليم الرقم التالي...")
                time.sleep(rem)

            inst_idx = (inst_idx + 1) % len(INSTANCES)
            save_checkpoint(last_row, inst_idx, contacted)
        else:
            process_night_shift(df)
            now = datetime.now()
            target = (now + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0) if now.hour >= 21 else now.replace(hour=10, minute=0, second=0, microsecond=0)
            sleep_sec = int((target - now).total_seconds())
            print(f"🌙 السيرفر في وضع المعالجة الليلي. استئناف الإرسال في 10:00 صباحاً (بعد {round(sleep_sec/3600, 1)} ساعة)...")
            time.sleep(min(sleep_sec, 1800))

if __name__ == "__main__":
    main()
