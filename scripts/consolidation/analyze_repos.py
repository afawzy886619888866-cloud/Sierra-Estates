#!/usr/bin/env python3
"""Analyze the structure of each cloned repo."""
import os
from pathlib import Path
import json

REPOS_DIR = Path("/home/z/my-project/repos")
analysis = []

# Skip these dirs when scanning content
SKIP_DIRS = {".git", "node_modules", ".next", "dist", "build", "__pycache__",
             ".venv", "venv", "env", ".cache", "target", ".gradle", ".idea",
             ".vscode", "coverage", ".pytest_cache", "eggs", ".eggs"}

def human_size(num):
    for unit in ["B", "KB", "MB", "GB"]:
        if num < 1024:
            return f"{num:.1f}{unit}"
        num /= 1024
    return f"{num:.1f}TB"

def dir_size(path):
    total = 0
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            try:
                fp = os.path.join(root, f)
                if not os.path.islink(fp):
                    total += os.path.getsize(fp)
            except OSError:
                pass
    return total

def top_level_entries(path):
    try:
        return sorted([p.name for p in path.iterdir() if p.name != ".git"])
    except Exception:
        return []

def detect_type(path, entries):
    """Detect project type."""
    e = set(entries)
    if "package.json" in e:
        return "node/js"
    if "requirements.txt" in e or "pyproject.toml" in e or "setup.py" in e:
        return "python"
    if "Cargo.toml" in e:
        return "rust"
    if "build.gradle" in e or "build.gradle.kts" in e:
        return "kotlin/java"
    if "go.mod" in e:
        return "go"
    if "pom.xml" in e:
        return "java/maven"
    if any(e == "Dockerfile" for e in entries):
        return "docker"
    return "other/unknown"

def find_readme(path):
    for name in ["README.md", "README.txt", "README", "readme.md"]:
        p = path / name
        if p.exists():
            try:
                return p.read_text(errors="replace")[:300]
            except Exception:
                pass
    return ""

for repo_path in sorted(REPOS_DIR.iterdir()):
    if not repo_path.is_dir():
        continue
    entries = top_level_entries(repo_path)
    if not entries:
        analysis.append({"name": repo_path.name, "type": "empty", "size": 0, "entries": []})
        continue
    size = dir_size(repo_path)
    ptype = detect_type(repo_path, entries)
    readme_snip = find_readme(repo_path).strip().split("\n")[0][:80] if find_readme(repo_path) else ""
    analysis.append({
        "name": repo_path.name,
        "type": ptype,
        "size_bytes": size,
        "size_human": human_size(size),
        "entries": entries[:30],
        "readme_first_line": readme_snip,
    })

# Sort by size desc
analysis.sort(key=lambda x: x.get("size_bytes", 0), reverse=True)

print(f"{'REPO':50} | {'TYPE':12} | {'SIZE':>10} | TOP-LEVEL ENTRIES")
print("-" * 140)
for a in analysis:
    ent = ", ".join(a["entries"][:12])
    if len(a["entries"]) > 12:
        ent += f" ... (+{len(a['entries'])-12} more)"
    print(f"{a['name']:50} | {a['type']:12} | {a['size_human']:>10} | {ent}")

# Save analysis
with open("/home/z/my-project/scripts/repo_analysis.json", "w") as f:
    json.dump(analysis, f, indent=2, default=str)

print()
print(f"Total repos analyzed: {len(analysis)}")
print(f"Total size: {human_size(sum(a.get('size_bytes',0) for a in analysis))}")
