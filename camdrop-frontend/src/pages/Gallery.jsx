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
    if (loading) return <div className="flex h-[100svh] items-center justify-center bg-surface text-on-surface">Loading darkroom...</div>;

    return (
        <div className="min-h-screen bg-surface text-on-surface p-6">
            <header className="mb-8 text-center pt-4">
                <h1 className="text-4xl font-semibold text-primary">{eventName}</h1>
                <p className="text-on-surface-variant mt-2 text-lg">The Photo Dump</p>
            </header>

            {!isDeveloped ? (
                <div className="flex flex-col items-center justify-center mt-20 text-center px-4">
                    <div className="mb-6 rounded-[28px] bg-surface-container shadow-elevation-1 p-8 text-on-surface-variant">
                        <Lock size={64} />
                    </div>
                    <h2 className="text-2xl font-medium mb-3 text-on-surface">Photos are Developing...</h2>
                    <p className="text-on-surface-variant max-w-sm leading-relaxed">
                        Check back later. The event organizer will reveal the gallery when the event is over!
                    </p>
                </div>
            ) : (
                <div className="space-y-12">
                    {Object.keys(albums).length === 0 ? (
                        <div className="text-center text-on-surface-variant py-10 bg-surface-container rounded-[24px] shadow-elevation-1 mx-2">
                            <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg">No photos were taken at this event.</p>
                        </div>
                    ) : (
                        Object.entries(albums).map(([guestName, guestPhotos]) => (
                            <div key={guestName} className="mx-2">
                                <h3 className="text-2xl font-medium text-primary mb-4 pb-2 border-b-2 border-surface-container-highest flex items-center gap-2">
                                    📸 {guestName}'s Roll ({guestPhotos.length} {guestPhotos.length === 1 ? 'photo' : 'photos'})
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {guestPhotos.map((photo, index) => (
                                        <div key={index} className="relative group rounded-[16px] overflow-hidden shadow-elevation-1 bg-surface-container">
                                            <img
                                                src={photo.url}
                                                alt={`Taken by ${photo.guestName}`}
                                                className="w-full h-48 sm:h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default Gallery;