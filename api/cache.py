from __future__ import annotations
import hashlib
from typing import Any, Dict


_cache: Dict[str, Any] = {}

def key_for(question: str) -> str:
    return hashlib.sha256(question.strip().lower().encode()).hexdigest()


def get(k: str):
    return _cache.get(k)

def set(k: str, v: Any):
    _cache[k] = v