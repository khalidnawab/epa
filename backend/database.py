"""Database query functions for the EPA Safer Choice products application."""

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "products.db"


@contextmanager
def get_db():
    """Context manager that yields a sqlite3 connection with Row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def search_products(
    category=None,
    sector=None,
    company=None,
    state=None,
    fragrance_free=None,
    outdoor_use=None,
    keyword=None,
    limit=20,
):
    """Search products with optional filters. Returns {"total": int, "products": [dict]}."""
    conditions = []
    params = []

    if category:
        conditions.append("category = ?")
        params.append(category)
    if sector:
        conditions.append("sector LIKE ?")
        params.append(f"%{sector}%")
    if company:
        conditions.append("company_name LIKE ?")
        params.append(f"%{company}%")
    if state:
        conditions.append("state LIKE ?")
        params.append(f"%{state}%")
    if fragrance_free is not None:
        conditions.append("fragrance_free = ?")
        params.append(1 if fragrance_free else 0)
    if outdoor_use is not None:
        conditions.append("outdoor_use = ?")
        params.append(1 if outdoor_use else 0)
    if keyword:
        conditions.append("(product_name LIKE ? OR company_name LIKE ? OR sector LIKE ?)")
        params.extend([f"%{keyword}%"] * 3)

    where = ""
    if conditions:
        where = "WHERE " + " AND ".join(conditions)

    with get_db() as conn:
        cursor = conn.cursor()

        count_sql = f"SELECT COUNT(*) FROM products {where}"
        total = cursor.execute(count_sql, params).fetchone()[0]

        query_sql = f"SELECT * FROM products {where} ORDER BY product_name LIMIT ?"
        rows = cursor.execute(query_sql, params + [limit]).fetchall()

        return {"total": total, "products": [dict(r) for r in rows]}


def get_product_details(product_id: int):
    """Return full product dict for the given ID, or None."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        return dict(row) if row else None


def compare_products(product_ids: list[int]):
    """Return list of product dicts for the given IDs."""
    if not product_ids:
        return []
    placeholders = ",".join("?" for _ in product_ids)
    with get_db() as conn:
        rows = conn.execute(
            f"SELECT * FROM products WHERE id IN ({placeholders})", product_ids
        ).fetchall()
        return [dict(r) for r in rows]


def get_all_sectors():
    """Return sorted list of distinct sector names."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT sector FROM products ORDER BY sector"
        ).fetchall()
        return [r["sector"] for r in rows]


def save_conversation(conversation_id: str):
    """Insert a new conversation record."""
    with get_db() as conn:
        conn.execute("INSERT INTO conversations (id) VALUES (?)", (conversation_id,))
        conn.commit()


def save_message(conversation_id: str, role: str, content: str):
    """Insert a message into the messages table."""
    with get_db() as conn:
        conn.execute(
            "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
            (conversation_id, role, content),
        )
        conn.commit()


def get_messages(conversation_id: str):
    """Return list of {role, content} dicts ordered by created_at."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at",
            (conversation_id,),
        ).fetchall()
        return [{"role": r["role"], "content": r["content"]} for r in rows]


def save_report(report_id: str, conversation_id: str, product_ids: list[int], summary: str):
    """Insert a report record. product_ids is stored as a JSON string."""
    with get_db() as conn:
        conn.execute(
            "INSERT INTO reports (id, conversation_id, product_ids, summary) VALUES (?, ?, ?, ?)",
            (report_id, conversation_id, json.dumps(product_ids), summary),
        )
        conn.commit()


def get_report(report_id: str):
    """Return report dict (with product_ids parsed from JSON) or None."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
        if not row:
            return None
        report = dict(row)
        report["product_ids"] = json.loads(report["product_ids"])
        return report
