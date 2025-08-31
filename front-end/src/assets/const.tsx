export const API_BASE = (import.meta as any)?.env?.VITE_API_BASE ?? "http://localhost:8000";
export const PROVIDERS = [
    "gemini",
    "openai",
    "groq",
    "ollama"
]