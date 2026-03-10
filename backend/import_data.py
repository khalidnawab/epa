"""Import product data from products.xlsx into a SQLite database."""

import sqlite3
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = PROJECT_ROOT / "products.xlsx"
DB_PATH = PROJECT_ROOT / "products.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program TEXT NOT NULL,
    category TEXT NOT NULL,
    sector TEXT NOT NULL,
    product_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    partner_since INTEGER NOT NULL,
    fragrance_free BOOLEAN NOT NULL DEFAULT 0,
    outdoor_use BOOLEAN NOT NULL DEFAULT 0,
    company_in_good_standing BOOLEAN NOT NULL DEFAULT 1,
    product_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    product_ids TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

DROP_COLUMNS = ["upcs", "gtins", "mpns"]


def import_data() -> None:
    """Read the Excel file and populate the SQLite database."""
    # Read Excel
    df = pd.read_excel(EXCEL_PATH)
    print(f"Read {len(df)} rows from {EXCEL_PATH}")

    # Drop unwanted columns
    df = df.drop(columns=DROP_COLUMNS)

    # Convert NaN values per spec
    df["fragrance_free"] = df["fragrance_free"].fillna(0).astype(int)
    df["outdoor_use"] = df["outdoor_use"].fillna(0).astype(int)
    df["company_in_good_standing"] = df["company_in_good_standing"].fillna(1).astype(int)

    # Create database and tables
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)

    # Insert product data
    df.to_sql("products", conn, if_exists="append", index=False)
    conn.commit()

    # Quick verification
    count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    print(f"Inserted {count} products into {DB_PATH}")

    conn.close()


if __name__ == "__main__":
    import_data()
