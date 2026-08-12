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
- Aesthetic: quiet luxury · editorial serif · deep-navy-and-gold · bilingual EN/AR (RTL).
- Color: gold `#C8961A`/`#E9C176` primary accent; red `#E63946` secondary (hot/live, emblem glow);
  navy `#0B1A2E`/`#071422` dark surfaces; ivory `#F7F4EC` light surfaces.
- Type: Cormorant Garamond (display, medium/italic), Inter (UI), Cairo (Arabic), JetBrains Mono
  (prices, SBR codes, eyebrows, data).
- Motion: silk easing `cubic-bezier(.16,1,.3,1)`, durations 180/280/400/700ms, no bounce
  (exception: bottom-nav icon spring), reduced-motion respected.
- Logos: `assets/logo-gold.png` (on light), `assets/logo-red.png` (red neon shield, on dark).
- Tagline: "Future of Real Estate".

## Surfaces
- **Client portal** (`public/design/ui_kits/web-app/`, served at `/` via iframe host
  `app/ClientPage.tsx`): mobile-first responsive — hero, AI listings, live Leaflet map,
  360° tour, AI hub + 12 sheets, EN/AR + dark/light.
- **Admin Intelligence OS** (`app/admin/`): KPIs, pipeline, agent fleet, CRM.

## Constraints
- Kit is browser-Babel React 18 UMD inside an iframe (isolated from Next.js React 19 host).
- Design tokens in `public/design/tokens/*.css`; consumers link `public/design/styles.css`.
- All user strings exist in EN and AR; prices/SBR codes always mono.
