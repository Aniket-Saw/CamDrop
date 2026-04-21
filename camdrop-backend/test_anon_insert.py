import os
import sys
from supabase import create_client
from dotenv import load_dotenv

url = "https://znpcnwvhfhmvagtwwsqz.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucGNud3ZoZmhtdmFndHd3c3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjY1MDQsImV4cCI6MjA5MjAwMjUwNH0.yERGUDiTByqMnu8iWdOcwfqw1clr_UfL32RauwYrmcg"

supabase = create_client(url, key)

res = supabase.table('events').select('id').execute()
if not res.data:
    print("No events")
    sys.exit(0)
    
event_id = res.data[0]['id']

try:
    photo_res = supabase.table('photos').insert({'event_id': event_id, 'storage_path': 'test/path.jpg', 'guest_name': 'anon'}).execute()
    print("Anon insert successful")
except Exception as e:
    print(f"Anon insert failed: {e}")
