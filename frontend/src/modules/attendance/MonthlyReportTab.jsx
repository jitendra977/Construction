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
function useMonthlyData(projectId, month) {
    const [summary, setSummary] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');

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
    return { summary, records, loading, error };
}

// ── Mobile layout ─────────────────────────────────────────────────────────────
function MobileMonthlyReport({ projectId }) {
    const [month,    setMonth]   = useState(thisMonth());
    const [view,     setView]    = useState('summary'); // summary | workers | grid
    const { summary, records, loading, error } = useMonthlyData(projectId, month);

    if (!projectId) return (
        <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--t-text3)', fontSize:14 }}>Select a project first.</div>
    );

    const workers = summary?.workers || [];
    const totals  = summary?.totals  || {};

    // Build day grid
    const buildGrid = () => {
        const [y, m] = month.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const map = {};
        records.forEach(r => {
            if (!map[r.worker_name]) map[r.worker_name] = {};
            map[r.worker_name][parseInt(r.date.split('-')[2])] = r.status;
        });
        return { days, map };
    };

    const stats = workers.reduce((acc, w) => {
        acc.PRESENT  += w.days_present;
        acc.ABSENT   += w.days_absent;
        acc.HALF_DAY += w.days_half;
        acc.LEAVE    += w.days_leave;
        return acc;
    }, { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LEAVE: 0 });
    const statsTotal = Object.values(stats).reduce((a, b) => a + b, 0);

    return (
        <div style={{ paddingBottom: 40 }}>
            {/* Controls */}
            <div style={{ padding: '12px 12px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontWeight: 700 }} />
            </div>

            {/* View toggle pills */}
            <div style={{ padding: '8px 12px 0', display: 'flex', gap: 6 }}>
                {[['summary','📊 Summary'], ['workers','👷 Workers'], ['grid','📅 Grid']].map(([v, label]) => (
                    <button key={v} onClick={() => setView(v)} style={{
                        flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                        border: '1px solid var(--t-border)',
                        background: view === v ? '#f97316' : 'var(--t-surface)',
                        color: view === v ? '#fff' : 'var(--t-text3)', cursor: 'pointer',
                    }}>{label}</button>
                ))}
            </div>

            {error && <div style={{ margin:'8px 12px 0', padding:'8px 12px', borderRadius:8, background:'rgba(239,68,68,0.1)', color:'#ef4444', fontSize:13 }}>{error}</div>}

            {loading ? (
                <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--t-text3)' }}>Loading…</div>
            ) : !summary || workers.length === 0 ? (
                <div style={{ margin:'12px', padding:'32px 20px', textAlign:'center', borderRadius:14, background:'var(--t-surface)', border:'1px solid var(--t-border)', color:'var(--t-text3)', fontSize:13 }}>
                    No attendance recorded for {month}.
                </div>
            ) : view === 'summary' ? (
                <div style={{ padding: '10px 12px 0' }}>
                    {/* KPI cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                        {[
                            { icon:'👷', label:'Workers',      val: totals.total_workers,                                                              color:'#f97316' },
                            { icon:'📅', label:'Days',         val: totals.days_in_month,                                                              color:'#3b82f6' },
                            { icon:'💰', label:'Wage Bill',    val: `NPR ${Math.round(totals.total_wage_bill||0).toLocaleString()}`,                  color:'#10b981' },
                            { icon:'⏱️', label:'Avg Attend.',  val: workers.length ? `${(stats.PRESENT/workers.length).toFixed(1)}d` : '—',          color:'#8b5cf6' },
                        ].map(c => (
                            <div key={c.label} style={{ padding:'14px 12px', borderRadius:12, background:'var(--t-surface)', border:'1px solid var(--t-border)', textAlign:'center' }}>
                                <div style={{ fontSize:22, marginBottom:4 }}>{c.icon}</div>
                                <div style={{ fontSize:10, color:'var(--t-text3)', fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>{c.label}</div>
                                <div style={{ fontSize:16, fontWeight:900, color:c.color }}>{c.val}</div>
                            </div>
                        ))}
                    </div>

                    {/* Attendance distribution bar */}
                    <div style={{ background:'var(--t-surface)', borderRadius:14, border:'1px solid var(--t-border)', padding:'14px 14px', marginBottom:14 }}>
                        <div style={{ fontSize:12, fontWeight:800, color:'var(--t-text)', marginBottom:10 }}>📊 Monthly Distribution</div>
                        <div style={{ height:20, display:'flex', borderRadius:10, overflow:'hidden', background:'var(--t-bg)', marginBottom:10 }}>
                            {Object.entries(stats).map(([st, val]) => {
                                const pct = statsTotal > 0 ? (val / statsTotal) * 100 : 0;
                                if (pct <= 0) return null;
                                return <div key={st} title={`${st}: ${val}`} style={{ width:`${pct}%`, background:STATUS_COLORS[st] }} />;
                            })}
                        </div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                            {Object.entries(stats).map(([st, val]) => (
                                <div key={st} style={{ display:'flex', alignItems:'center', gap:4 }}>
                                    <div style={{ width:8, height:8, borderRadius:'50%', background:STATUS_COLORS[st] }} />
                                    <span style={{ fontSize:10, fontWeight:700, color:'var(--t-text3)' }}>{st.replace('_',' ')} {val}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top earner highlight */}
                    {workers.length > 0 && (() => {
                        const top = [...workers].sort((a,b) => b.grand_total - a.grand_total)[0];
                        return (
                            <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid #10b98130', borderRadius:14, padding:'12px 14px' }}>
                                <div style={{ fontSize:10, fontWeight:800, color:'#10b981', textTransform:'uppercase', marginBottom:6 }}>💰 Total Payroll Summary</div>
                                <div style={{ fontSize:22, fontWeight:900, color:'#10b981' }}>NPR {Math.round(totals.total_wage_bill||0).toLocaleString()}</div>
                                <div style={{ fontSize:11, color:'var(--t-text3)', marginTop:3 }}>{totals.total_workers} workers · {totals.days_in_month} days</div>
                            </div>
                        );
                    })()}
                </div>
            ) : view === 'workers' ? (
                <div style={{ padding:'10px 12px 0', display:'flex', flexDirection:'column', gap:8 }}>
                    {workers.map(w => (
                        <div key={w.worker_id} style={{ borderRadius:12, border:'1px solid var(--t-border)', background:'var(--t-surface)', padding:'12px 14px' }}>
                            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                                <div>
                                    <div style={{ fontWeight:800, fontSize:14, color:'var(--t-text)', display:'flex', alignItems:'center', gap:6 }}>
                                        {w.worker_name}
                                        <span style={{ padding:'1px 6px', borderRadius:5, fontSize:9, fontWeight:800, background:w.worker_type==='STAFF'?'rgba(59,130,246,0.1)':'rgba(249,115,22,0.1)', color:w.worker_type==='STAFF'?'#3b82f6':'#f97316' }}>{w.worker_type}</span>
                                    </div>
                                    <div style={{ fontSize:11, color:'var(--t-text3)', marginTop:1 }}>{w.trade}</div>
                                </div>
                                <div style={{ textAlign:'right' }}>
                                    <div style={{ fontWeight:900, fontSize:15, color:'#10b981' }}>NPR {Math.round(w.grand_total).toLocaleString()}</div>
                                    <div style={{ fontSize:10, color:'var(--t-text3)' }}>{w.effective_days.toFixed(1)} eff. days</div>
                                </div>
                            </div>
                            {/* Status mini pills */}
                            <div style={{ display:'flex', gap:6 }}>
                                {[
                                    { label:'P', val:w.days_present, color:'#10b981' },
                                    { label:'A', val:w.days_absent,  color:'#ef4444' },
                                    { label:'H', val:w.days_half,    color:'#f59e0b' },
                                    { label:'L', val:w.days_leave,   color:'#8b5cf6' },
                                ].map(s => (
                                    <div key={s.label} style={{ flex:1, textAlign:'center', padding:'4px 2px', borderRadius:7, background:`${s.color}15`, border:`1px solid ${s.color}30` }}>
                                        <div style={{ fontWeight:900, fontSize:14, color:s.color }}>{s.val}</div>
                                        <div style={{ fontSize:9, fontWeight:800, color:s.color }}>{s.label}</div>
                                    </div>
                                ))}
                                <div style={{ flex:1, textAlign:'center', padding:'4px 2px', borderRadius:7, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.2)' }}>
                                    <div style={{ fontWeight:900, fontSize:14, color:'#8b5cf6' }}>{w.total_overtime_hours.toFixed(0)}</div>
                                    <div style={{ fontSize:9, fontWeight:800, color:'#8b5cf6' }}>OT</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {/* Grand total row */}
                    <div style={{ background:'rgba(16,185,129,0.08)', border:'2px solid #10b981', borderRadius:12, padding:'14px', textAlign:'center' }}>
                        <div style={{ fontSize:11, fontWeight:800, color:'#10b981', marginBottom:4 }}>GRAND TOTAL</div>
                        <div style={{ fontSize:24, fontWeight:900, color:'#10b981' }}>NPR {Math.round(totals.total_wage_bill||0).toLocaleString()}</div>
                    </div>
                </div>
            ) : (
                /* Grid view — horizontal scroll */
                (() => {
                    const { days, map } = buildGrid();
                    return (
                        <div style={{ padding:'10px 12px 0' }}>
                            <div style={{ fontSize:11, color:'var(--t-text3)', marginBottom:8, fontWeight:700 }}>
                                Swipe → to see all days &nbsp;·&nbsp; P=Present A=Absent H=Half L=Leave
                            </div>
                            <div style={{ overflowX:'auto', borderRadius:12, border:'1px solid var(--t-border)' }}>
                                <table style={{ borderCollapse:'collapse', fontSize:10, minWidth: `${140 + days.length * 28}px` }}>
                                    <thead>
                                        <tr style={{ background:'var(--t-surface)' }}>
                                            <th style={{ padding:'8px 10px', textAlign:'left', fontWeight:800, color:'var(--t-text3)', borderBottom:'1px solid var(--t-border)', minWidth:120, position:'sticky', left:0, background:'var(--t-surface)' }}>Worker</th>
                                            {days.map(d => (
                                                <th key={d} style={{ padding:'6px 3px', textAlign:'center', fontWeight:700, color:'var(--t-text3)', borderBottom:'1px solid var(--t-border)', minWidth:24 }}>{d}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workers.map((w, i) => {
                                            const wmap = map[w.worker_name] || {};
                                            return (
                                                <tr key={w.worker_id} style={{ borderBottom:'1px solid var(--t-border)', background:i%2===0?'transparent':'rgba(0,0,0,0.02)' }}>
                                                    <td style={{ padding:'6px 10px', fontWeight:700, color:'var(--t-text)', whiteSpace:'nowrap', position:'sticky', left:0, background:i%2===0?'var(--t-surface)':'var(--t-surface)', fontSize:11 }}>{w.worker_name}</td>
                                                    {days.map(d => {
                                                        const st = wmap[d];
                                                        return (
                                                            <td key={d} style={{ padding:'3px', textAlign:'center' }}>
                                                                {st ? (
                                                                    <span style={{ display:'inline-block', width:20, height:20, lineHeight:'20px', borderRadius:3, fontSize:8, fontWeight:800, background:`${STATUS_COLORS[st]}20`, color:STATUS_COLORS[st] }}>
                                                                        {STATUS_SHORT[st]}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ color:'var(--t-border)', fontSize:8 }}>·</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })()
            )}
        </div>
    );
}

// ── Desktop layout (original) ─────────────────────────────────────────────────
function DesktopMonthlyReport({ projectId }) {
    const [month, setMonth] = useState(thisMonth());
    const [view,  setView]  = useState('table');
    const { summary, records, loading, error } = useMonthlyData(projectId, month);

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

                    <div style={{ background: 'var(--t-surface)', padding: 20, borderRadius: 16, border: '1px solid var(--t-border)', marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--t-text)' }}>📊 Monthly Attendance Distribution</h4>
                            <span style={{ fontSize: 11, color: 'var(--t-text3)', fontWeight: 700 }}>{month} Overview</span>
                        </div>
                        {(() => {
                            const stats = summary.workers.reduce((acc, w) => {
                                acc.PRESENT  += w.days_present;
                                acc.ABSENT   += w.days_absent;
                                acc.HALF_DAY += w.days_half;
                                acc.LEAVE    += w.days_leave;
                                acc.HOLIDAY  += (summary.totals.days_in_month - (w.days_present + w.days_absent + w.days_half + w.days_leave));
                                return acc;
                            }, { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LEAVE: 0, HOLIDAY: 0 });
                            const total = Object.values(stats).reduce((a, b) => a + b, 0);
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ height: 28, display: 'flex', borderRadius: 14, overflow: 'hidden', background: 'var(--t-bg)' }}>
                                        {Object.entries(stats).map(([st, val]) => {
                                            const pct = (val / total) * 100;
                                            if (pct <= 0) return null;
                                            return <div key={st} title={`${st}: ${val} days (${pct.toFixed(1)}%)`} style={{ width: `${pct}%`, background: STATUS_COLORS[st], transition: 'width 0.5s ease' }} />;
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
                                                        <span style={{ display: 'inline-block', width: 22, height: 22, lineHeight: '22px', borderRadius: 4, fontSize: 9, fontWeight: 800, background: `${STATUS_COLORS[st]}20`, color: STATUS_COLORS[st] }}>
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

// ── Main export ───────────────────────────────────────────────────────────────
export default function MonthlyReportTab({ projectId }) {
    const isMobile = useIsMobile();
    return isMobile
        ? <MobileMonthlyReport projectId={projectId} />
        : <DesktopMonthlyReport projectId={projectId} />;
}
