# ORDER FOR ANTIGRAVITY — Sierra Estates: New Cairo Masterplan Map (Stitch Redesign)

> Paste everything below this line into Google Antigravity as a single task.
> ALSO attach/upload the original Stitch export zip
> (`stitch_new_cairo_real_estate_map.zip` — contains `code.html`, `screen.png`,
> `DESIGN.md`) so the agent has the pixel-accurate reference; this order
> embeds every essential excerpt, so the zip is a bonus, not a requirement.
> Do NOT paste secrets into the chat.
> (Written 2026-10-14. This replaces the live map UI with the approved Stitch
> design "New Cairo Real Estate Map" while preserving ALL live-data plumbing.)

---

## MISSION

Replace the map experience on **https://sierra-estates.net/properties** with
the approved Stitch design ("Sierra Estates — Enterprise GIS Masterplan",
New Cairo Real Estate Map). The design reference is the uploaded zip
(`code.html` = full working HTML/Tailwind/JS prototype, `screen.png` =
1920×2589 pixel reference, `DESIGN.md` = design system).

**Prime directive**: change ONLY the presentation layer. The live-data layer
that feeds the current map — `/api/inventory` (4,322 live pins, source
supabase), publish gate, filters, search, listing selection — must keep
working end-to-end. A user must still be able to: see real compound markers,
click one, see that compound's REAL units with REAL prices, and reach the
property detail page.

## §21 NO-FABRICATION RULE (project law — applies to every number on screen)

The Stitch prototype contains placeholder numbers (11,017 Synced Units,
9,534 Active, "From 17.8M EGP", Benchmark Index 85,000 EGP/m², Portfolio
Parity 17.78B EGP). **None of these may ship as static text.** Every number
must be computed from live `/api/inventory` data at render time, or the
element is OMITTED entirely. Missing data shows nothing — never an invented
value. (Exception: purely static brand copy with no data claim.)

---

## DESIGN SYSTEM (from DESIGN.md + code.html — "Alexandria: High-End Editorial")

Material-3-style token set. Wire these into the app's Tailwind theme
(extend, do not replace global tokens if that risks other pages — scope to
the map page via CSS variables or a local class wrapper if needed).

```js
colors: {
  primary: "#094cb2",            // links, active states, primary actions ONLY
  "primary-container": "#3366cc",
  "on-primary": "#ffffff",
  "on-primary-container": "#e7ebff",
  "primary-fixed": "#d9e2ff",
  "on-primary-fixed": "#001946",
  tertiary: "#6d5e00",           // archival gold — badges, eyebrow labels
  "tertiary-container": "#bfab49",
  "tertiary-fixed": "#f9e37a",
  "on-tertiary-fixed": "#211b00",
  "on-tertiary-container": "#4a3f00",
  surface: "#faf9fa",
  "surface-container-lowest": "#ffffff",
  "surface-container-low": "#f5f3f4",
  "surface-container": "#efedee",
  "surface-container-high": "#e9e8e9",
  "surface-container-highest": "#e3e2e3",
  "on-surface": "#1b1c1d",
  "on-surface-variant": "#434653",
  outline: "#737784",
  "outline-variant": "#c3c6d5",
}
fontFamily: {
  headline: ["Noto Serif"],      // page titles, compound names, unit titles
  body: ["Inter"],               // dense UI text
  label: ["Public Sans"],        // uppercase metadata/eyebrow labels
}
borderRadius: { DEFAULT: "0.125rem", lg: "0.25rem", xl: "0.5rem", full: "0.75rem" }
```

**Design laws** (from DESIGN.md): No 1px borders — boundaries via surface-tier
background shifts only (ghost border = outline-variant at 15% opacity when
unavoidable). Elevation via tonal layering, not shadows (soft diffuse shadows
only on floating map elements: markers, tooltips, HUDs). Glassmorphism for
floating menus (80% opacity + 20px backdrop-blur). Minimum `sm` roundness.
One primary action per view. Google Fonts import for Noto Serif / Inter /
Public Sans + Material Symbols Outlined icons.

## PAGE STRUCTURE (top to bottom)

### 1. Fixed header (h-20, glass: bg-surface/80 + backdrop-blur-xl)
- Left: "SIERRA ESTATES" (Noto Serif, tracking 0.2em) over eyebrow
  "ENTERPRISE GIS MASTERPLAN" (Public Sans, tertiary gold, tracking 0.16em).
- Stats pill (xl+ only, bg-surface-container-low, rounded-full):
  ● primary dot + `<strong>{N}</strong> Synced Units` / ● tertiary-container
  dot + `<strong>{M}</strong> Active` — N and M from /api/inventory
  (see WIRING).
- Nav (bg-surface-container-lowest p-1 rounded-lg): active tab
  "SPATIAL MASTERPLAN" = bg-primary-container text-on-primary-container;
  others map to REAL existing routes (see WIRING) — do not invent routes.
- Right: EGP/USD currency toggle (see WIRING — only if exchange package is
  live), light/dark toggle wired to the app's existing theme system, avatar
  wired to existing Sign In.

### 2. Command ribbon (bg-surface-container-low, py-5)
- Left: pulse dot + eyebrow "SPATIAL CADASTRAL CARTOGRAPHY" (tertiary);
  H1 "New Cairo Master Properties & Live Map" in Noto Serif (keep the REAL
  current page H1 text for SEO continuity — the Stitch "Fifth Settlement
  Masterplan Intelligence" is placeholder copy); badge "CRS: EPSG 32636 /
  WGS84" (static, harmless technical label).
- Right: telemetry card trio (bg-surface-container-lowest, px-4 py-2,
  rounded-lg, shadow-sm, 1px vertical dividers bg-surface-container-highest):
  BENCHMARK INDEX / ACTIVE INVENTORY / PORTFOLIO PARITY — all computed live
  (see WIRING; omit any card whose value is not computable).
- View switcher: "Orthographic 2D" / "Isometric 3D (45°)" (active =
  bg-primary text-on-primary) + reset-viewport icon button
  (material-symbols `restart_alt`) — wired to the map engine's pitch (0 ↔ 45).

### 3. Map canvas (left, xl:col-span-8/12) — THE MAP ITSELF
- Container: rounded-xl, shadow-md, min-h 620-720px, inner stage rounded-lg.
- **Map engine**: KEEP the existing engine the app already uses on
  /properties (it renders 4,322 pins + compound clustering today). Restyle
  its chrome; do not swap Leaflet/MapLibre for the prototype's static-image
  CSS trick — that image is a hotlinked ephemeral Google CDN asset
  (`lh3.googleusercontent.com/aida-public/…`) and its hardcoded %-positioned
  hotspots cannot represent live data. Instead:
  - Base style: satellite/aerial basemap, muted with the design's
    `bg-gradient-to-tr from-primary/10 via-transparent to-tertiary/10` wash
    overlay (pointer-events-none).
  - 2D/3D: pitch 0 ↔ 45 + slight bearing, matching the prototype's
    `perspective(1200px) rotateX(24deg) rotateZ(-3deg) scale(0.96)` feel.
  - Zoom stack (bottom-right): `+` / `−` round buttons + `tilt-toggle-btn`
    (material-symbols `3d_rotation`), styled surface-container-lowest /
    shadow-sm.
  - Coordinates HUD (bottom-left, font-label text-xs): live cursor-center
    lat/lng (e.g. `Lat: 30.0131° N, Lon: 31.4989° E`) + `Elevation: 320m ASL`
    may be omitted if no elevation source — lat/lng alone is fine.
- **Markers — THE KEY RESTYLE** (replicate the prototype's hotspot marker as
  a custom HTML marker on the real engine):
  ```html
  <div class="group/marker cursor-pointer">
    <span class="absolute w-12 h-12 rounded-full bg-tertiary-fixed-dim/30 animate-ping"></span>
    <span class="absolute w-8 h-8 rounded-full bg-primary/20 backdrop-blur-sm"></span>
    <div class="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center
                justify-center shadow-lg transition-transform
                group-hover/marker:scale-125">
      <span class="material-symbols-outlined text-[14px]">apartment</span>
    </div>
    <!-- Floating card tooltip (absolute -top-24 -left-20, w-52,
         bg-surface-container-lowest/95 backdrop-blur-xl p-3 rounded-lg
         shadow-xl opacity-90 → 100 on hover) -->
  </div>
  ```
  Tooltip card content (ALL live values): eyebrow = compound zone/area
  (tertiary gold); count badge = `{n} Available` (bg-primary-fixed
  text-on-primary-fixed) from live compoundCounts; name = Noto Serif
  semibold; price line = `From {min} EGP` ONLY if that compound has ≥1 priced
  sale listing (else omit the line); "Inspect →" link selects the compound
  and opens the drawer. Marker icon varies by dominant property type
  (apartment/villa/`home_work`), marker color primary; the featured/selected
  compound may use tertiary fill (as the Mivida marker does in the prototype).
- **Corridor filter floater** (absolute top-6 left-6, z-30,
  bg-surface-container-lowest/90 + backdrop-blur-md, p-2 rounded-lg):
  eyebrow "CORRIDORS:" (tertiary) + pills. Replace the prototype's four
  hardcoded corridor names with the app's EXISTING filter dimensions from
  the current /properties toolbar (Buy/Rent/All + compound select + price
  bands), restyled as pills (active = bg-surface-container text-primary
  font-semibold). Keep every existing filter's behavior — this is a restyle,
  not a feature change. If the corridor concept (North 90th St / Ring Road
  / Suez / Golden Square) is desired as an ADDITIONAL filter, implement it
  as a client-side zone mapping only if compound→corridor mapping data
  exists in the repo; otherwise DROP the corridor concept entirely (§21).

### 4. Right drawer — Compound Intelligence (xl:col-span-4/12)
Replaces the current listing drawer. Wire it to the compound the user
selects (marker click / tooltip Inspect / corridor pill):
- Identity card: eyebrow zone badge (`id=drawer-subzone`), title
  (`drawer-title`, Noto Serif xl), description (`drawer-desc`) — description
  from live data only: use the compound's real description from
  /api/compounds if present; else render the compound's live stats as
  neutral copy ("483 verified units across villas, townhouses and
  apartments…"); NEVER the prototype's invented marketing prose
  ("Preeminent 301-acre master community…").
- Micro-metrics row (3-up, bg-surface-container-low p-3 rounded-lg):
  Area / Listed Units / Price Index — units = live count; price index = mean
  price-per-sqm of that compound's priced listings with area_sqm>0; area
  acres only if known data exists, else omit that metric.
- Typology tabs: All / Villas / Twins / Penthouse in the prototype → derive
  the REAL set from `propertyType` values present in that compound's live
  units (e.g. Villa / Townhouse / Apartment / Twin House / Penthouse);
  active = primary underline; filter the feed client-side
  (`data-type` + display toggle, as the prototype's `filterUnits()` does).
- Units feed (`id=units-feed`): the compound's LIVE listings as horizontal
  cards — image left ~40% (rounded-lg overflow-hidden h-32; top-left status
  tag: Available (primary) / Immediate Delivery (tertiary-container) from
  real availability; top-right area badge `{area} m²`; real `img` URL or
  the app's existing image placeholder treatment when img is empty);
  right side: title (Noto Serif semibold), specs row
  `{beds} Bedrooms • {baths} Bathrooms` (+ finishing if present),
  price (font-semibold, `priceLabel`/EGP formatted as the current site
  does), and "Details →" linking to `/property/{id}` (keep the REAL detail
  navigation — the prototype's "Details & 360°" opens a demo modal; wire it
  to the real detail page instead, optionally keeping the modal only if the
  current site already has one).
- Feed footer: full-width bg-surface-container-low button "Request Private
  Dossier via WhatsApp" with WhatsApp icon →
  `https://wa.me/201092048333?text=…{compound}…` (real number, prefilled
  with the selected compound/unit — same pattern the site already uses).

### 5. Bottom section — "Verified Registry Architecture"
4-card feature grid (bg-surface-container-lowest cards, icon square
primary/tertiary/secondary, title Noto Serif, desc, footer link). This is
static brand copy — acceptable, with two accuracy fixes: "Pass Rate: 100%"
may stay ONLY if phrased as the repo's real CI state ("1,524/1,524 at
go-live"), and the OpenWA concierge card must carry the real helpline
(+2 01092048333). Keep the footer credit line, replacing the prototype's
deployment string with the real repo path
(`sierrablue8866-droid/SE-Vercel-deploy-main`).

---

## WIRING TABLE — every placeholder → live source

| Prototype value | Live source | Rule |
|---|---|---|
| 11,017 Synced Units | `/api/inventory` → `count` (4,322 today) | render real |
| 9,534 Active | `segments.total` or DB active count exposed by an existing public endpoint; if none, use `count` | render real or omit |
| Benchmark Index 85,000 EGP/m² | mean(price ÷ area_sqm) over priced units with area>0 | compute or omit card |
| Portfolio Parity 17.78B EGP | sum of sale-mode unit prices | compute or omit card |
| Hotspot counts (18/24/15/31) | `compoundCounts` (Mivida 505, Eastown 304, Hyde Park 276, Al Rehab 218, Madinaty 176, MV iCity 104, CFC 87, Villette 166, Katameya Dunes 10 / Heights 30, Uptown 41… — counts drift daily, read live) | render real |
| "From 17.8M/16.2M EGP" | min price among that compound's sale units | omit line if none |
| AUC hotspot | AUC has ZERO live listings | drop the marker (§21) or keep marker without count badge |
| Unit cards (Villa Signature A etc.) | real units of selected compound | real data only |
| ≈ $580,000 USD subtext | `packages/exchange` if already wired to a live FX source | omit if not wired |
| Typology tabs | distinct real `propertyType` values | derive |
| Nav: Inventory Catalog / 3D Flythrough / Valuation AI / GitHub | existing routes: `/` (home/inventory), `/explore`, `/roi` (or `/price-index`), external repo URL | real routes only |
| Coordinates HUD | map center from the engine | live |
| Background aerial image | real map tiles via existing engine | NEVER hotlink the Google aida-public URL |

If `count=0` or `source!="supabase"`: keep the current graceful empty state
behavior — never render the design populated with demo data.

## NON-NEGOTIABLE GUARDRAILS

1. §21: no invented numbers anywhere (see wiring table).
2. Do NOT touch: `/api/inventory`, publish gate, RLS, any API route, the
   enrichment scripts, the smoke test. Presentation layer only.
3. Do NOT bulk-change publish_status or any DB data.
4. Keep existing routes/URLs working — the redesign lives at `/properties`
   (same URL, same sitemap entry). `/explore` (3D Explorer) stays as-is.
5. Keep the existing search box behavior (unit code / compound / area
   search) — restyle it into the ribbon or map floater, but the feature
   must survive.
6. Accessibility: markers are buttons (keyboard focusable), tooltips
   reachable via focus, contrast preserved (on-surface on surface tiers).
7. Mobile: prototype is desktop-first (xl breakpoints). Ship a sane
   stacked layout (map above drawer, corridor pills horizontally
   scrollable) — match the current site's mobile behavior.
8. Images: only real `img` URLs from live data; keep the app's existing
   lazy-loading + placeholder treatment for empty images.

## VERIFICATION CHECKLIST (run at the end; all must pass)

1. `pnpm --filter sierra-estates-client-page build` → exit 0 (use
   NODE_OPTIONS heap cap ~2800MB if the sandbox/build OOMs).
2. Existing test suites still green, especially:
   `__tests__/client-page-contracts.test.ts`,
   `__tests__/map-filters-sync.test.ts`, `__tests__/map-and-compounds.test.ts`,
   `__tests__/design-system-and-claymorphism.test.ts`,
   `__tests__/design-and-ui-tokens.test.ts` — update the page-contract
   snapshots for the new markup, but the CONTRACTS (data wiring, filter
   behavior, route behavior) must remain intact.
3. `bash scripts/ops/sierra/smoke_production.sh` → 15/15 (site must stay
   green after deploy).
4. Browser proof on the Vercel preview, then production: map renders with
   4,000+ pins; click Mivida marker → drawer opens showing ~483+ real
   units; a real price is visible on unit cards; "Details →" opens a real
   property page; filters still narrow the map; no console errors; no
   `aida-public` / `stitch.withgoogle` requests in the network tab.
5. Lighthouse (optional but report): no layout shift from fonts (use
   `display=swap` + preload), map canvas has stable min-height.
6. Zero hardcoded numbers from the prototype remain in the shipped code:
   grep the new page for `11,017|9,534|17.78|85,000|17.8M|16.2M` → no hits.

## PR & DEPLOY

One PR: `feat(map): replace properties map with Stitch masterplan design`.
Include before/after screenshots in the PR body, the design-token mapping
summary, and the wiring table above. Squash-merge to `main` → Vercel
auto-deploys → run the smoke + browser proof on production. Rollback =
`git revert` + push (Vercel redeploys the previous map automatically).

## APPENDIX — PROTOTYPE BEHAVIORS TO REPLICATE (from code.html)

- `filterUnits(type, el)`: toggles unit-card `data-type` display; tabs are
  segmented controls (active gets primary underline + font-semibold).
- Compound selection: `openCompoundDrawer(key)` swaps drawer title/desc/
  metrics/feed with that compound's data (prototype stores static objects —
  replace with live per-compound data derived from `/api/inventory.units`).
- `triggerFlythrough()`: staged transform keyframes — replicate as a map
  camera tour (pitch/bearing/zoom keyframes via the map engine's
  flyTo/easeTo, 1.2s per step) triggered from the "3D Flythrough" nav link;
  skip if the engine lacks smooth camera control.
- Currency toggle EGP/USD: pill pair, active =
  bg-surface-container-lowest text-primary shadow-sm.
- View switcher 2D/3D: active = bg-primary text-on-primary shadow-sm;
  2D = pitch 0; 3D = pitch 45 (button ids `view-mode-2d` / `view-mode-3d`).
- Reset viewport: `restart_alt` icon → `flyTo` the default New Cairo bounds
  (the app's current initial view).
- Marker hover: tooltip opacity 90→100 + marker scale-125; ping animation
  on the halo (stagger `animation-delay: 500ms` across markers for life).
