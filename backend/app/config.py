"""Application configuration loaded from environment variables."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    meta_access_token: str = os.getenv("META_ACCESS_TOKEN", "")
    meta_ad_account_id: str = os.getenv("META_AD_ACCOUNT_ID", "")
    meta_api_version: str = os.getenv("META_API_VERSION", "v21.0")
    database_url: str = os.getenv("DATABASE_URL", "")
    app_env: str = os.getenv("APP_ENV", "local")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    dashboard_password: str = os.getenv("DASHBOARD_PASSWORD", "")


settings = Settings()
