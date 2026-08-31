"""
valuation_agent_skill.py

Real Estate Valuation & Arbitrage Analyzer Agent Skill (Python).
Implements:
1. Income Capitalization Engine (Cap Rates 8% - 15%)
2. 10-12 Year Payback Rule
3. Value-Add Multipliers (+20% garage, +15% bank anchor, +10% metro)
4. Commercial-to-Residential Arbitrage Detector
"""

from typing import Dict, Any, List, Optional

class RealEstateValuationAgent:
    # Mirrors CAP_RATE_BASELINES / AMENITY_MULTIPLIERS in
    # packages/agents/tools/valuationArbitrageEngine.ts. The two are not
    # wired together (Python microservice vs. TS monorepo package), so these
    # must be changed in both places if cap-rate or premium policy changes.
    CAP_RATE_BASELINES = {
        "residential": {"min": 0.08, "max": 0.10, "label": "8% - 10%"},
        "administrative": {"min": 0.10, "max": 0.12, "label": "10% - 12%"},
        "medical": {"min": 0.10, "max": 0.12, "label": "10% - 12%"},
        "commercial": {"min": 0.12, "max": 0.15, "label": "12% - 15%"},
        "retail": {"min": 0.12, "max": 0.15, "label": "12% - 15%"},
    }

    AMENITY_MULTIPLIERS = {
        "underground parking": 0.20,
        "underground garage": 0.20,
        "bank anchor": 0.15,
        "institutional neighbor": 0.15,
        "near metro": 0.10,
        "metro proximity": 0.10,
        "commercial license": 0.15,
        "private pool": 0.10,
        "lake view": 0.10,
    }

    def __init__(self, currency: str = "EGP"):
        self.currency = currency

    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raw_type = str(data.get("property_type", "residential")).lower()
        type_key = next((k for k in self.CAP_RATE_BASELINES if k in raw_type), "residential")
        baseline = self.CAP_RATE_BASELINES[type_key]

        monthly_rent = data.get("offered_rent", 0)
        purchase_price = data.get("offered_purchase_price", 0)

        if not monthly_rent and purchase_price:
            monthly_rent = purchase_price / 140

        annual_income = monthly_rent * 12

        # 1. Income Capitalization
        conservative_val = round(annual_income / baseline["max"])
        optimistic_val = round(annual_income / baseline["min"])

        # 2. Amenities & Value-Add Lifts
        total_lift = 0.0
        detected_amenities = {}
        for amenity in data.get("amenities", []):
            lower_am = str(amenity).lower()
            for key, boost in self.AMENITY_MULTIPLIERS.items():
                if key in lower_am:
                    detected_amenities[key] = f"+{int(boost * 100)}% value lift"
                    total_lift += boost

        premium_conservative = round(conservative_val * (1 + total_lift))
        premium_optimistic = round(optimistic_val * (1 + total_lift))

        # 3. Payback & Cap Rate
        payback_years = None
        implied_cap_rate = None
        price_per_sqm = None

        if purchase_price and purchase_price > 0:
            if annual_income > 0:
                payback_years = round(purchase_price / annual_income, 1)
                implied_cap_rate = round((annual_income / purchase_price) * 100, 2)
            size_sqm = data.get("size_sqm", 0)
            if size_sqm:
                price_per_sqm = round(purchase_price / size_sqm)

        # 4. Arbitrage Play Detector
        is_arbitrage = False
        arbitrage_alert = None
        area_res_sqm = data.get("area_residential_avg_sqm_price", 0)
        if type_key in ["administrative", "commercial", "medical"] and price_per_sqm and area_res_sqm:
            if price_per_sqm <= area_res_sqm * 1.05:
                is_arbitrage = True
                arbitrage_alert = (
                    f"CRITICAL ARBITRAGE ALERT: Buying {type_key} at residential price "
                    f"({price_per_sqm:,} {self.currency}/sqm) commanding commercial rental yields."
                )

        # 5. Verdict
        if purchase_price:
            if payback_years is not None and payback_years < 8.0:
                status = "Highly Undervalued / Massive Arbitrage"
                verdict = "BUY (MASSIVE ARBITRAGE)"
            elif purchase_price <= premium_optimistic and (payback_years is None or payback_years <= 12.0):
                status = "Fair Market Value"
                verdict = "BUY (FAIR VALUE)"
            else:
                status = "Overpriced"
                verdict = "OVERPRICED (NEGOTIATE OR RENT)"
        else:
            status = "Target Acquisition Valuation"
            verdict = "BUY (FAIR VALUE)"

        return {
            "valuation_summary": {
                "property_type": type_key,
                "annual_income_generated": round(annual_income),
                "calculated_fair_value_range": {
                    "conservative_cap_value": conservative_val,
                    "optimistic_cap_value": optimistic_val,
                    "premium_adjusted_conservative": premium_conservative,
                    "premium_adjusted_optimistic": premium_optimistic,
                },
                "offered_price_assessment": {
                    "offered_price": purchase_price,
                    "implied_cap_rate": f"{implied_cap_rate}%" if implied_cap_rate else None,
                    "price_per_sqm": price_per_sqm,
                    "status": status,
                }
            },
            "investment_metrics": {
                "payback_period_years": payback_years,
                "target_cap_rate_baseline": baseline["label"],
                "total_premium_lift_pct": f"{int(total_lift * 100)}%",
                "value_add_premiums_detected": detected_amenities,
                "arbitrage_alert": arbitrage_alert,
                "is_arbitrage_play": is_arbitrage,
            },
            "verdict": verdict
        }

if __name__ == "__main__":
    agent = RealEstateValuationAgent()
    # Test 1: Shorouk Springs Villa
    res1 = agent.analyze({
        "property_type": "villa",
        "size_sqm": 400,
        "location": "Shorouk Springs",
        "offered_rent": 75000,
        "offered_purchase_price": 10500000,
        "amenities": ["private pool", "underground garage"]
    })
    print("Test 1 (Shorouk Springs):", res1["verdict"], "Payback:", res1["investment_metrics"]["payback_period_years"])

    # Test 2: Cairo Plaza Admin Unit
    res2 = agent.analyze({
        "property_type": "administrative",
        "size_sqm": 100,
        "location": "Cairo Plaza",
        "offered_rent": 20000,
        "offered_purchase_price": 1350000,
        "area_residential_avg_sqm_price": 14000,
        "amenities": ["near metro", "bank anchor", "underground parking"]
    })
    print("Test 2 (Cairo Plaza):", res2["verdict"], "Payback:", res2["investment_metrics"]["payback_period_years"])
