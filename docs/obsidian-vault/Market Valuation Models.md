# 📐 Market Valuation Models & Pricing per Square Meter
> **Path:** `docs/obsidian-vault/Market Valuation Models.md`  
> **Parent Node:** `[[Sierra Estates Memory Engine]]`

This document details our base valuation matrices to evaluate whether a property listing in New Cairo (Egypt) is priced correctly.

---

## 1. Average Valuation Baseline (EGP per Square Meter)

Our big data engines utilize these trailing averages to evaluate property listings in New Cairo (Tagamoa):

| District / Compound Cluster | Average Price / SqM (Resale) | Average Price / SqM (Rent Annual / SqM) | Average Rental Yield |
|---|---|---|---|
| **Golden Square (Mivida, Palm Hills)** | EGP 75,000 | EGP 6,800 | ~9.0% |
| **Tagamoa Central (El Khames)** | EGP 55,000 | EGP 5,500 | ~10.0% |
| **Choueifat (Luxury Residential)** | EGP 85,000 | EGP 7,200 | ~8.5% |
| **Beit El Watan (Expansion Zone)** | EGP 38,000 | EGP 3,200 | ~8.4% |

---

## 2. Deal Classification Metric

Our AI Concierge engines rank properties into three clear valuation brackets:

### 🟢 1. The "Good Deal" (Undervalued)
*   **Threshold:** Listed Price/SqM is **$> 10\%$ below the trailing 12-month area average**.
*   **Action:** Sierra Bot automatically pins this to the client's recommendation feed, tags it as a "Good Deal" on the website, and highlights it for owner acquisition.

### 🟡 2. Fair Value
*   **Threshold:** Listed Price/SqM is **within $\pm 10\%$ of the area average**.
*   **Action:** Standard display.

### 🔴 3. Overpriced
*   **Threshold:** Listed Price/SqM is **$> 10\%$ above the area average**.
*   **Action:** Leila Bot automatically initiates a negotiation prompt with the owner to request price correction before active publishing.

---

## 3. Rent vs. Buy Forecasting Matrix

The engine calculates the Rent-to-Price ratio to advise clients:

$$\text{Rent-to-Price Ratio} = \frac{\text{Average Purchase Price}}{\text{Average Annual Rent}}$$

*   **Ratio $< 10$:** **"Strong Buy Signal"** — Buy is significantly cheaper than renting.
*   **Ratio $> 15$:** **"Rent Signal"** — Property prices are inflated relative to rents; renting is financially optimal.

