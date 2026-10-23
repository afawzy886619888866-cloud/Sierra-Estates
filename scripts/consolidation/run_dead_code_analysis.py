#!/usr/bin/env python3
"""
Run dead code analysis on the backend.

- Python: `vulture` (finds unused code: imports, functions, classes, variables)
- TypeScript/JS: `ts-prune` (finds unused exports) + ESLint no-unused-vars

We focus on:
  - apps/api/ (Python FastAPI backend)
  - functions/ (Firebase Cloud Functions backend)
  - packages/api/, packages/db/, packages/auth/ (shared TS backend packages)

We do NOT analyze:
  - _archived_repos/ (legacy snapshots, not active code)
  - frontend apps/ (only the backend per the user's request)
  - services/hermes-agent/ (large embedded third-party project)
"""
import json
import subprocess
import sys
from pathlib import Path

CONSOLIDATED = Path("/home/z/my-project/consolidated")
RESULTS = {
    "python": {},
    "typescript": {},
    "summary": {},
}

# ─────────────────────────────────────────────────────────────────────────────
# Python dead code analysis (vulture)
# ─────────────────────────────────────────────────────────────────────────────
print("=" * 80)
print("PYTHON DEAD CODE ANALYSIS (vulture)")
print("=" * 80)

python_dirs = [
    CONSOLIDATED / "apps" / "api",
]
# Also include other backend Python files at the repo root (fix.py, etc.)
# but skip _archived_repos and services/hermes-agent
extra_py_files = []
for py in CONSOLIDATED.glob("*.py"):
    if py.name == "fix.py":
        extra_py_files.append(py)

vulture_results = {}
for d in python_dirs:
    if not d.exists():
        continue
    print(f"\nAnalyzing {d.relative_to(CONSOLIDATED)} ...")
    cmd = ["vulture", str(d), "--min-confidence", "60"]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(CONSOLIDATED))
    out = result.stdout
    print(out)
    vulture_results[str(d.relative_to(CONSOLIDATED))] = {
        "returncode": result.returncode,
        "stdout": out,
        "stderr": result.stderr,
        "findings": [
            line for line in out.splitlines() if line.strip()
        ],
    }

for py in extra_py_files:
    print(f"\nAnalyzing {py.relative_to(CONSOLIDATED)} ...")
    cmd = ["vulture", str(py), "--min-confidence", "60"]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(CONSOLIDATED))
    out = result.stdout
    print(out)
    vulture_results[str(py.relative_to(CONSOLIDATED))] = {
        "returncode": result.returncode,
        "stdout": out,
        "stderr": result.stderr,
        "findings": [line for line in out.splitlines() if line.strip()],
    }

RESULTS["python"] = vulture_results

# ─────────────────────────────────────────────────────────────────────────────
# TypeScript/JS dead code analysis (ts-prune)
# ─────────────────────────────────────────────────────────────────────────────
print()
print("=" * 80)
print("TYPESCRIPT/JS DEAD CODE ANALYSIS (ts-prune)")
print("=" * 80)

ts_dirs = [
    CONSOLIDATED / "functions",
    CONSOLIDATED / "packages" / "api",
    CONSOLIDATED / "packages" / "db",
    CONSOLIDATED / "packages" / "auth",
    CONSOLIDATED / "packages" / "config",
]

ts_results = {}
for d in ts_dirs:
    if not d.exists():
        continue
    print(f"\nAnalyzing {d.relative_to(CONSOLIDATED)} ...")
    # ts-prune needs a tsconfig.json
    tsconfig = d / "tsconfig.json"
    if not tsconfig.exists():
        # Try parent
        tsconfig = CONSOLIDATED / "tsconfig.json"
    cmd = ["ts-prune", "--project", str(tsconfig)] if tsconfig.exists() else ["ts-prune"]
    print(f"  Running: {' '.join(cmd)} (cwd={d})")
    result = subprocess.run(
        cmd, capture_output=True, text=True, cwd=str(d), timeout=120
    )
    out = result.stdout
    err = result.stderr
    # ts-prune can be flaky; capture both
    print(out[:3000] if out else "(no stdout)")
    if err and "used in module" not in err:
        print(f"  [stderr] {err[:500]}")
    # Filter: only lines that mention files in our dir
    rel_d = str(d.relative_to(CONSOLIDATED))
    findings = []
    for line in out.splitlines():
        if not line.strip():
            continue
        # ts-prune outputs lines like: "src/foo.ts:10  someExport  Used in module"
        # Keep all of them — we'll filter later
        findings.append(line)
    ts_results[rel_d] = {
        "returncode": result.returncode,
        "stdout": out,
        "stderr": err[:1000] if err else "",
        "findings": findings,
    }

RESULTS["typescript"] = ts_results

# ─────────────────────────────────────────────────────────────────────────────
# ESLint no-unused-vars (extra JS check)
# ─────────────────────────────────────────────────────────────────────────────
# Skip — eslint isn't installed for the functions dir and we already have
# ts-prune + vulture. Note this in the report.

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
print()
print("=" * 80)
print("SUMMARY")
print("=" * 80)

py_findings_count = sum(len(v.get("findings", [])) for v in vulture_results.values())
ts_findings_count = sum(len(v.get("findings", [])) for v in ts_results.values())

print(f"Python dead-code findings: {py_findings_count}")
print(f"TypeScript dead-code findings: {ts_findings_count}")

RESULTS["summary"] = {
    "python_findings": py_findings_count,
    "typescript_findings": ts_findings_count,
}

with open("/home/z/my-project/scripts/dead_code_analysis.json", "w") as f:
    json.dump(RESULTS, f, indent=2, default=str)

print(f"\nFull report saved to /home/z/my-project/scripts/dead_code_analysis.json")
