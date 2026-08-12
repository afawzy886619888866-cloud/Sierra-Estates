#!/usr/bin/env python3
"""
Fingerprint each repo to identify duplicates / overlapping content.

Strategy:
- For each repo, compute a fingerprint = hash of (sorted set of meaningful
  top-level relative file paths, restricted to a known set of "marker" files
  like package.json, README.md, main.py, requirements.txt, etc.)
- Also extract the "name" field from package.json / pyproject.toml when present.
- Group repos by fingerprint OR by package name → duplicate cluster.
- The newest member (by file mtime) of each cluster is the "canonical" member.
- Repos below a minimum size threshold (e.g. < 5 KB) are flagged as "empty".
"""
import hashlib
import json
import os
from pathlib import Path

REPOS_DIR = Path("/home/z/my-project/repos")
SKIP_DIRS = {".git", "node_modules", ".next", "dist", "build", "__pycache__",
             ".venv", "venv", "env", ".cache", "target", ".gradle", ".idea",
             ".vscode", "coverage", ".pytest_cache", ".turbo", ".codex",
             ".claude", ".agent", ".agents", "lib", "out"}

MARKER_FILES = {
    "package.json", "pyproject.toml", "requirements.txt", "setup.py",
    "Cargo.toml", "go.mod", "build.gradle", "build.gradle.kts",
    "README.md", "README", "readme.md",
    "Dockerfile", "docker-compose.yml",
    "tsconfig.json", "firebase.json", ".firebaserc",
    "main.py", "main.ts", "main.js", "app.py", "index.ts", "index.js",
    "vercel.json", "next.config.ts", "next.config.js",
}

MIN_MEANINGFUL_SIZE = 1024  # 1 KB threshold for "empty"

def walk_files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        # mutate dirnames in place to skip
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            yield Path(dirpath) / fn

def read_text_safely(p: Path, limit=4096):
    try:
        return p.read_text(errors="replace")[:limit]
    except Exception:
        return ""

def extract_name(repo_path: Path) -> str | None:
    pj = repo_path / "package.json"
    if pj.exists():
        try:
            data = json.loads(read_text_safely(pj, 4096))
            n = data.get("name")
            if n:
                return n
        except Exception:
            pass
    pp = repo_path / "pyproject.toml"
    if pp.exists():
        txt = read_text_safely(pp, 8192)
        for line in txt.splitlines():
            line = line.strip()
            if line.startswith("name") and "=" in line:
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None

def fingerprint(repo_path: Path) -> tuple[str, set[str]]:
    """Compute a fingerprint based on relative paths of marker files (top 3 levels)."""
    rel_paths = set()
    for f in walk_files(repo_path):
        try:
            rel = f.relative_to(repo_path)
        except ValueError:
            continue
        # Only consider paths <= 3 levels deep + only marker filenames OR
        # files with extensions that signal source code
        parts = rel.parts
        if len(parts) > 3:
            continue
        if f.name in MARKER_FILES:
            rel_paths.add(str(rel))
        # also include all .py / .ts / .tsx / .js / .rs / .kt files at depth<=2
        if len(parts) <= 2 and f.suffix in {".py", ".ts", ".tsx", ".js", ".jsx", ".rs", ".kt"}:
            rel_paths.add(str(rel))
    # Hash the sorted set
    fp = hashlib.sha1("\n".join(sorted(rel_paths)).encode()).hexdigest()[:12]
    return fp, rel_paths

def total_size(repo_path: Path) -> int:
    total = 0
    for f in walk_files(repo_path):
        try:
            if not f.is_symlink():
                total += f.stat().st_size
        except OSError:
            pass
    return total

def latest_mtime(repo_path: Path) -> float:
    latest = 0
    for f in walk_files(repo_path):
        try:
            if not f.is_symlink():
                latest = max(latest, f.stat().st_mtime)
        except OSError:
            pass
    return latest

repos_info = []
for repo_path in sorted(REPOS_DIR.iterdir()):
    if not repo_path.is_dir():
        continue
    size = total_size(repo_path)
    fp, paths = fingerprint(repo_path)
    name = extract_name(repo_path)
    mtime = latest_mtime(repo_path)
    # Get first meaningful README line
    readme = ""
    for cand in ["README.md", "readme.md", "README"]:
        rmp = repo_path / cand
        if rmp.exists():
            txt = read_text_safely(rmp, 512)
            for line in txt.splitlines():
                line = line.strip().lstrip("#").strip()
                if line:
                    readme = line[:100]
                    break
            break
    repos_info.append({
        "name": repo_path.name,
        "size_bytes": size,
        "size_human": f"{size/1024:.1f} KB" if size < 1024*1024 else f"{size/1024/1024:.1f} MB",
        "fingerprint": fp,
        "marker_paths": sorted(paths)[:20],
        "pkg_name": name,
        "mtime": mtime,
        "readme_first_line": readme,
        "is_empty": size < MIN_MEANINGFUL_SIZE,
    })

# Group by fingerprint to find near-duplicates
from collections import defaultdict
by_fp = defaultdict(list)
by_pkg = defaultdict(list)
for r in repos_info:
    by_fp[r["fingerprint"]].append(r["name"])
    if r["pkg_name"]:
        by_pkg[r["pkg_name"]].append(r["name"])

print("=" * 100)
print("REPO FINGERPRINTS")
print("=" * 100)
for r in sorted(repos_info, key=lambda x: x["mtime"], reverse=True):
    flag = ""
    if r["is_empty"]:
        flag = "[EMPTY]"
    print(f"  {r['name']:50} | {r['fingerprint']} | {r['size_human']:>10} | pkg={r['pkg_name']} | {flag}")

print()
print("=" * 100)
print("DUPLICATE CLUSTERS (by fingerprint)")
print("=" * 100)
dup_clusters = {fp: names for fp, names in by_fp.items() if len(names) > 1}
if not dup_clusters:
    print("  No exact fingerprint duplicates.")
else:
    for fp, names in dup_clusters.items():
        print(f"  fp={fp}: {names}")

print()
print("=" * 100)
print("DUPLICATE CLUSTERS (by package name)")
print("=" * 100)
dup_pkg = {n: names for n, names in by_pkg.items() if len(names) > 1}
if not dup_pkg:
    print("  No package-name duplicates.")
else:
    for n, names in dup_pkg.items():
        print(f"  pkg={n!r}: {names}")

# Save
with open("/home/z/my-project/scripts/repo_fingerprints.json", "w") as f:
    json.dump({
        "repos": repos_info,
        "dup_clusters_by_fingerprint": dup_clusters,
        "dup_clusters_by_pkg_name": dup_pkg,
    }, f, indent=2, default=str)

print()
print(f"Total: {len(repos_info)} repos | Empty: {sum(1 for r in repos_info if r['is_empty'])}")
