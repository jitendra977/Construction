import React, { useState, useEffect, useCallback } from 'react';
import attendanceService from '../../services/attendanceService';

function thisMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const STATUS_COLORS = {
    PRESENT: '#10b981', ABSENT: '#ef4444',
    HALF_DAY: '#f59e0b', LEAVE: '#8b5cf6', HOLIDAY: '#64748b',
};
const STATUS_SHORT = { PRESENT: 'P', ABSENT: 'A', HALF_DAY: 'H', LEAVE: 'L', HOLIDAY: 'HO' };

export default function MonthlyReportTab({ projectId }) {
    const [month, setMonth]     = useState(thisMonth());
    const [summary, setSummary] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');
    const [view, setView]       = useState('table'); // table | grid

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true); setError('');
        try {
            const [sum, recs] = await Promise.all([
                attendanceService.getMonthlySummary(projectId, month),
                attendanceService.getRecords({ project: projectId, month }),
            ]);
            setSummary(sum);
            setRecords(Array.isArray(recs) ? recs : recs.results || []);
        } catch { setError('Failed to load monthly data.'); }
        finally { setLoading(false); }
    }, [projectId, month]);

    useEffect(() => { load(); }, [load]);

    // Build day-by-day grid: workerName → {date: status}
    const buildGrid = () => {
        const [y, m] = month.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const map = {};
        records.forEach(r => {
            const wname = r.worker_name;
            if (!map[wname]) map[wname] = {};
            const day = parseInt(r.date.split('-')[2]);
            map[wname][day] = r.status;
        });
        return { days, map };
    };

    if (!projectId) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>Select a project first.</div>
    );

    const { days, map } = buildGrid();

    return (
        <div>
            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 10, fontSize: 13, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }} />
                <div style={{ display: 'flex', gap: 4 }}>
                    {['table', 'grid'].map(v => (
                        <button key={v} onClick={() => setView(v)} style={{
                            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            border: '1px solid var(--t-border)',
                            background: view === v ? '#f97316' : 'var(--t-surface)',
                            color: view === v ? '#fff' : 'var(--t-text)', cursor: 'pointer',
                        }}>{v === 'table' ? '📋 Summary' : '📅 Grid'}</button>
                    ))}
                </div>
                {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>Loading…</div>
            ) : !summary || summary.workers?.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', borderRadius: 12, background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text3)' }}>
                    No attendance recorded for {month}.
                </div>
            ) : view === 'table' ? (
                <>
                        {/* Totals banner */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                            {[
                                ['👷', 'Workers', summary.totals.total_workers, '#f97316'],
                                ['📅', 'Days in Month', summary.totals.days_in_month, '#3b82f6'],
                                ['💰', 'Total Wage Bill', `NPR ${Number(summary.totals.total_wage_bill).toLocaleString()}`, '#10b981'],
                            ].map(([icon, label, val, color]) => (
                                <div key={label} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--t-surface)', border: '1px solid var(--t-border)', textAlign: 'center' }}>
                                    <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                                    <div style={{ fontSize: 11, color: 'var(--t-text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color }}>{val}</div>
                                </div>
                            ))}
                        </div>

                        {/* Status Distribution Chart */}
                        <div style={{ background: 'var(--t-surface)', padding: 20, borderRadius: 16, border: '1px solid var(--t-border)', marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--t-text)' }}>📊 Monthly Attendance Distribution</h4>
                                <span style={{ fontSize: 11, color: 'var(--t-text3)', fontWeight: 700 }}>{month} Overview</span>
                            </div>
                            
                            {(() => {
                                const stats = summary.workers.reduce((acc, w) => {
                                    acc.PRESENT += w.days_present;
                                    acc.ABSENT += w.days_absent;
                                    acc.HALF_DAY += w.days_half;
                                    acc.LEAVE += w.days_leave;
                                    acc.HOLIDAY += (summary.totals.days_in_month - (w.days_present + w.days_absent + w.days_half + w.days_leave));
                                    return acc;
                                }, { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LEAVE: 0, HOLIDAY: 0 });

                                const total = Object.values(stats).reduce((a, b) => a + b, 0);

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ height: 28, display: 'flex', borderRadius: 14, overflow: 'hidden', background: 'var(--t-bg)' }}>
                                            {Object.entries(stats).map(([st, val]) => {
                                                const pct = (val / total) * 100;
                                                if (pct <= 0) return null;
                                                return (
                                                    <div 
                                                        key={st} 
                                                        title={`${st}: ${val} days (${pct.toFixed(1)}%)`}
                                                        style={{ width: `${pct}%`, background: STATUS_COLORS[st], transition: 'width 0.5s ease' }} 
                                                    />
                                                );
                                            })}
                                        </div>
                                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            {Object.entries(stats).map(([st, val]) => (
                                                <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[st] }} />
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text)' }}>{st}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--t-text3)' }}>{val} days</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                    {/* Worker summary table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: 'var(--t-surface)' }}>
                                    {['Worker', 'Trade', 'P', 'A', 'H', 'L', 'Eff. Days', 'OT hrs', 'Base Wage', 'OT Pay', 'Total'].map(h => (
                                        <th key={h} style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--t-text3)', borderBottom: '2px solid var(--t-border)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {summary.workers.map((w, i) => (
                                    <tr key={w.worker_id} style={{ borderBottom: '1px solid var(--t-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                                        <td style={{ padding: '9px 10px', fontWeight: 700, color: 'var(--t-text)' }}>
                                            {w.worker_name}
                                            <span style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px', borderRadius: 6, background: w.worker_type === 'STAFF' ? 'rgba(59,130,246,0.1)' : 'rgba(249,115,22,0.1)', color: w.worker_type === 'STAFF' ? '#3b82f6' : '#f97316' }}>{w.worker_type}</span>
                                        </td>
                                        <td style={{ padding: '9px 10px', color: 'var(--t-text3)' }}>{w.trade}</td>
                                        <td style={{ padding: '9px 10px', color: '#10b981', fontWeight: 700 }}>{w.days_present}</td>
                                        <td style={{ padding: '9px 10px', color: '#ef4444', fontWeight: 700 }}>{w.days_absent}</td>
                                        <td style={{ padding: '9px 10px', color: '#f59e0b', fontWeight: 700 }}>{w.days_half}</td>
                                        <td style={{ padding: '9px 10px', color: '#8b5cf6', fontWeight: 700 }}>{w.days_leave}</td>
                                        <td style={{ padding: '9px 10px', fontWeight: 700, color: 'var(--t-text)' }}>{w.effective_days.toFixed(1)}</td>
                                        <td style={{ padding: '9px 10px', color: 'var(--t-text3)' }}>{w.total_overtime_hours.toFixed(1)}</td>
                                        <td style={{ padding: '9px 10px', color: 'var(--t-text3)' }}>NPR {Math.round(w.total_wage).toLocaleString()}</td>
                                        <td style={{ padding: '9px 10px', color: '#8b5cf6' }}>NPR {Math.round(w.total_overtime_pay).toLocaleString()}</td>
                                        <td style={{ padding: '9px 10px', fontWeight: 800, color: '#10b981' }}>NPR {Math.round(w.grand_total).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {/* Totals row */}
                                <tr style={{ background: 'var(--t-surface)', fontWeight: 800 }}>
                                    <td colSpan={10} style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--t-text3)', fontSize: 12, textTransform: 'uppercase' }}>Grand Total</td>
                                    <td style={{ padding: '10px 10px', fontWeight: 900, color: '#10b981', fontSize: 14 }}>
                                        NPR {Math.round(summary.totals.total_wage_bill).toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                /* Grid view */
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 800 }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: 'var(--t-text3)', borderBottom: '2px solid var(--t-border)', minWidth: 140 }}>Worker</th>
                                {days.map(d => (
                                    <th key={d} style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: 'var(--t-text3)', borderBottom: '2px solid var(--t-border)', minWidth: 28 }}>{d}</th>
                                ))}
                                <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--t-text3)', borderBottom: '2px solid var(--t-border)' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.workers.map((w, i) => {
                                const wmap = map[w.worker_name] || {};
                                return (
                                    <tr key={w.worker_id} style={{ borderBottom: '1px solid var(--t-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                                        <td style={{ padding: '7px 12px', fontWeight: 700, color: 'var(--t-text)', whiteSpace: 'nowrap' }}>{w.worker_name}</td>
                                        {days.map(d => {
                                            const st = wmap[d];
                                            return (
                                                <td key={d} style={{ padding: '4px', textAlign: 'center' }}>
                                                    {st ? (
                                                        <span style={{
                                                            display: 'inline-block', width: 22, height: 22, lineHeight: '22px',
                                                            borderRadius: 4, fontSize: 9, fontWeight: 800,
                                                            background: `${STATUS_COLORS[st]}20`,
                                                            color: STATUS_COLORS[st],
                                                        }}>
                                                            {STATUS_SHORT[st]}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--t-border)', fontSize: 10 }}>·</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800, color: '#10b981', whiteSpace: 'nowrap' }}>
                                            {w.days_present}P {w.days_half > 0 ? `${w.days_half}H` : ''} {w.days_absent > 0 ? `${w.days_absent}A` : ''}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                        {Object.entries(STATUS_SHORT).map(([st, sh]) => (
                            <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                                <span style={{ display: 'inline-block', width: 18, height: 18, lineHeight: '18px', textAlign: 'center', borderRadius: 3, fontSize: 9, fontWeight: 800, background: `${STATUS_COLORS[st]}20`, color: STATUS_COLORS[st] }}>{sh}</span>
                                <span style={{ color: 'var(--t-text3)' }}>{st.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
