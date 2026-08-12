# 📊 Real Estate Forecasting Engine & Predictive Models
> **Path:** `docs/obsidian-vault/Forecasting Engine.md`  
> **Parent Node:** `[[Sierra Estates Memory Engine]]`

To identify the most profitable real estate transactions in Egypt (New Cairo), our platform uses quantitative models that analyze listing records and predict yields.

---

## 1. Net Rental Yield Formula (ROI)
Net yield represents the real cash flow return on a property after operational expenses:

$$\text{Net Rental Yield} = \frac{\text{Gross Annual Rent (EGP)} - \text{Operating Expenses (Maintenance, Management, Taxes)}}{\text{Property Purchase Price} + \text{Transaction Costs (Real Estate Fees + Registration)}}$$

### Yield Benchmarks (New Cairo Market):
*   **Tier 1 (Buy Signal):** Net Yield $> 9.0\%$ (Highly common in prime Tagamoa and Choueifat student/expatriate apartments).
*   **Tier 2 (Hold Signal):** Net Yield $6.5\% - 8.9\%$ (Standard units in Golden Square compounds).
*   **Tier 3 (Avoid for Yield, Speculative Appreciation):** Net Yield $< 6.5\%$ (Ultra-luxury villas in high-premium compounds).

---

## 2. Capital Appreciation Forecasting (CAGR)
Calculates historical capital velocity to project future exit valuations:

$$\text{Expected Appreciation Rate} = \left( \frac{\text{Current Average Price / SqM}}{\text{Baseline Average Price (5 years ago) / SqM}} \right)^{\frac{1}{5}} - 1$$

In Egypt's current economic climate, capital appreciation in New Cairo (Tagamoa) acts as a critical hedge against inflation. Our agents pitch this CAGR velocity to wealth-preservation investors.

---

## 3. High-Velocity Investment Selector
The platform utilizes this logical filter to rank "Undervalued Asset Deals":

```
IF (Listing Price per SqM < Area Trailing Average per SqM * 0.90) 
   AND (Expected Net Rental Yield >= 8.0%)
   AND (ListingType == "Direct Owner")
THEN
   Trigger Alert("HIGH-VELOCITY OWNER DEAL FOUND") -> Forward to Sierra Agent
```

When this filter triggers, **Sierra Bot** highlights the listing on our website homepage as a **"Premium Investment Opportunity (Direct from Owner)"**, giving our buyers the ultimate competitive edge.

