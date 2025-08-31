from __future__ import annotations
from typing import Dict, List, Tuple
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from settings import settings
from .guards import enforce_limit

_engines: Dict[str, Engine] | None = None

DB_URLS = {
    "chinook": "sqlite:///data/chinook.db",
    "marketing": "sqlite:///data/marketing.db",
    "ecommerce": "sqlite:///data/ecommerce.db",
    "hr": "sqlite:///data/hr.db",
}

def get_engine(db: str) -> Engine:
    global _engines
    if _engines is None:
        _engines = {name: create_engine(url, pool_pre_ping=True) for name, url in DB_URLS.items()}
    return _engines[db]

def run_sql(db: str, sql: str, limit_timeout_ms: int = 2000) -> Tuple[List[List], List[str]]:
    """Execute read-only SQL and return (rows, columns)."""
    engine = get_engine(db)
    if not engine:
        raise ValueError("Database engine is not initialized")
    # sql = enforce_limit(sql, limit=100)  # Enforce max rows at SQL level

    # SQLite doesn't support per-query timeouts via statement; rely on LIMIT + app timeout
    with engine.connect() as conn:
    # Force read-only if SQLite
        # print("Executing SQL:", sql)
        # print("DB URL:", settings.db_url)
        # if settings.db_url.startswith("sqlite"):
        #     conn.execute(text("PRAGMA query_only = ON"))
        rs = conn.execute(text(sql))
        cols = list(rs.keys())
        rows = [list(r) for r in rs.fetchall()]
    return rows, cols