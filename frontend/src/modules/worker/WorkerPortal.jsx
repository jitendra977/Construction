import React, { useState, useEffect, useRef } from 'react';
import workerPortalApi from '../../services/workerPortalApi';

// ── CSS Injection ─────────────────────────────────────────────────────────────
const portalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

.worker-portal {
    font-family: 'Outfit', sans-serif;
    -webkit-font-smoothing: antialiased;
}

.wp-glass {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.wp-glass-intense {
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.15);
}

.wp-btn {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.wp-btn:active {
    transform: scale(0.96);
}

.wp-animate-fade {
    animation: wpFade 0.4s ease-out forwards;
}

.wp-animate-slide {
    animation: wpSlide 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

@keyframes wpFade {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes wpSlide {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes wp-pulse-blue {
    0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.4); }
    70% { box-shadow: 0 0 0 15px rgba(56, 189, 248, 0); }
    100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
`;

const ATTEND_COLOR = {
    PRESENT: '#10b981',
    HALF_DAY: '#f59e0b',
    ABSENT: '#ef4444',
    LEAVE: '#6366f1',
    HOLIDAY: '#3b82f6',
    NOT_MARKED: '#475569',
};

const ATTEND_ICON = {
    PRESENT: '✅',
    HALF_DAY: '🌓',
    ABSENT: '❌',
    LEAVE: '🏠',
    HOLIDAY: '🎡',
    NOT_MARKED: '⏳',
};

// ── Utility ──────────────────────────────────────────────────────────────────
function feedback() {
    if (navigator.vibrate) navigator.vibrate(100);
}

function fmt(timeStr) {
    if (!timeStr) return '-';
    try {
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${m} ${ampm}`;
    } catch (e) { return timeStr; }
}

function npr(val) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', minimumFractionDigits: 0 }).format(val || 0);
}

// ── QR Scanner Hook ───────────────────────────────────────────────────────────
function useQRScanner(onDetected, active) {
    const videoRef = useRef(null);
    const rafRef   = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (!active) return;

        let jsQR = null;
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
        script.onload = () => {
            jsQR = window.jsQR;
            startCamera();
        };
        document.head.appendChild(script);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                    scan();
                }
            } catch (e) {
                console.error('Camera error', e);
            }
        };

        const scan = () => {
            if (!videoRef.current || !jsQR) return;
            const video = videoRef.current;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.height = video.videoHeight;
                canvas.width  = video.videoWidth;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code && code.data) {
                    onDetected(code.data);
                    return;
                }
            }
            rafRef.current = requestAnimationFrame(scan);
        };

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (document.head.contains(script)) document.head.removeChild(script);
        };
    }, [active]);

    return videoRef;
}

// ── QR Scan Check-in Component ────────────────────────────────────────────────
function QRScanCheckin({ onSuccess, muted }) {
    const [scanning, setScanning] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [processing, setProcessing] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const rafRef = useRef(null);

    const startScan = async () => {
        setScanning(true);
        setStatusMsg('Point camera at YOUR QR badge');

        if (!window.jsQR) {
            await new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
                s.onload = resolve;
                document.head.appendChild(s);
            });
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                scanLoop();
            }
        } catch (e) {
            setStatusMsg('⚠️ Camera access denied.');
        }
    };

    const stopScan = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setScanning(false);
        setStatusMsg('');
    };

    const scanLoop = () => {
        const video = videoRef.current;
        if (!video || !window.jsQR || processing) return;
        
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            // Use a persistent canvas for performance
            if (!window._scanCanvas) window._scanCanvas = document.createElement('canvas');
            const canvas = window._scanCanvas;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = window.jsQR(img.data, img.width, img.height);
            if (code && code.data) {
                console.log("QR Detected:", code.data);
                handleDetected(code.data);
                return;
            }
        }
        rafRef.current = requestAnimationFrame(scanLoop);
    };

    const handleDetected = async (qrData) => {
        if (processing) return;
        setProcessing(true);
        feedback();
        console.log("QR SCANNED ->", qrData);
        setStatusMsg('QR detected! Verifying…');
        
        try {
            const res = await workerPortalApi.qrCheckin(qrData);
            console.log("Check-in success:", res);
            setStatusMsg('✅ ' + res.message);
            setTimeout(() => {
                stopScan();
                onSuccess(res);
            }, 800);
        } catch (e) {
            console.error("Check-in error:", e?.response?.data || e);
            const errMsg = e?.response?.data?.error || 'Scan failed.';
            setStatusMsg('❌ ' + errMsg);
            
            setTimeout(() => {
                setProcessing(false);
                if (videoRef.current) {
                    setStatusMsg('Point camera at YOUR QR badge');
                    scanLoop();
                }
            }, 3000);
        }
    };

    useEffect(() => () => stopScan(), []);

    return (
        <div style={{ marginBottom: 20 }}>
            {!scanning ? (
                <button className="wp-btn" onClick={startScan} style={{
                    width: '100%', padding: '24px', borderRadius: 24, border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#fff', fontWeight: 900, fontSize: 18, cursor: 'pointer',
                    boxShadow: '0 15px 30px -10px rgba(37,99,235,0.5)',
                    animation: 'wp-pulse-blue 3s infinite',
                }}>
                    📷 SCAN QR TO CHECK IN/OUT
                </button>
            ) : (
                <div className="wp-animate-slide">
                    <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#000', aspectRatio: '1', boxShadow: '0 0 0 2px #38bdf8' }}>
                        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
                        {/* Scan overlay with pulsing center */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '70%', height: '70%', border: '2px solid rgba(56, 189, 248, 0.5)', borderRadius: 24, position: 'relative' }}>
                                <div style={{ position: 'absolute', inset: 0, border: '2px solid #38bdf8', borderRadius: 24, animation: 'wp-pulse-blue 2s infinite' }}></div>
                            </div>
                        </div>
                        {processing && <div style={{ position: 'absolute', inset: 0, background: 'rgba(56,189,248,0.2)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}>VERIFYING...</div>}
                    </div>
                    <div className="wp-glass" style={{ marginTop: 12, borderRadius: 16, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{statusMsg}</span>
                        <button className="wp-btn" onClick={stopScan} style={{ background: 'transparent', border: 'none', color: '#fb7185', fontWeight: 800, fontSize: 13 }}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
    const [loginMode, setLoginMode] = useState('pin'); 
    const [phone, setPhone]     = useState('');
    const [pin, setPin]         = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');
    const [scanMsg, setScanMsg] = useState('Scan your QR Badge');

    const handlePinLogin = async (e) => {
        e.preventDefault();
        if (!phone || !pin) return setError('Enter credentials');
        setLoading(true); setError('');
        try {
            const data = await workerPortalApi.login(phone, pin);
            onLogin(data.worker);
        } catch (err) { setError('Invalid phone or PIN'); }
        finally { setLoading(false); }
    };

    const handleQRLogin = async (qrData) => {
        if (loading) return;
        setLoading(true);
        feedback();
        console.log("QR LOGIN SCAN ->", qrData);
        setScanMsg('Authenticating…');
        try {
            const data = await workerPortalApi.qrLogin(qrData);
            console.log("Login success:", data);
            onLogin(data.worker);
        } catch (err) {
            console.error("Login error:", err?.response?.data || err);
            setScanMsg('❌ ' + (err?.response?.data?.error || 'Invalid QR Code'));
            setLoading(false);
            setTimeout(() => setScanMsg('Scan your QR Badge'), 2500);
        }
    };

    const videoRef = useQRScanner(handleQRLogin, loginMode === 'qr' && !loading);

    const inputStyle = { width: '100%', padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 16, outline: 'none', marginBottom: 16 };

    return (
        <div className="worker-portal wp-animate-fade" style={{ minHeight: '100dvh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <style>{portalStyles}</style>
            <div style={{ width: '100%', maxWidth: 400 }}>
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>🏗️</div>
                    <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: 0 }}>Worker Portal</h1>
                    <p style={{ color: '#94a3b8', margin: '8px 0' }}>Secure Workforce Access</p>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'rgba(255,255,255,0.05)', padding: 6, borderRadius: 16 }}>
                    <button onClick={() => setLoginMode('pin')} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: loginMode === 'pin' ? '#38bdf8' : 'transparent', color: loginMode === 'pin' ? '#0f172a' : '#94a3b8', fontWeight: 800, cursor: 'pointer' }}>🔑 PIN</button>
                    <button onClick={() => setLoginMode('qr')} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: loginMode === 'qr' ? '#38bdf8' : 'transparent', color: loginMode === 'qr' ? '#0f172a' : '#94a3b8', fontWeight: 800, cursor: 'pointer' }}>📷 QR</button>
                </div>

                {loginMode === 'pin' ? (
                    <form className="wp-glass-intense" onSubmit={handlePinLogin} style={{ padding: 32, borderRadius: 24 }}>
                        <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,''))} style={inputStyle} />
                        <input type="password" placeholder="6-digit PIN" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,''))} style={{ ...inputStyle, letterSpacing: '0.4em' }} />
                        {error && <div style={{ color: '#fb7185', textAlign: 'center', marginBottom: 16, fontSize: 14 }}>{error}</div>}
                        <button type="submit" disabled={loading} className="wp-btn" style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', background: '#38bdf8', color: '#0f172a', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>{loading ? 'Entering…' : 'Sign In'}</button>
                    </form>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', background: '#000', aspectRatio: '1', marginBottom: 16, boxShadow: '0 0 0 2px #38bdf8' }}>
                            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '70%', height: '70%', border: '2px solid rgba(56, 189, 248, 0.5)', borderRadius: 24, position: 'relative' }}>
                                    <div style={{ position: 'absolute', inset: 0, border: '2px solid #38bdf8', borderRadius: 24, animation: 'wp-pulse-blue 2s infinite' }}></div>
                                </div>
                            </div>
                        </div>
                        <div style={{ color: '#fff', fontWeight: 700 }}>{scanMsg}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Badge Screen ──────────────────────────────────────────────────────────────
function BadgeScreen({ user }) {
    const [qrData, setQrData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        workerPortalApi.getMyQR().then(setQrData).finally(() => setLoading(false));
    }, []);

    const handleDownload = () => {
        if (!qrData?.qr_image) return;
        const link = document.createElement('a');
        link.href = qrData.qr_image;
        link.download = `Badge_${user.full_name.replace(/\s/g,'_')}.png`;
        link.click();
    };

    const handlePrint = () => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html>
                <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
                    <div style="border:2px solid #000; padding:40px; border-radius:20px; text-align:center;">
                        <h2>${user.full_name}</h2>
                        <img src="${qrData.qr_image}" style="width:300px; height:300px;" />
                        <p>Worker Badge - Construction Management</p>
                    </div>
                    <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
                </body>
            </html>
        `);
    };

    if (loading) return <div style={{ color: '#94a3b8' }}>Loading badge…</div>;

    return (
        <div className="wp-glass" style={{ padding: 32, borderRadius: 32, textAlign: 'center' }}>
            <div style={{ background: '#fff', padding: 20, borderRadius: 24, display: 'inline-block', marginBottom: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                <img src={qrData?.qr_image} alt="QR Badge" style={{ width: 240, height: 240, display: 'block' }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>{user.full_name}</div>
            <div style={{ fontSize: 14, color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 32 }}>Official Site Badge</div>
            
            <div style={{ display: 'flex', gap: 12 }}>
                <button className="wp-btn" onClick={handleDownload} style={{ flex: 1, padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 800, fontSize: 14, border: '1px solid rgba(255,255,255,0.1)' }}>💾 Download</button>
                <button className="wp-btn" onClick={handlePrint} style={{ flex: 1, padding: 16, borderRadius: 16, border: 'none', background: '#38bdf8', color: '#0f172a', fontWeight: 800, fontSize: 14 }}>🖨️ Print Badge</button>
            </div>
            <p style={{ marginTop: 24, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>Show this QR code to your supervisor or scan it at the site kiosk to record your attendance.</p>
        </div>
    );
}

// ── Attendance Log Item ──────────────────────────────────────────────────────
function AttendanceLogItem({ log }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="wp-glass" style={{ padding: 16, borderRadius: 18, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{new Date(log.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{fmt(log.check_in)} - {fmt(log.check_out)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: ATTEND_COLOR[log.status], textTransform: 'uppercase' }}>{log.status}</div>
                    <div style={{ fontSize: 10, color: '#38bdf8', marginTop: 2, fontWeight: 700 }}>{expanded ? '▲ Hide Log' : '▼ Show Full Log'}</div>
                </div>
            </div>
            {expanded && (
                <div className="wp-animate-fade" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {log.logs?.map((evt, j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, padding: '4px 0' }}>
                            <div style={{ color: '#cbd5e1' }}>
                                <span style={{ fontWeight: 800, color: '#38bdf8' }}>{evt.time}</span>
                                <span style={{ margin: '0 8px', color: '#475569' }}>|</span>
                                <span>{evt.type}</span>
                            </div>
                            <div style={{ fontWeight: 700, color: evt.status === 'VALID' ? '#10b981' : '#fb7185' }}>{evt.status}</div>
                        </div>
                    ))}
                    {log.logs?.length === 0 && <div style={{ fontSize: 11, color: '#475569' }}>No scan events recorded (Manual entry).</div>}
                </div>
            )}
        </div>
    );
}

// ── Main Portal ───────────────────────────────────────────────────────────────
export default function WorkerPortal() {
    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem('worker_user');
        if (!raw || raw === 'undefined') return null;
        try { return JSON.parse(raw); } catch { return null; }
    });
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('home'); // home, logs, payroll, team
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [message, setMessage] = useState('');

    const load = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await workerPortalApi.getMe(selectedMonth);
            setProfile(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [user, selectedMonth]);

    const handleLogout = () => {
        workerPortalApi.logout();
        setUser(null);
    };

    if (!user) return <LoginScreen onLogin={setUser} />;

    const today = profile?.today || {};
    const checkedOut = !!today.check_out;
    const checkedIn = !!today.check_in && !today.check_out;

    return (
        <div className="worker-portal wp-animate-fade" style={{ minHeight: '100dvh', background: '#020617', color: '#f8fafc' }}>
            <style>{portalStyles}</style>
            
            {/* Nav Header */}
            <div className="wp-glass" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
                <div>
                    <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{user.full_name}</div>
                </div>
                <button onClick={handleLogout} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12, fontWeight: 700 }}>Logout</button>
            </div>

            {/* Tabs */}
            <div className="wp-glass" style={{ display: 'flex', marginBottom: 20 }}>
                {[['home','🏠'], ['logs','📝 Logs'], ['payroll','💰 Pay'], ['badge', '🆔 Badge'], ['team','👥 Team']].map(([id, label]) => (
                    (id !== 'team' || profile?.teams?.length > 0) && (
                        <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: '16px 0', border: 'none', background: 'transparent', color: tab === id ? '#38bdf8' : '#94a3b8', fontSize: 11, fontWeight: 800, borderBottom: tab === id ? '3px solid #38bdf8' : '3px solid transparent', cursor: 'pointer' }}>{label}</button>
                    )
                ))}
            </div>

            <div style={{ padding: '0 20px 100px' }}>
                {tab === 'home' && (
                    <div className="wp-animate-slide">
                        <div className="wp-glass" style={{ borderRadius: 24, padding: 24, marginBottom: 24 }}>
                            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>Today's Activity</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 24, fontWeight: 900, color: ATTEND_COLOR[today.status] || '#fff' }}>{today.status || 'NOT MARKED'}</div>
                                    <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>
                                        {today.check_in ? `IN: ${fmt(today.check_in)}` : 'Awaiting Check-in'}
                                        {today.check_out && ` | OUT: ${fmt(today.check_out)}`}
                                    </div>
                                </div>
                                <div style={{ fontSize: 40 }}>{ATTEND_ICON[today.status] || '⏳'}</div>
                            </div>
                        </div>

                        {message && <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: 16, borderRadius: 16, marginBottom: 20, fontWeight: 700, fontSize: 14 }}>{message}</div>}

                        {!checkedOut && <QRScanCheckin onSuccess={(res) => { setMessage(res.message); load(); }} muted="#94a3b8" />}
                        
                        {!checkedOut && (
                            <button onClick={async () => {
                                try {
                                    const res = await (checkedIn ? workerPortalApi.checkOut() : workerPortalApi.checkIn());
                                    setMessage(res.message); load();
                                } catch (e) { setMessage(e?.response?.data?.error || 'Failed'); }
                            }} style={{ width: '100%', padding: 18, borderRadius: 18, border: '1px solid rgba(255,255,255,0.1)', background: checkedIn ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)', color: checkedIn ? '#fb7185' : '#10b981', fontWeight: 800, fontSize: 14 }}>
                                {checkedIn ? '👋 MANUAL CHECK OUT' : '✅ MANUAL CHECK IN'}
                            </button>
                        )}
                        {checkedOut && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontWeight: 600 }}>See you tomorrow! 🌅</div>}
                    </div>
                )}

                {tab === 'logs' && (
                    <div className="wp-animate-slide">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Attendance Log</h2>
                            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700 }} />
                        </div>
                        {profile?.history?.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No records found for this month.</div>}
                        {profile?.history?.map((log, i) => (
                            <AttendanceLogItem key={i} log={log} />
                        ))}
                    </div>
                )}

                {tab === 'payroll' && (
                    <div className="wp-animate-slide">
                        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>Earnings Summary</h2>
                        <div className="wp-glass" style={{ padding: 24, borderRadius: 24, background: 'linear-gradient(135deg, rgba(56,189,248,0.1) 0%, rgba(56,189,248,0.05) 100%)', marginBottom: 20 }}>
                            <div style={{ fontSize: 13, color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Estimated Payout</div>
                            <div style={{ fontSize: 36, fontWeight: 900 }}>{npr(profile?.payroll?.total_wage)}</div>
                            <div style={{ display: 'flex', gap: 20, marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <div><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>DAYS</div><div style={{ fontSize: 18, fontWeight: 800 }}>{profile?.payroll?.total_days}</div></div>
                                <div><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>OVERTIME</div><div style={{ fontSize: 18, fontWeight: 800 }}>{profile?.payroll?.total_ot}h</div></div>
                            </div>
                        </div>
                        <div className="wp-glass" style={{ padding: 20, borderRadius: 20 }}>
                            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 800, marginBottom: 16 }}>WAGE BREAKDOWN</div>
                            {profile?.history?.filter(r => r.wage > 0).map((log, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{ fontSize: 14, color: '#cbd5e1' }}>{new Date(log.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                                    <span style={{ fontSize: 14, fontWeight: 700 }}>{npr(log.wage)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'badge' && (
                    <div className="wp-animate-slide">
                        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>My QR Badge</h2>
                        <BadgeScreen user={user} />
                    </div>
                )}

                {tab === 'team' && (
                    <div className="wp-animate-slide">
                        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>My Teams</h2>
                        {profile?.teams?.map(t => (
                            <div key={t.id} className="wp-glass" style={{ padding: 20, borderRadius: 20, marginBottom: 12 }}>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>{t.name}</div>
                                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{t.project__name}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
