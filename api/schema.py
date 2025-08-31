from pydantic import BaseModel, Field
from typing import Any, Optional
import sqlite3

class AskRequest(BaseModel):
    question: str = Field(..., min_length=2)
    dataset: str = "default"
    want_chart: bool = True


class ChartSpec(BaseModel):
    type: str = "none" # bar | line | scatter | none
    x: Optional[str] = None
    y: Optional[str] = None
    legend: Optional[str] = None


class AskResponse(BaseModel):
    sql: str
    rows: list[list[Any]]
    columns: list[str]
    explanation: str
    chart: ChartSpec
    assumptions: str | None = None

def build_schema_text(db_path: str) -> str:
    """
    Returns a human-readable schema like:

    Tables:
      - albums(id, Title, ArtistId)
      - artists(ArtistId, Name)
    """
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    try:
        cur = con.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
        tables = [r["name"] for r in cur.fetchall()]

        lines = ["Tables:"]
        for t in tables:
            cur.execute(f"PRAGMA table_info({t});")
            cols = [row["name"] for row in cur.fetchall()]
            cols_str = ", ".join(cols)
            lines.append(f"  - {t}({cols_str})")
        return "\n".join(lines) if len(lines) > 1 else "Tables:\n  (no user tables found)"
    finally:
        con.close()