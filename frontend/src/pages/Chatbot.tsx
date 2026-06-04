import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useChatbot } from "../hooks/useChatbot";

const SUGGESTED = [
  "How much revenue did we make today?",
  "Which ingredients are running low?",
  "What were today's top dishes?",
  "How did this week compare to last week?",
];

export default function ChatbotPage() {
  const { messages, loading, thinking, send, reset, bottomRef } = useChatbot();
  const [input, setInput] = useState("");

  const handleSend = (text: string) => {
    send(text);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            CostWise AI Assistant
          </h1>
          <p className="text-sm mt-1" style={{ color: "#8899BB" }}>
            Ask anything about your restaurant's performance
          </p>
        </div>
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-lg text-sm hover:opacity-80 transition-opacity"
          style={{ background: "#1A2A40", color: "#8899BB", border: "1px solid #1A2A40" }}
        >
          + New conversation
        </button>
      </div>

      {/* Chat window */}
      <div
        className="flex-1 rounded-xl p-6 overflow-y-auto space-y-4"
        style={{ background: "#111827", minHeight: 0 }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}
              style={{
                background: msg.role === "user" ? "#3B82F6" : "#1A2A40",
                color: "#EFF6FF",
              }}
            >
              {msg.role === "user" ? (
                msg.content
              ) : (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="mb-1 last:mb-0">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-white">
                        {children}
                      </strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="mt-1 mb-1 space-y-1 pl-2">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="flex gap-2 items-start">
                        <span style={{ color: "#3B82F6", flexShrink: 0 }}>
                          •
                        </span>
                        <span>{children}</span>
                      </li>
                    ),
                    code: ({ children }) => (
                      <code
                        className="px-1 py-0.5 rounded text-xs"
                        style={{ background: "#0C1422", color: "#60A5FA" }}
                      >
                        {children}
                      </code>
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
            <div className="text-xs mt-1 px-1" style={{ color: "#8899BB" }}>
              {msg.timestamp}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm flex items-center gap-2"
              style={{ background: "#1A2A40", color: "#8899BB" }}
            >
              <span>{thinking || "Thinking..."}</span>
              <span className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "#3B82F6",
                      animation: "bounce 1.2s infinite",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      <div className="flex gap-2 flex-wrap">
        {SUGGESTED.map((s) => (
          <button
            key={s}
            onClick={() => handleSend(s)}
            disabled={loading}
            className="px-3 py-1.5 rounded-full text-sm hover:opacity-80 transition-opacity disabled:opacity-40"
            style={{
              background: "#1A2A40",
              color: "#EFF6FF",
              border: "1px solid #1A2A40",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        className="flex gap-3 items-center rounded-xl px-4 py-3"
        style={{ background: "#111827" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && !e.shiftKey && handleSend(input)
          }
          placeholder="Ask CostWise anything about your restaurant..."
          className="flex-1 bg-transparent text-white placeholder:text-gray-500 outline-none text-sm"
        />
        <button
          onClick={() => handleSend(input)}
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
          style={{ background: "#3B82F6" }}
        >
          Send →
        </button>
      </div>
    </div>
  );
}
