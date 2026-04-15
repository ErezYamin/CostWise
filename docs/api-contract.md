# CostWise API Contract

This document defines all API endpoints for the CostWise platform.
All parties (frontend, backend, data layer) build to this contract.

**Base URL:** `https://<api-gateway-id>.execute-api.<region>.amazonaws.com/prod`

**Auth:** All endpoints require a valid Cognito JWT token in the `Authorization` header,
except for login/signup which are handled directly by Cognito.

---

## Dashboard

### GET /dashboard
Returns a summary of today's performance for a branch.

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
  ]
}
```

---

## Orders (Inventory Predictions)

### GET /orders
Returns current inventory levels and AI-suggested order quantities.

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
      "status": "pending"
    }
  ]
}
```

---

### POST /orders/approve
Approve or reject a suggested order for a single item.

**Request body:**
```json
{ "item_id": "item-001", "approved": true }
```

**Response:**
```json
{ "success": true }
```

---

### POST /orders/approve-all
Approve all pending suggested orders at once.

**Response:**
```json
{ "success": true, "updated": 5 }
```

---

## Workforce

### GET /workforce?week=2026-04-15
Returns the AI-suggested staff schedule for a given week.

**Query param:** `week` — the Monday start date of the week (YYYY-MM-DD)

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
        "Mon": "Off",
        "Tue": "Evening",
        "Wed": "Morning",
        "Thu": "Evening",
        "Fri": "Morning",
        "Sat": "Off"
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
    "understaffed_days": 1,
    "labor_cost": 4200
  }
}
```

---

### POST /workforce/approve
Approve the suggested schedule for a given week.

**Request body:**
```json
{ "week": "2026-04-15" }
```

**Response:**
```json
{ "success": true }
```

---

## Chatbot

### POST /chatbot
Send a message to the AI assistant and get a business insight back.

**Request body:**
```json
{ "message": "What was the most profitable dish this week?" }
```

**Response:**
```json
{ "reply": "Burger was your top performer with ₪3,240 in revenue this week." }
```

---

## Data Upload

### POST /data/upload-url
Request a pre-signed S3 URL to upload a CSV file directly from the browser.

**Request body:**
```json
{ "filename": "shift-2026-04-15.csv", "content_type": "text/csv" }
```

**Response:**
```json
{
  "upload_url": "<presigned S3 URL>",
  "file_key": "uploads/shift-2026-04-15.csv"
}
```

---

### GET /data/uploads
Returns a list of previously uploaded files and their processing status.

**Response:**
```json
{
  "uploads": [
    { "filename": "shift-2026-04-15.csv", "date": "2026-04-15", "status": "Processed" }
  ]
}
```

---

### GET /data/summary
Returns a quick summary of the most recently processed data upload.

**Response:**
```json
{
  "revenue": 3380,
  "covers": 194,
  "avg_order": 17.42,
  "top_dishes": [
    { "name": "Burger", "count": 58 },
    { "name": "Salad", "count": 41 }
  ]
}
```
