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
    <div className="flex flex-col h-[100dvh] bg-white">
      <header className="flex items-center justify-between px-4 py-3 bg-green-800 text-white shrink-0">
        <div>
          <h1 className="font-bold text-base">EPA Safer Choice Assistant</h1>
          <p className="text-xs text-green-200">
            Find safer cleaning products
          </p>
        </div>
        <button
          onClick={handleNewChat}
          className="text-xs bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          New Chat
        </button>
      </header>
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
