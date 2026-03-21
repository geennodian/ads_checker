"""Tests for API endpoints (mocked DB)."""

from unittest.mock import patch
import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    import app.main as main_mod
    main_mod._db_available = None
    from app.main import app
    return TestClient(app, raise_server_exceptions=False)


def test_health(client):
    with patch("app.main.check_connection", return_value=True):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


def test_auth_status(client):
    resp = client.get("/api/auth-status")
    assert resp.status_code == 200
    assert "auth_required" in resp.json()


def test_summary_mock_fallback(client):
    """Summary endpoint returns mock data when DB is unreachable."""
    with patch("app.main.check_connection", return_value=False), \
         patch("app.main._check_auth"):
        resp = client.get("/api/summary?start=2026-03-01&end=2026-03-31")
        assert resp.status_code == 200
        data = resp.json()
        assert "totals" in data
        assert data["totals"]["impressions"] > 0


def test_campaigns_mock_fallback(client):
    """Campaigns endpoint returns mock data when DB is unreachable."""
    with patch("app.main.check_connection", return_value=False), \
         patch("app.main._check_auth"):
        resp = client.get("/api/campaigns?start=2026-03-01&end=2026-03-31")
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 3


def test_login_wrong_password(client):
    """Login rejects wrong password."""
    with patch("app.main.verify_password", return_value=None), \
         patch("app.main.settings") as mock_settings:
        mock_settings.dashboard_password = "some-pw"
        resp = client.post("/api/login", json={"password": "wrong"})
        assert resp.status_code == 401


def test_login_correct_password(client):
    """Login accepts correct password and returns token."""
    with patch("app.main.verify_password", return_value="fake-token-123"), \
         patch("app.main.settings") as mock_settings:
        mock_settings.dashboard_password = "test-pw"
        resp = client.post("/api/login", json={"password": "test-pw"})
        assert resp.status_code == 200
        assert resp.json()["token"] == "fake-token-123"


def test_api_requires_auth(client):
    """API endpoints return 401 without token when auth is enabled."""
    with patch("app.main.settings") as mock_settings, \
         patch("app.main.is_valid_token", return_value=False):
        mock_settings.dashboard_password = "some-pw"
        resp = client.get("/api/summary?start=2026-03-01&end=2026-03-31")
        assert resp.status_code == 401
