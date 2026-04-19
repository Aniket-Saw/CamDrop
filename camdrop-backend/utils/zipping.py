import os
import io
import zipfile
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# We MUST use the service_role key here to bypass RLS and read "locked" photos
URL = os.getenv("SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_KEY") # Ensure this is your service_role key in the backend

supabase: Client = create_client(URL, SERVICE_KEY)

def generate_event_zip(event_id: str) -> str:
    """
    Fetches all photos for an event, zips them in memory maintaining 
    the guest folder structure, and uploads the ZIP to Supabase.
    """
    bucket_name = "event-photos"
    
    # 1. List all files inside the event's directory
    # Note: Supabase storage list() only reads one level deep. 
    # We first find the guest folders, then the photos inside them.
    guest_folders = supabase.storage.from_(bucket_name).list(event_id)
    
    if not guest_folders:
        return None

    # Create an in-memory zip file
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for folder in guest_folders:
            guest_name = folder['name']
            guest_path = f"{event_id}/{guest_name}"
            
            # List photos inside this guest's folder
            photos = supabase.storage.from_(bucket_name).list(guest_path)
            
            for photo in photos:
                photo_name = photo['name']
                # Skip placeholder/empty files
                if photo_name == ".emptyFolderPlaceholder":
                    continue
                    
                full_storage_path = f"{guest_path}/{photo_name}"
                
                # Download the photo as bytes
                res = supabase.storage.from_(bucket_name).download(full_storage_path)
                
                # Write to the zip file, keeping the GuestName/PhotoName structure
                zip_path = f"{guest_name}/{photo_name}"
                zip_file.writestr(zip_path, res)

    # 2. Upload the compiled ZIP back to Supabase
    zip_buffer.seek(0)
    zip_filename = f"archives/{event_id}_archive.zip"
    
    supabase.storage.from_(bucket_name).upload(
        file=zip_buffer.read(),
        path=zip_filename,
        file_options={"content-type": "application/zip", "upsert": "true"}
    )
    
    # 3. Generate a signed URL valid for 7 days (604800 seconds) for the organizer
    signed_url = supabase.storage.from_(bucket_name).create_signed_url(zip_filename, 604800)
    
    return signed_url['signedURL']