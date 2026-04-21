import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Camera } from 'lucide-react';

const JoinEvent = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [eventName, setEventName] = useState('');
    const [guestName, setGuestName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            const { data, error } = await supabase
                .from('events')
                .select('name')
                .eq('id', eventId)
                .single();

            if (error) {
                alert("Event not found!");
                navigate('/');
            } else {
                setEventName(data.name);
                setLoading(false);
            }
        };
        fetchEvent();
    }, [eventId]);

    const handleJoin = () => {
        if (!guestName.trim()) return alert("Please enter your name");

        // Store info for the camera session
        localStorage.setItem('camdrop_guest', guestName);
        localStorage.setItem('camdrop_event_id', eventId);

        navigate(`/camera/${eventId}`);
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-surface text-on-surface">Loading event...</div>;

    return (
        <div className="flex min-h-[100svh] flex-col items-center justify-center bg-surface p-6 text-on-surface">
            <div className="mb-8 rounded-2xl bg-primary p-5 text-on-primary shadow-elevation-2">
                <Camera size={48} />
            </div>
            <h1 className="mb-2 text-4xl font-normal text-center">{eventName}</h1>
            <p className="mb-10 text-on-surface-variant text-lg text-center">Enter your name to start clicking.</p>

            <div className="w-full max-w-sm rounded-3xl bg-surface-container p-6 shadow-elevation-1">
                <input
                    type="text"
                    placeholder="Your Name (e.g. Alex)"
                    className="w-full rounded-md border-2 border-outline bg-transparent p-4 text-on-surface outline-none focus:border-primary transition-colors text-lg"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />

                <button
                    onClick={handleJoin}
                    className="mt-6 w-full rounded-full bg-primary py-4 font-medium text-on-primary shadow-elevation-1 transition-transform active:scale-95 text-lg hover:bg-primary/90"
                >
                    Grab Your Camera
                </button>
            </div>
        </div>
    );
};

export default JoinEvent;