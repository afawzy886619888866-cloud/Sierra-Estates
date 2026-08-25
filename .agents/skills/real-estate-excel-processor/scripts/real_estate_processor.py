# -*- coding: utf-8 -*-
"""
Real Estate Processor — One File, GUI, No Terminal
Double-click to run. It installs its own dependencies.
"""
import os, sys, re, glob, time, subprocess, threading, importlib
import tkinter as tk
from tkinter import filedialog, messagebox

# ====================================================== CONFIG
USD_TO_EGP = 48.0
ID_PREFIX = "SB"
SKIP_FILES = ("Final_", "~$", "Missing_")
SKIP_SHEETS = ("dashboard", "summary", "pivot", "تعليمات")

COLUMN_SYNONYMS = {
    "Unit_Code": ["code", "كود", "unit code", "رقم الوحدة", "ref"],
    "Phone": ["mobile", "phone", "تليفون", "موبايل", "رقم الهاتف", "broker phone", "contact", "whatsapp"],
    "Price_Raw": ["price", "السعر", "الإيجار", "ايجار", "المطلوب", "unit price", "total price"],
    "Owner_Name": ["owner name", "اسم المالك", "الاسم", "name"],
    "Contact_Name": ["broker name", "اسم البروكر", "المعلن", "contact person"],
    "Listing_Date": ["timestamp", "listing date", "تاريخ العرض", "تاريخ الإعلان", "date"],
    "Update_Date": ["تاريخ اخر تحديث", "update date", "last update"],
    "Availability": ["availability", "avail", "الحالة", "المتاحية", "status"],
    "Rooms": ["bedrooms", "عدد الغرف", "الغرف", "rooms", "نوم"],
    "Bathrooms": ["bathrooms", "baths", "الحمامات", "حمام"],
    "Location": ["location", "المنطقة والكمبوند", "الكمبوند", "الموقع", "compound"],
    "Sub_Area": ["sub area", "المنطقة الفرعية", "المجاورة"],
    "Furnishing": ["furnishing", "حالة التأثيث", "التأثيث", "مفروش"],
    "Finishing": ["finishing", "تشطيب", "حالة التشطيب"],
    "Unit_Type": ["property type", "unit type", "نوع الوحدة", "النوع"],
    "Deal": ["transaction", "نوع المعاملة", "deal", "بيع/ايجار"],
    "Advertiser_Type": ["advertiser type", "نوع المعلن", "owner/broker", "المعلن"],
    "Area": ["space", "area", "المساحة", "مساحه"],
    "Garden": ["garden", "حديقة", "حديقه"],
    "Pool": ["pool", "حمام سباحة", "بسين"],
    "Source_Group": ["source_sheet", "group name", "اسم الجروب", "المصدر"],
    "Notes": ["notes", "ملاحظات", "تفاصيل", "الوصف", "description"],
}

COMPOUNDS = {
    "Madinaty": [r"مدينت[يى]", r"madinat"], "Al Rehab": [r"الرحاب", r"rehab"],
    "Mivida": [r"ميفيدا", r"mivida"], "Hyde Park": [r"هايد\s*بارك", r"hyde\s*park"],
    "Mountain View": [r"ماونتن\s*فيو", r"mountain\s*view"], "Villette": [r"فيليت", r"villette"],
    "Palm Hills": [r"بالم\s*هيلز", r"palm\s*hills"], "Eastown": [r"ايست\s*تاون", r"eastown"],
    "Swan Lake": [r"سوان\s*ليك", r"swan\s*lake"], "Katameya Dunes": [r"ديونز", r"dunes"],
    "Beit El Watan": [r"بيت\s*الوطن", r"beit\s*el\s*watan"], "El Shorouk": [r"الشروق", r"shorouk"],
    "Cairo Festival": [r"فستيفال", r"\bcfc\b"], "Fifth Square": [r"فيفت\s*سكوير", r"fifth\s*square"],
    "Sodic": [r"سوديك", r"sodic"], "New Cairo": [r"التجمع", r"new\s*cairo"],
    "Sheikh Zayed": [r"الشيخ\s*زايد", r"zayed"], "North Coast": [r"الساحل\s*الشمالي", r"north\s*coast"],
}

# ====================================================== HELPERS
UNKNOWN = {"*", "", "nan", "none", "null", "-", "n/a", "unknown", "غير مذكور"}

def clean_val(v):
    if pd.isna(v): return "Unknown"
    s = str(v).strip()
    return "Unknown" if s.lower() in UNKNOWN else s

def normalize_phone(v):
    if pd.isna(v): return None
    s = str(v).strip()
    if s.endswith(".0"): s = s[:-2]
    d = re.sub(r"\D", "", s)
    if not d: return None
    if d.startswith("20") and len(d) >= 12: d = d[2:]
    if len(d) == 10 and d.startswith("1"): d = "0" + d
    return d if len(d) >= 7 else None

def get_last7(v):
    d = re.sub(r"\D", "", str(v)) if v else ""
    return d[-7:] if len(d) >= 7 else ""

def parse_price(v):
    if pd.isna(v): return (np.nan, "EGP")
    s = str(v).strip()
    if s.lower() in UNKNOWN: return (np.nan, "EGP")
    cur = "USD" if re.search(r"\$|usd|dollar|دولار", s, re.I) else "EGP"
    m = re.search(r"\d+(?:[.,]\d+)*", s)
    if not m: return (np.nan, cur)
    t = m.group(0)
    if re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", t): t = re.sub(r"[.,]", "", t)
    else: t = t.replace(",", "")
    try: n = float(t)
    except: return (np.nan, cur)
    tail = s[m.end():m.end()+10]
    if re.match(r"\s*(مليون|ملون|million)\b", tail, re.I) or re.match(r"\s*m(?![2²0-9])", tail, re.I):
        n *= 1_000_000
    elif re.match(r"\s*(الف|ألف|thousand)\b", tail, re.I) or re.match(r"\s*k(?![a-z0-9])", tail, re.I):
        n *= 1_000
    return (n, cur)

def parse_num(v):
    if pd.isna(v): return np.nan
    s = str(v).strip().lower()
    if s in UNKNOWN: return np.nan
    m = re.search(r"\d+(?:\.\d+)?", s)
    return float(m.group(0)) if m else np.nan

def parse_date(v):
    if pd.isna(v): return pd.NaT
    s = str(v).strip()
    if s.lower() in ("", "nan", "none", "nat", "*", "unknown"): return pd.NaT
    for kw in ({"dayfirst": True}, {"dayfirst": False}, {"format": "mixed"}):
        try: return pd.to_datetime(s, errors="raise", **kw)
        except: pass
    return pd.NaT

def normalize_code(v):
    s = clean_val(v)
    if s == "Unknown": return np.nan
    s = re.sub(r"^(كود|code|unit|ref)\s*[:\-_]?\s*", "", s, flags=re.I)
    return re.sub(r"\s+", "", s).upper() or np.nan

def normalize_deal(v):
    s = str(v).strip().lower() if pd.notna(v) else ""
    if any(w in s for w in ("ايجار", "إيجار", "rent")): return "Rent"
    if any(w in s for w in ("بيع", "sale", "sell", "resale", "تنازل")): return "Sale"
    return "Unknown"

def normalize_compound(loc, notes):
    comb = f"{loc} {notes}".lower()
    for std, pats in COMPOUNDS.items():
        if any(re.search(p, comb, re.I) for p in pats): return std
    return clean_val(loc)

def map_cols(headers):
    lows = [str(h).strip().lower() if pd.notna(h) else "" for h in headers]
    m, used = {}, set()
    for std, syns in COLUMN_SYNONYMS.items():
        for syn in syns:
            for i, h in enumerate(lows):
                if i in used or not h: continue
                if syn in h: m[std], _ = i, used.add(i); break
        if std in m: break
    return m

def find_header(raw, max_scan=10):
    for i in range(min(max_scan, len(raw))):
        m = map_cols(raw.iloc[i].tolist())
        if len(m) >= 2 and any(k in m for k in ("Phone", "Unit_Code", "Price_Raw")):
            return i, m
    return None, None

# ====================================================== WHATSAPP
WA_MSG = re.compile(r"^\[?(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp][Mm]|ص|م)?)[\]\s\-:]+([^:]+):")
WA_PHONE = re.compile(r"(?<!\d)(?:\+?20[\s\-.]?)?0?1[0125](?:[\s\-.]?\d){8}(?!\d)")

def parse_whatsapp(source_path, log):
    records = []
    for fp in glob.glob(os.path.join(source_path, "**/*.txt"), recursive=True):
        fn = os.path.basename(fp)
        if any(fn.startswith(p) for p in SKIP_FILES): continue
        gn = os.path.splitext(fn)[0]
        ft = pd.to_datetime(os.path.getmtime(fp), unit="s")
        with open(fp, "r", encoding="utf-8", errors="ignore") as f:
            cm, cd, cs = "", ft, "Unknown"
            for line in f:
                m = WA_MSG.match(line)
                if m:
                    if cm:
                        rec = extract_msg(cm, cd, cs, gn, fp, ft)
                        if rec: records.append(rec)
                    d, t, cs = m.groups()
                    cd = parse_date(f"{d} {t}") or ft
                    cm = line[m.end():].strip()
                else:
                    cm += " " + line.strip()
            if cm:
                rec = extract_msg(cm, cd, cs, gn, fp, ft)
                if rec: records.append(rec)
    if records: log(f"  WhatsApp: {len(records)} messages\n")
    return records

def extract_msg(text, dt, sender, gn, fp, ft):
    text = text.strip()
    if len(text) < 15: return None
    pm = WA_PHONE.search(text)
    phone = normalize_phone(pm.group(0)) if pm else normalize_phone(re.sub(r"\D", "", sender))
    if not phone: return None
    pr_m = re.search(r"(\d+(?:[.,]\d+)*)\s*(?:مليون|ملون|million|الف|ألف|k\b|جنيه|egp|usd|\$|دولار)", text, re.I)
    if pr_m: pv, cur = parse_price(pr_m.group(0))
    else:
        nums = [n for n in re.findall(r"\b\d{3,8}\b", text) if not 1990 <= int(n) <= 2035]
        pv, cur = parse_price(nums[0]) if nums else (np.nan, "EGP")
    cm = re.search(r"(?:كود|code|ref)\s*[:\-_]?\s*([A-Za-z0-9\-_]+)", text, re.I)
    am = re.search(r"(\d{2,4})\s*(?:متر|م²|m2|sqm)", text, re.I)
    rm = re.search(r"(\d)\s*(?:غرف|غرفة|نوم|rooms?|beds?)", text, re.I)
    return {
        "Unit_Code": normalize_code(cm.group(1)) if cm else np.nan,
        "Phone": phone, "Price_Raw": pv if not np.isnan(pv) else np.nan,
        "Currency": cur, "Price_In_Thousands": False,
        "Owner_Name": sender, "Contact_Name": sender,
        "Listing_Date": dt, "Update_Date": dt, "Availability": "Available",
        "Rooms": float(rm.group(1)) if rm else np.nan, "Bathrooms": np.nan,
        "Area": float(am.group(1)) if am else np.nan,
        "Location": normalize_compound("", text), "Sub_Area": "Unknown",
        "Furnishing": "Furnished" if "مفروش" in text else "Not Furnished" if "غير مفروش" in text else "Unknown",
        "Finishing": "Unknown", "Unit_Type": "Unknown",
        "Deal": normalize_deal(text), "Advertiser_Type": "Unknown",
        "Garden": "Yes" if re.search(r"حديق[ةه]", text) else "Unknown",
        "Pool": "Yes" if re.search(r"بسين|حمام\s*سباحة", text) else "Unknown",
        "Source_Group": gn, "Notes": text[:500],
        "Source_File": os.path.basename(fp), "Source_Sheet": "WhatsApp",
        "File_Modified": ft,
    }

# ====================================================== PIPELINE
def run_pipeline(source, output, log):
    t0 = time.time()
    import pandas as pd, numpy as np  # noqa - re-import inside for GUI thread
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    all_dfs = []
    # Excel
    for p in glob.glob(os.path.join(source, "**/*.xls*"), recursive=True):
        fn = os.path.basename(p)
        if any(fn.startswith(s) for s in SKIP_FILES): continue
        try: sheets = pd.read_excel(p, sheet_name=None, header=None)
        except Exception as e: log(f"  Skip {fn}: {e}\n"); continue
        for sn, raw in sheets.items():
            if any(s in str(sn).lower() for s in SKIP_SHEETS): continue
            idx, mp = find_header(raw)
            if idx is None: continue
            data = raw.iloc[idx+1:]
            if data.empty: continue
            out = pd.DataFrame(index=range(len(data)))
            for std, pos in mp.items(): out[std] = data.iloc[:, pos].values
            ph = str(raw.iloc[idx, mp["Price_Raw"]]).lower() if "Price_Raw" in mp else ""
            out["Price_In_Thousands"] = any(w in ph for w in ("thousand", "'000", "بالألف"))
            out["Source_File"] = fn; out["Source_Sheet"] = str(sn)
            out["File_Modified"] = pd.to_datetime(os.path.getmtime(p), unit="s")
            all_dfs.append(out)
            log(f"  {fn} | {sn}: {len(out)} rows\n")

    wa = parse_whatsapp(source, log)
    if wa: all_dfs.append(pd.DataFrame(wa))
    if not all_dfs: return {"status": "error", "message": "No data found."}

    df = pd.concat(all_dfs, ignore_index=True, sort=False)
    total = len(df)
    log(f"\nTotal rows loaded: {total}\n")

    for c in COLUMN_SYNONYMS:
        if c not in df.columns: df[c] = np.nan
    if "Price_In_Thousands" not in df.columns: df["Price_In_Thousands"] = False
    df["Price_In_Thousands"] = df["Price_In_Thousands"].fillna(False)

    df["Phone_Clean"] = df["Phone"].map(normalize_phone)
    df = df[df["Phone_Clean"].notna()].copy()
    dropped = total - len(df)
    df["Phone_Last7"] = df["Phone_Clean"].map(get_last7)
    log(f"With phone: {len(df)} (dropped {dropped})\n")

    pr = df["Price_Raw"].map(parse_price)
    df["Price"] = [t[0] for t in pr]; df["Currency"] = [t[1] for t in pr]
    mk = df["Price_In_Thousands"] & df["Price"].notna()
    df.loc[mk, "Price"] = df.loc[mk, "Price"] * 1000

    deal_raw = df["Deal"].fillna("").astype(str).str.lower()
    is_sale = deal_raw.str.contains("بيع|sale|sell|resale|تنازل", regex=True)
    is_rent = deal_raw.str.contains("ايجار|إيجار|rent", regex=True)
    egp = df["Currency"].eq("EGP") & ~df["Price_In_Thousands"]
    m = egp & is_sale & df["Price"].between(0.01, 99.99); df.loc[m, "Price"] *= 1_000_000
    m = egp & is_rent & df["Price"].between(0.01, 99.99); df.loc[m, "Price"] *= 1_000
    df["Price_EGP"] = np.where(df["Currency"].eq("USD"), df["Price"] * USD_TO_EGP, df["Price"])
    df["Deal_Clean"] = df["Deal"].map(normalize_deal)

    val = df["Advertiser_Type"].fillna("").astype(str).str.lower()
    ctx = (df["Source_File"].fillna("") + " " + df["Source_Sheet"].fillna("") + " " + df["Source_Group"].fillna("")).str.lower()
    notes = df["Notes"].fillna("").astype(str)
    df["Advertiser_Clean"] = np.where(val.str.contains("مالك|owner|اونر", regex=True), "Owner",
                               np.where(ctx.str.contains("مالك|owner|اونر", regex=True), "Owner",
                               np.where(val.str.contains("بروكر|broker|وسيط|شركة", regex=True), "Broker",
                               np.where(ctx.str.contains("بروكر|broker|وسيط|شركة|chat", regex=True), "Broker", "Unknown"))))

    df["Location_Clean"] = [normalize_compound(r["Location"], str(r.get("Notes",""))) for _,r in df.iterrows()]
    df["Unit_Code_Clean"] = df["Unit_Code"].map(normalize_code)
    df["Rooms_Num"] = df["Rooms"].map(parse_num)
    df["Bathrooms_Num"] = df["Bathrooms"].map(parse_num)
    df["Area_Num"] = df["Area"].map(parse_num)
    df["Furnishing_Clean"] = df["Furnishing"].map(clean_val)
    df["Finishing_Clean"] = df["Finishing"].map(clean_val)
    df["Unit_Type_Clean"] = df["Unit_Type"].map(clean_val)
    df["Owner_Name_Clean"] = df["Owner_Name"].map(clean_val)
    df["Contact_Name_Clean"] = df["Contact_Name"].map(clean_val)
    df["Notes_Clean"] = df["Notes"].map(clean_val)
    df["Availability_Clean"] = df["Availability"].map(clean_val)
    df["Listing_Date_Clean"] = df["Listing_Date"].map(parse_date).fillna(df["File_Modified"])
    df["Update_Date_Clean"] = df["Update_Date"].map(parse_date).fillna(df["Listing_Date_Clean"])

    # Status
    comb = (deal_raw + " " + notes).str.lower()
    df["Status"] = np.where(comb.str.contains("sold|تم البيع|اتباعت", regex=True), "Sold",
                   np.where(comb.str.contains("rented|تم الايجار|تم التأجير", regex=True), "Rented", "Active"))

    # Dedup
    df["Dedup_Key"] = df["Phone_Last7"] + "|" + df["Price_EGP"].round(0).astype("Int64").astype(str) + "|" + df["Deal_Clean"]
    df = df.sort_values(["Update_Date_Clean","Listing_Date_Clean"], ascending=False)
    stats = df.groupby("Dedup_Key").agg(
        First_Seen=("Listing_Date_Clean","min"), Latest_Update=("Update_Date_Clean","max"),
        Times_Listed=("Dedup_Key","size")).reset_index()
    codes = (df.dropna(subset=["Unit_Code_Clean"]).groupby("Dedup_Key")["Unit_Code_Clean"]
             .agg(lambda x: ", ".join(sorted(set(str(i) for i in x))))
             .rename("All_Codes").reset_index())
    df_uniq = df.drop_duplicates("Dedup_Key", keep="first").merge(stats, on="Dedup_Key", how="left").merge(codes, on="Dedup_Key", how="left")
    df_uniq["All_Codes"] = df_uniq["All_Codes"].fillna(df_uniq["Unit_Code_Clean"])
    df_uniq["Days_Advertised"] = (df_uniq["Latest_Update"] - df_uniq["First_Seen"]).dt.days
    df_uniq = df_uniq.sort_values("Latest_Update", ascending=False).reset_index(drop=True)
    df_uniq["Unit_ID"] = [f"{ID_PREFIX}-{i:04d}" for i in range(1, len(df_uniq)+1)]
    dups = len(df) - len(df_uniq)
    log(f"Unique units: {len(df_uniq)} (removed {dups} duplicates)\n")

    # Export
    out_dir = output if os.path.isdir(output) else os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "Final_RealEstate_Database.xlsx")
    COLS = {
        "Unit_ID":"Unit_ID","Phone_Clean":"Phone","Phone_Last7":"Phone_Last7","Deal_Clean":"Deal",
        "Status":"Status","Advertiser_Clean":"Advertiser_Type","Availability_Clean":"Availability",
        "Price_EGP":"Price_EGP","Price":"Price_Raw","Currency":"Currency","Location_Clean":"Compound",
        "Unit_Type_Clean":"Unit_Type","Area_Num":"Area_m2","Rooms_Num":"Rooms","Bathrooms_Num":"Bathrooms",
        "Furnishing_Clean":"Furnishing","Finishing_Clean":"Finishing","Owner_Name_Clean":"Owner_Name",
        "Contact_Name_Clean":"Contact_Person","Unit_Code_Clean":"Unit_Code","All_Codes":"All_Original_Codes",
        "First_Seen":"First_Seen","Latest_Update":"Latest_Update","Days_Advertised":"Days_Advertised",
        "Times_Listed":"Listings_Count","Source_File":"Source_File","Source_Sheet":"Source_Sheet",
        "Notes_Clean":"Notes",
    }
    master = df_uniq[[c for c in COLS if c in df_uniq.columns]].rename(columns=COLS)

    try:
        with pd.ExcelWriter(out_path, engine="openpyxl") as w:
            # Summary
            pd.DataFrame({"Metric":["Total","Dropped (no phone)","Unique","Duplicates removed","Rent","Sale","Owners","Brokers","Active","Sold","Rented","Duration (s)"],
                "Value":[total, dropped, len(master), dups,
                    (master["Deal"]=="Rent").sum(),(master["Deal"]=="Sale").sum(),
                    (master["Advertiser_Type"]=="Owner").sum(),(master["Advertiser_Type"]=="Broker").sum(),
                    (master["Status"]=="Active").sum(),(master["Status"]=="Sold").sum(),(master["Status"]=="Rented").sum(),
                    round(time.time()-t0,1)]}).to_excel(w, sheet_name="Summary", index=False)
            master.to_excel(w, sheet_name="All_Units", index=False)
            for name,(a,d) in {"Owners_Rent":("Owner","Rent"),"Owners_Sale":("Owner","Sale"),
                "Brokers_Rent":("Broker","Rent"),"Brokers_Sale":("Broker","Sale")}.items():
                sub = master[(master["Advertiser_Type"]==a)&(master["Deal"]==d)]
                if not sub.empty: sub.to_excel(w, sheet_name=name, index=False)
        style_file(out_path)
    except PermissionError:
        out_path = os.path.join(out_dir, f"Final_RealEstate_Database_{int(time.time())}.xlsx")
        master.to_excel(out_path, sheet_name="All_Units", index=False)
        style_file(out_path)

    dur = round(time.time()-t0, 1)
    log(f"\nDone in {dur}s!\nFile: {out_path}\n")
    return {"status":"success","output_file":out_path,"total_units":len(master),"duplicates":dups,"duration":dur}

def style_file(path):
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    wb = openpyxl.load_workbook(path)
    hf = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    hfont = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    dfont = Font(name="Segoe UI", size=9)
    for ws in wb.worksheets:
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = f"A1:{get_column_letter(ws.max_column)}{ws.max_row}"
        for c in range(1, ws.max_column+1):
            ws.cell(1,c).fill = hf; ws.cell(1,c).font = hfont
            ws.cell(1,c).alignment = Alignment(horizontal="center", vertical="center")
            for r in range(2, ws.max_row+1):
                cell = ws.cell(r,c); cell.font = dfont
                if isinstance(cell.value,(int,float)) and "price" in str(ws.cell(1,c).value or "").lower():
                    cell.number_format = "#,##0"
            mx = max((len(str(ws.cell(r,c).value or "")) for r in range(1,min(ws.max_row,100)+1)), default=10)
            ws.column_dimensions[get_column_letter(c)].width = min(mx+3, 40)
    wb.save(path)

# ====================================================== GUI
class Redirector:
    def __init__(self, widget): self.w = widget
    def write(self, s): self.w.after(0, self._a, s)
    def _a(self, s): self.w.insert(tk.END, s); self.w.see(tk.END)
    def flush(self): pass

def check_deps():
    miss = []
    for m in ("numpy","pandas","openpyxl"):
        try: importlib.import_module(m)
        except: miss.append(m)
    return miss

def install_deps(log, status):
    miss = check_deps()
    if not miss: log("All dependencies ready.\n"); return True
    log(f"Installing {', '.join(miss)}... (1-2 minutes)\n")
    status("Installing dependencies...")
    try:
        kw = {"creationflags": 0x08000000} if os.name=="nt" else {}
        subprocess.check_call([sys.executable,"-m","pip","install"]+miss, **kw)
        log("Installed!\n"); return True
    except Exception as e:
        log(f"Failed: {e}\n"); return False

class App:
    def __init__(self, root):
        self.root = root
        root.title("Real Estate Processor")
        root.geometry("750x600")
        root.configure(bg="#f0f2f5")
        self.result = None
        self.build()

    def build(self):
        tk.Frame(self.root, bg="#1F497D", height=50).pack(fill="x")
        tk.Label(self.root, text="🏠 Real Estate Processor", fg="white", bg="#1F497D",
                 font=("Segoe UI", 16, "bold")).pack(pady=10)
        f = tk.Frame(self.root, bg="#f0f2f5", padx=24, pady=12)
        f.pack(fill="both", expand=True)

        tk.Label(f, text="Source Folder:", bg="#f0f2f5", font=("Segoe UI",10,"bold")).grid(row=0,column=0,sticky="w",pady=5)
        self.src = tk.StringVar(value=r"H:\Sheets\Active owners")
        tk.Entry(f, textvariable=self.src, width=52, font=("Segoe UI",10)).grid(row=0,column=1,pady=5,padx=8)
        tk.Button(f, text="📁", command=lambda: self._browse(self.src)).grid(row=0,column=2)

        tk.Label(f, text="Output Folder:", bg="#f0f2f5", font=("Segoe UI",10,"bold")).grid(row=1,column=0,sticky="w",pady=5)
        self.out = tk.StringVar(value=r"H:\\")
        tk.Entry(f, textvariable=self.out, width=52, font=("Segoe UI",10)).grid(row=1,column=1,pady=5,padx=8)
        tk.Button(f, text="📁", command=lambda: self._browse(self.out)).grid(row=1,column=2)

        b = tk.Frame(f, bg="#f0f2f5"); b.grid(row=2,column=0,columnspan=3,pady=12)
        self.btn = tk.Button(b, text="▶  Run", command=self.run, font=("Segoe UI",13,"bold"),
                             bg="#16A34A", fg="white", padx=30, pady=8, cursor="hand2", relief="flat")
        self.btn.pack(side="left", padx=8)
        tk.Button(b, text="📦 Install Deps", command=self.deps, font=("Segoe UI",10),
                  bg="#2563EB", fg="white", padx=15, pady=8, cursor="hand2", relief="flat").pack(side="left", padx=8)
        tk.Button(b, text="📂 Open Result", command=self.open, font=("Segoe UI",10),
                  bg="#6B7280", fg="white", padx=15, pady=8, cursor="hand2", relief="flat").pack(side="left", padx=8)

        tk.Label(f, text="Log:", bg="#f0f2f5", font=("Segoe UI",10,"bold")).grid(row=3,column=0,sticky="w",pady=(8,0))
        lf = tk.Frame(f); lf.grid(row=4,column=0,columnspan=3,sticky="nsew",pady=4)
        f.grid_rowconfigure(4, weight=1); f.grid_columnconfigure(1, weight=1)
        self.log = tk.Text(lf, height=14, width=85, font=("Consolas",9), bg="#1e1e1e", fg="#4ade80",
                           insertbackground="white", wrap="word", relief="flat", padx=10, pady=10)
        sb = tk.Scrollbar(lf, command=self.log.yview); self.log.configure(yscrollcommand=sb.set)
        self.log.pack(side="left", fill="both", expand=True); sb.pack(side="right", fill="y")

        self.st = tk.StringVar(value="Ready")
        tk.Label(self.root, textvariable=self.st, bd=1, relief="sunken", anchor="w",
                 bg="#e5e7eb", font=("Segoe UI",9)).pack(side="bottom", fill="x")

        miss = check_deps()
        if miss: self.log.insert(tk.END, f"⚠️ Missing: {', '.join(miss)}\nClick 'Install Deps' to fix.\n\n")
        else: self.log.insert(tk.END, "✅ All dependencies ready.\n\n")

    def _browse(self, var):
        d = filedialog.askdirectory()
        if d: var.set(d)

    def log_write(self, s): self.log.insert(tk.END, s); self.log.see(tk.END); self.root.update()

    def deps(self):
        def w():
            install_deps(lambda s: self.log.after(0, lambda: self.log_write(s)),
                          lambda s: self.st.set(s))
            self.log.after(0, lambda: self.log_write("\n"))
        threading.Thread(target=w, daemon=True).start()

    def run(self):
        src = self.src.get().strip()
        if not os.path.isdir(src):
            messagebox.showerror("Error", f"Folder not found:\n{src}"); return
        if check_deps():
            if not messagebox.askyesno("Missing", "Install dependencies now?"): return
            if not install_deps(lambda s: self.log_write(s), lambda s: self.st.set(s)): return
        self.btn.config(state="disabled", text="⏳ Running...")
        self.st.set("Processing...")
        self.log_write("\n" + "="*50 + "\nStarting...\n")
        def w():
            old = sys.stdout; sys.stdout = Redirector(self.log)
            try:
                r = run_pipeline(src, self.out.get().strip(), lambda s: self.log_write(s))
                if r and r.get("status")=="success":
                    self.result = r["output_file"]
                    self.root.after(0, lambda: self.st.set(f"Done: {r['total_units']} units"))
                    self.root.after(0, lambda: self.log_write(
                        f"\n✅ Done!\nUnits: {r['total_units']}\nFile: {self.result}\n"))
                    self.root.after(0, lambda: messagebox.showinfo("Done",
                        f"Units: {r['total_units']}\nFile:\n{self.result}"))
                else:
                    msg = (r or {}).get("message","Error")
                    self.root.after(0, lambda: self.log_write(f"\n❌ {msg}\n"))
            except Exception as e:
                self.root.after(0, lambda: self.log_write(f"\n❌ {e}\n"))
                self.root.after(0, lambda: messagebox.showerror("Error", str(e)))
            finally:
                sys.stdout = old
                self.root.after(0, lambda: self.btn.config(state="normal", text="▶  Run"))
        threading.Thread(target=w, daemon=True).start()

    def open(self):
        p = self.result
        if not p or not os.path.exists(p):
            p = os.path.join(self.out.get().strip(), "Final_RealEstate_Database.xlsx")
        if not os.path.exists(p):
            messagebox.showinfo("No Result", "Run first."); return
        try:
            if os.name=="nt": os.startfile(p)
            elif sys.platform=="darwin": subprocess.call(["open", p])
            else: subprocess.call(["xdg-open", p])
        except Exception as e:
            messagebox.showerror("Error", str(e))

if __name__ == "__main__":
    # need pd/np available globally for helper functions
    try:
        import pandas as pd, numpy as np
    except ImportError:
        pass  # will be installed via button
    root = tk.Tk()
    App(root)
    root.mainloop()
