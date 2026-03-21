"""Normalize raw Meta data into fact_ad_daily."""

import json
from typing import Any

from app.db import get_cursor
from app.logger import get_logger

logger = get_logger(__name__)


def _extract_conversions(raw: dict[str, Any]) -> int:
    """Extract conversion count from Meta's actions array.

    Meta returns conversions in the 'actions' field as a list of
    {action_type, value} objects. We look for common conversion types.
    """
    actions = raw.get("actions", [])
    if not actions:
        return 0

    conversion_types = [
        "offsite_conversion.fb_pixel_purchase",
        "offsite_conversion.fb_pixel_lead",
        "offsite_conversion.fb_pixel_complete_registration",
        "lead",
        "purchase",
        "complete_registration",
        "omni_purchase",
        "onsite_conversion.messaging_conversation_started_7d",
    ]

    total = 0
    for action in actions:
        if action.get("action_type") in conversion_types:
            total += int(action.get("value", 0))

    # If no known conversion type found, sum all actions as fallback
    if total == 0 and actions:
        for action in actions:
            if action.get("action_type") == "link_click":
                continue  # skip clicks
            total += int(action.get("value", 0))

    return total


def normalize_raw_to_fact() -> int:
    """Read unprocessed raw rows and upsert into fact_ad_daily. Returns count."""
    with get_cursor() as cur:
        # Get raw rows not yet in fact
        cur.execute(
            """
            SELECT r.id, r.account_id, r.raw_json, r.date_start
            FROM raw_meta_daily r
            ORDER BY r.date_start
            """
        )
        raw_rows = cur.fetchall()

    upserted = 0
    with get_cursor() as cur:
        for row in raw_rows:
            raw: dict[str, Any] = row["raw_json"] if isinstance(row["raw_json"], dict) else json.loads(row["raw_json"])
            conversions = _extract_conversions(raw)
            cost = float(raw.get("spend", 0))
            impressions = int(raw.get("impressions", 0))
            clicks = int(raw.get("clicks", 0))

            cur.execute(
                """
                INSERT INTO fact_ad_daily
                    (date, source, account_id, campaign_id, campaign_name,
                     adset_id, adset_name, creative_id, creative_name,
                     impressions, clicks, cost, conversions, currency)
                VALUES (%s, 'meta', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'JPY')
                ON CONFLICT (date, source, account_id, campaign_id, adset_id, creative_id)
                DO UPDATE SET
                    campaign_name = EXCLUDED.campaign_name,
                    adset_name = EXCLUDED.adset_name,
                    creative_name = EXCLUDED.creative_name,
                    impressions = EXCLUDED.impressions,
                    clicks = EXCLUDED.clicks,
                    cost = EXCLUDED.cost,
                    conversions = EXCLUDED.conversions,
                    updated_at = NOW()
                """,
                (
                    row["date_start"],
                    row["account_id"],
                    raw.get("campaign_id", ""),
                    raw.get("campaign_name", ""),
                    raw.get("adset_id", ""),
                    raw.get("adset_name", ""),
                    raw.get("ad_id", ""),
                    raw.get("ad_name", ""),
                    impressions,
                    clicks,
                    cost,
                    conversions,
                ),
            )
            upserted += 1

    logger.info(f"Normalized {upserted} rows into fact_ad_daily")
    return upserted
