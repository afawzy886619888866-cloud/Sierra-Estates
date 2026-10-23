#!/usr/bin/env python3
"""
Restore files that were unintentionally deleted by the consolidation script.

The consolidation script's SKIP_DIRS filter accidentally excluded some
directories that ARE part of the Sierra-Estates-Final repo: .codex/,
.agent/, .agents/, .vscode/, .idea/, .gradle/, etc.

This script:
1. Lists all files marked as deleted (D) in the git stage.
2. Restores any that are NOT in the intentional-deletion list.
3. Re-stages the result.

Intentional deletions (kept deleted):
- apps/api/sierra_estates_*.{py,ts}
- apps/api/sierra_estatese_*.{py,ts}
- apps/api/system_prompt_and_deployment.py
- functions/lib/*  (added to .gitignore)
- .archive/legacy-code/.../overnight-*.csi.jsonl  (>50MB, can't push)
"""
import subprocess
import re
from pathlib import Path

# Intentional deletion patterns (regex)
INTENTIONAL_PATTERNS = [
    r"^apps/api/sierra_estates_.*\.(py|ts)$",
    r"^apps/api/sierra_estatese_.*\.(py|ts)$",
    r"^apps/api/system_prompt_and_deployment\.py$",
    r"^functions/lib/",  # now in .gitignore
    r"\.archive/legacy-code/.*overnight-.*\.csi\.jsonl$",  # >50MB
    # __pycache__ — should stay deleted (already in .gitignore)
    r"__pycache__/",
]

def is_intentional(path: str) -> bool:
    for pat in INTENTIONAL_PATTERNS:
        if re.search(pat, path):
            return True
    return False

# Get all deleted files
result = subprocess.run(
    ["git", "diff", "--cached", "--name-status"],
    capture_output=True, text=True, cwd="/home/z/my-project/consolidated",
)
deleted = []
for line in result.stdout.splitlines():
    if line.startswith("D\t"):
        deleted.append(line[2:])

print(f"Total deleted files in stage: {len(deleted)}")

# Categorize
intentional = [p for p in deleted if is_intentional(p)]
unintentional = [p for p in deleted if not is_intentional(p)]

print(f"Intentional deletions (keep deleted): {len(intentional)}")
print(f"Unintentional deletions (will restore): {len(unintentional)}")
print()
print("Sample unintentional deletions to restore:")
for p in unintentional[:20]:
    print(f"  {p}")
if len(unintentional) > 20:
    print(f"  ... and {len(unintentional)-20} more")

# Restore each unintentional deletion from HEAD
print()
print("Restoring files from HEAD...")
restored = 0
failed = []
for path in unintentional:
    # Restore from HEAD
    r = subprocess.run(
        ["git", "checkout", "HEAD", "--", path],
        capture_output=True, text=True, cwd="/home/z/my-project/consolidated",
    )
    if r.returncode == 0:
        restored += 1
    else:
        failed.append((path, r.stderr.strip()[:200]))

print(f"Restored: {restored}")
if failed:
    print(f"Failed: {len(failed)}")
    for p, err in failed[:10]:
        print(f"  {p}: {err}")

# Re-stage
print()
print("Re-staging all changes...")
subprocess.run(["git", "add", "-A"], cwd="/home/z/my-project/consolidated")

# Show final summary
result = subprocess.run(
    ["git", "diff", "--cached", "--name-status"],
    capture_output=True, text=True, cwd="/home/z/my-project/consolidated",
)
counts = {"A": 0, "M": 0, "D": 0, "R": 0, "C": 0, "Other": 0}
for line in result.stdout.splitlines():
    if line:
        status = line[0]
        counts[status] = counts.get(status, 0) + 1
print()
print("Final stage summary:")
for k, v in counts.items():
    if v > 0:
        print(f"  {k}: {v}")
