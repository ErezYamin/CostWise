import boto3
import json
import os
from openai import OpenAI
from boto3.dynamodb.conditions import Key
from datetime import datetime, timedelta
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
client   = OpenAI(api_key=os.environ['OPENAI_API_KEY'])

inventory_table = dynamodb.Table('InventoryItem')
sales_table     = dynamodb.Table('SalesRecord')
forecast_table  = dynamodb.Table('Forecast')

BRANCH_ID = 'branch-001'

def decimal_default(obj):
    if isinstance(obj, Decimal): return float(obj)
    raise TypeError


# ── Tool functions ─────────────────────────────────────────────────────────────

def get_inventory_status():
    items = inventory_table.query(
        KeyConditionExpression=Key('branch_id').eq(BRANCH_ID)
    )['Items']
    return [
        {
            'item_id':        i['item_id'],
            'name':           i['name'],
            'current_stock':  float(i.get('current_stock', 0)),
            'unit':           i.get('unit', 'kg'),
            'price_per_unit': float(i.get('price_per_unit', 0)),
            'min_stock':      float(i.get('min_stock', 0)),
        }
        for i in items
    ]


def get_weekly_sales():
    today         = datetime.utcnow().date()
    seven_days_ago = (today - timedelta(days=6)).strftime('%Y-%m-%d')
    today_str      = today.strftime('%Y-%m-%d')

    sales = sales_table.query(
        IndexName='by-date',
        KeyConditionExpression=Key('branch_id').eq(BRANCH_ID) & Key('time_and_date').between(seven_days_ago, today_str + 'T23:59:59')
    )['Items']

    daily = {}
    for r in sales:
        day = r['time_and_date'][:10]
        if day not in daily:
            daily[day] = {'date': day, 'revenue': 0, 'orders': 0}
        daily[day]['revenue'] += float(r['total_amount'])
        daily[day]['orders']  += 1

    return list(daily.values())


def get_forecast_data():
    today   = datetime.utcnow().date()
    results = []

    items = forecast_table.query(
        KeyConditionExpression=Key('branch_id').eq(BRANCH_ID)
    )['Items']

    for i in range(7):
        day = str(today + timedelta(days=i))
        for item in items:
            if item.get('forecast_date') == day:
                results.append({
                    'date':            item['forecast_date'],
                    'forecast_type':   item.get('forecast_type'),
                    'predicted_value': float(item.get('predicted_value', 0)),
                    'confidence':      float(item.get('confidence_score', 0)),
                })

    return results


def execute_tool(name):
    if name == 'get_inventory_status': return get_inventory_status()
    if name == 'get_weekly_sales':     return get_weekly_sales()
    if name == 'get_forecast_data':    return get_forecast_data()
    return {}


# ── Tool definitions for OpenAI ────────────────────────────────────────────────

TOOLS = [
    {
        'type': 'function',
        'function': {
            'name': 'get_inventory_status',
            'description': 'Get current stock levels, price per unit, and minimum safe stock for all ingredients.',
            'parameters': {'type': 'object', 'properties': {}, 'required': []}
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_weekly_sales',
            'description': 'Get daily revenue and order counts for the past 7 days.',
            'parameters': {'type': 'object', 'properties': {}, 'required': []}
        }
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_forecast_data',
            'description': 'Get demand forecast predictions for the next 7 days.',
            'parameters': {'type': 'object', 'properties': {}, 'required': []}
        }
    },
]


# ── System prompt ──────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a restaurant inventory management AI for CostWise.
Your job is to analyze current stock levels, recent sales trends, and demand forecasts,
then recommend optimal ingredient order quantities for the next 7 days.

Use the available tools to gather the data you need before making recommendations.

When you have enough data, respond ONLY with a valid JSON object in this exact format:
{
  "items": [
    {
      "item_id": "<ingredient name>",
      "name": "<ingredient name>",
      "current_stock": <number>,
      "predicted_need": <number — total kg needed for next 7 days>,
      "suggested_order": <number — max(0, predicted_need - current_stock)>,
      "cost": <number — suggested_order multiplied by price_per_unit>,
      "status": "pending",
      "priority": "<high | medium | low>",
      "reasoning": "<1-2 sentences explaining why this order quantity was chosen>"
    }
  ]
}

Priority rules:
- high: current stock is below min_stock OR suggested_order covers less than 3 days of demand
- medium: stock is adequate but will run low within the week
- low: stock is healthy, ordering as routine replenishment

Be data-driven. Reference actual numbers from the tools in your reasoning."""


# ── Agent loop ─────────────────────────────────────────────────────────────────

def run_agent(factors=None, note=None):
    user_message = 'Analyze our current inventory and recommend what we should order for the next 7 days.'
    if factors:
        user_message += f' Consider these active factors: {", ".join(factors)}.'
    if note:
        user_message += f' Additional context from the manager: {note}'

    messages = [
        {'role': 'system', 'content': SYSTEM_PROMPT},
        {'role': 'user',   'content': user_message}
    ]

    for _ in range(6):
        response = client.chat.completions.create(
            model='gpt-4.1-mini',
            messages=messages,
            tools=TOOLS
        )

        choice  = response.choices[0]
        message = choice.message
        messages.append(message)

        if choice.finish_reason == 'stop':
            return json.loads(message.content)

        if choice.finish_reason == 'tool_calls':
            for tool_call in message.tool_calls:
                name   = tool_call.function.name
                result = execute_tool(name)
                messages.append({
                    'role':         'tool',
                    'tool_call_id': tool_call.id,
                    'content':      json.dumps(result, default=decimal_default)
                })

    return {'items': []}


# ── Lambda handler ─────────────────────────────────────────────────────────────

def lambda_handler(event, context):
    try:
        params  = event.get('queryStringParameters') or {}
        factors = params.get('factors', '').split(',') if params.get('factors') else None
        note    = params.get('note') or None

        result = run_agent(factors, note)

        inventory    = get_inventory_status()
        price_lookup   = {i['name'].lower(): i['price_per_unit'] for i in inventory}
        item_id_lookup = {i['name'].lower(): i['item_id']        for i in inventory}
        for item in result.get('items', []):
            key                    = item['name'].lower()
            price                  = price_lookup.get(key, 0)
            item['item_id']        = item_id_lookup.get(key, item['item_id'])
            item['price_per_unit'] = price
            item['cost']           = round(item.get('suggested_order', 0) * price, 2)

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps(result, default=decimal_default)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }
