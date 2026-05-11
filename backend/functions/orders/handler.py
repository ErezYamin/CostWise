import boto3
import json
from boto3.dynamodb.conditions import Key
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
inventory_table = dynamodb.Table('InventoryItem')
sales_table = dynamodb.Table('SalesRecord')
forecast_table = dynamodb.Table('Forecast')

BRANCH_ID = 'branch-001'

ITEM_COSTS = {
    'Tomatoes': 2.0,
    'Beef': 8.0,
    'Cheese': 4.0,
    'Lettuce': 1.5,
    'Pizza Dough': 2.0,
    'Potatoes': 1.0,
}


def decimal_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def get_inventory_items():
    response = inventory_table.query(
        KeyConditionExpression=Key('branch_id').eq(BRANCH_ID)
    )
    return response.get('Items', [])


def get_avg_daily_revenue():
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
    response = sales_table.query(
        IndexName='by-date',
        KeyConditionExpression=Key('branch_id').eq(BRANCH_ID) & Key('time_and_date').gt(thirty_days_ago)
    )
    records = response.get('Items', [])
    if not records:
        return 0.0
    total_revenue = sum(float(r['total_amount']) for r in records)
    return total_revenue / 30


def build_suggestion(item, avg_daily_revenue):
    item_name = item['name']
    current_stock = float(item.get('current_stock', 0))

    # Placeholder formula — SageMaker model will replace this
    base_weekly_need = avg_daily_revenue * 7 * 0.01
    predicted_need = round(base_weekly_need, 1)
    suggested_order = max(0, round(predicted_need - current_stock, 1))
    cost_per_unit = ITEM_COSTS.get(item_name, 3.0)
    estimated_cost = round(suggested_order * cost_per_unit, 2)

    return {
        'item_id': item.get('item_id', item_name),
        'name': item_name,
        'current_stock': current_stock,
        'predicted_need': predicted_need,
        'suggested_order': suggested_order,
        'cost': estimated_cost,
        'status': 'pending',
    }


def write_forecast(item, predicted_need):
    forecast_table.put_item(Item={
        'branch_id': BRANCH_ID,
        'forecast_id': str(uuid.uuid4()),
        'forecast_type': 'inventory',
        'item_id': item.get('item_id', item['name']),
        'item_name': item['name'],
        'forecast_date': datetime.utcnow().strftime('%Y-%m-%d'),
        'predicted_value': str(predicted_need),
        'confidence_score': '0.75',
        'status': 'pending',
    })


def lambda_handler(event, context):
    try:
        items = get_inventory_items()
        avg_daily_revenue = get_avg_daily_revenue()

        suggestions = []
        for item in items:
            suggestion = build_suggestion(item, avg_daily_revenue)
            write_forecast(item, suggestion['predicted_need'])
            suggestions.append(suggestion)

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'items': suggestions}, default=decimal_to_float)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
