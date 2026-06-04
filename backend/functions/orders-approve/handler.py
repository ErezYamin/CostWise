import boto3
import json
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
inventory_table = dynamodb.Table('InventoryItem')

BRANCH_ID = 'branch-001'


def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        item_id = body.get('item_id')
        approved = body.get('approved', True)
        suggested_order = float(body.get('suggested_order', 0))

        if not item_id:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'item_id is required'})
            }

        if approved:
            inventory_table.update_item(
                Key={'branch_id': BRANCH_ID, 'item_id': item_id},
                UpdateExpression='SET current_stock = current_stock + :qty',
                ExpressionAttributeValues={':qty': Decimal(str(suggested_order))}
            )

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'approved': approved})
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
