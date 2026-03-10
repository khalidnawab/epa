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
  const [darkMode, setDarkMode] = useState(false);
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
    <div className={`flex flex-col h-[100dvh] overflow-hidden ${darkMode ? "bg-gray-950" : "bg-gradient-to-br from-slate-100 via-gray-50 to-emerald-50/30"}`}>
      {/* Navigation Bar */}
      <nav className={`shrink-0 px-4 py-3 ${darkMode ? "bg-gray-900 border-b border-gray-800" : "bg-slate-900"} shadow-lg z-10`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-[15px] text-white tracking-tight">EPA Safer Choice</h1>
              <p className="text-[11px] text-slate-400 font-medium">Product Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all"
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? (
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg transition-all active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Chat
            </button>
          </div>
        </div>
      </nav>

      {/* Card fills remaining height */}
      <div className="flex-1 min-h-0 flex flex-col px-4 py-4 sm:py-5">
        <div className={`max-w-3xl mx-auto w-full flex-1 min-h-0 flex flex-col rounded-2xl shadow-xl overflow-hidden ${
          darkMode
            ? "bg-gray-900 border border-gray-800"
            : "bg-white/70 backdrop-blur-sm border border-white/80 shadow-gray-200/50"
        }`}>
          {/* Card header */}
          <div className={`shrink-0 px-5 py-3 border-b flex items-center gap-2.5 ${
            darkMode ? "border-gray-800 bg-gray-900/80" : "border-gray-100 bg-white/50"
          }`}>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Online — ready to help
            </span>
          </div>

          {/* Messages — this is the only scrollable area */}
          <div className={`flex-1 min-h-0 overflow-y-auto chat-scroll px-5 py-5 ${
            darkMode ? "bg-gray-900" : ""
          }`}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} darkMode={darkMode} />
            ))}
            {loading && <LoadingIndicator darkMode={darkMode} />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area — pinned to bottom of card */}
          <div className={`shrink-0 px-4 py-3 border-t ${
            darkMode ? "border-gray-800 bg-gray-900/80" : "border-gray-100 bg-gray-50/80"
          }`}>
            <div className={`flex items-end gap-2 rounded-xl border transition-all px-3 py-2 ${
              darkMode
                ? "bg-gray-800 border-gray-700 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20"
                : "bg-white border-gray-200 shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100"
            }`}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about cleaning products..."
                rows={1}
                className={`flex-1 resize-none text-[14px] bg-transparent py-1.5 focus:outline-none ${
                  darkMode
                    ? "text-gray-200 placeholder:text-gray-500"
                    : "text-gray-700 placeholder:text-gray-400"
                }`}
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
            <p className={`text-[10px] text-center mt-2 ${darkMode ? "text-gray-600" : "text-gray-400"}`}>
              Powered by EPA Safer Choice database
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
