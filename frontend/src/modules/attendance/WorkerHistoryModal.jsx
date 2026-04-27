import React, { useState, useEffect } from 'react';
import attendanceService from '../../services/attendanceService';

const STATUS_COLORS = {
    PRESENT: '#10b981', ABSENT: '#ef4444',
    HALF_DAY: '#f59e0b', LEAVE: '#8b5cf6', HOLIDAY: '#64748b',
};

export default function WorkerHistoryModal({ workerId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!workerId) return;
        setLoading(true);
        attendanceService.getWorkerHistory(workerId)
            .then(setData)
            .catch(() => setError('Failed to load history.'))
            .finally(() => setLoading(false));
    }, [workerId]);

    if (!workerId) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16,
        }}>
            <div style={{
                background: 'var(--t-surface)', borderRadius: 16, padding: 28,
                width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto',
                border: '1px solid var(--t-border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--t-text)' }}>
                        🕒 Work History: {data?.worker || '…'}
                    </h3>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--t-text3)',
                    }}>✕</button>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>Loading history…</div>
                ) : error ? (
                    <div style={{ padding: 20, color: '#ef4444', textAlign: 'center' }}>{error}</div>
                ) : (
                    <>
                        {/* Stats Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                            {[
                                { label: 'Total Days', value: data.stats.total_days, color: '#3b82f6' },
                                { label: 'Total OT Hrs', value: data.stats.total_ot || 0, color: '#8b5cf6' },
                                { label: 'Total Earned', value: `NPR ${Math.round(data.stats.total_wage || 0).toLocaleString()}`, color: '#10b981' },
                            ].map(s => (
                                <div key={s.label} style={{ padding: '12px', borderRadius: 12, background: 'var(--t-bg)', border: '1px solid var(--t-border)', textAlign: 'center' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* History Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: 'var(--t-bg)' }}>
                                        {['Date', 'Status', 'Wage', 'OT', 'Notes'].map(h => (
                                            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, fontSize: 11, color: 'var(--t-text3)', borderBottom: '1px solid var(--t-border)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.records.map((r, i) => (
                                        <tr key={r.id} style={{ borderBottom: '1px solid var(--t-border)' }}>
                                            <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--t-text)' }}>{r.date}</td>
                                            <td style={{ padding: '8px 10px' }}>
                                                <span style={{
                                                    padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                                                    background: `${STATUS_COLORS[r.status]}20`, color: STATUS_COLORS[r.status]
                                                }}>{r.status}</span>
                                            </td>
                                            <td style={{ padding: '8px 10px', color: 'var(--t-text)' }}>NPR {Math.round(r.wage_earned).toLocaleString()}</td>
                                            <td style={{ padding: '8px 10px', color: '#8b5cf6' }}>{r.overtime_hours > 0 ? `${r.overtime_hours}h` : '—'}</td>
                                            <td style={{ padding: '8px 10px', color: 'var(--t-text3)', fontSize: 12 }}>{r.notes || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {data.records.length === 0 && (
                                <div style={{ padding: 20, textAlign: 'center', color: 'var(--t-text3)' }}>No records found.</div>
                            )}
                        </div>
                    </>
                )}

                <div style={{ marginTop: 24, textAlign: 'right' }}>
                    <button onClick={onClose} style={{
                        padding: '10px 24px', borderRadius: 10, fontWeight: 700,
                        border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', cursor: 'pointer',
                    }}>Close</button>
                </div>
            </div>
        </div>
    );
}
