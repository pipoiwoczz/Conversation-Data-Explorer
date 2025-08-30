from __future__ import annotations
from typing import Any, Dict
import json
from settings import settings
from openai import OpenAI

SYSTEM_PROMPT = (
    "You are a skilled data analyst and SQL expert. "
    "Given a database schema and a natural-language question, "
    "produce a single, safe ANSI SQL query that answers the question. "
    "\n\n"
    "=== Rules for SQL ===\n"
    "- Use ONLY the provided tables and columns from the schema (no hallucinations).\n"
    "- Use explicit JOINs with clear ON conditions (never implicit joins).\n"
    "- Always qualify columns with table aliases when more than one table is used.\n"
    "- Never use SELECT * — explicitly list the required columns.\n"
    "- Always add LIMIT 200 unless the query is an aggregation that naturally reduces rows.\n"
    "- Never generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or other DDL/DML statements.\n"
    "- Queries must be ANSI SQL and runnable in SQLite/Postgres (no vendor-specific extensions).\n"
    # "- Use consistent formatting:"
    # "    SELECT col1, col2, ...\n"
    # "    FROM Table AS t\n"
    # "    JOIN Other AS o ON t.id = o.id\n"
    # "    WHERE ...\n"
    # "    ORDER BY ...\n"
    # "    LIMIT 200;\n"
    "\n"
    "=== Rules for JSON Response ===\n"
    "- Always return a valid JSON object with exactly these keys: sql, reasoning, chart.\n"
    "- sql: the final query string (no comments).\n"
    "- reasoning: a short explanation of how the query answers the question.\n"
    "- chart: an object with keys {type, x, y, legend}.\n"
    "  * type must be one of 'bar', 'line', 'scatter', 'none'.\n"
    "  * x, y, and legend should match actual column names from the SQL result.\n"
    "  * If no meaningful chart applies, set type='none' and x=y=legend=null.\n"
    "\n"
    "=== Chart Selection Guidance ===\n"
    "- Use 'bar' when comparing categories (e.g., top artists by album count).\n"
    "- Use 'line' when showing trends over time (e.g., invoices per month).\n"
    "- Use 'scatter' for numeric correlations (e.g., track length vs. unit price).\n"
    "- Use 'none' if visualization is not meaningful.\n"
    "\n"
    "=== General Behavior ===\n"
    "- Be precise, concise, and deterministic.\n"
    "- If the schema does not support the question, write an empty SQL string and explain why.\n"
    "- Do not include extra commentary or formatting outside of the JSON.\n"
)


def build_prompt(schema_text: str, question: str) -> str:
    return f"""{SYSTEM_PROMPT}\n\nSCHEMA:\n{schema_text}\n\nQUESTION:\n\"{question}\"\n"""

def call_llm(schema_text: str, question: str) -> Dict[str, Any]:
    provider = settings.llm_provider
    print("Current provider:", provider)

    # ------------------------
    # Dummy provider
    # ------------------------
    if provider == "dummy":
        return {
            "sql": (
                "SELECT artists.Name AS artist, COUNT(*) AS total_albums "
                "FROM albums "
                "JOIN artists ON albums.ArtistId = artists.ArtistId "
                "GROUP BY artists.Name "
                "ORDER BY total_albums DESC "
                "LIMIT 5"
            ),
            "reasoning": "Example query: counts albums per artist by joining albums→artists.",
            "chart": {"type": "bar", "x": "artist", "y": "total_albums", "legend": None},
        }

    # ------------------------
    # OpenAI provider
    # ------------------------
    elif provider == "openai":
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": build_prompt(schema_text, question)}],
        )
        content = response.choices[0].message.content
        try:
            return json.loads(content)
        except Exception as e:
            # Fallback: wrap raw text into expected format
            return {
                "sql": "",
                "reasoning": f"Failed to parse OpenAI response: {e}",
                "chart": {"type": "none", "x": None, "y": None, "legend": None},
            }

    # ------------------------
    # Gemini provider
    # ------------------------
    elif provider == "gemini":
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)
        res = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=build_prompt(schema_text, question),
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0),  # disable "thinking"
                response_mime_type="application/json",
            ),
        )
        # Gemini response text is plain text, so parse as JSON
        try:
            return json.loads(res.text)
        except Exception as e:
            return {
                "sql": "",
                "reasoning": f"Failed to parse Gemini response: {e}. Raw: {res.text[:200]}",
                "chart": {"type": "none", "x": None, "y": None, "legend": None},
            }

    # ------------------------
    # Unsupported
    # ------------------------
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")
