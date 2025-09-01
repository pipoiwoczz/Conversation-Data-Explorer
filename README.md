# Conversation-Data-Explorer

<p align="center">
  <img src="./demo/demo.gif" width="600" height="400" />
</p>

> Ask natural language → get **safe SQL** → see **interactive charts**

<p align="center">
  <a href="https://fastapi.tiangolo.com/"> <img src="https://img.shields.io/badge/API-FastAPI-009688" /></a>
  <a href="https://reactjs.org/"> <img src="https://img.shields.io/badge/UI-React-61DAFB" /></a>
  <a href="https://tailwindcss.com/"> <img src="https://img.shields.io/badge/Style-Tailwind-38BDF8" /></a>
  <a href="https://platform.openai.com/docs/models/gpt-4"> <img src="https://img.shields.io/badge/Providers-OpenAI%2FGemini-8A2BE2" /></a>
  <img src="https://img.shields.io/badge/License-MIT-green.svg" />
</p>


------------------------------------------------------------------------

## ✨ Overview

**Conversation Data Explorer** is a full-stack demo of
**natural-language-to-SQL** with **guardrails and charting**.\
Built for **data exploration**, teaching, and quick prototyping.

-   🔒 Secure: generates **SELECT-only SQL** with keyword checks & row
    limits\
-   📊 Visual: auto-renders **bar/line/scatter charts** from results\
-   🤖 Flexible: works with **OpenAI**, **Gemini**, or a **dummy
    provider** for offline dev\
-   ⚡ Modern stack: **FastAPI + SQLAlchemy + React + Tailwind +
    shadcn/ui**\
-   🎵 Demo DB: comes with **Chinook music store** dataset

------------------------------------------------------------------------

## 🚀 Features

-   **Safe SQL Guardrails**
    -   SELECT-only\
    -   Forbidden keyword checks\
    -   Auto `LIMIT 200` (unless aggregated)\
    -   Query timeout (5s)\
-   **Interactive Frontend**
    -   SQL Assistant panel (see generated SQL + reasoning + chart)\
    -   Ask (LLM chat) panel\
    -   File upload panel (RAG extensions)\
-   **Caching**: repeated questions served instantly\
-   **Multi-LLM Support**: OpenAI GPT-4o-mini, Gemini 2.5-flash, Dummy
    provider\
-   **Chart Validation**: ensures only valid x/y/legend columns are used

------------------------------------------------------------------------

## 🛠️ Quickstart

### Option 1: Docker (recommended)

``` sh
docker-compose up --build
```

Runs API + frontend + Chinook demo DB.\
➡ Open <http://localhost:5173>.

### Option 2: Manual (dev)

``` sh
# Backend
python -m venv .venv
source .venv/bin/activate   # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# Frontend
cd front-end
npm install
npm run dev
```

### Environment Setup

-   Copy `.env.example` → `.env`\
-   Fill in API keys: `OPENAI_API_KEY`, `GEMINI_API_KEY`, etc.\
-   Demo DB: `data/chinook.db`

------------------------------------------------------------------------

## 📚 API Endpoints

| Endpoint       | Method | Description            |
|----------------|--------|------------------------|
| `/`            | GET    | Root health check      |
| `/health`      | GET    | API health             |
| `/api/schema`  | GET    | DB connectivity probe  |
| `/api/ask`     | POST   | Natural language → SQL |
| `/api/exec`    | POST   | Direct SQL execution   |


## 🖼️ Architecture

    User → Frontend (React) → FastAPI (/ask, /exec)
            ↓
        LLM provider (OpenAI/Gemini/Dummy)
            ↓
        SQL generator + guardrails
            ↓
        Database (SQLite / Chinook)
            ↓
        Response: { sql, rows, columns, explanation, chart }


------------------------------------------------------------------------

## 🧪 Testing

Minimal integration tests ensure:
- `/api/ask` returns valid JSON shape
- `/api/exec` rejects non-SELECT
- `/api/exec` enforces row cap + `truncated: true`

------------------------------------------------------------------------

## 🔐 Security

-   Read-only SQL enforced via guard checks
-   No secrets in repo (`.env.example` provided)
-   Pydantic settings for config

------------------------------------------------------------------------

## 📜 License

MIT --- free to use, modify, and distribute.
