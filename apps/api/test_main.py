"""
Tests for the Sierra Estates Python API (apps/api/main.py).

Run with:
    cd apps/api && pytest -v

These tests use FastAPI's TestClient (backed by httpx) so they exercise the
real ASGI app end-to-end without needing a live server.
"""
# ruff: noqa: E402, F811
# pylint: disable=redefined-outer-name, missing-docstring, import-error, wrong-import-position

from __future__ import annotations

import sys
from pathlib import Path

import pytest  # type: ignore
from fastapi.testclient import TestClient  # type: ignore

# Make sure apps/api is on the path so we can import main + property_finder_sync
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from main import PortfolioAsset, app  # noqa: E402
from property_finder_sync import PropertyFinderSyncHub  # noqa: E402


@pytest.fixture
def api_client() -> TestClient:
    """Return a TestClient instance for the FastAPI app."""
    return TestClient(app)


# ──────────────────────────────────────────────────────────────────────────────
# Health endpoint
# ──────────────────────────────────────────────────────────────────────────────
class TestHealth:
    """Test suite for the health check endpoint."""

    def test_health_returns_ok(self, api_client: TestClient):
        """Ensure /health returns 200 OK and expected structure."""
        resp = api_client.get("/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["service"] == "apps/api"

    def test_health_is_get_only(self, api_client: TestClient):
        """Ensure /health only accepts GET requests."""
        for method in ("post", "put", "delete", "patch"):
            resp = api_client.request(method, "/health")
            assert resp.status_code in (405, 404), (
                f"{method.upper()} /health should not be allowed: got {resp.status_code}"
            )


# ──────────────────────────────────────────────────────────────────────────────
# /property-finder/format
# ──────────────────────────────────────────────────────────────────────────────
class TestFormatAsset:
    """Test suite for formatting property assets."""

    def test_format_asset_happy_path(self, api_client: TestClient):
        """Test formatting an asset with full data."""
        payload = {
            "id": "SB-UIPT-001",
            "title_en": "Golf Uptown Cairo Penthouse",
            "title_ar": "بنتهاوس أبتاون كايرو المطل على الجولف",
            "price": 45000000,
            "location": "Uptown Cairo",
        }
        resp = api_client.post("/property-finder/format", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert body == {
            "reference": "SB-UIPT-001",
            "title_en": "Golf Uptown Cairo Penthouse",
            "title_ar": "بنتهاوس أبتاون كايرو المطل على الجولف",
            "offering_type": "investment",
            "price": 45000000,
            "location": "Uptown Cairo",
        }

    def test_format_asset_requires_id(self, api_client: TestClient):
        """Test that missing ID returns 422."""
        # Missing required field "id" → Pydantic 422
        resp = api_client.post("/property-finder/format", json={"title_en": "No ID"})
        assert resp.status_code == 422

    def test_format_asset_accepts_partial_fields(self, api_client: TestClient):
        """Test that partial fields are accepted as long as ID is present."""
        # Only id is required; everything else is optional
        resp = api_client.post("/property-finder/format", json={"id": "X-1"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["reference"] == "X-1"
        assert body["title_en"] is None
        assert body["title_ar"] is None
        assert body["price"] is None
        assert body["location"] is None
        # offering_type is hard-coded by the hub
        assert body["offering_type"] == "investment"

    def test_format_asset_rejects_non_object_body(self, api_client: TestClient):
        """Test that non-object payload returns 422."""
        # Sending a JSON array instead of object → 422
        resp = api_client.post("/property-finder/format", json=[{"id": "X"}])
        assert resp.status_code == 422

    def test_format_asset_rejects_wrong_type_for_id(self, api_client: TestClient):
        """Test that wrong type for ID returns 422."""
        # id must be a string
        resp = api_client.post("/property-finder/format", json={"id": 123})
        assert resp.status_code == 422



# ──────────────────────────────────────────────────────────────────────────────
# /property-finder/sync
# ──────────────────────────────────────────────────────────────────────────────
class TestSyncAssets:
    """Test suite for syncing property assets."""

    def test_sync_single_asset(self, api_client: TestClient):
        """Test syncing a single asset."""
        resp = api_client.post(
            "/property-finder/sync",
            json={"assets": [{"id": "A1", "title_en": "Villa"}]},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["sync_status"] == "success"
        assert body["synced_count"] == 1
        assert not body["errors"]

    def test_sync_multiple_assets(self, api_client: TestClient):
        """Test syncing multiple assets."""
        assets = [{"id": f"A{i}"} for i in range(5)]
        resp = api_client.post("/property-finder/sync", json={"assets": assets})
        assert resp.status_code == 200
        body = resp.json()
        assert body["synced_count"] == 5

    def test_sync_empty_list_is_allowed(self, api_client: TestClient):
        """Test that syncing an empty list works and returns 0 synced."""
        # Pydantic accepts empty list — sync_hub will report 0 synced
        resp = api_client.post("/property-finder/sync", json={"assets": []})
        assert resp.status_code == 200
        assert resp.json()["synced_count"] == 0

    def test_sync_requires_assets_field(self, api_client: TestClient):
        """Test that the assets field is required."""
        resp = api_client.post("/property-finder/sync", json={})
        assert resp.status_code == 422

    def test_sync_rejects_malformed_asset(self, api_client: TestClient):
        """Test that malformed assets return 422."""
        # Missing required "id" on one of the assets
        resp = api_client.post(
            "/property-finder/sync",
            json={"assets": [{"id": "OK"}, {"title_en": "no id"}]},
        )
        assert resp.status_code == 422



# ──────────────────────────────────────────────────────────────────────────────
# PropertyFinderSyncHub unit tests (no FastAPI, no network)
# ──────────────────────────────────────────────────────────────────────────────
class TestPropertyFinderSyncHub:
    """Test suite for PropertyFinderSyncHub."""

    def test_format_portfolio_asset_returns_all_fields(self):
        """Test format_portfolio_asset with all fields present."""
        hub = PropertyFinderSyncHub()
        out = hub.format_portfolio_asset(
            {
                "id": "X",
                "title_en": "EN",
                "title_ar": "AR",
                "price": 100,
                "location": "Cairo",
            }
        )
        assert out == {
            "reference": "X",
            "title_en": "EN",
            "title_ar": "AR",
            "offering_type": "investment",
            "price": 100,
            "location": "Cairo",
        }

    def test_format_portfolio_asset_handles_missing_keys(self):
        """Test format_portfolio_asset handles missing keys gracefully."""
        hub = PropertyFinderSyncHub()
        out = hub.format_portfolio_asset({})
        assert out["reference"] is None
        assert out["title_en"] is None
        assert out["price"] is None
        # offering_type is always set
        assert out["offering_type"] == "investment"

    def test_trigger_batch_sync_returns_success_shape(self):
        """Test trigger_batch_sync returns expected shape."""
        hub = PropertyFinderSyncHub()
        out = hub.trigger_batch_sync([{"id": "1"}, {"id": "2"}, {"id": "3"}])
        assert out["sync_status"] == "success"
        assert out["synced_count"] == 3
        assert isinstance(out["errors"], list)
        assert not out["errors"]

    def test_trigger_batch_sync_zero_assets(self):
        """Test trigger_batch_sync with zero assets."""
        hub = PropertyFinderSyncHub()
        out = hub.trigger_batch_sync([])
        assert out["synced_count"] == 0

    def test_endpoint_is_set_to_propertyfinder_ae(self):
        """Test endpoint defaults to propertyfinder.ae."""
        hub = PropertyFinderSyncHub()
        assert "propertyfinder.ae" in hub.api_endpoint



# ──────────────────────────────────────────────────────────────────────────────
# Pydantic model contract
# ──────────────────────────────────────────────────────────────────────────────
class TestPortfolioAssetModel:
    """Test suite for PortfolioAsset Pydantic model."""

    def test_id_is_required(self):
        """Test that ID is required."""
        with pytest.raises(Exception):
            PortfolioAsset()  # type: ignore[call-arg]

    def test_id_must_be_string(self):
        """Test that ID must be a string."""
        with pytest.raises(Exception):
            PortfolioAsset(id=123)  # type: ignore[arg-type]

    def test_optional_fields_default_to_none(self):
        """Test that optional fields default to None."""
        a = PortfolioAsset(id="X")
        assert a.title_en is None
        assert a.title_ar is None
        assert a.price is None
        assert a.location is None

    def test_price_accepts_int_or_float(self):
        """Test that price accepts int or float."""
        PortfolioAsset(id="X", price=100)
        PortfolioAsset(id="X", price=99.99)
