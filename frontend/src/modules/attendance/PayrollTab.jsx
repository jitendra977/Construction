import React, { useState, useEffect, useCallback } from 'react';
import attendanceService from '../../services/attendanceService';
import { dashboardService } from '../../services/api';

function thisMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

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

// ── Post to Finance modal (shared, mobile bottom-sheet style) ─────────────────
function PostToFinanceSheet({ totals, projectId, month, onClose }) {
    const [categories,     setCategories]     = useState([]);
    const [fundingSources, setFundingSources] = useState([]);
    const [postData,       setPostData]       = useState({ category: '', funding_source: '' });
    const [posting,        setPosting]        = useState(false);
    const [loadingOpts,    setLoadingOpts]    = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [cats, funds] = await Promise.all([
                    dashboardService.getBudgetCategories(),
                    dashboardService.getFundingSources(),
                ]);
                const catList  = cats.data  || [];
                const fundList = funds.data || [];
                setCategories(catList);
                setFundingSources(fundList);
                const labourCat = catList.find(c => c.name.toLowerCase().includes('labour') || c.name.toLowerCase().includes('wage'));
                setPostData({ category: labourCat ? labourCat.id : '', funding_source: fundList[0]?.id || '' });
            } catch { /* ignore */ }
            finally { setLoadingOpts(false); }
        })();
    }, []);

    const doPost = async () => {
        if (!postData.category) return alert('Please select a budget category.');
        setPosting(true);
        try {
            await attendanceService.postToFinance({ project: projectId, month, category: postData.category, funding_source: postData.funding_source || null });
            alert('Payroll posted to Finance successfully!');
            onClose();
        } catch (e) { alert(e.response?.data?.error || 'Failed to post to finance.'); }
        finally { setPosting(false); }
    };

    return (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background:'var(--t-surface)', borderRadius:'20px 20px 0 0', border:'1px solid var(--t-border)', borderBottom:'none', padding:'16px 16px 36px', width:'100%', maxWidth:480, boxShadow:'0 -12px 60px rgba(0,0,0,0.3)' }}>
                <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-border)', margin:'0 auto 16px' }} />
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <h3 style={{ margin:0, fontSize:16, fontWeight:900, color:'var(--t-text)' }}>💸 Post Payroll as Expense</h3>
                    <button onClick={onClose} style={{ background:'var(--t-surface2)', border:'1px solid var(--t-border)', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:16, color:'var(--t-text3)' }}>✕</button>
                </div>
                <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(16,185,129,0.08)', border:'1px solid #10b98130', marginBottom:14 }}>
                    <div style={{ fontSize:11, color:'#10b981', fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>Amount to Post</div>
                    <div style={{ fontSize:22, fontWeight:900, color:'#10b981' }}>NPR {Math.round(totals.total_wage_bill || 0).toLocaleString()}</div>
                </div>
                {loadingOpts ? (
                    <div style={{ textAlign:'center', padding:'20px 0', color:'var(--t-text3)', fontSize:13 }}>Loading finance options…</div>
                ) : (<>
                    <div style={{ marginBottom:12 }}>
                        <label style={{ fontSize:11, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase', display:'block', marginBottom:4 }}>Budget Category *</label>
                        <select value={postData.category} onChange={e => setPostData(p => ({ ...p, category: e.target.value }))}
                            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:14 }}>
                            <option value="">-- Select Category --</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div style={{ marginBottom:16 }}>
                        <label style={{ fontSize:11, fontWeight:700, color:'var(--t-text3)', textTransform:'uppercase', display:'block', marginBottom:4 }}>Funding Source (Optional)</label>
                        <select value={postData.funding_source} onChange={e => setPostData(p => ({ ...p, funding_source: e.target.value }))}
                            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:14 }}>
                            <option value="">-- Select Source --</option>
                            {fundingSources.map(s => <option key={s.id} value={s.id}>{s.name} (Bal: NPR {Number(s.current_balance).toLocaleString()})</option>)}
                        </select>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                        <button onClick={onClose} style={{ flex:1, padding:'12px', borderRadius:12, fontWeight:700, border:'1px solid var(--t-border)', background:'var(--t-surface2)', color:'var(--t-text)', cursor:'pointer' }}>Cancel</button>
                        <button onClick={doPost} disabled={posting || !postData.category} style={{ flex:2, padding:'12px', borderRadius:12, fontWeight:900, background:'#10b981', color:'#fff', border:'none', cursor:'pointer', opacity:(posting||!postData.category)?0.7:1 }}>
                            {posting ? 'Posting…' : 'Confirm & Post'}
                        </button>
                    </div>
                </>)}
            </div>
        </div>
    );
}

// ── Mobile layout ─────────────────────────────────────────────────────────────
function MobilePayroll({ projectId }) {
    const [month,         setMonth]         = useState(thisMonth());
    const [summary,       setSummary]       = useState(null);
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState('');
    const [showPost,      setShowPost]      = useState(false);
    const [expandedGroup, setExpandedGroup] = useState('LABOUR'); // LABOUR | STAFF

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

    const exportCsv = async () => {
        try {
            const blob = await attendanceService.exportCsv({ project: projectId, month });
            const url  = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url; link.setAttribute('download', `payroll_${month}.csv`);
            document.body.appendChild(link); link.click(); link.remove();
        } catch { alert('Export failed.'); }
    };

    if (!projectId) return (
        <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--t-text3)', fontSize:14 }}>Select a project first.</div>
    );

    const workers = summary?.workers || [];
    const totals  = summary?.totals  || {};

    const labourWorkers = workers.filter(w => w.worker_type === 'LABOUR');
    const staffWorkers  = workers.filter(w => w.worker_type === 'STAFF');
    const labourTotal   = labourWorkers.reduce((s, w) => s + w.grand_total, 0);
    const staffTotal    = staffWorkers.reduce((s,  w) => s + w.grand_total, 0);

    return (
        <div style={{ paddingBottom: 40 }}>
            {/* Month picker */}
            <div style={{ padding:'12px 12px 0', display:'flex', gap:8, alignItems:'center' }}>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                    style={{ flex:1, padding:'10px 12px', borderRadius:10, fontSize:14, border:'1px solid var(--t-border)', background:'var(--t-surface)', color:'var(--t-text)', fontWeight:700 }} />
                <button onClick={load} style={{ padding:'10px 12px', borderRadius:10, fontSize:20, border:'1px solid var(--t-border)', background:'var(--t-surface)', color:'var(--t-text3)', cursor:'pointer' }}>🔄</button>
            </div>

            {error && <div style={{ margin:'8px 12px 0', padding:'8px 12px', borderRadius:8, background:'rgba(239,68,68,0.1)', color:'#ef4444', fontSize:13 }}>{error}</div>}

            {loading ? (
                <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--t-text3)' }}>Calculating payroll…</div>
            ) : workers.length === 0 ? (
                <div style={{ margin:'12px', padding:'32px 20px', textAlign:'center', borderRadius:14, background:'var(--t-surface)', border:'1px solid var(--t-border)', color:'var(--t-text3)', fontSize:13 }}>
                    No attendance data for {month}. Mark attendance first.
                </div>
            ) : (<>
                {/* Summary cards 2×2 */}
                <div style={{ padding:'10px 12px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[
                        { icon:'💰', label:'Total Payroll', val:`NPR ${Math.round(totals.total_wage_bill||0).toLocaleString()}`, color:'#10b981' },
                        { icon:'👷', label:'Labour',        val:`NPR ${Math.round(labourTotal).toLocaleString()}`,              color:'#f97316' },
                        { icon:'👔', label:'Staff',         val:`NPR ${Math.round(staffTotal).toLocaleString()}`,               color:'#3b82f6' },
                        { icon:'👥', label:'Workers',       val:totals.total_workers||0,                                        color:'#8b5cf6' },
                    ].map(c => (
                        <div key={c.label} style={{ padding:'14px 12px', borderRadius:12, background:'var(--t-surface)', border:'1px solid var(--t-border)', textAlign:'center' }}>
                            <div style={{ fontSize:22, marginBottom:4 }}>{c.icon}</div>
                            <div style={{ fontSize:10, color:'var(--t-text3)', fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>{c.label}</div>
                            <div style={{ fontSize:15, fontWeight:900, color:c.color }}>{c.val}</div>
                        </div>
                    ))}
                </div>

                {/* Group toggle */}
                <div style={{ padding:'10px 12px 0', display:'flex', gap:6 }}>
                    {[['LABOUR','👷 Labour'], ['STAFF','👔 Staff']].map(([g, label]) => (
                        <button key={g} onClick={() => setExpandedGroup(g)} style={{
                            flex:1, padding:'8px', borderRadius:8, fontSize:12, fontWeight:800,
                            border:'1px solid var(--t-border)',
                            background: expandedGroup===g ? '#f97316' : 'var(--t-surface)',
                            color: expandedGroup===g ? '#fff' : 'var(--t-text3)', cursor:'pointer',
                        }}>{label} ({(expandedGroup==='LABOUR'?labourWorkers:g==='LABOUR'?labourWorkers:staffWorkers).length === 0 ? 0 : (g==='LABOUR'?labourWorkers:staffWorkers).length})</button>
                    ))}
                </div>

                {/* Worker payroll cards */}
                <div style={{ padding:'10px 12px 0', display:'flex', flexDirection:'column', gap:8 }}>
                    {(expandedGroup==='LABOUR' ? labourWorkers : staffWorkers).length === 0 ? (
                        <div style={{ padding:'20px', textAlign:'center', borderRadius:12, background:'var(--t-surface)', border:'1px solid var(--t-border)', color:'var(--t-text3)', fontSize:13 }}>
                            No {expandedGroup.toLowerCase()} workers for this month.
                        </div>
                    ) : (expandedGroup==='LABOUR' ? labourWorkers : staffWorkers).map(w => (
                        <div key={w.worker_id} style={{ borderRadius:12, border:'1px solid var(--t-border)', background:'var(--t-surface)', padding:'12px 14px' }}>
                            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                                <div>
                                    <div style={{ fontWeight:800, fontSize:14, color:'var(--t-text)' }}>{w.worker_name}</div>
                                    <div style={{ fontSize:11, color:'var(--t-text3)', marginTop:1 }}>{w.trade} · NPR {Number(w.daily_rate).toLocaleString()}/day</div>
                                </div>
                                <div style={{ textAlign:'right' }}>
                                    <div style={{ fontWeight:900, fontSize:16, color:'#10b981' }}>NPR {Math.round(w.grand_total).toLocaleString()}</div>
                                    <div style={{ fontSize:10, color:'var(--t-text3)' }}>total</div>
                                </div>
                            </div>

                            {/* Breakdown row */}
                            <div style={{ display:'flex', gap:6 }}>
                                <div style={{ flex:1, padding:'6px 4px', borderRadius:8, background:'rgba(16,185,129,0.08)', textAlign:'center' }}>
                                    <div style={{ fontSize:11, fontWeight:800, color:'#10b981' }}>NPR {Math.round(w.total_wage).toLocaleString()}</div>
                                    <div style={{ fontSize:9, color:'var(--t-text3)', fontWeight:700 }}>Base ({w.effective_days.toFixed(1)}d)</div>
                                </div>
                                {w.total_overtime_hours > 0 && (
                                    <div style={{ flex:1, padding:'6px 4px', borderRadius:8, background:'rgba(139,92,246,0.08)', textAlign:'center' }}>
                                        <div style={{ fontSize:11, fontWeight:800, color:'#8b5cf6' }}>NPR {Math.round(w.total_overtime_pay).toLocaleString()}</div>
                                        <div style={{ fontSize:9, color:'var(--t-text3)', fontWeight:700 }}>OT ({w.total_overtime_hours.toFixed(1)}h)</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Subtotal */}
                    <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                            <div style={{ fontSize:11, fontWeight:800, color:'#f97316', textTransform:'uppercase' }}>{expandedGroup} Subtotal</div>
                            <div style={{ fontSize:11, color:'var(--t-text3)' }}>{(expandedGroup==='LABOUR'?labourWorkers:staffWorkers).length} workers</div>
                        </div>
                        <div style={{ fontSize:18, fontWeight:900, color:'#f97316' }}>
                            NPR {Math.round(expandedGroup==='LABOUR'?labourTotal:staffTotal).toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Grand total */}
                <div style={{ margin:'10px 12px 0', padding:'16px 14px', borderRadius:14, background:'rgba(16,185,129,0.08)', border:'2px solid #10b981', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                        <div style={{ fontSize:11, fontWeight:800, color:'#10b981', textTransform:'uppercase' }}>Grand Total — {month}</div>
                        <div style={{ fontSize:11, color:'var(--t-text3)', marginTop:2 }}>{totals.total_workers} workers · {totals.days_in_month} days</div>
                    </div>
                    <div style={{ fontSize:20, fontWeight:900, color:'#10b981' }}>NPR {Math.round(totals.total_wage_bill||0).toLocaleString()}</div>
                </div>

                {/* Action buttons */}
                <div style={{ padding:'10px 12px 0', display:'flex', gap:8 }}>
                    <button onClick={exportCsv} style={{ flex:1, padding:'12px', borderRadius:12, fontSize:13, fontWeight:800, border:'1px solid var(--t-border)', background:'var(--t-surface)', color:'var(--t-text)', cursor:'pointer' }}>📥 CSV</button>
                    <button onClick={() => setShowPost(true)} style={{ flex:2, padding:'12px', borderRadius:12, fontSize:13, fontWeight:900, border:'none', background:'#3b82f6', color:'#fff', cursor:'pointer' }}>💸 Post to Finance</button>
                </div>
            </>)}

            {showPost && <PostToFinanceSheet totals={totals} projectId={projectId} month={month} onClose={() => setShowPost(false)} />}
        </div>
    );
}

// ── Desktop layout (original) ─────────────────────────────────────────────────
function DesktopPayroll({ projectId }) {
    const [month,         setMonth]         = useState(thisMonth());
    const [summary,       setSummary]       = useState(null);
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState('');
    const [showPostModal, setShowPostModal] = useState(false);
    const [categories,    setCategories]    = useState([]);
    const [fundingSources,setFundingSources]= useState([]);
    const [postData,      setPostData]      = useState({ category: '', funding_source: '' });
    const [posting,       setPosting]       = useState(false);

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

    const openPostModal = async () => {
        setPosting(true);
        try {
            const [cats, funds] = await Promise.all([dashboardService.getBudgetCategories(), dashboardService.getFundingSources()]);
            setCategories(cats.data || []);
            setFundingSources(funds.data || []);
            const labourCat = (cats.data || []).find(c => c.name.toLowerCase().includes('labour') || c.name.toLowerCase().includes('wage'));
            setPostData({ category: labourCat ? labourCat.id : '', funding_source: funds.data?.[0]?.id || '' });
            setShowPostModal(true);
        } catch { setError('Failed to load finance settings.'); }
        finally { setPosting(false); }
    };

    const doPostToFinance = async () => {
        if (!postData.category) return alert('Please select a budget category.');
        setPosting(true);
        try {
            await attendanceService.postToFinance({ project: projectId, month, category: postData.category, funding_source: postData.funding_source || null });
            alert('Payroll posted to Finance successfully!');
            setShowPostModal(false);
        } catch (e) { alert(e.response?.data?.error || 'Failed to post to finance.'); }
        finally { setPosting(false); }
    };

    if (!projectId) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>Select a project first.</div>
    );

    const workers       = summary?.workers || [];
    const totals        = summary?.totals  || {};
    const labourWorkers = workers.filter(w => w.worker_type === 'LABOUR');
    const staffWorkers  = workers.filter(w => w.worker_type === 'STAFF');
    const labourTotal   = labourWorkers.reduce((s, w) => s + w.grand_total, 0);
    const staffTotal    = staffWorkers.reduce((s,  w) => s + w.grand_total, 0);

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 10, fontSize: 13, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }} />
                <button onClick={load} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', cursor: 'pointer' }}>🔄 Refresh</button>
                <button onClick={async () => {
                    try {
                        const blob = await attendanceService.exportCsv({ project: projectId, month });
                        const url = window.URL.createObjectURL(new Blob([blob]));
                        const link = document.createElement('a');
                        link.href = url; link.setAttribute('download', `payroll_${month}.csv`);
                        document.body.appendChild(link); link.click(); link.remove();
                    } catch { alert('Export failed.'); }
                }} disabled={workers.length === 0} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', cursor: 'pointer', opacity: workers.length === 0 ? 0.5 : 1 }}>
                    📥 Export CSV
                </button>
                <button onClick={openPostModal} disabled={workers.length === 0} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 800, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', opacity: workers.length === 0 ? 0.5 : 1, marginLeft: 'auto' }}>💸 Post to Finance</button>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                        {[
                            { label: 'Total Payroll', value: `NPR ${Math.round(totals.total_wage_bill || 0).toLocaleString()}`, color: '#10b981', icon: '💰' },
                            { label: 'Labour Wages',  value: `NPR ${Math.round(labourTotal).toLocaleString()}`,                color: '#f97316', icon: '👷' },
                            { label: 'Staff Wages',   value: `NPR ${Math.round(staffTotal).toLocaleString()}`,                 color: '#3b82f6', icon: '👔' },
                            { label: 'Total Workers', value: totals.total_workers || 0,                                        color: '#8b5cf6', icon: '👥' },
                        ].map(c => (
                            <div key={c.label} style={{ padding: '18px 16px', borderRadius: 14, background: 'var(--t-surface)', border: '1px solid var(--t-border)', textAlign: 'center' }}>
                                <div style={{ fontSize: 28, marginBottom: 6 }}>{c.icon}</div>
                                <div style={{ fontSize: 11, color: 'var(--t-text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.value}</div>
                            </div>
                        ))}
                    </div>

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
                                            {['Worker','Trade','Daily Rate','Eff. Days','Base Pay','OT hrs','OT Pay','TOTAL'].map(h => (
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
                                                <td style={{ padding: '10px 12px', fontWeight: 900, color: '#10b981', fontSize: 14 }}>NPR {Math.round(w.grand_total).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        <tr style={{ background: 'var(--t-surface)' }}>
                                            <td colSpan={7} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--t-text3)', fontSize: 12, textTransform: 'uppercase' }}>Subtotal</td>
                                            <td style={{ padding: '10px 12px', fontWeight: 900, color: '#10b981', fontSize: 15 }}>NPR {Math.round(total).toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    <div style={{ padding: '20px 24px', borderRadius: 14, background: 'rgba(16,185,129,0.08)', border: '2px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Grand Total Payroll — {month}</div>
                            <div style={{ fontSize: 11, color: 'var(--t-text3)', marginTop: 2 }}>{totals.total_workers} workers · {totals.days_in_month} days in month</div>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981' }}>NPR {Math.round(totals.total_wage_bill || 0).toLocaleString()}</div>
                    </div>
                </>
            )}

            {showPostModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
                    <div style={{ background: 'var(--t-surface)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, border: '1px solid var(--t-border)' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: 'var(--t-text)' }}>💸 Post Payroll as Expense</h3>
                        <p style={{ fontSize: 13, color: 'var(--t-text3)', marginBottom: 20 }}>
                            This will create a new Expense entry for <strong>NPR {Math.round(totals.total_wage_bill).toLocaleString()}</strong>.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase' }}>Budget Category *</label>
                                <select value={postData.category} onChange={e => setPostData(p => ({ ...p, category: e.target.value }))}
                                    style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', fontSize: 13 }}>
                                    <option value="">-- Select Category --</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase' }}>Funding Source (Optional)</label>
                                <select value={postData.funding_source} onChange={e => setPostData(p => ({ ...p, funding_source: e.target.value }))}
                                    style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', fontSize: 13 }}>
                                    <option value="">-- Select Source --</option>
                                    {fundingSources.map(s => <option key={s.id} value={s.id}>{s.name} (Bal: NPR {Number(s.current_balance).toLocaleString()})</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                            <button onClick={() => setShowPostModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, fontWeight: 700, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={doPostToFinance} disabled={posting || !postData.category} style={{ flex: 2, padding: '12px', borderRadius: 12, fontWeight: 800, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', opacity: (posting || !postData.category) ? 0.7 : 1 }}>
                                {posting ? 'Posting…' : 'Confirm & Post'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function PayrollTab({ projectId }) {
    const isMobile = useIsMobile();
    return isMobile
        ? <MobilePayroll projectId={projectId} />
        : <DesktopPayroll projectId={projectId} />;
}
