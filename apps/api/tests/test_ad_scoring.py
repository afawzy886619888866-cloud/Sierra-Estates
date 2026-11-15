"""
Sierra Estates — Pytest Suite for LightGBM Ad Scoring Router
Drop into: apps/api/tests/test_ad_scoring.py
Run: pytest apps/api/tests/test_ad_scoring.py -v
"""

from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from ad_scoring_router import router as ad_scoring_router

app = FastAPI()
app.include_router(ad_scoring_router)
client = TestClient(app)


def _make_sample_rows(n: int, with_leads: bool = False) -> list[dict]:
    compounds = ["Madinaty", "Al Rehab", "Hyde Park", "Mivida", "Fifth Square"]
    rows = []
    for i in range(n):
        rows.append(
            {
                "id": f"prop-{i}",
                "unit_code": f"SE-{1000 + i}",
                "title": "Luxury 3BR Apartment in Fifth Settlement Direct Owner" if i % 2 == 0 else "Apt",
                "description": ("Spacious unit with landscape view. " * 25) if i % 2 == 0 else "Short desc",
                "compound": compounds[i % len(compounds)],
                "property_type": "Apartment" if i % 3 else "Villa",
                "purpose": "Rent" if i % 2 == 0 else "Sale",
                "finishing": "Fully Finished",
                "furnishing": "Furnished" if i % 2 == 0 else "Unfurnished",
                "source_type": "owner" if i % 2 == 0 else "broker",
                "area_sqm": 150 + (i % 5) * 30,
                "bedrooms": 3,
                "bathrooms": 2,
                "price_egp": 35000 + (i % 5) * 10000 if i % 2 == 0 else 8500000,
                "photo_count": 12 if i % 2 == 0 else 0,
                "virtual_tour_url": "https://tour.example.com/1" if i % 4 == 0 else None,
                "lead_count": (10 + (i % 7) * 3) if with_leads else 0,
                "status": "available",
            }
        )
    return rows


def _mock_supabase(rows: list[dict]) -> MagicMock:
    sb = MagicMock()
    select_chain = sb.table.return_value.select.return_value.neq.return_value
    select_chain.execute.return_value = MagicMock(data=rows)
    sb.table.return_value.upsert.return_value.execute.return_value = MagicMock(data=[])
    return sb


def test_rejects_invalid_n8n_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("N8N_WEBHOOK_SECRET", "super-secret")
    res = client.post(
        "/api/ml/train-and-score",
        json={"dry_run": True},
        headers={"X-N8N-Secret": "wrong-secret"},
    )
    assert res.status_code == 401


def test_cold_start_heuristic_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("N8N_WEBHOOK_SECRET", "super-secret")
    rows = _make_sample_rows(10, with_leads=False)
    with patch("ad_scoring_router.get_supabase", return_value=_mock_supabase(rows)):
        res = client.post(
            "/api/ml/train-and-score",
            json={"min_labeled_rows": 30, "dry_run": True},
            headers={"X-N8N-Secret": "super-secret"},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["mode"] == "cold_start_heuristic"
    assert body["total_units_scored"] == 10
    assert len(body["top_criteria"]) > 0


def test_lightgbm_training_mode(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("N8N_WEBHOOK_SECRET", "super-secret")
    monkeypatch.setenv("ML_MODEL_DIR", str(tmp_path))
    rows = _make_sample_rows(40, with_leads=True)
    with patch("ad_scoring_router.get_supabase", return_value=_mock_supabase(rows)):
        res = client.post(
            "/api/ml/train-and-score",
            json={"min_labeled_rows": 30, "dry_run": False, "batch_size": 20},
            headers={"X-N8N-Secret": "super-secret"},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["mode"] == "lightgbm"
    assert body["total_units_scored"] == 40
    assert body["labeled_rows_used"] == 40
    assert len(body["top_units"]) == 10