import re
from typing import Iterable
from sqlglot import parse_one
from sqlglot.expressions import Table
from settings import settings

BAD_KEYWORDS = (
"insert", "update", "delete", "drop", "alter", "create",
"attach", "pragma", "grant", "revoke", "truncate", "merge"
)


SQL_COMMENT = re.compile(r"(--.*?$)|(/\*.*?\*/)", re.IGNORECASE | re.MULTILINE | re.DOTALL)

def strip_comments(sql: str) -> str:
    return SQL_COMMENT.sub("", sql)

def contains_bad_keywords(sql: str) -> bool:
    s = sql.lower()
    return any(kw in s for kw in BAD_KEYWORDS)

def extract_tables(sql: str) -> set[str]:
    try:
        ast = parse_one(sql)
        return {str(t.this) for t in ast.find_all(Table)}
    except Exception:
        # Fallback crude extraction
        tokens = re.findall(r"[A-Za-z_][A-Za-z0-9_]*", sql)
        return set(tokens)

def enforce_limit(sql: str, default_limit: int = 200) -> str:
    # Simple heuristic: if not aggregate and no LIMIT present, append LIMIT
    s_low = sql.lower()
    if " limit " in s_low:
        return sql
    if any(word in s_low for word in ("group by", "count(", "sum(", "avg(", "min(", "max(")):
        return sql # aggregated result generally small
    return sql.rstrip("; ") + f" LIMIT {default_limit}"

def is_safe(sql: str, allowed_tables: set[str] = settings.allow_tables) -> tuple[bool, str]:
    if not sql.strip():
        return False, "Empty SQL"

    sql_nc = strip_comments(sql)
    if contains_bad_keywords(sql_nc):
        return False, "Disallowed keyword detected"
    # if ";" in sql_nc:
    #     return False, "Multiple statements are not allowed"

    used = extract_tables(sql_nc)
    # Keep only identifiers (no functions)
    used_clean = {u for u in used if re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", u)}

    if allowed_tables:
        lower_allowed = {t.lower() for t in allowed_tables}
        missing = {u for u in used_clean if u.lower() not in lower_allowed}
        if missing:
            return False, f"Unknown/forbidden tables referenced: {sorted(missing)}"

    return True, "OK"
