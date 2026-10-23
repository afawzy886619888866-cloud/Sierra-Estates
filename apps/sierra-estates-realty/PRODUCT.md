# PRODUCT.md — Sierra Estates

## What this is

Sierra Estates — an AI-driven luxury PropTech ("Intelligence OS") for the New Cairo, Egypt market.
Rent & resale across ~19 compounds (Mivida, Hyde Park, Mountain View, Madinaty, Eastown, Villette,
Taj City…), expanding to Madinaty, El Shorouk and Uptown Cairo. Buyers search a curated, AI-scored
inventory; brokers run the demand funnel from an admin "Intelligence OS". A concierge AI persona,
**Sierra**, threads through both.

## Users & scene

Affluent EN/AR-bilingual buyers and investors in Cairo, browsing on phones in the evening and on
desktop at work. Trust and quiet luxury matter more than density. Staff use a separate admin console.

## Register

**Brand** — design IS the product on the public portal (marketing + product hybrid). The admin
console is product register.

## Brand

> ⛔ **This section does NOT govern the client site.** The client site
> (`app/(site)/`, `components/site/`, `app/site-styles/`) takes design direction
> **only from the operator in the active conversation**. Do not apply the values
> below to it — they describe an earlier iframe-based kit that is no longer shipped.
> The live client design is defined by `app/site-styles/shared.css` plus the
> per-page stylesheets, ported from `deploy/*.html`.

Applies to the **admin console only**:

- Type: Inter (UI), Cairo (Arabic), JetBrains Mono (prices, SBR codes, data).
- Motion: silk easing `cubic-bezier(.16,1,.3,1)`, durations 180/280/400/700ms, no bounce,
  reduced-motion respected.
- Tagline: "Future of Real Estate".

## Surfaces

- **Client portal** (`app/(site)/`, styles in `app/site-styles/`): a native Next.js App Router
  site ported from `deploy/*.html`. Hero, AI listings, compounds, live 3D tour, AI hub,
  EN/AR + dark/light. No iframe.
- **Admin Intelligence OS** (`app/admin/`): KPIs, pipeline, agent fleet, CRM. The only surface
  using Tailwind (imported by `app/admin/admin-portal.css`).

## Constraints

- Kit is browser-Babel React 18 UMD inside an iframe (isolated from Next.js React 19 host).
- Design tokens in `public/design/tokens/*.css`; consumers link `public/design/styles.css`.
- All user strings exist in EN and AR; prices/SBR codes always mono.
