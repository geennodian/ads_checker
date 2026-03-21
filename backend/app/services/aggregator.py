"""Aggregate fact_ad_daily into mart tables."""

from app.db import get_cursor
from app.logger import get_logger

logger = get_logger(__name__)

# Safe division helper used in SQL
_SAFE_DIV = """
    CASE WHEN {denom} > 0 THEN {numer}::NUMERIC / {denom} ELSE 0 END
"""


def _safe_div(numer: str, denom: str) -> str:
    return _SAFE_DIV.format(numer=numer, denom=denom)


def aggregate_summary_daily() -> int:
    """Rebuild mart_summary_daily from fact_ad_daily."""
    with get_cursor() as cur:
        cur.execute("DELETE FROM mart_summary_daily")
        cur.execute(f"""
            INSERT INTO mart_summary_daily
                (date, source, impressions, clicks, cost, conversions, ctr, cpc, cvr, cpa)
            SELECT
                date, source,
                SUM(impressions), SUM(clicks), SUM(cost), SUM(conversions),
                {_safe_div('SUM(clicks)', 'SUM(impressions)')},
                {_safe_div('SUM(cost)', 'SUM(clicks)')},
                {_safe_div('SUM(conversions)', 'SUM(clicks)')},
                {_safe_div('SUM(cost)', 'SUM(conversions)')}
            FROM fact_ad_daily
            GROUP BY date, source
            ORDER BY date
        """)
        count = cur.rowcount
    logger.info(f"mart_summary_daily: {count} rows")
    return count


def aggregate_campaign_daily() -> int:
    """Rebuild mart_campaign_daily from fact_ad_daily."""
    with get_cursor() as cur:
        cur.execute("DELETE FROM mart_campaign_daily")
        cur.execute(f"""
            INSERT INTO mart_campaign_daily
                (date, source, campaign_id, campaign_name,
                 impressions, clicks, cost, conversions, ctr, cpc, cvr, cpa)
            SELECT
                date, source, campaign_id, MAX(campaign_name),
                SUM(impressions), SUM(clicks), SUM(cost), SUM(conversions),
                {_safe_div('SUM(clicks)', 'SUM(impressions)')},
                {_safe_div('SUM(cost)', 'SUM(clicks)')},
                {_safe_div('SUM(conversions)', 'SUM(clicks)')},
                {_safe_div('SUM(cost)', 'SUM(conversions)')}
            FROM fact_ad_daily
            GROUP BY date, source, campaign_id
            ORDER BY date
        """)
        count = cur.rowcount
    logger.info(f"mart_campaign_daily: {count} rows")
    return count


def aggregate_creative_daily() -> int:
    """Rebuild mart_creative_daily from fact_ad_daily."""
    with get_cursor() as cur:
        cur.execute("DELETE FROM mart_creative_daily")
        cur.execute(f"""
            INSERT INTO mart_creative_daily
                (date, source, campaign_id, campaign_name, creative_id, creative_name,
                 impressions, clicks, cost, conversions, ctr, cpc, cvr, cpa)
            SELECT
                date, source, campaign_id, MAX(campaign_name),
                creative_id, MAX(creative_name),
                SUM(impressions), SUM(clicks), SUM(cost), SUM(conversions),
                {_safe_div('SUM(clicks)', 'SUM(impressions)')},
                {_safe_div('SUM(cost)', 'SUM(clicks)')},
                {_safe_div('SUM(conversions)', 'SUM(clicks)')},
                {_safe_div('SUM(cost)', 'SUM(conversions)')}
            FROM fact_ad_daily
            GROUP BY date, source, campaign_id, creative_id
            ORDER BY date
        """)
        count = cur.rowcount
    logger.info(f"mart_creative_daily: {count} rows")
    return count


def aggregate_period_summary(start_date: str, end_date: str) -> int:
    """Build mart_period_summary for a given date range."""
    with get_cursor() as cur:
        cur.execute(
            "DELETE FROM mart_period_summary WHERE start_date = %s AND end_date = %s",
            (start_date, end_date),
        )
        cur.execute(f"""
            INSERT INTO mart_period_summary
                (start_date, end_date, source,
                 impressions, clicks, cost, conversions, ctr, cpc, cvr, cpa)
            SELECT
                %s, %s, source,
                SUM(impressions), SUM(clicks), SUM(cost), SUM(conversions),
                {_safe_div('SUM(clicks)', 'SUM(impressions)')},
                {_safe_div('SUM(cost)', 'SUM(clicks)')},
                {_safe_div('SUM(conversions)', 'SUM(clicks)')},
                {_safe_div('SUM(cost)', 'SUM(conversions)')}
            FROM fact_ad_daily
            WHERE date BETWEEN %s AND %s
            GROUP BY source
        """, (start_date, end_date, start_date, end_date))
        count = cur.rowcount
    logger.info(f"mart_period_summary: {count} rows for {start_date}~{end_date}")
    return count


def run_all_aggregations(start_date: str | None = None, end_date: str | None = None) -> None:
    """Run all aggregation steps."""
    aggregate_summary_daily()
    aggregate_campaign_daily()
    aggregate_creative_daily()
    if start_date and end_date:
        aggregate_period_summary(start_date, end_date)
    logger.info("All aggregations complete.")
