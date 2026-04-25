<h3 align="center" > Try out this app : https://cam-drop.vercel.app/ </h3>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.135-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-BaaS-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" />
</p>

<h1 align="center">📷 CamDrop</h1>

<p align="center">
  <strong>The frictionless digital disposable camera for events.</strong><br/>
  No app downloads. No complex logins. Just scan, snap, and share.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#database-setup">Database Setup</a> •
  <a href="#environment-variables">Environment Variables</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#license">License</a>
</p>

---

## The Problem

At every party, wedding, and corporate event, the best candid moments are scattered across 50 different phones, lost in private camera rolls, and never collected. CamDrop solves this by giving every guest a **shared digital disposable camera** — accessible instantly through a QR code.

## The Concept

An organizer creates an event and prints a QR code. Guests scan it, enter their name, and get a **disposable camera interface** — complete with a 5-second review window, mechanical shutter sounds, and haptic feedback. Photos are uploaded to a secure **"Blind Vault"** where nobody (not even the organizer) can see them until the event is **"Developed"** — just like a real film roll.

---

## Features

### 🔐 Blind Vault Architecture
Photos are locked behind Supabase Row Level Security. Nobody can preview the gallery until the organizer clicks **"Develop"**. This creates genuine surprise and anticipation.

### 📸 Disposable Camera UX
- **5-second review window** — Keep or scrap, just like shaking a Polaroid
- **Mechanical shutter sound** and winding gear audio on capture & keep
- **Haptic feedback** — 50ms pulse on capture, double-pulse on cloud sync
- **Edge Compute quality check** — Instant blur & darkness detection via Canvas API (zero network requests)

### 🔥 Live Pulse Ticker
A real-time counter powered by a Postgres trigger + Supabase WebSockets. Every guest sees *"142 photos snapped"* ticking up live — creating shared party momentum without revealing any photos.

### 🔑 Google Sign-In & Role System
- **Organizers** create events, access the dashboard, develop photos, and download archives
- **Attendees** are silently registered when they join — events appear in their personal history
- Role badges (**Organizer** / **Attendee**) on the landing page for easy navigation

### 📦 One-Click Develop & Download
The organizer clicks **"Develop"** → the backend generates a ZIP archive of all photos → the gallery unlocks for everyone simultaneously.

### 🗑️ Secure Cloud Wipe
After downloading, organizers can permanently delete all event photos from Supabase Storage and the database with a single destructive action.

### 🌐 Offline-First Design
Photos are cached in **IndexedDB** via LocalForage when offline. They auto-sync to the cloud the moment connectivity returns.

### 🖼️ Guest Albums
The gallery automatically groups photos into **personalized albums by guest name**, creating individual "rolls" for each contributor.

---

## Screenshots

> Add your screenshots below. Recommended: capture at mobile viewport (390×844).

### Landing Page & Authentication

| Sign In | Home Dashboard |
|:---:|:---:|
| <img width="296" height="549" alt="image" src="https://github.com/user-attachments/assets/68d18860-6326-44df-81b3-fbaa45173213" />  | <img width="289" height="588" alt="image" src="https://github.com/user-attachments/assets/d7167494-0f1a-47a0-9f27-3f2b653bc9ca" />
 |

### Event Creation Flow

| Create Event | QR Code Generated |
|:---:|:---:|
| <img width="234" height="500" alt="image" src="https://github.com/user-attachments/assets/4774d9ac-cc79-42f5-83bc-53c55f94b0e1" /> | <img width="229" height="510" alt="image" src="https://github.com/user-attachments/assets/69fdf95d-42f5-420c-9a12-78373bb38719" /> |

### Organizer Dashboard

| Dashboard (Live) | Dashboard (Developed) |
|:---:|:---:|
| <img width="225" height="513" alt="image" src="https://github.com/user-attachments/assets/cd793094-f061-455d-8855-c2f64d5c3df5" /> |  <img width="302" height="604" alt="image" src="https://github.com/user-attachments/assets/c2322816-a84f-4aac-87bb-1bdf58fe74a2" /> |



---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Landing  │  │  Camera   │  │ Gallery  │  │   Dashboard   │   │
│  │  Page    │  │   View    │  │          │  │               │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬────────┘   │
│       │              │             │               │            │
│  ┌────┴──────────────┴─────────────┴───────────────┴────────┐   │
│  │              Supabase JS Client (Auth + Realtime)         │   │
│  └───────────────────────────┬───────────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
              ┌────────────────┼─────────────────┐
              │          SUPABASE (BaaS)         │
              │                                  │
              │  ┌──────────┐  ┌──────────────┐  │
              │  │   Auth   │  │   Realtime   │  │
              │  │ (Google) │  │ (WebSockets) │  │
              │  └──────────┘  └──────────────┘  │
              │  ┌──────────┐  ┌──────────────┐  │
              │  │ Storage  │  │  PostgreSQL  │  │
              │  │ (Photos) │  │  (RLS + Trig)│  │
              │  └──────────┘  └──────────────┘  │
              └────────────────┬─────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │        BACKEND (FastAPI)         │
              │                                  │
              │  POST /events/     → Create      │
              │  PUT  /events/develop → Develop   │
              │  DELETE /events/photos → Wipe     │
              │                                  │
              │  (QR Generation, ZIP Archiving)   │
              └──────────────────────────────────┘
```

### Data Flow

1. **Create** → Organizer creates event via FastAPI → QR code uploaded to Supabase Storage
2. **Capture** → Guests upload photos directly to Supabase Storage (bypassing backend for speed)
3. **Count** → Postgres trigger increments `events.total_photos` → Realtime broadcasts to all clients
4. **Develop** → FastAPI sets `is_developed = true` → RLS unlocks gallery → ZIP generated
5. **View** → Gallery reads from Supabase Storage using signed URLs
6. **Wipe** → FastAPI batch-deletes from Storage + Database

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite 8 | SPA with hot module replacement |
| **Styling** | Tailwind CSS 4 | Utility-first dark mode design system |
| **Icons** | Lucide React | Consistent, lightweight icon set |
| **Camera** | react-webcam | Browser-native camera access |
| **Offline** | LocalForage (IndexedDB) | Client-side photo caching |
| **Quality** | HTML5 Canvas API | Edge compute blur/darkness detection |
| **Auth** | Supabase Auth (Google OAuth) | Passwordless sign-in |
| **Database** | Supabase PostgreSQL | RLS-secured event & photo storage |
| **Realtime** | Supabase Realtime (WebSockets) | Live photo counter |
| **Storage** | Supabase Storage | Photo blobs & ZIP archives |
| **Backend** | FastAPI + Uvicorn | Event lifecycle management |
| **QR** | qrcode (Python) | Dynamic QR code generation |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Supabase** account with a project created
- **Google Cloud** OAuth credentials (Client ID + Secret)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/CamDrop.git
cd CamDrop
```

### 2. Frontend Setup

```bash
cd camdrop-frontend
npm install
```

Create a `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Start the dev server:

```bash
npm run dev
```

### 3. Backend Setup

```bash
cd camdrop-backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key-here
FRONTEND_URL=http://localhost:5173
```

Start the API server:

```bash
uvicorn main:app --reload
```

---

## Database Setup

Run the following SQL in your **Supabase SQL Editor** to set up the required tables, triggers, and policies.

### Tables & Columns

```sql
-- Events table (if not already created)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    organizer_name TEXT NOT NULL,
    is_developed BOOLEAN DEFAULT FALSE,
    total_photos INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Photos table
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Attendees table
CREATE TABLE IF NOT EXISTS public.event_attendees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);
```

### Live Pulse Trigger

```sql
CREATE OR REPLACE FUNCTION increment_photo_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events
  SET total_photos = COALESCE(total_photos, 0) + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_photo_insert
AFTER INSERT ON public.photos
FOR EACH ROW
EXECUTE FUNCTION increment_photo_count();
```

### Row Level Security

```sql
-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- Events: public read
CREATE POLICY "Public can read events" ON public.events FOR SELECT USING (true);

-- Events: anyone can insert
CREATE POLICY "Anyone can create events" ON public.events FOR INSERT WITH CHECK (true);

-- Photos: insert allowed (guests upload)
CREATE POLICY "Anyone can insert photos" ON public.photos FOR INSERT WITH CHECK (true);

-- Photos: read only if event is developed
CREATE POLICY "Public can view photos only if developed" ON public.photos
FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE events.id = photos.event_id AND events.is_developed = true)
);

-- Attendees: anyone can register
CREATE POLICY "Anyone can register as attendee" ON public.event_attendees
FOR INSERT WITH CHECK (true);

-- Attendees: users can read own records
CREATE POLICY "Users can read own attendance" ON public.event_attendees
FOR SELECT USING (auth.uid() = user_id);
```

### Supabase Configuration

1. **Storage Buckets**: Create `event-photos` and `qr-codes` buckets (set `qr-codes` to public)
2. **Realtime**: Enable replication for `events` and `photos` tables (Database → Replication)
3. **Auth**: Enable Google provider (Authentication → Providers → Google)

---

## Environment Variables

### Frontend (`camdrop-frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |

### Backend (`camdrop-backend/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase **service_role** key (admin access) |
| `FRONTEND_URL` | Frontend origin for CORS and QR deep links |

---

## Project Structure

```
CamDrop/
├── camdrop-frontend/
│   ├── public/
│   │   ├── shutter.mp3          # Capture sound effect
│   │   └── winding.mp3          # Keep sound effect
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Google OAuth provider
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx   # Auth gate + event list
│   │   │   ├── CreateEvent.jsx   # Event creation form
│   │   │   ├── JoinEvent.jsx     # Guest entry point
│   │   │   ├── CameraView.jsx    # Disposable camera UI
│   │   │   ├── Dashboard.jsx     # Organizer control panel
│   │   │   └── Gallery.jsx       # Photo gallery with albums
│   │   ├── utils/
│   │   │   └── imageQuality.js   # Edge compute blur/dark detection
│   │   ├── App.jsx
│   │   └── supabaseClient.js
│   └── package.json
│
├── camdrop-backend/
│   ├── main.py                   # FastAPI endpoints
│   ├── utils/
│   │   └── zipping.py            # ZIP archive generator
│   ├── requirements.txt
│   └── Procfile
│
└── README.md
```

---

## Deployment

### Frontend (Vercel)

```bash
cd camdrop-frontend
npm run build
# Deploy the `dist/` folder to Vercel
```

Set environment variables in Vercel dashboard.

### Backend (Render / Railway)

Use the `Procfile` included:

```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Set environment variables in the hosting platform's dashboard.

> **Important**: Update `FRONTEND_URL` in the backend `.env` to your production frontend URL, and update the `fetch` URLs in the frontend to point to your production backend.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built with caffeine and curiosity.</strong><br/>
  <sub>CamDrop — Because the best party photos are the ones nobody sees coming.</sub>
</p>
