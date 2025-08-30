# build_chinook_sqlite.py
import sqlite3
from pathlib import Path
from urllib.request import urlopen

SQL_URL = "https://raw.githubusercontent.com/lerocha/chinook-database/master/ChinookDatabase/DataSources/Chinook_Sqlite.sql"

def load_sql_text(local_override: str | None = None) -> str:
    if local_override and Path(local_override).exists():
        return Path(local_override).read_text(encoding="utf-8")
    with urlopen(SQL_URL) as resp:
        return resp.read().decode("utf-8")

def main(db_path="data/chinook.db", local_sql: str | None = None):
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    sql = load_sql_text(local_sql)

    # Create DB and run the official script
    conn = sqlite3.connect(path)
    try:
        cur = conn.cursor()
        # Make sure FKs are enforced in SQLite
        cur.execute("PRAGMA foreign_keys = ON;")

        # The upstream script already drops & recreates all objects
        cur.executescript(sql)
        conn.commit()

        # Quick sanity checks
        checks = [
            ("Artist", "SELECT COUNT(*) FROM Artist"),
            ("Album", "SELECT COUNT(*) FROM Album"),
            ("Track", "SELECT COUNT(*) FROM Track"),
            ("Customer", "SELECT COUNT(*) FROM Customer"),
            ("Invoice", "SELECT COUNT(*) FROM Invoice"),
        ]
        print(f"✅ Built {path.resolve()}")
        for name, q in checks:
            cnt = cur.execute(q).fetchone()[0]
            print(f"   {name:9s}: {cnt:,}")

    finally:
        conn.close()

if __name__ == "__main__":
    main()
