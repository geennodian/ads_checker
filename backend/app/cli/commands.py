"""CLI commands for Meta ads data pipeline."""

import argparse
import sys
from datetime import date, timedelta

from app.logger import get_logger

logger = get_logger(__name__)


def cmd_verify_meta_connection() -> None:
    """Verify Meta API and DB connectivity."""
    from app.connectors.meta_ads import verify_connection
    from app.db import check_connection

    print("=== Verifying Meta API Connection ===")
    try:
        info = verify_connection()
        print(f"  OK: account_name={info.get('name')} account_id={info.get('account_id')}")
        print(f"      currency={info.get('currency')} status={info.get('account_status')}")
    except Exception as e:
        print(f"  FAIL: {e}")
        print("\n確認ポイント:")
        print("  1. META_ACCESS_TOKEN が正しく設定されていますか？")
        print("  2. META_AD_ACCOUNT_ID は act_ で始まっていますか？")
        print("  3. System user に対象アカウントが asset として追加されていますか？")
        print("  4. Token に ads_read 権限がありますか？")
        sys.exit(1)

    print("\n=== Verifying Database Connection ===")
    if check_connection():
        print("  OK: Database connected")
    else:
        print("  FAIL: Database connection failed")
        print("\n確認ポイント:")
        print("  1. DATABASE_URL が正しく設定されていますか？")
        print("  2. Neon のダッシュボードでプロジェクトが Active ですか？")
        sys.exit(1)

    print("\nAll connections verified!")


def cmd_fetch_meta(start: str | None = None, end: str | None = None) -> None:
    """Fetch Meta ads data and save to raw table."""
    from app.connectors.meta_ads import fetch_insights, save_raw
    from app.db import init_schema

    end_date = date.fromisoformat(end) if end else date.today() - timedelta(days=1)
    start_date = date.fromisoformat(start) if start else end_date - timedelta(days=29)

    print(f"Fetching Meta data: {start_date} ~ {end_date}")
    init_schema()
    rows = fetch_insights(start_date, end_date)
    inserted = save_raw(rows, start_date, end_date)
    print(f"Done: {inserted} new rows saved to raw_meta_daily")


def cmd_normalize_meta() -> None:
    """Normalize raw data to fact table."""
    from app.services.normalizer import normalize_raw_to_fact

    count = normalize_raw_to_fact()
    print(f"Normalized {count} rows into fact_ad_daily")


def cmd_aggregate_meta(start: str | None = None, end: str | None = None) -> None:
    """Aggregate fact data into mart tables."""
    from app.services.aggregator import run_all_aggregations

    run_all_aggregations(start, end)
    print("Aggregation complete.")


def cmd_run_meta_report(start: str | None = None, end: str | None = None) -> None:
    """Run full pipeline: fetch -> normalize -> aggregate."""
    cmd_fetch_meta(start, end)
    cmd_normalize_meta()
    cmd_aggregate_meta(start, end)
    print("Full report pipeline complete.")


def cmd_build_report_url(
    dashboard: str = "summary",
    start: str | None = None,
    end: str | None = None,
    campaign_id: str | None = None,
    base_url: str = "http://localhost:3000",
) -> None:
    """Build a dashboard URL for OpenClaw to screenshot."""
    end_date = end or (date.today()).isoformat()
    start_date = start or (date.today() - timedelta(days=29)).isoformat()

    url = f"{base_url}/dashboard/{dashboard}?start={start_date}&end={end_date}"
    if campaign_id and dashboard == "creative":
        url += f"&campaign_id={campaign_id}"

    print(url)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ads Checker CLI")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("verify-meta-connection", help="Verify Meta API and DB connection")

    fetch_p = sub.add_parser("fetch-meta", help="Fetch Meta ads data")
    fetch_p.add_argument("--start", help="Start date (YYYY-MM-DD)")
    fetch_p.add_argument("--end", help="End date (YYYY-MM-DD)")

    sub.add_parser("normalize-meta", help="Normalize raw to fact")

    agg_p = sub.add_parser("aggregate-meta", help="Aggregate fact to mart")
    agg_p.add_argument("--start", help="Start date")
    agg_p.add_argument("--end", help="End date")

    report_p = sub.add_parser("run-meta-report", help="Full pipeline")
    report_p.add_argument("--start", help="Start date")
    report_p.add_argument("--end", help="End date")

    url_p = sub.add_parser("build-report-url", help="Build dashboard URL")
    url_p.add_argument("--dashboard", default="summary", choices=["summary", "daily", "campaign", "creative"])
    url_p.add_argument("--start", help="Start date")
    url_p.add_argument("--end", help="End date")
    url_p.add_argument("--campaign-id", help="Campaign ID (creative dashboard)")
    url_p.add_argument("--base-url", default="http://localhost:3000")

    args = parser.parse_args()

    commands = {
        "verify-meta-connection": lambda: cmd_verify_meta_connection(),
        "fetch-meta": lambda: cmd_fetch_meta(args.start, args.end),
        "normalize-meta": lambda: cmd_normalize_meta(),
        "aggregate-meta": lambda: cmd_aggregate_meta(args.start, args.end),
        "run-meta-report": lambda: cmd_run_meta_report(args.start, args.end),
        "build-report-url": lambda: cmd_build_report_url(
            args.dashboard, args.start, args.end,
            getattr(args, "campaign_id", None), args.base_url,
        ),
    }

    if args.command in commands:
        commands[args.command]()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
