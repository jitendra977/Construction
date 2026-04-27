/**
 * AttendanceHub
 * ─────────────────────────────────────────────────────────────────────────────
 * Main page for the Attendance module.
 * Tabs: QR Scanner | Daily Sheet | Workers & Badges | Monthly Report | Payroll
 */
import React, { useState, useCallback } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import attendanceService from '../../services/attendanceService';
import QRScannerTab     from './QRScannerTab';
import DailySheetTab    from './DailySheetTab';
import WorkersTab       from './WorkersTab';
import MonthlyReportTab from './MonthlyReportTab';
import PayrollTab       from './PayrollTab';

// ── My QR Badge Modal ─────────────────────────────────────────────────────────
function MyQRModal({ projectId, onClose }) {
    const [qrData,   setQrData]   = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [err,      setErr]      = useState('');

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

    React.useEffect(() => { load(); }, [load]);

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
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'var(--t-surface)', borderRadius: 20,
                border: '1px solid var(--t-border)',
                padding: 28, width: 340, maxWidth: '94vw',
                boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: 16, color: 'var(--t-text)' }}>🪪 My QR Badge</h3>
                    <button onClick={onClose} style={{ background: 'var(--t-surface2)', border: '1px solid var(--t-border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: 'var(--t-text3)' }}>✕</button>
                </div>

                {loading && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t-text3)', fontSize: 13 }}>
                        Generating your badge…
                    </div>
                )}
                {err && (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#ef4444', fontSize: 13 }}>{err}</div>
                )}
                {!loading && !err && qrData && (<>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <img src={qrData.qr_image} alt="My QR" style={{ width: 200, height: 200, borderRadius: 12, border: '1px solid var(--t-border)' }} />
                        <p style={{ margin: '10px 0 2px', fontWeight: 900, fontSize: 15, color: 'var(--t-text)' }}>{qrData.worker_name}</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text3)' }}>{qrData.trade} · {qrData.project}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handlePrint} style={{
                            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                            background: '#f97316', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                        }}>🖨️ Print</button>
                        <button onClick={handleDownload} style={{
                            flex: 1, padding: '10px 0', borderRadius: 10,
                            border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
                            color: 'var(--t-text)', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                        }}>⬇️ Download</button>
                    </div>
                </>)}
            </div>
        </div>
    );
}

const TABS = [
    { id: 'scanner', label: 'QR Scanner',       icon: '📷', short: 'Scan'    },
    { id: 'daily',   label: 'Daily Sheet',       icon: '📋', short: 'Daily'   },
    { id: 'workers', label: 'Workers & Badges',  icon: '👷', short: 'Workers' },
    { id: 'monthly', label: 'Monthly Report',    icon: '📅', short: 'Monthly' },
    { id: 'payroll', label: 'Payroll',           icon: '💰', short: 'Payroll' },
];

export default function AttendanceHub() {
    const [activeTab,  setActiveTab]  = useState('scanner');
    const [myQROpen,   setMyQROpen]   = useState(false);
    const { activeProjectId, projects } = useConstruction();

    const activeProject = projects?.find(p => p.id === activeProjectId);

    return (
        <div className="min-h-screen" style={{ background: 'var(--t-bg)', padding: '24px 20px 60px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>

                {/* ── Header ── */}
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: 26 }}>🕐</span>
                            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--t-text)' }}>
                                Attendance
                            </h1>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--t-text3)' }}>
                            {activeProject
                                ? <>Track daily attendance, overtime &amp; payroll for <strong style={{ color: 'var(--t-text)' }}>{activeProject.name}</strong></>
                                : 'Select a project from Project Manager to get started.'}
                        </p>
                    </div>
                    <button
                        onClick={() => setMyQROpen(true)}
                        title="View my QR attendance badge"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                            background: '#f9731615', border: '1px solid #f9731640',
                            color: '#f97316', fontWeight: 800, fontSize: 13,
                            whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                        🪪 My QR
                    </button>
                </div>

                {/* ── Tab bar ── */}
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
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s',
                        }}>
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Tab content ── */}
                <div style={{
                    background: 'var(--t-surface)',
                    borderRadius: 16,
                    border: '1px solid var(--t-border)',
                    padding: '20px 20px 24px',
                }}>
                    {activeTab === 'scanner' && <QRScannerTab      projectId={activeProjectId} />}
                    {activeTab === 'daily'   && <DailySheetTab     projectId={activeProjectId} />}
                    {activeTab === 'workers' && <WorkersTab         projectId={activeProjectId} />}
                    {activeTab === 'monthly' && <MonthlyReportTab   projectId={activeProjectId} />}
                    {activeTab === 'payroll' && <PayrollTab         projectId={activeProjectId} />}
                </div>
            </div>

            {myQROpen && (
                <MyQRModal
                    projectId={activeProjectId}
                    onClose={() => setMyQROpen(false)}
                />
            )}
        </div>
    );
}
