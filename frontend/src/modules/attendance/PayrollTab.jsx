import React, { useState, useEffect, useCallback } from 'react';
import attendanceService from '../../services/attendanceService';

function thisMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function PayrollTab({ projectId }) {
    const [month, setMonth]     = useState(thisMonth());
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true); setError('');
        try {
            const data = await attendanceService.getMonthlySummary(projectId, month);
            setSummary(data);
        } catch { setError('Failed to load payroll data.'); }
        finally { setLoading(false); }
    }, [projectId, month]);

    useEffect(() => { load(); }, [load]);

    if (!projectId) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>Select a project first.</div>
    );

    const workers = summary?.workers || [];
    const totals  = summary?.totals  || {};

    const labourWorkers = workers.filter(w => w.worker_type === 'LABOUR');
    const staffWorkers  = workers.filter(w => w.worker_type === 'STAFF');

    const labourTotal = labourWorkers.reduce((s, w) => s + w.grand_total, 0);
    const staffTotal  = staffWorkers.reduce((s, w) => s + w.grand_total, 0);

    return (
        <div>
            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 10, fontSize: 13, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }} />
                <button onClick={load} style={{
                    padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', cursor: 'pointer',
                }}>🔄 Refresh</button>
                {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>Calculating payroll…</div>
            ) : workers.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', borderRadius: 12, background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text3)' }}>
                    No attendance data for {month}. Mark attendance first.
                </div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                        {[
                            { label: 'Total Payroll',    value: `NPR ${Math.round(totals.total_wage_bill || 0).toLocaleString()}`, color: '#10b981', icon: '💰' },
                            { label: 'Labour Wages',     value: `NPR ${Math.round(labourTotal).toLocaleString()}`,               color: '#f97316', icon: '👷' },
                            { label: 'Staff Wages',      value: `NPR ${Math.round(staffTotal).toLocaleString()}`,                color: '#3b82f6', icon: '👔' },
                            { label: 'Total Workers',    value: totals.total_workers || 0,                                       color: '#8b5cf6', icon: '👥' },
                        ].map(c => (
                            <div key={c.label} style={{ padding: '18px 16px', borderRadius: 14, background: 'var(--t-surface)', border: '1px solid var(--t-border)', textAlign: 'center' }}>
                                <div style={{ fontSize: 28, marginBottom: 6 }}>{c.icon}</div>
                                <div style={{ fontSize: 11, color: 'var(--t-text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Payroll table */}
                    {[
                        { title: '👷 Daily Labour', list: labourWorkers, total: labourTotal },
                        { title: '👔 Staff',         list: staffWorkers,  total: staffTotal  },
                    ].map(({ title, list, total }) => list.length === 0 ? null : (
                        <div key={title} style={{ marginBottom: 28 }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: 'var(--t-text)' }}>{title}</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--t-surface)' }}>
                                            {['Worker', 'Trade', 'Daily Rate', 'Eff. Days', 'Base Pay', 'OT hrs', 'OT Pay', 'TOTAL'].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--t-text3)', borderBottom: '2px solid var(--t-border)' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.map((w, i) => (
                                            <tr key={w.worker_id} style={{ borderBottom: '1px solid var(--t-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                                                <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--t-text)' }}>{w.worker_name}</td>
                                                <td style={{ padding: '10px 12px', color: 'var(--t-text3)' }}>{w.trade}</td>
                                                <td style={{ padding: '10px 12px', color: 'var(--t-text3)' }}>NPR {Number(w.daily_rate).toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--t-text)' }}>{w.effective_days.toFixed(1)}</td>
                                                <td style={{ padding: '10px 12px', color: 'var(--t-text3)' }}>NPR {Math.round(w.total_wage).toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', color: '#8b5cf6' }}>{w.total_overtime_hours.toFixed(1)}</td>
                                                <td style={{ padding: '10px 12px', color: '#8b5cf6' }}>NPR {Math.round(w.total_overtime_pay).toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', fontWeight: 900, color: '#10b981', fontSize: 14 }}>
                                                    NPR {Math.round(w.grand_total).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr style={{ background: 'var(--t-surface)' }}>
                                            <td colSpan={7} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--t-text3)', fontSize: 12, textTransform: 'uppercase' }}>Subtotal</td>
                                            <td style={{ padding: '10px 12px', fontWeight: 900, color: '#10b981', fontSize: 15 }}>
                                                NPR {Math.round(total).toLocaleString()}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* Grand Total */}
                    <div style={{
                        padding: '20px 24px', borderRadius: 14,
                        background: 'rgba(16,185,129,0.08)', border: '2px solid #10b981',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Grand Total Payroll — {month}</div>
                            <div style={{ fontSize: 11, color: 'var(--t-text3)', marginTop: 2 }}>
                                {totals.total_workers} workers · {totals.days_in_month} days in month
                            </div>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981' }}>
                            NPR {Math.round(totals.total_wage_bill || 0).toLocaleString()}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
