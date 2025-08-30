from __future__ import annotations
from typing import Dict, Any, List
from .schema import ChartSpec


ALLOWED_TYPES = {"bar", "line", "scatter", "none"}

def validate_chart(spec: dict | None, columns: List[str]) -> ChartSpec:
    spec = spec or {}
    t = spec.get("type", "none")
    if t not in ALLOWED_TYPES:
        t = "none"
    x = spec.get("x") if spec.get("x") in columns else None
    y = spec.get("y") if spec.get("y") in columns else None
    legend = spec.get("legend") if spec.get("legend") in columns else None
    return ChartSpec(type=t, x=x, y=y, legend=legend)