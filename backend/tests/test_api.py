"""Tests for API endpoints (mocked DB)."""

from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


def test_health(client):
    with patch("app.main.check_connection", return_value=True):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


def test_summary_no_db(client):
    """Summary endpoint returns error when DB is unreachable."""
    with patch("app.main.get_cursor") as mock_cursor:
        mock_cursor.side_effect = Exception("no connection")
        resp = client.get("/api/summary?start=2026-03-01&end=2026-03-31")
        assert resp.status_code == 500


def test_campaigns_no_db(client):
    with patch("app.main.get_cursor") as mock_cursor:
        mock_cursor.side_effect = Exception("no connection")
        resp = client.get("/api/campaigns?start=2026-03-01&end=2026-03-31")
        assert resp.status_code == 500
