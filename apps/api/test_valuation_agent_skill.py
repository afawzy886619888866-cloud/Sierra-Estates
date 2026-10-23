"""
Tests for apps/api/valuation_agent_skill.py.

Previously this module — the most complex financial logic in the Python
service — had zero test coverage. Run with:
    cd apps/api && pytest test_valuation_agent_skill.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from valuation_agent_skill import RealEstateValuationAgent  # noqa: E402


def test_villa_with_rent_and_amenities_is_fair_value():
    agent = RealEstateValuationAgent()
    result = agent.analyze({
        "property_type": "villa",
        "size_sqm": 400,
        "offered_rent": 75000,
        "offered_purchase_price": 10500000,
        "amenities": ["private pool", "underground garage"],
    })

    assert result["verdict"] in ("BUY (FAIR VALUE)", "BUY (MASSIVE ARBITRAGE)")
    assert result["valuation_summary"]["annual_income_generated"] == 900000
    metrics = result["investment_metrics"]
    assert metrics["value_add_premiums_detected"] == {
        "private pool": "+10% value lift",
        "underground garage": "+20% value lift",
    }
    assert metrics["total_premium_lift_pct"] == "30%"


def test_administrative_unit_priced_at_residential_rate_flags_arbitrage():
    agent = RealEstateValuationAgent()
    result = agent.analyze({
        "property_type": "administrative",
        "size_sqm": 100,
        "offered_rent": 20000,
        "offered_purchase_price": 1350000,
        "area_residential_avg_sqm_price": 14000,
        "amenities": ["near metro", "bank anchor", "underground parking"],
    })

    metrics = result["investment_metrics"]
    assert metrics["is_arbitrage_play"] is True
    assert metrics["arbitrage_alert"] is not None
    assert result["valuation_summary"]["offered_price_assessment"]["price_per_sqm"] == 13500


def test_overpriced_unit_recommends_negotiate_or_rent():
    agent = RealEstateValuationAgent()
    result = agent.analyze({
        "property_type": "residential",
        "size_sqm": 100,
        "offered_rent": 5000,
        "offered_purchase_price": 20000000,
    })

    assert result["verdict"] == "OVERPRICED (NEGOTIATE OR RENT)"


def test_zero_rent_and_price_does_not_raise():
    # Regression guard: no purchase price and no rent means annual_income is 0,
    # which must not raise (e.g. via a division by zero) — it should fall
    # through to the "no purchase price" target-acquisition branch.
    agent = RealEstateValuationAgent()
    result = agent.analyze({"property_type": "residential"})

    assert result["verdict"] == "BUY (FAIR VALUE)"
    assert result["valuation_summary"]["offered_price_assessment"]["offered_price"] == 0


def test_cap_rate_baselines_match_the_typescript_mirror():
    # These values are hand-mirrored in
    # packages/agents/tools/valuationArbitrageEngine.ts — this pins the
    # Python side so a one-sided edit is caught by CI even though the two
    # implementations aren't otherwise wired together.
    assert RealEstateValuationAgent.CAP_RATE_BASELINES["residential"] == {
        "min": 0.08, "max": 0.10, "label": "8% - 10%",
    }
    assert RealEstateValuationAgent.CAP_RATE_BASELINES["commercial"] == {
        "min": 0.12, "max": 0.15, "label": "12% - 15%",
    }
    assert RealEstateValuationAgent.AMENITY_MULTIPLIERS["underground parking"] == 0.20
    assert RealEstateValuationAgent.AMENITY_MULTIPLIERS["near metro"] == 0.10
