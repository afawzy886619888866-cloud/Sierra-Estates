# ═══════════════════════════════════════════════════════════════════════════

# Sierra Estates — Firebase Setup Guide (Step by Step)

# ═══════════════════════════════════════════════════════════════════════════

## Step 1: Create Firebase Project (2 minutes)

1. Go to <https://console.firebase.google.com>
2. Click "Add project"
3. Name it: `sierra-estates-prod`
4. Google Analytics: optional (can disable)
5. Click "Create project"
6. Wait 30 seconds for provisioning

## Step 2: Enable Firestore Database (1 minute)

1. In Firebase Console → left sidebar → "Build" → "Firestore Database"
2. Click "Create database"
3. Location: `eur3` (Europe) — closest to Egypt
4. Mode: "Production mode" (we have security rules ready)
5. Click "Enable"

## Step 3: Enable Authentication (1 minute)

1. Left sidebar → "Build" → "Authentication"
2. Click "Get started"
3. Enable "Email/Password"
4. Click "Save"

## Step 4: Register a Web App (get config keys) (2 minutes)

1. Firebase Console → Project Settings (gear icon top left)
2. Scroll to "Your apps" section
3. Click the web icon `</>`
4. App nickname: `Sierra Admin`
5. Click "Register app"
6. **COPY the config object** — it looks like:

   ```
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "sierra-estates-prod.firebaseapp.com",
     projectId: "sierra-estates-prod",
     storageBucket: "sierra-estates-prod.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890"
   };
   ```

7. **Paste these values into:**
   - `apps/admin/.env` (VITE_FIREBASE_* vars)
   - `apps/client/.env.local` (NEXT_PUBLIC_FIREBASE_* vars)

## Step 5: Deploy Firestore Security Rules (1 minute)

### Option A: Via Firebase CLI (recommended)

```bash
npm install -g firebase-tools
firebase login
firebase use --add  # select your project
firebase deploy --only firestore:rules
```

### Option B: Via Firebase Console

1. Firebase Console → Firestore → Rules tab
2. Paste contents of `apps/sierra-estates-realty/firestore.rules` (the canonical
   ruleset — the same file `firebase.json` deploys; do NOT use the per-app copy
   in `apps/admin/`, it is a legacy leftover from the standalone admin repo)
3. Click "Publish"

## Step 6: Download Service Account JSON (for n8n on EC2) (1 minute)

1. Firebase Console → Project Settings → "Service accounts" tab
2. Click "Generate new private key"
3. A `.json` file downloads — **keep this safe!**
4. This file goes on the EC2 instance at:
   `/opt/sierra-estates/infra/secrets/firebase-service-account.json`

## Step 7: Create Your Admin User (1 minute)

1. Firebase Console → Authentication → Users → "Add user"
2. Enter your email + password
3. Copy the **User UID** that appears
4. Go to Firestore → "Start collection" → `users`
5. Add a document with:
   - Document ID: paste the UID
   - Fields:
     - `email`: your email
     - `name`: "Ahmed"
     - `role`: "admin" (string)
     - `is_active`: true (boolean)

## Step 8: Seed the Database (optional — for demo data) (2 minutes)

```bash
# In the Firebase Console → Firestore
# Manually add a few listings, OR
# Use the seed script in apps/admin/src/seed.ts
```

## ═══════════════════════════════════════════════════════════════════════════

# QUICK REFERENCE: Where each credential goes

# ═══════════════════════════════════════════════════════════════════════════

| Credential | Where it goes | Format |
| ------------ | --------------- | -------- |
| Web config (apiKey, projectId, etc.) | `apps/admin/.env` + `apps/client/.env.local` + Vercel env vars | VITE_FIREBASE_*+ NEXT_PUBLIC_FIREBASE_* |
| Service account JSON | `infra/secrets/firebase-service-account.json` (on EC2) | Full .json file |
| User UID | Firestore `users/{uid}` document | String |
| Gemini API key | `infra/.env` (GEMINI_API_KEY) + n8n credentials | AIzaSy... string |

## ═══════════════════════════════════════════════════════════════════════════

# VERCEL ENVIRONMENT VARIABLES (for deployment)

# ═══════════════════════════════════════════════════════════════════════════

When deploying to Vercel, add these in the project settings:

### Admin SPA (apps/admin)

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=sierra-estates-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sierra-estates-prod
VITE_FIREBASE_STORAGE_BUCKET=sierra-estates-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_N8N_URL=http://YOUR-EC2-IP:5678
```

### Client Portal (apps/client)

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sierra-estates-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sierra-estates-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sierra-estates-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```
