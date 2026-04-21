import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')

if not url or not key:
    print('No credentials')
else:
    supabase = create_client(url, key)
    res = supabase.table('events').select('*').execute()
    print('Events table:')
    for item in res.data:
        print(f"ID: {item.get('id')} - total_photos: {item.get('total_photos')}")
