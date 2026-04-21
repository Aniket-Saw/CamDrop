import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Camera, AlertCircle, Lock } from 'lucide-react';

const JoinEvent = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const [eventName, setEventName] = useState('');
    const [guestName, setGuestName] = useState('');
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [isDeveloped, setIsDeveloped] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            const { data, error } = await supabase
                .from('events')
                .select('name, is_developed')
                .eq('id', eventId)
                .single();

            if (error) {
                setNotFound(true);
                setLoading(false);
            } else if (data.is_developed) {
                setIsDeveloped(true);
                setLoading(false);
                // Redirect to gallery after a brief pause
                setTimeout(() => navigate(`/gallery/${eventId}`), 2500);
            } else {
                setEventName(data.name);
                setLoading(false);
            }
        };
        fetchEvent();
    }, [eventId]);

    // Auto-focus the input on load
    useEffect(() => {
        if (!loading && !notFound && !isDeveloped && inputRef.current) {
            inputRef.current.focus();
        }
    }, [loading, notFound, isDeveloped]);

    const handleJoin = () => {
        if (!guestName.trim()) return alert("Please enter your name");

        // Store info for the camera session
        localStorage.setItem('camdrop_guest', guestName);
        localStorage.setItem('camdrop_event_id', eventId);

        navigate(`/camera/${eventId}`);
    };

    // Loading
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-surface text-on-surface-variant">
                <div className="animate-pulse text-lg">Loading event...</div>
            </div>
        );
    }

    // Error: Event not found
    if (notFound) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-surface text-center p-6">
                <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center mb-6">
                    <AlertCircle size={40} className="text-danger" />
                </div>
                <h1 className="text-3xl font-extrabold text-on-surface mb-3">Event Not Found</h1>
                <p className="text-on-surface-variant max-w-sm">
                    This event link is invalid or has expired. Ask the organizer for a new QR code.
                </p>
            </div>
        );
    }

    // Event already developed — redirect to gallery
    if (isDeveloped) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-surface text-center p-6">
                <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mb-6">
                    <Lock size={40} className="text-on-surface-variant" />
                </div>
                <h1 className="text-2xl font-bold text-on-surface mb-3">Event Closed</h1>
                <p className="text-on-surface-variant mb-2">Photos have been developed. Redirecting to the gallery...</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-[100svh] flex-col bg-surface text-on-surface">

            {/* Top Branding Zone */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 pb-0">
                <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mb-6 shadow-card">
                    <Camera size={40} className="text-primary" />
                </div>
                <h1 className="text-4xl font-black text-primary mb-3 text-center tracking-tight">{eventName}</h1>
                <p className="text-on-surface-variant text-lg text-center max-w-sm">
                    You've been invited to capture memories.
                </p>
            </div>

            {/* Bottom Interaction Zone */}
            <div className="p-6 pt-8">
                <div className="w-full max-w-sm mx-auto bg-surface-container rounded-2xl p-6 border border-border shadow-card">
                    <input
                        id="guest-name-input"
                        ref={inputRef}
                        type="text"
                        placeholder="Enter your name"
                        className="w-full input-focus-ring rounded-lg p-4 text-on-surface text-lg placeholder-on-surface-dim"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    />

                    <button
                        id="grab-camera-button"
                        onClick={handleJoin}
                        className="mt-5 w-full bg-primary hover:bg-primary-hover text-on-primary py-4 rounded-full font-bold text-lg transition-all active:scale-95 shadow-glow cursor-pointer"
                    >
                        Grab Your Camera 📸
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JoinEvent;