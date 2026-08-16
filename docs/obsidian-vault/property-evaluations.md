# AI Property Evaluation & Priority Classification Matrix

> **Authoritative Policy**: Directives by Master Developer Ahmed Fawzy (`a.fawzy8866@gmail.com`).
> **Core Objective**: Evaluates all units before presenting them to clients, sorting by highest valuation score, and applying a mandatory **+20% Priority Bonus** for Direct Owner units.

---

## 1. Valuation & Priority Scoring Formula

The total priority score is calculated dynamically based on:
$$\text{Priority Score} = \min(100, [(\text{Compound Tier} \times 0.5) + (\text{Price Competitiveness} \times 0.4) + (\text{Finishing Bonus} \times 2)] \times \text{Owner Multiplier})$$

- **Tier 1 Compounds (Base Score: 88–94)**:
  - *Mivida (Emaar)*: 92 Base · Avg Rent/m²: 380 EGP · High Demand (95%)
  - *Uptown Cairo (Emaar)*: 90 Base · Avg Rent/m²: 420 EGP · Diplomatic Standard (94%)
  - *Villette SODIC*: 89 Base · Avg Rent/m²: 350 EGP · Golden Square (93%)
  - *Eastown SODIC*: 88 Base · Avg Rent/m²: 360 EGP · AUC & 90th St (92%)
  - *Cairo Festival City (CFC)*: 94 Base · Commercial & Residential Hub (96%)

- **Tier 2 Compounds (Base Score: 81–83)**:
  - *Mountain View iCity*: 82 Base · Avg Rent/m²: 260 EGP
  - *Hyde Park*: 83 Base · Avg Rent/m²: 280 EGP
  - *Madinaty*: 81 Base · Avg Rent/m²: 240 EGP

---

## 2. 👑 Direct Owner Priority Rule (+20% Boost)

- **Rule**: Any unit listed directly from the **Owner** (`isOwner: true`, `source: 'owner'`, or `isDirectOwner: true`) receives a **1.20x (20%) multiplier** on its final score.
- **Rationale**:
  - Eliminates secondary brokerage markups.
  - Accelerates viewing coordination and owner negotiations.
  - Ensures clients receive the most genuine and best-priced opportunities first.

---

## 3. Evaluated Active Inventory Benchmark

| Reference | Property Title | Compound | Price / Month | Direct Owner | Valuation Score | Grade | Priority Tier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SE-MIV-301** | Modern 3BR Apartment (195m²) | Mivida (Emaar) | 52,000 EGP | ✅ **Yes (+20%)** | **96/100** | **A+** | 🌟 Top Pick |
| **SE-VIL-204** | Luxury 4BR Townhouse (260m²) | Villette (SODIC) | 68,000 EGP | ✅ **Yes (+20%)** | **94/100** | **A+** | 🌟 Top Pick |
| **SE-UPT-801** | Golf View Penthouse (240m²) | Uptown Cairo | 85,000 EGP | ✅ **Yes (+20%)** | **92/100** | **A** | Prime |
| **SE-HYD-505** | 3BR Parkview Apartment (185m²) | Hyde Park | 42,000 EGP | ✅ **Yes (+20%)** | **88/100** | **A** | Prime |
| **SE-EAS-102** | 2BR 90th St Apartment (155m²) | Eastown | 45,000 EGP | ❌ Broker | **82/100** | **B+** | Solid |

---

## 4. Multi-Agent Synchronization
- **Hermes Agent**: Uses this matrix to prioritize market scout reports and price benchmarking.
- **WhatsApp Senior Bot**: Delivers top-evaluated units with investment badges and direct-owner status.
- **Stage-9 Closer**: References valuation scores to counter pricing objections and justify rental yields.
- **OpenClaw**: Monitors inventory intake and automatically flags newly listed owner units for instant priority boost.
