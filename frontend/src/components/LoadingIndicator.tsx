"use client";

import { useState, useEffect } from "react";

const ICONS = [
  // Spray bottle
  <svg key="spray" viewBox="0 0 40 40" fill="none" className="w-8 h-8">
    <g className="animate-spray-squirt origin-center">
      <rect x="14" y="16" width="12" height="18" rx="2" fill="#10b981" opacity="0.85" />
      <rect x="16" y="10" width="8" height="6" rx="1" fill="#059669" />
      <rect x="20" y="6" width="6" height="6" rx="1" fill="#047857" />
      <path d="M26 8 L30 4" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" className="animate-spray-mist" />
      <path d="M26 10 L31 8" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" className="animate-spray-mist delay-100" />
      <path d="M26 12 L30 12" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" className="animate-spray-mist delay-200" />
    </g>
  </svg>,

  // Mop
  <svg key="mop" viewBox="0 0 40 40" fill="none" className="w-8 h-8">
    <g className="animate-mop-sweep origin-bottom">
      <line x1="20" y1="4" x2="20" y2="24" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="10" y="24" width="20" height="4" rx="2" fill="#059669" />
      <path d="M10 28 Q12 34 14 28" stroke="#10b981" strokeWidth="1.5" fill="none" />
      <path d="M14 28 Q16 34 18 28" stroke="#10b981" strokeWidth="1.5" fill="none" />
      <path d="M18 28 Q20 34 22 28" stroke="#10b981" strokeWidth="1.5" fill="none" />
      <path d="M22 28 Q24 34 26 28" stroke="#10b981" strokeWidth="1.5" fill="none" />
      <path d="M26 28 Q28 34 30 28" stroke="#10b981" strokeWidth="1.5" fill="none" />
    </g>
    <g className="animate-sparkle-1">
      <path d="M6 20 l1.5-1.5 1.5 1.5-1.5 1.5z" fill="#6ee7b7" />
    </g>
    <g className="animate-sparkle-2">
      <path d="M32 16 l1.5-1.5 1.5 1.5-1.5 1.5z" fill="#6ee7b7" />
    </g>
  </svg>,

  // Sparkling plate
  <svg key="plate" viewBox="0 0 40 40" fill="none" className="w-8 h-8">
    <ellipse cx="20" cy="22" rx="14" ry="10" fill="#d1fae5" stroke="#10b981" strokeWidth="1.5" />
    <ellipse cx="20" cy="20" rx="9" ry="5" fill="none" stroke="#6ee7b7" strokeWidth="1" />
    <g className="animate-sparkle-1">
      <path d="M30 10 L31 8 L32 10 L31 12z" fill="#fbbf24" />
      <path d="M29.5 10 L32.5 10" stroke="#fbbf24" strokeWidth="0.5" />
      <path d="M31 8.5 L31 11.5" stroke="#fbbf24" strokeWidth="0.5" />
    </g>
    <g className="animate-sparkle-2">
      <path d="M10 14 L11 12 L12 14 L11 16z" fill="#fbbf24" />
      <path d="M9.5 14 L12.5 14" stroke="#fbbf24" strokeWidth="0.5" />
      <path d="M11 12.5 L11 15.5" stroke="#fbbf24" strokeWidth="0.5" />
    </g>
    <g className="animate-sparkle-3">
      <path d="M24 6 L25 4 L26 6 L25 8z" fill="#fbbf24" />
    </g>
  </svg>,

  // Bubbles / soap
  <svg key="bubbles" viewBox="0 0 40 40" fill="none" className="w-8 h-8">
    <circle cx="20" cy="24" r="8" fill="#d1fae5" stroke="#10b981" strokeWidth="1.5" className="animate-bubble-float" />
    <ellipse cx="17" cy="22" rx="2.5" ry="1.5" fill="white" opacity="0.6" transform="rotate(-20 17 22)" />
    <circle cx="10" cy="16" r="4" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1" className="animate-bubble-float-2" />
    <ellipse cx="8.5" cy="15" rx="1.5" ry="1" fill="white" opacity="0.5" transform="rotate(-20 8.5 15)" />
    <circle cx="30" cy="14" r="3" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1" className="animate-bubble-float-3" />
    <circle cx="14" cy="8" r="2" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="0.8" className="animate-bubble-float" />
    <circle cx="28" cy="28" r="2.5" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="0.8" className="animate-bubble-float-2" />
  </svg>,
];

const LABELS = [
  "Searching products...",
  "Scrubbing the database...",
  "Finding the safest picks...",
  "Almost there...",
];

export default function LoadingIndicator({ darkMode = false }: { darkMode?: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % ICONS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start mb-4 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 mr-2.5 mt-0.5 shadow-sm">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </div>
      <div className={`rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <div className="flex items-center gap-3">
          <div className="transition-all duration-500 ease-in-out" key={index}>
            {ICONS[index]}
          </div>
          <span className={`text-[13px] font-medium ${darkMode ? "text-gray-500" : "text-gray-400"}`}>{LABELS[index]}</span>
        </div>
      </div>
    </div>
  );
}
