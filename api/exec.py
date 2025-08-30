from __future__ import annotations
from typing import List, Tuple
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from settings import settings

_engine: Engine | None = None

def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(settings.db_url, pool_pre_ping=True)
    return _engine

def run_sql(sql: str, limit_timeout_ms: int = 2000) -> Tuple[List[List], List[str]]:
    """Execute read-only SQL and return (rows, columns)."""
    engine = get_engine()
    # SQLite doesn't support per-query timeouts via statement; rely on LIMIT + app timeout
    with engine.connect() as conn:
    # Force read-only if SQLite
        # print("Executing SQL:", sql)
        # print("DB URL:", settings.db_url)
        if settings.db_url.startswith("sqlite"):
            conn.execute(text("PRAGMA query_only = ON"))
        rs = conn.execute(text(sql))
        cols = list(rs.keys())
        rows = [list(r) for r in rs.fetchall()]
    return rows, cols