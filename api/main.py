from __future__ import annotations
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schema import AskRequest, AskResponse
from api import guards
from .exec import run_sql
from .llm import build_prompt, call_llm
from .chart import validate_chart
from api import cache
from settings import settings


app = FastAPI(title="Conversational Data Explorer API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


SCHEMA_TEXT = """
# Chinook sample database schema (SQLite)
Tables:
  - Artist(ArtistId, Name)
  - Album(AlbumId, Title, ArtistId)
  - Track(TrackId, Name, AlbumId, MediaTypeId, GenreId, Composer, Milliseconds, Bytes, UnitPrice)
  - Genre(GenreId, Name)
  - MediaType(MediaTypeId, Name)
  - Playlist(PlaylistId, Name)
  - PlaylistTrack(PlaylistId, TrackId)
  - Customer(CustomerId, FirstName, LastName, Company, Address, City, State, Country, PostalCode, Phone, Fax, Email, SupportRepId)
  - Employee(EmployeeId, LastName, FirstName, Title, ReportsTo, BirthDate, HireDate, Address, City, State, Country, PostalCode, Phone, Fax, Email)
  - Invoice(InvoiceId, CustomerId, InvoiceDate, BillingAddress, BillingCity, BillingState, BillingCountry, BillingPostalCode, Total)
  - InvoiceLine(InvoiceLineId, InvoiceId, TrackId, UnitPrice, Quantity)
""".strip()



@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/ask", response_model=AskResponse)
async def ask(payload: AskRequest):
    qnorm = payload.question.strip()
    if len(qnorm) < 2:
        raise HTTPException(status_code=400, detail="Question too short.")

    ck = cache.key_for(qnorm)
    cached = cache.get(ck)
    if cached:
        print("Cache hit")
        return cached


    prompt = build_prompt(SCHEMA_TEXT, qnorm)
    print("Prompt:", prompt)
    llm_json = call_llm(SCHEMA_TEXT, qnorm)
    print("LLM response:", llm_json)

    # Guardrails
    sql = llm_json.get("sql", "").strip().replace("\n", " ").replace("\r", " ").replace("  ", " ")
    print("Generated SQL:", sql)
    ok, reason = guards.is_safe(sql, settings.allow_tables)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Unsafe SQL: {reason}")


    sql = guards.enforce_limit(sql)
    print("Final SQL with enforced LIMIT:", sql)

    try:
        rows, cols = run_sql(sql)
        print(f"SQL returned {len(rows)} rows, columns: {cols}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SQL execution failed: {e}")


    chart = validate_chart(llm_json.get("chart"), cols) if payload.want_chart else validate_chart({}, cols)
    # rows, cols, chart = [], [], {}
    # Optional: second-pass explanation LLM; here we synthesize a simple one
    explanation = llm_json.get("reasoning") or "Answer computed based on the generated SQL and result set."


    resp = AskResponse(
        sql=sql,
        rows=rows,
        columns=cols,
        explanation=explanation,
        chart=chart,
        assumptions=None,
    )

    cache.set(ck, resp)

    return resp