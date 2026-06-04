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
  get_revenue:          'Checking revenue...',
  get_weekly_revenue:   'Fetching weekly revenue data...',
  compare_weeks:        'Comparing this week to last week...',
  get_popular_dishes:             'Finding top dishes...',
  get_popular_dishes_last_week:   "Finding last week's top dishes...",
  get_inventory_status: 'Checking inventory levels...',
  get_low_stock_items:  'Checking low stock...',
  get_active_employees: 'Checking active staff...',
  get_pending_orders:   'Fetching pending orders...',
}

const WELCOME: Message = {
  id: '0',
  role: 'assistant',
  content: "Hi! I'm CostWise AI. Ask me anything about your restaurant's performance — I'll look up the real data for you.",
  get timestamp() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) },
}

const STORAGE_KEY = 'costwise_chat_history'

export function useChatbot() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : [WELCOME]
    } catch {
      return [WELCOME]
    }
  })
  const [loading, setLoading]   = useState(false)
  const [thinking, setThinking] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setThinking('Thinking...')

    try {
      const token = await getToken()

      // Build history from last 6 messages (excluding welcome), formatted for OpenAI
      const history = messages
        .filter(m => m.id !== '0')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch(`${API_BASE}/chatbot`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ message: text, history }),
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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble connecting to the server. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      }])
    } finally {
      setLoading(false)
      setThinking('')
    }
  }

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY)
    setMessages([WELCOME])
  }

  return { messages, loading, thinking, send, reset, bottomRef }
}
