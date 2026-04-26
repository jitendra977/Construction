/**
 * ActivityPage — activity / audit log viewer with filters and detail drawer.
 */
import { useState, useEffect, useMemo } from 'react';
import { useAccounts } from '../context/AccountsContext';
import accountsApi from '../services/accountsApi';
import Avatar from '../components/shared/Avatar';
import Badge from '../components/shared/Badge';

const ACTION_COLORS = {
    CREATE: '#10b981', UPDATE: '#3b82f6', DELETE: '#ef4444',
    VIEW: '#6b7280', LOGIN: '#6366f1', LOGOUT: '#f59e0b',
    APPROVE: '#10b981', REJECT: '#ef4444', PAY: '#f97316',
};
const ACTION_ICONS = {
    CREATE:'➕', UPDATE:'✏️', DELETE:'🗑️', VIEW:'👁️',
    LOGIN:'🔑', LOGOUT:'🚪', APPROVE:'✅', REJECT:'❌', PAY:'💰',
};

const fmt = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
};
const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

export default function ActivityPage() {
    const { users } = useAccounts();
    const [logs,     setLogs]     = useState([]);
    const [loading,  setLoading]  = useState(false);
    const [selected, setSelected] = useState(null);

    // Filters
    const [search,     setSearch]     = useState('');
    const [actionFlt,  setActionFlt]  = useState('ALL');
    const [modelFlt,   setModelFlt]   = useState('ALL');
    const [userFlt,    setUserFlt]    = useState('ALL');
    const [days,       setDays]       = useState('30');

    const load = async () => {
        setLoading(true);
        try {
            const res = await accountsApi.getActivityLogs({ action: actionFlt, model: modelFlt, user_id: userFlt === 'ALL' ? '' : userFlt, days });
            const raw = res.data?.results ?? res.data ?? [];
            setLogs(Array.isArray(raw) ? raw : []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [actionFlt, modelFlt, userFlt, days]);

    const filtered = useMemo(() => {
        if (!search) return logs;
        const q = search.toLowerCase();
        return logs.filter(l =>
            (l.description || '').toLowerCase().includes(q) ||
            (l.model_name  || '').toLowerCase().includes(q) ||
            (l.username    || '').toLowerCase().includes(q) ||
            (l.object_repr || '').toLowerCase().includes(q)
        );
    }, [logs, search]);

    // Unique model names from loaded logs
    const models = [...new Set(logs.map(l => l.model_name).filter(Boolean))].sort();
    const ACTIONS = ['ALL','CREATE','UPDATE','DELETE','VIEW','LOGIN','LOGOUT','APPROVE','PAY'];
    const DAYS_OPTS = [{ v:'7', l:'Last 7 days' },{ v:'30', l:'Last 30 days' },{ v:'90', l:'Last 90 days' },{ v:'365', l:'Last year' }];

    return (
        <div style={{ maxWidth: 1100, margin:'0 auto' }}>

            {/* ── Header ───────────────────────────────────────────── */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div>
                    <p style={{ margin:0, fontSize:20, fontWeight:900, color:'var(--t-text)' }}>📋 Activity Log</p>
                    <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--t-text3)' }}>{filtered.length} records shown</p>
                </div>
                <button onClick={load} style={{ padding:'8px 16px', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-surface)', color:'var(--t-text)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    🔄 Refresh
                </button>
            </div>

            {/* ── Filters ──────────────────────────────────────────── */}
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                <input
                    placeholder="🔍 Search description, model, user…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ flex:1, minWidth:200, padding:'7px 12px', fontSize:12, borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', outline:'none' }}
                />
                <select value={actionFlt} onChange={e => setActionFlt(e.target.value)}
                    style={{ padding:'7px 10px', fontSize:12, borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', cursor:'pointer' }}>
                    {ACTIONS.map(a => <option key={a} value={a}>{a === 'ALL' ? 'All Actions' : a}</option>)}
                </select>
                <select value={modelFlt} onChange={e => setModelFlt(e.target.value)}
                    style={{ padding:'7px 10px', fontSize:12, borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', cursor:'pointer' }}>
                    <option value="ALL">All Models</option>
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={userFlt} onChange={e => setUserFlt(e.target.value)}
                    style={{ padding:'7px 10px', fontSize:12, borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', cursor:'pointer' }}>
                    <option value="ALL">All Users</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                </select>
                <select value={days} onChange={e => setDays(e.target.value)}
                    style={{ padding:'7px 10px', fontSize:12, borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', cursor:'pointer' }}>
                    {DAYS_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
            </div>

            {/* ── Action summary chips ──────────────────────────────── */}
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                {Object.entries(ACTION_COLORS).map(([action, color]) => {
                    const count = logs.filter(l => l.action === action).length;
                    if (!count) return null;
                    return (
                        <button key={action} onClick={() => setActionFlt(actionFlt === action ? 'ALL' : action)}
                            style={{ padding:'4px 12px', borderRadius:8, background: actionFlt === action ? color : `${color}12`, color: actionFlt === action ? '#fff' : color, fontSize:10, fontWeight:900, border:`1px solid ${color}30`, cursor:'pointer', transition:'all 0.15s' }}>
                            {ACTION_ICONS[action]} {action} ({count})
                        </button>
                    );
                })}
            </div>

            {/* ── Log list ─────────────────────────────────────────── */}
            {loading ? (
                <div style={{ textAlign:'center', padding:60 }}><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" /></div>
            ) : (
                <div style={{ borderRadius:14, border:'1px solid var(--t-border)', background:'var(--t-surface)', overflow:'hidden' }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign:'center', padding:60 }}>
                            <p style={{ fontSize:40, margin:'0 0 12px' }}>📋</p>
                            <p style={{ fontSize:14, fontWeight:700, color:'var(--t-text3)' }}>No activity logs found</p>
                        </div>
                    ) : filtered.map((log, i) => {
                        const color = ACTION_COLORS[log.action] || '#6b7280';
                        const icon  = ACTION_ICONS[log.action]  || '📝';
                        const user  = users.find(u => u.id === log.user);
                        return (
                            <div key={log.id}
                                onClick={() => setSelected(selected?.id === log.id ? null : log)}
                                style={{
                                    display:'flex', alignItems:'flex-start', gap:14, padding:'12px 18px',
                                    borderBottom: i < filtered.length - 1 ? '1px solid var(--t-border)' : 'none',
                                    cursor:'pointer', transition:'background 0.15s',
                                    background: selected?.id === log.id ? `${color}08` : 'transparent',
                                    borderLeft: selected?.id === log.id ? `3px solid ${color}` : '3px solid transparent',
                                }}
                                onMouseEnter={e => { if (selected?.id !== log.id) e.currentTarget.style.background = 'var(--t-bg)'; }}
                                onMouseLeave={e => { if (selected?.id !== log.id) e.currentTarget.style.background = 'transparent'; }}
                            >
                                {/* Action icon */}
                                <div style={{ width:32, height:32, borderRadius:8, background:`${color}15`, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, marginTop:2 }}>
                                    {icon}
                                </div>

                                {/* Main content */}
                                <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                                        <span style={{ fontSize:12, fontWeight:700, color:'var(--t-text)' }}>{log.description || `${log.action} on ${log.model_name}`}</span>
                                        <Badge label={log.action} color={color} />
                                        <Badge label={log.model_name} color="#6b7280" />
                                        {!log.success && <Badge label="Failed" color="#ef4444" />}
                                    </div>
                                    <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:4, flexWrap:'wrap' }}>
                                        <span style={{ fontSize:10, color:'var(--t-text3)' }}>
                                            👤 {log.user_display_name || log.username || 'System'}
                                        </span>
                                        {log.ip_address && <span style={{ fontSize:10, color:'var(--t-text3)' }}>🌐 {log.ip_address}</span>}
                                        {log.object_repr && <span style={{ fontSize:10, color:'var(--t-text3)', fontFamily:'monospace' }}>#{log.object_repr}</span>}
                                    </div>
                                </div>

                                {/* Timestamp */}
                                <div style={{ textAlign:'right', flexShrink:0 }}>
                                    <p style={{ margin:0, fontSize:10, fontWeight:700, color:'var(--t-text3)' }}>{timeAgo(log.timestamp)}</p>
                                    <p style={{ margin:'2px 0 0', fontSize:9, color:'var(--t-text3)' }}>{fmt(log.timestamp)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Detail panel ─────────────────────────────────────── */}
            {selected && (
                <div style={{ marginTop:16, padding:20, borderRadius:14, border:'1px solid var(--t-border)', background:'var(--t-surface)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
                        <p style={{ margin:0, fontSize:13, fontWeight:900, color:'var(--t-text)', textTransform:'uppercase', letterSpacing:'0.06em' }}>📋 Log Detail</p>
                        <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'var(--t-text3)', cursor:'pointer', fontSize:18 }}>×</button>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
                        {[
                            { label:'Action',      value: selected.action },
                            { label:'Model',       value: selected.model_name },
                            { label:'Object ID',   value: selected.object_id    || '—' },
                            { label:'Object',      value: selected.object_repr  || '—' },
                            { label:'User',        value: selected.user_display_name || selected.username || '—' },
                            { label:'IP Address',  value: selected.ip_address   || '—' },
                            { label:'Method',      value: selected.method       || '—' },
                            { label:'Endpoint',    value: selected.endpoint     || '—' },
                            { label:'Success',     value: selected.success ? '✅ Yes' : '❌ No' },
                            { label:'Timestamp',   value: fmt(selected.timestamp) },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <p style={{ margin:'0 0 2px', fontSize:9, fontWeight:900, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</p>
                                <p style={{ margin:0, fontSize:12, fontWeight:600, color:'var(--t-text)', wordBreak:'break-all' }}>{value}</p>
                            </div>
                        ))}
                    </div>
                    {selected.description && (
                        <div style={{ marginTop:12, padding:'10px 14px', borderRadius:10, background:'var(--t-bg)', border:'1px solid var(--t-border)' }}>
                            <p style={{ margin:'0 0 4px', fontSize:9, fontWeight:900, color:'var(--t-text3)', textTransform:'uppercase' }}>Description</p>
                            <p style={{ margin:0, fontSize:12, color:'var(--t-text)' }}>{selected.description}</p>
                        </div>
                    )}
                    {selected.error_message && (
                        <div style={{ marginTop:12, padding:'10px 14px', borderRadius:10, background:'#ef444412', border:'1px solid #ef444430' }}>
                            <p style={{ margin:'0 0 4px', fontSize:9, fontWeight:900, color:'#ef4444', textTransform:'uppercase' }}>Error</p>
                            <p style={{ margin:0, fontSize:12, color:'#ef4444' }}>{selected.error_message}</p>
                        </div>
                    )}
                    {selected.changes && (
                        <div style={{ marginTop:12 }}>
                            <p style={{ margin:'0 0 6px', fontSize:9, fontWeight:900, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Changes</p>
                            <pre style={{ margin:0, padding:'10px 14px', borderRadius:10, background:'var(--t-bg)', border:'1px solid var(--t-border)', fontSize:11, color:'var(--t-text)', overflow:'auto', maxHeight:200 }}>
                                {JSON.stringify(selected.changes, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
