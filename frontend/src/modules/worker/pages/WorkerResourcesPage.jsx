/**
 * WorkerResourcesPage.jsx  — Advanced Dark + Colorful Edition
 * ─────────────────────────────────────────────────────────────
 * Materials and equipment for the worker's active project.
 * Dark theme matching WorkerPortal.jsx color palette.
 *
 * Features:
 *  • Materials list with stock-level progress bars (green/amber/red zones)
 *  • Equipment status cards with colored left-border accents
 *  • Animated dark-sheet request modal
 *  • Low-stock pulse alerts
 *  • Search filter
 *  • Toast confirmation
 */
import React, { useState, useEffect, useCallback } from 'react';
import workerPortalApi from '../../../services/workerPortalApi';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
    bg:      '#020617',
    surface: '#0f172a',
    card:    '#0d1826',
    border:  '#1e293b',
    text:    '#f1f5f9',
    muted:   '#64748b',
    dim:     '#94a3b8',
    blue:    '#38bdf8',
    blueD:   '#0369a1',
    green:   '#4ade80',
    greenD:  '#15803d',
    amber:   '#fbbf24',
    amberD:  '#b45309',
    red:     '#f87171',
    redD:    '#b91c1c',
    purple:  '#a78bfa',
    cyan:    '#22d3ee',
};

// ─── CSS ────────────────────────────────────────────────────────────────────────
const STYLES = `
@keyframes wrFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes wrSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
@keyframes wrPulseRed { 0%,100%{box-shadow:0 0 0 0 rgba(248,113,113,.5)} 50%{box-shadow:0 0 0 8px rgba(248,113,113,0)} }
@keyframes wrPulseAmber { 0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.4)} 50%{box-shadow:0 0 0 6px rgba(251,191,36,0)} }
@keyframes wrSpin { to{transform:rotate(360deg)} }
@keyframes wrToastIn { from{opacity:0;transform:translateX(-50%) translateY(20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
.wr-card { animation: wrFadeIn .22s ease both; }
.wr-card:hover { transform:translateY(-1px); transition:transform .15s; }
.wr-sheet { animation: wrSlideUp .3s cubic-bezier(.16,1,.3,1) both; }
.wr-chip { transition:all .15s; }
.wr-spinner { width:28px;height:28px;border:3px solid #1e293b;border-top-color:#38bdf8;border-radius:50%;animation:wrSpin .8s linear infinite;margin:0 auto; }
.wr-toast { animation: wrToastIn .3s ease; }
`;

function injectStyles() {
    if (document.getElementById('worker-resources-styles')) return;
    const s = document.createElement('style');
    s.id = 'worker-resources-styles';
    s.textContent = STYLES;
    document.head.appendChild(s);
}

// ─── Lookup tables ─────────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
    CEMENT: '🏗️', STEEL: '⚙️', SAND: '🏜️', AGGREGATE: '🪨',
    BRICK: '🧱', WOOD: '🪵', ELECTRICAL: '⚡', PLUMBING: '🔧', OTHER: '📦',
};

const EQUIP_ICONS = {
    EXCAVATOR: '🚜', CRANE: '🏗️', BULLDOZER: '🚛', MIXER: '🌀',
    GENERATOR: '⚡', COMPACTOR: '🔩', TRUCK: '🚚', LOADER: '🔄',
    DRILL: '🔩', SCAFFOLDING: '🏗️', OTHER: '🛠️',
};

const EQUIP_STATUS = {
    AVAILABLE:   { label: 'Available',   color: C.green,  bg: 'rgba(74,222,128,.12)',  border: C.green,  glow: '0 0 12px rgba(74,222,128,.25)'  },
    IN_USE:      { label: 'In Use',      color: C.amber,  bg: 'rgba(251,191,36,.12)',  border: C.amber,  glow: '0 0 12px rgba(251,191,36,.2)'   },
    MAINTENANCE: { label: 'Maintenance', color: C.red,    bg: 'rgba(248,113,113,.1)',  border: C.red,    glow: '0 0 10px rgba(248,113,113,.15)' },
    RETIRED:     { label: 'Retired',     color: C.muted,  bg: 'rgba(100,116,139,.1)', border: C.border, glow: 'none'                           },
};

// ─── Stock bar ─────────────────────────────────────────────────────────────────
function StockBar({ qty, minQty, maxQty }) {
    const max   = maxQty || Math.max(qty * 2, 1);
    const reorder = minQty || 0;
    const pct   = Math.min(100, (qty / max) * 100);
    const reorderPct = Math.min(100, (reorder / max) * 100);
    const color = pct < 15 ? C.red : pct < 40 ? C.amber : C.green;
    const glow  = pct < 15 ? 'rgba(248,113,113,.5)' : pct < 40 ? 'rgba(251,191,36,.4)' : 'rgba(74,222,128,.35)';

    return (
        <div style={{ margin: '10px 0 4px' }}>
            <div style={{ position: 'relative', background: C.border, borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{
                    height: '100%', width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}99, ${color})`,
                    borderRadius: 6, transition: 'width .6s ease',
                    boxShadow: `0 0 8px ${glow}`,
                }} />
                {/* Reorder line */}
                {reorderPct > 0 && reorderPct < 98 && (
                    <div style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${reorderPct}%`, width: 2,
                        background: C.red, opacity: .8,
                    }} />
                )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: pct < 15 ? C.red : pct < 40 ? C.amber : C.muted, fontWeight: 700 }}>
                    {pct < 15 ? '⚠️ Critical' : pct < 40 ? '⚡ Low' : '✓ Adequate'}
                </span>
                <span style={{ fontSize: 10, color: C.muted }}>{Math.round(pct)}% stock</span>
            </div>
        </div>
    );
}

// ─── Request Modal (dark sheet) ────────────────────────────────────────────────
function RequestModal({ material, onClose, onSubmitted }) {
    const [qty, setQty]     = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    const submit = async () => {
        const n = parseFloat(qty);
        if (!n || n <= 0) { setError('Enter a valid quantity.'); return; }
        setSaving(true); setError('');
        try {
            const res = await workerPortalApi.requestMaterial(material.id, n, notes);
            onSubmitted(res);
        } catch (e) {
            setError(e.response?.data?.error || 'Request failed. Try again.');
        } finally {
            setSaving(false);
        }
    };

    const isLow = material.low_stock;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end',
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="wr-sheet" style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: '24px 24px 0 0',
                width: '100%', padding: '24px 20px 50px',
                maxHeight: '90vh', overflowY: 'auto',
            }}>
                {/* Handle */}
                <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 22px' }} />

                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                    Material Request
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 28 }}>{CATEGORY_ICONS[material.category] || '📦'}</span>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: C.text }}>{material.name}</h3>
                        <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>{material.category}</p>
                    </div>
                </div>

                {/* Stock info card */}
                <div style={{
                    padding: '12px 14px', borderRadius: 12, marginBottom: 20,
                    background: isLow ? 'rgba(248,113,113,.07)' : 'rgba(74,222,128,.05)',
                    border: `1px solid ${isLow ? `${C.red}30` : `${C.green}20`}`,
                    animation: isLow ? 'wrPulseRed 2s infinite' : 'none',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: C.dim }}>Current stock</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: isLow ? C.red : C.green }}>
                            {parseFloat(material.stock_qty).toLocaleString()} {material.unit}
                        </span>
                    </div>
                    {isLow && (
                        <p style={{ fontSize: 11, color: C.red, fontWeight: 700, margin: '4px 0 0' }}>
                            ⚠️ Below reorder level · Request prioritised
                        </p>
                    )}
                </div>

                {/* Quantity input */}
                <label style={{ fontSize: 12, fontWeight: 700, color: C.dim, display: 'block', marginBottom: 8 }}>
                    Quantity needed *
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0" step="1"
                        placeholder="0"
                        style={{
                            flex: 1, padding: '12px 14px', borderRadius: 12,
                            border: `1.5px solid ${error ? C.red : C.border}`,
                            fontSize: 16, fontWeight: 700,
                            background: 'rgba(255,255,255,.04)',
                            color: C.text, outline: 'none',
                            boxShadow: error ? `0 0 8px ${C.red}30` : 'none',
                        }} />
                    <div style={{
                        padding: '12px 16px', borderRadius: 12, background: C.card,
                        border: `1px solid ${C.border}`,
                        fontSize: 13, fontWeight: 700, color: C.muted,
                        display: 'flex', alignItems: 'center',
                    }}>
                        {material.unit}
                    </div>
                </div>

                {/* Notes */}
                <label style={{ fontSize: 12, fontWeight: 700, color: C.dim, display: 'block', marginBottom: 8 }}>
                    Notes (optional)
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Why do you need this? Any urgency?"
                    rows={3}
                    style={{
                        width: '100%', padding: '11px 13px', borderRadius: 12,
                        border: `1.5px solid ${C.border}`, fontSize: 13, resize: 'none',
                        boxSizing: 'border-box', marginBottom: 18,
                        background: 'rgba(255,255,255,.03)',
                        color: C.text, outline: 'none',
                    }} />

                {error && (
                    <p style={{
                        color: C.red, fontSize: 12, fontWeight: 600, marginBottom: 12,
                        padding: '8px 12px', background: 'rgba(248,113,113,.1)',
                        borderRadius: 8, border: `1px solid ${C.red}40`,
                    }}>
                        ⚠️ {error}
                    </p>
                )}

                <button onClick={submit} disabled={saving}
                    style={{
                        width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                        background: saving
                            ? C.border
                            : `linear-gradient(135deg, ${C.blueD}, ${C.blue})`,
                        color: saving ? C.muted : '#000',
                        fontSize: 14, fontWeight: 800,
                        cursor: saving ? 'default' : 'pointer',
                        boxShadow: saving ? 'none' : `0 4px 20px ${C.blue}50`,
                    }}>
                    {saving ? '⏳ Submitting…' : '📦 Submit Request'}
                </button>
            </div>
        </div>
    );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
    useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
    return (
        <div className="wr-toast" style={{
            position: 'fixed', bottom: 110, left: '50%', transform: 'translateX(-50%)',
            background: C.green, color: '#000',
            padding: '11px 22px', borderRadius: 14,
            fontSize: 13, fontWeight: 800, zIndex: 2000,
            whiteSpace: 'nowrap', boxShadow: `0 4px 24px ${C.green}50`,
        }}>
            ✅ {message}
        </div>
    );
}

// ─── Material card ─────────────────────────────────────────────────────────────
function MaterialCard({ m, onRequest }) {
    const isLow = m.low_stock;
    const qty   = parseFloat(m.stock_qty);
    const minQty = parseFloat(m.reorder_level || 0);

    return (
        <div className="wr-card" style={{
            background: C.card, borderRadius: 16, marginBottom: 10,
            border: `1px solid ${isLow ? `${C.red}40` : C.border}`,
            padding: '14px 16px',
            boxShadow: isLow ? `0 0 16px rgba(248,113,113,.1)` : 'none',
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Low stock pulse strip */}
            {isLow && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, transparent, ${C.red}, transparent)`,
                    animation: 'wrPulseAmber 1.5s infinite',
                }} />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: isLow ? 'rgba(248,113,113,.1)' : 'rgba(56,189,248,.08)',
                        border: `1px solid ${isLow ? `${C.red}30` : `${C.blue}20`}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22,
                    }}>
                        {CATEGORY_ICONS[m.category] || '📦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: C.text }}>{m.name}</p>
                        <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0', fontWeight: 500 }}>
                            {m.category.charAt(0) + m.category.slice(1).toLowerCase()}
                        </p>
                    </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{
                        fontSize: 18, fontWeight: 900, margin: 0,
                        color: isLow ? C.red : qty === 0 ? C.red : C.text,
                    }}>
                        {qty.toLocaleString()}
                    </p>
                    <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0', fontWeight: 600 }}>{m.unit}</p>
                </div>
            </div>

            {/* Stock bar */}
            <StockBar qty={qty} minQty={minQty} maxQty={m.max_stock} />

            {/* Low stock warning + request button */}
            {isLow ? (
                <div style={{
                    marginTop: 10, padding: '8px 12px',
                    background: 'rgba(248,113,113,.07)',
                    borderRadius: 10, border: `1px solid ${C.red}30`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                }}>
                    <span style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>
                        ⚠️ Reorder level: {minQty.toLocaleString()} {m.unit}
                    </span>
                    <button onClick={() => onRequest(m)}
                        style={{
                            padding: '5px 12px', background: C.red, color: '#fff',
                            border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 800,
                            cursor: 'pointer', flexShrink: 0,
                            boxShadow: `0 2px 10px ${C.red}50`,
                        }}>
                        🚨 Request
                    </button>
                </div>
            ) : (
                <button onClick={() => onRequest(m)}
                    style={{
                        marginTop: 10, width: '100%', padding: '9px',
                        borderRadius: 10,
                        border: `1px solid ${C.border}`,
                        background: 'rgba(255,255,255,.03)',
                        color: C.dim, fontSize: 12, fontWeight: 700,
                        cursor: 'pointer',
                    }}>
                    + Request More
                </button>
            )}
        </div>
    );
}

// ─── Equipment card ─────────────────────────────────────────────────────────────
function EquipCard({ eq }) {
    const [open, setOpen] = useState(false);
    const st = EQUIP_STATUS[eq.status] || EQUIP_STATUS.AVAILABLE;

    return (
        <div className="wr-card" onClick={() => setOpen(o => !o)} style={{
            background: C.card, borderRadius: 16, marginBottom: 10,
            border: `1px solid ${st.border}30`,
            padding: '14px 16px', cursor: 'pointer',
            boxShadow: st.glow,
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Left accent */}
            <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
                background: `linear-gradient(180deg, ${st.color}, ${st.color}60)`,
                borderRadius: '16px 0 0 16px',
            }} />

            <div style={{ paddingLeft: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: st.bg, border: `1px solid ${st.border}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22,
                    }}>
                        {EQUIP_ICONS[eq.equipment_type] || '🛠️'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: C.text }}>{eq.name}</p>
                        <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
                            {(eq.equipment_type || '').replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                            {eq.quantity > 1 && ` · Qty: ${eq.quantity}`}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                        padding: '3px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 700,
                        color: st.color, background: st.bg,
                        border: `1px solid ${st.border}30`,
                    }}>
                        {st.label}
                    </span>
                    <span style={{ color: C.muted, fontSize: 11, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>
            </div>

            {open && eq.description && (
                <div style={{
                    marginTop: 12, paddingTop: 12, paddingLeft: 8,
                    borderTop: `1px solid ${C.border}`,
                }}>
                    <p style={{ fontSize: 12, color: C.dim, margin: 0, lineHeight: 1.5 }}>{eq.description}</p>
                </div>
            )}
        </div>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function WorkerResourcesPage() {
    useEffect(() => { injectStyles(); }, []);

    const [data, setData]           = useState({ materials: [], equipment: [] });
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');
    const [tab, setTab]             = useState('materials');
    const [requestItem, setRequest] = useState(null);
    const [toast, setToast]         = useState('');
    const [search, setSearch]       = useState('');

    const load = useCallback(() => {
        setLoading(true); setError('');
        workerPortalApi.getResources()
            .then(d => setData(d || { materials: [], equipment: [] }))
            .catch(() => setError('Could not load resources. Check your connection.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleRequested = (res) => {
        setRequest(null);
        setToast(`Request submitted for ${res.material || 'material'}`);
    };

    const materials = (data.materials || []).filter(m =>
        !search
        || m.name?.toLowerCase().includes(search.toLowerCase())
        || m.category?.toLowerCase().includes(search.toLowerCase())
    );
    const equipment = (data.equipment || []).filter(e =>
        !search || e.name?.toLowerCase().includes(search.toLowerCase())
    );

    const lowStockCount  = (data.materials || []).filter(m => m.low_stock).length;
    const availableEquip = (data.equipment || []).filter(e => e.status === 'AVAILABLE').length;

    const TABS = [
        { key: 'materials', label: `🧱 Materials`, count: (data.materials || []).length },
        { key: 'equipment', label: `🛠️ Equipment`, count: (data.equipment || []).length },
    ];

    return (
        <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 100, color: C.text }}>

            {/* ── Header ── */}
            <div style={{
                padding: '20px 20px 0',
                background: C.surface,
                borderBottom: `1px solid ${C.border}`,
                position: 'sticky', top: 0, zIndex: 50,
            }}>
                {/* Title row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: C.text }}>Resources</h2>
                        <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
                            {(data.materials || []).length} materials · {availableEquip} equipment available
                        </p>
                    </div>
                    <button onClick={load} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                        ↻
                    </button>
                </div>

                {/* Low-stock alert banner */}
                {lowStockCount > 0 && !loading && (
                    <div style={{
                        marginBottom: 12, padding: '10px 14px', borderRadius: 12,
                        background: 'rgba(248,113,113,.08)',
                        border: `1px solid ${C.red}30`,
                        display: 'flex', alignItems: 'center', gap: 10,
                        animation: 'wrPulseRed 2.5s infinite',
                    }}>
                        <span style={{ fontSize: 18 }}>⚠️</span>
                        <p style={{ fontSize: 12, fontWeight: 700, color: C.red, margin: 0 }}>
                            {lowStockCount} material{lowStockCount !== 1 ? 's' : ''} running low — tap to request
                        </p>
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                    {TABS.map(t => (
                        <button key={t.key} className="wr-chip"
                            onClick={() => { setTab(t.key); setSearch(''); }}
                            style={{
                                flex: 1, padding: '9px 4px', borderRadius: 10, border: 'none',
                                background: tab === t.key
                                    ? `linear-gradient(135deg,${C.blueD},${C.blue})`
                                    : C.card,
                                color: tab === t.key ? '#000' : C.muted,
                                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                                boxShadow: tab === t.key ? `0 4px 14px ${C.blue}40` : 'none',
                            }}>
                            {t.label} <span style={{ opacity: .7 }}>({t.count})</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ padding: '14px 16px' }}>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 14 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: C.muted }}>🔍</span>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={`Search ${tab}…`}
                        style={{
                            width: '100%', padding: '10px 12px 10px 36px',
                            borderRadius: 12, border: `1px solid ${C.border}`,
                            fontSize: 13, background: C.card,
                            color: C.text, outline: 'none', boxSizing: 'border-box',
                        }} />
                </div>

                {/* Spinner */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <div className="wr-spinner" />
                        <p style={{ fontSize: 13, color: C.muted, marginTop: 16 }}>Loading resources…</p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div style={{ padding: 20, background: 'rgba(248,113,113,.08)', borderRadius: 14, textAlign: 'center', border: `1px solid ${C.red}30` }}>
                        <p style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{error}</p>
                        <button onClick={load} style={{ marginTop: 10, padding: '8px 20px', background: C.red, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            ↻ Retry
                        </button>
                    </div>
                )}

                {/* ── Materials ── */}
                {!loading && !error && tab === 'materials' && (
                    materials.length === 0
                        ? (
                            <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
                                <div style={{ fontSize: 52, marginBottom: 16 }}>🧱</div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: C.dim }}>No materials found</p>
                                <p style={{ fontSize: 12, marginTop: 4 }}>{search ? 'Try a different search.' : 'No materials are listed for this project.'}</p>
                            </div>
                        )
                        : materials.map(m => (
                            <MaterialCard key={m.id} m={m} onRequest={setRequest} />
                        ))
                )}

                {/* ── Equipment ── */}
                {!loading && !error && tab === 'equipment' && (
                    equipment.length === 0
                        ? (
                            <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
                                <div style={{ fontSize: 52, marginBottom: 16 }}>🛠️</div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: C.dim }}>No equipment found</p>
                                <p style={{ fontSize: 12, marginTop: 4 }}>{search ? 'Try a different search.' : 'No equipment listed for this project.'}</p>
                            </div>
                        )
                        : equipment.map(eq => (
                            <EquipCard key={eq.id} eq={eq} />
                        ))
                )}
            </div>

            {/* Request modal */}
            {requestItem && (
                <RequestModal material={requestItem} onClose={() => setRequest(null)} onSubmitted={handleRequested} />
            )}

            {/* Toast */}
            {toast && <Toast message={toast} onDone={() => setToast('')} />}
        </div>
    );
}
