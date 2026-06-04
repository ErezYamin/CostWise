import boto3
import json
import os
from boto3.dynamodb.conditions import Key, Attr
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


def query_sales(start, end=None):
    if end:
        condition = Key("branch_id").eq(BRANCH_ID) & Key("time_and_date").between(
            start, end
        )
    else:
        condition = Key("branch_id").eq(BRANCH_ID) & Key("time_and_date").begins_with(
            start
        )
    return sales_table.query(IndexName="by-date", KeyConditionExpression=condition)[
        "Items"
    ]


def get_revenue_today():
    today = datetime.utcnow().strftime("%Y-%m-%d")

    sales = query_sales(today)
    revenue = round(sum(float(i["total_amount"]) for i in sales), 2)
    orders = len(sales)
    return {"revenue": revenue, "orders": orders, "date": today}


def get_weekly_revenue():
    today = datetime.utcnow().date()
    start = str(today - timedelta(days=6))
    end = str(today) + "T99"

    sales = query_sales(start, end)
    totals = {}
    for i in sales:
        day = i["time_and_date"][:10]
        totals[day] = totals.get(day, 0) + float(i["total_amount"])

    return {"weekly_revenue": totals}


def compare_weeks():
    today = datetime.utcnow().date()
    this_start = str(today - timedelta(days=6))
    this_end = str(today) + "T99"
    last_start = str(today - timedelta(days=13))
    last_end = str(today - timedelta(days=7)) + "T99"
    this_week = query_sales(this_start, this_end)
    last_week = query_sales(last_start, last_end)
    this_total = round(sum(float(i["total_amount"]) for i in this_week), 2)
    last_total = round(sum(float(i["total_amount"]) for i in last_week), 2)
    return {
        "this_week": this_total,
        "last_week": last_total,
        "difference": round(this_total - last_total, 2),
    }


def get_popular_dishes():
    today = datetime.utcnow().strftime("%Y-%m-%d")
    sales = query_sales(today)
    counts = Counter(i["dish"] for i in sales if "dish" in i).most_common(5)
    return {"popular_dishes": [{"name": n, "count": c} for n, c in counts]}


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
    today = datetime.utcnow().strftime("%Y-%m-%d")
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
    "get_revenue_today": get_revenue_today,
    "get_weekly_revenue": get_weekly_revenue,
    "compare_weeks": compare_weeks,
    "get_popular_dishes": get_popular_dishes,
    "get_inventory_status": get_inventory_status,
    "get_low_stock_items": get_low_stock_items,
    "get_active_employees": get_active_employees,
    "get_pending_orders": get_pending_orders,
}

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_revenue_today",
            "description": "Get total revenue and order count for today",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_weekly_revenue",
            "description": "Get daily revenue breakdown for the last 7 days",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_weeks",
            "description": "Compare this week's total revenue to last week",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_popular_dishes",
            "description": "Get the top 5 most ordered dishes today",
            "parameters": {"type": "object", "properties": {}, "required": []},
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


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        user_message = body.get("message", "")
        history = body.get("history", [])
        messages = history + [{"role": "user", "content": user_message}]
        tools_used = []
        for _ in range(5):
            response = client.chat.completions.create(
                model="gpt-5-nano",
                messages=messages,
                tools=TOOL_DEFINITIONS,
                tool_choice="auto",
                max_tokens=1024,
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
                return {
                    "statusCode": 200,
                    "headers": {
                        "Access-Control-Allow-Origin": "*",
                        "Content-Type": "application/json",
                    },
                    "body": json.dumps(
                        {"reply": message.content, "tools_used": tools_used},
                        default=decimal_default,
                    ),
                }
        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"reply": "I had trouble processing that. Please try again.", "tools_used": tools_used}),
        }
    except Exception:
        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"reply": "Something went wrong on my end. Please try again.", "tools_used": []}),
        }
