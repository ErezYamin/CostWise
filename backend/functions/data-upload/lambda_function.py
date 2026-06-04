import boto3
import json
import uuid
from datetime import datetime


s3 = boto3.client('s3')
BUCKET = 'costwise-raw-uploads'

def get_branch_id(event):
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    return claims.get('custom:branch_id')

def lambda_handler(event, context):
    try:
        branch_id = get_branch_id(event)
        if not branch_id:
            return {'statusCode': 403, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'forbidden'})}

        body = json.loads(event.get('body', '{}'))
        filename = body.get('filename', 'upload.csv')
        content_type = body.get('content_type', 'text/csv')
        file_key = f"uploads/{branch_id}/{datetime.utcnow().strftime('%Y-%m-%d')}/{uuid.uuid4()}-{filename}"
        
     
        presigned_url = s3.generate_presigned_url(
            'put_object', 
            Params={
                'Bucket': BUCKET,
                'Key': file_key,
                'ContentType': content_type
            },
            ExpiresIn=300 
        )
        
      
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*', 
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'upload_url': presigned_url,
                'file_key': file_key
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to generate upload URL', 'details': str(e)})
        }