/**
 * AttendanceHub — Mobile-first attendance management
 *
 * Mobile  : full-screen content, bottom pill tab bar, My QR FAB
 * Desktop : header + horizontal tab bar + card wrapper (unchanged)
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConstruction } from '../../context/ConstructionContext';
import attendanceService from '../../services/attendanceService';
import DailySheetTab    from './DailySheetTab';
import MonthlyReportTab from './MonthlyReportTab';
import PayrollTab       from './PayrollTab';
import { MqttProvider, useMqtt } from './MqttContext';
import { playScanSound, speakScanResult, speakText, cancelVoice, unlockAudioOnGesture, forceUnlockAudio } from './attendanceSounds';

// ── Mobile detection hook ──────────────────────────────────────────────────────
function useIsMobile() {
    const [mobile, setMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const fn = () => setMobile(window.innerWidth < 768);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);
    return mobile;
}

// ── My QR Badge Modal ─────────────────────────────────────────────────────────
function MyQRModal({ projectId, onClose }) {
    const [qrData,  setQrData]  = useState(null);
    const [loading, setLoading] = useState(true);
    const [err,     setErr]     = useState('');

    const load = useCallback(async () => {
        if (!projectId) { setErr('Select a project first.'); setLoading(false); return; }
        setLoading(true); setErr('');
        try {
            const d = await attendanceService.getMyQR(projectId);
            setQrData(d);
        } catch (e) {
            setErr(e?.response?.data?.error || 'Could not load QR badge.');
        } finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const handlePrint = () => {
        const w = window.open('', '_blank', 'width=400,height=520');
        w.document.write(`
            <html><head><title>My QR Badge</title>
            <style>
                body { margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; background:#fff; }
                .badge { border:2px solid #1a1a2e; border-radius:16px; padding:24px 28px; text-align:center; width:280px; }
                .badge h2 { margin:0 0 4px; font-size:18px; font-weight:900; color:#1a1a2e; }
                .badge p  { margin:0 0 12px; font-size:12px; color:#64748b; }
                .badge img { width:200px; height:200px; }
                .badge .tag { display:inline-block; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:800; background:#1a1a2e; color:#fff; margin-top:12px; }
                .badge .note { font-size:10px; color:#94a3b8; margin-top:10px; }
                @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
            </style></head>
            <body><div class="badge">
                <h2>${qrData.worker_name}</h2>
                <p>${qrData.trade}</p>
                <img src="${qrData.qr_image}" alt="QR" />
                <div class="tag">${qrData.project}</div>
                <p class="note">Scan to mark attendance</p>
            </div></body></html>
        `);
        w.document.close(); w.focus();
        setTimeout(() => { w.print(); }, 400);
    };

    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = qrData.qr_image;
        a.download = `qr-badge-${qrData.worker_name.replace(/\s+/g, '-').toLowerCase()}.png`;
        a.click();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'var(--t-surface)', borderRadius: '20px 20px 0 0',
                border: '1px solid var(--t-border)', borderBottom: 'none',
                padding: '20px 24px 36px', width: '100%', maxWidth: 480,
                boxShadow: '0 -12px 60px rgba(0,0,0,0.3)',
            }}>
                {/* drag handle */}
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--t-border)', margin: '0 auto 18px' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: 16, color: 'var(--t-text)' }}>🪪 My QR Badge</h3>
                    <button onClick={onClose} style={{ background: 'var(--t-surface2)', border: '1px solid var(--t-border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: 'var(--t-text3)' }}>✕</button>
                </div>

                {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t-text3)', fontSize: 13 }}>Generating your badge…</div>}
                {err     && <div style={{ textAlign: 'center', padding: '24px 0', color: '#ef4444', fontSize: 13 }}>{err}</div>}
                {!loading && !err && qrData && (<>
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <img src={qrData.qr_image} alt="My QR" style={{ width: 200, height: 200, borderRadius: 12, border: '1px solid var(--t-border)' }} />
                        <p style={{ margin: '10px 0 2px', fontWeight: 900, fontSize: 15, color: 'var(--t-text)' }}>{qrData.worker_name}</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text3)' }}>{qrData.trade} · {qrData.project}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handlePrint} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: '#f97316', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>🖨️ Print</button>
                        <button onClick={handleDownload} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>⬇️ Save</button>
                    </div>
                </>)}
            </div>
        </div>
    );
}

// ── Tab definitions ────────────────────────────────────────────────────────────
// NFC Devices and Settings have moved to the Workforce page (/workforce).
const TABS = [
    { id: 'daily',   label: 'Daily Sheet', icon: '📋', short: 'Daily'   },
    { id: 'monthly', label: 'Monthly',     icon: '📅', short: 'Monthly' },
    { id: 'payroll', label: 'Payroll',     icon: '💰', short: 'Payroll' },
];

// ── Mobile bottom scrollable tab bar ──────────────────────────────────────────
function MobileTabBar({ active, onChange, onQR, alertCount = 0 }) {
    const scrollRef = useRef(null);

    // Auto-scroll the active tab button into view whenever it changes
    useEffect(() => {
        const bar = scrollRef.current;
        if (!bar) return;
        const btn = bar.querySelector(`[data-tabid="${active}"]`);
        if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [active]);

    return (
        <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
            background: 'var(--t-surface)',
            borderTop: '1px solid var(--t-border)',
            boxShadow: '0 -8px 30px rgba(0,0,0,0.06)',
            paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
            <div
                ref={scrollRef}
                style={{
                    display: 'flex',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',          /* Firefox */
                    WebkitOverflowScrolling: 'touch',
                    padding: '8px 12px 14px',
                    gap: 6,
                }}
            >
                {/* Hide scrollbar on webkit */}
                <style>{`div::-webkit-scrollbar{display:none}`}</style>

                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        data-tabid={tab.id}
                        onClick={() => onChange(tab.id)}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            padding: '10px 14px', borderRadius: 16, border: 'none', cursor: 'pointer',
                            background: active === tab.id ? 'var(--t-text)' : 'transparent',
                            color: active === tab.id ? 'var(--t-surface)' : 'var(--t-text3)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', flexShrink: 0,
                            position: 'relative', minWidth: 70,
                            transform: active === tab.id ? 'scale(1.05)' : 'scale(1)',
                            boxShadow: active === tab.id ? '0 4px 14px rgba(0,0,0,0.1)' : 'none',
                        }}
                    >
                        <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', lineHeight: 1 }}>{tab.short}</span>
                        {/* Alert badge on Daily tab */}
                        {tab.id === 'daily' && alertCount > 0 && (
                            <div style={{
                                position: 'absolute', top: 4, right: 6,
                                minWidth: 16, height: 16, borderRadius: 8,
                                background: '#f59e0b', color: '#fff',
                                fontSize: 9, fontWeight: 900,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '0 3px',
                                boxShadow: '0 0 6px #f59e0b80',
                            }}>{alertCount}</div>
                        )}
                    </button>
                ))}

                {/* Divider */}
                <div style={{ width: 1, background: 'var(--t-border)', margin: '6px 4px', flexShrink: 0 }} />

                {/* My QR badge */}
                <button
                    onClick={onQR}
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: '#f9731618', color: '#f97316', flexShrink: 0,
                    }}
                >
                    <span style={{ fontSize: 20, lineHeight: 1 }}>🪪</span>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', lineHeight: 1 }}>My QR</span>
                </button>
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
// ── Live Scan Notifier ────────────────────────────────────────────────────────
function LiveScanNotifier() {
    const { lastScan, settings } = useMqtt();
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!lastScan) return;

        const processScan = async () => {
            console.log("Processing NFC Scan for UID:", lastScan.uid);
            try {
                const res = await attendanceService.nfcAttendanceScan({ uid: lastScan.uid });
                setToast({ ...res, timestamp: Date.now() });

                // Advanced sound + voice from attendanceSounds.js
                // Guard: settings may be null if not yet loaded from API
                const safeSettings = settings || {};
                playScanSound(res.action, safeSettings);
                speakScanResult(res, safeSettings);

                // Notify other components (like DailySheetTab) to refresh
                window.dispatchEvent(new CustomEvent('attendance-updated', { detail: res }));
            } catch (err) {
                const safeSettings = settings || {};
                playScanSound('ERROR', safeSettings);
                const errMsg = err.response?.data?.message || err.response?.data?.error || 'Unknown card';
                speakText(`Error: ${errMsg}`, safeSettings);
                setToast({
                    success: false,
                    message: errMsg,
                    timestamp: Date.now()
                });
            }
        };

        processScan();
    }, [lastScan]);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(timer);
    }, [toast]);

    if (!toast) return null;

    return (
        <div style={{
            position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, width: '90%', maxWidth: 360,
            animation: 'toastIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
            <div style={{
                background: toast.success ? '#fff' : '#fef2f2',
                border: `2px solid ${toast.success ? '#22c55e' : '#ef4444'}`,
                borderRadius: 20, padding: '16px 20px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', gap: 14
            }}>
                <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: toast.success ? '#f0fdf4' : '#fee2e2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24
                }}>
                    {toast.success ? (toast.action === 'CHECK_IN' ? '☀️' : '🌙') : '⚠️'}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#1e293b' }}>
                        {toast.worker?.name || 'Scan Result'}
                    </div>
                    <div style={{ fontSize: 12, color: toast.success ? '#059669' : '#b91c1c', fontWeight: 600 }}>
                        {toast.message}
                    </div>
                </div>
                <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
            <style>{`
                @keyframes toastIn { from { transform: translate(-50%, -100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
            `}</style>
        </div>
    );
}

function MqttStatusBadge() {
    const {
        status,
        reconnect,
        listenerStatus,
        deviceStatus,
        deviceCount,
        onlineDeviceCount,
        lastDeviceSeenAt,
        testingConnection,
        lastTestResult,
        reconnectCountdown,
        testConnection,
    } = useMqtt();

    const browserReady = status === 'Connected';
    const listenerReady = listenerStatus === 'connected';
    const deviceReady = deviceStatus === 'Connected';
    const canReconnect = !browserReady && status !== 'Connecting...';
    const canTest = !testingConnection && !deviceReady;

    const dot = deviceReady
        ? '#22c55e'
        : browserReady || listenerReady
            ? '#f59e0b'
            : '#ef4444';

    const label = deviceReady
        ? 'Scanner Live'
        : deviceStatus === 'Disconnected'
            ? 'Scanner Device Offline'
            : 'No Scanner Device';

    const deviceMeta = deviceCount > 0
        ? `${onlineDeviceCount}/${deviceCount} online`
        : '0 devices';

    const brokerMeta = `Listener ${listenerStatus || 'unknown'} · Browser ${status}`;
    const lastSeenMeta = lastDeviceSeenAt
        ? `Last seen ${new Date(lastDeviceSeenAt).toLocaleTimeString()}`
        : 'No heartbeat yet';
    const reconnectMeta = reconnectCountdown && !browserReady
        ? `Retrying in ${reconnectCountdown}s`
        : null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: 'var(--t-surface2)', border: '1px solid var(--t-border)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, boxShadow: deviceReady ? `0 0 6px ${dot}` : 'none', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--t-text2)', textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' }}>{label}</span>
                <span style={{ fontSize: 10, color: 'var(--t-text3)', whiteSpace: 'nowrap' }}>{deviceMeta}</span>
                <span style={{ fontSize: 9, color: 'var(--t-text3)', whiteSpace: 'nowrap' }}>{brokerMeta}</span>
                {!deviceReady && (
                    <span style={{ fontSize: 9, color: 'var(--t-text3)', whiteSpace: 'nowrap' }}>{lastSeenMeta}</span>
                )}
                {reconnectMeta && (
                    <span style={{ fontSize: 9, color: '#f97316', whiteSpace: 'nowrap', fontWeight: 700 }}>{reconnectMeta}</span>
                )}
                {lastTestResult && !deviceReady && (
                    <span style={{ fontSize: 9, color: lastTestResult.success ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                        {lastTestResult.success ? `Broker OK (${lastTestResult.latency_ms} ms)` : lastTestResult.message}
                    </span>
                )}
            </div>
            {canReconnect && (
                <button
                    type="button"
                    onClick={reconnect}
                    style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid #f9731640',
                        background: '#f9731615',
                        color: '#f97316',
                        fontSize: 10,
                        fontWeight: 800,
                        cursor: 'pointer',
                    }}
                >
                    Connect
                </button>
            )}
            {canTest && (
                <button
                    type="button"
                    onClick={testConnection}
                    style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid #2563eb30',
                        background: '#2563eb12',
                        color: '#2563eb',
                        fontSize: 10,
                        fontWeight: 800,
                        cursor: 'pointer',
                    }}
                >
                    {testingConnection ? 'Testing...' : 'Test'}
                </button>
            )}
        </div>
    );
}

function resolveAttendanceProject(activeProjectId, projects, dashboardProject) {
    const projectList = Array.isArray(projects) ? projects : [];
    const listedProject = projectList.find(p => String(p.id) === String(activeProjectId));

    if (listedProject) {
        return {
            project: listedProject,
            projectId: listedProject.id,
        };
    }

    if (dashboardProject && (!activeProjectId || String(dashboardProject.id) === String(activeProjectId))) {
        return {
            project: dashboardProject,
            projectId: dashboardProject.id,
        };
    }

    if (projectList.length === 0 && activeProjectId) {
        return {
            project: null,
            projectId: activeProjectId,
        };
    }

    return {
        project: null,
        projectId: null,
    };
}

function AttendanceHubContent() {
    const [activeTab,      setActiveTab]      = useState('daily');
    const [myQROpen,       setMyQROpen]       = useState(false);
    const [alertCount,     setAlertCount]     = useState(0); 
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    const { activeProjectId, projects, dashboardData } = useConstruction();
    const { project: activeProject, projectId: effectiveProjectId } = resolveAttendanceProject(
        activeProjectId,
        projects,
        dashboardData?.project,
    );
    const { settings } = useMqtt();

    // Unlock Web Audio + SpeechSynthesis on first user gesture (required on mobile)
    useEffect(() => { unlockAudioOnGesture(); }, []);

    // ── Tab content ────────────────────────────────────────────────────────────
    const tabContent = (
        <>
            {activeTab === 'daily'   && <DailySheetTab    projectId={effectiveProjectId} onAlertCount={setAlertCount} />}
            {activeTab === 'monthly' && <MonthlyReportTab  projectId={effectiveProjectId} />}
            {activeTab === 'payroll' && <PayrollTab        projectId={effectiveProjectId} />}
        </>
    );

    const mainLayout = (
        <>
            <LiveScanNotifier />
            {isMobile ? (
                /* Mobile Layout ... already defined below, but we'll return it here */
                null 
            ) : (
                /* Desktop Layout */
                null
            )}
        </>
    );

    const content = isMobile ? (
        <div style={{ minHeight: '100vh', background: 'var(--t-bg)', paddingBottom: 110 }}>
            {/* Compact sticky header */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'var(--t-surface)', 
                borderBottom: '1px solid var(--t-border)',
                padding: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button 
                        onClick={() => navigate('/dashboard')}
                        style={{ 
                            background: 'var(--t-surface2)', border: '1.5px solid var(--t-border)', 
                            borderRadius: 10, width: 40, height: 40, display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}
                    >🏠</button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--t-text)', letterSpacing: '-0.02em' }}>Workforce</span>
                        </div>
                        {activeProject && (
                            <p style={{ margin: '1px 0 0 0', fontSize: 11, color: '#f97316', fontWeight: 700 }}>
                                {activeProject.name}
                            </p>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <MqttStatusBadge />
                    <div style={{
                        padding: '4px 12px', borderRadius: 8,
                        background: '#f9731615', border: '1px solid #f9731640',
                        fontSize: 11, fontWeight: 800, color: '#f97316',
                    }}>
                        {TABS.find(t => t.id === activeTab)?.label}
                    </div>
                </div>
            </div>

            <div style={{ padding: '12px 12px 0' }}>
                {tabContent}
            </div>

            <MobileTabBar active={activeTab} onChange={setActiveTab} onQR={() => setMyQROpen(true)} alertCount={alertCount} />
            {myQROpen && <MyQRModal projectId={effectiveProjectId} onClose={() => setMyQROpen(false)} />}
        </div>
    ) : (
        <div className="min-h-screen" style={{ background: 'var(--t-bg)', padding: '24px 32px 60px' }}>
            <div style={{ width: '100%', margin: '0 auto' }}>
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <button 
                                onClick={() => navigate('/dashboard')}
                                style={{ 
                                    background: 'var(--t-surface)', border: '1.5px solid var(--t-border)', 
                                    borderRadius: 10, width: 42, height: 42, display: 'flex', 
                                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                    fontSize: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'var(--t-surface2)'}
                                onMouseOut={e => e.currentTarget.style.background = 'var(--t-surface)'}
                            >🏠</button>
                            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--t-text)' }}>Attendance</h1>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--t-text3)' }}>
                            {activeProject
                                ? <>Track daily attendance, overtime &amp; payroll for <strong style={{ color: 'var(--t-text)' }}>{activeProject.name}</strong></>
                                : 'Select a project from Project Manager to get started.'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MqttStatusBadge />
                        <button onClick={() => setMyQROpen(true)} title="View my QR attendance badge" style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                            background: '#f9731615', border: '1px solid #f9731640',
                            color: '#f97316', fontWeight: 800, fontSize: 13,
                            whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                            🪪 My QR
                        </button>
                    </div>
                </div>

                <div style={{
                    display: 'flex', gap: 4, marginBottom: 20,
                    borderBottom: '2px solid var(--t-border)', paddingBottom: 0,
                    overflowX: 'auto',
                }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '10px 18px', borderRadius: '10px 10px 0 0',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            border: '1px solid transparent',
                            borderBottom: activeTab === tab.id ? '2px solid #f97316' : '2px solid transparent',
                            background: activeTab === tab.id ? 'var(--t-surface)' : 'transparent',
                            color: activeTab === tab.id ? '#f97316' : 'var(--t-text3)',
                            whiteSpace: 'nowrap', transition: 'all 0.15s',
                            position: 'relative',
                        }}>
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                            {tab.id === 'daily' && alertCount > 0 && (
                                <div style={{
                                    minWidth: 18, height: 18, borderRadius: 9,
                                    background: '#f59e0b', color: '#fff',
                                    fontSize: 10, fontWeight: 900,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '0 4px',
                                    boxShadow: '0 0 6px #f59e0b60',
                                }}>{alertCount}</div>
                            )}
                        </button>
                    ))}
                </div>

                <div style={{ background: 'var(--t-surface)', borderRadius: 16, border: '1px solid var(--t-border)', padding: '12px' }}>
                    {tabContent}
                </div>
            </div>
            {myQROpen && <MyQRModal projectId={effectiveProjectId} onClose={() => setMyQROpen(false)} />}
        </div>
    );

    return (
        <>
            <LiveScanNotifier />
            {content}
        </>
    );
}

export default function AttendanceHub() {
    const { activeProjectId, projects, dashboardData } = useConstruction();
    const { projectId: effectiveProjectId } = resolveAttendanceProject(
        activeProjectId,
        projects,
        dashboardData?.project,
    );

    return (
        <MqttProvider projectId={effectiveProjectId}>
            <AttendanceHubContent />
        </MqttProvider>
    );
}
