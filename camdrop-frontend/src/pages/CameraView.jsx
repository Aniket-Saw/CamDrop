import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import localforage from 'localforage';
import { supabase } from '../supabaseClient';
import { Check, X, Camera as CameraIcon, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { analyzeImageQuality } from '../utils/imageQuality';

const CameraView = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const webcamRef = useRef(null);

    // State Management
    const [imgSrc, setImgSrc] = useState(null);
    const [timeLeft, setTimeLeft] = useState(5);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDeveloped, setIsDeveloped] = useState(false);
    const [livePulse, setLivePulse] = useState(0);
    const [qualityWarning, setQualityWarning] = useState(null);

    const guestName = localStorage.getItem('camdrop_guest') || 'Anonymous';

    // --- Middle Level: Core Logic & Network Sync ---

    useEffect(() => {
        // Network listeners
        const handleOnline = () => {
            setIsOffline(false);
            syncOfflinePhotos();
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check for pending photos on load
        updatePendingCount();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Listen for realtime 'Develop' command from Dashboard
    // Listen for realtime 'Develop' command and 'total_photos' increment
    useEffect(() => {
        const fetchEventData = async () => {
            const { data } = await supabase.from('events').select('is_developed, total_photos').eq('id', eventId).single();
            if (data) {
                if (data.is_developed) setIsDeveloped(true);
                setLivePulse(data.total_photos || 0);
            }
        };
        fetchEventData();

        const eventSubscription = supabase
            .channel(`camera-events-${eventId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
                (payload) => {
                    if (payload.new.is_developed) {
                        setIsDeveloped(true);
                        setImgSrc(null); // Clear viewfinder if they were composing a shot
                    }
                    if (payload.new.total_photos !== undefined) {
                        setLivePulse(payload.new.total_photos);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(eventSubscription);
        };
    }, [eventId]);

    // 5-Second Timer Logic
    useEffect(() => {
        let timer;
        if (imgSrc && timeLeft > 0) {
            timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        } else if (imgSrc && timeLeft === 0) {
            scrap(); // Auto-scrap if time runs out
        }
        return () => clearTimeout(timer);
    }, [imgSrc, timeLeft]);

    const updatePendingCount = async () => {
        const keys = await localforage.keys();
        setPendingCount(keys.length);
    };

    const capture = useCallback(async () => {
        // --- Haptics & Audio ---
        if (navigator.vibrate) navigator.vibrate(50); // Sharp 50ms pulse
        new Audio('/shutter.mp3').play().catch(e => console.log('Audio blocked:', e));

        const imageSrc = webcamRef.current.getScreenshot();
        setImgSrc(imageSrc);
        setTimeLeft(5); // Start the clock
        setQualityWarning(null); // Reset warnings
        
        // Fire the edge compute check
        const quality = await analyzeImageQuality(imageSrc);
        
        if (quality.isDark && quality.isBlurry) {
            setQualityWarning("Dark & Blurry!");
        } else if (quality.isDark) {
            setQualityWarning("Too Dark!");
        } else if (quality.isBlurry) {
            setQualityWarning("Too Blurry!");
        }
    }, [webcamRef]);

    const scrap = () => {
        setImgSrc(null);
        setQualityWarning(null); // Clear warning if they scrap it
    };

    // Helper: Convert Base64 from Webcam to Blob for Storage
    const dataURLtoBlob = (dataurl) => {
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    // --- Lower Level: Storage & IndexedDB Output ---

    const keep = async () => {
        // Winding gear mechanical sound
        new Audio('/winding.mp3').play().catch(e => console.log('Audio blocked:', e));

        const blob = dataURLtoBlob(imgSrc);
        const fileName = `${Date.now()}.jpg`;
        const filePath = `${eventId}/${guestName}/${fileName}`;

        let syncSuccess = false;

        if (isOffline) {
            // Offline: Save to IndexedDB
            await localforage.setItem(filePath, blob);
            updatePendingCount();
            syncSuccess = true;
        } else {
            // Online: Upload straight to Supabase
            syncSuccess = await uploadToSupabase(filePath, blob);
        }

        if (syncSuccess && navigator.vibrate) {
            navigator.vibrate([50, 100, 50]); // Double pulse to confirm save
        }

        setImgSrc(null); // Reset viewfinder
    };

    const uploadToSupabase = async (path, fileBlob) => {
        // 1. Upload to Storage Vault
        const { error: storageError } = await supabase.storage
            .from('event-photos')
            .upload(path, fileBlob, { contentType: 'image/jpeg' });

        if (storageError) {
            console.error("Upload failed:", storageError);
            return false;
        }

        // 2. NEW: Link the photo in the database so the Gallery can find it
        const { error: dbError } = await supabase
            .from('photos')
            .insert([{
                event_id: eventId,
                guest_name: guestName,
                storage_path: path
            }]);

        if (dbError) {
            console.error("Database link failed:", dbError);
            return false;
        }

        return true;
    };
    const syncOfflinePhotos = async () => {
        setIsSyncing(true);
        try {
            const keys = await localforage.keys();
            for (let path of keys) {
                const blob = await localforage.getItem(path);
                await uploadToSupabase(path, blob);
                await localforage.removeItem(path); // Clean up after successful upload
            }
            updatePendingCount();
        } catch (err) {
            console.error("Sync error:", err);
        }
        setIsSyncing(false);
    };

    // --- Upper Level: UI Rendering ---

    if (isDeveloped) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-surface p-6 text-center text-on-surface">
                <CameraIcon size={64} className="mb-4 text-primary" />
                <h1 className="mb-2 text-3xl font-bold">Event Developed!</h1>
                <p className="mb-8 text-on-surface-variant text-lg">The organizer has closed the cameras and revealed the photos.</p>
                <button
                    onClick={() => navigate(`/gallery/${eventId}`)}
                    className="rounded-full bg-primary px-8 py-4 font-medium text-on-primary shadow-elevation-1 transition active:scale-95"
                >
                    View the Gallery
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-black text-white">
            {/* Top HUD */}
            <div className="absolute top-0 z-10 flex w-full justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
                <div className="flex flex-col">
                    <span className="font-bold">{guestName}</span>
                    <span className="text-xs text-yellow-500 font-semibold animate-pulse mt-1">
                        🔥 {livePulse} photos snapped
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isOffline && <CloudOff size={20} className="text-red-500" />}
                    {isSyncing && <RefreshCw size={20} className="animate-spin text-yellow-500" />}
                    {pendingCount > 0 && <span className="rounded bg-yellow-500 px-2 py-1 text-xs font-bold text-black">{pendingCount} Pending</span>}
                </div>
            </div>

            {/* Viewfinder / Review Screen */}
            <div className="relative flex-grow overflow-hidden bg-zinc-900">
                {!imgSrc ? (
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "environment" }}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <>
                        <img src={imgSrc} alt="Captured" className="h-full w-full object-cover" />
                        
                        {/* NEW: Quality Warning Overlay */}
                        {qualityWarning && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center rounded-xl bg-black/80 px-6 py-4 text-red-500 animate-pulse border border-red-500/50 backdrop-blur-sm">
                                <AlertTriangle size={32} className="mb-2" />
                                <span className="text-xl font-black uppercase tracking-widest text-center">
                                    {qualityWarning}
                                </span>
                                <span className="text-xs text-zinc-400 mt-1">Scrap to try again</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Controls */}
            <div className="flex h-32 items-center justify-center bg-black pb-6">
                {!imgSrc ? (
                    <button
                        onClick={capture}
                        className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-yellow-500 bg-white text-black active:scale-90 transition-transform"
                    >
                        <CameraIcon size={32} />
                    </button>
                ) : (
                    <div className="flex w-full max-w-md justify-around px-6">
                        <button onClick={scrap} className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-red-600 text-white active:scale-90">
                            <X size={28} />
                        </button>

                        {/* The 5-Second Countdown Indicator */}
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-zinc-600 text-2xl font-bold">
                            {timeLeft}
                        </div>

                        <button onClick={keep} className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-green-500 text-white active:scale-90">
                            <Check size={28} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CameraView;