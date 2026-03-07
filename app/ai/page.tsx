"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Why am I plateauing?",
  "What should I train this week?",
  "Build me a 4-week finger strength plan",
  "How often should I hangboard?",
  "Am I overtraining?",
  "How do I improve my crimp strength?",
];

export default function AICoachPage() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) { window.location.href = "/auth/login"; }
  }, [user, loading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (text: string) => {
    if (!text.trim() || thinking) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });
      const data = await r.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || "No response" },
      ]);
    } finally {
      setThinking(false);
    }
  };

  if (loading) return null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col h-[calc(100dvh-4rem)] md:h-[calc(100dvh-5rem)] px-4 py-4 md:px-6">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-bold text-white">AI Coach</h1>
        <p className="text-sm text-white/40">
          Ask anything about your training, goals, or technique
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="py-8">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-brand-400">
                <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 11l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-center text-sm text-white/50 mb-6">
              Your AI coach has context about your training logs, max hang tests, and goals.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-left text-sm text-white/60 hover:border-white/20 hover:text-white transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand-500 text-black rounded-br-sm"
                  : "bg-[#1a1a1a] text-white/80 rounded-bl-sm border border-white/[0.07]"
              }`}
            >
              {msg.content.split("\n").map((line, j) => (
                <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-white/[0.07] bg-[#1a1a1a] px-4 py-3">
              <div className="flex gap-1.5 items-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-2">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2"
        >
          <input
            type="text"
            className="input flex-1"
            placeholder="Ask your coach anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={thinking}
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 2l3 6-3 6 12-6z" fill="currentColor"/>
            </svg>
          </button>
        </form>
        <p className="mt-2 text-center text-[10px] text-white/20">
          AI responses are for training guidance only — not medical advice
        </p>
      </div>
    </div>
  );
}
