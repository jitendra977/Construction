import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Maximize2, Minimize2, Camera, UserCheck, ShieldAlert, RefreshCw } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

// Sound synthesizer for real-time auditory kiosk feedback
function playChime(type = 'success') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);

        if (type === 'success') {
            o.type = 'sine'; o.frequency.value = 523.25; // C5
            g.gain.setValueAtTime(0.1, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
            o.start(); o.stop(ctx.currentTime + 0.4);
            
            setTimeout(() => {
                const o2 = ctx.createOscillator();
                const g2 = ctx.createGain();
                o2.connect(g2);
                g2.connect(ctx.destination);
                o2.type = 'sine'; o2.frequency.value = 659.25; // E5
                g2.gain.setValueAtTime(0.1, ctx.currentTime);
                g2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
                o2.start(); o2.stop(ctx.currentTime + 0.5);
            }, 120);
        } else if (type === 'error') {
            o.type = 'sawtooth'; o.frequency.value = 140;
            g.gain.setValueAtTime(0.1, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
            o.start(); o.stop(ctx.currentTime + 0.35);
        }
    } catch (_) {}
}

function KioskViewportShell({ title, children }) {
    const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

    useEffect(() => {
        const previousTitle = document.title;
        document.title = title;
        const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.title = previousTitle;
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [title]);

    const toggleFullscreen = useCallback(async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
                return;
            }
            await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
        } catch {
            // Ignore browsers that block fullscreen
        }
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', overflow: 'hidden', position: 'relative' }}>
            {/* Ambient Background Glows */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }}></div>
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }}></div>

            <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                style={{
                    position: 'fixed',
                    top: 20,
                    right: 20,
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 16px',
                    borderRadius: 14,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(15, 23, 42, 0.7)',
                    color: '#f8fafc',
                    fontSize: 12,
                    fontWeight: 700,
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    cursor: 'pointer',
                }}
            >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>
            {children}
        </div>
    );
}

export default function AttendanceBiometricKiosk() {
    const { projectId } = useParams();
    const [scanActive, setScanActive] = useState(false);
    const [modelsReady, setModelsReady] = useState(false);
    const [modelsLoading, setModelsLoading] = useState(false);
    
    // States for webcam and tracking
    const [cameraStream, setCameraStream] = useState(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const [scanError, setScanError] = useState(null);
    const [checkInResult, setCheckInResult] = useState(null);
    const [kioskStatus, setKioskStatus] = useState('idle'); // idle | loading | scanning | matching | success | error
    const [language, setLanguage] = useState('both'); // 'both' | 'ne' | 'en'

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const frameLoopRef = useRef(null);
    const busyRef = useRef(false);
    const stableCountRef = useRef(0);
    const resultTimerRef = useRef(null);

    // Initial check for project
    if (!projectId) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#050508',
                color: '#fff',
                flexDirection: 'column',
                gap: 12,
            }}>
                <div style={{ fontSize: 48 }}>📷</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Biometric Face Kiosk</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                    Use /face-kiosk/&lt;projectId&gt;
                </div>
            </div>
        );
    }

    // Lazy load face-api neural weights
    const ensureModelsLoaded = async () => {
        if (modelsReady) return true;
        setModelsLoading(true);
        setKioskStatus('loading');
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            setModelsReady(true);
            setModelsLoading(false);
            return true;
        } catch (e) {
            console.error('Failed to load AI weights:', e);
            toast.error('Failed to load biometric AI models.');
            setScanError('Failed to load AI face recognition models.');
            setKioskStatus('error');
            setModelsLoading(false);
            return false;
        }
    };

    const stopCamera = useCallback(() => {
        if (frameLoopRef.current) {
            cancelAnimationFrame(frameLoopRef.current);
            frameLoopRef.current = null;
        }
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        busyRef.current = false;
        stableCountRef.current = 0;
    }, [cameraStream]);

    const startScanning = async () => {
        setScanError(null);
        setCheckInResult(null);
        if (resultTimerRef.current) {
            clearTimeout(resultTimerRef.current);
            resultTimerRef.current = null;
        }

        const loaded = await ensureModelsLoaded();
        if (!loaded) return;

        setScanActive(true);
        setKioskStatus('scanning');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            setCameraStream(stream);
        } catch (err) {
            console.error('Webcam denied:', err);
            setScanError('Webcam permission denied. Please allow camera access.');
            setKioskStatus('error');
            setScanActive(false);
        }
    };

    // Frame analyzer loop
    const analyzeFrame = useCallback(async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || video.paused || video.ended || !canvas || busyRef.current) {
            frameLoopRef.current = requestAnimationFrame(analyzeFrame);
            return;
        }

        try {
            const det = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (det) {
                    setFaceDetected(true);
                    stableCountRef.current += 1;

                    // Draw circular neon tracking landmarks
                    const dims = faceapi.matchDimensions(canvas, video, true);
                    const resized = faceapi.resizeResults(det, dims);
                    ctx.fillStyle = 'rgba(16,185,129,0.7)';
                    resized.landmarks.positions.forEach(p => {
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    });

                    // Trigger check-in after 15 stable frames
                    if (stableCountRef.current >= 15) {
                        busyRef.current = true;
                        setKioskStatus('matching');
                        await submitFaceSignature(det.descriptor);
                    }
                } else {
                    setFaceDetected(false);
                    stableCountRef.current = 0;
                }
            }
        } catch (e) {
            console.error('Frame loop error:', e);
        }

        if (!busyRef.current) {
            frameLoopRef.current = requestAnimationFrame(analyzeFrame);
        }
    }, [projectId]);

    // Handle check-in submission
    const submitFaceSignature = async (descriptor) => {
        try {
            const res = await axios.post(`${API_URL}/biometrics/kiosk-checkin/`, {
                encoding: Array.from(descriptor),
                project: Number(projectId)
            });

            playChime('success');
            setKioskStatus('success');
            setCheckInResult(res.data);
            
            // Clean up and display worker name card
            stopCamera();
            
            // Auto reset back to welcome screen after 5 seconds
            resultTimerRef.current = setTimeout(() => {
                resetToStart();
            }, 5000);

        } catch (err) {
            console.error('Face match error:', err);
            playChime('error');
            setKioskStatus('error');
            setScanError(err.response?.data?.error || 'Verification failed. Worker not recognized.');
            
            stopCamera();
            
            // Auto reset back to welcome screen after 5 seconds
            resultTimerRef.current = setTimeout(() => {
                resetToStart();
            }, 5000);
        }
    };

    const resetToStart = () => {
        stopCamera();
        setCheckInResult(null);
        setScanError(null);
        setScanActive(false);
        setKioskStatus('idle');
    };

    // Attach stream to video tag and start RAF
    useEffect(() => {
        if (cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream;
            videoRef.current.play()
                .then(() => {
                    frameLoopRef.current = requestAnimationFrame(analyzeFrame);
                })
                .catch(console.error);
        }
        return () => {
            if (frameLoopRef.current) {
                cancelAnimationFrame(frameLoopRef.current);
            }
        };
    }, [cameraStream, analyzeFrame]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
            if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
        };
    }, [stopCamera]);

    return (
        <KioskViewportShell title="ConstructPro Face ID Kiosk">
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                zIndex: 1
            }}>
                
                {/* Header branding */}
                <div style={{ textAlign: 'center', marginBottom: 25 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 32 }}>✨</span>
                        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #f97316, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            ConstructPro
                        </h1>
                    </div>
                    <p style={{ margin: 0, fontSize: 16, color: '#94a3b8', fontWeight: 500 }}>
                        Biometric Site-Entrance Attendance Portal / बायोमेट्रिक हाजिरी प्रणाली
                    </p>
                </div>

                {/* Language Switcher Bar */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    padding: 4,
                    marginBottom: 20,
                    gap: 4
                }}>
                    <button
                        onClick={() => setLanguage('both')}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 10,
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: language === 'both' ? '#f97316' : 'transparent',
                            color: '#fff',
                            transition: 'all 0.2s'
                        }}
                    >
                        🌎 English + नेपाली
                    </button>
                    <button
                        onClick={() => setLanguage('ne')}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 10,
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: language === 'ne' ? '#f97316' : 'transparent',
                            color: '#fff',
                            transition: 'all 0.2s'
                        }}
                    >
                        नेपाली
                    </button>
                    <button
                        onClick={() => setLanguage('en')}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 10,
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: language === 'en' ? '#f97316' : 'transparent',
                            color: '#fff',
                            transition: 'all 0.2s'
                        }}
                    >
                        English
                    </button>
                </div>

                {/* Main Card View */}
                <div style={{
                    width: '100%',
                    maxWidth: 560,
                    background: 'rgba(15, 23, 42, 0.45)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 28,
                    padding: '30px 24px',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 24,
                    position: 'relative'
                }}>
                    
                    {/* Welcome View (idle) */}
                    {kioskStatus === 'idle' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%', textAlign: 'center' }}>
                            <div style={{
                                width: 110,
                                height: 110,
                                borderRadius: 55,
                                background: 'rgba(249,115,22,0.1)',
                                border: '2px dashed #f97316',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: 'pulse 2s infinite',
                                color: '#f97316'
                            }}>
                                <Camera size={44} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {(language === 'both' || language === 'ne') && (
                                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#f97316' }}>
                                        हाजिरी गर्न यहाँ थिच्नुहोस्!
                                    </h2>
                                )}
                                {(language === 'both' || language === 'en') && (
                                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f97316', marginTop: language === 'both' ? 2 : 0 }}>
                                        Tap Here to Mark Attendance
                                    </h2>
                                )}
                            </div>

                            {/* Interactive Pulsing Scan Trigger Button */}
                            <button
                                onClick={startScanning}
                                style={{
                                    width: '100%',
                                    padding: '20px 24px',
                                    borderRadius: 20,
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                                    color: '#fff',
                                    fontSize: 18,
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 30px rgba(249, 115, 22, 0.4)',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Camera size={24} />
                                    <span>
                                        {language === 'ne' ? 'अनुहार स्क्यान सुरु गर्नुहोस्' : 
                                         language === 'en' ? 'Start Face Scan' : 
                                         'अनुहार स्क्यान सुरु गर्नुहोस् / Start Face Scan'}
                                    </span>
                                </div>
                                <span style={{ fontSize: 12, opacity: 0.85, fontWeight: 500 }}>
                                    {language === 'ne' ? '(क्यामेरा खोल्नुहोस्)' : '(Opens the camera)'}
                                </span>
                            </button>

                            {/* Visual Step-by-Step Onboarding Guide */}
                            <div style={{ width: '100%', marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {language === 'ne' ? 'हाजिरी गर्ने सजिलो तरिका:' : 
                                     language === 'en' ? 'Easy Steps to Follow:' : 
                                     'हाजिरी गर्ने तरिका / How it works:'}
                                </h4>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                                    {/* Step 1 */}
                                    <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 14, border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: 24, display: 'flex', alignItems: 'center' }}>1️⃣</div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>
                                                {language === 'en' ? 'Tap Start Button' : 'स्क्यान सुरु गर्नुहोस्'}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                                {language === 'en' ? 'Tap the orange button to turn on the screen camera.' : 
                                                 'माथिको ठूलो सुन्तला बटन थिचेर क्यामेरा सुरु गर्नुहोस्।'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step 2 */}
                                    <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 14, border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: 24, display: 'flex', alignItems: 'center' }}>2️⃣</div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>
                                                {language === 'en' ? 'Look Straight & Hold Still' : 'क्यामेरामा सिधा हेर्नुहोस्'}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                                {language === 'en' ? 'Position your face in the center of the green ring.' : 
                                                 'आफ्नो अनुहार गोलो हरियो घेरा भित्र मिलाई सिधा हेर्नुहोस्।'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step 3 */}
                                    <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 14, border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: 24, display: 'flex', alignItems: 'center' }}>3️⃣</div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>
                                                {language === 'en' ? 'Wait for Green Message & Ring' : 'सफल सन्देशको प्रतिक्षा गर्नुहोस्'}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                                {language === 'en' ? 'The system rings a bell and automatically saves attendance.' : 
                                                 'सफल भएपछि घण्टी बज्नेछ र तपाईको हाजिरी दर्ता हुनेछ।'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loader/Models Loading */}
                    {kioskStatus === 'loading' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0', textAlign: 'center' }}>
                            <RefreshCw size={44} className="animate-spin" style={{ color: '#f97316' }} />
                            <div style={{ fontSize: 18, fontWeight: 800 }}>
                                {language === 'ne' ? 'प्रणाली तयार हुँदैछ...' : 'Initializing Face AI...'}
                            </div>
                            <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                {language === 'ne' ? 'पहिलो पटक चलाउँदा केही सेकेन्ड लाग्न सक्छ।' : 'Setting up biometric weights. Please wait a moment.'}
                            </div>
                        </div>
                    )}

                    {/* Active Camera Scan Box */}
                    {scanActive && (kioskStatus === 'scanning' || kioskStatus === 'matching') && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%' }}>
                            
                            {/* Glowing Camera Feed Circle */}
                            <div style={{
                                width: 280,
                                height: 280,
                                borderRadius: 140,
                                overflow: 'hidden',
                                position: 'relative',
                                border: `4px solid ${faceDetected ? '#10b981' : '#f97316'}`,
                                boxShadow: faceDetected ? '0 0 32px rgba(16,185,129,0.5)' : '0 0 32px rgba(249,115,22,0.3)',
                                background: '#000',
                                transition: 'border-color 0.3s'
                            }}>
                                <video
                                    ref={videoRef}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        transform: 'scaleX(-1)' // Mirror view for intuitive positioning
                                    }}
                                    muted
                                    playsInline
                                />
                                <canvas
                                    ref={canvasRef}
                                    width={640}
                                    height={480}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        transform: 'scaleX(-1)'
                                    }}
                                />

                                {/* Laser sweep scanner line */}
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    height: '4px',
                                    background: 'linear-gradient(to right, transparent, #ea580c, transparent)',
                                    boxShadow: '0 0 12px #ea580c',
                                    animation: 'scanner-sweep 3s infinite linear',
                                    zIndex: 2,
                                    pointerEvents: 'none'
                                }}></div>
                            </div>

                            {/* Tracking text instructions */}
                            <div style={{ textAlign: 'center', padding: '0 10px' }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: faceDetected ? '#10b981' : '#fff', transition: 'color 0.3s' }}>
                                    {kioskStatus === 'matching' ? (
                                        language === 'en' ? 'Matching identity...' : 'पहिचान मिलान गर्दै...'
                                    ) : faceDetected ? (
                                        language === 'en' ? 'Hold still! Verifying...' : 'स्थिर रहनुहोस्! प्रमाणीकरण हुँदैछ...'
                                    ) : (
                                        language === 'en' ? 'Look straight at the camera' : 'क्यामेरामा सिधा हेर्नुहोस्'
                                    )}
                                </div>
                                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, lineHeight: 1.4 }}>
                                    {faceDetected ? (
                                        language === 'en' ? 'Don\'t move. Checking database...' : 'हल्लाउनु नलगाउनुहोस्, जाँच भइरहेको छ...'
                                    ) : (
                                        language === 'en' ? 'Place your face inside the glowing circle' : 'आफ्नो अनुहारलाई उज्यालो गोलो घेरा भित्र राख्नुहोस्'
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={resetToStart}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#94a3b8',
                                    padding: '10px 24px',
                                    borderRadius: 12,
                                    fontSize: 14,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {language === 'ne' ? 'रद्द गर्नुहोस् (Cancel)' : language === 'en' ? 'Cancel' : 'रद्द गर्नुहोस् / Cancel'}
                            </button>
                        </div>
                    )}

                    {/* Success Verification Card */}
                    {kioskStatus === 'success' && checkInResult && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%', textAlign: 'center', padding: '10px 0' }}>
                            <div style={{
                                width: 100,
                                height: 100,
                                borderRadius: 50,
                                background: 'rgba(16,185,129,0.1)',
                                border: '2px solid #10b981',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#10b981',
                                animation: 'pulse 1.5s infinite'
                            }}>
                                <UserCheck size={48} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 15, color: '#10b981', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    {checkInResult.action === 'CHECK_IN' ? (
                                        language === 'en' ? '✅ Checked In Successfully' : '✅ हाजिर सफल भयो (Checked In)'
                                    ) : (
                                        language === 'en' ? '📤 Checked Out Successfully' : '📤 प्रस्थान सफल भयो (Checked Out)'
                                    )}
                                </div>
                                <h3 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#f8fafc' }}>{checkInResult.worker?.name}</h3>
                                <p style={{ margin: 0, fontSize: 14, color: '#94a3b8', fontWeight: 700 }}>
                                    {checkInResult.worker?.trade} • {checkInResult.worker?.worker_type}
                                </p>
                            </div>

                            <div style={{
                                width: '100%',
                                padding: '18px',
                                borderRadius: 18,
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                color: '#34d399',
                                fontSize: 16,
                                fontWeight: 800,
                                lineHeight: 1.4
                            }}>
                                {checkInResult.message}
                            </div>

                            <span style={{ fontSize: 12, color: '#64748b' }}>
                                {language === 'ne' ? '५ सेकेन्ड पछि आफै सुरुवाती स्क्रिनमा जानेछ...' : 'Returning to start screen in 5s...'}
                            </span>
                        </div>
                    )}

                    {/* Error / Recognition Failure Card */}
                    {kioskStatus === 'error' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%', textAlign: 'center', padding: '10px 0' }}>
                            <div style={{
                                width: 100,
                                height: 100,
                                borderRadius: 50,
                                background: 'rgba(239,68,68,0.1)',
                                border: '2px solid #ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ef4444'
                            }}>
                                <ShieldAlert size={48} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 15, color: '#ef4444', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    {language === 'en' ? 'Verification Failed' : 'पहिचान हुन सकेन (Failed)'}
                                </div>
                                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
                                    {language === 'en' ? 'Not Recognized' : 'अनुहार चिन्न सकिएन'}
                                </h3>
                                <p style={{ margin: 0, fontSize: 14, color: '#ef4444', lineHeight: 1.5, maxWidth: 320, alignSelf: 'center', fontWeight: 600 }}>
                                    {scanError}
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 10, width: '100%' }}>
                                <button
                                    onClick={startScanning}
                                    style={{
                                        flex: 1,
                                        padding: '14px 20px',
                                        borderRadius: 14,
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                                        color: '#fff',
                                        fontSize: 14,
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)'
                                    }}
                                >
                                    {language === 'en' ? 'Try Again' : 'पुनः प्रयास गर्नुहोस्'}
                                </button>
                                <button
                                    onClick={resetToStart}
                                    style={{
                                        padding: '14px 20px',
                                        borderRadius: 14,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.04)',
                                        color: '#fff',
                                        fontSize: 14,
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {language === 'en' ? 'Go Back' : 'पछाडि जानुहोस्'}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
            
            {/* Inline Scanner line animations */}
            <style>{`
                @keyframes scanner-sweep {
                    0% { top: 0%; }
                    50% { top: 98%; }
                    100% { top: 0%; }
                }
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
                    70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(249, 115, 22, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
                }
            `}</style>
        </KioskViewportShell>
    );
}
