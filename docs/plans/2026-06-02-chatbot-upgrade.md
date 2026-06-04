# Chatbot Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the keyword-matching Lambda with a real AI chatbot powered by OpenAI `gpt-5-nano` with function calling, conversation history, and 8 DynamoDB-backed tools.

**Architecture:** Lambda receives `message` + `history`, runs an agentic loop against OpenAI — GPT picks tools, Lambda executes them against DynamoDB, results go back to GPT, GPT writes the final reply. Frontend passes the last 6 messages as history so GPT can resolve follow-up questions.

**Tech Stack:** Python `openai` SDK, DynamoDB (`boto3`), React + TypeScript frontend

**Design doc:** `docs/plans/2026-06-02-chatbot-upgrade-design.md`

---

## Table of Contents

1. Rewrite Lambda with OpenAI agentic loop + 8 tools
2. Package and deploy Lambda
3. Update `useChatbot.ts` — history, tool labels, reset
4. Update `Chatbot.tsx` — suggested questions, New Conversation button
5. End-to-end smoke test

---

### Task 1: Rewrite Lambda

**Files:**
- Modify: `backend/functions/chatbot-assistant/lambda_function.py`

**Context:**

- No GSI on `Shift` table — must scan with `FilterExpression` on `branch_id` and `date`
- `Forecast` has `branch_id` as PK — query + filter by `status = pending` in Python
- `InventoryItem` has `branch_id` as PK — query returns all items for branch
- `SalesRecord` has a `by-date` GSI — query by `branch_id` + `time_and_date` prefix

**Step 1: Replace `lambda_function.py` with the following**

```python
import boto3
import json
import os
from boto3.dynamodb.conditions import Key, Attr
from datetime import datetime, timedelta
from decimal import Decimal
from collections import Counter
from openai import OpenAI

dynamodb    = boto3.resource('dynamodb', region_name='us-east-1')
sales_tbl   = dynamodb.Table('SalesRecord')
inv_tbl     = dynamodb.Table('InventoryItem')
shift_tbl   = dynamodb.Table('Shift')
forecast_tbl = dynamodb.Table('Forecast')

client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])

# ── Tool implementations ────────────────────────────────────────────────────

def get_revenue_today(branch_id):
    today = datetime.utcnow().strftime('%Y-%m-%d')
    items = sales_tbl.query(
        IndexName='by-date',
        KeyConditionExpression=Key('branch_id').eq(branch_id) & Key('time_and_date').begins_with(today)
    )['Items']
    return {'revenue': round(sum(float(i['total_amount']) for i in items), 2), 'orders': len(items), 'date': today}

def get_weekly_revenue(branch_id):
    today = datetime.utcnow().date()
    start = str(today - timedelta(days=6))
    end   = str(today) + 'T99'
    items = sales_tbl.query(
        IndexName='by-date',
        KeyConditionExpression=Key('branch_id').eq(branch_id) & Key('time_and_date').between(start, end)
    )['Items']
    totals = {}
    for i in items:
        day = i['time_and_date'][:10]
        totals[day] = round(totals.get(day, 0) + float(i['total_amount']), 2)
    return {'weekly_revenue': totals}

def compare_weeks(branch_id):
    today      = datetime.utcnow().date()
    this_start = str(today - timedelta(days=6))
    last_start = str(today - timedelta(days=13))
    last_end   = str(today - timedelta(days=7)) + 'T99'
    this_end   = str(today) + 'T99'
    this_items = sales_tbl.query(
        IndexName='by-date',
        KeyConditionExpression=Key('branch_id').eq(branch_id) & Key('time_and_date').between(this_start, this_end)
    )['Items']
    last_items = sales_tbl.query(
        IndexName='by-date',
        KeyConditionExpression=Key('branch_id').eq(branch_id) & Key('time_and_date').between(last_start, last_end)
    )['Items']
    this_total = round(sum(float(i['total_amount']) for i in this_items), 2)
    last_total = round(sum(float(i['total_amount']) for i in last_items), 2)
    return {'this_week': this_total, 'last_week': last_total, 'difference': round(this_total - last_total, 2)}

def get_popular_dishes(branch_id):
    today = datetime.utcnow().strftime('%Y-%m-%d')
    items = sales_tbl.query(
        IndexName='by-date',
        KeyConditionExpression=Key('branch_id').eq(branch_id) & Key('time_and_date').begins_with(today)
    )['Items']
    counts = Counter(i['dish'] for i in items if 'dish' in i).most_common(5)
    return {'popular_dishes': [{'name': n, 'count': c} for n, c in counts]}

def get_inventory_status(branch_id):
    items = inv_tbl.query(KeyConditionExpression=Key('branch_id').eq(branch_id))['Items']
    return {'inventory': [{'name': i['name'], 'stock': float(i.get('current_stock', 0))} for i in items]}

def get_low_stock_items(branch_id, threshold=15):
    items = inv_tbl.query(KeyConditionExpression=Key('branch_id').eq(branch_id))['Items']
    low   = [{'name': i['name'], 'stock': float(i.get('current_stock', 0))} for i in items if float(i.get('current_stock', 0)) < threshold]
    return {'low_stock_items': low}

def get_active_employees(branch_id):
    today = datetime.utcnow().strftime('%Y-%m-%d')
    items = shift_tbl.scan(
        FilterExpression=Attr('branch_id').eq(branch_id) & Attr('date').eq(today)
    )['Items']
    return {'active_employees': [{'staff_id': i['staff_id'], 'shift': i.get('time', 'Unknown')} for i in items]}

def get_pending_orders(branch_id):
    items = forecast_tbl.query(
        KeyConditionExpression=Key('branch_id').eq(branch_id)
    )['Items']
    pending = [
        {'item': i['item_name'], 'predicted_value': float(i.get('predicted_value', 0)), 'confidence': float(i.get('confidence_score', 0))}
        for i in items if i.get('status') == 'pending'
    ]
    return {'pending_orders': pending}

TOOL_MAP = {
    'get_revenue_today':    get_revenue_today,
    'get_weekly_revenue':   get_weekly_revenue,
    'compare_weeks':        compare_weeks,
    'get_popular_dishes':   get_popular_dishes,
    'get_inventory_status': get_inventory_status,
    'get_low_stock_items':  get_low_stock_items,
    'get_active_employees': get_active_employees,
    'get_pending_orders':   get_pending_orders,
}

TOOL_DEFINITIONS = [
    {'type': 'function', 'function': {'name': 'get_revenue_today',    'description': "Get total revenue and order count for today",                    'parameters': {'type': 'object', 'properties': {}, 'required': []}}},
    {'type': 'function', 'function': {'name': 'get_weekly_revenue',   'description': "Get daily revenue breakdown for the last 7 days",                'parameters': {'type': 'object', 'properties': {}, 'required': []}}},
    {'type': 'function', 'function': {'name': 'compare_weeks',        'description': "Compare this week's total revenue to last week",                 'parameters': {'type': 'object', 'properties': {}, 'required': []}}},
    {'type': 'function', 'function': {'name': 'get_popular_dishes',   'description': "Get the top 5 most ordered dishes today",                        'parameters': {'type': 'object', 'properties': {}, 'required': []}}},
    {'type': 'function', 'function': {'name': 'get_inventory_status', 'description': "Get current stock levels for all ingredients",                   'parameters': {'type': 'object', 'properties': {}, 'required': []}}},
    {'type': 'function', 'function': {'name': 'get_low_stock_items',  'description': "Get ingredients running below the reorder threshold",             'parameters': {'type': 'object', 'properties': {}, 'required': []}}},
    {'type': 'function', 'function': {'name': 'get_active_employees', 'description': "Get staff members scheduled to work today",                      'parameters': {'type': 'object', 'properties': {}, 'required': []}}},
    {'type': 'function', 'function': {'name': 'get_pending_orders',   'description': "Get inventory forecast items awaiting approval",                 'parameters': {'type': 'object', 'properties': {}, 'required': []}}},
]

# ── Helpers ─────────────────────────────────────────────────────────────────

def get_branch_id(event):
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    return claims.get('custom:branch_id', 'branch-001')

def decimal_default(obj):
    if isinstance(obj, Decimal): return float(obj)
    raise TypeError

# ── Handler ──────────────────────────────────────────────────────────────────

def lambda_handler(event, context):
    body         = json.loads(event.get('body', '{}'))
    user_message = body.get('message', '')
    history      = body.get('history', [])
    branch_id    = get_branch_id(event)

    messages   = history + [{'role': 'user', 'content': user_message}]
    tools_used = []

    for _ in range(5):
        response    = client.chat.completions.create(
            model='gpt-5-nano',
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice='auto',
            max_tokens=1024,
        )
        choice      = response.choices[0]
        finish      = choice.finish_reason

        if finish == 'tool_calls':
            messages.append(choice.message)
            for tc in choice.message.tool_calls:
                tools_used.append(tc.function.name)
                fn     = TOOL_MAP.get(tc.function.name)
                result = fn(branch_id) if fn else {'error': 'unknown tool'}
                messages.append({
                    'role': 'tool',
                    'tool_call_id': tc.id,
                    'content': json.dumps(result, default=decimal_default),
                })
        else:
            reply = choice.message.content
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'reply': reply, 'tools_used': tools_used}, default=decimal_default),
            }

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'reply': 'I had trouble processing that. Please try again.', 'tools_used': tools_used}),
    }
```

**Step 2: Verify the file saved correctly**

```bash
head -5 backend/functions/chatbot-assistant/lambda_function.py
```

Expected: first line is `import boto3`

---

### Task 2: Package and Deploy Lambda

**Files:**
- Read/write: `backend/functions/chatbot-assistant/`

**Step 1: Install `openai` into the package directory**

```bash
cd backend/functions/chatbot-assistant
pip install openai -t . --quiet
```

**Step 2: Zip the package**

```bash
zip -r function.zip . --exclude "*.pyc" --exclude "__pycache__/*"
```

**Step 3: Upload to Lambda**

```bash
aws lambda update-function-code \
  --function-name chatbot-assistant \
  --zip-file fileb://function.zip \
  --region us-east-1
```

Expected: JSON response with `"LastUpdateStatus": "InProgress"` or `"Successful"`

**Step 4: Set the OpenAI API key environment variable**

```bash
aws lambda update-function-configuration \
  --function-name chatbot-assistant \
  --environment "Variables={OPENAI_API_KEY=<your-key-here>}" \
  --region us-east-1
```

Replace `<your-key-here>` with the actual key from the OpenAI dashboard.

**Step 5: Increase Lambda timeout to 30 seconds**

```bash
aws lambda update-function-configuration \
  --function-name chatbot-assistant \
  --timeout 30 \
  --region us-east-1
```

**Step 6: Smoke test the Lambda directly**

```bash
aws lambda invoke \
  --function-name chatbot-assistant \
  --payload '{"body": "{\"message\": \"What is today\\'s revenue?\", \"history\": []}"}' \
  --region us-east-1 \
  /tmp/chatbot_response.json && cat /tmp/chatbot_response.json
```

Expected: JSON with `reply` containing a revenue figure and `tools_used: ["get_revenue_today"]`

**Step 7: Commit**

```bash
cd ../../..
git add backend/functions/chatbot-assistant/lambda_function.py
git commit -m "feat: replace chatbot Lambda with OpenAI gpt-5-nano agentic loop"
```

---

### Task 3: Update `useChatbot.ts`

**Files:**
- Modify: `frontend/src/hooks/useChatbot.ts`

**What changes:**
1. Expand `TOOL_LABELS` to cover all 8 tools
2. Pass last 6 messages as `history` in every request
3. Expose a `reset` function that clears back to the welcome message

**Step 1: Replace `useChatbot.ts` with the following**

```typescript
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
  get_weekly_revenue:   'Fetching weekly revenue data...',
  compare_weeks:        'Comparing this week to last week...',
  get_popular_dishes:   'Finding top dishes...',
  get_inventory_status: 'Checking inventory levels...',
  get_low_stock_items:  'Checking low stock...',
  get_active_employees: 'Checking active staff...',
  get_pending_orders:   'Fetching pending orders...',
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

  const reset = () => setMessages([{ ...WELCOME, id: Date.now().toString(), timestamp: new Date().toLocaleTimeString() }])

  const send = async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = {
      id:        Date.now().toString(),
      role:      'user',
      content:   text,
      timestamp: new Date().toLocaleTimeString(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setThinking('Thinking...')

    try {
      const token   = await getToken()
      const history = [...messages, userMsg]
        .slice(-6)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))

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
        id:        Date.now().toString(),
        role:      'assistant',
        content:   reply,
        tools_used,
        timestamp: new Date().toLocaleTimeString(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id:        Date.now().toString(),
        role:      'assistant',
        content:   'Sorry, I had trouble connecting to the server. Please try again.',
        timestamp: new Date().toLocaleTimeString(),
      }])
    } finally {
      setLoading(false)
      setThinking('')
    }
  }

  return { messages, loading, thinking, send, reset, bottomRef }
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useChatbot.ts
git commit -m "feat: pass conversation history and add all tool labels to useChatbot"
```

---

### Task 4: Update `Chatbot.tsx`

**Files:**
- Modify: `frontend/src/pages/Chatbot.tsx`

**What changes:**
1. Fix suggested questions — remove "How did this week compare to last week?" (broken), replace with two new ones
2. Add a "New conversation" button that calls `reset`

**Step 1: Replace the file with the following**

```tsx
import { useState } from 'react'
import { useChatbot } from '../hooks/useChatbot'

const SUGGESTED = [
  'How much revenue did we make today?',
  'Which ingredients are running low?',
  "What were today's top dishes?",
  'How many orders did we have today?',
]

export default function ChatbotPage() {
  const { messages, loading, thinking, send, reset, bottomRef } = useChatbot()
  const [input, setInput] = useState('')

  const handleSend = (text: string) => {
    send(text)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">CostWise AI Assistant</h1>
          <p className="text-sm mt-1" style={{ color: '#8899BB' }}>Ask anything about your restaurant's performance</p>
        </div>
        <button
          onClick={reset}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40 transition-opacity hover:opacity-80"
          style={{ background: '#1A2A40', color: '#8899BB', border: '1px solid #1A2A40' }}
        >
          New conversation
        </button>
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
```

**Step 2: Commit**

```bash
git add frontend/src/pages/Chatbot.tsx
git commit -m "feat: fix suggested questions and add New Conversation button"
```

---

### Task 5: End-to-End Smoke Test

**Step 1: Start the frontend dev server**

```bash
cd frontend && npm run dev
```

**Step 2: Open the Chatbot screen and test these scenarios in order**

| Message | Expected tool chip | Expected reply contains |
|---------|-------------------|------------------------|
| "What's today's revenue?" | `get revenue today` | A dollar amount |
| "How many orders?" | *(follow-up, no new tool call needed)* | An order count |
| "Which ingredients are running low?" | `get low stock items` | Ingredient names |
| "What about this week vs last week?" | `compare weeks` | Two revenue totals |
| "Who's working today?" | `get active employees` | Staff IDs or shift times |
| "What are the pending orders?" | `get pending orders` | Item names |

**Step 3: Test the New Conversation button**

Click "New conversation" — chat should reset to just the welcome message.

**Step 4: Test a follow-up question**

1. Ask "What's today's revenue?"
2. Ask "What's the most popular dish?"
3. Ask "How does that compare to yesterday?" — GPT should resolve "that" from history

**Step 5: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: chatbot smoke test corrections"
```
