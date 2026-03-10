# EPA Safer Choice Chatbot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a conversational chatbot that helps users find EPA Safer Choice cleaning products using Claude's tool-use pattern, with a FastAPI backend and Next.js mobile-first frontend.

**Architecture:** FastAPI backend serves a chat API. User messages go to Claude with tool definitions. Claude calls search/compare/report tools as needed, backend executes them against SQLite, Claude responds conversationally. Next.js frontend renders the chat with product cards, comparison tables, and PDF download buttons.

**Tech Stack:** Python 3.14, FastAPI, SQLite, Anthropic SDK, WeasyPrint, Next.js (App Router), TypeScript, Tailwind CSS

**Design doc:** `docs/plans/2026-03-09-epa-chatbot-design.md`

---

### Task 1: Initialize Git and Backend Project

**Files:**
- Create: `.gitignore`
- Create: `backend/requirements.txt`

**Step 1: Initialize git repo**

```bash
cd D:/projects/epa
git init
```

**Step 2: Create .gitignore**

```
__pycache__/
*.pyc
.env
products.db
node_modules/
.next/
*.db-journal
venv/
.venv/
```

**Step 3: Create backend/requirements.txt**

```
fastapi==0.115.0
uvicorn==0.30.6
anthropic==0.40.0
pandas==2.2.3
openpyxl==3.1.5
weasyprint==62.3
python-dotenv==1.0.1
```

**Step 4: Create virtual environment and install dependencies**

```bash
py -m venv backend/venv
backend/venv/Scripts/pip install -r backend/requirements.txt
```

**Step 5: Create backend/.env**

```
ANTHROPIC_API_KEY=<user's key>
DATABASE_URL=sqlite:///products.db
```

**Step 6: Commit**

```bash
git add .gitignore backend/requirements.txt
git commit -m "chore: initialize project with backend dependencies"
```

---

### Task 2: Data Import Script (Excel → SQLite)

**Files:**
- Create: `backend/import_data.py`

**Step 1: Write import_data.py**

```python
import sqlite3
import pandas as pd
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "products.db"
EXCEL_PATH = Path(__file__).parent.parent / "products.xlsx"


def create_tables(conn: sqlite3.Connection):
    conn.executescript("""
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
    """)


def import_products(conn: sqlite3.Connection):
    df = pd.read_excel(EXCEL_PATH)
    df = df.drop(columns=["upcs", "gtins", "mpns"])
    df["fragrance_free"] = df["fragrance_free"].fillna(0).astype(int)
    df["outdoor_use"] = df["outdoor_use"].fillna(0).astype(int)
    df["company_in_good_standing"] = df["company_in_good_standing"].fillna(1).astype(int)
    df.to_sql("products", conn, if_exists="replace", index=False)


def main():
    conn = sqlite3.connect(DB_PATH)
    create_tables(conn)
    import_products(conn)
    count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    print(f"Imported {count} products into {DB_PATH}")
    conn.close()


if __name__ == "__main__":
    main()
```

**Step 2: Run import and verify**

```bash
cd D:/projects/epa
backend/venv/Scripts/python backend/import_data.py
```

Expected: `Imported 4600 products into ...\products.db`

**Step 3: Quick verification query**

```bash
backend/venv/Scripts/python -c "import sqlite3; conn = sqlite3.connect('products.db'); print(conn.execute('SELECT COUNT(DISTINCT sector) FROM products').fetchone())"
```

Expected: `(50,)`

**Step 4: Commit**

```bash
git add backend/import_data.py
git commit -m "feat: add data import script (Excel to SQLite)"
```

---

### Task 3: Database Module

**Files:**
- Create: `backend/database.py`

**Step 1: Write database.py**

```python
import sqlite3
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(__file__).parent.parent / "products.db"


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def search_products(
    category: str | None = None,
    sector: str | None = None,
    company: str | None = None,
    state: str | None = None,
    fragrance_free: bool | None = None,
    outdoor_use: bool | None = None,
    keyword: str | None = None,
    limit: int = 20,
) -> dict:
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
        params.append(int(fragrance_free))
    if outdoor_use is not None:
        conditions.append("outdoor_use = ?")
        params.append(int(outdoor_use))
    if keyword:
        conditions.append("product_name LIKE ?")
        params.append(f"%{keyword}%")

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with get_db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) FROM products {where}", params
        ).fetchone()[0]

        rows = conn.execute(
            f"SELECT * FROM products {where} ORDER BY product_name LIMIT ?",
            params + [limit],
        ).fetchall()

    return {"total": total, "products": [dict(r) for r in rows]}


def get_product_details(product_id: int) -> dict | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM products WHERE id = ?", (product_id,)
        ).fetchone()
    return dict(row) if row else None


def compare_products(product_ids: list[int]) -> list[dict]:
    placeholders = ",".join("?" * len(product_ids))
    with get_db() as conn:
        rows = conn.execute(
            f"SELECT * FROM products WHERE id IN ({placeholders})", product_ids
        ).fetchall()
    return [dict(r) for r in rows]


def get_all_sectors() -> list[str]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT sector FROM products ORDER BY sector"
        ).fetchall()
    return [r["sector"] for r in rows]


def save_conversation(conversation_id: str):
    with get_db() as conn:
        conn.execute(
            "INSERT INTO conversations (id) VALUES (?)", (conversation_id,)
        )
        conn.commit()


def save_message(conversation_id: str, role: str, content: str):
    with get_db() as conn:
        conn.execute(
            "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
            (conversation_id, role, content),
        )
        conn.commit()


def get_messages(conversation_id: str) -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at",
            (conversation_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def save_report(report_id: str, conversation_id: str, product_ids: list[int], summary: str):
    import json
    with get_db() as conn:
        conn.execute(
            "INSERT INTO reports (id, conversation_id, product_ids, summary) VALUES (?, ?, ?, ?)",
            (report_id, conversation_id, json.dumps(product_ids), summary),
        )
        conn.commit()


def get_report(report_id: str) -> dict | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM reports WHERE id = ?", (report_id,)
        ).fetchone()
    return dict(row) if row else None
```

**Step 2: Commit**

```bash
git add backend/database.py
git commit -m "feat: add database module with product queries and conversation storage"
```

---

### Task 4: Pydantic Models

**Files:**
- Create: `backend/models.py`

**Step 1: Write models.py**

```python
from pydantic import BaseModel


class ChatRequest(BaseModel):
    conversation_id: str
    message: str


class ChatResponse(BaseModel):
    conversation_id: str
    response: str


class ProductOut(BaseModel):
    id: int
    program: str
    category: str
    sector: str
    product_name: str
    company_name: str
    city: str | None
    state: str | None
    partner_since: int
    fragrance_free: bool
    outdoor_use: bool
    company_in_good_standing: bool
    product_url: str
```

**Step 2: Commit**

```bash
git add backend/models.py
git commit -m "feat: add Pydantic models for API request/response"
```

---

### Task 5: Tool Definitions for Claude

**Files:**
- Create: `backend/tools.py`

**Step 1: Write tools.py**

This file defines the tool schemas (for Claude) and the executor that runs them against the database.

```python
import json
import uuid
from backend import database

TOOL_DEFINITIONS = [
    {
        "name": "search_products",
        "description": "Search EPA Safer Choice products by filters. Returns up to 20 matching products and total count. Use this to find products matching user needs.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["Consumer Product", "Industrial/Institutional Product"],
                    "description": "Product category. Use 'Consumer Product' for home/personal use, 'Industrial/Institutional Product' for commercial/business use.",
                },
                "sector": {
                    "type": "string",
                    "description": "Product sector/type, e.g. 'All-Purpose Cleaners', 'Floor Care Products : Floor Cleaners'. Use partial match.",
                },
                "company": {
                    "type": "string",
                    "description": "Company name (partial match).",
                },
                "state": {
                    "type": "string",
                    "description": "US state where company is located (partial match).",
                },
                "fragrance_free": {
                    "type": "boolean",
                    "description": "Filter for fragrance-free products only.",
                },
                "outdoor_use": {
                    "type": "boolean",
                    "description": "Filter for outdoor-use products only.",
                },
                "keyword": {
                    "type": "string",
                    "description": "Keyword to search in product names (partial match).",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_product_details",
        "description": "Get full details for a specific product by its ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_id": {
                    "type": "integer",
                    "description": "The product ID.",
                },
            },
            "required": ["product_id"],
        },
    },
    {
        "name": "compare_products",
        "description": "Compare 2-5 products side by side. Returns full details for each product for comparison.",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_ids": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "minItems": 2,
                    "maxItems": 5,
                    "description": "List of product IDs to compare.",
                },
            },
            "required": ["product_ids"],
        },
    },
    {
        "name": "generate_report",
        "description": "Generate a downloadable PDF report of recommended products. Call this when the user wants to save or export their recommendations.",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_ids": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "description": "List of recommended product IDs.",
                },
                "user_needs_summary": {
                    "type": "string",
                    "description": "Brief summary of what the user was looking for.",
                },
                "recommendations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "product_id": {"type": "integer"},
                            "reason": {"type": "string"},
                        },
                        "required": ["product_id", "reason"],
                    },
                    "description": "Each product with a reason for recommendation.",
                },
            },
            "required": ["product_ids", "user_needs_summary", "recommendations"],
        },
    },
]


def execute_tool(tool_name: str, tool_input: dict, conversation_id: str) -> str:
    if tool_name == "search_products":
        result = database.search_products(**tool_input)
        return json.dumps(result, default=str)

    elif tool_name == "get_product_details":
        result = database.get_product_details(tool_input["product_id"])
        if result is None:
            return json.dumps({"error": "Product not found"})
        return json.dumps(result, default=str)

    elif tool_name == "compare_products":
        result = database.compare_products(tool_input["product_ids"])
        return json.dumps(result, default=str)

    elif tool_name == "generate_report":
        from backend.report import generate_pdf
        report_id = str(uuid.uuid4())
        products = database.compare_products(tool_input["product_ids"])
        generate_pdf(report_id, tool_input["user_needs_summary"], tool_input["recommendations"], products)
        database.save_report(report_id, conversation_id, tool_input["product_ids"], tool_input["user_needs_summary"])
        return json.dumps({"report_id": report_id, "download_url": f"/api/chat/{conversation_id}/report/{report_id}"})

    return json.dumps({"error": f"Unknown tool: {tool_name}"})
```

**Step 2: Commit**

```bash
git add backend/tools.py
git commit -m "feat: add Claude tool definitions and executor"
```

---

### Task 6: Chat Module (Claude API Integration)

**Files:**
- Create: `backend/chat.py`

**Step 1: Write chat.py**

```python
import anthropic
from backend import database
from backend.tools import TOOL_DEFINITIONS, execute_tool

client = anthropic.Anthropic()

SECTORS_LIST = "\n".join(f"- {s}" for s in database.get_all_sectors())

SYSTEM_PROMPT = f"""You are an EPA Safer Choice product expert assistant. You help consumers and business/facility managers find the right EPA Safer Choice certified cleaning products for their needs.

Your behavior:
- Greet users warmly and ask what they need help with
- Ask clarifying questions: home or commercial use? What type of cleaning? Any preferences (fragrance-free, outdoor use)?
- Use the search_products tool to find matching products — NEVER guess or make up product data
- Present results conversationally with key details (product name, company, sector, partner since year)
- When showing multiple products, mention the product ID so users can reference them
- Offer to compare products when the user is deciding between options
- Offer to generate a downloadable PDF report when the user has settled on recommendations
- Be helpful, concise, and knowledgeable about cleaning product categories
- If no products match, suggest broadening the search or trying a different sector

Available product sectors:
{SECTORS_LIST}

Available categories:
- Consumer Product (for home/personal use)
- Industrial/Institutional Product (for commercial/business use)

Product attributes you can filter by:
- fragrance_free: products without added fragrance
- outdoor_use: products suitable for outdoor use"""


def get_chat_response(conversation_id: str, user_message: str) -> str:
    database.save_message(conversation_id, "user", user_message)

    history = database.get_messages(conversation_id)
    messages = [{"role": m["role"], "content": m["content"]} for m in history]

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=TOOL_DEFINITIONS,
        messages=messages,
    )

    while response.stop_reason == "tool_use":
        tool_blocks = [b for b in response.content if b.type == "tool_use"]
        tool_results = []
        for block in tool_blocks:
            result = execute_tool(block.name, block.input, conversation_id)
            tool_results.append(
                {"type": "tool_result", "tool_use_id": block.id, "content": result}
            )

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages,
        )

    assistant_text = "".join(
        b.text for b in response.content if hasattr(b, "text")
    )

    database.save_message(conversation_id, "assistant", assistant_text)
    return assistant_text
```

**Step 2: Commit**

```bash
git add backend/chat.py
git commit -m "feat: add Claude chat module with tool-use loop"
```

---

### Task 7: PDF Report Generation

**Files:**
- Create: `backend/report.py`
- Create: `backend/templates/report.html`

**Step 1: Create backend/templates/ directory**

```bash
mkdir -p backend/templates
```

**Step 2: Write backend/templates/report.html**

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: #2e7d32; font-size: 22px; border-bottom: 2px solid #2e7d32; padding-bottom: 8px; }
        h2 { color: #1b5e20; font-size: 16px; margin-top: 24px; }
        .summary { background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        th { background: #2e7d32; color: white; padding: 8px 12px; text-align: left; }
        td { padding: 8px 12px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background: #f5f5f5; }
        .reason { font-style: italic; color: #555; }
        .footer { margin-top: 32px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; }
        a { color: #2e7d32; }
    </style>
</head>
<body>
    <h1>EPA Safer Choice Product Recommendations</h1>
    <div class="summary">
        <strong>Your needs:</strong> {{ summary }}
    </div>
    <h2>Recommended Products</h2>
    <table>
        <tr>
            <th>Product</th>
            <th>Company</th>
            <th>Sector</th>
            <th>Category</th>
            <th>Why Recommended</th>
        </tr>
        {% for rec in recommendations %}
        <tr>
            <td><a href="{{ rec.product_url }}">{{ rec.product_name }}</a></td>
            <td>{{ rec.company_name }}</td>
            <td>{{ rec.sector }}</td>
            <td>{{ rec.category }}</td>
            <td class="reason">{{ rec.reason }}</td>
        </tr>
        {% endfor %}
    </table>
    <div class="footer">
        <p>Generated on {{ date }} | Data source: EPA Safer Choice Program</p>
        <p>Learn more: <a href="https://www.epa.gov/saferchoice">epa.gov/saferchoice</a></p>
    </div>
</body>
</html>
```

**Step 3: Write backend/report.py**

```python
from pathlib import Path
from datetime import date
from jinja2 import Template
from weasyprint import HTML

TEMPLATE_PATH = Path(__file__).parent / "templates" / "report.html"
REPORTS_DIR = Path(__file__).parent.parent / "reports"


def generate_pdf(
    report_id: str,
    summary: str,
    recommendations: list[dict],
    products: list[dict],
):
    REPORTS_DIR.mkdir(exist_ok=True)

    products_by_id = {p["id"]: p for p in products}
    recs_with_details = []
    for rec in recommendations:
        product = products_by_id.get(rec["product_id"], {})
        recs_with_details.append({
            "product_name": product.get("product_name", "Unknown"),
            "company_name": product.get("company_name", "Unknown"),
            "sector": product.get("sector", "Unknown"),
            "category": product.get("category", "Unknown"),
            "product_url": product.get("product_url", "#"),
            "reason": rec.get("reason", ""),
        })

    template = Template(TEMPLATE_PATH.read_text())
    html_content = template.render(
        summary=summary,
        recommendations=recs_with_details,
        date=date.today().strftime("%B %d, %Y"),
    )

    output_path = REPORTS_DIR / f"{report_id}.pdf"
    HTML(string=html_content).write_pdf(str(output_path))
    return output_path
```

**Step 4: Commit**

```bash
git add backend/report.py backend/templates/report.html
git commit -m "feat: add PDF report generation with HTML template"
```

---

### Task 8: FastAPI Application

**Files:**
- Create: `backend/main.py`

**Step 1: Write backend/main.py**

```python
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from backend.models import ChatRequest, ChatResponse
from backend import database
from backend.chat import get_chat_response

app = FastAPI(title="EPA Safer Choice Chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

REPORTS_DIR = Path(__file__).parent.parent / "reports"


@app.post("/api/chat/new")
def new_conversation():
    conversation_id = str(uuid.uuid4())
    database.save_conversation(conversation_id)
    return {"conversation_id": conversation_id}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    response = get_chat_response(req.conversation_id, req.message)
    return ChatResponse(conversation_id=req.conversation_id, response=response)


@app.get("/api/chat/{conversation_id}/history")
def get_history(conversation_id: str):
    messages = database.get_messages(conversation_id)
    return {"conversation_id": conversation_id, "messages": messages}


@app.get("/api/chat/{conversation_id}/report/{report_id}")
def download_report(conversation_id: str, report_id: str):
    report = database.get_report(report_id)
    if not report or report["conversation_id"] != conversation_id:
        raise HTTPException(status_code=404, detail="Report not found")
    pdf_path = REPORTS_DIR / f"{report_id}.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Report file not found")
    return FileResponse(pdf_path, media_type="application/pdf", filename="epa-recommendations.pdf")
```

**Step 2: Test the server starts**

```bash
cd D:/projects/epa
backend/venv/Scripts/python -m uvicorn backend.main:app --reload --port 8000
```

Expected: Server starts, visit http://localhost:8000/docs to see auto-generated API docs.

**Step 3: Commit**

```bash
git add backend/main.py
git commit -m "feat: add FastAPI app with chat and report endpoints"
```

---

### Task 9: Initialize Next.js Frontend

**Files:**
- Create: `frontend/` (via create-next-app)

**Step 1: Scaffold Next.js project**

```bash
cd D:/projects/epa
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src --no-import-alias
```

When prompted: use defaults (Yes to all, no import alias).

**Step 2: Clean up boilerplate**

Remove default content from `frontend/src/app/page.tsx` and `frontend/src/app/globals.css` (keep Tailwind directives only).

**Step 3: Commit**

```bash
git add frontend/
git commit -m "chore: scaffold Next.js frontend with Tailwind"
```

---

### Task 10: Frontend — Chat Types and API Client

**Files:**
- Create: `frontend/src/lib/types.ts`
- Create: `frontend/src/lib/api.ts`

**Step 1: Write types.ts**

```typescript
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Product {
  id: number;
  program: string;
  category: string;
  sector: string;
  product_name: string;
  company_name: string;
  city: string | null;
  state: string | null;
  partner_since: number;
  fragrance_free: boolean;
  outdoor_use: boolean;
  company_in_good_standing: boolean;
  product_url: string;
}
```

**Step 2: Write api.ts**

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createConversation(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat/new`, { method: "POST" });
  const data = await res.json();
  return data.conversation_id;
}

export async function sendMessage(
  conversationId: string,
  message: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: conversationId, message }),
  });
  const data = await res.json();
  return data.response;
}

export function getReportUrl(conversationId: string, reportId: string): string {
  return `${API_BASE}/api/chat/${conversationId}/report/${reportId}`;
}
```

**Step 3: Commit**

```bash
git add frontend/src/lib/
git commit -m "feat: add frontend types and API client"
```

---

### Task 11: Frontend — Chat Components

**Files:**
- Create: `frontend/src/components/MessageBubble.tsx`
- Create: `frontend/src/components/ProductCard.tsx`
- Create: `frontend/src/components/ComparisonTable.tsx`
- Create: `frontend/src/components/DownloadButton.tsx`
- Create: `frontend/src/components/ChatWindow.tsx`

**Step 1: Write MessageBubble.tsx**

```tsx
import { Message } from "@/lib/types";

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-green-700 text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}
```

**Step 2: Write ProductCard.tsx**

```tsx
import { Product } from "@/lib/types";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 my-2 bg-white shadow-sm">
      <div className="font-semibold text-green-800 text-sm">{product.product_name}</div>
      <div className="text-xs text-gray-500 mt-1">{product.company_name}</div>
      <div className="flex flex-wrap gap-2 mt-2">
        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{product.sector}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{product.category}</span>
        {product.fragrance_free && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Fragrance-free</span>
        )}
        {product.outdoor_use && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Outdoor use</span>
        )}
      </div>
      <a
        href={product.product_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-2 text-xs text-green-700 underline"
      >
        View on EPA.gov
      </a>
    </div>
  );
}
```

**Step 3: Write DownloadButton.tsx**

```tsx
export default function DownloadButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      download
      className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 active:bg-green-900 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Download PDF Report
    </a>
  );
}
```

**Step 4: Write ChatWindow.tsx**

This is the main component. It manages conversation state, sends messages, and renders the chat UI.

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/lib/types";
import { createConversation, sendMessage } from "@/lib/api";
import MessageBubble from "./MessageBubble";

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! I'm your EPA Safer Choice product assistant. I can help you find certified cleaning products that are safer for you and the environment.\n\nAre you looking for products for home use or commercial/business use? What kind of cleaning do you need help with?",
};

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId;
    const id = await createConversation();
    setConversationId(id);
    return id;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const convoId = await ensureConversation();
      const response = await sendMessage(convoId, text);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleNewChat() {
    setMessages([WELCOME_MESSAGE]);
    setConversationId(null);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-green-800 text-white shrink-0">
        <div>
          <h1 className="font-bold text-base">EPA Safer Choice Assistant</h1>
          <p className="text-xs text-green-200">Find safer cleaning products</p>
        </div>
        <button
          onClick={handleNewChat}
          className="text-xs bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          New Chat
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-gray-400">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you need..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="shrink-0 bg-green-700 text-white rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-40 hover:bg-green-800 active:bg-green-900 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add chat UI components (mobile-first)"
```

---

### Task 12: Frontend — Main Page and Layout

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/globals.css`

**Step 1: Update globals.css** — keep only Tailwind directives

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 2: Update layout.tsx**

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EPA Safer Choice Assistant",
  description: "Find EPA Safer Choice certified cleaning products",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="overscroll-none">{children}</body>
    </html>
  );
}
```

**Step 3: Update page.tsx**

```tsx
import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  return <ChatWindow />;
}
```

**Step 4: Add .env.local to frontend**

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Step 5: Commit**

```bash
git add frontend/src/app/ frontend/.env.local
git commit -m "feat: wire up main page with chat window"
```

---

### Task 13: End-to-End Test

**No new files — manual integration test.**

**Step 1: Ensure products.db exists**

```bash
backend/venv/Scripts/python backend/import_data.py
```

**Step 2: Start backend**

```bash
cd D:/projects/epa
backend/venv/Scripts/python -m uvicorn backend.main:app --reload --port 8000
```

**Step 3: Start frontend (separate terminal)**

```bash
cd D:/projects/epa/frontend
npm run dev
```

**Step 4: Test in browser**

Open http://localhost:3000 on phone or mobile emulator.

Test these flows:
1. "I need an all-purpose cleaner for my home" → should search Consumer + All-Purpose Cleaners
2. "Show me fragrance-free options" → should filter fragrance_free=true
3. "Compare the first two products" → should show comparison
4. "Generate a report with your top picks" → should produce download link
5. Tap "New Chat" → should reset

**Step 5: Fix any issues found, then commit**

```bash
git add -A
git commit -m "chore: integration test fixes"
```

---

### Task 14: Final Cleanup and README

**Files:**
- Create: `README.md`

**Step 1: Write README.md**

```markdown
# EPA Safer Choice Product Chatbot

Conversational assistant for finding EPA Safer Choice certified cleaning products.

## Setup

### Backend

```bash
py -m venv backend/venv
backend/venv/Scripts/pip install -r backend/requirements.txt
```

Create `backend/.env`:
```
ANTHROPIC_API_KEY=your-key-here
```

Import data:
```bash
backend/venv/Scripts/python backend/import_data.py
```

Run:
```bash
backend/venv/Scripts/python -m uvicorn backend.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000
```

**Step 2: Final commit**

```bash
git add README.md
git commit -m "docs: add README with setup instructions"
```
