# Worker M1 Dispatch: 4K GIS Map, Proximity Discovery & PropertyCard Badges

## Working Directory
`H:\Sierra Estates\.agents\teamwork\worker_m1\`

## Mandatory Documents
Read `H:\Sierra Estates\.agents\teamwork\ORIGINAL_REQUEST.md` and `H:\Sierra Estates\PROJECT.md`.
Read Explorer 1's findings at `H:\Sierra Estates\.agents\teamwork\teamwork_explorer_survey_1\survey_report.md` and `handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Exclusively Owned Files
- `apps/sierra-estates-realty/lib/gis/compound-polygons.ts`
- `apps/sierra-estates-realty/components/client/CompoundsMap.tsx`
- `apps/sierra-estates-realty/components/client/InventoryMap.tsx`
- `apps/sierra-estates-realty/components/site/CartographicMap.tsx`
- `apps/sierra-estates-realty/components/site/CartographicMap.module.css`
- `apps/sierra-estates-realty/components/site/PropertyCard.tsx`
- `apps/sierra-estates-realty/app/api/compounds/route.ts`

## Tasks to Implement
1. Create `apps/sierra-estates-realty/lib/gis/compound-polygons.ts` exporting `TARGET_14_COMPOUND_POLYGONS` with full GPS polygon coordinates, centroids, benchmark pricing, and rental yields for all 14 target compounds (Hyde Park, Mountain View Hyde Park, Mountain View iCity, Mivida, CFC, Palm Hills New Cairo, Katameya Heights, Katameya Dunes, Eastown, Villette, Swan Lake, Taj City, The Square, Lake View).
2. Create `apps/sierra-estates-realty/components/client/CompoundsMap.tsx` re-exporting `../site/CompoundsMap` and `InventoryMap` for client compatibility.
3. In `apps/sierra-estates-realty/components/client/InventoryMap.tsx`:
   - Set `TileLayer` props: `detectRetina: true`, `maxNativeZoom: 19`, `maxZoom: 22`.
   - Render glowing `<Polygon>` layers for all 14 target compounds using metallic gold (`#C9A84C`) and emerald/cyan (`#10B981` / `#00F0FF`) borders and semi-transparent fills.
   - Render permanent glowing centroid name pills at polygon centroids.
   - Add landmark proximity filter chips on the map header (New Administrative Capital, AUC, Golden Square, 90th Street) with travel times calculated via `timeMin = Math.max(2, Math.round(distKm * 1.35 + 2))`.
   - Bind map pins to live Supabase listings with Rent/Resale chips, AI valuation score, and glowing GEM badge (>15% below compound average) with 1-click Unit Detail and WhatsApp inquiry modal triggers.
4. In `apps/sierra-estates-realty/app/api/compounds/route.ts`:
   - Enrich compound objects with polygon coordinates, centroid lat/lng, landmark drive times, and benchmark average price per sqm.
5. In `apps/sierra-estates-realty/components/site/PropertyCard.tsx`:
   - Update `CardListing` interface to include `freshnessScore?: number`, `luxuryIndex?: number`, `isOldContract?: boolean`, `isGem?: boolean`, `discountPct?: number`.
   - Render across all 4 variants (`showcase`, `compact`, `bento`, `editorial`):
     - AI Valuation badge (`AI Valuation: Underpriced` / `Fair Value`)
     - GEM badge (`💎 GEM DEAL (-XX%)` when price/m² is >15% below compound avg)
     - Net ROI estimate (`📈 X.X% Net ROI`)
     - Luxury Index (`👑 Luxury XX/100`)
     - Freshness Score (`⚡ XX% Fresh`)
     - Direct Owner badge and Old Contract badge (`📜 Old Contract`)
6. Run build/test verification:
   - `pnpm --filter sierra-estates-client-page type-check`
   - `pnpm test:root __tests__/map-and-compounds.test.ts`
7. Write `progress.md` and complete with `handoff.md` detailing observation, logic chain, caveats, conclusion, and verification command results.


## 2026-11-04T21:57:25Z
You are Worker M1 (Frontend GIS & PropertyCard Badges).
Working directory: H:\Sierra Estates\.agents\teamwork\worker_m1\
Read H:\Sierra Estates\.agents\teamwork\ORIGINAL_REQUEST.md, H:\Sierra Estates\PROJECT.md, and your dispatch instructions at H:\Sierra Estates\.agents\teamwork\worker_m1\DISPATCH.md.
Also read Explorer 1 findings at H:\Sierra Estates\.agents\teamwork\teamwork_explorer_survey_1\survey_report.md and handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- apps/sierra-estates-realty/lib/gis/compound-polygons.ts
- apps/sierra-estates-realty/components/client/CompoundsMap.tsx
- apps/sierra-estates-realty/components/client/InventoryMap.tsx
- apps/sierra-estates-realty/components/site/CartographicMap.tsx
- apps/sierra-estates-realty/components/site/CartographicMap.module.css
- apps/sierra-estates-realty/components/site/PropertyCard.tsx
- apps/sierra-estates-realty/app/api/compounds/route.ts

Implement all tasks in DISPATCH.md, run verification commands (type-check and tests), maintain progress.md, and write handoff.md. Send a completion message when finished.
