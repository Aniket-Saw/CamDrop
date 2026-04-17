import os
import io
import qrcode
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase credentials not found in environment variables.")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="CamDrop API")

# Request Model
class EventCreate(BaseModel):
    name: str
    organizer_name: str

@app.post("/events/", status_code=201)
async def create_event(event: EventCreate):
    """
    Creates a new event, generates a unique deep link,
    creates a QR code, and stores it in Supabase.
    """
    
    # 1. Insert the new event into the Supabase database
    try:
        response = supabase.table("events").insert({
            "name": event.name,
            "organizer_name": event.organizer_name,
            "is_developed": False
        }).execute()
        
        event_data = response.data[0]
        event_id = event_data["id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insertion failed: {str(e)}")

    # 2. Generate the joining Deep Link
    deep_link = f"{FRONTEND_URL}/join/{event_id}"

    # 3. Generate the high-res QR Code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(deep_link)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    # 4. Process image to bytes for cloud upload
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_bytes = img_byte_arr.getvalue()
    
    file_path = f"{event_id}_qr.png"
    
    # 5. Upload to Supabase Storage
    try:
        supabase.storage.from_("qr-codes").upload(
            file=img_bytes,
            path=file_path,
            file_options={"content-type": "image/png"}
        )
        # Retrieve the public URL for the organizer's dashboard
        qr_url = supabase.storage.from_("qr-codes").get_public_url(file_path)
    except Exception as e:
        print(f"Warning - Failed to upload QR to storage: {e}")
        qr_url = None 

    # 6. Return the finalized package
    return {
        "event_id": event_id,
        "name": event_data["name"],
        "organizer_name": event_data["organizer_name"],
        "deep_link": deep_link,
        "qr_code_url": qr_url
    }