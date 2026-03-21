"""Database connection and helpers for Neon PostgreSQL."""

from contextlib import contextmanager
from typing import Generator

import psycopg2
import psycopg2.extras

from app.config import settings
from app.logger import get_logger

logger = get_logger(__name__)


def get_connection():
    """Create a new database connection."""
    return psycopg2.connect(settings.database_url)


@contextmanager
def get_cursor(commit: bool = True) -> Generator:
    """Context manager that yields a cursor and handles commit/rollback."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            yield cur
            if commit:
                conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_schema() -> None:
    """Run schema.sql to initialize database tables."""
    import pathlib

    schema_path = pathlib.Path(__file__).resolve().parents[2] / "infra" / "schema.sql"
    sql = schema_path.read_text()
    with get_cursor() as cur:
        cur.execute(sql)
    logger.info("Database schema initialized.")


def check_connection() -> bool:
    """Verify database connectivity."""
    try:
        with get_cursor(commit=False) as cur:
            cur.execute("SELECT 1")
            return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False
