#!/usr/bin/env python3
"""
import_local.py — Import a ConstructPro SQL export into the local SQLite database.

Strips PostgreSQL-specific syntax (::date, ::timestamptz casts) so the
INSERT statements run cleanly on SQLite.

Usage (from the Construction/ root):
    python scripts/import_local.py project_data.sql
"""
import re
import sqlite3
import sys
import os

SQL_FILE = sys.argv[1] if len(sys.argv) > 1 else "project_data.sql"
DB_FILE  = os.path.join(os.path.dirname(__file__), "..", "backend", "db.sqlite3")

def clean(sql: str) -> str:
    # Remove PostgreSQL type casts  e.g. '2026-05-14'::date  →  '2026-05-14'
    sql = re.sub(r"::(date|timestamptz|timestamp|text|uuid|integer|bigint|numeric|boolean|float)", "", sql)
    # Remove lines that are pure comments
    lines = [l for l in sql.splitlines() if not l.strip().startswith("--")]
    return "\n".join(lines)

def main():
    if not os.path.exists(SQL_FILE):
        print(f"❌  File not found: {SQL_FILE}")
        sys.exit(1)

    if not os.path.exists(DB_FILE):
        print(f"❌  SQLite DB not found at {DB_FILE}")
        print("    Run  make ml  first to create the DB and tables.")
        sys.exit(1)

    print(f"📂  Reading {SQL_FILE} ...")
    raw = open(SQL_FILE, encoding="utf-8").read()
    cleaned = clean(raw)

    print(f"🗄   Connecting to {DB_FILE} ...")
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()

    # Split on semicolons to run statement by statement
    statements = [s.strip() for s in cleaned.split(";") if s.strip()]
    ok = err = skip = 0

    for stmt in statements:
        if stmt.upper() in ("BEGIN", "COMMIT", "ROLLBACK"):
            skip += 1
            continue
        if not stmt.upper().startswith(("INSERT", "UPDATE", "DELETE")):
            skip += 1
            continue
        try:
            cur.execute(stmt)
            ok += 1
        except sqlite3.Error as e:
            # ON CONFLICT DO NOTHING equivalents — log and continue
            msg = str(e)
            if "UNIQUE constraint" in msg or "no such table" in msg:
                err += 1
                if "no such table" in msg:
                    print(f"  ⚠️  {msg}  — {stmt[:60]}...")
            else:
                err += 1
                print(f"  ❌  {msg}")
                print(f"      SQL: {stmt[:120]}")

    con.commit()
    con.close()

    print()
    print(f"✅  Done — {ok} rows inserted, {err} errors, {skip} skipped")
    if err == 0:
        print("    Refresh the app — data is live!")
    else:
        print("    Some rows had errors (usually UNIQUE conflicts on existing data — safe to ignore).")

if __name__ == "__main__":
    main()
