import boto3
import json
import os
import traceback
from boto3.dynamodb.conditions import Key
from datetime import datetime, timedelta
from decimal import Decimal
from collections import Counter
from openai import OpenAI

dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
sales_table = dynamodb.Table("SalesRecord")
inv_table = dynamodb.Table("InventoryItem")
shift_tbl = dynamodb.Table("Shift")
forecast_tbl = dynamodb.Table("Forecast")
BRANCH_ID = "branch-001"

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def today_str():
    return datetime.utcnow().strftime("%Y-%m-%d")


def query_sales(start, end=None):
    if end:
        cond = Key("branch_id").eq(BRANCH_ID) & Key("time_and_date").between(start, end)
    else:
        cond = Key("branch_id").eq(BRANCH_ID) & Key("time_and_date").begins_with(start)
    return sales_table.query(IndexName="by-date", KeyConditionExpression=cond)["Items"]


def get_revenue(start_date=None, end_date=None):
    start = start_date or today_str()
    end = end_date or start
    sales = query_sales(start) if start == end else query_sales(start, end + "T99")
    revenue = round(sum(float(i["total_amount"]) for i in sales), 2)
    period = start if start == end else f"{start} to {end}"
    return {"revenue": revenue, "orders": len(sales), "period": period}


def get_weekly_revenue(start_date=None):
    start = start_date or str(datetime.utcnow().date() - timedelta(days=6))
    start_dt = datetime.strptime(start, "%Y-%m-%d").date()
    end = str(start_dt + timedelta(days=6)) + "T99"
    sales = query_sales(start, end)
    totals = {}
    for i in sales:
        day = i["time_and_date"][:10]
        totals[day] = totals.get(day, 0) + float(i["total_amount"])
    return {"weekly_revenue": totals, "period_start": start}


def compare_weeks(week1_start=None, week2_start=None):
    today = datetime.utcnow().date()
    w1_start = week1_start or str(today - timedelta(days=6))
    w1_dt = datetime.strptime(w1_start, "%Y-%m-%d").date()
    w1_end = str(w1_dt + timedelta(days=6)) + "T99"

    w2_start = week2_start or str(w1_dt - timedelta(days=7))
    w2_dt = datetime.strptime(w2_start, "%Y-%m-%d").date()
    w2_end = str(w2_dt + timedelta(days=6)) + "T99"

    w1_sales = query_sales(w1_start, w1_end)
    w2_sales = query_sales(w2_start, w2_end)
    w1_total = round(sum(float(i["total_amount"]) for i in w1_sales), 2)
    w2_total = round(sum(float(i["total_amount"]) for i in w2_sales), 2)

    return {
        "week1": {
            "start": w1_start,
            "end": str(w1_dt + timedelta(days=6)),
            "total": w1_total,
        },
        "week2": {
            "start": w2_start,
            "end": str(w2_dt + timedelta(days=6)),
            "total": w2_total,
        },
        "difference": round(w1_total - w2_total, 2),
    }


def get_popular_dishes(start_date=None, end_date=None):
    start = start_date or today_str()
    end = end_date or start
    sales = query_sales(start) if start == end else query_sales(start, end + "T99")
    counts = Counter(i["dish"] for i in sales if "dish" in i).most_common(5)
    period = start if start == end else f"{start} to {end}"
    return {
        "popular_dishes": [{"name": n, "count": c} for n, c in counts],
        "period": period,
    }


def get_inventory_status():
    items = inv_table.query(KeyConditionExpression=Key("branch_id").eq(BRANCH_ID))[
        "Items"
    ]
    return {
        "inventory": [
            {"name": i["name"], "stock": float(i.get("current_stock", 0))}
            for i in items
        ]
    }


def get_low_stock_items(threshold=15):
    items = inv_table.query(KeyConditionExpression=Key("branch_id").eq(BRANCH_ID))[
        "Items"
    ]
    return {
        "low_stock_items": [
            {"name": i["name"], "stock": float(i.get("current_stock", 0))}
            for i in items
            if float(i.get("current_stock", 0)) < threshold
        ]
    }


def get_active_employees():
    today = today_str()
    items = shift_tbl.query(
        IndexName="by-date",
        KeyConditionExpression=Key("branch_id").eq(BRANCH_ID) & Key("date").eq(today),
    )["Items"]
    return {
        "active_employees": [
            {"staff_id": i["staff_id"], "shift": i.get("time", "Unknown")}
            for i in items
        ]
    }


def get_pending_orders():
    items = forecast_tbl.query(KeyConditionExpression=Key("branch_id").eq(BRANCH_ID))[
        "Items"
    ]
    pending = [
        {
            "item": i["item_name"],
            "predicted_value": float(i.get("predicted_value", 0)),
            "confidence": float(i.get("confidence_score", 0)),
        }
        for i in items
        if i.get("status") == "pending"
    ]
    return {"pending_orders": pending}


TOOL_MAP = {
    "get_revenue": get_revenue,
    "get_weekly_revenue": get_weekly_revenue,
    "compare_weeks": compare_weeks,
    "get_popular_dishes": get_popular_dishes,
    "get_inventory_status": get_inventory_status,
    "get_low_stock_items": get_low_stock_items,
    "get_active_employees": get_active_employees,
    "get_pending_orders": get_pending_orders,
}

DATE_PARAM = {
    "type": "string",
    "description": "Date in YYYY-MM-DD format",
}

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_revenue",
            "description": "Get total revenue and order count for a date or date range. Defaults to today.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        **DATE_PARAM,
                        "description": "Start date (YYYY-MM-DD). Defaults to today.",
                    },
                    "end_date": {
                        **DATE_PARAM,
                        "description": "End date (YYYY-MM-DD). Defaults to start_date.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_weekly_revenue",
            "description": "Get daily revenue breakdown for a 7-day window. Defaults to the last 7 days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        **DATE_PARAM,
                        "description": "First day of the 7-day window. Defaults to 6 days ago.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_weeks",
            "description": "Compare revenue of two 7-day periods. Defaults to this week vs last week. Pass week1_start and week2_start to compare any two weeks.",
            "parameters": {
                "type": "object",
                "properties": {
                    "week1_start": {
                        **DATE_PARAM,
                        "description": "Start of the first week (YYYY-MM-DD). Defaults to 6 days ago.",
                    },
                    "week2_start": {
                        **DATE_PARAM,
                        "description": "Start of the second week (YYYY-MM-DD). Defaults to 7 days before week1_start.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_popular_dishes",
            "description": "Get the top 5 most ordered dishes for a date or date range. Defaults to today.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        **DATE_PARAM,
                        "description": "Start date (YYYY-MM-DD). Defaults to today.",
                    },
                    "end_date": {
                        **DATE_PARAM,
                        "description": "End date (YYYY-MM-DD). Defaults to start_date.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_inventory_status",
            "description": "Get current stock levels for all ingredients",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_low_stock_items",
            "description": "Get ingredients running below the reorder threshold",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_active_employees",
            "description": "Get staff members scheduled to work today",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_pending_orders",
            "description": "Get inventory forecast items awaiting approval",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]


SYSTEM_PROMPT = f"""You are CostWise AI, an intelligent restaurant management assistant for CostWise Demo Restaurant in Tel Aviv.
Today's date is {today_str()}.

Your job is to help restaurant managers make data-driven decisions by answering questions about revenue, inventory, staff, and orders — using real-time data from the restaurant's systems.

## Rules
- Always call the appropriate tool to fetch real data before answering. Never make up or estimate numbers.
- Only answer questions related to this restaurant's operations. If asked something outside your scope (weather, general knowledge, coding, etc.), politely say you can only help with restaurant data.
- Be concise and direct. Lead with the number or answer, then add context or a follow-up suggestion.
- Currency is USD ($).
- If data is empty or zero, say so honestly and suggest a possible reason.
- Format responses using markdown: use **bold** for key numbers and names, bullet lists for multiple items. Keep it clean — no headers, no excessive formatting.
- When the user asks about a specific date or period (e.g. "first week of June", "last Friday", "a year ago"), calculate the correct dates using today's date and pass them to the tools.

## Tools available
- get_revenue(start_date, end_date) — revenue for any date or range, defaults to today
- get_weekly_revenue(start_date) — 7-day daily breakdown from start_date, defaults to last 7 days
- compare_weeks(week1_start, week2_start) — compare any two 7-day periods, defaults to this week vs last week
- get_popular_dishes(start_date, end_date) — top 5 dishes for any date or range, defaults to today
- get_inventory_status — current stock levels
- get_low_stock_items — ingredients below reorder threshold
- get_active_employees — staff scheduled today
- get_pending_orders — forecast items awaiting approval

## Tone
Professional but friendly. You're a smart assistant, not a chatbot. Keep responses short unless the manager asks for details."""


def lambda_handler(event, context):
    try:
        raw_body = event.get("body")
        if isinstance(raw_body, str):
            body = json.loads(raw_body)
        elif isinstance(raw_body, dict):
            body = raw_body
        else:
            body = event
        user_message = body.get("message", "")
        history = body.get("history", [])
        messages = (
            [{"role": "system", "content": SYSTEM_PROMPT}]
            + history
            + [{"role": "user", "content": user_message}]
        )
        tools_used = []

        for _ in range(5):
            response = client.chat.completions.create(
                model="gpt-5-nano",
                messages=messages,
                tools=TOOL_DEFINITIONS,
                tool_choice="auto",
                max_completion_tokens=4096,
            )
            choice = response.choices[0]
            message = choice.message

            if choice.finish_reason == "tool_calls":
                messages.append(message)
                for tool_call in message.tool_calls:
                    if tool_call.type == "function":
                        tool_name = tool_call.function.name
                        args = json.loads(tool_call.function.arguments)
                        result = TOOL_MAP[tool_name](**args)
                        tools_used.append(tool_name)
                        messages.append(
                            {
                                "role": "tool",
                                "tool_call_id": tool_call.id,
                                "content": json.dumps(result),
                            }
                        )
            else:
                print("FINISH:", choice.finish_reason, "| CONTENT:", repr(message.content))
                reply = message.content or "I wasn't able to generate a response. Please try rephrasing your question."
                return {
                    "statusCode": 200,
                    "headers": {
                        "Access-Control-Allow-Origin": "*",
                        "Content-Type": "application/json",
                    },
                    "body": json.dumps(
                        {"reply": reply, "tools_used": tools_used},
                        default=decimal_default,
                    ),
                }

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
            "body": json.dumps(
                {
                    "reply": "I had trouble processing that. Please try again.",
                    "tools_used": tools_used,
                }
            ),
        }
    except Exception:
        print("CHATBOT ERROR:", traceback.format_exc())
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
            "body": json.dumps(
                {
                    "reply": "Something went wrong on my end. Please try again.",
                    "tools_used": [],
                }
            ),
        }
