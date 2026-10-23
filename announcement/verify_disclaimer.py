#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verify that every Cairo Plaza announcement deliverable contains the MANDATORY
disclaimer text EXACTLY as issued (character-for-character vs DISCLAIMER.txt)."""
import os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
DISCLAIMER = open(os.path.join(ROOT, "DISCLAIMER.txt"), encoding="utf-8").read().strip()

# Every file that MUST carry the exact text
REQUIRED = []
for dirpath, _, files in os.walk(ROOT):
    for f in files:
        p = os.path.join(dirpath, f)
        rel = os.path.relpath(p, ROOT)
        if rel.startswith("reference" + os.sep) or f == "verify_disclaimer.py":
            continue
        if f.lower().endswith((".md", ".html", ".txt", ".tsx")):
            REQUIRED.append(rel)
# the live site component (optional check — only present inside the main monorepo)
_app_component = os.path.join(os.path.dirname(ROOT), "apps", "sierra-estates-realty",
                              "components", "client", "BookingContractingNotice.tsx")
if os.path.exists(_app_component):
    REQUIRED.append(os.path.relpath(_app_component, os.path.dirname(ROOT)))

ok = fail = 0
print(f"Disclaimer source: {len(DISCLAIMER)} chars\n")
for rel in sorted(set(REQUIRED)):
    base = ROOT if not rel.startswith("apps") else os.path.dirname(ROOT)
    path = os.path.join(base, rel)
    if not os.path.exists(path):
        print(f"MISSING FILE  {rel}")
        fail += 1
        continue
    content = open(path, encoding="utf-8", errors="ignore").read()
    if DISCLAIMER in content:
        print(f"PASS  {rel}")
        ok += 1
    else:
        print(f"FAIL  {rel}  (exact text NOT found)")
        fail += 1

print(f"\n{ok} passed, {fail} failed")
sys.exit(1 if fail else 0)
