"""Generate mock data for demo/development when DB is unavailable."""

import random
from datetime import date, timedelta


def _calc_rates(imp: int, clk: int, cost: float, cvs: int) -> dict:
    return {
        "ctr": clk / imp if imp > 0 else 0,
        "cpc": cost / clk if clk > 0 else 0,
        "cvr": cvs / clk if clk > 0 else 0,
        "cpa": cost / cvs if cvs > 0 else 0,
    }


_CAMPAIGNS = [
    ("camp_001", "LP獲得キャンペーン"),
    ("camp_002", "リタゲキャンペーン"),
    ("camp_003", "ブランド認知キャンペーン"),
]

_CREATIVES = [
    ("cr_001", "動画広告A", 15000, 0.025, 45.0, 0.03),
    ("cr_002", "カルーセル広告B", 12000, 0.032, 38.0, 0.025),
    ("cr_003", "静止画広告C", 8000, 0.018, 55.0, 0.02),
    ("cr_004", "UGC広告D", 10000, 0.028, 42.0, 0.035),
    ("cr_005", "リール広告E", 18000, 0.022, 50.0, 0.015),
    ("cr_006", "ストーリー広告F", 9000, 0.030, 35.0, 0.028),
]


def _gen_daily_rows(start: date, end: date) -> list[dict]:
    """Generate per-day aggregated rows."""
    rows = []
    d = start
    while d <= end:
        imp = clk = cvs = 0
        cost = 0.0
        for _, _, base_imp, ctr_rate, cpc_rate, cvr_rate in _CREATIVES:
            for _ in _CAMPAIGNS:
                day_imp = int(base_imp * (0.8 + random.random() * 0.4))
                day_clk = int(day_imp * ctr_rate)
                day_cost = round(day_clk * cpc_rate, 2)
                day_cvs = max(1, int(day_clk * cvr_rate))
                imp += day_imp
                clk += day_clk
                cost += day_cost
                cvs += day_cvs
        row = {"date": d.isoformat(), "impressions": imp, "clicks": clk, "cost": cost, "conversions": cvs}
        row.update(_calc_rates(imp, clk, cost, cvs))
        rows.append(row)
        d += timedelta(days=1)
    return rows


def mock_summary(start: date, end: date) -> dict:
    daily = _gen_daily_rows(start, end)
    imp = sum(r["impressions"] for r in daily)
    clk = sum(r["clicks"] for r in daily)
    cost = sum(r["cost"] for r in daily)
    cvs = sum(r["conversions"] for r in daily)
    totals = {"impressions": imp, "clicks": clk, "cost": cost, "conversions": cvs}
    totals.update(_calc_rates(imp, clk, cost, cvs))
    return {"start": start.isoformat(), "end": end.isoformat(), "totals": totals, "daily": daily}


def mock_daily(start: date, end: date) -> dict:
    return {"start": start.isoformat(), "end": end.isoformat(), "data": _gen_daily_rows(start, end)}


def mock_campaigns(start: date, end: date) -> dict:
    rows = []
    for cid, cname in _CAMPAIGNS:
        imp = clk = cvs = 0
        cost = 0.0
        d = start
        while d <= end:
            for _, _, base_imp, ctr_rate, cpc_rate, cvr_rate in _CREATIVES:
                day_imp = int(base_imp * (0.8 + random.random() * 0.4))
                day_clk = int(day_imp * ctr_rate)
                imp += day_imp
                clk += day_clk
                cost += round(day_clk * cpc_rate, 2)
                cvs += max(1, int(day_clk * cvr_rate))
            d += timedelta(days=1)
        row = {"campaign_id": cid, "campaign_name": cname, "impressions": imp, "clicks": clk, "cost": cost, "conversions": cvs}
        row.update(_calc_rates(imp, clk, cost, cvs))
        rows.append(row)
    rows.sort(key=lambda r: r["cost"], reverse=True)
    return {"start": start.isoformat(), "end": end.isoformat(), "data": rows}


def mock_creatives(start: date, end: date, campaign_id: str | None = None) -> dict:
    rows = []
    campaigns = [(cid, cn) for cid, cn in _CAMPAIGNS if not campaign_id or cid == campaign_id]
    for cid, cname in campaigns:
        for cr_id, cr_name, base_imp, ctr_rate, cpc_rate, cvr_rate in _CREATIVES:
            imp = clk = cvs = 0
            cost = 0.0
            d = start
            while d <= end:
                day_imp = int(base_imp * (0.8 + random.random() * 0.4))
                day_clk = int(day_imp * ctr_rate)
                imp += day_imp
                clk += day_clk
                cost += round(day_clk * cpc_rate, 2)
                cvs += max(1, int(day_clk * cvr_rate))
                d += timedelta(days=1)
            row = {
                "creative_id": cr_id, "creative_name": cr_name,
                "campaign_id": cid, "campaign_name": cname,
                "impressions": imp, "clicks": clk, "cost": cost, "conversions": cvs,
            }
            row.update(_calc_rates(imp, clk, cost, cvs))
            rows.append(row)
    rows.sort(key=lambda r: r["cost"], reverse=True)
    return {"start": start.isoformat(), "end": end.isoformat(), "data": rows}
