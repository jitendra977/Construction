/**
 * AttendanceKiosk.jsx
 * ═══════════════════
 * Fullscreen site-entrance kiosk for NFC attendance.
 *
 * Route  : /kiosk/:projectId  (no authentication required)
 * Purpose: Runs on a Raspberry Pi / tablet at the site gate.
 *          Receives NFC scans via MQTT WebSocket (same MqttProvider as the
 *          main dashboard), then calls the backend to get worker info and
 *          displays a 5-second confirmation card.
 *
 * Flow per scan
 * ─────────────
 *   ESP32 → MQTT broker → mqtt_listener.py (records to DB) ←─┐
 *                       → browser WS (kiosk receives UID)      │
 *                                                              │
 *   kiosk waits 400 ms (gives mqtt_listener a head start)      │
 *   kiosk calls POST /attendance/nfc-attendance/ (idempotent)──┘
 *   backend returns success=true + worker info ("Already recorded …")
 *   kiosk shows worker card, plays chime, refreshes live count
 */

import React, {
    useState, useEffect, useRef, useCallback,
} from 'react';
import { useParams } from 'react-router-dom';
import { MqttProvider, useMqtt } from './MqttContext';
import attendanceService from '../../services/attendanceService';
import { playScanSound, unlockAudioOnGesture, forceUnlockAudio } from './attendanceSounds';

// ─── helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Returns a stable pastel hex from a worker name */
function avatarColor(name = '') {
    const COLORS = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
    ];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return COLORS[h % COLORS.length];
}

/** "Jai Tamang" → "JT" */
function initials(name = '') {
    return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function useNowStr() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return { timeStr, dateStr };
}

// ─── Scan result card ──────────────────────────────────────────────────────────

const DISMISS_SECONDS = 5;

function ScanCard({ result, onDismiss }) {
    const [progress, setProgress] = useState(100);
    // Keep a ref so the interval callback always has the latest onDismiss
    // without adding it to the dependency array (which would restart the
    // timer on every parent re-render).
    const onDismissRef = useRef(onDismiss);
    useEffect(() => { onDismissRef.current = onDismiss; });

    useEffect(() => {
        const start = Date.now();
        const total = DISMISS_SECONDS * 1000;
        const id = setInterval(() => {
            const pct = 100 - ((Date.now() - start) / total) * 100;
            if (pct <= 0) { clearInterval(id); onDismissRef.current(); }
            else setProgress(pct);
        }, 50);
        return () => clearInterval(id);
    }, []); // intentionally empty — runs once on mount, ref handles callback

    if (!result) return null;

    const isIn = result.action === 'CHECK_IN';
    const isDupe = result.isDuplicate;
    const accentColor = isIn ? '#10b981' : '#f59e0b';
    const bgGrad = isIn
        ? 'linear-gradient(135deg,#0d2d1f 0%,#0f1a0f 100%)'
        : 'linear-gradient(135deg,#2d1f00 0%,#1a1300 100%)';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.3s ease',
        }}>
            <div style={{
                width: 'min(440px, 90vw)',
                background: bgGrad,
                border: `2px solid ${accentColor}`,
                borderRadius: 24,
                padding: '36px 32px 24px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: `0 0 60px ${accentColor}40`,
            }}>
                {/* glow ring */}
                <div style={{
                    position: 'absolute', top: -60, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 200, height: 200,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${accentColor}25 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }} />

                {/* avatar */}
                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: avatarColor(result.workerName),
                    margin: '0 auto 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, fontWeight: 900, color: '#fff',
                    border: `3px solid ${accentColor}`,
                    boxShadow: `0 0 20px ${accentColor}60`,
                }}>
                    {initials(result.workerName)}
                </div>

                {/* name */}
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>
                    {result.workerName}
                </div>
                <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24 }}>
                    {result.trade}
                </div>

                {/* action badge */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    background: `${accentColor}20`,
                    border: `1px solid ${accentColor}60`,
                    borderRadius: 50, padding: '10px 24px',
                    marginBottom: 8,
                }}>
                    <span style={{ fontSize: 24 }}>{isIn ? '✅' : '👋'}</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: accentColor }}>
                        {isIn ? 'Checked In' : 'Checked Out'}
                    </span>
                </div>

                {/* time */}
                <div style={{ fontSize: 15, color: '#94a3b8', marginBottom: 4 }}>
                    {result.timeStr}
                </div>
                {isDupe && (
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        Already recorded
                    </div>
                )}

                {/* progress bar */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0,
                    width: `${progress}%`, height: 3,
                    background: accentColor,
                    transition: 'width 0.05s linear',
                    borderRadius: '0 2px 2px 0',
                }} />

                {/* dismiss hint */}
                <div style={{ fontSize: 11, color: '#475569', marginTop: 16 }}>
                    Auto-dismisses in {Math.ceil(progress / (100 / DISMISS_SECONDS))}s &nbsp;·&nbsp;
                    <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={onDismiss}>
                        Dismiss
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Error flash ───────────────────────────────────────────────────────────────

function ErrorFlash({ message, onDone }) {
    const onDoneRef = useRef(onDone);
    useEffect(() => { onDoneRef.current = onDone; });

    useEffect(() => {
        const id = setTimeout(() => onDoneRef.current(), 3500);
        return () => clearTimeout(id);
    }, []); // runs once on mount

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.2s ease',
        }}>
            <div style={{
                background: 'linear-gradient(135deg,#1f0d0d,#1a0000)',
                border: '2px solid #ef4444',
                borderRadius: 20,
                padding: '32px 40px',
                textAlign: 'center',
                boxShadow: '0 0 60px #ef444440',
            }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>⚠️</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{message}</div>
            </div>
        </div>
    );
}

// ─── NFC ring animation ────────────────────────────────────────────────────────

function NfcRing({ scanning }) {
    return (
        <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
            {/* outer pulse rings */}
            {!scanning && [0, 1, 2].map((i) => (
                <div key={i} style={{
                    position: 'absolute', inset: 0,
                    borderRadius: '50%',
                    border: '2px solid #3b82f6',
                    opacity: 0,
                    animation: `ripple 2.4s ${i * 0.8}s ease-out infinite`,
                }} />
            ))}
            {/* center circle */}
            <div style={{
                position: 'absolute', inset: 20,
                borderRadius: '50%',
                background: scanning ? '#f59e0b20' : '#3b82f620',
                border: `2px solid ${scanning ? '#f59e0b' : '#3b82f6'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s ease',
                animation: scanning ? 'spin 1s linear infinite' : 'none',
            }}>
                <span style={{ fontSize: 44, filter: scanning ? 'brightness(1.4)' : 'none' }}>
                    {scanning ? '⏳' : '📲'}
                </span>
            </div>
        </div>
    );
}

// ─── Live count strip ──────────────────────────────────────────────────────────

function LiveStrip({ liveData, lastTime }) {
    if (!liveData) return null;
    const { counts } = liveData;
    return (
        <div style={{
            display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
            marginTop: 24,
        }}>
            {[
                { label: 'On Site', value: counts?.on_site ?? '—', color: '#10b981', icon: '🟢' },
                { label: 'Left Today', value: counts?.left ?? '—', color: '#f59e0b', icon: '🟡' },
                { label: 'Not Yet In', value: counts?.unmarked ?? '—', color: '#64748b', icon: '⚫' },
            ].map(({ label, value, color, icon }) => (
                <div key={label} style={{
                    background: '#ffffff08',
                    border: `1px solid ${color}30`,
                    borderRadius: 14,
                    padding: '14px 22px',
                    textAlign: 'center',
                    minWidth: 100,
                }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color }}>
                        {icon} {value}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
                </div>
            ))}
        </div>
    );
}

// ─── On-site worker list ───────────────────────────────────────────────────────

function OnSiteList({ workers = [] }) {
    if (!workers.length) return null;
    return (
        <div style={{
            marginTop: 24,
            maxHeight: 160,
            overflowY: 'auto',
            display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
        }}>
            {workers.slice(0, 20).map((w) => (
                <div key={w.worker_id} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: '#ffffff06',
                    border: '1px solid #ffffff10',
                    borderRadius: 30,
                    padding: '5px 12px 5px 6px',
                    fontSize: 12,
                }}>
                    <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: avatarColor(w.worker_name),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0,
                    }}>
                        {initials(w.worker_name)}
                    </div>
                    <span style={{ color: '#cbd5e1' }}>{w.worker_name}</span>
                    <span style={{ color: '#10b981', fontSize: 10 }}>{w.check_in}</span>
                </div>
            ))}
            {workers.length > 20 && (
                <div style={{ color: '#64748b', fontSize: 12, padding: '5px 12px' }}>
                    +{workers.length - 20} more
                </div>
            )}
        </div>
    );
}

// ─── Tap-to-Start overlay (required for mobile audio unlock) ─────────────────

function TapToStart({ onStart }) {
    const btnRef = useRef(null);

    useEffect(() => {
        const el = btnRef.current;
        if (!el) return;

        // Use native events for most reliable iOS AudioContext unlocking
        const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            onStart();
        };

        el.addEventListener('touchstart', handler, { passive: false });
        el.addEventListener('click', handler);

        return () => {
            el.removeEventListener('touchstart', handler);
            el.removeEventListener('click', handler);
        };
    }, [onStart]);

    return (
        <div
            ref={btnRef}
            style={{
                position: 'fixed', inset: 0, zIndex: 200,
                background: 'linear-gradient(160deg, #050510 0%, #0d1117 60%, #0a1520 100%)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                userSelect: 'none', cursor: 'pointer',
                gap: 24,
            }}
        >
            {/* pulse ring */}
            <div style={{ position: 'relative', width: 160, height: 160 }}>
                {[0, 1, 2].map((i) => (
                    <div key={i} style={{
                        position: 'absolute', inset: 0,
                        borderRadius: '50%',
                        border: '2px solid #3b82f6',
                        opacity: 0,
                        animation: `ripple 2.4s ${i * 0.8}s ease-out infinite`,
                    }} />
                ))}
                <div style={{
                    position: 'absolute', inset: 20,
                    borderRadius: '50%',
                    background: '#3b82f620',
                    border: '2px solid #3b82f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 56,
                    animation: 'pulse-dot 2s ease-in-out infinite',
                }}>
                    📲
                </div>
            </div>

            <div style={{ textAlign: 'center' }}>
                <div style={{
                    fontSize: 'clamp(22px, 5vw, 32px)',
                    fontWeight: 900, color: '#f8fafc',
                    letterSpacing: '-0.5px', marginBottom: 10,
                    fontFamily: "'Inter', sans-serif",
                }}>
                    Tap Anywhere to Start
                </div>
                <div style={{ fontSize: 14, color: '#64748b', fontFamily: "'Inter', sans-serif" }}>
                    🔊 Tap once to enable sounds &amp; NFC scanning
                </div>
            </div>

            <div style={{
                marginTop: 8, padding: '14px 36px',
                background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                borderRadius: 50,
                fontSize: 16, fontWeight: 800, color: '#fff',
                boxShadow: '0 0 30px #3b82f640',
                fontFamily: "'Inter', sans-serif",
            }}>
                🚀 Activate Kiosk
            </div>
        </div>
    );
}

// ─── Main kiosk display (inside MqttProvider) ─────────────────────────────────

function KioskDisplay({ projectId }) {
    const { lastScan, clearScan, status: mqttStatus, settings } = useMqtt();
    const { timeStr, dateStr } = useNowStr();

    const [started, setStarted] = useState(false);      // audio unlocked?
    const [scanResult, setScanResult] = useState(null);   // success card
    const [errorMsg, setErrorMsg] = useState('');      // error flash
    const [scanning, setScanning] = useState(false);   // ring animation
    const [liveData, setLiveData] = useState(null);
    const [lastScanTime, setLastScanTime] = useState('');

    // Track last scan time per UID to prevent double-taps within 1 minute
    const lastScansRef = useRef({}); // { [uid]: timestamp }

    const handleStart = () => {
        forceUnlockAudio();   // synchronous — inside the touch/click handler
        setStarted(true);
    };

    const processingRef = useRef(false);

    // ── Refresh live count ────────────────────────────────────────────────────
    const refreshLive = useCallback(async () => {
        try {
            const data = await attendanceService.getLive(projectId);
            setLiveData(data);
        } catch { /* non-critical */ }
    }, [projectId]);

    // Poll live count on mount + every 30 s
    useEffect(() => {
        refreshLive();
        const id = setInterval(refreshLive, 30_000);
        return () => clearInterval(id);
    }, [refreshLive]);

    // ── Process NFC scan ──────────────────────────────────────────────────────
    const processNfcScan = useCallback(async (uid) => {
        if (!uid || processingRef.current) return;
        
        // 1-minute throttle check
        const now = Date.now();
        const last = lastScansRef.current[uid];
        if (last && (now - last.timestamp < 60000)) {
            const actionLabel = last.action === 'CHECK_IN' ? 'Logged In' : 'Logged Out';
            setErrorMsg(`Already ${actionLabel} (wait 1m)`);
            
            const safeSettings = settings || {};
            if (safeSettings.sound_enabled !== false) {
                playScanSound('ERROR', safeSettings);
            }
            return;
        }

        processingRef.current = true;
        setScanning(true);
        clearScan();

        try {
            // Give mqtt_listener a head start to process and write to DB
            await sleep(400);

            const res = await attendanceService.nfcAttendanceScan({
                uid,
                project: projectId,
            });

            const action = res.action;           // CHECK_IN | CHECK_OUT | IGNORED | BLOCKED | …
            const worker = res.worker;

            if (res.success && worker) {
                // Update throttle timestamp and action on success
                lastScansRef.current[uid] = { timestamp: Date.now(), action: action };

                // Determine display action — "Already recorded CHECK_IN" still shows check-in card
                const displayAction = (action === 'CHECK_IN' || action === 'CHECK_OUT')
                    ? action
                    : res.is_duplicate ? (res.last_action || 'CHECK_IN') : action;

                setScanResult({
                    workerName: worker.name,
                    trade: worker.trade,
                    action: displayAction,
                    isDuplicate: !!res.is_duplicate,
                    timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                });

                // Play sound
                const safeSettings = settings || {};
                const theme = safeSettings.sound_theme || 'harmonic';
                const volume = safeSettings.sound_volume ?? 0.7;
                const tone = displayAction === 'CHECK_IN' ? 'CHECK_IN' : 'CHECK_OUT';
                if (safeSettings.sound_enabled !== false) {
                    playScanSound(tone, { ...safeSettings, sound_theme: theme, sound_volume: volume });
                }

                setLastScanTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                refreshLive();

            } else if (action === 'IGNORED') {
                // Scan too fast — just play a soft error tone, no card
                const safeSettings = settings || {};
                if (safeSettings.sound_enabled !== false) {
                    playScanSound('ERROR', safeSettings);
                }

            } else if (action === 'BLOCKED') {
                setScanResult(null);
                setErrorMsg('Already completed for today');
                const safeSettings = settings || {};
                if (safeSettings.sound_enabled !== false) {
                    playScanSound('ERROR', safeSettings);
                }

            } else if (!res.success) {
                setScanResult(null);
                setErrorMsg(res.message || 'Scan rejected');
            }

        } catch (err) {
            const status = err?.response?.status;
            if (status === 404) {
                setErrorMsg('Card not registered — contact admin');
            } else {
                setErrorMsg('Connection error — try again');
            }
            const safeSettings = settings || {};
            if (safeSettings.sound_enabled !== false) {
                playScanSound('ERROR', safeSettings);
            }
        } finally {
            setScanning(false);
            processingRef.current = false;
        }
    }, [projectId, clearScan, refreshLive, settings]);

    // ── React to MQTT scans ───────────────────────────────────────────────────
    useEffect(() => {
        if (!lastScan?.uid) return;
        processNfcScan(lastScan.uid);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastScan?.uid, lastScan?.timestamp]);

    // ── MQTT dot color ────────────────────────────────────────────────────────
    const mqttDot = {
        Connected: { color: '#10b981', label: 'Live' },
        'Connecting...': { color: '#f59e0b', label: 'Connecting…' },
        Disconnected: { color: '#64748b', label: 'Offline' },
        Error: { color: '#ef4444', label: 'Error' },
    }[mqttStatus] || { color: '#64748b', label: mqttStatus };

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'linear-gradient(160deg, #0a0a1a 0%, #0d1117 50%, #0a1520 100%)',
            color: '#f1f5f9',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            userSelect: 'none',
            padding: '24px 20px',
            overflow: 'hidden',
        }}>

            {/* ── Tap-to-Start overlay (shown until user taps) ────────────── */}
            {!started && <TapToStart onStart={handleStart} />}

            {/* ── Overlays ──────────────────────────────────────────────── */}
            {scanResult && (
                <ScanCard
                    result={scanResult}
                    onDismiss={() => setScanResult(null)}
                />
            )}
            {errorMsg && (
                <ErrorFlash
                    message={errorMsg}
                    onDone={() => setErrorMsg('')}
                />
            )}

            {/* ── Header row ────────────────────────────────────────────── */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid #ffffff0a',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>🏗️</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8' }}>
                        Attendance Kiosk
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: mqttDot.color,
                        boxShadow: `0 0 6px ${mqttDot.color}`,
                        animation: mqttStatus === 'Connected' ? 'pulse-dot 2s ease-in-out infinite' : 'none',
                    }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>{mqttDot.label}</span>
                </div>
            </div>

            {/* ── Clock ─────────────────────────────────────────────────── */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{
                    fontSize: 'clamp(52px, 10vw, 88px)',
                    fontWeight: 900,
                    letterSpacing: '-2px',
                    color: '#f8fafc',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                }}>
                    {timeStr}
                </div>
                <div style={{ fontSize: 16, color: '#64748b', marginTop: 6 }}>
                    {dateStr}
                </div>
            </div>

            {/* ── NFC ring ──────────────────────────────────────────────── */}
            <NfcRing scanning={scanning} />

            <div style={{
                marginTop: 20,
                fontSize: 18,
                fontWeight: 600,
                color: scanning ? '#f59e0b' : '#94a3b8',
                transition: 'color 0.3s',
                textAlign: 'center',
            }}>
                {scanning
                    ? 'Processing…'
                    : 'Tap your NFC card to mark attendance'}
            </div>

            {/* ── Live count strip ──────────────────────────────────────── */}
            <LiveStrip liveData={liveData} />

            {/* ── On-site worker chips ──────────────────────────────────── */}
            {liveData?.on_site?.length > 0 && (
                <OnSiteList workers={liveData.on_site} />
            )}

            {/* ── Footer ────────────────────────────────────────────────── */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 24px',
                borderTop: '1px solid #ffffff0a',
                fontSize: 12, color: '#475569',
            }}>
                <span>Project #{projectId}</span>
                {lastScanTime && <span>Last scan: {lastScanTime}</span>}
                <span>🏗️ Construction Attendance</span>
            </div>

        </div>
    );
}

// ─── CSS keyframe animations (injected once) ──────────────────────────────────

const KIOSK_STYLES = `
    @keyframes ripple {
        0%   { transform: scale(1);   opacity: 0.6; }
        100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.96); }
        to   { opacity: 1; transform: scale(1); }
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
    }
    @keyframes pulse-dot {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.4; }
    }
`;

// ─── Root export (wraps MqttProvider) ────────────────────────────────────────

export default function AttendanceKiosk() {
    const { projectId } = useParams();

    // Inject keyframes once + unlock audio on first user gesture (mobile requirement)
    useEffect(() => {
        unlockAudioOnGesture();
        if (document.getElementById('kiosk-styles')) return;
        const tag = document.createElement('style');
        tag.id = 'kiosk-styles';
        tag.textContent = KIOSK_STYLES;
        document.head.appendChild(tag);
        return () => tag.remove();
    }, []);

    if (!projectId) {
        return (
            <div style={{
                display: 'flex', height: '100vh',
                alignItems: 'center', justifyContent: 'center',
                background: '#0a0a1a', color: '#ef4444', fontFamily: 'sans-serif',
                flexDirection: 'column', gap: 12,
            }}>
                <span style={{ fontSize: 48 }}>⚠️</span>
                <span style={{ fontSize: 18 }}>No project ID in URL.</span>
                <span style={{ fontSize: 14, color: '#64748b' }}>Use /kiosk/&lt;projectId&gt;</span>
            </div>
        );
    }

    return (
        <MqttProvider projectId={Number(projectId)}>
            <KioskDisplay projectId={Number(projectId)} />
        </MqttProvider>
    );
}
