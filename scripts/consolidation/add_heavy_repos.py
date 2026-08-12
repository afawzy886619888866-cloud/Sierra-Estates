#!/usr/bin/env python3
"""
Add the 3 heavy Sierra snapshots (sierra-estates, sierra-2026, i-sierra-2027)
to _archived_repos/ in the consolidated repo.

These were originally skipped as "older snapshots" but the user wants them
preserved in the archive because they are the most content-heavy repos.

Strategy:
- For each repo, copy contents into _archived_repos/<name>/ filtering out
  .git/, node_modules/, .next/, dist/, build/, etc., and files >50MB.
- Update MANIFEST.json and MANIFEST.md to include the new entries.
"""
import json
import os
import shutil
from pathlib import Path

REPOS_DIR = Path("/home/z/my-project/repos")
ARCHIVED = Path("/home/z/my-project/consolidated/_archived_repos")
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

SKIP_DIRS_COPY = {
    ".git", "node_modules", ".next", "dist", "build", "__pycache__",
    ".venv", "venv", "env", ".cache", "target", ".gradle", ".idea",
    ".vscode", "coverage", ".pytest_cache", ".turbo", ".codex",
    "out", ".turbo_cache",
}

REPOS_TO_ADD = [
    {
        "name": "sierra-estates",
        "archived_as": "sierra-estates",
        "note": "Older snapshot of the Sierra Estates frontend (502 MB, pkg=sierra-ai-frontend). Preserved because it's one of the 3 heaviest repos.",
    },
    {
        "name": "sierra-2026",
        "archived_as": "sierra-2026",
        "note": "Older snapshot of Sierra Estates 2026 (295 MB, pkg=sierra-estates-final). Preserved because it's one of the 3 heaviest repos.",
    },
    {
        "name": "i-sierra-2027",
        "archived_as": "i-sierra-2027",
        "note": "Sierra Estates Platform variant (15 MB, pkg=sierra-estates-platform). Preserved per user request.",
    },
]

def copy_tree_filtered(src: Path, dst: Path, skip_dirs: set[str], skip_git=True):
    """Copy src to dst, skipping certain dirs and large files."""
    src = Path(src)
    dst = Path(dst)
    dst.mkdir(parents=True, exist_ok=True)
    large_files = []
    for root, dirs, files in os.walk(src, followlinks=False):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        if skip_git and ".git" in dirs:
            dirs.remove(".git")
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

def human_size(num):
    for unit in ["B", "KB", "MB", "GB"]:
        if num < 1024:
            return f"{num:.1f}{unit}"
        num /= 1024
    return f"{num:.1f}TB"

def extract_name(repo_path: Path) -> str | None:
    pj = repo_path / "package.json"
    if pj.exists():
        try:
            data = json.loads(pj.read_text(errors="replace")[:4096])
            n = data.get("name")
            if n:
                return n
        except Exception:
            pass
    return None

def find_readme_first_line(repo_path: Path) -> str:
    for cand in ["README.md", "readme.md", "README"]:
        rmp = repo_path / cand
        if rmp.exists():
            try:
                txt = rmp.read_text(errors="replace")[:512]
                for line in txt.splitlines():
                    line = line.strip().lstrip("#").strip()
                    if line:
                        return line[:100]
            except Exception:
                pass
    return ""

# Load existing manifest
manifest_path = ARCHIVED / "MANIFEST.json"
with open(manifest_path) as f:
    manifest = json.load(f)

# Remove these 3 names from the "skipped.sierra_snapshots" list if present
skipped = manifest.get("skipped", {})
sierra_snapshots_skipped = skipped.get("sierra_snapshots", [])
new_skipped_sierra = [n for n in sierra_snapshots_skipped if n not in {r["name"] for r in REPOS_TO_ADD}]
skipped["sierra_snapshots"] = new_skipped_sierra
manifest["skipped"] = skipped

# Add new entries
existing_archived_names = {r["original_name"] for r in manifest["archived_repos"]}
for r in REPOS_TO_ADD:
    name = r["name"]
    if name in existing_archived_names:
        print(f"  {name} already in archive, skipping.")
        continue
    src = REPOS_DIR / name
    if not src.exists():
        print(f"  WARN: {src} does not exist, skipping.")
        continue
    dst = ARCHIVED / r["archived_as"]
    print(f"Copying {name} -> _archived_repos/{r['archived_as']} ...")
    large_files = copy_tree_filtered(src, dst, SKIP_DIRS_COPY)
    size = dir_size(dst)
    entry = {
        "original_name": name,
        "archived_as": r["archived_as"],
        "pkg_name": extract_name(src),
        "size_human": human_size(size),
        "size_bytes": size,
        "readme_first_line": find_readme_first_line(src),
        "large_files_skipped_count": len(large_files),
        "large_files_skipped": [{"path": p, "size_mb": round(s/1024/1024, 1)} for p, s in large_files],
        "note": r["note"],
    }
    manifest["archived_repos"].append(entry)
    manifest["large_files_skipped"].extend(
        [{"repo": r["archived_as"], "path": p, "size_mb": round(s/1024/1024, 1)} for p, s in large_files]
    )
    print(f"  Done. Size: {human_size(size)} | Large files skipped: {len(large_files)}")

# Save updated manifest
with open(manifest_path, "w") as f:
    json.dump(manifest, f, indent=2, default=str)

print()
print("=" * 80)
print(f"Total archived repos now: {len(manifest['archived_repos'])}")
for r in manifest["archived_repos"]:
    print(f"  - {r['archived_as']:50} | {r.get('size_human','?'):>10} | pkg={r.get('pkg_name')}")
