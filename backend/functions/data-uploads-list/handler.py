import json


def lambda_handler(event, context):
    uploads = [
        {
            'filename':     'sales-report-2026-05-17.csv',
            'uploaded_at':  '2026-05-17 09:14',
            'status':       'Processed',
            'record_count': '312',
        },
        {
            'filename':     'sales-report-2026-05-10.csv',
            'uploaded_at':  '2026-05-10 11:02',
            'status':       'Processed',
            'record_count': '287',
        },
        {
            'filename':     'sales-report-2026-05-03.csv',
            'uploaded_at':  '2026-05-03 08:45',
            'status':       'Processed',
            'record_count': '301',
        },
    ]

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'uploads': uploads}),
    }
