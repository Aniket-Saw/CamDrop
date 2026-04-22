import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowRight, Loader } from 'lucide-react';
import API_BASE_URL from '../config';

const Home = () => {
    const navigate = useNavigate();
    const [eventName, setEventName] = useState('');
    const [organizerName, setOrganizerName] = useState('');
    const [loading, setLoading] = useState(false);
    const [createdEvent, setCreatedEvent] = useState(null);

    // --- Middle Level: Communicate with FastAPI ---
    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Make sure your FastAPI server is running on port 8000!
            const response = await fetch(`${API_BASE_URL}/events/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: eventName,
                    organizer_name: organizerName
                })
            });

            if (!response.ok) throw new Error('Failed to create event');

            const data = await response.json();
            setCreatedEvent(data); // Store the QR code and IDs returned from backend
        } catch (error) {
            console.error(error);
            alert("Error creating event. Is your FastAPI server running?");
        } finally {
            setLoading(false);
        }
    };

    // --- Upper Level: UI Rendering ---
    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">

            {/* Hero Section */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-surface-container-high rounded-full mb-6 shadow-card">
                    <Camera size={40} className="text-primary" />
                </div>
                <h1 className="text-5xl font-black mb-4 tracking-tight">
                    Cam<span className="text-primary">Drop</span>
                </h1>
                <p className="text-lg text-on-surface-variant max-w-md mx-auto leading-relaxed">
                    The frictionless digital disposable camera. No apps, no logins, no hassle.
                </p>
            </div>

            {/* Main Action Card */}
            <div className="w-full max-w-md bg-surface-container rounded-2xl p-8 border border-border shadow-card">
                {!createdEvent ? (
                    // FORM: Create New Event
                    <form onSubmit={handleCreateEvent} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">Event Name</label>
                            <input
                                id="event-name-input"
                                required
                                type="text"
                                className="w-full input-focus-ring rounded-lg p-3.5 text-on-surface placeholder-on-surface-dim"
                                placeholder="Sarah & John's Wedding"
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">Organizer Name</label>
                            <input
                                id="organizer-name-input"
                                required
                                type="text"
                                className="w-full input-focus-ring rounded-lg p-3.5 text-on-surface placeholder-on-surface-dim"
                                placeholder="Alex"
                                value={organizerName}
                                onChange={(e) => setOrganizerName(e.target.value)}
                            />
                        </div>
                        <button
                            id="generate-qr-button"
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-hover text-on-primary py-4 mt-2 rounded-full font-bold text-lg flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-glow cursor-pointer"
                        >
                            {loading ? <Loader className="animate-spin" size={24} /> : 'Generate Camera QR'}
                        </button>
                    </form>
                ) : (
                    // SUCCESS: Show QR and Links
                    <div className="text-center animate-fadeInZoom">
                        <h2 className="text-2xl font-extrabold text-primary mb-2">Event Created! 🎉</h2>
                        <p className="text-on-surface-variant mb-6">Have your guests scan this code.</p>

                        <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-deep">
                            <img src={createdEvent.qr_code_url || createdEvent.qr_url} alt="QR Code" className="w-52 h-52" />
                        </div>

                        <div>
                            <button
                                id="go-to-dashboard-button"
                                onClick={() => navigate(`/dashboard/${createdEvent.event_id}`)}
                                className="w-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface py-4 rounded-full font-medium flex justify-center items-center gap-2 transition-colors border border-border cursor-pointer"
                            >
                                Go to Organizer Dashboard <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;