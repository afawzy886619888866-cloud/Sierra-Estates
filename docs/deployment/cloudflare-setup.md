# Cloudflare Setup Guide — Sierra Estates

**Account:** `a.fawzy886619888866@gmail.com` (your GitHub email — sign in at
[dash.cloudflare.com](https://dash.cloudflare.com) with this email, or
"Continue with GitHub" if you signed up through GitHub).

This connects the account you just created to the deployment pipeline that
ships the client portal (`sierra-estates.net`) and the admin SPA
(`admin.sierra-estates.net`) as Cloudflare Workers. Vercel is fully retired —
`deploy-vercel.yml` and all Vercel configs were removed in the cleanup baseline.

---

## 1. Confirm the account

1. Go to <https://dash.cloudflare.com> and sign in with
   `a.fawzy886619888866@gmail.com` (or "Continue with GitHub").
2. If the account is brand new, confirm the verification email Cloudflare sent.
3. On the dashboard **Home** page, find **Account ID** in the right-hand
   sidebar — a 32-character hex string. Copy it; you will need it twice below.

## 2. Put your domains on this account

The Workers custom-domain feature requires the DNS zone to live in the same
Cloudflare account.

1. **Add zone:** Home → **Add a domain** → `sierra-estates.net` → Free plan.
2. Cloudflare scans your current DNS records; import them, then **update the
   nameservers at your registrar** to the two Cloudflare nameservers it shows.
   `admin.sierra-estates.net` needs no separate zone — it rides on the same one.
3. Wait for the zone to become **Active** (usually minutes to a few hours).

## 3. Create the deploy API token

1. Dashboard → top-right avatar → **My Profile** → **API Tokens** →
   **Create Token**.
2. Choose the **"Edit Cloudflare Workers"** template (this is the official
   template for Workers deployments — it grants Cloudflare Workers Scripts edit,
   account settings read, and Workers KV/Tail access, scoped to your account).
3. Under *Zone Resources*, leave it scoped to **All zones** (or specifically
   `sierra-estates.net`) — custom-domain attachment needs the zone scope.
4. **Continue to summary → Create Token → copy the value.** Cloudflare shows it
   only once.

## 4. Add the GitHub secrets

In `afawzy886619888866-cloud/Sierra-Estates` → **Settings → Secrets and
variables → Actions → New repository secret** (both under *Secrets*, not
variables):

| Name | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | the token from step 3 |
| `CLOUDFLARE_ACCOUNT_ID` | the Account ID from step 1 |

These are exactly the names `.github/workflows/deploy-cloudflare.yml` checks —
if either is missing, the deploy job **fails loudly on purpose** (never
silently skips).

## 5. First deploy

**Option A — let CI do it (recommended).** After the cleaned `main` is pushed,
the `Deploy Cloudflare` workflow runs automatically on every push to `main`
(the `changes` job only triggers builds when `apps/sierra-estates-realty/**`,
`packages/**`, or `apps/admin/**` actually changed — docs/data edits never
deploy). You can also trigger it manually: **Actions → Deploy Cloudflare →
Run workflow**.

**Option B — manual first deploy from `H:\Sierra Estates`** (useful to see
output live):

```powershell
cd 'H:\Sierra Estates'
corepack pnpm install
$env:CLOUDFLARE_API_TOKEN = "<token>"; $env:CLOUDFLARE_ACCOUNT_ID = "<account id>"
corepack pnpm --filter sierra-estates-client-page run build:cf    # next build + OpenNext
corepack pnpm --filter sierra-estates-client-page run deploy:cf   # uploads the Worker
npx wrangler@4 deploy --config apps/admin/wrangler.jsonc          # admin static Worker
```

(Alternative auth: `npx wrangler login` opens a browser — sign in with the
gmail account — then the env vars are optional for manual deploys.)

## 6. Attach the custom domains

After the first deploy creates the two Workers:

1. **Workers & Pages** → `sierra-estates-client` → **Settings → Domains &
   Routes** → **Add Custom Domain** → `sierra-estates.net` (repeat for
   `www.sierra-estates.net` if you want the www variant served too).
2. Same for `sierra-estates-admin` → `admin.sierra-estates.net`.
3. Cloudflare auto-creates the DNS records for each custom domain. Do **not**
   keep any old CNAME pointing at `*.vercel.app` — delete those records.

## 7. Runtime secrets for the client Worker

`NEXT_PUBLIC_*` values are build-time and already handled by CI. Server-side
secrets live in the Worker, set once per Worker from `H:\Sierra Estates`:

```powershell
npx wrangler secret put TELEGRAM_BOT_TOKEN --name sierra-estates-client
npx wrangler secret put CRON_SECRET --name sierra-estates-client
# ...continue for the remaining server keys listed in apps/sierra-estates-realty/.env.example
```

## 8. Validate the cron carry-over

The two dispatch windows from the old `vercel.json` are declared in
`apps/sierra-estates-realty/wrangler.jsonc`:

- morning `45 6 * * *`, night `45 2 * * *` (UTC)

Check **Workers → sierra-estates-client → Settings → Triggers (Cron
Triggers)** shows both. ⚠️ OpenNext's scheduled-handler wiring should be
validated on the first production run (after 06:45 UTC, confirm the morning
dispatch executed in Worker **Logs** and in Supabase). If it didn't fire, the
fallback is a free GitHub Actions cron calling `/api/cron/dispatch/morning`
with `CRON_SECRET` — decide after observing one cycle.

## 9. Retire Vercel completely

1. The Vercel account/projects were already canceled — no action needed there
   unless a project still exists; delete remaining projects to free names.
2. Remove any Vercel DNS records from the zone (see step 6).
3. Close PR #69 on GitHub — it revises `deploy-vercel.yml`, which no longer
   exists; its Vercel migration plan is obsolete.

---

**Checklist:** ☐ zone active · ☐ token created · ☐ GitHub secrets set · ☐
push approved · ☐ first deploy green · ☐ domains attached · ☐ worker secrets
set · ☐ cron observed once · ☐ Vercel DNS removed.
