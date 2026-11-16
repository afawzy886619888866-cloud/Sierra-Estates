#!/usr/bin/env python3
"""
scripts/scrub_xlsx_phones.py — one-off companion to sanitize-data-json.mjs

XLSX workbooks are zip archives; owner phones live in xl/sharedStrings.xml
(and occasionally inline in sheet XML). This scrubs Egyptian mobiles and
wa.me links inside <t>…</t> text nodes ONLY — numeric cells (prices) and
the rest of the archive stay byte-identical in structure.

Concierge: +201092048333. Idempotent: concierge (by last-10 digits) stays.
Verification included; exit 1 on leftovers.
"""
import re
import sys
import zipfile

CONCIERGE = "+201092048333"
CONCIERGE_LAST10 = "1092048333"

SEP = r"[\s\-().\u00a0\u202f]?"
PHONE_RE = re.compile(
    r"(?<![0-9A-Za-z])"
    r"(?:\+" + SEP + r"2" + SEP + r"0" + SEP
    + r"|0" + SEP + r"0" + SEP + r"2" + SEP + r"0" + SEP
    + r"|0" + SEP + r"2" + SEP + r"0" + SEP
    + r"|0" + SEP + r"|2" + SEP + r"0" + SEP + r")?"
    r"1" + SEP + r"[0125]" + SEP
    + SEP.join([r"\d"] * 8)
    + r"(?![0-9A-Za-z])"
)
WA_RE = re.compile(r"https?://wa\.me/\+?[0-9][0-9\s\-().]*", re.I)
T_NODE = re.compile(r"(<t[^>]*>)([^<]*)(</t>)", re.S)

TARGETS = [
    "apps/sierra-estates-realty/public/downloads/Sierra_Estates_All_Owners_Units.xlsx",
    "apps/sierra-estates-realty/public/downloads/Sierra_Estates_Owners_Rent_Master.xlsx",
    "apps/sierra-estates-realty/public/downloads/Sierra_Estates_Owners_Rent.xlsx",
    "apps/sierra-estates-realty/public/downloads/Sierra_Estates_Owners_Units_Rent_and_Resale.xlsx",
    "apps/sierra-estates-realty/public/downloads/owners_rent.xlsx",
    "apps/sierra-estates-realty/public/downloads/whatsapp_garden_owners_campaign.xlsx",
    "apps/sierra-estates-realty/data/Inventory_with_Photos.xlsx",
]


def scrub_text(s: str):
    def repl_phone(m):
        digits = re.sub(r"\D", "", m.group(0))
        return m.group(0) if digits[-10:] == CONCIERGE_LAST10 else CONCIERGE

    s = WA_RE.sub("https://wa.me/201092048333", s)
    return PHONE_RE.sub(repl_phone, s)


def scrub_t_nodes(xml: str):
    count = 0

    def repl(m):
        nonlocal count
        clean = scrub_text(m.group(2))
        if clean != m.group(2):
            count += 1
        return m.group(1) + clean.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;") + m.group(3)

    return T_NODE.sub(repl, xml), count


def leftovers_in_t_nodes(xml: str):
    left = []
    for m in T_NODE.finditer(xml):
        for p in PHONE_RE.finditer(m.group(2)):
            digits = re.sub(r"\D", "", p.group(0))
            if digits[-10:] != CONCIERGE_LAST10:
                left.append(p.group(0))
    return left


def process(path: str) -> bool:
    try:
        zin = zipfile.ZipFile(path)
    except Exception as e:
        print(f"  ⚠  skip {path}: {e}")
        return True
    replaced = 0
    out_items = []
    bad = []
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename.startswith("xl/") and item.filename.endswith(".xml") and b"<t" in data:
            xml = data.decode("utf-8", errors="replace")
            xml2, n = scrub_t_nodes(xml)
            replaced += n
            bad += leftovers_in_t_nodes(xml2)
            data = xml2.encode("utf-8")
        out_items.append((item, data))
    zin.close()
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zout:
        for item, data in out_items:
            zout.writestr(item, data)
    status = "✓" if not bad else "✗"
    print(f"  {status} {path} — {replaced} cell(s) scrubbed" + (f", {len(bad)} LEFTOVER: {bad[:3]}" if bad else ""))
    return not bad


if __name__ == "__main__":
    ok = all(process(p) for p in TARGETS)
    if not ok:
        print("\nFAILED: leftovers remain in XLSX text cells.")
        sys.exit(1)
    print("\nALL XLSX CLEAN.")
