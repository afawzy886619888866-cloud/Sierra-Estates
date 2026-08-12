# NEXT_STEPS — Sierra Estates (pre-deploy)

Updated: 2026-08-10. Trim items as completed.

> **Deployment architecture lives in [`DEPLOYMENT.md`](./DEPLOYMENT.md)** — the only
> deployment document in this repo. This file is a to-do list, not a deploy guide.
>
> Two sections were removed from here on 2026-08-10 because they were wrong and
> contradicted it: a "Deployment Architecture (RESOLVED)" section claiming ONE Vercel
> deployment serves everything (there are **two** Vercel projects — the Vite SPA
> `apps/admin-dashboard` is live at `admin.sierra-estates.net`, not deprecated), and a
> "Vercel Setup" section describing dashboard build commands that no longer apply.

---

## URGENT — deploy security rules

Production Firestore currently allows `read, write: if request.auth != null`.
The hardened rules are ready in the repo — just need deploying.

1. Confirm every staff user has a `users/{uid}` doc with role `admin|manager|agent`.
2. Deploy: `pnpm deploy:firebase` (= `firebase deploy --only firestore:rules,storage,functions`). There is no `deploy:rules` script — for rules only, run `firebase deploy --only firestore:rules,storage --project sierra-blu`.
3. Rollback = redeploy previous rules file from git history.

---

## Secrets — set before going live

### In the client Vercel project (Next.js web app)

Env vars are per-project — setting these here does **not** set them on the admin project.


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
4. ⏳ Firestore/Storage rules deployed (see above)
5. ⏳ Secrets set on both Vercel projects
6. ⏳ Root Directory verified in the dashboard for both projects (`DEPLOYMENT.md` §12)
7. ⏳ `apps/admin-dashboard` added to `ci.yml` — it is live with no CI gate (`DEPLOYMENT.md` §9)
8. ⏳ Vercel plan confirmed to support the 5 crons (`DEPLOYMENT.md` §7)

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
