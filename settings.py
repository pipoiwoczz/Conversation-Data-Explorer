from pydantic import BaseModel
import os
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load variables from .env into process environment
load_dotenv()

# Settings for the application
class Settings(BaseModel):
    llm_provider: str = os.getenv("LLM_PROVIDER", "dummy")
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
    db_url: str = os.getenv("DB_URI", "sqlite:///./data/chinook_test.db")
    allow_tables: set[str] = set(
        t.strip() for t in os.getenv("ALLOW_TABLES", "").split(",") if t.strip()
    )
    port: int = int(os.getenv("PORT", "8000"))


settings = Settings()