from pydantic import BaseModel, Field
from typing import Any, Optional


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