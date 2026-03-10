# EPA Safer Choice Product Chatbot — Design

## Overview

A conversational chatbot that helps consumers and business/facility managers find EPA Safer Choice certified cleaning products. Users describe their cleaning needs in natural language, and the bot recommends, compares, and generates downloadable PDF reports of suitable products.

## Architecture

```
Next.js Frontend  ──▶  FastAPI Backend  ──▶  SQLite DB
(Chat UI)               │
                        ├─ POST /api/chat          (send message, get response)
                        ├─ POST /api/chat/new       (start new conversation)
                        ├─ GET  /api/chat/{id}/history (get conversation history)
                        └─ GET  /api/chat/{id}/report/{report_id} (download PDF)
                        │
                        └─ Claude API (tool-use pattern)
                            ├─ search_products()
                            ├─ get_product_details()
                            ├─ compare_products()
                            └─ generate_report()
```

**Approach:** Tool-use pattern. Claude receives user messages and decides when to call backend tool functions (search, compare, etc.). The backend executes those functions against SQLite, returns results to Claude, and Claude formulates a natural response. This keeps conversation logic in Claude and data logic in the backend.

## Tech Stack

- **Backend:** Python, FastAPI, SQLite, Anthropic SDK
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **PDF Generation:** WeasyPrint (HTML template → PDF)
- **Data Import:** pandas (one-time Excel → SQLite script)

## Data Model

### Products (imported from Excel)

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-generated |
| program | TEXT | "Safer Choice" or "DfE" |
| category | TEXT | "Consumer Product" or "Industrial/Institutional Product" |
| sector | TEXT | e.g. "All-Purpose Cleaners" |
| product_name | TEXT | |
| company_name | TEXT | |
| city | TEXT | nullable |
| state | TEXT | nullable |
| partner_since | INTEGER | year |
| fragrance_free | BOOLEAN | default false |
| outdoor_use | BOOLEAN | default false |
| company_in_good_standing | BOOLEAN | default true |
| product_url | TEXT | EPA page link |

UPCs, GTINs, MPNs dropped (50-88% null, not useful for chatbot).

### Conversations

| Column | Type |
|--------|------|
| id | TEXT PK (UUID) |
| created_at | DATETIME |

### Messages

| Column | Type |
|--------|------|
| id | INTEGER PK |
| conversation_id | FK → conversations |
| role | TEXT ("user" or "assistant") |
| content | TEXT |
| created_at | DATETIME |

### Reports

| Column | Type |
|--------|------|
| id | TEXT PK (UUID) |
| conversation_id | FK → conversations |
| product_ids | JSON |
| summary | TEXT |
| created_at | DATETIME |

No user auth for v1 — anonymous conversations.

## Claude Tools

### 1. search_products

- **Params:** category (opt), sector (opt), company (opt), state (opt), fragrance_free (opt bool), outdoor_use (opt bool), keyword (opt — fuzzy match on product_name)
- **Returns:** matching products (capped at 20), total count
- **Purpose:** initial search, narrowing down

### 2. get_product_details

- **Params:** product_id
- **Returns:** full product record
- **Purpose:** details on a specific product

### 3. compare_products

- **Params:** product_ids (list, 2-5)
- **Returns:** side-by-side attribute comparison
- **Purpose:** "compare these options"

### 4. generate_report

- **Params:** product_ids (list), user_needs_summary (string), recommendations (list of {product_id, reason})
- **Returns:** report ID + download URL
- **Purpose:** exportable PDF of recommendations

### System Prompt

Claude is instructed to:
- Act as an EPA Safer Choice product expert
- Ask clarifying questions (home vs commercial, cleaning type, preferences)
- Use tools to search/filter — never guess product data
- Present results conversationally with key details
- Offer comparisons and reports when appropriate
- All 50 sector names included in system prompt for reference

## Frontend

Single-page, mobile-first chat interface:

- **Mobile-first layout** — designed for phone browsers, scales up for desktop
- **Full-viewport chat** — `100dvh` to handle mobile browser chrome
- **Sticky input bar** — always visible above keyboard
- **Touch-friendly** — large tap targets, no hover-dependent interactions
- **Product cards** — styled cards for recommendations (name, company, sector, EPA link)
- **Comparison table** — rendered inline when comparing products
- **Download button** — inline when a report is generated
- **New chat button** — starts fresh conversation
- **Streaming responses** — typing feel via streamed API responses
- **Auto-scroll** to latest message

## Project Structure

```
epa/
├── backend/
│   ├── main.py              # FastAPI app, endpoints
│   ├── database.py          # SQLite connection, init, queries
│   ├── models.py            # Pydantic models
│   ├── tools.py             # Tool functions (search, compare, etc.)
│   ├── chat.py              # Claude API interaction, tool-use loop
│   ├── report.py            # PDF generation
│   ├── import_data.py       # One-time script: Excel → SQLite
│   ├── requirements.txt
│   └── templates/
│       └── report.html      # PDF report template
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx         # Chat page
│   │   └── globals.css
│   ├── components/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ComparisonTable.tsx
│   │   └── DownloadButton.tsx
│   ├── package.json
│   └── tailwind.config.ts
├── products.xlsx             # Source data
└── products.db               # Generated SQLite DB
```

## Dataset Summary

- 4,600 products, 325 companies, 50 sectors
- ~50/50 split between Consumer and Industrial/Institutional
- Top sectors: All-Purpose Cleaners, Laundry Detergents, Floor Cleaners
- Partnership years: 2001–2026
