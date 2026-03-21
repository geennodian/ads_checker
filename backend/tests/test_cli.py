"""Tests for CLI build-report-url command."""

import io
import sys
from app.cli.commands import cmd_build_report_url


def test_build_report_url_summary(capsys):
    cmd_build_report_url(
        dashboard="summary",
        start="2026-03-01",
        end="2026-03-31",
        base_url="http://localhost:3000",
    )
    out = capsys.readouterr().out.strip()
    assert out == "http://localhost:3000/dashboard/summary?start=2026-03-01&end=2026-03-31"


def test_build_report_url_creative_with_campaign(capsys):
    cmd_build_report_url(
        dashboard="creative",
        start="2026-03-01",
        end="2026-03-31",
        campaign_id="123",
        base_url="http://localhost:3000",
    )
    out = capsys.readouterr().out.strip()
    assert "campaign_id=123" in out
    assert "/dashboard/creative" in out


def test_build_report_url_default_dates(capsys):
    cmd_build_report_url(dashboard="daily", base_url="http://localhost:3000")
    out = capsys.readouterr().out.strip()
    assert "/dashboard/daily?start=" in out
