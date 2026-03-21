"""Meta (Facebook) Ads Insights API connector."""

import hashlib
import json
import time
from datetime import date, timedelta
from typing import Any

import requests

from app.config import settings
from app.db import get_cursor
from app.logger import get_logger

logger = get_logger(__name__)

BASE_URL = "https://graph.facebook.com"

INSIGHT_FIELDS = [
    "campaign_id",
    "campaign_name",
    "adset_id",
    "adset_name",
    "ad_id",
    "ad_name",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "spend",
    "actions",
]


def _api_url(path: str) -> str:
    return f"{BASE_URL}/{settings.meta_api_version}/{path}"


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {settings.meta_access_token}"}


def verify_connection() -> dict[str, Any]:
    """Test Meta API connectivity by fetching account info."""
    url = _api_url(f"{settings.meta_ad_account_id}")
    params = {"fields": "name,account_id,account_status,currency"}
    resp = requests.get(url, headers=_headers(), params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    logger.info(f"Meta API connected: account={data.get('name')} id={data.get('account_id')}")
    return data


def fetch_insights(
    start_date: date,
    end_date: date,
    level: str = "campaign",
    max_retries: int = 3,
) -> list[dict[str, Any]]:
    """Fetch insights from Meta Ads API with pagination and retry."""
    url = _api_url(f"{settings.meta_ad_account_id}/insights")
    params = {
        "fields": ",".join(INSIGHT_FIELDS),
        "time_range": json.dumps({
            "since": start_date.isoformat(),
            "until": end_date.isoformat(),
        }),
        "time_increment": 1,  # daily
        "level": level,
        "limit": 500,
    }

    all_rows: list[dict[str, Any]] = []
    page = 1

    while url:
        for attempt in range(1, max_retries + 1):
            try:
                resp = requests.get(url, headers=_headers(), params=params, timeout=60)
                resp.raise_for_status()
                break
            except requests.RequestException as e:
                if attempt == max_retries:
                    raise
                wait = 2 ** attempt
                logger.warning(f"Retry {attempt}/{max_retries} after {wait}s: {e}")
                time.sleep(wait)

        body = resp.json()
        rows = body.get("data", [])
        all_rows.extend(rows)
        logger.info(f"Page {page}: fetched {len(rows)} rows")

        # pagination
        paging = body.get("paging", {})
        url = paging.get("next")
        params = {}  # next URL already has params
        page += 1

    logger.info(f"Total rows fetched: {len(all_rows)}")
    return all_rows


def _compute_hash(row: dict, account_id: str, start_date: date, end_date: date) -> str:
    """Deterministic hash for deduplication."""
    key = json.dumps(
        {
            "account_id": account_id,
            "campaign_id": row.get("campaign_id", ""),
            "adset_id": row.get("adset_id", ""),
            "ad_id": row.get("ad_id", ""),
            "date_start": row.get("date_start", ""),
            "date_stop": row.get("date_stop", ""),
            "req_start": start_date.isoformat(),
            "req_end": end_date.isoformat(),
        },
        sort_keys=True,
    )
    return hashlib.sha256(key.encode()).hexdigest()


def save_raw(
    rows: list[dict[str, Any]],
    start_date: date,
    end_date: date,
    level: str = "campaign",
) -> int:
    """Save raw API response rows to raw_meta_daily. Returns inserted count."""
    inserted = 0
    with get_cursor() as cur:
        for row in rows:
            unique_hash = _compute_hash(row, settings.meta_ad_account_id, start_date, end_date)
            cur.execute(
                """
                INSERT INTO raw_meta_daily
                    (request_start_date, request_end_date, level, account_id,
                     campaign_id, campaign_name, date_start, date_stop,
                     raw_json, unique_hash)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (unique_hash) DO NOTHING
                """,
                (
                    start_date,
                    end_date,
                    level,
                    settings.meta_ad_account_id,
                    row.get("campaign_id"),
                    row.get("campaign_name"),
                    row.get("date_start"),
                    row.get("date_stop"),
                    json.dumps(row),
                    unique_hash,
                ),
            )
            inserted += cur.rowcount
    logger.info(f"Raw rows inserted: {inserted} (skipped {len(rows) - inserted} duplicates)")
    return inserted
