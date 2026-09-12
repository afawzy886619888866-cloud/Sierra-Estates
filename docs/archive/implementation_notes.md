# Implementation Notes — Mobile, Live Map, Direct 3D

## Existing live integrations

The legacy homepage uses Leaflet from `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js` and marker clustering from `https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js`. Its map element is `#home-map` and the full compounds map uses `#cpd-map`.

The public inventory API is `/api/inventory`; it prioritizes the canonical Firestore `units` collection, then the live owner sheet, then the committed snapshot fallback.

The Listing3D URL is `https://listing3d.com/embed/r39d0bd4dde0a4fe693c7fe5fd230a896`. The current homepage still contains an iframe wrapper (`virtual-tour.html`) and a legacy tour modal, while the standalone React route already uses the Listing3D iframe directly.

## Relevant implementation files

- `apps/sierra-estates-realty/public/client-page/index.html`: legacy homepage HTML, live Leaflet map, obsolete tour modal, CTA markup.
- `apps/sierra-estates-realty/public/client-page/home.js`: legacy homepage interaction controller; currently hijacks tour actions into native fullscreen and initializes the lazy live map.
- `apps/sierra-estates-realty/public/client-page/shared.js`: generated navigation/footer/mobile nav; several footer/social links currently use `#`.
- `apps/sierra-estates-realty/public/client-page/home.css`: legacy homepage responsive and tour/map styling.
- `apps/sierra-estates-realty/app/map/MapPageClient.tsx`: React live map route using `LiveMap` and `useI18n`.
- `apps/sierra-estates-realty/components/Maps/LiveMap.tsx`: React Leaflet map with compound markers.

## Key current issues to fix

1. `home.js` uses `toggleNativeFullscreen()` for `#tour-open`, `.vtv-link`, and `#ai-tour-card`; these should open `virtual-tour.html` or the direct Listing3D URL instead.
2. `index.html` contains `#tour-modal` and `#tour-frame`, an obsolete modal wrapper that should be removed from the homepage flow.
3. The homepage 3D section currently embeds `virtual-tour.html` inside `#vtv-frame`; replace it with a direct Listing3D launch link for mobile and reliability.
4. The homepage “Add Listing” button does not have the `cta-list` id expected by `home.js`.
5. `shared.js` emits several footer/company/social anchors with `href="#"`.
6. The React `/map` page imports `useI18n` from `lib/I18nContext`; verify its provider/layout before making `/map` the canonical live-map link.
