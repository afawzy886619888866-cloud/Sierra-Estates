# Vercel Environment Variables — Setup Checklist

**Project:** sierra-estates-realty  
**Vercel Project ID:** `[REDACTED — rotate this Vercel token]`

---

## **How to Add These Variables to Vercel**

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add each variable below with the **Value** from your `.env.local`
3. Select **Production**, **Preview**, and **Development** where indicated
4. Click **Save**

---

## **Required Variables**

### Firebase (Public — Safe to Commit)

```
NEXT_PUBLIC_FIREBASE_PROJECT_ID = sierra-blu
NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSyBZLN2jTTKV34SneGPoWRz1zoRpX5uODjs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = sierra-blu.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL = https://sierra-blu.firebaseio.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = sierra-blu.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 941030513456
NEXT_PUBLIC_FIREBASE_APP_ID = 1:941030513456:web:56209a1495d69f217086f5
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = G-ZP054BPJ8Q
```

### Firebase Admin (Secret — Production Only)

**⚠️ DO NOT COMMIT** — Copy from your local `.env.local`

```
FIREBASE_SERVICE_ACCOUNT_JSON = [paste your service account JSON here]
```

**Steps:**
1. Get your service account key from [Firebase Console](https://console.firebase.google.com)
2. Download as JSON
3. Paste entire JSON as the value (single line)
4. Set environment: **Production** only

### Security Secret (Production Only)

```
SBR_SECRET_KEY = [generate a random 32-char secret for cron/webhooks]
```

**Generate:** `openssl rand -hex 16`

---

## **GitHub Secrets** (for Actions workflow)

Add these to GitHub → Your Repo → Settings → Secrets and Variables → Actions

```
VERCEL_ORG_ID = [your org ID from Vercel]
VERCEL_PROJECT_ID = [REDACTED — rotate this Vercel token]
VERCEL_TOKEN = [create at vercel.com/account/tokens]
FIREBASE_TOKEN = [create via: firebase login:ci]
```

---

## **Verification Checklist**

- [ ] All Firebase public variables added to Vercel (Production)
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` added (Production only)
- [ ] `SBR_SECRET_KEY` generated and added (Production only)
- [ ] All GitHub secrets added
- [ ] Deploy workflow runs successfully on next push to `main`
- [ ] Firestore rules deployed (check Firebase Console)

---

## **Post-Deployment**

Once deployed, test:

```bash
# Test admin auth endpoint
curl -X POST https://sierra-estates.net/api/admin/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_FIREBASE_TOKEN"}'

# Should return 200 with user role, or 401 with error
```

---

**Questions?** Check `.env.local.example` for all available variables.
