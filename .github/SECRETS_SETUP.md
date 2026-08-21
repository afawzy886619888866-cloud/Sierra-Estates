# 🔐 GitHub Secrets Setup Guide — Sierra Estates

This file documents every secret required by the GitHub Actions workflows.
Go to: **GitHub → Your Repo → Settings → Secrets and variables → Actions → New repository secret**

---

## ✅ REQUIRED FOR BUILD TO PASS

These secrets are needed by both `ci.yml` and `deploy-vercel.yml`.

Without them the build will still pass (it uses `ci-placeholder` fallbacks),
but the live app will not connect to Firebase.

| Secret Name | Where to get it | Notes |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → Web App | Public key, safe to expose |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Console → Project Settings | e.g. `yourproject.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Console → Project Settings | e.g. `sierra-estates-12345` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Console → Project Settings | e.g. `yourproject.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Project Settings | Numeric ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Console → Project Settings | Starts with `1:` |

---

## 🚀 REQUIRED FOR VERCEL DEPLOY

| Secret Name | Where to get it | Notes |
| :--- | :--- | :--- |
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens → Create | Personal access token — keep private |

> The `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are already committed in
> `.vercel/project.json` (non-secret, safe to commit).

---

## 📊 REQUIRED FOR GOOGLE SHEETS / AUTOMATION WORKFLOWS

Only needed if you want the automated data sync workflows to run.

| Secret Name | Description |
| :--- | :--- |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Full JSON key from GCP → IAM → Service Accounts → Create Key |
| `BROKER_INBOX_SHEET_ID` | The Google Sheets ID from the URL (between `/d/` and `/edit`) |
| `FIREBASE_PROJECT_ID` | Same as `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK private key (from service account JSON) |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK client email |

---

## 📲 REQUIRED FOR WHATSAPP AUTOMATION

| Secret Name | Description |
| :--- | :--- |
| `WHATSAPP_API_TOKEN` | WhatsApp Business API Bearer token |
| `WHATSAPP_API_URL` | API base URL (e.g. `REDACTED_WHATSAPP_API_URL/YOUR_PHONE_ID`) |

---

## 📧 REQUIRED FOR EMAIL AUTOMATION

| Secret Name | Description |
| :--- | :--- |
| `SENDGRID_API_KEY` | SendGrid → Settings → API Keys → Create |
| `SENDGRID_FROM_EMAIL` | Verified sender email in SendGrid |

---

## 🔑 REQUIRED FOR PROPERTY FINDER SCRAPING

| Secret Name | Description |
| :--- | :--- |
| `PROPERTY_FINDER_JWT_TOKEN` | JWT from PropertyFinder API authentication |
| `PROPERTY_FINDER_API_BASE` | API base URL e.g. `https://api.propertyfinder.ae` |

---

## 🧠 REQUIRED FOR DEEPSEEK HARNESS EVALUATION

| Secret Name | Description |
| :--- | :--- |
| `DEEPSEEK_API_KEY` | DeepSeek API key for running automated reasoning & AVM harness evaluations in CI (`harness-eval.yml`) |

---

## How to add secrets

1. Go to your repo on GitHub
2. Click **Settings** (top tab)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**
5. Paste the name and value exactly as shown above

> 💡 **Tip**: If a workflow shows "skipped" in GitHub Actions (yellow circle),
> it means the required secrets for that job are missing — this is safe and
> by design. The workflow won't fail, it just won't run that job.
