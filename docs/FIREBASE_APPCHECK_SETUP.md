# Firebase App Check Setup Guide — Sierra Estates

**Status:** Optional enhancement (recommended for production)  
**Created:** 2026-07-03  
**Purpose:** Prevent abuse of Firebase SDKs by restricting access to valid app instances

---

## Overview

Firebase App Check verifies that requests to your Firebase backend come from your legitimate app (web, iOS, Android) and not from a malicious third party or bot. It uses **reCAPTCHA v3** for web clients.

### Benefits

- **Prevents Abuse** — Bots and scrapers cannot bypass reCAPTCHA to hit your Firestore
- **DDoS Mitigation** — Real-time access filtering at the Firebase level
- **No User Impact** — reCAPTCHA v3 is invisible and doesn't disrupt legitimate traffic
- **Cost Savings** — Reduced invalid/malicious read/write charges

### Trade-offs

- Small overhead (~50ms per request for reCAPTCHA check)
- Requires initial setup and testing
- Relies on Google's reCAPTCHA v3 service (external dependency)

---

## Prerequisites

1. **Google Cloud Project** — sierra-blu (already exists)
2. **Billing Enabled** — Required for reCAPTCHA API
3. **Admin Access** — To Google Cloud Console and Firebase Console
4. **Deployed Site** — App Check requires a deployed domain (not `localhost`)

---

## Step 1: Create reCAPTCHA v3 Provider in Firebase

### 1.1 Enable App Check API

1. Go to **Google Cloud Console** → sierra-blu project
2. Go to **APIs & Services > Library**
3. Search for **"Firebase App Check API"**
4. Click **Enable**

### 1.2 Create reCAPTCHA Provider

1. Go to **Firebase Console** → sierra-blu project
2. Left sidebar: **Build > App Check**
3. Click **Create Provider** (or **Get Started**)
4. Select **reCAPTCHA v3**
5. Fill in:
   - **Display name:** "Sierra Estates Web" (or your app name)
   - **Domain names:** Add your production domains:

     ```
     sierra-estates.net
     admin.sierra-estates.net
     ```

   - Click **Create**

### 1.3 Save Credentials

After creation, Firebase shows:

- **Site Key** — Use in `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
- **Secret Key** — Store securely (not needed for web client, only for server verification if doing custom checks)

---

## Step 2: Configure Firestore Rules to Require App Check

### 2.1 Update `firestore.rules`

Open `firestore.rules` and add App Check validation to protected collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read of listings
    match /units/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.customClaims.role in ['admin'];
    }

    // Staff-only collections (with App Check)
    match /stakeholders/{document=**} {
      allow read, write: if request.auth != null 
        && request.auth.customClaims.role in ['admin', 'manager']
        && request.appCheck.token != null;
    }

    match /viewings/{document=**} {
      allow read, write: if request.auth != null 
        && request.appCheck.customClaims.role in ['admin', 'manager']
        && request.appCheck.token != null;
    }

    match /conciergeSelections/{document=**} {
      allow read, write: if request.auth != null 
        && request.auth.customClaims.role in ['admin', 'manager']
        && request.appCheck.token != null;
    }

    // Catch-all deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 2.2 Deploy Rules

```bash
pnpm deploy:rules
```

Verify deployment succeeded in **Firebase Console > Firestore > Rules**.

---

## Step 3: Configure Client SDK to Use App Check

### 3.1 Update `lib/firebase.ts`

Add App Check initialization after the Firebase app is initialized:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// ... existing Firebase config ...

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

// Initialize App Check
export const appCheck = initializeAppCheck(firebaseApp, {
  provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
  isTokenAutoRefreshEnabled: true,
});

export default firebaseApp;
```

### 3.2 Add Logging (Optional)

To debug App Check token generation:

```typescript
import { onTokenChanged } from 'firebase/app-check';

onTokenChanged(appCheck, (token) => {
  if (token?.token) {
    console.debug('[App Check] Token refreshed');
  } else {
    console.debug('[App Check] Token unavailable');
  }
});
```

---

## Step 4: Update Environment Variables

### 4.1 `.env.example`

Ensure this line exists (it likely does already):

```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
```

Add a note in the file:

```
# ─── reCAPTCHA (App Check) ───
# Get the site key from Firebase Console > App Check > reCAPTCHA v3 provider
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
```

### 4.2 `.env.local` (Local Development)

If testing App Check locally, you need a reCAPTCHA Site Key for testing. In development:

```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<your-test-site-key>
```

Alternatively, **disable App Check in development** to speed up testing:

```typescript
// In lib/firebase.ts, conditionally initialize:
if (process.env.NODE_ENV === 'production') {
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
    isTokenAutoRefreshEnabled: true,
  });
}
```

### 4.3 Vercel Deployment

1. Go to **Vercel Dashboard > Project Settings > Environment Variables**
2. Add:
   - Name: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - Value: `<your-site-key-from-firebase>`
   - Environments: **Production, Preview, Development**
3. Click **Save**
4. Re-deploy the application

---

## Step 5: Configure App Check Enforcement Level

### Option A: Enforce from Day 1 (Recommended for New Apps)

If you're deploying fresh, enforce App Check immediately:

1. Go to **Firebase Console > App Check**
2. Click on your reCAPTCHA v3 provider
3. Set **Enforcement Level** to **Enforce**
4. Click **Enforce**

**Result:** Requests without a valid App Check token are rejected by Firestore.

### Option B: Gradual Rollout (Recommended for Existing Apps)

If you have production traffic already:

1. Set **Enforcement Level** to **Unenforced** first
2. Deploy the app with App Check initialized
3. Monitor logs for ~24 hours (Unenforced mode logs warnings)
4. Once confident, change to **Enforce**

To monitor unenforced violations:

- Go to **Firebase Console > Logs > App Check**
- Filter for "App Check token missing" or "App Check token invalid"
- Verify all violations are from bots/scrapers, not legitimate users

---

## Step 6: Test App Check

### 6.1 Test on Production Domain

1. Deploy your app with the updated `lib/firebase.ts`
2. Visit **<https://sierra-estates.net>** (or your domain)
3. Open browser DevTools (F12) → **Console**
4. Look for:

   ```
   [App Check] Token refreshed
   ```

5. Try reading from Firestore (e.g., load listings):

   ```javascript
   // In console:
   const { getDocs, collection } = await import('firebase/firestore');
   const { db } = await import('/lib/firebase.ts');
   const units = await getDocs(collection(db, 'units'));
   console.log(units.size);
   ```

   Should succeed with a valid App Check token.

### 6.2 Test Rejection (Unenforced Mode)

To simulate a request without App Check, use `curl`:

```bash
curl -X POST "https://firestore.googleapis.com/v1/projects/sierra-blu/databases/(default)/documents/units" \
  -H "Authorization: Bearer INVALID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fields":{}}'
```

In Unenforced mode:

- Request succeeds but is logged
- In Enforced mode: Request fails with 403 Unauthorized

---

## Step 7: Monitor & Maintain

### 7.1 Monitor Token Validity

In production, track App Check token generation:

```typescript
// Add to lib/firebase.ts or error handlers
onTokenChanged(appCheck, (token) => {
  if (!token?.token) {
    console.error('[App Check] Unable to obtain token');
    // Maybe: send alert to admin
  }
});
```

### 7.2 Review Logs

**Firebase Console > Logs > App Check:**

- View token generation failures
- Monitor rejection rate (should be near 0% for legitimate users)
- If many rejections appear, check if old app versions are still in use

### 7.3 Rotate reCAPTCHA Key (Annual)

1. Create a new reCAPTCHA provider in **Firebase Console > App Check**
2. Update `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in Vercel
3. Deploy
4. After 1 week, delete the old provider

---

## Troubleshooting

### Issue: "App Check token missing or invalid"

**Symptoms:** Firestore reads/writes fail with 403, even from the legitimate app.

**Solutions:**

1. Verify `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set in environment
2. Check that `lib/firebase.ts` has `initializeAppCheck` called
3. Verify the Site Key matches the reCAPTCHA provider in Firebase Console
4. Check browser console for App Check errors
5. If using Service Account SDK (Admin), disable App Check requirement for admin operations:

   ```javascript
   // Firestore rules: allow admin SDK to bypass
   allow read, write: if request.auth?.customClaims.isServiceAccount == true;
   ```

### Issue: "reCAPTCHA v3 initialization failed"

**Symptoms:** Console error: `"reCAPTCHA initialization failed"`

**Solutions:**

1. Verify domain is registered in Google Cloud reCAPTCHA settings
2. Check browser console for CORS errors (reCAPTCHA script load failed)
3. Verify `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is not empty
4. Clear browser cache and reload

### Issue: "App Check token generation is slow"

**Symptoms:** Firestore operations are slower than before.

**Solutions:**

1. Token is cached (~1 hour), so overhead is only on first request and after expiry
2. Use Unenforced mode to diagnose if reCAPTCHA is the bottleneck
3. Consider disabling App Check in development (see Section 4.2)

### Issue: "Old app versions fail after enforcing App Check"

**Symptoms:** Users with old app versions (cached, not updated) see 403 errors.

**Solutions:**

1. Use Unenforced mode during rollout to allow migration time
2. In the app, add a banner: "Please refresh the page or clear your browser cache"
3. Wait 2-4 weeks before moving to Enforced mode
4. Monitor rejection logs for old clients

---

## Optional: Enforce App Check on Cloud Functions

If you're using Cloud Functions (in the `functions/` folder), you can also protect them:

```typescript
// functions/src/index.ts
import { verifyAppCheck } from 'firebase-functions/https';

export const myFunction = https.onRequest(
  verifyAppCheck(),
  async (req, res) => {
    // Only requests with valid App Check token reach here
    res.json({ success: true });
  }
);
```

---

## Deployment Checklist

- [ ] reCAPTCHA v3 provider created in Firebase Console
- [ ] Site Key saved in `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
- [ ] `lib/firebase.ts` updated with `initializeAppCheck()`
- [ ] `firestore.rules` updated to validate `request.appCheck.token`
- [ ] Firestore rules deployed: `pnpm deploy:rules`
- [ ] Env var added to Vercel
- [ ] App deployed to production
- [ ] Tested on production domain (App Check token generation succeeds)
- [ ] Unenforced mode enabled for 24 hours
- [ ] Logs reviewed for rejections
- [ ] Enforcement enabled

---

## References

- **Firebase App Check Docs:** <https://firebase.google.com/docs/app-check>
- **reCAPTCHA v3 Docs:** <https://developers.google.com/recaptcha/docs/v3>
- **Firestore Security Rules with App Check:** <https://firebase.google.com/docs/app-check/firestore-rules>
- **Admin SDK (bypass App Check):** <https://firebase.google.com/docs/firestore/access-security>

---

## Support

If you encounter issues:

1. Check Firebase Console > App Check > Logs
2. Check Vercel logs for token generation errors
3. Contact security team or escalate to <a.fawzy8866@gmail.com>
