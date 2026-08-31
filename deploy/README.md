# Sierra Estates — client site (static deploy)

Plain static files. No build step, no bundler, no environment variables.

```
deploy/
├── index.html            ← landing page + lead capture   (~200 KB)
├── add-listing.html      ← broker/owner listing form
├── shared.css  shared.js  data.standalone.js
├── firebase.js  firebase-config.js      ← live leads (fill in to enable)
├── supabase.js  supabase-config.js      ← optional Postgres alternative
├── logo-mark.png  logo-mark-96.png  logo-gold.png  logo-small.png
├── admin/                ← Intelligence OS (same origin, reads live leads)
│   ├── index.html  firebase.js  firebase-config.js  assets/
└── vercel.json           ← static, cleanUrls, no build
```

**Why files instead of one bundle:** the previous single inlined `index.html` was
4.7 MB because every hero photograph was base64'd into it. Served as files, the
HTML is ~200 KB, photos stream from the image CDN in parallel, and CSS/JS/logo
are cached across pages and visits. First paint is roughly an order of magnitude
sooner. The one-file build still exists at the project root
(`Sierra Estates Portal (Offline).html`) for offline/email hand-off.

## Loading screen

Navy field, the brand mark under a sweeping gold survey line, letterspaced
wordmark, and a rail that fills on real milestones (DOM ready → fonts ready →
`load`). It is a **cover, not a gate**: the page renders underneath, and a CSS
keyframe removes the overlay at 2.4 s regardless of what JavaScript does, so a
stalled image or a dead network can never trap a visitor behind a spinner.
Reduced-motion visitors get a static mark that fades at 0.8 s.

## How leads reach the admin

| Client action | Written to | Shows in admin |
| --- | --- | --- |
| **Request Now** → rent/resale, bedrooms, compounds, name + WhatsApp | `leads` (Firestore) + `sierra_leads` (localStorage) | **CRM · Leads**, newest first, `WEB` tag, WhatsApp reply pre-filled |
| **Add Listing** (new tab) → `/add-listing` | `listing_submissions` + `sierra_broker_listings` | **Listings Hub** → "Submitted listings · brokers & owners", Approve / WA |

Name and WhatsApp are required on both forms. Every submission gets a reference
(`SE-…` / `SL-…`) and a WhatsApp handoff carrying the full summary.

`firebase.js` is the single bridge both surfaces use (`window.SIERRA_LIVE`).
Writes **always** hit localStorage as well, so a dropped network never loses a
lead, and the admin works with no backend at all.

### Wiring Firebase (5 minutes)

1. Firebase console → project `sierra-blu-2026` → Project settings → Web app →
   copy the SDK config.
2. Paste it into **both** `firebase-config.js` files (root and `admin/`), set
   `SIERRA_FIREBASE_ENABLED = true`.
3. Firestore → Create database → production mode.
4. Rules → paste the block at the bottom of `firebase-config.js` → Publish.
   The public site may only *create* leads; reading requires a signed-in user.
5. Reload. The console logs `[Sierra] Firestore live: sierra-blu-2026`, and admin
   switches from polling localStorage to a real-time `onSnapshot` feed.

The Firebase SDK is fetched **only** when that flag is on — an unconfigured site
pays nothing for it. Same for Supabase, if you prefer Postgres: fill
`supabase-config.js`, run `schema.sql`, and leave Firebase off.

## Deploy to sierra-estates.net

**Option A — drag and drop**

1. <https://vercel.com/new> → bottom of the page → drop this `deploy` folder
2. Deploy (framework preset **Other**; leave build command and output empty)
3. Settings → Domains → add `sierra-estates.net` + `www.sierra-estates.net`
4. DNS: `A @ → 76.76.21.21`, `CNAME www → cname.vercel-dns.com`

Result: `/` client site, `/add-listing` broker form, `/admin` Intelligence OS.

**Option B — GitHub → Vercel (auto-deploy on push)**

`SE-Vercel-deploy` is a Next.js monorepo at its root, so these files must live in
a subfolder:

```bash
# from the repo root
mkdir -p static-portal
cp -R /path/to/deploy/* static-portal/
git add static-portal
git commit -m "Static client site: loader, new logo, lead capture, broker form, admin"
git push origin main
```

Then Vercel → New Project → import `SE-Vercel-deploy` → **Root Directory =
`static-portal`** → Deploy. That creates a second Vercel project beside the
Next.js one, sharing the repo, and every push redeploys it.

⚠️ `/admin` has **no login**. Put it behind Vercel Password Protection
(Settings → Deployment Protection) or delete `admin/` before the domain goes
public — with Firebase wired, staff read leads from Firestore instead.

## Regenerating

Edit the sources, then copy them over:

| output | source |
| --- | --- |
| `index.html` | `design_handoff_client_portal/design-reference/.min/index_standalone.html` |
| `add-listing.html` | `…/.min/add-listing.html` |
| `shared.*`, `data.standalone.js`, `firebase*.js`, `supabase*.js`, logos | `…/.min/` |
| `admin/**` | `ui_kits/admin-page/` |
