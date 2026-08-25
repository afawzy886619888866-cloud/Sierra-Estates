---
name: real-estate-valuation-analyzer
description: Convert market listings (rental or sale) into clear financial decisions (Underpriced, Fair Value, or Overpriced) by calculating the investment payback period, capitalization rates (Cap Rates), and pricing arbitrage.
---

# Real Estate Valuation & Arbitrage Analyzer Skill

## Purpose

This skill equips Sierra Estates agents (specifically **The Curator**, **Vertex Omni Agent**, and **OpenClaw**) to evaluate any given property's financial viability using three core valuation methodologies:

1. **Income Capitalization (Cap Rate Valuation)**
2. **The 10-12 Year Payback Rule (Arbitrage & Deal Checker)**
3. **Commercial-to-Residential Price Arbitrage Discovery**

---

## 1. Valuation Algorithms & Formulas

### Algorithm A: Income Capitalization (Cap Rate Valuation)

$$\text{Fair Market Purchase Value} = \frac{\text{Monthly Rent} \times 12}{\text{Target Cap Rate}}$$

#### Egypt Market Cap Rate Baselines

- **Residential**: `8% – 10%`
- **Administrative / Medical**: `10% – 12%`
- **Commercial / Retail**: `12% – 15%`

---

### Algorithm B: The 10-12 Year Payback Rule

$$\text{Payback Period (Years)} = \frac{\text{Offered Purchase Price}}{\text{Annual Rental Income}}$$

#### Decision Thresholds

- **Payback < 8.0 Years**: 🚨 `BUY (MASSIVE ARBITRAGE)` (Extremely high yield / underpriced)
- **Payback 8.0 – 12.0 Years**: ✅ `BUY (FAIR VALUE)` (Standard secure investment)
- **Payback > 13.0 Years**: ❌ `OVERPRICED (NEGOTIATE OR RENT)` (Recommend negotiating or renting)

---

### Algorithm C: Commercial-to-Residential Arbitrage Detector

Detects anomalies where high-yielding administrative, commercial, or medical offices are offered at residential square meter price levels while commanding high commercial rental yields.

---

### Value-Add Structural Lifts

- **Underground Garage / Parking**: `+20%` asset value lift
- **Institutional / Bank Anchor Neighbor**: `+15%` security & foot-traffic lift
- **Official Commercial / Administrative License**: `+15%` legal premium
- **Metro / High Transit Proximity**: `+10%` accessibility lift
- **Private Pool / Lagoon View**: `+10%` luxury premium

---

## 2. Programmatic Usage

### TypeScript and Node.js

```typescript
import { evaluatePropertyValuation } from '@sierra-estates/agents';

const verdict = evaluatePropertyValuation({
  property_type: 'administrative',
  size_sqm: 100,
  location: 'Cairo Plaza',
  offered_rent: 20000,
  offered_purchase_price: 1350000,
  area_residential_avg_sqm_price: 14000,
  amenities: ['near metro', 'bank anchor', 'underground parking'],
});

console.log(verdict.verdict); // "BUY (MASSIVE ARBITRAGE)"
```

### Python

```python
from valuation_agent_skill import RealEstateValuationAgent

agent = RealEstateValuationAgent(currency="EGP")
result = agent.analyze({
    "property_type": "villa",
    "size_sqm": 400,
    "location": "Shorouk Springs",
    "offered_rent": 75000,
    "offered_purchase_price": 10500000,
    "amenities": ["private pool", "underground garage"]
})
print(result["verdict"]) # "BUY (FAIR VALUE)"
```
