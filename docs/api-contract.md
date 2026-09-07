# CostWise API Contract

This document defines all API endpoints for the CostWise platform.
All parties (frontend, backend, data layer) build to this contract.

**Base URL:** `https://<api-gateway-id>.execute-api.<region>.amazonaws.com/<stage>`
(the currently deployed stage is `dev`; this contract is stage-agnostic)

**Auth:** All endpoints require a valid Cognito JWT token in the `Authorization` header,
except for login/signup which are handled directly by Cognito.

---

## Dashboard

### GET /dashboard
Returns a summary of the most recent day with sales data for the branch (`branch-001`),
plus day-over-day trends versus the prior day.

**Response:**
```json
{
  "revenue_today": 8430,
  "orders_today": 214,
  "avg_order_value": 39.40,
  "active_employees": 18,
  "popular_dishes": [
    { "name": "Burger", "count": 124 },
    { "name": "Pizza", "count": 98 }
  ],
  "weekly_revenue": [
    { "day": "Sun", "amount": 2300 },
    { "day": "Mon", "amount": 1800 },
    { "day": "Tue", "amount": 1500 },
    { "day": "Wed", "amount": 2100 },
    { "day": "Thu", "amount": 2400 },
    { "day": "Fri", "amount": 3200 },
    { "day": "Sat", "amount": 3100 }
  ],
  "data_date": "2026-04-15",
  "trends": {
    "revenue": 4.2,
    "orders": -1.1,
    "avg_order_value": 5.4
  }
}
```

- `data_date` — the date (`YYYY-MM-DD`) the rest of the response is based on. This is the most
  recent date with `SalesRecord` data, not necessarily "today" in wall-clock time.
- `trends.*` — percentage change vs. the prior day (`(today - yesterday) / yesterday * 100`,
  rounded to 1 decimal; `0` if the prior day had no data).
- `weekly_revenue` covers the last complete Sunday–Saturday week ending on or before `data_date`.

---

## Orders (Inventory Predictions)

### GET /orders?factors=&note=
Runs an OpenAI (`gpt-4.1-mini`) agent that pulls current inventory, the last 7 days of sales,
and demand forecasts, then returns AI-suggested order quantities per ingredient.

**Query params (both optional):**
- `factors` — comma-separated list of contextual factors to bias the recommendation
  (e.g. `Holiday Next Week,Bad Weather`)
- `note` — free-text note from the manager, appended to the prompt as additional context

**Response:**
```json
{
  "items": [
    {
      "item_id": "item-001",
      "name": "Tomatoes",
      "current_stock": 8,
      "predicted_need": 42,
      "suggested_order": 34,
      "cost": 68,
      "price_per_unit": 2.0,
      "status": "pending",
      "priority": "high",
      "reasoning": "Current stock is below min_stock and covers less than 3 days of demand."
    }
  ]
}
```

- `priority` — one of `high` / `medium` / `low`, set by the model (`high` when stock is below
  `min_stock` or the suggested order covers less than 3 days of demand).
- `reasoning` — 1–2 sentence explanation from the model for the suggested quantity.
- `price_per_unit` — unit price looked up from `InventoryItem`; `cost` is `suggested_order * price_per_unit`.

---

### POST /orders/approve
Approve or reject a suggested order for a single item. When `approved` is `true`, adds
`suggested_order` to the item's `current_stock` in `InventoryItem`.

**Request body:**
```json
{ "item_id": "item-001", "approved": true, "suggested_order": 34 }
```

**Response:**
```json
{ "success": true, "approved": true }
```

---

### POST /orders/approve-all
Approve a list of pending suggested orders at once. Adds each item's `suggested_order`
to its `current_stock` in `InventoryItem` (items with `suggested_order <= 0` are skipped).

**Request body:**
```json
{ "items": [ { "item_id": "item-001", "suggested_order": 34 } ] }
```

**Response:**
```json
{ "success": true, "updated": 5 }
```
`updated` is the count of items received in the request (not the count actually written).

---

## Workforce

### GET /workforce?week=2026-04-15
Generates an AI staff schedule and demand forecast for the given week using OpenAI
(`gpt-4.1-mini`), the last 7 days of sales, live weather (OpenWeatherMap), and upcoming
public holidays (date.nager.at API). Not cached — every call regenerates the schedule.

**Query param:** `week` — used as the returned `week_start`; the schedule itself always
covers the week starting "today" (the Lambda does not use `week` to look up a specific
past/future week's sales window).

**Response:**
```json
{
  "week_start": "2026-04-15",
  "schedule": [
    {
      "staff_id": "staff-001",
      "name": "David Cohen",
      "role": "Waiter",
      "shifts": {
        "Sun": "Morning",
        "Mon": "Day Off",
        "Tue": "Evening",
        "Wed": "Morning",
        "Thu": "Evening",
        "Fri": "Morning",
        "Sat": "Day Off"
      }
    }
  ],
  "predicted_customers": {
    "Sun": 120,
    "Mon": 95,
    "Tue": 85,
    "Wed": 110,
    "Thu": 130,
    "Fri": 210,
    "Sat": 195
  },
  "summary": {
    "total_shifts": 28,
    "understaffed_days": 0,
    "labor_cost": 4200
  }
}
```

- Each `shifts` value is exactly one of `"Morning"`, `"Evening"`, or `"Day Off"`.
- `summary.total_shifts` — count of `"Morning"`/`"Evening"` entries across all staff/days.
- `summary.understaffed_days` — currently always `0` (not computed by the Lambda).
- `summary.labor_cost` — `total_shifts * 150` (flat per-shift rate).

---

### POST /workforce/approve
Called by the frontend when a manager approves the generated schedule.

**Request body (as sent by the frontend):**
```json
{ "week_start": "2026-04-15", "schedule": [ /* schedule array from GET /workforce */ ] }
```

**Response:**
```json
{ "success": true }
```

Handled by `backend/functions/workforce-approve/handler.py` (deployed as the
`workforce-approver` Lambda): batch-writes the approved schedule into the `Shift`
table with `approval_status: approved`. The frontend ignores network errors, so a
failed approval still updates local UI state.

---

## Chatbot

### POST /chatbot
Send a message to the AI assistant and get a business insight back. Runs an OpenAI
(`gpt-4.1-mini`) agentic loop (up to 5 tool-calling iterations) with 8 DynamoDB-backed tools:
`get_revenue`, `get_weekly_revenue`, `compare_weeks`, `get_popular_dishes`,
`get_inventory_status`, `get_low_stock_items`, `get_active_employees`, `get_pending_orders`.

**Request body:**
```json
{
  "message": "What was the most profitable dish this week?",
  "history": [
    { "role": "user", "content": "How much revenue did we make today?" },
    { "role": "assistant", "content": "Today's revenue is **$8,430** from 214 orders." }
  ]
}
```
`history` is optional (defaults to `[]`) — the frontend sends the last 6 prior
messages (excluding the initial welcome message), each as `{ role, content }` with
`role` being `"user"` or `"assistant"`, prepended before the new `message`.

**Response:**
```json
{
  "reply": "Burger was your top performer this week.",
  "tools_used": ["get_popular_dishes"]
}
```
- `reply` — markdown-formatted text from the model.
- `tools_used` — ordered list of tool names invoked while answering (may be empty).
- This endpoint always returns HTTP 200, even on internal errors (the error is
  surfaced inside `reply` instead of via `statusCode`).

---

## Data Upload

Every `/data/*` endpoint requires a Cognito `custom:branch_id` custom claim on the JWT; if it
is missing the Lambda returns `403 { "error": "forbidden" }`.

### POST /data/upload-url
Request a pre-signed S3 URL (bucket `costwise-raw-uploads`, valid 300s) to upload a CSV file
directly from the browser.

**Request body:**
```json
{ "filename": "shift-2026-04-15.csv", "content_type": "text/csv" }
```

**Response:**
```json
{
  "upload_url": "<presigned S3 PUT URL>",
  "file_key": "uploads/branch-001/2026-04-15/3f1c2b9e-...-shift-2026-04-15.csv"
}
```
`file_key` is generated server-side as `uploads/{branch_id}/{upload_date}/{uuid}-{filename}`.
Uploading to `upload_url` triggers an S3 `ObjectCreated` event that invokes the
`data-processor` Lambda, which parses the CSV into `SalesRecord` rows and writes a
matching `UploadHistory` entry (see below).

---

### GET /data/uploads
Returns up to the 20 most recent upload records for the caller's branch, newest first.

**Response:**
```json
{
  "uploads": [
    {
      "branch_id": "branch-001",
      "upload_id": "8a1e...",
      "filename": "shift-2026-04-15.csv",
      "file_key": "uploads/branch-001/2026-04-15/8a1e...-shift-2026-04-15.csv",
      "uploaded_at": "2026-04-15T09:12:03",
      "status": "Processed",
      "record_count": 194,
      "error_count": 0
    }
  ]
}
```
`status` is `"Processed"` unless `error_count > record_count`, in which case it is `"Error"`.

---

### GET /data/summary?date=2026-04-15
Compares actual sales for a given date against the AI demand forecast for that date.

**Query param:** `date` — optional, `YYYY-MM-DD`; defaults to yesterday (UTC).

**Response:**
```json
{
  "date": "2026-04-15",
  "actual": {
    "revenue": 3380.42,
    "covers": 194,
    "avg_order": 17.42
  },
  "prediction_vs_reality": [
    {
      "metric": "Total Customers",
      "predicted": 180,
      "actual": 194,
      "accuracy": 92.2,
      "status": "good"
    },
    {
      "metric": "Total Revenue ($)",
      "predicted": 3135.6,
      "actual": 3380.42,
      "accuracy": 92.8,
      "status": "good"
    }
  ]
}
```
- `covers` is the number of `SalesRecord` items for the date (i.e. order count, not the
  `covers` field on each record).
- The "Total Customers" forecast comes from the `Forecast` table where
  `forecast_type = "inventory"` for that date (falls back to `150` if none found).
- `predicted` revenue is `predicted_customers * avg_order` (or `* 22.0` if there were no
  actual orders to compute an average from).
- `accuracy` is `100 - abs(predicted - actual) / actual * 100` (100 if `actual` is 0);
  `status` is `"good"` at `accuracy >= 80`, otherwise `"warning"`.
