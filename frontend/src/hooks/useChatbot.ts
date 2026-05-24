import { useState, useEffect, useRef } from 'react'
import { API_BASE } from '../config'
import { getToken } from '../lib/auth'

export interface Message {
  id:          string
  role:        'user' | 'assistant'
  content:     string
  tools_used?: string[]
  timestamp:   string
}

const TOOL_LABELS: Record<string, string> = {
  get_revenue_today:    "Checking today's revenue...",
  get_inventory_status: 'Checking inventory levels...',
  get_weekly_revenue:   'Fetching weekly revenue data...',
}

const WELCOME: Message = {
  id: '0',
  role: 'assistant',
  content: "Hi! I'm CostWise AI. Ask me anything about your restaurant's performance — I'll look up the real data for you.",
  timestamp: new Date().toLocaleTimeString(),
}

export function useChatbot() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [loading, setLoading]   = useState(false)
  const [thinking, setThinking] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    if (!text.trim() || loading) return

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    }])
    setLoading(true)
    setThinking('Thinking...')

    try {
      const token = await getToken()
      const res   = await fetch(`${API_BASE}/chatbot`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ message: text }),
      })
      const raw = await res.json()
      const { reply, tools_used = [] } = raw.body ? JSON.parse(raw.body) : raw

      if (tools_used.length > 0) {
        setThinking(TOOL_LABELS[tools_used[0]] ?? 'Fetching data...')
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: reply,
        tools_used,
        timestamp: new Date().toLocaleTimeString(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble connecting to the server. Please try again.',
        timestamp: new Date().toLocaleTimeString(),
      }])
    } finally {
      setLoading(false)
      setThinking('')
    }
  }

  return { messages, loading, thinking, send, bottomRef }
}
