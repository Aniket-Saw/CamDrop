import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import API_BASE_URL from '../config';
import { Download, QrCode, Camera, CheckCircle, AlertTriangle, Trash2, Home } from 'lucide-react';

const Dashboard = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();

    const [eventData, setEventData] = useState(null);
    const [photoCount, setPhotoCount] = useState(0);
    const [isDeveloping, setIsDeveloping] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [archiveUrl, setArchiveUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connectionError, setConnectionError] = useState(false);

    // --- Middle Level: State Management & Fetching ---
    useEffect(() => {
        // Run initial fetch for fast load
        fetchDashboardData();

        // Subscribe to real-time updates via our secure SQL trigger on the 'events' table
        const dashboardSubscription = supabase
            .channel(`dashboard-events-${eventId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'events',
                    filter: `id=eq.${eventId}`
                },
                (payload) => {
                    // Update the counter when the database trigger fires
                    if (payload.new.total_photos !== undefined) {
                        setPhotoCount(payload.new.total_photos);
                    }
                    if (payload.new.is_developed !== undefined) {
                        setEventData(prev => ({ ...prev, is_developed: payload.new.is_developed }));
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setConnectionError(false);
                    // Re-sync on fresh connects/reconnects to ensure no missed events!
                    fetchDashboardData();
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error("Realtime connection error:", status);
                    setConnectionError(true);
                }
            });

        return () => {
            // Cleanup the subscription when leaving the dashboard
            supabase.removeChannel(dashboardSubscription);
        };
    }, [eventId]);

    const fetchDashboardData = async () => {
        // 1. Get Event Details
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (eventError) console.error(eventError);
        else setEventData(event);

        // 2. Map photo dial securely to the SQL trigger data payload
        if (event && event.total_photos !== undefined) {
            setPhotoCount(event.total_photos);
        } else if (!eventError) {
            // Fallback to table count if the trigger column is somehow missing
            const { count } = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('event_id', eventId);
            setPhotoCount(count || 0);
        }

        setLoading(false);
    };

    // --- Lower Level: Triggering the Backend FastAPI Worker ---
    const handleDevelop = async () => {
        const confirmDevelop = window.confirm("Are you sure? This will lock the cameras and reveal all photos to the guests!");
        if (!confirmDevelop) return;

        setIsDeveloping(true);

        try {
            // Call our FastAPI backend endpoint
            const response = await fetch(`${API_BASE_URL}/events/${eventId}/develop`, {
                method: 'PUT',
            });

            const result = await response.json();

            if (response.ok) {
                setArchiveUrl(result.archive_url);
                // Refresh local state
                setEventData(prev => ({ ...prev, is_developed: true }));
            } else {
                alert(`Error: ${result.detail}`);
            }
        } catch (error) {
            console.error("Failed to contact backend:", error);
            alert("Failed to develop event. Is the backend running?");
        }

        setIsDeveloping(false);
    };

    const handleWipePhotos = async () => {
        const confirmWipe = window.confirm(
            "CRITICAL: Are you sure you want to permanently delete all photos from the cloud? Ensure you have downloaded the ZIP archive first! This action cannot be undone."
        );
        if (!confirmWipe) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/events/${eventId}/photos`, {
                method: 'DELETE',
            });
            const result = await response.json();

            if (response.ok) {
                alert("All photos have been successfully deleted from the server.");
                setPhotoCount(0); // Instantly drop the UI dial to 0
            } else {
                alert(`Error: ${result.detail}`);
            }
        } catch (error) {
            console.error("Failed to delete photos:", error);
            alert("Server error during deletion. Is the backend running?");
        }
        setIsDeleting(false);
    };

    // --- Upper Level: UI Rendering ---
    if (loading) return <div className="flex h-screen items-center justify-center bg-surface text-on-surface-variant"><div className="animate-pulse text-lg">Loading Dashboard...</div></div>;
    if (!eventData) return <div className="flex h-screen items-center justify-center bg-surface text-on-surface-variant">Event not found.</div>;

    return (
        <div className="min-h-screen bg-surface p-4 md:p-8">
            <div className="mx-auto max-w-5xl">

                {/* Header */}
                <header className="mb-8 pb-6 border-b border-border">
                    <div className="flex items-center justify-between mb-2">
                        <button
                            id="dashboard-home-button"
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-on-surface-variant hover:text-primary text-sm font-medium transition-colors cursor-pointer"
                        >
                            <Home size={18} />
                            Home
                        </button>
                    </div>
                    <h1 className="text-4xl font-black text-primary md:text-5xl tracking-tight">{eventData.name}</h1>
                    <p className="text-on-surface-variant mt-2 text-lg">Organizer: <span className="text-on-surface font-medium">{eventData.organizer_name}</span></p>
                </header>

                <div className="grid gap-6 md:grid-cols-2">

                    {/* Left Column: Assets & Stats */}
                    <div className="bg-surface-container-high rounded-xl border border-border-light p-6 shadow-card">
                        <h2 className="mb-5 text-lg font-bold flex items-center gap-2 text-on-surface">
                            <QrCode size={20} className="text-primary" /> Event Access
                        </h2>

                        {/* QR Code */}
                        <div className="mb-6 flex justify-center">
                            <div className="bg-white p-4 rounded-2xl shadow-deep">
                                <img
                                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/qr-codes/${eventId}_qr.png`}
                                    alt="Event QR Code"
                                    className="w-52 h-52"
                                />
                            </div>
                        </div>
                        <a
                            href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/qr-codes/${eventId}_qr.png`}
                            download
                            className="block text-center text-sm text-primary hover:underline mb-6 font-medium"
                        >
                            Download QR Code
                        </a>

                        {/* Live Stats */}
                        <div className="bg-surface-container rounded-xl p-5 border border-border">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className="flex items-center gap-2 text-on-surface-variant text-sm font-medium">
                                        <Camera size={16} className="text-primary" /> Photos Taken
                                    </span>
                                    {connectionError && (
                                        <span className="flex items-center gap-1 text-xs text-danger">
                                            <AlertTriangle size={12} /> Live updates paused
                                        </span>
                                    )}
                                </div>
                                <span className="text-5xl font-black text-primary tabular-nums">{photoCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Control Panel */}
                    <div className="bg-surface-container-high rounded-xl border border-border-light p-6 shadow-card flex flex-col">
                        <h2 className="mb-5 text-lg font-bold text-on-surface">Event Status</h2>

                        {eventData.is_developed ? (
                            <div className="mb-6 flex items-center gap-3 bg-success/15 text-success p-4 rounded-xl border border-success/30">
                                <CheckCircle size={24} />
                                <span className="font-bold text-lg">Developed & Public</span>
                            </div>
                        ) : (
                            <div className="mb-6 bg-surface-container rounded-xl p-4 border border-border">
                                <p className="text-on-surface-variant text-sm leading-relaxed">
                                    The event is currently <span className="text-primary font-semibold">live</span>. Guests can take photos but cannot see the gallery.
                                    Clicking "Develop" will end the event, lock all cameras, and reveal the gallery to everyone.
                                </p>
                            </div>
                        )}

                        <div className="space-y-4 mt-auto">
                            {!eventData.is_developed && (
                                <div>
                                    <button
                                        id="develop-event-button"
                                        onClick={handleDevelop}
                                        disabled={isDeveloping}
                                        className="w-full bg-primary hover:bg-primary-hover text-on-primary py-4 rounded-full font-bold text-lg transition-all active:scale-95 disabled:opacity-50 shadow-glow cursor-pointer"
                                    >
                                        {isDeveloping ? "Developing Roll..." : "🎞️ Develop Event (Reveal Photos)"}
                                    </button>
                                    <p className="text-xs text-on-surface-dim text-center mt-2">
                                        This will permanently lock all cameras and reveal the gallery.
                                    </p>
                                </div>
                            )}

                            {(archiveUrl || eventData.is_developed) && (
                                <div className="space-y-3">
                                    <a
                                        id="download-zip-button"
                                        href={archiveUrl || `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/event-photos/archives/${eventId}_archive.zip`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full rounded-full border-2 border-primary text-primary py-4 font-bold transition-colors hover:bg-primary hover:text-on-primary flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                                    >
                                        <Download size={20} />
                                        Download ZIP Archive
                                    </a>

                                    {photoCount > 0 && (
                                        <button
                                            id="wipe-photos-button"
                                            onClick={handleWipePhotos}
                                            disabled={isDeleting}
                                            className="w-full rounded-full border-2 border-danger text-danger py-4 font-bold transition-colors hover:bg-danger hover:text-on-danger flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                                        >
                                            <Trash2 size={20} />
                                            {isDeleting ? "Wiping Servers..." : "Wipe Cloud Photos"}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;