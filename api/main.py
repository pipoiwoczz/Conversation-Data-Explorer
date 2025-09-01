# main.py
from __future__ import annotations
import os, json, re
from typing import Any, Dict, List, Optional, Tuple
from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from sqlalchemy import text

from .guards import is_safe as is_safe_sql
from .guards import enforce_limit
from .schema import build_schema_text
from .exec import run_sql
from .llm import ask_provider

# Map the DB ids used by the frontend to actual SQLite files.
DB_MAP = {
    "chinook": os.getenv("DB_CHINOOK", "data/chinook.db"),
    "marketing": os.getenv("DB_MARKETING", "data/marketing.db"),
    "ecommerce": os.getenv("DB_ECOMMERCE", "data/ecommerce.db"),
    "hr": os.getenv("DB_HR", "data/hr.db"),
}

def get_db_path(db_id: str) -> str:
    if db_id not in DB_MAP:
        raise HTTPException(status_code=400, detail=f"Unknown db '{db_id}'. Valid: {list(DB_MAP)}")
    path = DB_MAP[db_id]
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Database file not found: {path}")
    return path

app = FastAPI(title="Conversation Data Explorer API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Welcome to the Conversation Data Explorer API"}

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/api/schema", response_model=None)
def get_schema(db: str = Query(..., description="db id, e.g., chinook")):
    db_path = get_db_path(db)
    if not db_path:
        raise HTTPException(status_code=404, detail="Database not found")
    return build_schema_text(db_path)  # returns plain text; frontend expects text

@app.post("/api/exec")
def exec_sql(payload: Dict[str, Any] = Body(...)):
    sql: str = payload.get("sql", "")
    db: str = payload.get("db", "chinook")

    if not sql.strip():
        raise HTTPException(status_code=400, detail="Missing 'sql'")

    sql = enforce_limit(sql).replace("\n", " ").strip().rstrip(";")
    if not is_safe_sql(sql):
        raise HTTPException(status_code=400, detail="Only SELECT/EXPLAIN queries are allowed.")

    try:
        rows, columns = run_sql(db, sql)
        print(f"Executed SQL on {db}: {sql}")
        print("Returned columns and rows: ", columns, rows)
        return {"columns": columns, "rows": rows}
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"SQL error: {e}")

@app.post("/api/ask")
def ask(payload: Dict[str, Any] = Body(...)):
    question: str = payload.get("question", "")
    provider: str = payload.get("provider", "gemini")
    db: str = payload.get("db", "chinook")
    db_path = get_db_path(db)
    print("Provider selected:", provider)
    print("Database path resolved to:", db_path)

    if not question.strip():
        raise HTTPException(status_code=400, detail="Missing 'question'")

    try:
        answer = ask_provider(question=question, provider=provider, db_path=db_path)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ask failed: {e}")

