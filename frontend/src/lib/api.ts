const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createConversation(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat/new`, { method: "POST" });
  const data = await res.json();
  return data.conversation_id;
}

export async function sendMessage(conversationId: string, message: string): Promise<string> {
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
