import boto3
import json
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
inventory_table = dynamodb.Table('InventoryItem')

BRANCH_ID = 'branch-001'


def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        items = body.get('items', [])

        for item in items:
            item_id = item.get('item_id')
            suggested_order = float(item.get('suggested_order', 0))

            if item_id and suggested_order > 0:
                inventory_table.update_item(
                    Key={'branch_id': BRANCH_ID, 'item_id': item_id},
                    UpdateExpression='SET current_stock = current_stock + :qty',
                    ExpressionAttributeValues={':qty': Decimal(str(suggested_order))}
                )

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'updated': len(items)})
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
