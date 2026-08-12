---
description: How to develop, test, and deploy the Sierra Estates Realty platform
---

# Sierra Estates Platform Workflow

## Project Overview
- **Location**: `c:\OpenClaw\my-app`
- **Stack**: Next.js 16, React 19, TypeScript, Firebase 12 (Auth + Firestore + Hosting + Storage), Framer Motion, Tailwind CSS v4
- **Brand Mandate**: Always use "Investment Stakeholders" (not leads), "Strategic Pipeline" (not CRM), "Portfolio Assets" (not listings), in all UI + code comments
- **Aesthetic**: Cinematic Luxury — Navy `#0A1A3A`, Gold `#C9A24A`, Silver `#E2E8F0`, glassmorphism, micro-animations
- **Admin UID**: `dbqHmlScyOV8KVZD5cbfnnD4YIX2` (has `admin` custom claim + Firestore `users/<UID>` doc with `{role:'admin'}`)

---

## Architecture Map

```
app/
  layout.tsx          ← Providers: AuthContext, I18nContext
  page.tsx            ← Root SPA orchestrator (screen router)
  globals.css         ← All design tokens, glassmorphism, animations
  landing/            ← Public landing page
  api/
    openclaw/         ← Gemini 2.5 Flash AI insights endpoint
    leads/            ← Lead CRUD API
    property-finder/  ← Property Finder feed ingest
    sync/             ← PF ↔ Firestore sync trigger
    telegram/
      setup/          ← Register Telegram webhook
      webhook/        ← Telegram bot message handler

components/
  Auth/               ← LoginScreen
  UI/                 ← Topbar, Sidebar, BrandLogo, LanguageToggle
  Dashboard/          ← DashboardScreen, KPIGrid, ActivityList, AIPanel, ReportsScreen, TeamScreen, AdvisorProfile
  CRM/                ← CRMKanban, LeadsFlow, ClientsScreen
  Listings/           ← ListingsHub
  Operations/         ← EasyListing, ActionProtocols, SiteExperiences, CommissionLedger, VoucherSystem
  Admin/              ← DedupeReviewQueue, MediaHub

lib/
  AuthContext.tsx     ← Firebase Auth session (30-min inactivity timeout + guest mode)
  I18nContext.tsx     ← AR/EN locale switching
  firebase.ts         ← Firebase client SDK init
  financial-engine.ts ← ROI, GrossYield, CommissionCalculator
  property-finder-client.ts ← PF API wrapper
  models/             ← TypeScript data models
  services/
    firestore-service.ts    ← CRUD helpers for all collections
    PropertyFinderService.ts← PF listing normalizer
    sync-engine.ts          ← PF↔Firestore fuzzy-match + dedup logic
  audit.ts            ← Audit log writer
  config.ts           ← Centralised env/config constants
  telegram.ts         ← Telegram Bot API helper
  i18n.ts             ← next-intl setup

messages/
  en.json             ← English i18n strings
  ar.json             ← Arabic i18n strings

firebase.json         ← Hosting (frameworksBackend us-central1), Firestore rules, Storage rules
firestore.rules       ← Security rules
storage.rules         ← Storage security rules
```

---

## Firestore Collections
| Collection    | Purpose                                |
|---------------|----------------------------------------|
| `listings`    | Portfolio Assets (properties)          |
| `leads`       | Investment Stakeholders                |
| `sales`       | Closed transactions                    |
| `activities`  | Audit trail / activity feed            |
| `users`       | User profiles + role claims            |
| `vouchers`    | Stage 7 incentive vouchers             |

---

## 1. Start Local Dev Server

```bash
cd c:\OpenClaw\my-app
npm run dev
```

Open: http://localhost:3000

---

## 2. Lint & Type Check

```bash
cd c:\OpenClaw\my-app
npm run lint
npx tsc --noEmit
```

Both must exit with code 0 before deploying.

---

## 3. Production Build (Verify)

```bash
cd c:\OpenClaw\my-app
npm run build
```

Expect: `✓ Compiled successfully` and `✓ Finished TypeScript`

---

## 4. Deploy to Firebase Hosting

```bash
cd c:\OpenClaw\my-app
npx firebase-tools deploy --only hosting
```

To also deploy Firestore/Storage rule changes:

```bash
npx firebase-tools deploy --only firestore:rules,storage:rules
```

Full deploy:

```bash
npx firebase-tools deploy
```

---

## 5. Register / Refresh Telegram Webhook

After deploying, hit the setup endpoint once to register the bot webhook:

```
POST https://<your-firebase-hosting-url>/api/telegram/setup
```

Or via curl:

```bash
curl -X POST https://<hosting-url>/api/telegram/setup
```

Bot token is stored in `.env.local` as `TELEGRAM_BOT_TOKEN`.

---

## 6. Seed / Sync Property Finder Data

Trigger a PF sync via the API:

```bash
curl -X POST http://localhost:3000/api/sync
```

Review fuzzy-matched dedup candidates at:
`app → Admin → Sync Review Queue` (screen: `sync`)

---

## 7. AI Insights (OpenClaw)

The `AIPanel` auto-calls `/api/openclaw` on dashboard load.
To test manually:

```bash
curl http://localhost:3000/api/openclaw
```

Model: `gemini-2.5-flash`. Returns structured JSON `{ opportunities, warnings, tips }`.

---

## 8. Adding a New Screen

1. Create component in relevant `components/<Category>/MyScreen.tsx`
2. Add screen ID to the `Screen` type union in `app/page.tsx`
3. Add nav entry to `components/UI/Sidebar.tsx`
4. Wire it in `app/page.tsx`: `{activeScreen === 'myscreen' && <MyScreen />}`
5. Add i18n strings to `messages/en.json` and `messages/ar.json`

---

## 9. Environment Variables (`.env.local`)

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sierra-estates
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
GOOGLE_GENAI_API_KEY=         ← OpenClaw AI
PROPERTY_FINDER_API_KEY=      ← Property Finder feed
TELEGRAM_BOT_TOKEN=8719045454:AAH4E11VUdXiK_HldPX2ZSllSFPgntamC0I
```

---

## 10. Key Coding Rules

- **No explicit `any`** except where ESLint is suppressed with a comment (rare)
- **Bilingual**: All user-facing strings go through `messages/` — never hardcode EN/AR text
- **RTL**: Use `dir` and `textAlign` based on locale from `I18nContext`
- **CSS**: All styles in `app/globals.css` using CSS custom properties — no inline styles except dynamic values (mouse parallax)
- **Firebase Admin SDK**: Only used server-side in `app/api/**` routes — never imported in client components
- **Semantic screens**: Use window-exposed `setActiveScreen()` for cross-component navigation when prop drilling is not feasible

---

## 11. Git Workflow

```bash
# Stage only source files (never node_modules, .next, .firebase cache)
git add my-app/app my-app/components my-app/lib my-app/messages my-app/public
git add my-app/package.json my-app/next.config.ts my-app/firebase.json my-app/firestore.rules my-app/storage.rules
git commit -m "feat: <description>"
git push
```

`.next/`, `node_modules/`, `*.tsbuildinfo`, `.firebase/*.cache` are all excluded per `.gitignore`.
