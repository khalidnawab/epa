# EPA Safer Choice Product Chatbot

Conversational assistant for finding EPA Safer Choice certified cleaning products. Powered by Claude (tool-use pattern) with a FastAPI backend and Next.js frontend.

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

Import product data:
```bash
backend/venv/Scripts/python backend/import_data.py
```

Start the server:
```bash
backend/venv/Scripts/python -m uvicorn backend.main:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install
npm run dev -- --port 3001
```

Visit http://localhost:3001

### Note on ports

Update `frontend/.env.local` if you use different ports:
```
NEXT_PUBLIC_API_URL=http://localhost:8001
```

Update CORS origins in `backend/main.py` to match your frontend URL.

## API Endpoints

- `POST /api/chat/new` — Start a new conversation
- `POST /api/chat` — Send a message (`{conversation_id, message}`)
- `GET /api/chat/{id}/history` — Get conversation history
- `GET /api/chat/{id}/report/{report_id}` — Download PDF report

## WeasyPrint (PDF) Requirements

WeasyPrint requires GTK3/Pango native libraries. On Windows with MSYS2:
```bash
winget install MSYS2.MSYS2
# In MSYS2 terminal:
pacman -S mingw-w64-x86_64-gtk3
```
Add `C:\msys64\mingw64\bin` to your PATH.
