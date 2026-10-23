#!/usr/bin/env python3
"""Clone all repositories from the user's GitHub account."""
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

TOKEN = "<GITHUB_TOKEN>"
USER = "ahmedfawzy8866"
CLONE_DIR = Path("/home/z/my-project/repos")
CLONE_DIR.mkdir(parents=True, exist_ok=True)

with open("/home/z/my-project/scripts/repos_raw.json") as f:
    repos = json.load(f)

# Sort: most recently pushed first, so when names collide we keep the newer one
repos_sorted = sorted(repos, key=lambda x: x.get("pushed_at") or "", reverse=True)

# Build unique clone list (dedupe by name, keep newest)
seen_names = set()
unique_repos = []
skipped_dups = []
for r in repos_sorted:
    name = r["name"]
    if name in seen_names:
        skipped_dups.append(name)
        continue
    seen_names.add(name)
    unique_repos.append(r)

print(f"Total repos in API response: {len(repos)}")
print(f"Unique by name: {len(unique_repos)}")
print(f"Skipped duplicates (older): {skipped_dups}")
print()

def clone_repo(repo):
    name = repo["name"]
    target = CLONE_DIR / name
    if target.exists() and (target / ".git").exists():
        return name, "already-cloned", ""
    url = f"https://{TOKEN}@github.com/{USER}/{name}.git"
    # Shallow clone to save time/space; we don't need full history for consolidation
    cmd = ["git", "clone", "--depth", "1", url, str(target)]
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=300)
        if result.returncode == 0:
            return name, "ok", ""
        return name, "fail", result.stderr[-500:]
    except subprocess.TimeoutExpired:
        return name, "timeout", "clone timed out after 300s"
    except Exception as e:
        return name, "error", str(e)

results = []
with ThreadPoolExecutor(max_workers=6) as ex:
    futures = {ex.submit(clone_repo, r): r for r in unique_repos}
    for fut in as_completed(futures):
        name, status, msg = fut.result()
        results.append((name, status, msg))
        print(f"  [{status:14}] {name}" + (f" :: {msg}" if msg else ""))

ok = sum(1 for _, s, _ in results if s in ("ok", "already-cloned"))
print()
print(f"Successfully cloned/already present: {ok}/{len(unique_repos)}")
failed = [(n, m) for n, s, m in results if s not in ("ok", "already-cloned")]
if failed:
    print(f"Failed: {len(failed)}")
    for n, m in failed:
        print(f"  - {n}: {m}")
