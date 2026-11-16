# Phase 1 — Firestore Rules Review & Optimization Notes

**Scope:** Optimizing the EXISTING Firebase codebase (no migration). Canonical rules file: `apps/sierra-estates-realty/firestore.rules` (per `firebase.json`). The root `firestore.rules` is stale — consider deleting it to avoid confusion.

## Changes applied (not yet deployed)

1. **Status-gated public catalog reads** — `properties`, `listings`, `units` now require `status == 'published'` for unauthenticated reads. Staff retain full access via the catch-all.
2. **`houyez_*` writes tightened** — from `isSignedIn()` (any account) to `isStaff()`. Previously any signed-up user could modify the public catalog.

## ⚠️ Pre-deploy checklist (`firebase deploy --only firestore:rules`)

- [ ] Client portal queries on `properties`/`listings`/`units` filter `where('status','==','published')`, or read server-side (Admin SDK/ISR — bypasses rules). Unfiltered client-SDK queries will be DENIED after deploy.
- [ ] Verify every doc in those collections has a `status` field. Docs without one become publicly unreadable (safe default, but check the portal doesn't rely on them).
- [ ] Confirm no legitimate non-staff write flow to `houyez_*` (e.g. client-side tour bookings). If one exists, route it through the VPS/n8n Admin SDK instead.
- [ ] Run emulator rules tests as noted in the file header.

## Remaining optimizations (recommended, not yet applied)

### 1. Custom claims instead of `get()` in `isStaff()` — read-budget win

Current `isStaff()` does `exists()` + `get()` on `users/{uid}` for EVERY staff request (rules cache within a single request, but it's still up to 1 extra read per operation — significant against the 50k/day free tier for an active admin SPA).
Fix: set `role` as a Firebase Auth custom claim via Admin SDK on the VPS, change `isStaff()` to `request.auth.token.role in ['admin','manager','agent']`, and update `lib/AuthContext.tsx` to read the claim from the ID token. Requires a one-time claims backfill script and forced token refresh.

### 2. Owner PII isolation (document-level)

Rules are document-level, so any PII field on a publicly-readable `properties`/`listings` doc IS exposed. Action: audit what the admin app writes to these collections; move owner name/phone into a staff-only collection (`owners/{ownerId}` + `propertyPrivate/{propertyId}` linkage — see `FIRESTORE_SCHEMA.md` draft). Until that audit is done, the status gate only protects unpublished docs.

### 3. Cloud Functions retirement

`firebase.json` declares a `functions` codebase (`functions/`, "data collection and processing pipeline", 540s timeout / 512MB — billable). Per the Low-Cost strategy, this pipeline should move to the VPS (n8n + Admin SDK), then remove the `functions` block from `firebase.json` and archive `functions/`. Do NOT delete until the VPS replacement is live.

### 4. Catch-all breadth

`match /{document=**} { allow read, write: if isStaff(); }` grants all staff (including agents) full write to everything: `users`? No — specific match wins nothing; OR semantics mean the catch-all ALSO applies to `users`, so any agent can write any user's role via the catch-all, defeating the staff-only `users` write comment. Consider excluding `users` from the catch-all or gating role changes to `admin` only.
