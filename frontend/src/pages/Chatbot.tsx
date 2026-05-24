import { useState } from 'react'
import { useChatbot } from '../hooks/useChatbot'

const SUGGESTED = [
  "How much revenue did we make today?",
  'Which ingredients are running low?',
  'How did this week compare to last week?',
  'How many orders did we have today?',
]

export default function ChatbotPage() {
  const { messages, loading, thinking, send, bottomRef } = useChatbot()
  const [input, setInput] = useState('')

  const handleSend = (text: string) => {
    send(text)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">CostWise AI Assistant</h1>
        <p className="text-sm mt-1" style={{ color: '#8899BB' }}>Ask anything about your restaurant's performance</p>
      </div>

      {/* Chat window */}
      <div className="flex-1 rounded-xl p-6 overflow-y-auto space-y-4" style={{ background: '#111827', minHeight: 0 }}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
              style={{ background: msg.role === 'user' ? '#3B82F6' : '#1A2A40', color: '#EFF6FF' }}
            >
              {msg.content}
            </div>
            {msg.tools_used && msg.tools_used.length > 0 && (
              <div className="flex gap-2 mt-1 flex-wrap">
                {msg.tools_used.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs"
                    style={{ background: '#0C1422', color: '#3B82F6', border: '1px solid #1A2A40' }}>
                    {t.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
            <div className="text-xs mt-1 px-1" style={{ color: '#8899BB' }}>{msg.timestamp}</div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm" style={{ background: '#1A2A40', color: '#8899BB' }}>
              {thinking || 'Thinking...'}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      <div className="flex gap-2 flex-wrap">
        {SUGGESTED.map(s => (
          <button key={s} onClick={() => handleSend(s)} disabled={loading}
            className="px-3 py-1.5 rounded-full text-sm hover:opacity-80 transition-opacity disabled:opacity-40"
            style={{ background: '#1A2A40', color: '#EFF6FF', border: '1px solid #1A2A40' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-3 items-center rounded-xl px-4 py-3" style={{ background: '#111827' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(input)}
          placeholder="Ask CostWise anything about your restaurant..."
          className="flex-1 bg-transparent text-white placeholder:text-gray-500 outline-none text-sm"
        />
        <button onClick={() => handleSend(input)} disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
          style={{ background: '#3B82F6' }}>
          Send →
        </button>
      </div>
    </div>
  )
}
