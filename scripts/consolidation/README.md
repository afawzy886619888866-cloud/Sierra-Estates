# Consolidation Scripts

These are the scripts that were used to consolidate all 31 repositories
from `github.com/ahmedfawzy8866` into this single `Sierra-Estates-Final`
monorepo on **2026-07-06**. They are preserved here so the work is
reproducible and auditable.

## Order of operations

Run these in order to reproduce the consolidation end-to-end.

```bash
# 1. List all repos via the GitHub API and shallow-clone each one.
#    Writes to /home/z/my-project/repos/<repo-name>/
python3 clone_all_repos.py

# 2. Walk each cloned repo, detect its project type (node / python / rust /
#    kotlin / etc.), compute its size, and dump a JSON summary.
python3 analyze_repos.py

# 3. Fingerprint each repo by the sorted set of "marker" file paths
#    (package.json, pyproject.toml, Cargo.toml, README.md, Dockerfile,
#    tsconfig.json, firebase.json, source files at depth <= 2, etc.).
#    Group repos by fingerprint AND by package.json:name to find duplicates.
python3 fingerprint_repos.py

# 4. Build the consolidated tree:
#    - Base: Sierra-Estates-Final codebase (copied to /consolidated/)
#    - Each distinct repo copied to /consolidated/_archived_repos/<name>/
#    - Skip empty repos, fingerprint duplicates, older Sierra snapshots
#    - Strip .git/, node_modules/, dist/, build/, files >50 MB
#    - Emit _archived_repos/MANIFEST.json
python3 consolidate_repos.py

# 5. Restore any files that the SKIP_DIRS filter in step 4 accidentally
#    excluded (.codex/, .agent/, dist/ inside packages/, etc.).
#    Reads git stage, classifies deletions as intentional or unintentional,
#    restores unintentional ones from HEAD.
python3 restore_unintentional_deletions.py

# 6. Run dead-code analysis on the backend:
#    - Python (vulture) on apps/api/
#    - TypeScript (ts-prune + tsc --noUnusedLocals) on functions/ and
#      packages/api|db|auth|config/
python3 run_dead_code_analysis.py
```

The 3 follow-up scripts that added more repos to the archive after the
initial consolidation:

```bash
# Added the 3 heaviest Sierra snapshots (sierra-estates, sierra-2026,
# i-sierra-2027) per user request.
python3 add_heavy_repos.py

# Added the final 2 Sierra snapshots (sf1, final-frontend) per user
# request. Archive is now complete (15 repos).
python3 add_final_two_repos.py
```

## Authentication

Each script that talks to GitHub reads the token from a `TOKEN` constant
at the top of the file. **Replace `<GITHUB_TOKEN>` with a real
personal access token** before running. The committed copies have the
token replaced with the literal string `<GITHUB_TOKEN>` for safety.

## What each script produces

| Script                          | Outputs                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `clone_all_repos.py`            | `/home/z/my-project/repos/<name>/` (one dir per cloned repo)                     |
| `analyze_repos.py`              | `repo_analysis.json` (per-repo size, type, top-level entries, README snippet)    |
| `fingerprint_repos.py`          | `repo_fingerprints.json` (per-repo fingerprint + duplicate clusters)             |
| `consolidate_repos.py`          | `/home/z/my-project/consolidated/` (the consolidated tree) + `MANIFEST.json`     |
| `restore_unintentional_deletions.py` | Restores files in-place inside the git stage                                 |
| `run_dead_code_analysis.py`     | `dead_code_analysis.json` (vulture + ts-prune findings)                          |
| `add_heavy_repos.py`            | Updates `_archived_repos/MANIFEST.json` with 3 new entries                       |
| `add_final_two_repos.py`        | Updates `_archived_repos/MANIFEST.json` with 2 new entries                       |

## Verification

After running, verify the result with:

```bash
# Backend tests must all pass
./scripts/test-backend.sh

# Git must show a clean tree
git status

# Remote must be in sync
git fetch origin && git log origin/main..HEAD --oneline
# (empty output means local == remote)
```

## See also

- `CONSOLIDATION_REPORT.md` (repo root) — executive summary of what was done.
- `_archived_repos/MANIFEST.md` — table of every archived repo with notes.
- `_archived_repos/MANIFEST.json` — machine-readable manifest.
- `docs/BACKEND_TESTS.md` — how to run and interpret the backend test suite.
- `docs/MIGRATION_REPORT.md` — pre-existing migration notes (which files
  moved from where to where inside the Sierra Estates codebase).
