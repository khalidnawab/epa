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
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

REPORTS_DIR = Path(__file__).parent.parent / "reports"


@app.post("/api/chat/new")
def create_conversation():
    conversation_id = str(uuid.uuid4())
    database.save_conversation(conversation_id)
    return {"conversation_id": conversation_id}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    reply = get_chat_response(req.conversation_id, req.message)
    return ChatResponse(conversation_id=req.conversation_id, response=reply)


@app.get("/api/chat/{conversation_id}/history")
def get_history(conversation_id: str):
    messages = database.get_messages(conversation_id)
    return {"conversation_id": conversation_id, "messages": messages}


@app.get("/api/chat/{conversation_id}/report/{report_id}")
def get_report(conversation_id: str, report_id: str):
    report = database.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report["conversation_id"] != conversation_id:
        raise HTTPException(status_code=404, detail="Report not found for this conversation")
    pdf_path = REPORTS_DIR / f"{report_id}.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Report PDF file not found")
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename="epa-recommendations.pdf",
    )
