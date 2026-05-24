import boto3
import json
from boto3.dynamodb.conditions import Key
from datetime import datetime, timedelta
from decimal import Decimal

dynamodb     = boto3.resource('dynamodb')
sales_table  = dynamodb.Table('SalesRecord')
forecast_tbl = dynamodb.Table('Forecast')
BRANCH_ID    = 'branch-001'

def decimal_default(obj):
    if isinstance(obj, Decimal): return float(obj)
    raise TypeError

def lambda_handler(event, context):
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')

    # Actual sales for yesterday
    sales = sales_table.query(
        IndexName='by-date',
        KeyConditionExpression=Key('branch_id').eq(BRANCH_ID) & Key('time_and_date').begins_with(yesterday)
    )['Items']
    actual_revenue = sum(float(r['total_amount']) for r in sales)
    actual_covers  = len(sales)
    avg_order      = actual_revenue / actual_covers if actual_covers else 0

    # AI prediction for yesterday
    forecasts = forecast_tbl.query(
        KeyConditionExpression=Key('branch_id').eq(BRANCH_ID),
        FilterExpression='forecast_type = :t AND forecast_date = :d',
        ExpressionAttributeValues={':t': 'demand', ':d': yesterday}
    )['Items']
    predicted_customers = float(forecasts[0]['predicted_value']) if forecasts else 150.0
    predicted_revenue   = predicted_customers * avg_order if avg_order else predicted_customers * 22.0

    def accuracy(predicted, actual):
        if actual == 0: return 100.0
        return round(100 - abs(predicted - actual) / actual * 100, 1)

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'date': yesterday,
            'actual': {
                'revenue':   round(actual_revenue, 2),
                'covers':    actual_covers,
                'avg_order': round(avg_order, 2),
            },
            'prediction_vs_reality': [
                {
                    'metric':    'Total Customers',
                    'predicted': round(predicted_customers),
                    'actual':    actual_covers,
                    'accuracy':  accuracy(predicted_customers, actual_covers),
                    'status':    'good' if accuracy(predicted_customers, actual_covers) >= 80 else 'warning',
                },
                {
                    'metric':    'Total Revenue ($)',
                    'predicted': round(predicted_revenue, 2),
                    'actual':    round(actual_revenue, 2),
                    'accuracy':  accuracy(predicted_revenue, actual_revenue),
                    'status':    'good' if accuracy(predicted_revenue, actual_revenue) >= 80 else 'warning',
                },
            ]
        }, default=decimal_default)
    }
