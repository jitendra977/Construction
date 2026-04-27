import React, { useState, useEffect, useCallback } from 'react';
import attendanceService from '../../services/attendanceService';

const STATUS_OPTIONS = [
    { value: 'PRESENT',  label: 'Present',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { value: 'ABSENT',   label: 'Absent',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
    { value: 'HALF_DAY', label: 'Half Day', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { value: 'LEAVE',    label: 'Leave',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    { value: 'HOLIDAY',  label: 'Holiday',  color: '#64748b', bg: 'rgba(100,116,139,0.12)'},
];

const statusMeta = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]));

function today() {
    return new Date().toISOString().split('T')[0];
}

export default function DailySheetTab({ projectId }) {
    const [date, setDate]       = useState(today());
    const [workers, setWorkers] = useState([]);
    const [sheet, setSheet]     = useState({});   // workerId → {status, overtime_hours, notes}
    const [loading, setLoading] = useState(false);
    const [saving, setSaving]   = useState(false);
    const [saved, setSaved]     = useState(false);
    const [error, setError]     = useState('');

    // Load workers + today's existing records
    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError('');
        try {
            const [ws, recs] = await Promise.all([
                attendanceService.getWorkers({ project: projectId, active: 'true' }),
                attendanceService.getRecords({ project: projectId, date }),
            ]);
            const list = Array.isArray(ws) ? ws : ws.results || [];
            setWorkers(list);

            // Build sheet from existing records; fill missing with PRESENT defaults
            const recMap = {};
            (Array.isArray(recs) ? recs : recs.results || []).forEach(r => {
                recMap[r.worker] = {
                    status: r.status,
                    overtime_hours: r.overtime_hours || 0,
                    notes: r.notes || '',
                };
            });
            const initial = {};
            list.forEach(w => {
                initial[w.id] = recMap[w.id] || { status: 'PRESENT', overtime_hours: 0, notes: '' };
            });
            setSheet(initial);
        } catch (e) {
            setError('Failed to load attendance data.');
        } finally {
            setLoading(false);
        }
    }, [projectId, date]);

    useEffect(() => { load(); }, [load]);

    const setStatus = (wid, status) =>
        setSheet(s => ({ ...s, [wid]: { ...s[wid], status } }));

    const setOT = (wid, val) =>
        setSheet(s => ({ ...s, [wid]: { ...s[wid], overtime_hours: val } }));

    const setNotes = (wid, val) =>
        setSheet(s => ({ ...s, [wid]: { ...s[wid], notes: val } }));

    const markAll = (status) => {
        const next = {};
        workers.forEach(w => { next[w.id] = { ...sheet[w.id], status }; });
        setSheet(next);
    };

    const save = async () => {
        setSaving(true); setSaved(false); setError('');
        try {
            const records = workers.map(w => ({
                worker: w.id,
                status: sheet[w.id]?.status || 'PRESENT',
                overtime_hours: parseFloat(sheet[w.id]?.overtime_hours || 0),
                notes: sheet[w.id]?.notes || '',
            }));
            await attendanceService.bulkMark({ project: projectId, date, records });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            setError('Failed to save attendance.');
        } finally {
            setSaving(false);
        }
    };

    // Summary counts
    const counts = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LEAVE: 0, HOLIDAY: 0 };
    Object.values(sheet).forEach(r => { if (r?.status) counts[r.status] = (counts[r.status] || 0) + 1; });

    if (!projectId) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>
            Select a project to mark attendance.
        </div>
    );

    return (
        <div>
            {/* ── Header controls ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    style={{
                        padding: '8px 12px', borderRadius: 10, fontSize: 13,
                        border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                        color: 'var(--t-text)',
                    }}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['PRESENT', 'ABSENT', 'HOLIDAY'].map(s => (
                        <button key={s} onClick={() => markAll(s)} style={{
                            padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                            border: `1px solid ${statusMeta[s].color}`,
                            background: statusMeta[s].bg, color: statusMeta[s].color, cursor: 'pointer',
                        }}>
                            Mark All {statusMeta[s].label}
                        </button>
                    ))}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    {saved && <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>✔ Saved</span>}
                    {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
                    <button onClick={save} disabled={saving || workers.length === 0} style={{
                        padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                        background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer',
                        opacity: saving ? 0.7 : 1,
                    }}>
                        {saving ? 'Saving…' : '💾 Save Attendance'}
                    </button>
                </div>
            </div>

            {/* ── Summary pills ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map(s => (
                    <div key={s.value} style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: s.bg, color: s.color, border: `1px solid ${s.color}`,
                    }}>
                        {s.label}: {counts[s.value] || 0}
                    </div>
                ))}
                <div style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: 'var(--t-surface)', color: 'var(--t-text3)',
                    border: '1px solid var(--t-border)',
                }}>
                    Total: {workers.length}
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>Loading…</div>
            ) : workers.length === 0 ? (
                <div style={{
                    padding: 40, textAlign: 'center', borderRadius: 12,
                    background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                    color: 'var(--t-text3)',
                }}>
                    No workers added yet. Add workers in the Workers tab first.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: 'var(--t-surface)' }}>
                                {['#', 'Name', 'Trade', 'Status', 'OT Hours', 'Notes'].map(h => (
                                    <th key={h} style={{
                                        padding: '10px 12px', textAlign: 'left',
                                        fontWeight: 800, fontSize: 11, textTransform: 'uppercase',
                                        letterSpacing: '0.05em', color: 'var(--t-text3)',
                                        borderBottom: '2px solid var(--t-border)',
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {workers.map((w, i) => {
                                const rec = sheet[w.id] || { status: 'PRESENT', overtime_hours: 0, notes: '' };
                                const sm = statusMeta[rec.status] || statusMeta.PRESENT;
                                return (
                                    <tr key={w.id} style={{
                                        borderBottom: '1px solid var(--t-border)',
                                        background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                                    }}>
                                        <td style={{ padding: '8px 12px', color: 'var(--t-text3)', fontSize: 11 }}>{i + 1}</td>
                                        <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--t-text)' }}>
                                            {w.name}
                                            <span style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px', borderRadius: 6,
                                                background: w.worker_type === 'STAFF' ? 'rgba(59,130,246,0.1)' : 'rgba(249,115,22,0.1)',
                                                color: w.worker_type === 'STAFF' ? '#3b82f6' : '#f97316',
                                            }}>{w.worker_type}</span>
                                        </td>
                                        <td style={{ padding: '8px 12px', color: 'var(--t-text3)', fontSize: 12 }}>{w.trade_display}</td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                {STATUS_OPTIONS.map(s => (
                                                    <button key={s.value}
                                                        onClick={() => setStatus(w.id, s.value)}
                                                        style={{
                                                            padding: '4px 8px', borderRadius: 6, fontSize: 11,
                                                            fontWeight: rec.status === s.value ? 800 : 500,
                                                            border: `1px solid ${rec.status === s.value ? s.color : 'var(--t-border)'}`,
                                                            background: rec.status === s.value ? s.bg : 'transparent',
                                                            color: rec.status === s.value ? s.color : 'var(--t-text3)',
                                                            cursor: 'pointer',
                                                        }}>
                                                        {s.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input
                                                type="number" min="0" max="24" step="0.5"
                                                value={rec.overtime_hours}
                                                onChange={e => setOT(w.id, e.target.value)}
                                                style={{
                                                    width: 70, padding: '4px 8px', borderRadius: 6, fontSize: 12,
                                                    border: '1px solid var(--t-border)', background: 'var(--t-bg)',
                                                    color: 'var(--t-text)',
                                                }}
                                            />
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input
                                                type="text"
                                                value={rec.notes}
                                                onChange={e => setNotes(w.id, e.target.value)}
                                                placeholder="optional"
                                                style={{
                                                    width: 120, padding: '4px 8px', borderRadius: 6, fontSize: 12,
                                                    border: '1px solid var(--t-border)', background: 'var(--t-bg)',
                                                    color: 'var(--t-text)',
                                                }}
                                            />
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
