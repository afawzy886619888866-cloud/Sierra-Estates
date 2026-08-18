# NEXT_STEPS — Sierra Estates (pre-deploy)

Updated: 2026-06-07. Trim items as completed.

---

## Deployment Architecture (RESOLVED ✅)

**ONE Vercel deployment** (`apps/sierra-estates-realty`) serves everything:

- `/` → Public site: listings, search, contact
- `/admin/*` → Staff admin panel (Firebase Auth gated by `app/admin/layout.tsx`)
- `/api/*` → All backend APIs (auth-guarded per route)

**Firebase** = infrastructure only: Firestore + Storage + Auth + Cloud Functions.
No Firebase Hosting needed for the web app.

`apps/admin` (Vite SPA) = **DEPRECATED** (all mock data). Real admin = `apps/sierra-estates-realty/app/admin/`.

---

## URGENT — deploy security rules

Production Firestore currently allows `read, write: if request.auth != null`.
The hardened rules are ready in the repo — just need deploying.

1. Confirm every staff user has a `users/{uid}` doc with role `admin|manager|agent`.
2. Deploy: `pnpm deploy:rules` (= `firebase deploy --only firestore:rules,storage`)
3. Rollback = redeploy previous rules file from git history.

---

## Vercel Setup (one-time in dashboard)

**Option A — recommended (Root Directory = `apps/sierra-estates-realty`):**

- Set Root Directory = `apps/sierra-estates-realty`
- Framework = Next.js (auto-detected)
- Build command = `pnpm build`
- Output directory = `.next` (auto-detected)
- Env vars: copy from `apps/sierra-estates-realty/.env.local.example`

**Option B — fallback (Root Directory = repo root):**

- Build command = `pnpm --filter sierra-estates-platform build`
- Output directory = `apps/sierra-estates-realty/.next`
- Install command = `pnpm install --frozen-lockfile`

---

## Secrets — set before going live

### In Vercel dashboard (for the Next.js web app)

```text
NEXT_PUBLIC_FIREBASE_*          ← from Firebase console
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY            ← from service account JSON
SBR_SECRET_KEY                  ← openssl rand -hex 32
CRON_SECRET                     ← openssl rand -hex 32
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
GOOGLE_SHEETS_CREDENTIALS
GOOGLE_SHEETS_SPREADSHEET_ID
```

### In Firebase (for Cloud Functions)

```bash
firebase functions:secrets:set SBR_SECRET_KEY
firebase functions:secrets:set ENCRYPTION_KEY
firebase deploy --only functions
```

---

## Pre-deploy gates

1. ✅ API auth hardened (all endpoints locked with RBAC)
2. ✅ Type-check CI gate (`ignoreBuildErrors: false`)
3. ✅ **440 tests passing** across 32 test suites (100% pass rate)
4. ✅ Deployment architecture fixed (single Vercel app serving public, admin, and APIs)
5. ✅ Production build verified (79 static & dynamic routes compiled)
6. ✅ Rate-limiting & input sanitization active
7. ⏳ Firestore/Storage rules deployed (`pnpm deploy:rules`)
8. ⏳ Production environment variables populated in Vercel dashboard

---

## Completed & Verified ✅

- Real type-check CI gate, functions tests, lint clean, turbo workspace ready
- Recovered concierge backend, dependency cleanup across all workspaces
- Firestore/Storage rules hardened (staff-gated, ready to deploy)
- Vercel cron paths fixed
- API auth hardening (all endpoints secured with `verifyAdminRequest`)
- `vercel.json` verified for monorepo
- Real AI agent multi-agent workflows added in `@sierra-estates/agents-core` (Gemini 2.5/2.0 + Vertex AI)
- Rate-limiting active on public endpoints (listings, leads, inquiries)
- All 79 Next.js routes verified with full bilingual Arabic (RTL) and English support
