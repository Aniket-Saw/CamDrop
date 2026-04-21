import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lock, Image as ImageIcon } from 'lucide-react';

const Gallery = () => {
    const { eventId } = useParams();

    // State Management
    const [isDeveloped, setIsDeveloped] = useState(false);
    const [eventName, setEventName] = useState('');
    const [albums, setAlbums] = useState({});
    const [loading, setLoading] = useState(true);

    // --- Middle Level: Core Logic & Real-time Fetching ---
    useEffect(() => {
        fetchEventStatus();

        // Optional: You could add a Supabase real-time subscription here 
        // to auto-refresh the page the exact second the organizer hits "Develop"
    }, [eventId]);

    const fetchEventStatus = async () => {
        // Check the event status
        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('name, is_developed')
            .eq('id', eventId)
            .single();

        if (eventError) {
            console.error(eventError);
            return setLoading(false);
        }

        setEventName(eventData.name);
        setIsDeveloped(eventData.is_developed);

        // If developed, fetch the photos
        if (eventData.is_developed) {
            fetchPhotos();
        } else {
            setLoading(false);
        }
    };

    // --- Lower Level: Database Query & URL Generation ---
    const fetchPhotos = async () => {
        // 1. Query the photos table (RLS allows this only if is_developed is true)
        const { data: photoRecords, error: photoError } = await supabase
            .from('photos')
            .select('guest_name, storage_path')
            .eq('event_id', eventId);

        if (photoError) {
            console.error(photoError);
            setLoading(false);
            return;
        }

        // 2. Convert storage paths into public URLs for rendering
        const photosWithUrls = photoRecords.map(record => {
            const { data } = supabase.storage
                .from('event-photos')
                .getPublicUrl(record.storage_path);

            return {
                url: data.publicUrl,
                guestName: record.guest_name || 'Anonymous',
                path: record.storage_path
            };
        });

        // 3. Group by guestName
        const groupedAlbums = photosWithUrls.reduce((acc, photo) => {
            if (!acc[photo.guestName]) acc[photo.guestName] = [];
            acc[photo.guestName].push(photo);
            return acc;
        }, {});

        setAlbums(groupedAlbums);
        setLoading(false);
    };

    // --- Upper Level: UI Rendering ---
    if (loading) {
        return (
            <div className="flex h-[100svh] items-center justify-center bg-surface text-on-surface-variant">
                <div className="animate-pulse text-lg">Loading darkroom...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface text-on-surface">
            {/* Header */}
            <header className="py-8 px-6 text-center">
                <h1 className="text-4xl font-black text-primary tracking-tight">{eventName}</h1>
                <p className="text-on-surface-variant mt-2 text-lg">The Photo Dump</p>
            </header>

            {!isDeveloped ? (
                /* State A: The Locked Vault */
                <div className="flex flex-col items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
                    <div className="w-28 h-28 rounded-full bg-surface-container-high flex items-center justify-center mb-8 shadow-card">
                        <Lock size={56} className="text-on-surface-variant" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3 text-on-surface text-center">Photos are Developing...</h2>
                    <p className="text-on-surface-variant max-w-sm text-center leading-relaxed">
                        Check back later. The event organizer will reveal the gallery when the event is over.
                    </p>
                </div>
            ) : (
                /* State B: The Photo Grid */
                <div className="px-4 pb-8 md:px-6">
                    {Object.keys(albums).length === 0 ? (
                        <div className="text-center text-on-surface-variant py-16 bg-surface-container rounded-xl border border-border mx-2 shadow-card">
                            <ImageIcon size={48} className="mx-auto mb-4 opacity-40" />
                            <p className="text-lg">No photos were taken at this event.</p>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {Object.entries(albums).map(([guestName, guestPhotos]) => (
                                <div key={guestName}>
                                    <h3 className="text-xl font-bold text-primary mb-4 px-2 flex items-center gap-2">
                                        📸 {guestName}'s Roll
                                        <span className="text-sm font-normal text-on-surface-variant">
                                            ({guestPhotos.length} {guestPhotos.length === 1 ? 'photo' : 'photos'})
                                        </span>
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                        {guestPhotos.map((photo, index) => (
                                            <div key={index} className="relative group rounded-lg overflow-hidden shadow-card bg-surface-container">
                                                <img
                                                    src={photo.url}
                                                    alt={`Taken by ${photo.guestName}`}
                                                    className="w-full h-48 md:h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                                {/* Attribution Overlay */}
                                                <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                                                    <span className="text-xs font-semibold text-primary">
                                                        📸 {photo.guestName}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Gallery;