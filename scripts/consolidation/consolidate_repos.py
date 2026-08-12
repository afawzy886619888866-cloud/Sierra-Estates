#!/usr/bin/env python3
"""
Consolidate all distinct repos into Sierra-Estates-Final as a single monorepo.

Strategy:
- Base: /home/z/my-project/repos/Sierra-Estates-Final (copied to /home/z/my-project/consolidated/)
- Each distinct repo is copied to /home/z/my-project/consolidated/_archived_repos/<name>/
- Skip:
    * Empty repos (size < 1 KB)
    * Exact fingerprint duplicates (keep the larger one)
    * Inaccessible forks (already failed to clone)
- For each copied repo, strip:
    * .git/ (we don't need nested git history)
    * node_modules/, .next/, dist/, build/ (regenerable)
    * Files larger than 50 MB (GitHub warns at 50MB, rejects at 100MB)
- Generate _archived_repos/MANIFEST.md documenting what's included and what's skipped.
"""
import json
import os
import shutil
import sys
from pathlib import Path

REPOS_DIR = Path("/home/z/my-project/repos")
CONSOLIDATED = Path("/home/z/my-project/consolidated")
ARCHIVED = CONSOLIDATED / "_archived_repos"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB hard limit per file

# Load fingerprint data
with open("/home/z/my-project/scripts/repo_fingerprints.json") as f:
    fp_data = json.load(f)

repos_info = fp_data["repos"]
dup_clusters_fp = fp_data["dup_clusters_by_fingerprint"]
dup_clusters_pkg = fp_data["dup_clusters_by_pkg_name"]

# Build the "skip" set
# 1. Empty repos
empty_repos = {r["name"] for r in repos_info if r["is_empty"]}

# 2. For each fingerprint duplicate cluster, keep the LARGEST, skip the rest
skip_due_to_fp_dup = set()
for fp, names in dup_clusters_fp.items():
    if fp == "da39a3ee5e6b":  # empty fingerprint hash, already handled
        continue
    # Find sizes
    sized = [(n, next((r["size_bytes"] for r in repos_info if r["name"] == n), 0)) for n in names]
    sized.sort(key=lambda x: x[1], reverse=True)
    keep = sized[0][0]
    for n, _ in sized[1:]:
        skip_due_to_fp_dup.add(n)
    print(f"  Dup cluster fp={fp}: keep={keep}, skip={[n for n,_ in sized[1:]]}")

# 3. Code vs key-key-: keep key-key- (larger + has more files)
# Already handled by fingerprint dup check? No, they have different fingerprints.
# Let's manually check: Code (18.0 MB) vs key-key- (18.8 MB)
# key-key- has extra files (NfcScannerSimulator.tsx, service/, file_paths.xml)
# So key-key- is newer. Skip Code.
skip_due_to_fp_dup.add("Code")  # older snapshot of key-key-
skip_due_to_fp_dup.add("New")   # also in same fp cluster, already there

# 4. react-example package duplicates: -19-6-AI, 19-7, Admin-Page-3.0, Ai-Sudio-
# Admin-Page-3.0 is kept (already by fp cluster). Skip the others.
# Ai-Sudio- already in skip_due_to_fp_dup (fp cluster)
# -19-6-AI and 19-7 are different fingerprints but same package name
# Let's keep Admin-Page-3.0 as the canonical (it's the largest)
skip_due_to_fp_dup.update(["-19-6-AI", "19-7"])

# 5. Sierra Estates snapshots: keep Sierra-Estates-Final (the base), skip older snapshots
# These are different snapshots of the same project at different times
sierra_snapshots_to_skip = {
    "sierra-estates",      # older snapshot
    "sierra-2026",         # older snapshot
    "i-sierra-2027",       # smaller variant
    "sf1",                 # smaller variant
    "final-frontend",      # older frontend snapshot
}

all_skip = empty_repos | skip_due_to_fp_dup | sierra_snapshots_to_skip
# Also: Sierra-Estates-Final is the BASE, don't include in _archived_repos
all_skip.add("Sierra-Estates-Final")

print()
print("=" * 80)
print("CONSOLIDATION PLAN")
print("=" * 80)
print(f"Base: Sierra-Estates-Final")
print(f"Empty repos to skip: {sorted(empty_repos)}")
print(f"Fingerprint/older duplicates to skip: {sorted(skip_due_to_fp_dup)}")
print(f"Sierra snapshots to skip (older versions of same project): {sorted(sierra_snapshots_to_skip)}")
print()

# Determine what to include
include_repos = []
for r in repos_info:
    if r["name"] in all_skip:
        continue
    include_repos.append(r)

print(f"Repos to include in _archived_repos/: {len(include_repos)}")
for r in sorted(include_repos, key=lambda x: x["name"]):
    print(f"  - {r['name']:50} | {r['size_human']:>10} | pkg={r['pkg_name']}")
print()

# ── Wipe consolidated dir and start fresh ──
if CONSOLIDATED.exists():
    print(f"Removing existing {CONSOLIDATED} ...")
    shutil.rmtree(CONSOLIDATED)
CONSOLIDATED.mkdir(parents=True)
ARCHIVED.mkdir(parents=True)

# ── Copy Sierra-Estates-Final as the base ──
print()
print("Copying Sierra-Estates-Final as the base...")
base_src = REPOS_DIR / "Sierra-Estates-Final"

SKIP_DIRS_COPY = {
    ".git", "node_modules", ".next", "dist", "build", "__pycache__",
    ".venv", "venv", "env", ".cache", "target", ".gradle", ".idea",
    ".vscode", "coverage", ".pytest_cache", ".turbo", ".codex",
    "out", ".turbo_cache",
}

def copy_tree_filtered(src: Path, dst: Path, skip_dirs: set[str], skip_git=True):
    """Copy src to dst, skipping certain dirs and large files."""
    src = Path(src)
    dst = Path(dst)
    dst.mkdir(parents=True, exist_ok=True)
    large_files = []
    for entry in os.walk(src, followlinks=False):
        root, dirs, files = entry
        # Filter dirs in-place
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        if skip_git and ".git" in dirs:
            dirs.remove(".git")
        # Compute relative path
        rel = Path(root).relative_to(src)
        target_dir = dst / rel if str(rel) != "." else dst
        target_dir.mkdir(parents=True, exist_ok=True)
        for f in files:
            src_file = Path(root) / f
            try:
                if src_file.is_symlink():
                    continue
                size = src_file.stat().st_size
            except OSError:
                continue
            if size > MAX_FILE_SIZE:
                large_files.append((str(src_file.relative_to(src)), size))
                continue
            try:
                shutil.copy2(src_file, target_dir / f, follow_symlinks=False)
            except OSError as e:
                print(f"  WARN: copy failed for {src_file}: {e}")
    return large_files

# Copy base
large_in_base = copy_tree_filtered(base_src, CONSOLIDATED, SKIP_DIRS_COPY)
if large_in_base:
    print(f"  Large files (>50MB) skipped in base: {len(large_in_base)}")
    for path, size in large_in_base[:10]:
        print(f"    - {path} ({size/1024/1024:.1f} MB)")

# ── Copy each included repo into _archived_repos/ ──
manifest = {
    "base": "Sierra-Estates-Final",
    "archived_repos": [],
    "skipped": {
        "empty": sorted(empty_repos),
        "fingerprint_duplicates": sorted(skip_due_to_fp_dup),
        "sierra_snapshots": sorted(sierra_snapshots_to_skip),
    },
    "large_files_skipped": [],
}

for r in sorted(include_repos, key=lambda x: x["name"]):
    name = r["name"]
    src = REPOS_DIR / name
    # Sanitize target dir name
    safe_name = name.replace("/", "_")
    if name == "68e6464b99f91883e5fc1c2c2d41e34852b59d5460a7233cb507631612785c27":
        safe_name = "sierra-blu-platform"  # give it a readable name
    dst = ARCHIVED / safe_name
    print(f"Copying {name} -> _archived_repos/{safe_name} ...")
    large_files = copy_tree_filtered(src, dst, SKIP_DIRS_COPY)
    entry = {
        "original_name": name,
        "archived_as": safe_name,
        "pkg_name": r["pkg_name"],
        "size_human": r["size_human"],
        "readme_first_line": r["readme_first_line"],
        "large_files_skipped_count": len(large_files),
        "large_files_skipped": [{"path": p, "size_mb": round(s/1024/1024, 1)} for p, s in large_files],
    }
    manifest["archived_repos"].append(entry)
    manifest["large_files_skipped"].extend(
        [{"repo": safe_name, "path": p, "size_mb": round(s/1024/1024, 1)} for p, s in large_files]
    )

# Save manifest as JSON
with open(CONSOLIDATED / "_archived_repos" / "MANIFEST.json", "w") as f:
    json.dump(manifest, f, indent=2)

print()
print("=" * 80)
print("CONSOLIDATION COMPLETE")
print("=" * 80)
print(f"Base dir: {CONSOLIDATED}")

def dir_size(path):
    total = 0
    for root, dirs, files in os.walk(path):
        for f in files:
            try:
                fp = os.path.join(root, f)
                if not os.path.islink(fp):
                    total += os.path.getsize(fp)
            except OSError:
                pass
    return total

print(f"Total size: {dir_size(CONSOLIDATED)/1024/1024:.1f} MB")
print(f"Archived repos: {len(manifest['archived_repos'])}")
print(f"Large files skipped: {len(manifest['large_files_skipped'])}")
