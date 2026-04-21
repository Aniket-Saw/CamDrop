import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, QrCode, ArrowRight, Loader } from 'lucide-react';

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
            const response = await fetch('http://localhost:8000/events/', {
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
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center p-5 bg-primary text-on-primary rounded-2xl mb-6 shadow-elevation-2">
                    <Camera size={48} />
                </div>
                <h1 className="text-5xl font-normal mb-4 tracking-tight text-on-surface">CamDrop</h1>
                <p className="text-xl text-on-surface-variant max-w-md mx-auto">
                    The frictionless digital disposable camera. No apps, no hassle.
                </p>
            </div>

            {/* Main Action Area */}
            <div className="w-full max-w-md bg-surface-container rounded-3xl p-8 shadow-elevation-1">
                {!createdEvent ? (
                    // FORM: Create New Event
                    <form onSubmit={handleCreateEvent} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2 ml-1">Event Name</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-transparent border-2 border-outline rounded-sm p-4 text-on-surface focus:outline-none focus:border-primary transition-colors"
                                placeholder="Sarah & John's Wedding"
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2 ml-1">Organizer Name</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-transparent border-2 border-outline rounded-sm p-4 text-on-surface focus:outline-none focus:border-primary transition-colors"
                                placeholder="Alex"
                                value={organizerName}
                                onChange={(e) => setOrganizerName(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container shadow-elevation-1 py-4 mt-2 rounded-full font-medium flex justify-center items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader className="animate-spin" size={24} /> : 'Generate Camera QR'}
                        </button>
                    </form>
                ) : (
                    // SUCCESS: Show QR and Links
                    <div className="text-center animate-in fade-in zoom-in duration-300">
                        <h2 className="text-2xl font-semibold text-primary mb-2">Event Created!</h2>
                        <p className="text-on-surface-variant mb-6">Have your guests scan this code.</p>

                        <div className="bg-white p-4 rounded-3xl inline-block mb-6 shadow-elevation-2">
                            <img src={createdEvent.qr_code_url || createdEvent.qr_url} alt="QR Code" className="w-48 h-48" />
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => navigate(`/dashboard/${createdEvent.event_id}`)}
                                className="w-full bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary py-4 rounded-full font-medium flex justify-center items-center gap-2 transition-colors shadow-elevation-1"
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