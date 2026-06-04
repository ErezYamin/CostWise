import boto3
import json
from datetime import datetime, timedelta
from decimal import Decimal
from collections import Counter

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
sales_table = dynamodb.Table('SalesRecord')
shift_table = dynamodb.Table('Shift')

BRANCH_ID = 'branch-001'


def decimal_to_float(obj):
    """DynamoDB returns Decimals — convert them to floats for JSON serialization."""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def get_todays_sales():
    """Scan SalesRecord for all sales from today."""
    today = datetime.utcnow().strftime('%Y-%m-%d')

    response = sales_table.query(
        IndexName='by-date',
        KeyConditionExpression=boto3.dynamodb.conditions.Key('branch_id').eq(BRANCH_ID)
            & boto3.dynamodb.conditions.Key('time_and_date').begins_with(today)
    )
    return response.get('Items', [])


def get_weekly_sales():
    """Get sales for each of the last 7 days."""
    today = datetime.utcnow().date()
    weekly = []

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = str(day)

        response = sales_table.query(
            IndexName='by-date',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('branch_id').eq(BRANCH_ID)
                & boto3.dynamodb.conditions.Key('time_and_date').begins_with(day_str)
        )
        items = response.get('Items', [])
        total = sum(float(item['total_amount']) for item in items)

        weekly.append({
            'day': day.strftime('%a'),  # Mon, Tue, Wed...
            'amount': round(total, 2)
        })

    return weekly


def get_active_employees():
    """Count staff with a Morning or Evening shift today."""
    today = datetime.utcnow().strftime('%Y-%m-%d')

    response = shift_table.scan(
        FilterExpression=boto3.dynamodb.conditions.Attr('date').eq(today)
            & boto3.dynamodb.conditions.Attr('branch_id').eq(BRANCH_ID)
            & boto3.dynamodb.conditions.Attr('time').ne('Off')
    )
    return len(response.get('Items', []))


def get_popular_dishes(sales_items, top_n=5):
    """Count dish frequency and return the top N."""
    dishes = [item['dish'] for item in sales_items if 'dish' in item]
    counts = Counter(dishes).most_common(top_n)
    return [{'name': name, 'count': count} for name, count in counts]


def lambda_handler(event, context):
    try:
        # 1. Today's sales
        todays_sales = get_todays_sales()
        revenue_today = sum(float(s['total_amount']) for s in todays_sales)
        orders_today = len(todays_sales)
        avg_order_value = round(revenue_today / orders_today, 2) if orders_today > 0 else 0

        # 2. Weekly revenue
        weekly_revenue = get_weekly_sales()

        # 3. Popular dishes
        popular_dishes = get_popular_dishes(todays_sales)

        # 4. Active employees today
        active_employees = get_active_employees()

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'revenue_today': round(revenue_today, 2),
                'orders_today': orders_today,
                'avg_order_value': avg_order_value,
                'active_employees': active_employees,
                'popular_dishes': popular_dishes,
                'weekly_revenue': weekly_revenue,
            }, default=decimal_to_float)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
