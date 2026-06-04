import boto3
import json
from boto3.dynamodb.conditions import Key
from decimal import Decimal

def decimal_default(obj):
    if isinstance(obj, Decimal): return float(obj)
    raise TypeError

dynamodb = boto3.resource('dynamodb')
history_table = dynamodb.Table('UploadHistory')

def get_branch_id(event):
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    return claims.get('custom:branch_id')

def lambda_handler(event, context):
    branch_id = get_branch_id(event)
    if not branch_id:
        return {'statusCode': 403, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'forbidden'})}
    resp = history_table.query(
        KeyConditionExpression=Key('branch_id').eq(branch_id),
        ScanIndexForward=False,
        Limit=20
    )
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'uploads': resp['Items']}, default=decimal_default),
    }
