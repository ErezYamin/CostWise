import boto3
import json
import uuid
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
shift_table = dynamodb.Table('Shift')
BRANCH_ID = 'branch-001'
DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

def lambda_handler(event, context):
    body = json.loads(event.get('body', '{}'))
    week_start = body.get('week_start')
    schedule   = body.get('schedule', [])   

    with shift_table.batch_writer() as batch:
        for member in schedule:
            for day_idx, day in enumerate(DAYS):
                shift_type = member['shifts'].get(day, 'Day Off')
                if shift_type == 'Day Off':
                    continue
             
                start_hour = '08:00' if shift_type == 'Morning' else '16:00'
                end_hour   = '16:00' if shift_type == 'Morning' else '00:00'
                batch.put_item(Item={
                    'staff_id':        member['staff_id'],
                    'shift_id':        str(uuid.uuid4()),
                    'start_time':      f"{week_start}T{start_hour}:00",
                    'end_time':        f"{week_start}T{end_hour}:00",
                    'approval_status': 'approved',
                })

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True})
    }