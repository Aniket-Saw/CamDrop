import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')
supabase = create_client(url, key)

# Create a test event
res = supabase.table('events').insert({'name': 'Test Event', 'organizer_name': 'Bot', 'is_developed': False}).execute()
new_event_id = res.data[0]['id']

# Insert a photo
photo_res = supabase.table('photos').insert({'event_id': new_event_id, 'storage_path': 'test/path.jpg', 'guest_name': 'bot'}).execute()

# Check total_photos
final_res = supabase.table('events').select('total_photos').eq('id', new_event_id).execute()
print(f"Total photos after insert: {final_res.data[0].get('total_photos')}")
