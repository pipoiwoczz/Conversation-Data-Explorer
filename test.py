from settings import settings
from api.llm import call_llm
from api.schema import AskRequest, AskResponse


SCHEMA_TEXT = """
# Example schema (replace at startup with an inspector-built string)
Tables: albums(id, Title, ArtistId), artists(ArtistId, Name), tracks(...)
""".strip()

def ask_test():
    question = "Top 5 artists that have most albums"
    response = call_llm(SCHEMA_TEXT, question)
    print("LLM response:", response)

ask_test()