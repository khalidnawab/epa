"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/lib/types";
import { createConversation, sendMessage } from "@/lib/api";
import MessageBubble from "./MessageBubble";
import LoadingIndicator from "./LoadingIndicator";

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! I'm your EPA Safer Choice product assistant. I can help you find certified cleaning products that are safer for you and the environment.\n\nHow can I help you?",
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
  }, [messages, loading]);

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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
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
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="shrink-0 backdrop-blur-md bg-white/80 border-b border-gray-200/60 px-4 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-[15px] text-gray-900">EPA Safer Choice</h1>
              <p className="text-[11px] text-gray-500 font-medium">Product Assistant</p>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Chat
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {loading && <LoadingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 backdrop-blur-md bg-white/80 border-t border-gray-200/60 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-white rounded-2xl border border-gray-200 shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all px-4 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about cleaning products..."
              rows={1}
              className="flex-1 resize-none text-[14px] text-gray-700 placeholder:text-gray-400 bg-transparent py-1.5 focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="shrink-0 w-9 h-9 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl disabled:opacity-30 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 transition-all shadow-sm disabled:shadow-none"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Powered by EPA Safer Choice database
          </p>
        </div>
      </div>
    </div>
  );
}
