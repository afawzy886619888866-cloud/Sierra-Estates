# Migration Summary

## Source branches

- `refs/remotes/sierra-estates/main`
- `refs/remotes/hash-repo/main`
- `refs/remotes/frontend-repo/master`
- `refs/remotes/new-folder-repo/main`

## What moved where

- `apps/api/`: copied Sierra Estates backend files and hash-repo Python backend helpers; kept a simple FastAPI entrypoint, requirements, and Dockerfile.
- `apps/agents/`: copied `agents/`, `bots/`, and `skills/` from `hash-repo/main`, plus `whatsapp-scraper-bot/` from `new-folder-repo/main`, excluding lockfiles, env files, node_modules, and build artifacts.
- `apps/web/`: added only missing `app/api`, `components`, and `lib` files from `frontend-repo/master` and `sierra-estates/main:frontend/`; existing monorepo files were not overwritten.
- `apps/admin/`: added missing files from `hash-repo/main:sierra-estates-admin-portal/` without overwriting existing admin files.
- `functions/`: compared against `hash-repo/main:functions/`; no additional files were needed.
- `.env.example`: updated to a union of the current repo and source `.env.example` variables.

## Branch publishing script

Repository owners can publish snapshot branches for the four migrated source heads with:

```bash
#!/usr/bin/env bash
set -euo pipefail

git fetch sierra-estates hash-repo frontend-repo new-folder-repo
git push origin refs/remotes/sierra-estates/main:refs/heads/migrate/sierra-estates-main
git push origin refs/remotes/hash-repo/main:refs/heads/migrate/hash-repo-main
git push origin refs/remotes/frontend-repo/master:refs/heads/migrate/frontend-repo-master
git push origin refs/remotes/new-folder-repo/main:refs/heads/migrate/new-folder-repo-main
```

A runnable version of that script lives at `scripts/create-migrate-branches.sh`.
