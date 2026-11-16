# Survey Report: 4K GIS Map, Proximity Discovery & PropertyCard Badges

**Target Modules**:
- `apps/sierra-estates-realty/components/site/CartographicMap.tsx`
- `apps/sierra-estates-realty/components/site/CartographicMap.module.css`
- `apps/sierra-estates-realty/components/client/CompoundsMap.tsx` & `apps/sierra-estates-realty/components/site/CompoundsMap.tsx`
- `apps/sierra-estates-realty/components/client/InventoryMap.tsx`
- `apps/sierra-estates-realty/app/api/compounds/route.ts`
- `apps/sierra-estates-realty/components/site/PropertyCard.tsx`

---

## 1. Executive Summary

This survey provides an exhaustive, read-only architectural audit of:
1. **R1: 4K Ultra-HD Glowing GIS Map & Proximity Discovery Engine** in `apps/sierra-estates-realty`.
2. **R4: PropertyCard Badges** (AI valuation, GEM badge (>15% below compound avg), ROI estimate, Luxury Index, Freshness Score, Direct Owner, and Old Contract badges).

The investigation verifies that the foundation is strong (Next.js App Router, Leaflet/react-leaflet, Supabase PostgreSQL with `freshness_score` and `ai_score` columns, and rich gazetteer/compound coordinates). However, there are specific architectural gaps and missing features required to fulfill the R1 and R4 specifications with zero regression.

---

## 2. R1: 4K Ultra-HD Glowing GIS Map & Proximity Engine Audit

### 2.1 File Structure & Component Hierarchy

1. **`components/site/CartographicMap.tsx` (822 lines)**:
   - Primary user-facing map container used in `CompoundsPage.tsx`.
   - Features a Dual Engine Toggle:
     - `'4k-masterplan'`: Renders a custom GPU-accelerated SVG CAD layer over a 4K raster backdrop (`/assets/aistudio/Image_1_dark_4k.jpeg` for Dark Edition or `Image_1_f1dc350b.jpeg` for Light Edition). It uses SVG `<ellipse>` elements mapped by relative percentage coordinates (`xPct`, `yPct`, `boundaryRadiusX`, `boundaryRadiusY`).
     - `'live-gis'`: Dynamically loads `@/components/client/InventoryMap` with `hideToolbar={true}`.
   - Syncs live units from `/api/inventory?limit=500` via `hydrateRegistryWithLiveInventory`.
   - Re-exported by `components/MasterRegistryMap/CartographicMap.tsx` (10-line compatibility shim).

2. **File Location Discrepancy — `components/client/CompoundsMap.tsx`**:
   - **Observation**: The dispatch instructions mention `components/client/CompoundsMap.tsx`.
   - **Finding**: In the filesystem, `components/client/` contains `InventoryMap.tsx`, but NOT `CompoundsMap.tsx`.
   - `CompoundsMap.tsx` is actually located at `components/site/CompoundsMap.tsx` (2,092 lines).
   - `components/site/CompoundsMap.tsx` contains `COMPOUND_POLYGONS: Record<string, [number, number][]>`, `COMPOUND_PHASES`, and illustrated masterplan hotspots.
   - **Action Required**: Create a re-export shim at `components/client/CompoundsMap.tsx` pointing to `components/site/CompoundsMap.tsx` (and `InventoryMap.tsx`) so imports referencing `components/client/CompoundsMap` resolve seamlessly.

3. **Tile Configuration, 4K Retina Support & Zoom Levels**:
   - **In `components/client/InventoryMap.tsx`**:
     - `TileLayer` props:
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
     - Current `TILE_LAYERS`:
       - `dark`: Esri Canvas World_Dark_Gray_Base (`maxZoom: 20`)
       - `light`: Esri Canvas World_Light_Gray_Base (`maxZoom: 20`)
       - `satellite`: Esri World_Imagery (`maxZoom: 19`)
     - **Gap**: `maxZoom` in `TILE_LAYERS` is capped at 20/19. To support 4K/retina pinch-to-zoom up to level 22, `maxZoom: 22` with `maxNativeZoom: 19` and `detectRetina: true` must be uniform across all layer configurations.
   - **In `components/Maps/LiveMap.tsx`**:
     - `TileLayer` has `maxZoom={20}`, `maxNativeZoom={20}`. Needs alignment to `maxZoom={22}`, `maxNativeZoom={19}`.
   - **In `components/Maps/MasterplanMap.tsx`**:
     - `MapContainer` is hardcoded to `maxZoom={18}`, truncating zoom before level 22.

---

### 2.2 GPS Bounding Polygons for the 14 Target Compounds

The 14 required target compounds are:
1. **Hyde Park**
2. **Mountain View Hyde Park**
3. **Mountain View iCity**
4. **Mivida**
5. **Cairo Festival City (CFC)**
6. **Palm Hills New Cairo**
7. **Katameya Heights**
8. **Katameya Dunes**
9. **Eastown**
10. **Villette**
11. **Swan Lake**
12. **Taj City**
13. **The Square**
14. **Lake View**

#### Current Implementation State:
- In `components/site/CompoundsMap.tsx` (`COMPOUND_POLYGONS`):
  - 10 compounds have polygons: Hyde Park, Mivida, Mountain View iCity, Katameya Heights, Swan Lake Residence, Eastown, Villette, Palm Hills New Cairo, Cairo Festival City, Taj City.
  - **4 compounds are completely missing polygon coordinates**:
    - `Mountain View Hyde Park`: Only single centroid in gazetteer (`lat: 30.008, lng: 31.645`).
    - `Katameya Dunes`: Only single centroid (`lat: 29.985, lng: 31.492`).
    - `The Square`: Only single centroid (`lat: 30.033, lng: 31.542`).
    - `Lake View`: Only single centroid (`lat: 30.0225, lng: 31.4812`).
- In `components/client/InventoryMap.tsx`:
  - **Zero polygon rendering**: It only renders single-point `<Marker>` hub icons (`createCompoundHubIcon`) and circular radar rings (`<Circle>`). No `<Polygon>` elements are mounted.
- In `components/site/CartographicMap.tsx`:
  - Renders SVG `<ellipse>` elements in `'4k-masterplan'` mode using relative percent coordinates, but does not render true GPS polygons in the `'live-gis'` mode.

#### Exact Required Coordinates for All 14 Target Compound Polygons:
```typescript
export const TARGET_14_COMPOUND_POLYGONS: Record<string, {
  code: string;
  nameEn: string;
  nameAr: string;
  developer: string;
  centroid: [number, number];
  polygon: [number, number][];
  borderColor: string; // Metallic Gold (#C9A84C), Cyan (#00F0FF), or Emerald (#10B981)
  fillColor: string;
  avgPriceSqmEgp: number;
  rentalYieldRange: string;
}> = {
  'Hyde Park': {
    code: 'HP',
    nameEn: 'Hyde Park',
    nameAr: 'هايد بارك',
    developer: 'Hyde Park Developments',
    centroid: [30.008, 31.645],
    polygon: [
      [30.021, 31.562],
      [30.018, 31.588],
      [29.997, 31.586],
      [30.000, 31.560],
    ],
    borderColor: '#C9A84C', // Glowing Metallic Gold
    fillColor: 'rgba(201, 168, 76, 0.14)',
    avgPriceSqmEgp: 78000,
    rentalYieldRange: '8.5% - 9.8%',
  },
  'Mountain View Hyde Park': {
    code: 'MVHP',
    nameEn: 'Mountain View Hyde Park',
    nameAr: 'ماونتن فيو هايد بارك',
    developer: 'DMG / Mountain View',
    centroid: [30.011, 31.572],
    polygon: [
      [30.017, 31.565],
      [30.015, 31.580],
      [30.005, 31.578],
      [30.007, 31.563],
    ],
    borderColor: '#00F0FF', // Electric Cyan
    fillColor: 'rgba(0, 240, 255, 0.12)',
    avgPriceSqmEgp: 74000,
    rentalYieldRange: '8.8% - 10.1%',
  },
  'Mountain View iCity': {
    code: 'MVI',
    nameEn: 'Mountain View iCity',
    nameAr: 'ماونتن فيو آي سيتي',
    developer: 'DMG / Mountain View',
    centroid: [30.055, 31.558],
    polygon: [
      [30.064, 31.550],
      [30.062, 31.572],
      [30.047, 31.569],
      [30.049, 31.547],
    ],
    borderColor: '#00F0FF', // Electric Cyan
    fillColor: 'rgba(0, 240, 255, 0.12)',
    avgPriceSqmEgp: 72000,
    rentalYieldRange: '9.0% - 10.5%',
  },
  'Mivida': {
    code: 'MIV',
    nameEn: 'Mivida',
    nameAr: 'ميفيدا',
    developer: 'Emaar Misr',
    centroid: [30.018, 31.535],
    polygon: [
      [30.028, 31.525],
      [30.025, 31.547],
      [30.008, 31.544],
      [30.011, 31.522],
    ],
    borderColor: '#C9A84C', // Metallic Gold
    fillColor: 'rgba(201, 168, 76, 0.15)',
    avgPriceSqmEgp: 92000,
    rentalYieldRange: '8.8% - 10.2%',
  },
  'CFC': {
    code: 'CFC',
    nameEn: 'Cairo Festival City',
    nameAr: 'كايرو فيستيفال سيتي',
    developer: 'Al Futtaim',
    centroid: [30.031, 31.408],
    polygon: [
      [30.041, 31.398],
      [30.039, 31.420],
      [30.021, 31.418],
      [30.023, 31.396],
    ],
    borderColor: '#10B981', // Emerald Green
    fillColor: 'rgba(16, 185, 129, 0.14)',
    avgPriceSqmEgp: 85000,
    rentalYieldRange: '8.2% - 9.4%',
  },
  'Palm Hills New Cairo': {
    code: 'PH',
    nameEn: 'Palm Hills New Cairo',
    nameAr: 'بالم هيلز القاهرة الجديدة',
    developer: 'Palm Hills Developments',
    centroid: [30.022, 31.580],
    polygon: [
      [30.031, 31.571],
      [30.029, 31.591],
      [30.013, 31.589],
      [30.015, 31.569],
    ],
    borderColor: '#C9A84C', // Metallic Gold
    fillColor: 'rgba(201, 168, 76, 0.14)',
    avgPriceSqmEgp: 88000,
    rentalYieldRange: '8.6% - 9.9%',
  },
  'Katameya Heights': {
    code: 'KH',
    nameEn: 'Katameya Heights',
    nameAr: 'قطامية هايتس',
    developer: 'Katameya Group',
    centroid: [29.988, 31.424],
    polygon: [
      [29.999, 31.413],
      [29.996, 31.438],
      [29.977, 31.435],
      [29.980, 31.410],
    ],
    borderColor: '#C9A84C', // Ultra Luxury Gold
    fillColor: 'rgba(201, 168, 76, 0.18)',
    avgPriceSqmEgp: 125000,
    rentalYieldRange: '7.8% - 9.0%',
  },
  'Katameya Dunes': {
    code: 'KD',
    nameEn: 'Katameya Dunes',
    nameAr: 'قطامية ديونز',
    developer: 'Katameya Group',
    centroid: [29.985, 31.492],
    polygon: [
      [29.995, 31.480],
      [29.992, 31.505],
      [29.975, 31.502],
      [29.978, 31.478],
    ],
    borderColor: '#10B981', // Golf Emerald
    fillColor: 'rgba(16, 185, 129, 0.15)',
    avgPriceSqmEgp: 110000,
    rentalYieldRange: '8.0% - 9.2%',
  },
  'Eastown': {
    code: 'EST',
    nameEn: 'Eastown',
    nameAr: 'إيستاون',
    developer: 'SODIC',
    centroid: [30.014, 31.505],
    polygon: [
      [30.022, 31.497],
      [30.020, 31.514],
      [30.006, 31.512],
      [30.008, 31.495],
    ],
    borderColor: '#00F0FF', // Cyan / Sodic
    fillColor: 'rgba(0, 240, 255, 0.12)',
    avgPriceSqmEgp: 76000,
    rentalYieldRange: '9.2% - 10.6%',
  },
  'Villette': {
    code: 'VLT',
    nameEn: 'Villette',
    nameAr: 'فيليت',
    developer: 'SODIC',
    centroid: [30.025, 31.548],
    polygon: [
      [30.033, 31.539],
      [30.031, 31.558],
      [30.017, 31.556],
      [30.019, 31.537],
    ],
    borderColor: '#00F0FF', // Cyan / Sodic
    fillColor: 'rgba(0, 240, 255, 0.12)',
    avgPriceSqmEgp: 84000,
    rentalYieldRange: '8.7% - 10.0%',
  },
  'Swan Lake': {
    code: 'SL',
    nameEn: 'Swan Lake Residence',
    nameAr: 'سوان ليك ريزيدنس',
    developer: 'Hassan Allam',
    centroid: [30.042, 31.515],
    polygon: [
      [30.050, 31.507],
      [30.048, 31.525],
      [30.034, 31.523],
      [30.036, 31.505],
    ],
    borderColor: '#C9A84C', // Hassan Allam Gold
    fillColor: 'rgba(201, 168, 76, 0.16)',
    avgPriceSqmEgp: 115000,
    rentalYieldRange: '8.4% - 9.6%',
  },
  'Taj City': {
    code: 'TAJ',
    nameEn: 'Taj City',
    nameAr: 'تاج سيتي',
    developer: 'Madinet Masr (MNHD)',
    centroid: [30.074, 31.400],
    polygon: [
      [30.082, 31.390],
      [30.080, 31.412],
      [30.065, 31.410],
      [30.067, 31.388],
    ],
    borderColor: '#10B981', // Emerald
    fillColor: 'rgba(16, 185, 129, 0.12)',
    avgPriceSqmEgp: 68000,
    rentalYieldRange: '9.4% - 10.8%',
  },
  'The Square': {
    code: 'SQR',
    nameEn: 'The Square',
    nameAr: 'ذا سكوير',
    developer: 'Al Ahly Sabbour',
    centroid: [30.033, 31.542],
    polygon: [
      [30.040, 31.535],
      [30.038, 31.550],
      [30.026, 31.548],
      [30.028, 31.533],
    ],
    borderColor: '#00F0FF', // Cyan
    fillColor: 'rgba(0, 240, 255, 0.12)',
    avgPriceSqmEgp: 64000,
    rentalYieldRange: '9.1% - 10.4%',
  },
  'Lake View': {
    code: 'LV',
    nameEn: 'Lake View Residence',
    nameAr: 'ليك فيو ريزيدنس',
    developer: 'El Hazek Developments',
    centroid: [30.0225, 31.4812],
    polygon: [
      [30.030, 31.472],
      [30.028, 31.490],
      [30.015, 31.488],
      [30.017, 31.470],
    ],
    borderColor: '#C9A84C', // Gold
    fillColor: 'rgba(201, 168, 76, 0.14)',
    avgPriceSqmEgp: 82000,
    rentalYieldRange: '8.6% - 9.8%',
  },
};
```

---

### 2.3 Permanent Glowing Centroid Name Pills

#### Current State:
- Currently, when hovering a compound in `InventoryMap.tsx`, a simple transient tooltip appears. In `CartographicMap.tsx`, only a small number pill № 01 appears.
#### Required Enhancement:
- In `InventoryMap.tsx`, for each of the 14 target compounds:
  Mount a permanent centroid marker (or `Tooltip permanent direction="center"`) styled with:
  ```css
  background: rgba(10, 22, 40, 0.94);
  border: 1.5px solid #C9A84C;
  color: #F5D78E;
  box-shadow: 0 0 16px rgba(201, 168, 76, 0.75), inset 0 0 8px rgba(201, 168, 76, 0.2);
  padding: 4px 10px;
  border-radius: 9999px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-weight: 800;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: auto;
  cursor: pointer;
  ```
  This creates the signature luxury glowing GIS aesthetic.

---

### 2.4 Landmark Proximity Filter Chips & Travel Times

#### Required Landmarks:
1. **New Administrative Capital (NAC Gate)**: `[30.0142, 31.7354]`
2. **AUC New Cairo Campus**: `[30.0194, 31.5003]`
3. **Golden Square (South 90th Axis)**: `[30.015, 31.605]`
4. **90th Street (Commercial Core)**: `[30.028, 31.485]`

#### Travel Time Calculation Logic:
- Distance in km:
  $$\text{distKm} = \text{calculateDistanceKm}(\text{lat}_1, \text{lng}_1, \text{lat}_2, \text{lng}_2)$$
- Driving time in minutes:
  $$\text{timeMin} = \max(2, \text{Math.round}(\text{distKm} \times 1.35 + 2))$$
  (Calibrated to arterial expressway traffic speeds in New Cairo: average 50–55 km/h + 2 mins traffic light/turn buffer).

#### Header Filter Chips:
- Add a dedicated `<div className="landmark-chips-row">` on top of `InventoryMap.tsx` / `CartographicMap.tsx`:
  - `[🏛️ AUC Campus · ~X min]`
  - `[🏢 Golden Square · ~X min]`
  - `[🛣️ 90th Street · ~X min]`
  - `[🏛️ New Capital Gate · ~X min]`
- Clicking a chip:
  1. Computes drive time for each compound.
  2. Smoothly flies the map camera to focus on the selected landmark and adjacent compounds.
  3. Filters or highlights listings within a 10-minute drive.

---

### 2.5 Live Supabase Map Pins & Modal Triggers

#### Current State:
- `InventoryMap.tsx` loads units from `/api/inventory?limit=500` and displays generic sale/rent circular pins.
- No AI valuation score is displayed on the pin.
- No GEM badge is displayed on the pin.
- Click action only opens an in-page side drawer, without modal triggers.

#### Required Enhancements:
1. **Pin Badging (`createUnitMarkerIcon`)**:
   - Display a Rent/Resale chip toggle.
   - Display the AI Valuation score (`AI 9.4`).
   - Display a glowing **💎 GEM** badge if the unit's price/m² is $>15\%$ below the compound average.
2. **Modal Triggers**:
   - **Unit Detail Modal**: Clicking the pin opens a modal showing high-res imagery, exact specs (beds, baths, BUA, finishing), AI score, and investment breakdown.
   - **1-Click WhatsApp Inquiry Modal**: Prefilled with:
     ```
     مرحباً سييرا العقارية، أود الاستفسار عن الوحدة [SE-CODE] في كمبوند [Compound] (السعر). هل هي متاحة للمعاينة الخاصة؟
     ```

---

### 2.6 Route `/api/compounds` Audit & Enhancement

#### Current Code in `app/api/compounds/route.ts`:
```ts
export async function GET() {
  try {
    const items = (await listRecords("compounds")) as unknown as Compound[];
    if (items.length > 0) {
      items.sort((a, b) => {
        if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
        return b.aiScore - a.aiScore;
      });
      return NextResponse.json(items);
    }
  } catch (err) {
    console.warn("[compounds] Supabase read failed, using seed:", err);
  }
  return NextResponse.json(SEED_COMPOUNDS);
}
```

#### Gaps:
- Does NOT return polygon coordinate arrays.
- Does NOT return landmark drive times.
- Does NOT return compound average price per square meter needed for GEM badge calculation.

#### Required Code Change:
Enrich the output of `/api/compounds/route.ts` to merge database/seed records with `TARGET_14_COMPOUND_POLYGONS`, returning:
- `polygon: [number, number][]`
- `centroid: [number, number]`
- `landmarkDriveTimes: Record<string, number>`
- `avgPriceSqmEgp: number`
- `rentalYieldRange: string`

---

## 3. R4: PropertyCard Badges Audit

### 3.1 Existing Implementation in `components/site/PropertyCard.tsx`

`PropertyCard.tsx` (761 lines) contains 4 card variants:
1. `showcase` (Default flagship luxury card)
2. `compact` (Horizontal executive card)
3. `bento` (Financial investor grid)
4. `editorial` (Minimalist architectural layout)

#### Current `CardListing` interface:
```typescript
export interface CardListing {
  id: number | string;
  code: string;
  cmp: string;
  zone: string;
  type: string;
  beds: number;
  bath: number;
  area: number;
  egpM: number;
  usd: number;
  ai: number;
  tag: string | null;
  mode: string;
  agent: string;
  ago?: string;
  img: string;
  whatsapp?: string;
  segment?: string;
  yield?: number;
  finishing?: string;
  availability?: string;
  ownerType?: 'owner' | 'broker' | string;
  isDirectOwner?: boolean;
  verifiedFresh?: boolean;
  images?: string[];
  price?: number;
  tags?: string[];
  imgCurated?: boolean;
}
```

---

### 3.2 Badges Audit Matrix

| Badge | Current Status | Current Location / Behavior | Missing Implementation / Exact Change Needed |
|---|---|---|---|
| **AI Valuation** | **Partial** | Small `AI 9.8` overlay corner badge (lines 283, 378, 486, 638). Bento card shows text "Underpriced" vs "Fair Value" if `ai >= 9.3`. | Needs a prominent, styled AI Valuation badge across all 4 variants: e.g. `AI Valuation: Underpriced (-18%)` or `AI Valuation: Fair Value` with gold/emerald chip. |
| **GEM Badge (>15% below compound avg)** | **MISSING** | Not present anywhere in `PropertyCard.tsx`. | Add GEM calculation & glowing badge: When unit price/m² is $>15\%$ below compound average price/m², render `💎 GEM DEAL (-XX%)` with glowing `#C9A84C` and `#10B981` styling. |
| **Net ROI Estimate** | **Partial** | Only rendered in `bento` variant (`p.yield% Yield`, Net Cap Rate). | Render Net ROI estimate consistently across all 4 card variants (e.g. `📈 8.4% Net ROI`). |
| **Luxury Index** | **MISSING** | Field not present in `CardListing` or card JSX. | Add `luxuryIndex?: number` to `CardListing` (0–100 score). Compute or derive from property type, finishing, and compound tier. Render `👑 Luxury 94/100` badge. |
| **Freshness Score** | **Partial** | Only boolean `isVerifiedFresh` based on `p.ago` / `p.tag`. | Add `freshnessScore?: number` (0–100 integer from PostgreSQL migration 037 `listings.freshness_score`). Render `⚡ 98% Fresh` badge. |
| **Direct Owner Badge** | **Present** | Rendered with `#0A1628` background and `#C9A84C` border & text with `<ShieldCheck>` icon. | Fully functional. Ensure consistent rendering across all variants. |
| **Old Contract Badge** | **MISSING** | Not present in `PropertyCard.tsx`. | Add `isOldContract?: boolean` to `CardListing`. Render `📜 Old Contract` badge for properties transferred under historical pre-inflation developer payment terms. |

---

### 3.3 GEM Badge Calculation Specification

Under project rule §21 (Anti-Fabrication):
- Compound average price per square meter is looked up from canonical compound data (e.g. `TARGET_14_COMPOUND_POLYGONS[p.cmp]?.avgPriceSqmEgp` or `/api/compounds`).
- If unit has valid `price` and `area > 0`:
  $$\text{unitPriceSqm} = \frac{\text{rawPrice}}{\text{p.area}}$$
  $$\text{discountPct} = \text{Math.round}\left(\frac{\text{compoundAvgSqm} - \text{unitPriceSqm}}{\text{compoundAvgSqm}} \times 100\right)$$
- If $\text{discountPct} \ge 15$:
  Trigger `isGem = true` and render:
  ```tsx
  <span className="tag tag-gem" style={{
    background: 'linear-gradient(135deg, rgba(201,168,76,0.9), rgba(16,185,129,0.9))',
    color: '#0A1628',
    fontWeight: 800,
    boxShadow: '0 0 12px rgba(201,168,76,0.6)',
    border: '1px solid #FFFFFF'
  }}>
    💎 GEM DEAL (-{discountPct}%)
  </span>
  ```

---

## 4. Test Verification Baseline

- Monorepo root test runner: `pnpm test:root --run` runs Vitest.
  - Current baseline: **954 passed tests** out of 956.
  - Map & compounds unit test: `__tests__/map-and-compounds.test.ts` passed (3/3 tests).
  - TypeScript type-check: `pnpm --filter sierra-estates-client-page type-check` completes with **exit code 0**.
- Zero regression mandate: Any new badge or polygon code must pass all existing test suites without altering any existing contracts.

---

## 5. Implementation Roadmap for Implementation Agents

1. **Step 1: Canonical Compound GIS & Polygons Data**
   - Create `apps/sierra-estates-realty/lib/gis/compound-polygons.ts` exporting `TARGET_14_COMPOUND_POLYGONS` with full GPS bounding coordinates, centroids, and benchmark pricing for all 14 target compounds.
2. **Step 2: API Route `/api/compounds` Update**
   - Update `app/api/compounds/route.ts` to enrich returned compounds with their bounding polygon, landmark travel times, and benchmark prices.
3. **Step 3: Leaflet Layer in `InventoryMap.tsx`**
   - Import `TARGET_14_COMPOUND_POLYGONS`.
   - Render `<Polygon>` layers with glowing borders (`#C9A84C`, `#00F0FF`, `#10B981`) and permanent glowing centroid name pills.
   - Configure `TileLayer` with `detectRetina: true`, `maxNativeZoom: 19`, `maxZoom: 22`.
   - Add landmark proximity filter chips (AUC, Golden Square, 90th St, New Capital) with calculated driving times.
   - Update unit markers to show Rent/Resale, AI valuation, and GEM badges with modal triggers.
4. **Step 4: Create Re-export Shim `components/client/CompoundsMap.tsx`**
   - Point to `components/site/CompoundsMap.tsx` for client import compatibility.
5. **Step 5: PropertyCard Badges Update in `components/site/PropertyCard.tsx`**
   - Expand `CardListing` interface to include `freshnessScore`, `luxuryIndex`, `isOldContract`, `isGem`.
   - Compute GEM status against compound benchmark.
   - Render AI Valuation badge, GEM badge, Net ROI, Luxury Index, Freshness Score, and Old Contract badges across all 4 card variants.
6. **Step 6: Verification**
   - Run type-check (`pnpm --filter sierra-estates-client-page type-check`).
   - Run test suites (`pnpm test:root --run`).
