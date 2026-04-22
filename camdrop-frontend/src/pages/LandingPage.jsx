import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import {
    Camera, Plus, Clock, LogOut, ArrowRight, Loader,
    Crown, Users
} from 'lucide-react';

const LandingPage = () => {
    const { user, signInWithGoogle, signOut, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);

    // Fetch user's past events (organized + attended)
    useEffect(() => {
        if (!user) return;

        const fetchEvents = async () => {
            setLoadingEvents(true);

            // 1. Events the user organized
            const { data: organized, error: orgError } = await supabase
                .from('events')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (orgError) console.error('Fetch organized error:', orgError);

            // 2. Events the user attended
            const { data: attended, error: attError } = await supabase
                .from('event_attendees')
                .select('event_id, events(*)')
                .eq('user_id', user.id)
                .order('joined_at', { ascending: false });

            if (attError) console.error('Fetch attended error:', attError);

            // Merge and deduplicate
            const organizedList = (organized || []).map(e => ({ ...e, role: 'organizer' }));
            const attendedList = (attended || [])
                .map(a => ({ ...a.events, role: 'attendee' }))
                .filter(e => e && e.id);

            // Deduplicate: if user organized AND attended, keep organizer role
            const organizedIds = new Set(organizedList.map(e => e.id));
            const uniqueAttended = attendedList.filter(e => !organizedIds.has(e.id));

            setEvents([...organizedList, ...uniqueAttended]);
            setLoadingEvents(false);
        };

        fetchEvents();
    }, [user]);

    // Loading spinner while auth resolves
    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-surface">
                <Loader className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    // --- NOT LOGGED IN: Show Sign-In Screen ---
    if (!user) {
        return (
            <div className="flex min-h-[100svh] flex-col items-center justify-center bg-surface p-6">
                {/* Hero */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-surface-container-high rounded-full mb-6 shadow-card">
                        <Camera size={48} className="text-primary" />
                    </div>
                    <h1 className="text-5xl font-black mb-4 tracking-tight text-on-surface">
                        Cam<span className="text-primary">Drop</span>
                    </h1>
                    <p className="text-lg text-on-surface-variant max-w-md mx-auto leading-relaxed">
                        The frictionless digital disposable camera. Capture memories at any event.
                    </p>
                </div>

                {/* Google Sign In */}
                <button
                    id="google-signin-button"
                    onClick={signInWithGoogle}
                    className="flex items-center gap-3 bg-white hover:bg-gray-50 text-gray-700 px-8 py-4 rounded-full font-medium text-lg shadow-card border border-gray-200 transition-all active:scale-95 cursor-pointer"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                <p className="text-sm text-on-surface-dim mt-6">
                    Sign in to create and manage your events
                </p>
            </div>
        );
    }

    // --- LOGGED IN: Show Dashboard Landing ---
    return (
        <div className="min-h-screen bg-surface p-4 md:p-8">
            <div className="mx-auto max-w-3xl">

                {/* Top Bar */}
                <header className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-on-surface">
                            Cam<span className="text-primary">Drop</span>
                        </h1>
                        <p className="text-sm text-on-surface-variant mt-1">
                            Welcome, <span className="font-medium text-on-surface">{user.user_metadata?.full_name || user.email}</span>
                        </p>
                    </div>
                    <button
                        id="sign-out-button"
                        onClick={signOut}
                        className="flex items-center gap-2 text-on-surface-variant hover:text-danger text-sm font-medium transition-colors cursor-pointer"
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </header>

                {/* Action Cards */}
                <div className="grid gap-4 sm:grid-cols-2 mb-10">
                    <button
                        id="create-event-card"
                        onClick={() => navigate('/create')}
                        className="bg-primary text-on-primary p-6 rounded-2xl shadow-glow hover:opacity-90 transition-all active:scale-[0.98] text-left cursor-pointer"
                    >
                        <Plus size={28} className="mb-3" />
                        <h2 className="text-xl font-bold">Create Event</h2>
                        <p className="text-sm opacity-80 mt-1">Set up a new disposable camera for your next event</p>
                    </button>

                    <div
                        className="bg-surface-container-high p-6 rounded-2xl border border-border shadow-card text-left"
                    >
                        <Clock size={28} className="mb-3 text-on-surface-variant" />
                        <h2 className="text-xl font-bold text-on-surface">Your Events</h2>
                        <p className="text-sm text-on-surface-variant mt-1">
                            {events.length} event{events.length !== 1 ? 's' : ''} total
                        </p>
                    </div>
                </div>

                {/* Events List */}
                <div>
                    <h3 className="text-lg font-bold text-on-surface mb-4">Recent Events</h3>

                    {loadingEvents ? (
                        <div className="flex justify-center py-12">
                            <Loader className="animate-spin text-primary" size={24} />
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-12 bg-surface-container rounded-2xl border border-border">
                            <Camera size={40} className="mx-auto mb-3 text-on-surface-dim" />
                            <p className="text-on-surface-variant">No events yet. Create your first one!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {events.map(event => (
                                <button
                                    key={event.id}
                                    onClick={() => {
                                        if (event.role === 'organizer') {
                                            navigate(`/dashboard/${event.id}`);
                                        } else if (event.is_developed) {
                                            navigate(`/gallery/${event.id}`);
                                        } else {
                                            navigate(`/camera/${event.id}`);
                                        }
                                    }}
                                    className="w-full flex items-center justify-between bg-surface-container-high hover:bg-surface-container-highest p-5 rounded-xl border border-border transition-colors cursor-pointer text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            event.role === 'organizer'
                                                ? 'bg-primary/15 text-primary'
                                                : 'bg-success/15 text-success'
                                        }`}>
                                            {event.role === 'organizer' ? <Crown size={20} /> : <Users size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-on-surface">{event.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                    event.role === 'organizer'
                                                        ? 'bg-primary/15 text-primary'
                                                        : 'bg-success/15 text-success'
                                                }`}>
                                                    {event.role}
                                                </span>
                                                {event.is_developed && (
                                                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-on-surface-dim/10 text-on-surface-variant">
                                                        Developed
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <ArrowRight size={20} className="text-on-surface-dim" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
