"""FastAPI application serving dashboard API endpoints."""

from datetime import date, timedelta

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from app.db import get_cursor, check_connection
from app.logger import get_logger
from app.mock_data import mock_summary, mock_daily, mock_campaigns, mock_creatives

logger = get_logger(__name__)


_db_available: bool | None = None


def _use_mock() -> bool:
    """Return True when DB is unreachable (demo/dev fallback)."""
    global _db_available
    if _db_available is None:
        _db_available = check_connection()
        if not _db_available:
            logger.warning("DB unavailable — serving mock data for demo.")
    return not _db_available

app = FastAPI(title="Ads Checker API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _default_dates(start: date | None, end: date | None) -> tuple[date, date]:
    if not end:
        end = date.today()
    if not start:
        start = end - timedelta(days=29)
    return start, end


# ---------- Health ----------

@app.get("/health")
def health():
    return {"status": "ok", "db": check_connection()}


# ---------- Summary ----------

@app.get("/api/summary")
def get_summary(
    start: date | None = Query(None),
    end: date | None = Query(None),
):
    start, end = _default_dates(start, end)
    if _use_mock():
        return mock_summary(start, end)
    with get_cursor(commit=False) as cur:
        # KPI totals
        cur.execute(
            """
            SELECT
                COALESCE(SUM(impressions), 0) AS impressions,
                COALESCE(SUM(clicks), 0) AS clicks,
                COALESCE(SUM(cost), 0) AS cost,
                COALESCE(SUM(conversions), 0) AS conversions
            FROM fact_ad_daily
            WHERE date BETWEEN %s AND %s
            """,
            (start, end),
        )
        totals = dict(cur.fetchone())
        imp = totals["impressions"]
        clk = totals["clicks"]
        cst = float(totals["cost"])
        cvs = totals["conversions"]
        totals["ctr"] = clk / imp if imp > 0 else 0
        totals["cpc"] = cst / clk if clk > 0 else 0
        totals["cvr"] = cvs / clk if clk > 0 else 0
        totals["cpa"] = cst / cvs if cvs > 0 else 0

        # Daily series
        cur.execute(
            """
            SELECT date,
                   SUM(impressions) AS impressions,
                   SUM(clicks) AS clicks,
                   SUM(cost) AS cost,
                   SUM(conversions) AS conversions
            FROM fact_ad_daily
            WHERE date BETWEEN %s AND %s
            GROUP BY date ORDER BY date
            """,
            (start, end),
        )
        daily = []
        for row in cur.fetchall():
            r = dict(row)
            r["date"] = r["date"].isoformat()
            r["cost"] = float(r["cost"])
            imp = r["impressions"]
            clk = r["clicks"]
            cst = r["cost"]
            cvs = r["conversions"]
            r["ctr"] = clk / imp if imp > 0 else 0
            r["cpc"] = cst / clk if clk > 0 else 0
            r["cvr"] = cvs / clk if clk > 0 else 0
            r["cpa"] = cst / cvs if cvs > 0 else 0
            daily.append(r)

    return {"start": start.isoformat(), "end": end.isoformat(), "totals": totals, "daily": daily}


# ---------- Daily Trend ----------

@app.get("/api/daily")
def get_daily_trend(
    start: date | None = Query(None),
    end: date | None = Query(None),
):
    start, end = _default_dates(start, end)
    if _use_mock():
        return mock_daily(start, end)
    with get_cursor(commit=False) as cur:
        cur.execute(
            """
            SELECT date,
                   SUM(impressions) AS impressions,
                   SUM(clicks) AS clicks,
                   SUM(cost) AS cost,
                   SUM(conversions) AS conversions
            FROM fact_ad_daily
            WHERE date BETWEEN %s AND %s
            GROUP BY date ORDER BY date
            """,
            (start, end),
        )
        rows = []
        for row in cur.fetchall():
            r = dict(row)
            r["date"] = r["date"].isoformat()
            r["cost"] = float(r["cost"])
            imp = r["impressions"]
            clk = r["clicks"]
            cst = r["cost"]
            cvs = r["conversions"]
            r["ctr"] = clk / imp if imp > 0 else 0
            r["cpc"] = cst / clk if clk > 0 else 0
            r["cvr"] = cvs / clk if clk > 0 else 0
            r["cpa"] = cst / cvs if cvs > 0 else 0
            rows.append(r)
    return {"start": start.isoformat(), "end": end.isoformat(), "data": rows}


# ---------- Campaign ----------

@app.get("/api/campaigns")
def get_campaigns(
    start: date | None = Query(None),
    end: date | None = Query(None),
    sort: str = Query("cost"),
    order: str = Query("desc"),
):
    start, end = _default_dates(start, end)
    if _use_mock():
        return mock_campaigns(start, end)
    allowed_sorts = {"impressions", "clicks", "cost", "conversions", "ctr", "cpc", "cvr", "cpa"}
    sort_col = sort if sort in allowed_sorts else "cost"
    order_dir = "DESC" if order.lower() == "desc" else "ASC"

    with get_cursor(commit=False) as cur:
        cur.execute(
            f"""
            SELECT campaign_id, MAX(campaign_name) AS campaign_name,
                   SUM(impressions) AS impressions,
                   SUM(clicks) AS clicks,
                   SUM(cost) AS cost,
                   SUM(conversions) AS conversions
            FROM fact_ad_daily
            WHERE date BETWEEN %s AND %s
            GROUP BY campaign_id
            ORDER BY {sort_col} {order_dir}
            """,
            (start, end),
        )
        rows = []
        for row in cur.fetchall():
            r = dict(row)
            r["cost"] = float(r["cost"])
            imp = r["impressions"]
            clk = r["clicks"]
            cst = r["cost"]
            cvs = r["conversions"]
            r["ctr"] = clk / imp if imp > 0 else 0
            r["cpc"] = cst / clk if clk > 0 else 0
            r["cvr"] = cvs / clk if clk > 0 else 0
            r["cpa"] = cst / cvs if cvs > 0 else 0
            rows.append(r)
    return {"start": start.isoformat(), "end": end.isoformat(), "data": rows}


# ---------- Creative ----------

@app.get("/api/creatives")
def get_creatives(
    start: date | None = Query(None),
    end: date | None = Query(None),
    campaign_id: str | None = Query(None),
):
    start, end = _default_dates(start, end)
    if _use_mock():
        return mock_creatives(start, end, campaign_id)
    with get_cursor(commit=False) as cur:
        where = "WHERE date BETWEEN %s AND %s"
        params: list = [start, end]
        if campaign_id:
            where += " AND campaign_id = %s"
            params.append(campaign_id)

        cur.execute(
            f"""
            SELECT creative_id, MAX(creative_name) AS creative_name,
                   campaign_id, MAX(campaign_name) AS campaign_name,
                   SUM(impressions) AS impressions,
                   SUM(clicks) AS clicks,
                   SUM(cost) AS cost,
                   SUM(conversions) AS conversions
            FROM fact_ad_daily
            {where}
            GROUP BY creative_id, campaign_id
            ORDER BY cost DESC
            """,
            params,
        )
        rows = []
        for row in cur.fetchall():
            r = dict(row)
            r["cost"] = float(r["cost"])
            imp = r["impressions"]
            clk = r["clicks"]
            cst = r["cost"]
            cvs = r["conversions"]
            r["ctr"] = clk / imp if imp > 0 else 0
            r["cpc"] = cst / clk if clk > 0 else 0
            r["cvr"] = cvs / clk if clk > 0 else 0
            r["cpa"] = cst / cvs if cvs > 0 else 0
            rows.append(r)
    return {"start": start.isoformat(), "end": end.isoformat(), "data": rows}
