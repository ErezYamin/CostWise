import boto3
import csv
import io
import uuid
from datetime import datetime

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
sales_table = dynamodb.Table('SalesRecord')
history_table = dynamodb.Table('UploadHistory')

def lambda_handler(event, context):
    bucket = event['Records'][0]['s3']['bucket']['name']
    key    = event['Records'][0]['s3']['object']['key']

    # Extract branch_id from key: uploads/{branch_id}/{date}/{uuid}-{filename}
    parts     = key.split('/')
    branch_id = parts[1] if len(parts) > 2 else 'branch-001'
    filename  = parts[-1]

    obj     = s3.get_object(Bucket=bucket, Key=key)
    content = obj['Body'].read().decode('utf-8')
    reader  = csv.DictReader(io.StringIO(content))

    success_count = 0
    error_count   = 0

    with sales_table.batch_writer() as batch:
        for row in reader:
            try:
                batch.put_item(Item={
                    'branch_id':           branch_id,
                    'sale_id':             str(uuid.uuid4()),
                    'time_and_date':       row['time_and_date'],
                    'total_amount':        row.get('total_amount', '0'),
                    'dish':                row.get('dish', 'Unknown'),
                    'weather_during_sale': row.get('weather', 'Unknown'),
                })
                success_count += 1
            except Exception:
                error_count += 1

    history_table.put_item(Item={
        'branch_id':    branch_id,
        'upload_id':    str(uuid.uuid4()),
        'filename':     filename,
        'file_key':     key,
        'uploaded_at':  datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S'),
        'status':       'Error' if error_count > success_count else 'Processed',
        'record_count': success_count,
        'error_count':  error_count,
    })

    return {'statusCode': 200}
