import os
import io
import qrcode
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv
# Add this import at the top of your main.py
from utils.zipping import generate_event_zip

load_dotenv()

# Configuration
URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Debugging connection on startup
if not URL or not KEY:
    print("❌ ERROR: Supabase credentials missing from .env file!")
else:
    print(f"✅ Supabase URL detected: {URL[:15]}...")

supabase: Client = create_client(URL, KEY)

app = FastAPI(title="CamDrop API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EventCreate(BaseModel):
    name: str
    organizer_name: str
    user_id: Optional[str] = None

@app.post("/events/", status_code=201)
async def create_event(event: EventCreate):
    try:
        # 1. Insert into Database
        insert_data = {
            "name": event.name,
            "organizer_name": event.organizer_name,
            "is_developed": False
        }
        if event.user_id:
            insert_data["user_id"] = event.user_id
        
        response = supabase.table("events").insert(insert_data).execute()
        
        event_data = response.data[0]
        event_id = event_data["id"]

        # 2. Generate QR Code
        deep_link = f"{FRONTEND_URL}/join/{event_id}"
        qr = qrcode.make(deep_link)
        img_byte_arr = io.BytesIO()
        qr.save(img_byte_arr, format='PNG')
        
        # 3. Upload QR to 'qr-codes' bucket
        file_path = f"{event_id}_qr.png"
        supabase.storage.from_("qr-codes").upload(
            file=img_byte_arr.getvalue(),
            path=file_path,
            file_options={"content-type": "image/png"}
        )
        
        qr_url = supabase.storage.from_("qr-codes").get_public_url(file_path)

        return {
            "event_id": event_id,
            "name": event_data["name"],
            "deep_link": deep_link,
            "qr_url": qr_url
        }
        
    except Exception as e:
        # This will catch 401 errors or database issues
        raise HTTPException(status_code=500, detail=f"Operation failed: {str(e)}")


# ... (Keep your existing EventCreate class and POST /events/ route here) ...

@app.put("/events/{event_id}/develop", status_code=200)
async def develop_event(event_id: str):
    """
    Triggers the 'Big Reveal'. Changes the database status to unlock the photos
    for the public gallery, and generates the organizer's ZIP download link.
    """
    try:
        # 1. Update the database flag to unlock the RLS policy
        # Now, the 'Public can view photos ONLY if developed' policy evaluates to true
        response = supabase.table("events").update({
            "is_developed": True
        }).eq("id", event_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Event not found.")

        # 2. Generate the ZIP bundle
        zip_download_url = generate_event_zip(event_id)

        return {
            "status": "success",
            "message": "The event has been developed. Photos are now public.",
            "event_id": event_id,
            "archive_url": zip_download_url
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to develop event: {str(e)}")

@app.delete("/events/{event_id}/photos", status_code=200)
async def delete_event_photos(event_id: str):
    """
    Permanently drops all photos associated with this event from both the Storage bucket and the Postgres database.
    Also removes the generated ZIP archive.
    """
    try:
        # 1. Fetch all photos to map their storage paths
        response = supabase.table("photos").select("storage_path").eq("event_id", event_id).execute()
        photos = response.data
        
        paths_to_delete = [photo["storage_path"] for photo in photos] if photos else []
        
        # 2. Add the ZIP archive to the slaughter list just in case
        archive_path = f"archives/{event_id}_archive.zip"
        paths_to_delete.append(archive_path)

        # 3. Batch delete from Supabase storage (max ~100 per request is optimal, but SDK handles arrays)
        if paths_to_delete:
            # Chunking to be extremely safe with URL payload limits
            for i in range(0, len(paths_to_delete), 100):
                supabase.storage.from_("event-photos").remove(paths_to_delete[i:i+100])

        # 4. Wipe rows from the actual database
        supabase.table("photos").delete().eq("event_id", event_id).execute()

        return {
            "status": "success", 
            "message": f"Successfully wiped all media for event {event_id} from cloud servers."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete server photos: {str(e)}")