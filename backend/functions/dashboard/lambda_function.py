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
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def get_most_recent_date():
    """Find the most recent date that has sales data."""
    response = sales_table.query(
        IndexName='by-date',
        KeyConditionExpression=boto3.dynamodb.conditions.Key('branch_id').eq(BRANCH_ID),
        ScanIndexForward=False,
        Limit=1,
        ProjectionExpression='time_and_date'
    )
    items = response.get('Items', [])
    if not items:
        return datetime.utcnow().strftime('%Y-%m-%d')
    return items[0]['time_and_date'][:10]


def get_sales_for_date(date_str):
    response = sales_table.query(
        IndexName='by-date',
        KeyConditionExpression=boto3.dynamodb.conditions.Key('branch_id').eq(BRANCH_ID)
            & boto3.dynamodb.conditions.Key('time_and_date').begins_with(date_str)
    )
    return response.get('Items', [])


def get_weekly_sales(anchor_date_str):
    """Get sales for the last complete Sun–Sat week ending on or before anchor_date."""
    anchor = datetime.strptime(anchor_date_str, '%Y-%m-%d').date()
    # weekday(): Mon=0 … Sat=5, Sun=6
    days_since_saturday = (anchor.weekday() - 5) % 7
    last_saturday = anchor - timedelta(days=days_since_saturday)
    week_start = last_saturday - timedelta(days=6)  # Sunday

    weekly = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        items = get_sales_for_date(str(day))
        total = sum(float(item['total_amount']) for item in items)
        weekly.append({'day': day.strftime('%a'), 'amount': round(total, 2)})

    return weekly


def get_active_employees(today):
    response = shift_table.scan(
        FilterExpression=boto3.dynamodb.conditions.Attr('date').eq(today)
            & boto3.dynamodb.conditions.Attr('branch_id').eq(BRANCH_ID)
            & boto3.dynamodb.conditions.Attr('time').ne('Off')
    )
    return len(response.get('Items', []))


def get_popular_dishes(sales_items, top_n=5):
    dishes = [item['dish'] for item in sales_items if 'dish' in item]
    counts = Counter(dishes).most_common(top_n)
    return [{'name': name, 'count': count} for name, count in counts]


def calc_trend(today_val, yesterday_val):
    if yesterday_val == 0:
        return 0
    return round((today_val - yesterday_val) / yesterday_val * 100, 1)


def lambda_handler(event, context):
    try:
        today = get_most_recent_date()
        yesterday = str((datetime.strptime(today, '%Y-%m-%d') - timedelta(days=1)).date())

        todays_sales = get_sales_for_date(today)
        revenue_today = sum(float(s['total_amount']) for s in todays_sales)
        orders_today = len(todays_sales)
        avg_order_value = round(revenue_today / orders_today, 2) if orders_today > 0 else 0

        yesterdays_sales = get_sales_for_date(yesterday)
        revenue_yesterday = sum(float(s['total_amount']) for s in yesterdays_sales)
        orders_yesterday = len(yesterdays_sales)
        avg_yesterday = round(revenue_yesterday / orders_yesterday, 2) if orders_yesterday > 0 else 0

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Authorization,Content-Type',
            },
            'body': json.dumps({
                'revenue_today': round(revenue_today, 2),
                'orders_today': orders_today,
                'avg_order_value': avg_order_value,
                'active_employees': get_active_employees(today),
                'popular_dishes': get_popular_dishes(todays_sales),
                'weekly_revenue': get_weekly_sales(today),
                'data_date': today,
                'trends': {
                    'revenue': calc_trend(revenue_today, revenue_yesterday),
                    'orders': calc_trend(orders_today, orders_yesterday),
                    'avg_order_value': calc_trend(avg_order_value, avg_yesterday),
                },
            }, default=decimal_to_float)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
