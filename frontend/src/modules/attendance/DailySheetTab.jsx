import React, { useState, useEffect, useCallback } from 'react';
import attendanceService from '../../services/attendanceService';

const STATUS_OPTIONS = [
    { value: 'PRESENT',  label: 'Present',  short: 'P', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { value: 'ABSENT',   label: 'Absent',   short: 'A', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
    { value: 'HALF_DAY', label: 'Half',     short: 'H', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { value: 'LEAVE',    label: 'Leave',    short: 'L', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    { value: 'HOLIDAY',  label: 'Holiday',  short: 'HO', color: '#64748b', bg: 'rgba(100,116,139,0.12)'},
];
const statusMeta = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]));

function today() { return new Date().toISOString().split('T')[0]; }

// ── Mobile detection ──────────────────────────────────────────────────────────
function useIsMobile() {
    const [mobile, setMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const fn = () => setMobile(window.innerWidth < 768);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);
    return mobile;
}

// ── Shared data hook ──────────────────────────────────────────────────────────
function useSheetData(projectId, date) {
    const [workers, setWorkers] = useState([]);
    const [sheet,   setSheet]   = useState({});
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true); setError('');
        try {
            const [ws, recs] = await Promise.all([
                attendanceService.getWorkers({ project: projectId, active: 'true' }),
                attendanceService.getRecords({ project: projectId, date }),
            ]);
            const list = Array.isArray(ws) ? ws : ws.results || [];
            setWorkers(list);
            const recMap = {};
            (Array.isArray(recs) ? recs : recs.results || []).forEach(r => {
                recMap[r.worker] = { status: r.status, overtime_hours: r.overtime_hours || 0, notes: r.notes || '' };
            });
            const initial = {};
            list.forEach(w => { initial[w.id] = recMap[w.id] || { status: 'PRESENT', overtime_hours: 0, notes: '' }; });
            setSheet(initial);
        } catch { setError('Failed to load attendance data.'); }
        finally   { setLoading(false); }
    }, [projectId, date]);

    useEffect(() => { load(); }, [load]);
    return { workers, sheet, setSheet, loading, setLoading, error, setError, reload: load };
}

// ── Mobile layout ─────────────────────────────────────────────────────────────
function MobileDailySheet({ projectId }) {
    const [date,   setDate]   = useState(today());
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);
    const [markAllOpen, setMarkAllOpen] = useState(false);

    const { workers, sheet, setSheet, loading, error, setError, reload } = useSheetData(projectId, date);

    const setStatus = (wid, status) => setSheet(s => ({ ...s, [wid]: { ...s[wid], status } }));
    const setOT     = (wid, val)    => setSheet(s => ({ ...s, [wid]: { ...s[wid], overtime_hours: val } }));

    const markAll = (status) => {
        const next = {};
        workers.forEach(w => { next[w.id] = { ...sheet[w.id], status }; });
        setSheet(next);
        setMarkAllOpen(false);
    };

    const copyPrevious = async () => {
        const d = new Date(date); d.setDate(d.getDate() - 1);
        const prevDate = d.toISOString().split('T')[0];
        try {
            const recs = await attendanceService.getRecords({ project: projectId, date: prevDate });
            const list = Array.isArray(recs) ? recs : recs.results || [];
            if (list.length === 0) { alert('No attendance found for ' + prevDate); return; }
            const next = { ...sheet };
            list.forEach(r => { if (next[r.worker]) next[r.worker] = { status: r.status, overtime_hours: r.overtime_hours || 0, notes: r.notes || '' }; });
            setSheet(next);
        } catch { setError('Failed to copy from previous day.'); }
        setMarkAllOpen(false);
    };

    const save = async () => {
        setSaving(true); setSaved(false); setError('');
        try {
            const records = workers.map(w => ({
                worker: w.id, status: sheet[w.id]?.status || 'PRESENT',
                overtime_hours: parseFloat(sheet[w.id]?.overtime_hours || 0),
                notes: sheet[w.id]?.notes || '',
            }));
            await attendanceService.bulkMark({ project: projectId, date, records });
            setSaved(true); setTimeout(() => setSaved(false), 3000);
        } catch { setError('Failed to save attendance.'); }
        finally { setSaving(false); }
    };

    const counts = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LEAVE: 0, HOLIDAY: 0 };
    Object.values(sheet).forEach(r => { if (r?.status) counts[r.status] = (counts[r.status] || 0) + 1; });

    if (!projectId) return (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--t-text3)', fontSize: 14 }}>
            Select a project to mark attendance.
        </div>
    );

    return (
        <div style={{ paddingBottom: 100 }}>
            {/* ── Date bar ── */}
            <div style={{ padding: '12px 12px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    style={{
                        flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 14,
                        border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                        color: 'var(--t-text)', fontWeight: 700,
                    }}
                />
                <button onClick={() => setMarkAllOpen(o => !o)} style={{
                    padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                    border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                    color: 'var(--t-text)', cursor: 'pointer', whiteSpace: 'nowrap',
                }}>⚡ Mark All</button>
            </div>

            {/* ── Mark All dropdown ── */}
            {markAllOpen && (
                <div style={{ margin: '6px 12px 0', padding: 12, borderRadius: 12, background: 'var(--t-surface)', border: '1px solid var(--t-border)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {STATUS_OPTIONS.map(s => (
                        <button key={s.value} onClick={() => markAll(s.value)} style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 800,
                            border: `1px solid ${s.color}`, background: s.bg, color: s.color, cursor: 'pointer',
                        }}>{s.label}</button>
                    ))}
                    <button onClick={copyPrevious} style={{
                        padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                        border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                        color: 'var(--t-text3)', cursor: 'pointer',
                    }}>📋 Copy Yesterday</button>
                </div>
            )}

            {/* ── Summary pills ── */}
            <div style={{ padding: '10px 12px 0', display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {STATUS_OPTIONS.map(s => (
                    <div key={s.value} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap',
                        fontSize: 11, fontWeight: 800, background: s.bg, color: s.color,
                        border: `1px solid ${s.color}40`, flexShrink: 0,
                    }}>
                        {s.short} · {counts[s.value] || 0}
                    </div>
                ))}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap',
                    fontSize: 11, fontWeight: 800, background: 'var(--t-surface2)',
                    color: 'var(--t-text3)', border: '1px solid var(--t-border)', flexShrink: 0,
                }}>
                    Total · {workers.length}
                </div>
            </div>

            {error && (
                <div style={{ margin: '8px 12px 0', padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 13 }}>{error}</div>
            )}

            {/* ── Worker cards ── */}
            {loading ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--t-text3)' }}>Loading…</div>
            ) : workers.length === 0 ? (
                <div style={{ margin: '16px 12px', padding: '32px 20px', textAlign: 'center', borderRadius: 14, background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text3)', fontSize: 13 }}>
                    No workers yet. Add workers in the Workers tab first.
                </div>
            ) : (
                <div style={{ padding: '10px 12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {workers.map((w, i) => {
                        const rec = sheet[w.id] || { status: 'PRESENT', overtime_hours: 0, notes: '' };
                        const sm  = statusMeta[rec.status] || statusMeta.PRESENT;
                        return (
                            <div key={w.id} style={{
                                borderRadius: 14, border: `1px solid ${sm.color}40`,
                                background: 'var(--t-surface)', overflow: 'hidden',
                                boxShadow: `0 2px 8px ${sm.color}10`,
                            }}>
                                {/* Worker name row */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 14px 8px', borderBottom: '1px solid var(--t-border)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                            background: sm.bg, border: `1.5px solid ${sm.color}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 900, fontSize: 13, color: sm.color,
                                        }}>{sm.short}</div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t-text)' }}>{w.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--t-text3)' }}>{w.trade_display}</div>
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                                        background: w.worker_type === 'STAFF' ? 'rgba(59,130,246,0.1)' : 'rgba(249,115,22,0.1)',
                                        color: w.worker_type === 'STAFF' ? '#3b82f6' : '#f97316',
                                    }}>{w.worker_type}</span>
                                </div>

                                {/* Status buttons */}
                                <div style={{ display: 'flex', padding: '10px 10px 8px', gap: 6 }}>
                                    {STATUS_OPTIONS.map(s => (
                                        <button key={s.value} onClick={() => setStatus(w.id, s.value)} style={{
                                            flex: 1, padding: '8px 2px', borderRadius: 8, fontSize: 11,
                                            fontWeight: rec.status === s.value ? 900 : 600,
                                            border: `1.5px solid ${rec.status === s.value ? s.color : 'var(--t-border)'}`,
                                            background: rec.status === s.value ? s.bg : 'transparent',
                                            color: rec.status === s.value ? s.color : 'var(--t-text3)',
                                            cursor: 'pointer', transition: 'all 0.12s',
                                        }}>{s.label}</button>
                                    ))}
                                </div>

                                {/* OT hours row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 10px' }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text3)', whiteSpace: 'nowrap' }}>OT Hours:</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <button onClick={() => setOT(w.id, Math.max(0, parseFloat(rec.overtime_hours || 0) - 0.5))} style={{
                                            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--t-border)',
                                            background: 'var(--t-surface2)', color: 'var(--t-text)', fontWeight: 800,
                                            fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>−</button>
                                        <span style={{ minWidth: 30, textAlign: 'center', fontWeight: 800, fontSize: 14, color: parseFloat(rec.overtime_hours) > 0 ? '#8b5cf6' : 'var(--t-text3)' }}>
                                            {parseFloat(rec.overtime_hours || 0).toFixed(1)}
                                        </span>
                                        <button onClick={() => setOT(w.id, Math.min(24, parseFloat(rec.overtime_hours || 0) + 0.5))} style={{
                                            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--t-border)',
                                            background: 'var(--t-surface2)', color: 'var(--t-text)', fontWeight: 800,
                                            fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>+</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Sticky save bar ── */}
            <div style={{
                position: 'fixed', bottom: 80, left: 0, right: 0, zIndex: 90,
                padding: '10px 12px',
                background: 'var(--t-surface)', borderTop: '1px solid var(--t-border)',
                backdropFilter: 'blur(12px)',
            }}>
                {saved && <div style={{ textAlign: 'center', fontSize: 12, color: '#10b981', fontWeight: 700, marginBottom: 6 }}>✔ Attendance saved!</div>}
                <button onClick={save} disabled={saving || workers.length === 0} style={{
                    width: '100%', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 900,
                    background: saved ? '#10b981' : '#f97316', color: '#fff', border: 'none',
                    cursor: saving || workers.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: saving || workers.length === 0 ? 0.7 : 1, transition: 'background 0.3s',
                }}>
                    {saving ? 'Saving…' : saved ? '✔ Saved' : '💾 Save Attendance'}
                </button>
            </div>
        </div>
    );
}

// ── Desktop layout (original) ─────────────────────────────────────────────────
function DesktopDailySheet({ projectId }) {
    const [date,   setDate]   = useState(today());
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);

    const { workers, sheet, setSheet, loading, error, setError } = useSheetData(projectId, date);

    const setStatus = (wid, status) => setSheet(s => ({ ...s, [wid]: { ...s[wid], status } }));
    const setOT     = (wid, val)    => setSheet(s => ({ ...s, [wid]: { ...s[wid], overtime_hours: val } }));
    const setNotes  = (wid, val)    => setSheet(s => ({ ...s, [wid]: { ...s[wid], notes: val } }));

    const markAll = (status) => {
        const next = {};
        workers.forEach(w => { next[w.id] = { ...sheet[w.id], status }; });
        setSheet(next);
    };

    const copyPrevious = async () => {
        const d = new Date(date); d.setDate(d.getDate() - 1);
        const prevDate = d.toISOString().split('T')[0];
        try {
            const recs = await attendanceService.getRecords({ project: projectId, date: prevDate });
            const list = Array.isArray(recs) ? recs : recs.results || [];
            if (list.length === 0) { alert('No attendance found for ' + prevDate); return; }
            const next = { ...sheet };
            list.forEach(r => { if (next[r.worker]) next[r.worker] = { status: r.status, overtime_hours: r.overtime_hours || 0, notes: r.notes || '' }; });
            setSheet(next);
        } catch { setError('Failed to copy from previous day.'); }
    };

    const save = async () => {
        setSaving(true); setSaved(false); setError('');
        try {
            const records = workers.map(w => ({
                worker: w.id, status: sheet[w.id]?.status || 'PRESENT',
                overtime_hours: parseFloat(sheet[w.id]?.overtime_hours || 0),
                notes: sheet[w.id]?.notes || '',
            }));
            await attendanceService.bulkMark({ project: projectId, date, records });
            setSaved(true); setTimeout(() => setSaved(false), 3000);
        } catch { setError('Failed to save attendance.'); }
        finally { setSaving(false); }
    };

    const counts = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LEAVE: 0, HOLIDAY: 0 };
    Object.values(sheet).forEach(r => { if (r?.status) counts[r.status] = (counts[r.status] || 0) + 1; });

    if (!projectId) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>Select a project to mark attendance.</div>
    );

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 10, fontSize: 13, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['PRESENT','ABSENT','HOLIDAY'].map(s => (
                        <button key={s} onClick={() => markAll(s)} style={{
                            padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                            border: `1px solid ${statusMeta[s].color}`, background: statusMeta[s].bg,
                            color: statusMeta[s].color, cursor: 'pointer',
                        }}>Mark All {statusMeta[s].label}</button>
                    ))}
                    <button onClick={copyPrevious} style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                        color: 'var(--t-text3)', cursor: 'pointer',
                    }}>📋 Copy Previous Day</button>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    {saved  && <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>✔ Saved</span>}
                    {error  && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
                    <button onClick={save} disabled={saving || workers.length === 0} style={{
                        padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                        background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1,
                    }}>{saving ? 'Saving…' : '💾 Save Attendance'}</button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map(s => (
                    <div key={s.value} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.color}` }}>
                        {s.label}: {counts[s.value] || 0}
                    </div>
                ))}
                <div style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'var(--t-surface)', color: 'var(--t-text3)', border: '1px solid var(--t-border)' }}>
                    Total: {workers.length}
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>Loading…</div>
            ) : workers.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', borderRadius: 12, background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text3)' }}>
                    No workers added yet. Add workers in the Workers tab first.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: 'var(--t-surface)' }}>
                                {['#','Name','Trade','Status','OT Hours','Notes'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--t-text3)', borderBottom: '2px solid var(--t-border)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {workers.map((w, i) => {
                                const rec = sheet[w.id] || { status: 'PRESENT', overtime_hours: 0, notes: '' };
                                const sm  = statusMeta[rec.status] || statusMeta.PRESENT;
                                return (
                                    <tr key={w.id} style={{ borderBottom: '1px solid var(--t-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                                        <td style={{ padding: '8px 12px', color: 'var(--t-text3)', fontSize: 11 }}>{i + 1}</td>
                                        <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--t-text)' }}>
                                            {w.name}
                                            <span style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px', borderRadius: 6, background: w.worker_type === 'STAFF' ? 'rgba(59,130,246,0.1)' : 'rgba(249,115,22,0.1)', color: w.worker_type === 'STAFF' ? '#3b82f6' : '#f97316' }}>{w.worker_type}</span>
                                        </td>
                                        <td style={{ padding: '8px 12px', color: 'var(--t-text3)', fontSize: 12 }}>{w.trade_display}</td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                {STATUS_OPTIONS.map(s => (
                                                    <button key={s.value} onClick={() => setStatus(w.id, s.value)} style={{
                                                        padding: '4px 8px', borderRadius: 6, fontSize: 11,
                                                        fontWeight: rec.status === s.value ? 800 : 500,
                                                        border: `1px solid ${rec.status === s.value ? s.color : 'var(--t-border)'}`,
                                                        background: rec.status === s.value ? s.bg : 'transparent',
                                                        color: rec.status === s.value ? s.color : 'var(--t-text3)', cursor: 'pointer',
                                                    }}>{s.label}</button>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input type="number" min="0" max="24" step="0.5" value={rec.overtime_hours}
                                                onChange={e => setOT(w.id, e.target.value)}
                                                style={{ width: 70, padding: '4px 8px', borderRadius: 6, fontSize: 12, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)' }} />
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input type="text" value={rec.notes} onChange={e => setNotes(w.id, e.target.value)} placeholder="optional"
                                                style={{ width: 120, padding: '4px 8px', borderRadius: 6, fontSize: 12, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)' }} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function DailySheetTab({ projectId }) {
    const isMobile = useIsMobile();
    return isMobile
        ? <MobileDailySheet projectId={projectId} />
        : <DesktopDailySheet projectId={projectId} />;
}
