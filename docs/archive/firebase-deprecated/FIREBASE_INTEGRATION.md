# Firebase Integration & Deployment Guide

## Phase 1: Git & Repository Status ✅

### Current State

- Repository: `https://github.com/ahmedfawzy8866/SE.git`
- Branch: `main`
- Commits: `d5dcd79` (latest: "Finalize backend: clean Next.js + Firebase stack")
- No git lock files or pending merges
- Clean working tree

### Recent Changes

- `.env.local` added with placeholder Firebase credentials
- Ready for Vercel deployment with environment variable substitution

---

## Phase 2: Firebase Configuration

### Development Setup (Local)

1. **Get Firebase credentials:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select or create a project
   - Go to Project Settings → General → Your apps
   - Create a web app if needed
   - Copy the config values

2. **Update `.env.local` with real credentials:**

   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=<your_api_key>
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your_project>.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your_project_id>
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your_project>.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender_id>
   NEXT_PUBLIC_FIREBASE_APP_ID=<app_id>
   ```

3. **Verify Firebase is configured:**

   ```bash
   npm run type-check   # Should pass
   npm run build        # Should build successfully
   ```

### Firestore Setup

1. **Create Firestore Database:**
   - Firebase Console → Firestore Database
   - Create in "Native mode"
   - Location: Leave default or set to nearest region
   - Start in production mode (rules are strict by default)

2. **Deploy Firestore Rules:**

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init       # Select Firestore, use existing project
   firebase deploy --only firestore:rules
   ```

   Or copy from `firestore.rules` file:
   - Go to Firestore → Rules tab
   - Replace with contents of `firestore.rules`
   - Publish

3. **Seed the Database:**

   **Option A: Via Admin Dashboard (Recommended for production)**
   - Create docs manually in Firestore Console
   - Or use a Firebase Admin SDK script

   **Option B: Via Seed API (Development)**

   ```bash
   # After setting ADMIN_API_KEY in env
   curl -X POST http://localhost:3000/api/houyez/seed \
     -H "x-admin-key: <ADMIN_API_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"overwrite": true}'
   ```

4. **Five Collections Created:**
   - `houyez_slides` — Hero slider (5 items)
   - `houyez_compounds` — Compounds grid (8 items)
   - `houyez_rooms` — 360° rooms (6 items)
   - `houyez_listings` — AI-curated properties (40+ items)
   - `houyez_tours` — Virtual tours (8 items)

### Firestore Rules Explanation

```javascript
// Public READ — portal renders without requiring login
// Auth WRITE — any signed-in user can edit (tighten for production)
match /houyez_{slides,compounds,rooms,listings,tours}/{doc} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

**Before production,** upgrade to custom claims (admin role):

```javascript
allow write: if request.auth.token.role == 'admin';
```

---

## Phase 3: Local Development

### Environment Variables

All set in `.env.local`:

- `NEXT_PUBLIC_FIREBASE_*` — public, safe to expose
- `ADMIN_API_KEY` — keep secret in production
- `NEXT_PUBLIC_APP_URL` — used for redirects
- `NEXT_PUBLIC_APP_ENV` — `development` or `production`

### Start Local Server

```bash
pnpm install
pnpm dev
```

Visit: `http://localhost:3000/clients`

**Expected behavior:**

- If Firebase is configured → live data from Firestore
- If Firebase is missing → demo data badge + static seed data
- If Firestore collection is empty → seed data fallback

### Testing with Seed API

```bash
curl -X POST http://localhost:3000/api/houyez/seed \
  -H "x-admin-key: e9a8c7b6f5e4d3c2b1a0f9e8d7c6b5a4" \
  -H "Content-Type: application/json" \
  -d '{"overwrite": true}'
```

Response:

```json
{
  "success": true,
  "result": {
    "slides": 5,
    "compounds": 8,
    "rooms": 6,
    "listings": 40,
    "tours": 8,
    "skipped": [],
    "errors": []
  }
}
```

---

## Phase 4: Production Deployment to Vercel

### Prerequisites

- GitHub repository set up (✅ already done)
- Firebase project created
- Firestore rules deployed
- Admin API key generated

### Step 1: Push to GitHub

```bash
git add .env.local
git commit -m "chore: add Firebase configuration template"
git push origin main
```

### Step 2: Connect to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Or use Vercel Dashboard: Import repo from GitHub
```

### Step 3: Set Environment Variables in Vercel

Go to: **Vercel Dashboard → Project Settings → Environment Variables**

Add for all environments (Production, Preview, Development):

```
NEXT_PUBLIC_FIREBASE_API_KEY = <your_value>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = <your_value>
NEXT_PUBLIC_FIREBASE_PROJECT_ID = <your_value>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = <your_value>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = <your_value>
NEXT_PUBLIC_FIREBASE_APP_ID = <your_value>
ADMIN_API_KEY = <your_random_32_char_string>
NEXT_PUBLIC_APP_URL = https://your-vercel-domain.vercel.app
NEXT_PUBLIC_APP_ENV = production
```

### Step 4: Trigger Build

- Push a commit to `main`, OR
- Manually trigger in Vercel Dashboard
- Build should complete in 1-2 minutes

### Step 5: Verify Deployment

1. Visit: `https://your-project.vercel.app/clients`
2. Should render the Houyez portal with live Firestore data
3. Check browser console for any Firebase errors
4. If empty → seed the database via API call (see Testing section)

### Step 6: Seed Production Database

```bash
# Make sure ADMIN_API_KEY is set in Vercel production env
curl -X POST https://your-project.vercel.app/api/houyez/seed \
  -H "x-admin-key: <ADMIN_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"overwrite": true}'
```

---

## Phase 5: Admin Operations

### Update Data in Production

**Option 1: Firestore Console (Recommended)**

- Go to Firebase Console → Firestore
- Edit docs directly
- Changes sync in real-time to all clients

**Option 2: Firebase Admin SDK**

- Create an admin script
- Use service account credentials
- Update/create docs programmatically

**Option 3: API Endpoint**

- Extend `/api/houyez/seed` to handle individual updates
- Call from admin portal

### Monitoring

**Firebase Console:**

- Firestore → Collection stats
- Authentication → User activity
- Storage → File stats

**Vercel Dashboard:**

- Deployments → See all builds
- Analytics → Traffic + performance
- Logs → Real-time request logs

---

## Troubleshooting

### "Demo data" badge shows even though Firebase is configured

- Verify `NEXT_PUBLIC_FIREBASE_*` env vars are set correctly
- Check browser DevTools → Network → no CORS errors
- Check Firebase Console → Firestore is enabled
- Verify Firestore rules allow `read: if true` for collections

### Collections are empty after seeding

- Verify `ADMIN_API_KEY` header matches environment variable
- Check Vercel function logs for errors
- Manually check Firestore Console → collections exist
- Retry seed with `"overwrite": true`

### Firestore permission denied errors

- Check Firestore security rules
- Ensure rules allow public READ and auth WRITE
- Deploy `firestore.rules` file

### Seed API returns 500 error

- Check Vercel logs: `vercel logs --prod`
- Verify Firebase admin SDK is initialized
- Ensure service account has Firestore write permissions

### Vercel build fails

```bash
# Test locally first
npm run build
npm run type-check
npm run lint

# Then push
git push origin main
```

---

## Checklist for Production Launch

- [ ] Firebase project created
- [ ] Firestore database in "Native mode"
- [ ] Firestore rules deployed
- [ ] GitHub repository updated with latest code
- [ ] Repository is public (for Vercel)
- [ ] Vercel project created and connected to GitHub
- [ ] Environment variables set in Vercel (all 8 required)
- [ ] Build succeeds: `vercel --prod`
- [ ] Portal renders at `/clients` route
- [ ] Firestore seeded with mock data
- [ ] Real-time updates working (edit in Firestore Console, see on portal)
- [ ] Admin API key is strong (32+ chars, stored securely)
- [ ] Firestore rules tightened for production
- [ ] Custom admin claims set up for future-proofing

---

## Architecture Overview

```
User Browser
    ↓
Vercel (Next.js + TypeScript)
    ├── /clients → <HouyezPortal /> renders 5 sections
    ├── /clients/tour → 3D tour player
    └── /api/houyez/seed → admin-only seed endpoint
         ↓
    React Hooks (useHouyezPortal)
         │ Subscribes via onSnapshot
         ↓
    Firebase (Client SDK)
    ├── Firestore Realtime subscriptions
    └── Auth (future: optional sign-in)
         ↓
    Google Cloud (Firestore)
    ├── houyez_slides collection
    ├── houyez_compounds collection
    ├── houyez_rooms collection
    ├── houyez_listings collection
    └── houyez_tours collection
```

---

## Next Steps

1. **Create Firebase Project** (if not already done)
2. **Copy real credentials to `.env.local`**
3. **Test locally** with `pnpm dev`
4. **Deploy to Vercel** and set env vars
5. **Seed Firestore** database
6. **Verify live data** on production portal
7. **Set up monitoring** and backups
8. **Plan admin UI** for future data management

---

## References

- [Firebase Console](https://console.firebase.google.com)
- [Next.js + Firebase Guide](https://firebase.google.com/docs/web/setup)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- Project repo: <https://github.com/ahmedfawzy8866/SE.git>
