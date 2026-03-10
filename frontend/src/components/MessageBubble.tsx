"use client";

import ReactMarkdown from "react-markdown";
import { Message } from "@/lib/types";

export default function MessageBubble({ message, darkMode = false }: { message: Message; darkMode?: boolean }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 animate-fade-in`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 mr-2.5 mt-0.5 shadow-sm">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
          isUser
            ? "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-br-sm"
            : darkMode
              ? "bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-sm"
              : "bg-white text-gray-700 border border-gray-100 rounded-bl-sm"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="markdown-content">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className={`text-lg font-bold mt-3 mb-2 first:mt-0 ${darkMode ? "text-white" : "text-gray-900"}`}>{children}</h1>,
                h2: ({ children }) => <h2 className={`text-base font-semibold mt-3 mb-1.5 first:mt-0 ${darkMode ? "text-white" : "text-gray-900"}`}>{children}</h2>,
                h3: ({ children }) => <h3 className={`text-sm font-semibold mt-2.5 mb-1 first:mt-0 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>{children}</h3>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-[13.5px]">{children}</li>,
                strong: ({ children }) => <strong className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2">
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className={`overflow-x-auto my-2 rounded-lg border ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                    <table className="w-full text-[13px]">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className={darkMode ? "bg-gray-700 text-gray-200" : "bg-emerald-50 text-gray-700"}>{children}</thead>,
                th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-[12px] uppercase tracking-wide">{children}</th>,
                td: ({ children }) => <td className={`px-3 py-2 border-t ${darkMode ? "border-gray-700" : "border-gray-100"}`}>{children}</td>,
                hr: () => <hr className={`my-3 ${darkMode ? "border-gray-700" : "border-gray-200"}`} />,
                code: ({ children }) => (
                  <code className={`px-1.5 py-0.5 rounded text-[13px] font-mono ${darkMode ? "bg-gray-700 text-emerald-400" : "bg-gray-100 text-emerald-700"}`}>{children}</code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
