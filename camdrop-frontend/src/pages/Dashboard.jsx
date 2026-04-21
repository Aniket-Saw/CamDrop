import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Download, QrCode, Camera, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';

const Dashboard = () => {
    const { eventId } = useParams();

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
                        setEventData(prev => ({...prev, is_developed: payload.new.is_developed}));
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
            const response = await fetch(`http://localhost:8000/events/${eventId}/develop`, {
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
            const response = await fetch(`http://localhost:8000/events/${eventId}/photos`, {
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
    if (loading) return <div className="flex h-screen items-center justify-center bg-surface text-on-surface">Loading Dashboard...</div>;
    if (!eventData) return <div className="flex h-screen items-center justify-center bg-surface text-on-surface">Event not found.</div>;

    return (
        <div className="min-h-screen bg-surface p-4 md:p-8 text-on-surface">
            <div className="mx-auto max-w-4xl">

                {/* Header */}
                <header className="mb-8 pb-4 text-center md:mb-10 md:pb-6">
                    <h1 className="text-4xl font-semibold text-primary md:text-5xl">{eventData.name}</h1>
                    <p className="text-on-surface-variant mt-2 text-lg md:text-xl">Organizer: {eventData.organizer_name}</p>
                </header>

                <div className="grid gap-8 md:grid-cols-2">

                    {/* Stats & QR Code Card (MD3 Elevated Card) */}
                    <div className="rounded-[28px] bg-surface-container shadow-elevation-1 p-6 flex flex-col justify-between">
                        <h2 className="mb-4 text-xl font-medium flex items-center gap-2"><QrCode className="text-primary"/> Event Access</h2>

                        <div className="mb-6 flex justify-center rounded-[20px] bg-white p-4 shadow-elevation-2 mx-auto">
                            {/* Assuming your bucket is public, we format the URL */}
                            <img
                                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/qr-codes/${eventId}_qr.png`}
                                alt="Event QR Code"
                                className="w-48 h-48"
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-[16px] bg-surface-container-highest p-4 mt-auto shadow-elevation-1">
                            <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-2 text-on-surface"><Camera size={20} className="text-primary"/> Photos Taken:</span>
                                {connectionError && (
                                    <span className="flex items-center gap-1 text-xs text-error"><AlertTriangle size={12}/> Live updates paused</span>
                                )}
                            </div>
                            <span className="text-2xl font-bold text-primary">{photoCount}</span>
                        </div>
                    </div>

                    {/* Control Panel Card (MD3 Elevated Card) */}
                    <div className="rounded-[28px] bg-surface-container shadow-elevation-1 p-6 flex flex-col justify-between">
                        <div>
                            <h2 className="mb-4 text-xl font-medium">Event Status</h2>
                            {eventData.is_developed ? (
                                <div className="mb-6 flex items-center gap-3 text-on-secondary-container bg-secondary-container p-4 rounded-[16px]">
                                    <CheckCircle size={24} />
                                    <span className="font-medium text-lg">Developed & Public</span>
                                </div>
                            ) : (
                                <p className="mb-6 text-on-surface-variant text-base leading-relaxed tracking-wide bg-surface-container-highest p-4 rounded-[16px]">
                                    The event is currently live. Guests can take photos but cannot see the gallery.
                                    Clicking "Develop" will end the event, lock all cameras, and reveal the gallery to everyone.
                                </p>
                            )}
                        </div>

                        <div className="space-y-4">
                            {!eventData.is_developed && (
                                <button
                                    onClick={handleDevelop}
                                    disabled={isDeveloping}
                                    className="w-full rounded-full bg-primary py-4 font-medium text-on-primary transition hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50 flex justify-center shadow-elevation-1 active:scale-95 transition-transform"
                                >
                                    {isDeveloping ? "Developing Roll..." : "Develop Event (Reveal Photos)"}
                                </button>
                            )}

                            {(archiveUrl || eventData.is_developed) && (
                                <div className="space-y-4">
                                    <a
                                        href={archiveUrl || `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/event-photos/archives/${eventId}_archive.zip`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full rounded-full border-2 border-outline py-4 font-medium text-primary transition hover:bg-surface-container-highest flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                    >
                                        <Download size={20} />
                                        Download ZIP Archive
                                    </a>

                                    {photoCount > 0 && (
                                        <button
                                            onClick={handleWipePhotos}
                                            disabled={isDeleting}
                                            className="w-full rounded-full border-2 border-error text-error py-4 font-medium transition hover:bg-error hover:text-white flex items-center justify-center gap-2 shadow-elevation-1 active:scale-95 transition-transform disabled:opacity-50"
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