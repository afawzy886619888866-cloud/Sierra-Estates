# Handoff Report: Explorer 1 (Frontend & GIS Engine)

## 1. Observation

1. **Component Locations & Shims**:
   - `CartographicMap.tsx` is at `apps/sierra-estates-realty/components/site/CartographicMap.tsx` (822 lines) with re-export shim at `components/MasterRegistryMap/CartographicMap.tsx` (line 9).
   - In `CartographicMap.tsx`, line 57: `viewEngine === '4k-masterplan'` vs `viewEngine === 'live-gis'`. When `viewEngine === 'live-gis'`, line 384 embeds `<InventoryMap hideToolbar={true} ... />`.
   - The file referenced in dispatch as `components/client/CompoundsMap.tsx` does NOT exist in `apps/sierra-estates-realty/components/client/`. It is located at `apps/sierra-estates-realty/components/site/CompoundsMap.tsx` (2,092 lines).
   - `components/client/` contains `InventoryMap.tsx` (921 lines), which is the Leaflet map used by `CartographicMap.tsx`.

2. **Tile Configuration & Retina Support**:
   - In `components/client/InventoryMap.tsx`, line 575–582:
     ```tsx
     <TileLayer
       url={TILE_LAYERS[tileStyle].url}
       attribution={TILE_LAYERS[tileStyle].attrib}
       maxZoom={22}
       maxNativeZoom={19}
       // @ts-ignore
       detectRetina={true}
     />
     ```
   - In `TILE_LAYERS` definition (line 45–61), `dark` and `light` are set to `maxZoom: 20`, and `satellite` is set to `maxZoom: 19`.
   - In `components/Maps/LiveMap.tsx` (line 1045–1047), `maxZoom={20}` and `maxNativeZoom={20}` are used.
   - In `components/Maps/MasterplanMap.tsx` (line 463), `MapContainer` clamps `maxZoom={18}`.

3. **Compound Polygons for the 14 Target Compounds**:
   - Target 14 compounds: Hyde Park, Mountain View Hyde Park, Mountain View iCity, Mivida, CFC, Palm Hills New Cairo, Katameya Heights, Katameya Dunes, Eastown, Villette, Swan Lake, Taj City, The Square, Lake View.
   - In `components/site/CompoundsMap.tsx` (lines 317–426), `COMPOUND_POLYGONS` defines polygons for 10 compounds. 4 compounds lack polygons: `Mountain View Hyde Park`, `Katameya Dunes`, `The Square`, `Lake View`.
   - In `components/client/InventoryMap.tsx` (lines 601–648), compound hubs are only rendered as single-point `<Marker>` hub icons (`createCompoundHubIcon`), with NO `<Polygon>` elements rendered.
   - In `components/site/CartographicMap.tsx` (lines 489–580), masterplan compounds are rendered as SVG `<ellipse>` elements mapped by `xPct`/`yPct` percentage coords on a static raster image, not GPS polygons.

4. **Landmark Proximity & Travel Times**:
   - `InventoryMap.tsx` has `ZONE_PRESETS` (line 65), but no landmark filter chips for New Admin Capital, AUC, Golden Square, and 90th St with travel times.
   - `LiveMap.tsx` (lines 57–62) defines `NEW_CAIRO_LANDMARKS` with coordinates, and computes distance to AUC (`distToAuc`), but lacks interactive header filter chips with computed driving times.

5. **Map Pins & Modals**:
   - `InventoryMap.tsx` renders unit markers with `createUnitMarkerIcon` (lines 121–163) showing only a price label and rent/sale color dot. AI valuation and GEM badges are not rendered on the pin.
   - Pin clicks open a slide-out drawer (lines 780–915) rather than 1-click modal triggers.

6. **`/api/compounds` Route**:
   - In `apps/sierra-estates-realty/app/api/compounds/route.ts` (lines 10–24), the GET handler returns DB/seed records without polygon coordinates, landmark drive times, or benchmark average price per sqm.

7. **PropertyCard Badges in `components/site/PropertyCard.tsx`**:
   - Badges present: Direct Owner (`isDirectOwner`, lines 263, 368, 474, 602), Verified Fresh (`isVerifiedFresh`, lines 269, 608), corner AI score overlay (`AI {fmtAi(p.ai)}`).
   - In `bento` variant (lines 363, 387): `estYield% Yield`, Net Cap Rate, and text "Underpriced" vs "Fair Value".
   - Badges MISSING across cards:
     * GEM badge (`>15%` below compound avg) is absent on all variants.
     * Net ROI estimate is absent on `showcase`, `compact`, and `editorial` variants.
     * Luxury Index (`luxuryIndex`) is completely absent from `CardListing` interface and all variants.
     * Numerical Freshness Score (`freshness_score: 0..100` from migration 037) is not displayed (only boolean verified fresh).
     * Old Contract badge is absent.

8. **Build & Test Baseline**:
   - `pnpm --filter sierra-estates-client-page type-check`: Exited with code 0.
   - `pnpm test:root --run` (Vitest): **954 passed tests**, 2 failed tests (pre-existing large XML files in `__tests__/data-hygiene-and-git-weight.test.ts` and Windows pwsh timeout in `__tests__/ops-toolkit.test.ts`).
   - `__tests__/map-and-compounds.test.ts`: Passed (3/3 tests).

---

## 2. Logic Chain

1. **From Observation 1 & 2 to Tile & Engine Integration**:
   - `CartographicMap.tsx` toggles between the 4K Masterplan Visualizer (SVG CAD) and Live Geographic GIS Map (`InventoryMap`).
   - To provide smooth 4K/retina pinch-to-zoom up to level 22 without blurring, `TileLayer` across `InventoryMap.tsx` and `LiveMap.tsx` must standardize on `detectRetina: true`, `maxNativeZoom: 19`, and `maxZoom: 22`.

2. **From Observation 3 to Compound Polygon Requirement**:
   - The user request explicitly demands GPS bounding polygons for the 14 target compounds with glowing metallic gold (`#C9A84C`) and emerald/cyan (`#10B981` / `#00F0FF`) borders and permanent glowing centroid name pills.
   - Because `InventoryMap.tsx` currently has no `<Polygon>` layers and `COMPOUND_POLYGONS` in `CompoundsMap.tsx` only covers 10 compounds, a canonical dataset `TARGET_14_COMPOUND_POLYGONS` covering all 14 compounds must be defined and rendered as glowing `<Polygon>` layers with centroid `<Marker>` pills in `InventoryMap.tsx`.

3. **From Observation 4 to Landmark Proximity Engine**:
   - Landmark filter chips on the map header must dynamically compute drive times from the active location to: AUC Campus (`[30.0194, 31.5003]`), Golden Square (`[30.015, 31.605]`), 90th Street (`[30.028, 31.485]`), and New Admin Capital (`[30.0142, 31.7354]`).
   - Driving time formula $\text{timeMin} = \max(2, \text{Math.round}(\text{distKm} \times 1.35 + 2))$ reflects real New Cairo traffic and arterial speeds.

4. **From Observation 5 & 6 to Map Pins & API Enrichment**:
   - Map pins must reflect live Supabase listings with Rent/Resale distinction, AI valuation score, and GEM badge (>15% below compound average).
   - `/api/compounds` must return the 14 target compounds enriched with bounding polygons, centroid lat/lng, landmark drive times, and average price per sqm so frontend maps consume authoritative backend data.

5. **From Observation 7 to PropertyCard Badges**:
   - In `components/site/PropertyCard.tsx`, `CardListing` must be expanded with `freshnessScore`, `luxuryIndex`, `isOldContract`, `isGem`.
   - The GEM badge must trigger when $\frac{\text{compoundAvgSqm} - \text{unitPriceSqm}}{\text{compoundAvgSqm}} \ge 0.15$, rendering a glowing `💎 GEM DEAL (-XX%)` badge.
   - Net ROI, Luxury Index, and Freshness Score must be rendered cleanly across card variants without breaking existing snapshot or DOM tests.

---

## 3. Caveats

1. **Client-side vs Server-side Rendering of Leaflet**:
   - Leaflet references `window` and `document` and must strictly remain dynamic imports with `ssr: false`.
2. **Missing `components/client/CompoundsMap.tsx`**:
   - Dispatch mentioned this path. It does not exist; creating a re-export shim to `components/site/CompoundsMap.tsx` ensures complete compatibility.
3. **Pre-existing Root Test Failures**:
   - 2 failures in `vitest run` (`data-hygiene-and-git-weight.test.ts` and `ops-toolkit.test.ts`) are unrelated to frontend/GIS code and were already present before this investigation.

---

## 4. Conclusion

The codebase provides an exceptional, highly-structured architecture ready for additive integration:
1. **R1**: Provide `TARGET_14_COMPOUND_POLYGONS` with full GPS polygons, render them in `InventoryMap.tsx` with gold (`#C9A84C`) and cyan/emerald (`#00F0FF`/`#10B981`) glowing borders and permanent glowing centroid name pills; add landmark proximity chips with driving time calculations; and upgrade `TileLayer` to `detectRetina: true`, `maxNativeZoom: 19`, `maxZoom: 22`.
2. **R4**: Update `PropertyCard.tsx` across all 4 variants (`showcase`, `compact`, `bento`, `editorial`) to render the AI Valuation badge, GEM badge (>15% below compound avg), Net ROI estimate, Luxury Index, Freshness Score, and Direct Owner / Old Contract badges.
3. **API & Shims**: Enrich `/api/compounds` with polygon and benchmark pricing data, and create `components/client/CompoundsMap.tsx` compatibility shim.

All detailed findings, coordinate tables, and exact code changes are documented in:
`H:\Sierra Estates\.agents\teamwork\teamwork_explorer_survey_1\survey_report.md`.

---

## 5. Verification Method

To verify these findings independently:
1. **Inspect Survey Report**:
   - Check `H:\Sierra Estates\.agents\teamwork\teamwork_explorer_survey_1\survey_report.md`.
2. **Run Type-check**:
   ```pwsh
   pnpm --filter sierra-estates-client-page type-check
   ```
   (Must complete with exit code 0).
3. **Run Root Tests**:
   ```pwsh
   pnpm test:root --run
   ```
4. **Inspect Files**:
   - `apps/sierra-estates-realty/components/site/CartographicMap.tsx` (lines 55–65, 380–395)
   - `apps/sierra-estates-realty/components/client/InventoryMap.tsx` (lines 45–61, 575–648)
   - `apps/sierra-estates-realty/components/site/CompoundsMap.tsx` (lines 316–426)
   - `apps/sierra-estates-realty/components/site/PropertyCard.tsx` (lines 44–76, 260–288, 360–395, 600–644)
   - `apps/sierra-estates-realty/app/api/compounds/route.ts` (lines 10–24)
