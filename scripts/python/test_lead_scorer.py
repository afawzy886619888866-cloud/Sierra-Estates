"""Unit tests for the LeadScorer scoring engine in lead-scorer.py.

The module file uses a hyphenated name (`lead-scorer.py`) which cannot be
imported with a normal `import` statement, so it is loaded directly via
importlib from its file path.
"""

import importlib.util
from pathlib import Path

import pytest

_MODULE_PATH = Path(__file__).resolve().parent / "lead-scorer.py"
_spec = importlib.util.spec_from_file_location("lead_scorer", _MODULE_PATH)
assert _spec is not None and _spec.loader is not None
lead_scorer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(lead_scorer)

LeadScorer = lead_scorer.LeadScorer
_parse_amount = lead_scorer._parse_amount


@pytest.fixture
def scorer():
    return LeadScorer()


# --- score_lead: bounds and happy path ---------------------------------------

def test_empty_lead_scores_minimum(scorer):
    # No signal at all -> raw 0, clamped up to the floor of 1.
    assert scorer.score_lead({}) == 1


def test_score_is_clamped_to_ten(scorer):
    # Strongest signal across every dimension exceeds 10 raw and is capped.
    lead = {
        "intent": "ready to book a viewing",  # 3
        "budget": 25_000_000,                  # 3
        "timeline": "this week urgent",        # 2
        "compound": "Mivida",                  # 2
    }
    # raw = 10 -> stays 10
    assert scorer.score_lead(lead) == 10


def test_score_never_below_one(scorer):
    assert scorer.score_lead({"unrelated": "value"}) == 1


def test_typical_mid_tier_lead(scorer):
    lead = {
        "intent": "interested to buy",  # 2
        "budget": 12_000_000,           # 2 (>=10M)
        "timeline": "3 months",         # 1
        "compound": "Some Unknown Place",  # 1 (non-premium but present)
    }
    assert scorer.score_lead(lead) == 6


# --- _score_intent -----------------------------------------------------------

@pytest.mark.parametrize(
    "lead,expected",
    [
        ({"intent": "ready to visit"}, 3),
        ({"status": "serious buyer"}, 3),
        ({"intent": "wants to invest"}, 2),
        ({"notes": "owner occupier looking"}, 2),
        ({"message": "just browsing for now"}, 1),
        ({"intent": "rent a flat"}, 1),
        ({"intent": "xyz"}, 1),  # present but unmatched -> 1
        ({}, 0),                 # nothing present -> 0
    ],
)
def test_score_intent(scorer, lead, expected):
    assert scorer._score_intent(lead) == expected


# --- _score_budget -----------------------------------------------------------

@pytest.mark.parametrize(
    "lead,expected",
    [
        ({"budget": 30_000_000}, 3),
        ({"budget": 20_000_000}, 3),   # boundary inclusive
        ({"budget": 15_000_000}, 2),
        ({"budget": 10_000_000}, 2),   # boundary inclusive
        ({"budget": 5_000_000}, 1),
        ({"budget": 0}, 0),
        ({"price": "12m"}, 2),         # suffix parsing
        ({"max_budget": "8,000,000"}, 1),
        ({"budget": "luxury vip property"}, 3),  # text fallback
        ({}, 0),
    ],
)
def test_score_budget(scorer, lead, expected):
    assert scorer._score_budget(lead) == expected


# --- _score_timeline ---------------------------------------------------------

@pytest.mark.parametrize(
    "lead,expected",
    [
        ({"timeline": "today"}, 2),
        ({"timeline": "this month"}, 2),
        ({"timeline": "6 months"}, 1),
        ({"notes": "looking soon"}, 1),
        ({"timeline": "no rush whatsoever"}, 0),
        ({}, 0),
    ],
)
def test_score_timeline(scorer, lead, expected):
    assert scorer._score_timeline(lead) == expected


# --- _score_compound_target --------------------------------------------------

@pytest.mark.parametrize(
    "lead,expected",
    [
        ({"compound": "Mivida"}, 2),
        ({"compound_target": "katameya dunes villa"}, 2),
        ({"location": "Downtown Cairo"}, 1),  # present, not premium
        ({"compound": ""}, 0),
        ({}, 0),
    ],
)
def test_score_compound_target(scorer, lead, expected):
    assert scorer._score_compound_target(lead) == expected


# --- _parse_amount -----------------------------------------------------------

@pytest.mark.parametrize(
    "value,expected",
    [
        (None, None),
        (5_000_000, 5_000_000.0),
        (12.5, 12.5),
        ("", None),
        ("   ", None),
        ("10m", 10_000_000.0),
        ("2.5m", 2_500_000.0),
        ("500k", 500_000.0),
        ("1,200,000", 1_200_000.0),
        ("EGP 3,000,000", 3_000_000.0),
        ("no digits here", None),
    ],
)
def test_parse_amount(value, expected):
    assert _parse_amount(value) == expected
