"""Tests for API endpoints (mocked DB)."""

from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    # Reset cached DB availability for each test
    import app.main as main_mod
    main_mod._db_available = None
    from app.main import app
    return TestClient(app, raise_server_exceptions=False)


def test_health(client):
    with patch("app.main.check_connection", return_value=True):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


def test_summary_mock_fallback(client):
    """Summary endpoint returns mock data when DB is unreachable."""
    with patch("app.main.check_connection", return_value=False):
        resp = client.get("/api/summary?start=2026-03-01&end=2026-03-31")
        assert resp.status_code == 200
        data = resp.json()
        assert "totals" in data
        assert "daily" in data
        assert data["totals"]["impressions"] > 0


def test_campaigns_mock_fallback(client):
    """Campaigns endpoint returns mock data when DB is unreachable."""
    with patch("app.main.check_connection", return_value=False):
        resp = client.get("/api/campaigns?start=2026-03-01&end=2026-03-31")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 3  # 3 mock campaigns
