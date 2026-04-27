/**
 * QRScannerTab
 * ─────────────────────────────────────────────────────────────────────────────
 * Camera-based QR scanner for attendance check-in / check-out.
 * Uses the browser's native BarcodeDetector API (Chrome 83+, Android Chrome).
 * Falls back to jsQR loaded dynamically for older browsers.
 *
 * No npm packages required beyond what's already installed.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import attendanceService from '../../services/attendanceService';

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadJsQR() {
    return new Promise((resolve, reject) => {
        if (window.jsQR) { resolve(window.jsQR); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
        s.onload = () => resolve(window.jsQR);
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

const STATUS_COLORS = {
    CHECK_IN:  { bg: 'rgba(16,185,129,0.12)', border: '#10b981', text: '#10b981', icon: '✅' },
    CHECK_OUT: { bg: 'rgba(59,130,246,0.12)',  border: '#3b82f6', text: '#3b82f6', icon: '🏁' },
    IGNORED:   { bg: 'rgba(245,158,11,0.12)',  border: '#f59e0b', text: '#f59e0b', icon: '⏳' },
    ERROR:     { bg: 'rgba(239,68,68,0.12)',   border: '#ef4444', text: '#ef4444', icon: '❌' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function QRScannerTab({ projectId }) {
    const videoRef  = useRef(null);
    const canvasRef = useRef(null);
    const rafRef    = useRef(null);
    const streamRef = useRef(null);
    const lastScanRef = useRef('');     // prevents duplicate scans of same code
    const cooldownRef = useRef(false);  // 3s cooldown between scans

    const [scanning,    setScanning]    = useState(false);
    const [result,      setResult]      = useState(null);   // last scan result
    const [error,       setError]       = useState('');
    const [cameraError, setCameraError] = useState('');
    const [scanLog,     setScanLog]     = useState([]);     // last 10 scans
    const [processing,  setProcessing]  = useState(false);
    const [detectorMode, setDetectorMode] = useState('');   // 'native' | 'jsqr'
    const [facingMode,  setFacingMode]  = useState('environment'); // back cam default

    // ── Start camera ─────────────────────────────────────────────────────────
    const startCamera = useCallback(async () => {
        setCameraError('');
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (e) {
            setCameraError(
                e.name === 'NotAllowedError'
                    ? 'Camera permission denied. Please allow camera access and try again.'
                    : `Camera error: ${e.message}`
            );
        }
    }, [facingMode]);

    // ── Stop camera ───────────────────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    // ── Handle a decoded QR string ────────────────────────────────────────────
    const handleQRData = useCallback(async (rawData) => {
        if (cooldownRef.current) return;
        if (rawData === lastScanRef.current) return;
        lastScanRef.current = rawData;
        cooldownRef.current = true;

        setProcessing(true);
        try {
            const res = await attendanceService.qrScan(rawData);
            const entry = {
                id:        Date.now(),
                action:    res.action,
                worker:    res.worker?.name || 'Unknown',
                trade:     res.worker?.trade || '',
                message:   res.message,
                time:      new Date().toLocaleTimeString(),
                checkIn:   res.attendance?.check_in,
                checkOut:  res.attendance?.check_out,
                overtimeH: res.attendance?.overtime_hours,
            };
            setResult(entry);
            setScanLog(prev => [entry, ...prev].slice(0, 15));
        } catch (e) {
            const msg = e?.response?.data?.error || 'Scan failed. Invalid or unknown QR code.';
            const entry = {
                id: Date.now(), action: 'ERROR',
                worker: '—', message: msg,
                time: new Date().toLocaleTimeString(),
            };
            setResult(entry);
            setScanLog(prev => [entry, ...prev].slice(0, 15));
        } finally {
            setProcessing(false);
            // Cooldown: 3s before next scan
            setTimeout(() => {
                cooldownRef.current  = false;
                lastScanRef.current  = '';
            }, 3000);
        }
    }, []);

    // ── Scan loop with native BarcodeDetector ─────────────────────────────────
    const startNativeScan = useCallback((detector) => {
        const tick = async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }
            try {
                const codes = await detector.detect(videoRef.current);
                if (codes.length > 0) {
                    await handleQRData(codes[0].rawValue);
                }
            } catch (_) { /* ignore detection errors */ }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    }, [handleQRData]);

    // ── Scan loop with jsQR (canvas) ──────────────────────────────────────────
    const startJsQRScan = useCallback((jsQR) => {
        const tick = () => {
            const video  = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState < 2) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (code) handleQRData(code.data);
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    }, [handleQRData]);

    // ── Start scanning ────────────────────────────────────────────────────────
    const startScanning = useCallback(async () => {
        setScanning(true);
        setResult(null);
        setError('');
        await startCamera();

        // Try native BarcodeDetector first
        if ('BarcodeDetector' in window) {
            const supported = await window.BarcodeDetector.getSupportedFormats();
            if (supported.includes('qr_code')) {
                const det = new window.BarcodeDetector({ formats: ['qr_code'] });
                setDetectorMode('native');
                // Wait for video to be ready
                const waitVideo = () => new Promise(res => {
                    const check = () => videoRef.current?.readyState >= 2 ? res() : setTimeout(check, 100);
                    check();
                });
                await waitVideo();
                startNativeScan(det);
                return;
            }
        }

        // Fallback: jsQR
        try {
            const jsQR = await loadJsQR();
            setDetectorMode('jsqr');
            startJsQRScan(jsQR);
        } catch (_) {
            setError('QR scanning not supported in this browser. Please use Chrome or Android Chrome.');
            setScanning(false);
        }
    }, [startCamera, startNativeScan, startJsQRScan]);

    const stopScanning = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        stopCamera();
        setScanning(false);
    }, [stopCamera]);

    const flipCamera = useCallback(() => {
        setFacingMode(f => f === 'environment' ? 'user' : 'environment');
    }, []);

    // Restart camera when facing mode changes
    useEffect(() => {
        if (scanning) startCamera();
    }, [facingMode, scanning, startCamera]);

    // Cleanup on unmount
    useEffect(() => () => stopCamera(), [stopCamera]);

    if (!projectId) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>
                Select a project first to use the QR scanner.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

            {/* ── Scanner Panel ── */}
            <div style={{ flex: '1 1 400px', minWidth: 300 }}>
                <div style={{
                    background: 'var(--t-bg)', borderRadius: 16,
                    border: '1px solid var(--t-border)', overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '16px 20px', borderBottom: '1px solid var(--t-border)',
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <span style={{ fontSize: 22 }}>📷</span>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--t-text)' }}>
                                QR Attendance Scanner
                            </h3>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)' }}>
                                {detectorMode === 'native' ? '⚡ Native BarcodeDetector'
                                 : detectorMode === 'jsqr' ? '📦 jsQR fallback'
                                 : 'Point camera at a worker QR badge'}
                            </p>
                        </div>
                        {scanning && (
                            <button onClick={flipCamera} title="Flip camera" style={{
                                padding: '6px 10px', borderRadius: 8, fontSize: 18,
                                border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                                cursor: 'pointer',
                            }}>🔄</button>
                        )}
                    </div>

                    {/* Viewfinder */}
                    <div style={{
                        position: 'relative', background: '#000',
                        aspectRatio: '4/3', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        minHeight: 260,
                    }}>
                        <video
                            ref={videoRef}
                            playsInline muted autoPlay
                            style={{
                                width: '100%', height: '100%', objectFit: 'cover',
                                display: scanning ? 'block' : 'none',
                            }}
                        />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        {/* Scanner overlay when active */}
                        {scanning && !cameraError && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                pointerEvents: 'none',
                            }}>
                                {/* Animated scan frame */}
                                <div style={{
                                    width: 220, height: 220, position: 'relative',
                                }}>
                                    {/* Corner markers */}
                                    {[
                                        { top: 0, left: 0, borderTop: '3px solid #f97316', borderLeft: '3px solid #f97316' },
                                        { top: 0, right: 0, borderTop: '3px solid #f97316', borderRight: '3px solid #f97316' },
                                        { bottom: 0, left: 0, borderBottom: '3px solid #f97316', borderLeft: '3px solid #f97316' },
                                        { bottom: 0, right: 0, borderBottom: '3px solid #f97316', borderRight: '3px solid #f97316' },
                                    ].map((s, i) => (
                                        <div key={i} style={{
                                            position: 'absolute', width: 24, height: 24,
                                            borderRadius: 2, ...s,
                                        }} />
                                    ))}
                                    {/* Scan line */}
                                    <div style={{
                                        position: 'absolute', left: 4, right: 4, height: 2,
                                        background: 'rgba(249,115,22,0.7)',
                                        top: processing ? '50%' : '10%',
                                        transition: 'top 1.5s ease-in-out',
                                        animation: 'scanline 2s ease-in-out infinite',
                                    }} />
                                </div>
                                {processing && (
                                    <div style={{
                                        position: 'absolute', bottom: 16,
                                        background: 'rgba(0,0,0,0.7)', color: '#fff',
                                        padding: '6px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                                    }}>
                                        Processing…
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Idle state */}
                        {!scanning && (
                            <div style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>
                                <div style={{ fontSize: 56, marginBottom: 12 }}>📷</div>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>
                                    Camera off
                                </p>
                                <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                                    Press Start to begin scanning
                                </p>
                            </div>
                        )}

                        {/* Camera error */}
                        {cameraError && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0.8)', color: '#ef4444',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: 20, textAlign: 'center', fontSize: 13,
                            }}>
                                {cameraError}
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div style={{ padding: '16px 20px', display: 'flex', gap: 10 }}>
                        {!scanning ? (
                            <button onClick={startScanning} style={{
                                flex: 1, padding: '12px', borderRadius: 12, fontWeight: 800, fontSize: 14,
                                background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer',
                            }}>
                                ▶ Start Scanner
                            </button>
                        ) : (
                            <button onClick={stopScanning} style={{
                                flex: 1, padding: '12px', borderRadius: 12, fontWeight: 800, fontSize: 14,
                                background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer',
                            }}>
                                ■ Stop Scanner
                            </button>
                        )}
                    </div>

                    {error && (
                        <div style={{ padding: '0 20px 16px', fontSize: 12, color: '#ef4444' }}>
                            {error}
                        </div>
                    )}
                </div>

                {/* Last scan result */}
                {result && (
                    <ScanResult result={result} />
                )}
            </div>

            {/* ── Scan Log Panel ── */}
            <div style={{ flex: '1 1 280px', minWidth: 260 }}>
                <div style={{
                    background: 'var(--t-bg)', borderRadius: 16,
                    border: '1px solid var(--t-border)', overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '14px 18px', borderBottom: '1px solid var(--t-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--t-text)' }}>
                            📋 Today's Scans
                        </h3>
                        {scanLog.length > 0 && (
                            <button onClick={() => setScanLog([])} style={{
                                padding: '3px 10px', borderRadius: 6, fontSize: 11,
                                border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                                color: 'var(--t-text3)', cursor: 'pointer',
                            }}>Clear</button>
                        )}
                    </div>
                    <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                        {scanLog.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--t-text3)', fontSize: 13 }}>
                                No scans yet.<br />
                                <span style={{ fontSize: 28, display: 'block', marginTop: 10 }}>🔍</span>
                            </div>
                        ) : (
                            scanLog.map(log => (
                                <ScanLogItem key={log.id} log={log} />
                            ))
                        )}
                    </div>
                </div>

                {/* Instructions */}
                <div style={{
                    marginTop: 14, padding: '14px 18px',
                    background: 'var(--t-surface)', borderRadius: 14,
                    border: '1px solid var(--t-border)',
                }}>
                    <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 12, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        How it works
                    </p>
                    {[
                        ['1️⃣', 'Start the scanner'],
                        ['2️⃣', '1st scan → Check In (records time)'],
                        ['3️⃣', '2nd scan → Check Out (records time + auto overtime)'],
                        ['🖨️', 'Print QR badges from the Workers tab'],
                    ].map(([icon, text]) => (
                        <div key={text} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 12, color: 'var(--t-text3)' }}>
                            <span>{icon}</span><span>{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes scanline {
                    0%   { top: 10%; }
                    50%  { top: 85%; }
                    100% { top: 10%; }
                }
            `}</style>
        </div>
    );
}

function ScanResult({ result }) {
    const style = STATUS_COLORS[result.action] || STATUS_COLORS.ERROR;
    return (
        <div style={{
            marginTop: 14, padding: '18px 20px', borderRadius: 14,
            background: style.bg, border: `2px solid ${style.border}`,
            animation: 'fadeIn 0.3s ease',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>{style.icon}</span>
                <div>
                    <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: style.text }}>
                        {result.worker}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)' }}>
                        {result.trade} · {result.time}
                    </p>
                </div>
            </div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: style.text }}>
                {result.message}
            </p>
            {(result.checkIn || result.checkOut) && (
                <div style={{
                    marginTop: 10, display: 'flex', gap: 12,
                    fontSize: 12, color: 'var(--t-text3)',
                }}>
                    {result.checkIn  && <span>🕐 In: <b>{result.checkIn}</b></span>}
                    {result.checkOut && <span>🕔 Out: <b>{result.checkOut}</b></span>}
                    {result.overtimeH > 0 && <span>⏱️ OT: <b>{result.overtimeH}h</b></span>}
                </div>
            )}
        </div>
    );
}

function ScanLogItem({ log }) {
    const style = STATUS_COLORS[log.action] || STATUS_COLORS.ERROR;
    return (
        <div style={{
            padding: '10px 18px', borderBottom: '1px solid var(--t-border)',
            display: 'flex', alignItems: 'center', gap: 10,
        }}>
            <span style={{ fontSize: 18 }}>{style.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.worker}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: style.text }}>
                    {log.action.replace('_', ' ')} · {log.time}
                </p>
            </div>
        </div>
    );
}
