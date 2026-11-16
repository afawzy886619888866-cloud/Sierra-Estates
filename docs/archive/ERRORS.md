# ERRORS.md — Sierra Estates Realty Error Tracking & Learning Log

This file records build, runtime, deployment, and integration errors encountered during development to ensure continuous learning and prevent issue recurrence.

---

## [2026-07-25 14:00] - Duplicate Vercel Deployments Triggered on Git Push

- **Type**: Integration / CI-CD
- **Severity**: High
- **File**: `.github/workflows/deploy-vercel.yml`, `vercel.json`
- **Agent**: @antigravity-orchestrator
- **Root Cause**: Native Vercel GitHub integration was active simultaneously with GitHub Actions workflow, causing 4 parallel deployments instead of 2.
- **Error Message**:

```text
Deployment duplicate conflict: Both Vercel GitHub App and GitHub Action triggered deployment for commit ...
```

- **Fix Applied**: Added `"github": { "silent": true }` to `vercel.json` to disable native Vercel hooks and enforce single source of deployment via GitHub Actions.
- **Prevention**: Enforced deployment rule in `AGENTS.md` requiring native Vercel integration to remain disabled.
- **Status**: Fixed

---

## [2026-07-27 00:25] - System Tool Path Resolution for Antigravity Global Binaries

- **Type**: Integration
- **Severity**: Low
- **File**: `C:\Users\sierr\AppData\Roaming\npm\antigravity.cmd`
- **Agent**: @antigravity-ide
- **Root Cause**: Global npm bin path was not indexed in standard PowerShell PATH for custom executable aliases.
- **Fix Applied**: Installed `antigravity-sdk`, `@rmyndharis/antigravity-skills`, and `antigravity-auth` globally and verified path linking.
- **Prevention**: Resolved path execution via standard npm bin script `antigravity.cmd`.
- **Status**: Fixed

---

## [2026-07-27 00:30] - Admin Dashboard TypeScript Compilation Error (`server.ts`)

- **Type**: Syntax / Type Error
- **Severity**: Medium
- **File**: `apps/admin-dashboard/server.ts:3`
- **Agent**: @build-error-resolver
- **Root Cause**: `server.ts` references non-existent module `'./api/index.js'` and has untyped `req` / `res` parameters (`TS7006`).
- **Error Message**:

```text
server.ts(3,17): error TS2307: Cannot find module './api/index.js' or its corresponding type declarations.
server.ts(19,19): error TS7006: Parameter 'req' implicitly has an 'any' type.
server.ts(19,24): error TS7006: Parameter 'res' implicitly has an 'any' type.
```

- **Fix Applied**: Replaced missing `./api/index.js` import with top-level `express()` instantiation and added explicit `Request` and `Response` types in `server.ts`.
- **Status**: Fixed & Verified (Passed `tsc --noEmit`)

---

## [2026-07-27 00:37] - Firebase Functions Node.js Engine Mismatch Warning

- **Type**: Configuration / Warning
- **Severity**: Low
- **File**: `functions/package.json:7`
- **Agent**: @antigravity-ide
- **Root Cause**: Strict `"node": "20"` engine specification generated pnpm warnings on Node 22/24/26 environments.
- **Fix Applied**: Updated `engines.node` in `functions/package.json` to `">=20"`.
- **Status**: Fixed & Verified (6/6 workspace packages compiled cleanly without warnings)
