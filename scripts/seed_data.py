import boto3
import random
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# ─────────────────────────────────────────────
# 1. BRANCH
# ─────────────────────────────────────────────
def seed_branch():
    table = dynamodb.Table('Branch')
    table.put_item(Item={
        'branch_id': 'branch-001',
        'branch_name': 'CostWise Demo Restaurant',
        'location': 'Tel Aviv'
    })
    print('✓ Branch seeded')


# ─────────────────────────────────────────────
# 2. STAFF
# ─────────────────────────────────────────────
def seed_staff():
    table = dynamodb.Table('Staff')
    staff = [
        {'staff_id': 'staff-001', 'branch_id': 'branch-001', 'full_name': 'David Cohen',   'position': 'Waiter'},
        {'staff_id': 'staff-002', 'branch_id': 'branch-001', 'full_name': 'Sarah Johnson', 'position': 'Waiter'},
        {'staff_id': 'staff-003', 'branch_id': 'branch-001', 'full_name': 'Michael Zhang', 'position': 'Chef'},
        {'staff_id': 'staff-004', 'branch_id': 'branch-001', 'full_name': 'Lisa Park',     'position': 'Cashier'},
        {'staff_id': 'staff-005', 'branch_id': 'branch-001', 'full_name': 'Tom Wilson',    'position': 'Manager'},
    ]
    for member in staff:
        table.put_item(Item=member)
    print(f'✓ Staff seeded ({len(staff)} members)')


# ─────────────────────────────────────────────
# 3. INVENTORY ITEMS
# ─────────────────────────────────────────────
def seed_inventory():
    table = dynamodb.Table('InventoryItem')
    items = [
        {'item_id': 'item-001', 'branch_id': 'branch-001', 'name': 'Tomatoes', 'current_stock':
            Decimal('8'), 'unit': 'kg', 'price_per_unit': Decimal('2.0'), 'min_stock': Decimal('4.0')},
        {'item_id': 'item-002', 'branch_id': 'branch-001', 'name': 'Beef', 'current_stock':
            Decimal('15'), 'unit': 'kg', 'price_per_unit': Decimal('8.0'), 'min_stock': Decimal('5.0')},
        {'item_id': 'item-003', 'branch_id': 'branch-001', 'name': 'Cheese', 'current_stock':
            Decimal('10'), 'unit': 'kg', 'price_per_unit': Decimal('4.0'), 'min_stock': Decimal('3.0')},
        {'item_id': 'item-004', 'branch_id': 'branch-001', 'name': 'Lettuce', 'current_stock':
            Decimal('6'), 'unit': 'kg', 'price_per_unit': Decimal('1.5'), 'min_stock': Decimal('2.0')},
        {'item_id': 'item-005', 'branch_id': 'branch-001', 'name': 'Pizza Dough', 'current_stock':
            Decimal('20'), 'unit': 'kg', 'price_per_unit': Decimal('2.0'), 'min_stock': Decimal('6.0')},
        {'item_id': 'item-006', 'branch_id': 'branch-001', 'name': 'Potatoes', 'current_stock':
            Decimal('25'), 'unit': 'kg', 'price_per_unit': Decimal('1.0'), 'min_stock': Decimal('5.0')},
    ]
    for item in items:
        table.put_item(Item=item)
    print(f'✓ Inventory seeded ({len(items)} items)')


# ─────────────────────────────────────────────
# 4. SALES RECORDS (90 days)
# ─────────────────────────────────────────────
DISHES = ['Burger', 'Pizza', 'Salad', 'Pasta', 'Steak', 'Sandwich', 'Soup', 'Fries']
WEATHER = ['Sunny', 'Rainy', 'Cloudy']

def get_daily_sales_count(weekday):
    # 0=Mon, 4=Fri, 5=Sat
    if weekday in (4, 5):   # Friday, Saturday — busy
        return random.randint(170, 220)
    elif weekday in (0, 1): # Monday, Tuesday — slow
        return random.randint(100, 140)
    else:
        return random.randint(140, 180)

def seed_sales():
    table = dynamodb.Table('SalesRecord')
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=90)

    total = 0
    with table.batch_writer() as batch:
        for day_offset in range(91):
            current_date = start_date + timedelta(days=day_offset)
            weekday = current_date.weekday()
            num_sales = get_daily_sales_count(weekday)
            weather = random.choice(WEATHER)

            for _ in range(num_sales):
                hour = random.randint(11, 22)
                minute = random.randint(0, 59)
                time_and_date = f"{current_date}T{hour:02d}:{minute:02d}:00"

                batch.put_item(Item={
                    'branch_id':    'branch-001',
                    'sale_id':      f'sale-{uuid.uuid4()}',
                    'time_and_date': time_and_date,
                    'dish':         random.choice(DISHES),
                    'total_amount': Decimal(str(round(random.uniform(8, 45), 2))),
                    'weather':      weather,
                    'covers':       random.randint(1, 4),
                })
                total += 1

    print(f'✓ Sales seeded ({total} records across 90 days)')


# ─────────────────────────────────────────────
# 5. SHIFTS
# ─────────────────────────────────────────────
SHIFT_TIMES = ['Morning', 'Evening', 'Off']
STAFF_IDS = ['staff-001', 'staff-002', 'staff-003', 'staff-004', 'staff-005']

def seed_shifts():
    table = dynamodb.Table('Shift')
    today = datetime.utcnow().date()
    total = 0

    with table.batch_writer() as batch:
        for staff_id in STAFF_IDS:
            for day_offset in range(14):  # 2 weeks of shifts
                shift_date = today + timedelta(days=day_offset)
                batch.put_item(Item={
                    'staff_id':  staff_id,
                    'shift_id':  f'shift-{uuid.uuid4()}',
                    'branch_id': 'branch-001',
                    'date':      str(shift_date),
                    'time':      random.choice(SHIFT_TIMES),
                    'status':    'Pending',
                })
                total += 1

    print(f'✓ Shifts seeded ({total} shift records)')


# ─────────────────────────────────────────────
# 6. FORECASTS (next 7 days)
# ─────────────────────────────────────────────
FORECAST_TYPES = ['demand', 'inventory', 'workforce']

def seed_forecasts():
    table = dynamodb.Table('Forecast')
    today = datetime.utcnow().date()
    total = 0

    with table.batch_writer() as batch:
        for day_offset in range(-7, 8):  # past 7 days + next 7 days
            forecast_date = today + timedelta(days=day_offset)
            for forecast_type in FORECAST_TYPES:
                batch.put_item(Item={
                    'branch_id':       'branch-001',
                    'forecast_id':     f'fc-{uuid.uuid4()}',
                    'forecast_type':   forecast_type,
                    'forecast_date':   str(forecast_date),
                    'predicted_value': Decimal(str(round(random.uniform(80, 220), 1))),
                    'confidence_score': Decimal(str(round(random.uniform(0.75, 0.95), 2))),
                })
                total += 1

    print(f'✓ Forecasts seeded ({total} forecast rows)')


# ─────────────────────────────────────────────
# 7. TODAY'S SALES (fresh data for today)
# ─────────────────────────────────────────────
def seed_today_sales():
    table = dynamodb.Table('SalesRecord')
    today = datetime.utcnow().date()
    current_hour = datetime.utcnow().hour

    total = 0
    with table.batch_writer() as batch:
        for _ in range(random.randint(65, 80)):
            hour = random.randint(11, min(current_hour, 22))
            minute = random.randint(0, 59)
            time_and_date = f"{today}T{hour:02d}:{minute:02d}:00"
            batch.put_item(Item={
                'branch_id':     'branch-001',
                'sale_id':       f'sale-today-{uuid.uuid4()}',
                'time_and_date': time_and_date,
                'dish':          random.choice(DISHES),
                'total_amount':  Decimal(str(round(random.uniform(8, 45), 2))),
                'weather':       random.choice(WEATHER),
                'covers':        random.randint(1, 4),
            })
            total += 1

    print(f'✓ Today\'s sales seeded ({total} records)')


# ─────────────────────────────────────────────
# 8. THIS WEEK'S SALES (Mon–yesterday)
# ─────────────────────────────────────────────
def seed_this_week_sales():
    table = dynamodb.Table('SalesRecord')
    today = datetime.utcnow().date()
    days_since_monday = today.weekday()  # 0=Mon

    total = 0
    with table.batch_writer() as batch:
        for day_offset in range(1, days_since_monday + 1):  # Mon to yesterday
            current_date = today - timedelta(days=day_offset)
            weekday = current_date.weekday()
            num_sales = get_daily_sales_count(weekday)
            weather = random.choice(WEATHER)

            for _ in range(num_sales):
                hour = random.randint(11, 22)
                minute = random.randint(0, 59)
                time_and_date = f"{current_date}T{hour:02d}:{minute:02d}:00"
                batch.put_item(Item={
                    'branch_id':     'branch-001',
                    'sale_id':       f'sale-week-{uuid.uuid4()}',
                    'time_and_date': time_and_date,
                    'dish':          random.choice(DISHES),
                    'total_amount':  Decimal(str(round(random.uniform(8, 45), 2))),
                    'weather':       weather,
                    'covers':        random.randint(1, 4),
                })
                total += 1

    print(f'✓ This week\'s sales seeded ({total} records across {days_since_monday} days)')


# ─────────────────────────────────────────────
# 9. PENDING ORDERS (for get_pending_orders)
# ─────────────────────────────────────────────
PENDING_ITEMS = [
    ('Tomatoes', 50),
    ('Cheese', 30),
    ('Lettuce', 40),
    ('Beef', 20),
    ('Pizza Dough', 60),
]

def seed_pending_orders():
    table = dynamodb.Table('Forecast')
    total = 0

    with table.batch_writer() as batch:
        for item_name, predicted_qty in PENDING_ITEMS:
            batch.put_item(Item={
                'branch_id':        'branch-001',
                'forecast_id':      f'order-{uuid.uuid4()}',
                'forecast_type':    'inventory',
                'item_name':        item_name,
                'status':           'pending',
                'predicted_value':  Decimal(str(predicted_qty)),
                'confidence_score': Decimal(str(round(random.uniform(0.80, 0.95), 2))),
            })
            total += 1

    print(f'✓ Pending orders seeded ({total} items)')


# ─────────────────────────────────────────────
# RUN ALL
# ─────────────────────────────────────────────
if __name__ == '__main__':
    print('Seeding DynamoDB tables...\n')
    seed_branch()
    seed_staff()
    seed_inventory()
    seed_sales()
    seed_shifts()
    seed_forecasts()
    seed_today_sales()
    seed_this_week_sales()
    seed_pending_orders()
    print('\nDone. All tables seeded successfully.')
