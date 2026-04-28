/**
 * QRScannerTab — Japanese Kintai-style attendance scanner (English UI)
 *
 * Mobile  : Full-screen dark scanner, live clock, IN → REST → OUT flow,
 *           camera zoom fix (objectFit: contain + zoom reset)
 * Desktop : Two-column scanner + log
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import attendanceService from '../../services/attendanceService';

// ── Utilities ─────────────────────────────────────────────────────────────────
function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const fn = () => setM(window.innerWidth < 768);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);
    return m;
}

function useClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return time;
}

function loadJsQR() {
    return new Promise((resolve, reject) => {
        if (window.jsQR) { resolve(window.jsQR); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
        s.onload  = () => resolve(window.jsQR);
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

const pad2 = n => String(n).padStart(2, '0');
function fmtHMS(d) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; }
function fmtDate(d) {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return `${d.getFullYear()}/${pad2(d.getMonth()+1)}/${pad2(d.getDate())} (${days[d.getDay()]})`;
}

// ── Time window hook: polls window config every 60s ──────────────────────────
function useWindowStatus(projectId) {
    const [win, setWin] = useState(null);
    useEffect(() => {
        if (!projectId) return;
        const load = () => attendanceService.getTimeWindow(projectId)
            .then(d => setWin(d)).catch(() => {});
        load();
        const id = setInterval(load, 60000);
        return () => clearInterval(id);
    }, [projectId]);

    // Derive current state from window config + current time
    const now = new Date();
    const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

    if (!win || !win.is_active) return { active: false, win };

    const inCheckin  = win.checkin_start  <= hhmm && hhmm <= win.checkin_end;
    const inCheckout = win.checkout_start <= hhmm && hhmm <= win.checkout_end;
    const nextOpen   = !inCheckin && !inCheckout
        ? (hhmm < win.checkin_start ? win.checkin_start : hhmm < win.checkout_start ? win.checkout_start : null)
        : null;

    return { active: true, win, inCheckin, inCheckout, nextOpen, inAnyWindow: inCheckin || inCheckout };
}

// ── Window Status Bar ─────────────────────────────────────────────────────────
function WindowStatusBar({ projectId, dark = false }) {
    const ws = useWindowStatus(projectId);

    // Still loading (win is null and hasn't resolved yet) — show nothing
    if (ws.win === null) return null;

    let text, color, bgColor, dot;

    if (!ws.active) {
        // Time window DISABLED → free check-in / check-out at any time
        text    = 'OPEN — Check-in & Check-out available anytime';
        color   = '#10b981';
        dot     = '#10b981';
        bgColor = dark ? 'rgba(16,185,129,0.10)' : '#10b98110';
    } else if (ws.inCheckin) {
        text    = `CHECK-IN OPEN  ${ws.win.checkin_start}–${ws.win.checkin_end}`;
        color   = '#10b981';
        dot     = '#10b981';
        bgColor = dark ? 'rgba(16,185,129,0.14)' : '#10b98114';
    } else if (ws.inCheckout) {
        text    = `CHECK-OUT OPEN  ${ws.win.checkout_start}–${ws.win.checkout_end}`;
        color   = '#3b82f6';
        dot     = '#3b82f6';
        bgColor = dark ? 'rgba(59,130,246,0.14)' : '#3b82f614';
    } else {
        const next = ws.nextOpen ? `  ·  Next window: ${ws.nextOpen}` : '';
        text    = `SCANNER CLOSED${next}`;
        color   = '#ef4444';
        dot     = '#ef4444';
        bgColor = dark ? 'rgba(239,68,68,0.12)' : '#ef444412';
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: dark ? '5px 14px' : '5px 12px',
            background: bgColor,
            borderBottom: dark ? `1px solid ${color}20` : undefined,
            borderTop:    dark ? `1px solid ${color}20` : undefined,
            borderRadius: dark ? 0 : 8,
            margin: dark ? 0 : '0 0 10px',
        }}>
            {/* Pulsing dot */}
            <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: dot, flexShrink: 0,
                boxShadow: `0 0 ${ws.active && !ws.inAnyWindow ? '0' : `5px ${dot}`}`,
                animation: (!ws.active || ws.inAnyWindow) ? 'dot-pulse 2s ease-in-out infinite' : 'none',
            }} />
            <span style={{
                fontSize: 9, fontWeight: 800, color,
                letterSpacing: '0.13em', textTransform: 'uppercase',
            }}>
                {text}
            </span>
            {/* OFF badge when time control is disabled */}
            {!ws.active && (
                <span style={{
                    fontSize: 8, fontWeight: 900, color: '#10b981',
                    background: '#10b98120', borderRadius: 4,
                    padding: '1px 5px', letterSpacing: '0.1em',
                    border: '1px solid #10b98135',
                }}>
                    UNRESTRICTED
                </span>
            )}
        </div>
    );
}

// ── Action config (no Japanese) ───────────────────────────────────────────────
const ACTION_CFG = {
    CHECK_IN:  { bg:'#031a0e', border:'#10b981', text:'#10b981', label:'CHECK IN',   icon:'▶', dot:'#10b981' },
    REST_IN:   { bg:'#1a1200', border:'#f59e0b', text:'#f59e0b', label:'REST START', icon:'⏸', dot:'#f59e0b' },
    REST_OUT:  { bg:'#031a0e', border:'#10b981', text:'#10b981', label:'REST END',   icon:'▶', dot:'#10b981' },
    CHECK_OUT: { bg:'#030d1a', border:'#3b82f6', text:'#3b82f6', label:'CHECK OUT',  icon:'■', dot:'#3b82f6' },
    IGNORED:   { bg:'#1a1200', border:'#f59e0b', text:'#f59e0b', label:'TOO SOON',   icon:'⏳', dot:'#f59e0b' },
    ERROR:     { bg:'#1a0303', border:'#ef4444', text:'#ef4444', label:'ERROR',      icon:'✕', dot:'#ef4444' },
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function QRScannerTab({ projectId }) {
    const isMobile = useIsMobile();
    const now      = useClock();

    const videoRef    = useRef(null);
    const canvasRef   = useRef(null);
    const rafRef      = useRef(null);
    const streamRef   = useRef(null);
    const lastScanRef = useRef('');
    const cooldownRef = useRef(false);

    const [scanning,     setScanning]     = useState(false);
    const [result,       setResult]       = useState(null);
    const [resultAnim,   setResultAnim]   = useState(false);
    const [error,        setError]        = useState('');
    const [camErr,       setCamErr]       = useState('');
    const [scanLog,      setScanLog]      = useState([]);
    const [processing,   setProcessing]   = useState(false);
    const [detectorMode, setDetectorMode] = useState('');
    const [facingMode,   setFacingMode]   = useState('environment');
    const [logOpen,      setLogOpen]      = useState(false);
    const [liveCount,    setLiveCount]    = useState({ present: 0, total: 0 });

    // ── Live count ──
    useEffect(() => {
        if (!projectId) return;
        attendanceService.getLive?.(projectId)
            .then(d => setLiveCount({ present: d.present ?? 0, total: d.total ?? 0 }))
            .catch(() => {});
    }, [projectId, scanLog.length]);

    // ── Camera (zoom-safe) ──
    const startCamera = useCallback(async () => {
        setCamErr('');
        try {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            streamRef.current = stream;
            // Reset hardware zoom to minimum on supported devices
            stream.getVideoTracks().forEach(track => {
                try {
                    const caps = track.getCapabilities?.();
                    if (caps?.zoom) track.applyConstraints({ advanced: [{ zoom: caps.zoom.min }] });
                } catch (_) {}
            });
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
        } catch (e) {
            setCamErr(e.name === 'NotAllowedError'
                ? 'Camera permission denied. Please allow camera access.'
                : `Camera error: ${e.message}`);
        }
    }, [facingMode]);

    const stopCamera = useCallback(() => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    // ── QR decode handler ──
    const handleQRData = useCallback(async (rawData) => {
        if (cooldownRef.current || rawData === lastScanRef.current) return;
        lastScanRef.current = rawData;
        cooldownRef.current = true;
        setProcessing(true);
        try {
            const res = await attendanceService.qrScan(rawData);
            const entry = {
                id: Date.now(), action: res.action,
                worker: res.worker?.name || 'Unknown',
                trade:  res.worker?.trade || '',
                message: res.message,
                time: fmtHMS(new Date()),
                checkIn:  res.attendance?.check_in,
                checkOut: res.attendance?.check_out,
                overtimeH: res.attendance?.overtime_hours,
            };
            setResult(entry); setResultAnim(true);
            setScanLog(prev => [entry, ...prev].slice(0, 30));
        } catch (e) {
            const entry = {
                id: Date.now(), action: 'ERROR',
                worker: '—', message: e?.response?.data?.error || 'Invalid QR code.',
                time: fmtHMS(new Date()),
            };
            setResult(entry); setResultAnim(true);
            setScanLog(prev => [entry, ...prev].slice(0, 30));
        } finally {
            setProcessing(false);
            setTimeout(() => {
                cooldownRef.current = false; lastScanRef.current = '';
                setResultAnim(false); setResult(null);
            }, 4000);
        }
    }, []);

    // ── Scan loops ──
    const startNativeScan = useCallback((detector) => {
        const tick = async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
            try { const codes = await detector.detect(videoRef.current); if (codes.length) await handleQRData(codes[0].rawValue); } catch (_) {}
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    }, [handleQRData]);

    const startJsQRScan = useCallback((jsQR) => {
        const tick = () => {
            const video = videoRef.current, canvas = canvasRef.current;
            if (!video || !canvas || video.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (code) handleQRData(code.data);
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    }, [handleQRData]);

    const startScanning = useCallback(async () => {
        setScanning(true); setResult(null); setError('');
        await startCamera();
        if ('BarcodeDetector' in window) {
            const supported = await window.BarcodeDetector.getSupportedFormats().catch(() => []);
            if (supported.includes('qr_code')) {
                const det = new window.BarcodeDetector({ formats: ['qr_code'] });
                setDetectorMode('native');
                await new Promise(res => { const c = () => videoRef.current?.readyState >= 2 ? res() : setTimeout(c, 100); c(); });
                startNativeScan(det); return;
            }
        }
        try { const jsQR = await loadJsQR(); setDetectorMode('jsqr'); startJsQRScan(jsQR); }
        catch { setError('QR scanning not supported. Use Chrome or Android Chrome.'); setScanning(false); }
    }, [startCamera, startNativeScan, startJsQRScan]);

    const stopScanning = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        stopCamera(); setScanning(false);
    }, [stopCamera]);

    useEffect(() => { if (scanning) startCamera(); }, [facingMode]); // eslint-disable-line
    useEffect(() => () => { stopCamera(); if (rafRef.current) cancelAnimationFrame(rafRef.current); }, [stopCamera]);
    useEffect(() => { if (isMobile && projectId && !scanning) startScanning(); }, [isMobile, projectId]); // eslint-disable-line

    if (!projectId) return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, gap:14, color:'var(--t-text3)' }}>
            <div style={{ fontSize:48, opacity:0.4 }}>📷</div>
            <p style={{ fontSize:14, fontWeight:700, margin:0 }}>Select a project to use the QR scanner.</p>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // MOBILE — Japanese Kintai aesthetic, English labels
    // ═══════════════════════════════════════════════════════════════════════════
    if (isMobile) {
        const cfg = result ? (ACTION_CFG[result.action] || ACTION_CFG.ERROR) : null;

        return (
            <div style={{
                position: 'relative',
                background: '#050508',
                minHeight: 'calc(100vh - 130px)',
                overflow: 'hidden',
            }}>
                {/* ── Live clock overlay ───────────────────────────────────── */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
                    padding: '10px 16px 0',
                    background: 'linear-gradient(to bottom, rgba(5,5,8,0.92) 60%, transparent)',
                    pointerEvents: 'none',
                }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        {/* Clock */}
                        <div>
                            <div style={{
                                fontSize: 30, fontWeight: 900, color: '#fff',
                                letterSpacing: '0.04em', lineHeight: 1,
                                fontVariantNumeric: 'tabular-nums',
                            }}>
                                {fmtHMS(now)}
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3, fontWeight: 600, letterSpacing: '0.1em' }}>
                                {fmtDate(now)}
                            </div>
                        </div>
                        {/* Present count */}
                        <div style={{ textAlign:'right', paddingTop: 2 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:5, justifyContent:'flex-end' }}>
                                <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px #10b981' }} />
                                <span style={{ fontSize:14, fontWeight:900, color:'#10b981', fontVariantNumeric:'tabular-nums' }}>{liveCount.present}</span>
                                <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', fontWeight:600 }}>/ {liveCount.total}</span>
                            </div>
                            <div style={{ fontSize:8, color:'rgba(255,255,255,0.25)', letterSpacing:'0.14em', textAlign:'right', marginTop:2 }}>PRESENT ON SITE</div>
                        </div>
                    </div>
                </div>

                {/* ── Time window status strip ────────────────────────────── */}
                <div style={{ position: 'absolute', top: 80, left: 0, right: 0, zIndex: 31, pointerEvents: 'none' }}>
                    <WindowStatusBar projectId={projectId} dark />
                </div>

                {/* ── Camera — objectFit: contain = no crop/zoom ──────────── */}
                <video ref={videoRef} playsInline muted autoPlay
                    style={{
                        width: '100%',
                        height: 'calc(100vh - 130px)',
                        objectFit: 'contain',   /* ← KEY: was 'cover' which caused zoom */
                        display: scanning ? 'block' : 'none',
                        background: '#000',
                    }}
                />
                <canvas ref={canvasRef} style={{ display:'none' }} />

                {/* ── Idle / error screen ─────────────────────────────────── */}
                {!scanning && (
                    <div style={{
                        position:'absolute', inset:0,
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                        background:'#050508', padding:32, gap:24,
                    }}>
                        {camErr ? (
                            <div style={{ textAlign:'center' }}>
                                <div style={{ fontSize:40, marginBottom:12, opacity:0.6 }}>🚫</div>
                                <p style={{ color:'#ef4444', fontSize:13, fontWeight:700, lineHeight:1.6 }}>{camErr}</p>
                            </div>
                        ) : (
                            <>
                                {/* Minimal logo block */}
                                <div style={{ textAlign:'center' }}>
                                    <div style={{
                                        width:72, height:72, borderRadius:16,
                                        border:'1px solid rgba(249,115,22,0.3)',
                                        background:'rgba(249,115,22,0.06)',
                                        display:'flex', alignItems:'center', justifyContent:'center',
                                        fontSize:32, margin:'0 auto 16px',
                                    }}>📷</div>
                                    <div style={{ fontSize:16, fontWeight:900, color:'#fff', letterSpacing:'0.12em', textTransform:'uppercase' }}>Attendance Scanner</div>
                                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', letterSpacing:'0.18em', marginTop:4, textTransform:'uppercase' }}>QR Badge Required</div>
                                </div>

                                {/* Thin divider */}
                                <div style={{ width:40, height:1, background:'rgba(255,255,255,0.08)' }} />

                                {/* Status flow legend */}
                                <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:220 }}>
                                    {[
                                        { label:'CHECK IN',   sub:'1st scan of the day',   color:'#10b981', icon:'▶' },
                                        { label:'REST',       sub:'Start / end break',      color:'#f59e0b', icon:'⏸' },
                                        { label:'CHECK OUT',  sub:'Last scan of the day',   color:'#3b82f6', icon:'■' },
                                    ].map(s => (
                                        <div key={s.label} style={{ display:'flex', alignItems:'center', gap:12 }}>
                                            <div style={{
                                                width:28, height:28, borderRadius:6, flexShrink:0,
                                                background:`${s.color}12`, border:`1px solid ${s.color}30`,
                                                display:'flex', alignItems:'center', justifyContent:'center',
                                                fontSize:12, color:s.color,
                                            }}>{s.icon}</div>
                                            <div>
                                                <div style={{ fontSize:12, fontWeight:800, color:s.color, letterSpacing:'0.08em' }}>{s.label}</div>
                                                <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{s.sub}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        <button onClick={startScanning} style={{
                            marginTop:8, padding:'13px 48px', borderRadius:6,
                            background:'#f97316', color:'#fff', border:'none',
                            fontSize:13, fontWeight:900, cursor:'pointer',
                            letterSpacing:'0.14em', textTransform:'uppercase',
                            boxShadow:'0 4px 24px rgba(249,115,22,0.35)',
                        }}>
                            Start Scanner
                        </button>
                    </div>
                )}

                {/* ── Viewfinder frame overlay ─────────────────────────────── */}
                {scanning && !camErr && (
                    <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
                        {/* Vignette */}
                        <div style={{
                            position:'absolute', inset:0,
                            background:'radial-gradient(ellipse 60% 55% at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
                        }} />

                        {/* Scan frame — centred, not too large */}
                        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-56%)', width:190, height:190 }}>
                            {/* Corner marks */}
                            {[
                                { top:0,    left:0,   borderTop:'2px solid #f97316', borderLeft:'2px solid #f97316'  },
                                { top:0,    right:0,  borderTop:'2px solid #f97316', borderRight:'2px solid #f97316' },
                                { bottom:0, left:0,   borderBottom:'2px solid #f97316', borderLeft:'2px solid #f97316'  },
                                { bottom:0, right:0,  borderBottom:'2px solid #f97316', borderRight:'2px solid #f97316' },
                            ].map((s, i) => (
                                <div key={i} style={{ position:'absolute', width:24, height:24, ...s }} />
                            ))}
                            {/* Scan line */}
                            <div style={{
                                position:'absolute', left:4, right:4, height:1,
                                background:'linear-gradient(90deg, transparent, #f97316, transparent)',
                                boxShadow:'0 0 8px rgba(249,115,22,0.5)',
                                animation:'scanner-line 2.2s ease-in-out infinite',
                            }} />
                        </div>

                        {/* Status hint below frame */}
                        <div style={{
                            position:'absolute', top:'calc(50% + 60px)', left:0, right:0,
                            textAlign:'center', transform:'translateY(-56%)',
                        }}>
                            <div style={{
                                display:'inline-block', padding:'4px 14px', borderRadius:4,
                                background:'rgba(0,0,0,0.4)', backdropFilter:'blur(8px)',
                                fontSize:10, fontWeight:700, letterSpacing:'0.16em',
                                color: processing ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                                textTransform:'uppercase',
                            }}>
                                {processing ? '⏳ Processing…' : 'Align QR badge in frame'}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Result banner — slides from top ─────────────────────── */}
                {result && cfg && (
                    <div style={{
                        position:'absolute', top:0, left:0, right:0, zIndex:40,
                        background: cfg.bg,
                        borderBottom:`2px solid ${cfg.border}`,
                        backdropFilter:'blur(20px)',
                        padding:'56px 20px 16px',
                        animation: resultAnim ? 'slide-down 0.32s cubic-bezier(.16,1,.3,1)' : 'none',
                    }}>
                        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                            {/* Icon box */}
                            <div style={{
                                width:52, height:52, borderRadius:8, flexShrink:0,
                                background:`${cfg.border}15`, border:`1.5px solid ${cfg.border}`,
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:20, color:cfg.text, fontWeight:900,
                            }}>{cfg.icon}</div>

                            <div style={{ flex:1 }}>
                                <div style={{ fontSize:11, fontWeight:800, color:`${cfg.text}90`, letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:2 }}>{cfg.label}</div>
                                <div style={{ fontSize:18, fontWeight:900, color:'#fff', lineHeight:1 }}>{result.worker}</div>
                                <div style={{ display:'flex', gap:10, marginTop:4, fontSize:11, color:'rgba(255,255,255,0.45)', flexWrap:'wrap' }}>
                                    <span>{result.time}</span>
                                    {result.trade    && <span>· {result.trade}</span>}
                                    {result.checkIn  && <span>· In: {result.checkIn}</span>}
                                    {result.checkOut && <span>· Out: {result.checkOut}</span>}
                                    {result.overtimeH > 0 && <span style={{ color:'#f59e0b' }}>· OT: {result.overtimeH}h</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Bottom control bar ───────────────────────────────────── */}
                {scanning && (
                    <div style={{
                        position:'absolute', bottom:0, left:0, right:0, zIndex:30,
                        background:'linear-gradient(to top, rgba(5,5,8,0.95) 70%, transparent)',
                        padding:'32px 20px 20px',
                        display:'flex', justifyContent:'space-around', alignItems:'flex-end',
                    }}>
                        {/* Flip camera */}
                        <button onClick={() => setFacingMode(f => f==='environment'?'user':'environment')}
                            style={{
                                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                                background:'none', border:'none', cursor:'pointer', padding:8,
                            }}>
                            <div style={{ width:46, height:46, borderRadius:8, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🔄</div>
                            <span style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.12em', textTransform:'uppercase' }}>Flip</span>
                        </button>

                        {/* Stop — larger centre button */}
                        <button onClick={stopScanning}
                            style={{
                                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                                background:'none', border:'none', cursor:'pointer', padding:8,
                            }}>
                            <div style={{ width:58, height:58, borderRadius:10, background:'rgba(239,68,68,0.12)', border:'1.5px solid #ef4444', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, color:'#ef4444', fontWeight:900, fontSize:16 }}>
                                ■
                            </div>
                            <span style={{ fontSize:8, color:'rgba(239,68,68,0.6)', letterSpacing:'0.12em', textTransform:'uppercase' }}>Stop</span>
                        </button>

                        {/* Log */}
                        <button onClick={() => setLogOpen(v => !v)}
                            style={{
                                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                                background:'none', border:'none', cursor:'pointer', padding:8,
                                position:'relative',
                            }}>
                            <div style={{ width:46, height:46, borderRadius:8, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, position:'relative' }}>
                                📋
                                {scanLog.length > 0 && (
                                    <span style={{ position:'absolute', top:4, right:4, background:'#f97316', color:'#fff', borderRadius:4, padding:'1px 4px', fontSize:8, fontWeight:900, lineHeight:1 }}>{scanLog.length}</span>
                                )}
                            </div>
                            <span style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'0.12em', textTransform:'uppercase' }}>Log</span>
                        </button>
                    </div>
                )}

                {/* ── Scan log drawer ──────────────────────────────────────── */}
                {logOpen && (
                    <div style={{
                        position:'absolute', inset:0, zIndex:50,
                        background:'#06060a', overflowY:'auto',
                        animation:'slide-up 0.28s cubic-bezier(.16,1,.3,1)',
                    }}>
                        {/* Header */}
                        <div style={{
                            position:'sticky', top:0, zIndex:10,
                            background:'#0a0a10', borderBottom:'1px solid rgba(255,255,255,0.06)',
                            padding:'14px 16px',
                            display:'flex', alignItems:'center', justifyContent:'space-between',
                        }}>
                            <div>
                                <div style={{ fontWeight:900, fontSize:14, color:'#fff', letterSpacing:'0.1em', textTransform:'uppercase' }}>Scan Log</div>
                                <div style={{ fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:'0.14em', marginTop:2 }}>{scanLog.length} RECORDS TODAY</div>
                            </div>
                            <div style={{ display:'flex', gap:8 }}>
                                {scanLog.length > 0 && (
                                    <button onClick={() => setScanLog([])} style={{ padding:'5px 12px', borderRadius:4, fontSize:10, fontWeight:700, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'rgba(255,255,255,0.35)', cursor:'pointer', letterSpacing:'0.08em', textTransform:'uppercase' }}>Clear</button>
                                )}
                                <button onClick={() => setLogOpen(false)} style={{ width:32, height:32, borderRadius:4, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', cursor:'pointer', fontSize:16, color:'rgba(255,255,255,0.4)' }}>✕</button>
                            </div>
                        </div>

                        {/* Present count row */}
                        <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', gap:24 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981' }} />
                                <span style={{ fontSize:18, fontWeight:900, color:'#10b981', fontVariantNumeric:'tabular-nums' }}>{liveCount.present}</span>
                                <span style={{ fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Present</span>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <span style={{ fontSize:18, fontWeight:900, color:'rgba(255,255,255,0.5)', fontVariantNumeric:'tabular-nums' }}>{liveCount.total}</span>
                                <span style={{ fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Total Workers</span>
                            </div>
                        </div>

                        {scanLog.length === 0 ? (
                            <div style={{ padding:'60px 20px', textAlign:'center' }}>
                                <div style={{ fontSize:28, opacity:0.15, marginBottom:12 }}>🔍</div>
                                <div style={{ fontSize:11, color:'rgba(255,255,255,0.18)', letterSpacing:'0.12em', textTransform:'uppercase' }}>No records yet</div>
                            </div>
                        ) : scanLog.map((log, idx) => {
                            const s = ACTION_CFG[log.action] || ACTION_CFG.ERROR;
                            return (
                                <div key={log.id} style={{
                                    display:'flex', alignItems:'center', gap:14,
                                    padding:'13px 16px',
                                    borderBottom:'1px solid rgba(255,255,255,0.03)',
                                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                                }}>
                                    {/* Status dot + label */}
                                    <div style={{ flexShrink:0, width:52, textAlign:'center' }}>
                                        <div style={{ width:8, height:8, borderRadius:'50%', background:s.dot, margin:'0 auto 4px', boxShadow:`0 0 6px ${s.dot}` }} />
                                        <div style={{ fontSize:7, fontWeight:900, color:s.text, letterSpacing:'0.1em', textTransform:'uppercase' }}>{s.label}</div>
                                    </div>
                                    <div style={{ flex:1, minWidth:0 }}>
                                        <div style={{ fontWeight:800, fontSize:14, color:'#fff', letterSpacing:'0.02em' }}>{log.worker}</div>
                                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:2 }}>
                                            {log.time}{log.trade ? `  ·  ${log.trade}` : ''}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Animations */}
                <style>{`
                    @keyframes scanner-line {
                        0%   { top: 5%;  opacity: 0.2; }
                        10%  { opacity: 1; }
                        50%  { top: 90%; opacity: 1; }
                        90%  { opacity: 1; }
                        100% { top: 5%;  opacity: 0.2; }
                    }
                    @keyframes slide-down {
                        from { transform: translateY(-100%); opacity: 0; }
                        to   { transform: translateY(0);     opacity: 1; }
                    }
                    @keyframes slide-up {
                        from { transform: translateY(50px); opacity: 0; }
                        to   { transform: translateY(0);    opacity: 1; }
                    }
                    @keyframes dot-pulse {
                        0%, 100% { opacity: 1;   transform: scale(1); }
                        50%      { opacity: 0.4; transform: scale(0.7); }
                    }
                `}</style>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DESKTOP — clean two-column layout
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>

            {/* ── Scanner panel ── */}
            <div style={{ flex:'1 1 400px', minWidth:300 }}>
                <div style={{ background:'var(--t-bg)', borderRadius:16, border:'1px solid var(--t-border)', overflow:'hidden' }}>
                    {/* Panel header */}
                    <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--t-border)', display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:20 }}>📷</span>
                        <div style={{ flex:1 }}>
                            <h3 style={{ margin:0, fontSize:14, fontWeight:900, color:'var(--t-text)', letterSpacing:'0.06em', textTransform:'uppercase' }}>Attendance Scanner</h3>
                            <p style={{ margin:0, fontSize:10, color:'var(--t-text3)', letterSpacing:'0.1em' }}>
                                {detectorMode === 'native' ? '⚡ Native BarcodeDetector' : detectorMode === 'jsqr' ? '📦 jsQR fallback' : 'Point camera at a worker QR badge'}
                            </p>
                        </div>
                        {scanning && (
                            <button onClick={() => setFacingMode(f => f==='environment'?'user':'environment')}
                                style={{ padding:'6px 10px', borderRadius:6, fontSize:16, border:'1px solid var(--t-border)', background:'var(--t-surface)', cursor:'pointer' }}>🔄</button>
                        )}
                    </div>

                    {/* Camera viewport */}
                    <div style={{ position:'relative', background:'#000', aspectRatio:'4/3', display:'flex', alignItems:'center', justifyContent:'center', minHeight:260 }}>
                        <video ref={videoRef} playsInline muted autoPlay
                            style={{ width:'100%', height:'100%', objectFit:'contain', display:scanning?'block':'none' }} />
                        <canvas ref={canvasRef} style={{ display:'none' }} />

                        {scanning && !camErr && (
                            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                                <div style={{ width:200, height:200, position:'relative' }}>
                                    {[
                                        { top:0,    left:0,  borderTop:'2px solid #f97316', borderLeft:'2px solid #f97316'  },
                                        { top:0,    right:0, borderTop:'2px solid #f97316', borderRight:'2px solid #f97316' },
                                        { bottom:0, left:0,  borderBottom:'2px solid #f97316', borderLeft:'2px solid #f97316'  },
                                        { bottom:0, right:0, borderBottom:'2px solid #f97316', borderRight:'2px solid #f97316' },
                                    ].map((s, i) => <div key={i} style={{ position:'absolute', width:22, height:22, ...s }} />)}
                                    <div style={{ position:'absolute', left:4, right:4, height:1, background:'rgba(249,115,22,0.7)', animation:'scanner-line 2.2s ease-in-out infinite' }} />
                                </div>
                                {processing && (
                                    <div style={{ position:'absolute', bottom:14, background:'rgba(0,0,0,0.75)', color:'#fff', padding:'5px 16px', borderRadius:4, fontSize:11, fontWeight:700, letterSpacing:'0.1em' }}>
                                        PROCESSING…
                                    </div>
                                )}
                            </div>
                        )}

                        {!scanning && (
                            <div style={{ textAlign:'center', color:'#555', padding:24 }}>
                                <div style={{ fontSize:44, marginBottom:12, opacity:0.3 }}>📷</div>
                                <p style={{ margin:0, fontWeight:700, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase' }}>Scanner Offline</p>
                                <p style={{ margin:'4px 0 0', fontSize:11, color:'#444' }}>Press Start to begin</p>
                            </div>
                        )}
                        {camErr && (
                            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.88)', color:'#ef4444', display:'flex', alignItems:'center', justifyContent:'center', padding:20, textAlign:'center', fontSize:12, fontWeight:700 }}>{camErr}</div>
                        )}
                    </div>

                    {/* Start / stop */}
                    <div style={{ padding:'14px 18px', display:'flex', gap:8 }}>
                        {!scanning
                            ? <button onClick={startScanning} style={{ flex:1, padding:'11px', borderRadius:8, fontWeight:900, fontSize:13, background:'#f97316', color:'#fff', border:'none', cursor:'pointer', letterSpacing:'0.1em', textTransform:'uppercase' }}>▶ Start Scanner</button>
                            : <button onClick={stopScanning}  style={{ flex:1, padding:'11px', borderRadius:8, fontWeight:900, fontSize:13, background:'#ef4444', color:'#fff', border:'none', cursor:'pointer', letterSpacing:'0.1em', textTransform:'uppercase' }}>■ Stop Scanner</button>
                        }
                    </div>
                    {error && <div style={{ padding:'0 18px 14px', fontSize:11, color:'#ef4444', fontWeight:700 }}>{error}</div>}
                </div>

                {/* Last result card */}
                {result && (() => {
                    const s = ACTION_CFG[result.action] || ACTION_CFG.ERROR;
                    return (
                        <div style={{ marginTop:12, padding:'16px 18px', borderRadius:12, background:s.bg, border:`1.5px solid ${s.border}`, animation:'slide-down 0.3s ease' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                                <div style={{ width:40, height:40, borderRadius:8, background:`${s.border}15`, border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:s.text }}>{s.icon}</div>
                                <div>
                                    <div style={{ fontSize:9, fontWeight:900, color:`${s.text}80`, letterSpacing:'0.18em', textTransform:'uppercase' }}>{s.label}</div>
                                    <div style={{ fontSize:15, fontWeight:900, color:'var(--t-text)' }}>{result.worker}</div>
                                    <div style={{ fontSize:11, color:'var(--t-text3)' }}>{result.trade}  ·  {result.time}</div>
                                </div>
                            </div>
                            {(result.checkIn || result.checkOut) && (
                                <div style={{ display:'flex', gap:14, fontSize:11, color:'var(--t-text3)' }}>
                                    {result.checkIn  && <span>🕐 In: <b style={{ color:'var(--t-text)' }}>{result.checkIn}</b></span>}
                                    {result.checkOut && <span>🕔 Out: <b style={{ color:'var(--t-text)' }}>{result.checkOut}</b></span>}
                                    {result.overtimeH > 0 && <span style={{ color:'#f59e0b' }}>⏱ OT: <b>{result.overtimeH}h</b></span>}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* ── Log panel ── */}
            <div style={{ flex:'1 1 280px', minWidth:260, display:'flex', flexDirection:'column', gap:12 }}>

                {/* Live count strip */}
                <div style={{ borderRadius:12, background:'var(--t-surface)', border:'1px solid var(--t-border)', overflow:'hidden' }}>
                    <div style={{ padding:'12px 16px', display:'flex', gap:20 }}>
                        <div>
                            <div style={{ fontSize:22, fontWeight:900, color:'#10b981', fontVariantNumeric:'tabular-nums' }}>{liveCount.present}</div>
                            <div style={{ fontSize:9, color:'var(--t-text3)', letterSpacing:'0.12em', textTransform:'uppercase' }}>Present</div>
                        </div>
                        <div style={{ width:1, background:'var(--t-border)' }} />
                        <div>
                            <div style={{ fontSize:22, fontWeight:900, color:'var(--t-text)', fontVariantNumeric:'tabular-nums' }}>{liveCount.total}</div>
                            <div style={{ fontSize:9, color:'var(--t-text3)', letterSpacing:'0.12em', textTransform:'uppercase' }}>Total Workers</div>
                        </div>
                        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center' }}>
                            <div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px #10b981' }} />
                        </div>
                    </div>
                    <WindowStatusBar projectId={projectId} />
                </div>

                {/* Scan log */}
                <div style={{ background:'var(--t-bg)', borderRadius:14, border:'1px solid var(--t-border)', overflow:'hidden', flex:1 }}>
                    <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--t-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div>
                            <h3 style={{ margin:0, fontSize:12, fontWeight:900, color:'var(--t-text)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Today's Log</h3>
                            <p style={{ margin:0, fontSize:9, color:'var(--t-text3)', letterSpacing:'0.1em' }}>{scanLog.length} records</p>
                        </div>
                        {scanLog.length > 0 && (
                            <button onClick={() => setScanLog([])} style={{ padding:'3px 10px', borderRadius:4, fontSize:10, border:'1px solid var(--t-border)', background:'var(--t-surface)', color:'var(--t-text3)', cursor:'pointer', letterSpacing:'0.06em', textTransform:'uppercase' }}>Clear</button>
                        )}
                    </div>
                    <div style={{ maxHeight:420, overflowY:'auto' }}>
                        {scanLog.length === 0
                            ? <div style={{ padding:32, textAlign:'center', color:'var(--t-text3)', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase' }}>No scans yet<br /><span style={{ fontSize:24, display:'block', marginTop:10, opacity:0.2 }}>🔍</span></div>
                            : scanLog.map((log, idx) => {
                                const s = ACTION_CFG[log.action] || ACTION_CFG.ERROR;
                                return (
                                    <div key={log.id} style={{ padding:'10px 16px', borderBottom:'1px solid var(--t-border)', display:'flex', alignItems:'center', gap:10, background: idx%2===0?'transparent':'rgba(0,0,0,0.015)' }}>
                                        <div style={{ width:6, height:6, borderRadius:'50%', background:s.dot, flexShrink:0 }} />
                                        <div style={{ flex:1, minWidth:0 }}>
                                            <p style={{ margin:0, fontWeight:700, fontSize:13, color:'var(--t-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.worker}</p>
                                            <p style={{ margin:0, fontSize:9, color:s.text, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase' }}>{s.label}  ·  {log.time}</p>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Flow guide */}
                <div style={{ padding:'14px 16px', background:'var(--t-surface)', borderRadius:12, border:'1px solid var(--t-border)' }}>
                    <p style={{ margin:'0 0 10px', fontWeight:900, fontSize:9, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.14em' }}>Attendance Flow</p>
                    {[
                        { icon:'▶', label:'CHECK IN',  sub:'1st scan — arrival',        color:'#10b981' },
                        { icon:'⏸', label:'REST',      sub:'Start / end break',          color:'#f59e0b' },
                        { icon:'■', label:'CHECK OUT', sub:'Last scan — departure + OT', color:'#3b82f6' },
                    ].map(s => (
                        <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                            <div style={{ width:22, height:22, borderRadius:4, background:`${s.color}12`, border:`1px solid ${s.color}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:s.color, flexShrink:0 }}>{s.icon}</div>
                            <div>
                                <span style={{ fontSize:11, fontWeight:800, color:s.color, letterSpacing:'0.08em' }}>{s.label}</span>
                                <span style={{ fontSize:10, color:'var(--t-text3)', marginLeft:6 }}>{s.sub}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes scanner-line {
                    0%   { top: 5%;  opacity: 0.2; }
                    10%  { opacity: 1; }
                    50%  { top: 90%; opacity: 1; }
                    90%  { opacity: 1; }
                    100% { top: 5%;  opacity: 0.2; }
                }
                @keyframes slide-down {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes dot-pulse {
                    0%, 100% { opacity: 1;   transform: scale(1); }
                    50%      { opacity: 0.4; transform: scale(0.7); }
                }
            `}</style>
        </div>
    );
}
