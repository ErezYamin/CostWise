# Chatbot Upgrade — Design Document

## Overview

Replace the keyword-matching Lambda with a real AI chatbot powered by OpenAI (`gpt-5-nano`) with function calling, conversation history, and 8 DynamoDB-backed tools.

---

## Backend

### Architecture

The Lambda runs an agentic loop against the OpenAI API:

1. Parse `message` + `history` from the request body
2. Send to `gpt-5-nano` with 8 tool definitions
3. If OpenAI responds with a tool call → execute it against DynamoDB → return result to OpenAI
4. Repeat up to 5 iterations (handles multi-tool and follow-up questions)
5. Return `{ reply, tools_used }` when OpenAI produces a final text response

### Configuration

- **Model:** `gpt-5-nano`
- **OpenAI API key:** stored as Lambda environment variable `OPENAI_API_KEY`
- **Max tool iterations:** 5 per request
- **Max tokens:** 1024
- **Lambda timeout:** 30s (up from default 3s)
- **Branch ID:** extracted from Cognito JWT claims (`custom:branch_id`), fallback `branch-001`

### Tools

| Tool | Table | What it fetches |
|------|-------|-----------------|
| `get_revenue_today` | SalesRecord | Sum of `total_amount` + order count for today |
| `get_weekly_revenue` | SalesRecord | Daily revenue breakdown for last 7 days |
| `compare_weeks` | SalesRecord | This week vs last week total revenue |
| `get_popular_dishes` | SalesRecord | Top 5 dishes by order count today |
| `get_inventory_status` | InventoryItem | All ingredients + current stock levels |
| `get_low_stock_items` | InventoryItem | Ingredients below reorder threshold (default 15) |
| `get_active_employees` | Shift | Staff scheduled today (by `date` field) |
| `get_pending_orders` | Forecast | Forecast items with `status = pending` |

All tables confirmed populated in us-east-1. `SalesRecord` has `dish` field; `Shift` has `date` field; `Forecast` has `status` field.

---

## Frontend

### `useChatbot.ts`

1. Pass the last 6 messages as `history` in every request body so OpenAI has conversation context for follow-up questions
2. Add tool labels for all 8 tools:

```typescript
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
```

3. Expose a `reset` function that clears messages back to the welcome message

### `Chatbot.tsx`

1. Replace broken suggested questions:
   - Remove: "How did this week compare to last week?"
   - Replace with: "Which ingredients are running low?" and "What were today's top dishes?"
2. Add a "New conversation" button (top-right of chat window) that calls `reset`

---

## AWS Setup

- Set `OPENAI_API_KEY` as a Lambda environment variable
- Increase Lambda timeout to 30s
- No IAM changes needed (no Bedrock)

---

## Out of Scope

- Persistent chat history across sessions (stateless per browser session)
- Mobile / responsive layout
- User-specific branch routing beyond Cognito claims
