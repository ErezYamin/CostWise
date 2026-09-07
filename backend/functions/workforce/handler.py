import json
import os
import boto3
import urllib.request
from datetime import datetime, timedelta
from boto3.dynamodb.conditions import Key
from decimal import Decimal
from openai import OpenAI


openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
sales_table = dynamodb.Table('SalesRecord')
staff_table = dynamodb.Table('Staff')
BRANCH_ID = 'branch-001'
DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

def decimal_default(obj):
    if isinstance(obj, Decimal): return float(obj)
    raise TypeError


def get_last_week_sales():
    historical_data = ["Last Week's Sales & Foot Traffic:"]
    try:
        for i in range(1, 8):
            date_obj = datetime.utcnow() - timedelta(days=i)
            date_str = date_obj.strftime('%Y-%m-%d')
            day_name = date_obj.strftime('%A')
            
            resp = sales_table.query(
                IndexName='by-date',
                KeyConditionExpression=Key('branch_id').eq(BRANCH_ID) & Key('time_and_date').begins_with(date_str)
            )
            items = resp.get('Items', [])
            orders_count = len(items)
            
            if orders_count > 0:
                total_revenue = sum(float(item.get('total_amount', 0)) for item in items)
                day_weather = items[0].get('weather_during_sale', 'Unknown')
            else:
                total_revenue = 0.0
                day_weather = "Unknown"
                
            historical_data.append(f"- {day_name}: {orders_count} orders, ${total_revenue:.2f} revenue. Weather: {day_weather}.")
        return "\n".join(historical_data)
    except Exception as e:
        return f"The actual error is: {str(e)}"

def get_upcoming_environment_data():

    
    weather_api_key = os.environ.get("WEATHER_API_KEY")
    
    if not weather_api_key:
        return "Upcoming Week: Weather API key missing. Using regular estimates."

    city = "Tel Aviv"
   
    url = f"http://api.openweathermap.org/data/2.5/forecast?q={city.replace(' ', '%20')}&appid={weather_api_key}&units=metric"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
        forecast_dict = {}
       
        for item in data['list']:
            date_str = item['dt_txt'].split(' ')[0] 
            if date_str not in forecast_dict:
                temp = round(item['main']['temp'])
                desc = item['weather'][0]['main'] 
                forecast_dict[date_str] = f"{temp}°C, {desc}"
        
      
        lines = ["Upcoming Weather Forecast (Live Data):"]
        for d_str, weather in forecast_dict.items():
            day_name = datetime.strptime(d_str, "%Y-%m-%d").strftime("%A")
            lines.append(f"- {day_name} ({d_str}): {weather}.")
            
        return "\n".join(lines)
        
    except Exception as e:
      
        return f"Upcoming Week: Weather data temporarily unavailable ({str(e)})."
    
def get_upcoming_holidays(week_start_str):
    try:
      
        year = week_start_str.split('-')[0]
        
  
        url = f"https://date.nager.at/api/v3/PublicHolidays/{year}/IL"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            holidays = json.loads(response.read().decode())
        
     
        start_date = datetime.strptime(week_start_str, "%Y-%m-%d")
        end_date = start_date + timedelta(days=7)
        
        upcoming_holidays = []
        for h in holidays:
            h_date = datetime.strptime(h['date'], "%Y-%m-%d")
          
            if start_date <= h_date <= end_date:
                upcoming_holidays.append(f"- {h['date']}: {h['localName']} ({h['name']})")
                
        if upcoming_holidays:
            return "Upcoming Public Holidays this week:\n" + "\n".join(upcoming_holidays)
        else:
            return "Upcoming Public Holidays: None in the next 7 days."
            
    except Exception as e:
        return "Holiday data temporarily unavailable."

def get_staff_list():
    try:
        resp = staff_table.query(KeyConditionExpression=Key('branch_id').eq(BRANCH_ID))
        return resp.get('Items', [])
    except Exception:
    
        return [
            {'staff_id': 'emp1', 'full_name': 'David Cohen', 'position': 'Waiter'},
            {'staff_id': 'emp2', 'full_name': 'Sarah Johnson', 'position': 'Waiter'},
            {'staff_id': 'emp3', 'full_name': 'Michael Zhang', 'position': 'Chef'},
            {'staff_id': 'emp4', 'full_name': 'Lisa Park', 'position': 'Cashier'},
            {'staff_id': 'emp5', 'full_name': 'Tom Wilson', 'position': 'Manager'}
        ]


def lambda_handler(event, context):
    params = event.get('queryStringParameters') or {}
    week_start = params.get('week', datetime.utcnow().strftime('%Y-%m-%d'))
    
    try:
     
        sales_context = get_last_week_sales()
        env_context = get_upcoming_environment_data()
        staff_list = get_staff_list()
        
       
        staff_text = "\n".join([f"- {s['full_name']} ({s['position']})" for s in staff_list])
        
        SYSTEM_PROMPT = f"""You are an AI Restaurant Manager. Create a smart weekly schedule based on demand.
        
        Available Staff:
        {staff_text}
        
        Historical Demand: {sales_context}
        Upcoming Events/Weather: {env_context}
        
        RULES:
        1. Output ONLY a valid JSON object. No markdown, no explanations.
        2. Assign more staff on busy days (holidays, sports events) and less on rainy days.
        3. Shift options for each day MUST be exactly one of: "Morning", "Evening", or "Day Off".
        4. Every day from Sun to Sat is an operating day.
        5. Every day MUST have at least one staff member assigned to "Morning".
        6. Every day MUST have at least one staff member assigned to "Evening".
        7. Do not leave any day without both Morning and Evening coverage.
        
        REQUIRED JSON FORMAT:
        {{
            "predicted_customers": {{ "Sun": 150, "Mon": 120, ... (predict for all 7 days) }},
            "schedule": [
                {{
                    "staff_id": "<use original staff_id>",
                    "name": "<staff name>",
                    "role": "<position>",
                    "shifts": {{ "Sun": "Morning", "Mon": "Day Off", ... }}
                }}
            ]
        }}"""

     
        response = openai_client.chat.completions.create(
            model="gpt-4.1-mini", 
            response_format={ "type": "json_object" }, 
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": "Generate the optimal schedule JSON for the upcoming week."}
            ]
        )
        
      
        ai_result = json.loads(response.choices[0].message.content)
        
       
        total_shifts = 0
        for emp in ai_result.get('schedule', []):
            for day in DAYS:
                if emp['shifts'].get(day) in ['Morning', 'Evening']:
                    total_shifts += 1
        labor_cost = total_shifts * 150 
        
        
        final_response = {
            'week_start': week_start,
            'schedule': ai_result.get('schedule', []),
            'predicted_customers': ai_result.get('predicted_customers', {}),
            'summary': {
                'total_shifts': total_shifts,
                'understaffed_days': 0,
                'labor_cost': labor_cost
            }
        }
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(final_response, default=decimal_default)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }


