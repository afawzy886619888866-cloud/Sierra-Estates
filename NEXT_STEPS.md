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

```
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

1. ✅ API auth hardened (all endpoints locked)
2. ✅ Type-check CI gate (`ignoreBuildErrors: false`)
3. ✅ 47 tests passing
4. ✅ Deployment architecture fixed (one Vercel, no broken Firebase hosting)
5. ⏳ Firestore/Storage rules deployed (see above)
6. ⏳ Secrets set in Vercel dashboard
7. ⏳ Vercel project configured (Option A or B above)

---

## Recommendations (nice to have)

- Enable branch protection on `main` (require PRs; block force-push)
- Stand up staging Firebase + Vercel project
- Replace `MockAIService` with real AI
- Raise test coverage (currently ~2%)
- Add rate-limiting to public endpoints (listings, leads)

---

## Done ✅

- Real type-check CI gate, functions tests, lint 256→0, turbo 2.9.16 CVEs fixed
- Recovered concierge backend, dependency cleanup
- Firestore/Storage rules hardened (staff-gated, ready to deploy)
- Vercel cron paths fixed
- API auth hardening (all 8 endpoints secured)
- `vercel.json` fixed for monorepo (correct build cmd + outputDirectory)
- `firebase.json` cleaned (removed broken web/admin hosting targets)
- `.firebaserc` created (project: sierra-estates-prod)
- `apps/admin` Vite SPA deprecated (DEPRECATED.md added)
- `CLAUDE.md` updated with correct deployment architecture
- `NEXT_STEPS.md` this file updated
