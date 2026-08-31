"""
Tests for the error/auth branches of apps/api/property_finder_sync.py that
test_main.py's TestPropertyFinderSyncHub didn't reach: without credentials
or network mocking, trigger_batch_sync always takes the "skipped" branch, so
`assert out["sync_status"] in ("success", "skipped", "error")` passed
regardless of which branch actually ran. These tests configure fake
credentials and mock httpx so the HTTPStatusError / network-error / token
refresh branches are actually exercised.

Run with:
    cd apps/api && pytest test_property_finder_sync.py -v
"""
from __future__ import annotations

import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from property_finder_sync import PropertyFinderSyncHub  # noqa: E402


def _hub_with_credentials() -> PropertyFinderSyncHub:
    hub = PropertyFinderSyncHub()
    hub.api_key = "test-key"
    hub.api_secret = "test-secret"
    return hub


def _mock_response(status_code: int, json_body: dict, raise_for_status_error: Exception | None = None):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_body
    resp.text = str(json_body)
    if raise_for_status_error is not None:
        resp.raise_for_status.side_effect = raise_for_status_error
    else:
        resp.raise_for_status.return_value = None
    return resp


class TestAccessTokenCaching:
    def test_fetches_and_caches_token(self):
        hub = _hub_with_credentials()
        token_response = _mock_response(200, {"accessToken": "tok-1", "expiresIn": 1800})

        with patch("property_finder_sync.httpx.post", return_value=token_response) as mock_post:
            token = hub._get_access_token()
            assert token == "tok-1"
            assert mock_post.call_count == 1

            # Second call within the expiry window must reuse the cached token,
            # not re-hit the network.
            token_again = hub._get_access_token()
            assert token_again == "tok-1"
            assert mock_post.call_count == 1

    def test_refreshes_expired_token(self):
        hub = _hub_with_credentials()
        first = _mock_response(200, {"accessToken": "tok-1", "expiresIn": 1800})

        with patch("property_finder_sync.httpx.post", return_value=first):
            hub._get_access_token()

        # Force the cached token to look expired.
        hub._token_expiry = time.time() - 1

        second = _mock_response(200, {"accessToken": "tok-2", "expiresIn": 1800})
        with patch("property_finder_sync.httpx.post", return_value=second) as mock_post:
            token = hub._get_access_token()
            assert token == "tok-2"
            assert mock_post.call_count == 1


class TestTriggerBatchSyncErrorBranches:
    def test_http_status_error_is_caught_and_reported(self):
        hub = _hub_with_credentials()
        token_response = _mock_response(200, {"accessToken": "tok-1", "expiresIn": 1800})

        import httpx

        error_response = _mock_response(422, {"error": "bad listing payload"})
        http_error = httpx.HTTPStatusError("bad request", request=MagicMock(), response=error_response)
        batch_response = _mock_response(422, {}, raise_for_status_error=http_error)

        with patch("property_finder_sync.httpx.post", side_effect=[token_response, batch_response]):
            out = hub.trigger_batch_sync([{"id": "1"}])

        assert out["sync_status"] == "error"
        assert out["synced_count"] == 0
        assert "error" in out

    def test_network_error_is_caught_and_reported(self):
        hub = _hub_with_credentials()
        token_response = _mock_response(200, {"accessToken": "tok-1", "expiresIn": 1800})

        with patch(
            "property_finder_sync.httpx.post",
            side_effect=[token_response, OSError("connection reset")],
        ):
            out = hub.trigger_batch_sync([{"id": "1"}])

        assert out["sync_status"] == "error"
        assert out["synced_count"] == 0
        assert "connection reset" in out["error"]

    def test_successful_sync_with_credentials_hits_the_success_branch(self):
        hub = _hub_with_credentials()
        token_response = _mock_response(200, {"accessToken": "tok-1", "expiresIn": 1800})
        batch_response = _mock_response(200, {"accepted": 2})

        with patch("property_finder_sync.httpx.post", side_effect=[token_response, batch_response]):
            out = hub.trigger_batch_sync([{"id": "1"}, {"id": "2"}])

        assert out["sync_status"] == "success"
        assert out["synced_count"] == 2
        assert out["pf_response"] == {"accepted": 2}

    def test_missing_credentials_skips_without_hitting_the_network(self):
        hub = PropertyFinderSyncHub()
        hub.api_key = ""
        hub.api_secret = ""

        with patch("property_finder_sync.httpx.post") as mock_post:
            out = hub.trigger_batch_sync([{"id": "1"}])

        mock_post.assert_not_called()
        assert out == {
            "sync_status": "skipped",
            "reason": "credentials_not_configured",
            "synced_count": 0,
        }
