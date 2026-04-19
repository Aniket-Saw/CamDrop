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

    if (loading) return <div className="flex h-screen items-center justify-center">Loading event...</div>;

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-zinc-900 p-6 text-white">
            <div className="mb-8 rounded-full bg-yellow-500 p-4 text-black">
                <Camera size={48} />
            </div>
            <h1 className="mb-2 text-3xl font-bold">{eventName}</h1>
            <p className="mb-8 text-zinc-400">Enter your name to start clicking</p>

            <input
                type="text"
                placeholder="Your Name (e.g. Aniket)"
                className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-white outline-none focus:border-yellow-500"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
            />

            <button
                onClick={handleJoin}
                className="mt-6 w-full max-w-sm rounded-lg bg-yellow-500 p-4 font-bold text-black transition-transform active:scale-95"
            >
                Grab Your Camera
            </button>
        </div>
    );
};

export default JoinEvent;