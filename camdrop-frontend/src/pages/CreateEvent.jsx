import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import { Camera, ArrowLeft, Loader } from 'lucide-react';

const CreateEvent = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [eventName, setEventName] = useState('');
    const [organizerName, setOrganizerName] = useState(
        user?.user_metadata?.full_name || ''
    );
    const [loading, setLoading] = useState(false);
    const [createdEvent, setCreatedEvent] = useState(null);

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/events/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: eventName,
                    organizer_name: organizerName,
                    user_id: user?.id || null,
                    frontend_url: window.location.origin,
                })
            });

            if (!response.ok) throw new Error('Failed to create event');

            const data = await response.json();
            setCreatedEvent(data);
        } catch (error) {
            console.error(error);
            alert("Error creating event. Is your FastAPI server running?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">

            {/* Back button */}
            <div className="w-full max-w-md mb-6">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface text-sm font-medium transition-colors cursor-pointer"
                >
                    <ArrowLeft size={18} />
                    Back to Home
                </button>
            </div>

            {/* Hero Section */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-surface-container-high rounded-full mb-6 shadow-card">
                    <Camera size={40} className="text-primary" />
                </div>
                <h1 className="text-4xl font-black mb-3 tracking-tight text-on-surface">
                    New Event
                </h1>
                <p className="text-lg text-on-surface-variant max-w-md mx-auto leading-relaxed">
                    Set up a disposable camera for your event
                </p>
            </div>

            {/* Main Action Card */}
            <div className="w-full max-w-md bg-surface-container rounded-2xl p-8 border border-border shadow-card">
                {!createdEvent ? (
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
                    <div className="text-center animate-fadeInZoom">
                        <h2 className="text-2xl font-extrabold text-primary mb-2">Event Created! 🎉</h2>
                        <p className="text-on-surface-variant mb-6">Have your guests scan this code.</p>

                        <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-deep">
                            <img src={createdEvent.qr_code_url || createdEvent.qr_url} alt="QR Code" className="w-52 h-52" />
                        </div>

                        <div className="space-y-3">
                            <button
                                id="go-to-dashboard-button"
                                onClick={() => navigate(`/dashboard/${createdEvent.event_id}`)}
                                className="w-full bg-primary hover:bg-primary-hover text-on-primary py-4 rounded-full font-bold flex justify-center items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-glow"
                            >
                                Go to Dashboard <ArrowLeft size={20} className="rotate-180" />
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface py-3 rounded-full font-medium transition-colors border border-border cursor-pointer"
                            >
                                Back to Home
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateEvent;
