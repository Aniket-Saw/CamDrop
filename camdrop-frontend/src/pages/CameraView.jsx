import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import localforage from 'localforage';
import { supabase } from '../supabaseClient';
import { Check, X, Camera as CameraIcon, CloudOff, RefreshCw } from 'lucide-react';

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

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setImgSrc(imageSrc);
        setTimeLeft(5); // Start the clock
    }, [webcamRef]);

    const scrap = () => {
        setImgSrc(null);
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
        const blob = dataURLtoBlob(imgSrc);
        const fileName = `${Date.now()}.jpg`;
        const filePath = `${eventId}/${guestName}/${fileName}`;

        if (isOffline) {
            // Offline: Save to IndexedDB
            await localforage.setItem(filePath, blob);
            updatePendingCount();
        } else {
            // Online: Upload straight to Supabase
            await uploadToSupabase(filePath, blob);
        }

        setImgSrc(null); // Reset viewfinder
    };

    const uploadToSupabase = async (path, fileBlob) => {
        const { error } = await supabase.storage
            .from('event-photos')
            .upload(path, fileBlob, { contentType: 'image/jpeg' });

        if (error) console.error("Upload failed:", error);
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

    return (
        <div className="flex h-screen flex-col bg-black text-white">
            {/* Top HUD */}
            <div className="absolute top-0 z-10 flex w-full justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
                <div className="font-bold">{guestName}</div>
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
                    <img src={imgSrc} alt="Captured" className="h-full w-full object-cover" />
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