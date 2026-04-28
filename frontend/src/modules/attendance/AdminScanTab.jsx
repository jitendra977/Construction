/**
 * AdminScanTab — QR Attendance Control Panel
 *
 * Three sections:
 *  1. Time Window Config  — enable/disable scan windows, set hours, late/early thresholds
 *  2. Missed Checkouts    — workers who never checked out yesterday (or earlier)
 *  3. Scan Attempt Log    — full immutable log with status badges
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import attendanceService from '../../services/attendanceService';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const fn = () => setM(window.innerWidth < 768);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);
    return m;
}

function fmt24(t) {
    if (!t) return '—';
    return String(t).slice(0, 5);
}

function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

const SCAN_STATUS_COLORS = {
    VALID:     { bg: '#10b98115', text: '#10b981', border: '#10b98130' },
    REJECTED:  { bg: '#ef444415', text: '#ef4444', border: '#ef444430' },
    DUPLICATE: { bg: '#f59e0b15', text: '#f59e0b', border: '#f59e0b30' },
};

const SCAN_TYPE_COLORS = {
    CHECK_IN:    { bg: '#10b98112', text: '#10b981' },
    CHECK_OUT:   { bg: '#3b82f612', text: '#3b82f6' },
    IGNORED:     { bg: '#f59e0b12', text: '#f59e0b' },
    OUT_OF_TIME: { bg: '#ef444412', text: '#ef4444' },
    BLOCKED:     { bg: '#8b5cf612', text: '#8b5cf6' },
    INVALID:     { bg: '#ef444412', text: '#ef4444' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Time Window Config
// ─────────────────────────────────────────────────────────────────────────────
function TimeWindowSection({ projectId }) {
    const [config,        setConfig]        = useState(null);
    const [draft,         setDraft]         = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [saving,        setSaving]        = useState(false);
    const [toggling,      setToggling]      = useState(false);  // separate spinner for toggle
    const [msg,           setMsg]           = useState('');
    const [err,           setErr]           = useState('');
    const isMobile = useIsMobile();

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true); setErr('');
        try {
            const d = await attendanceService.getTimeWindow(projectId);
            setConfig(d);
            setDraft(d);
        } catch (e) {
            setErr('Could not load time window config.');
        } finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    // ── Toggle is_active and IMMEDIATELY save to backend ──────────────────────
    const handleToggle = async () => {
        if (!draft || toggling) return;
        const newVal = !draft.is_active;
        // Optimistic UI update
        setDraft(prev => ({ ...prev, is_active: newVal }));
        setToggling(true); setMsg(''); setErr('');
        try {
            const d = await attendanceService.updateTimeWindow(projectId, { is_active: newVal });
            setConfig(d); setDraft(d);
            setMsg(newVal ? '🟢 Time windows ON — scans restricted to configured hours' : '✅ Time windows OFF — free check-in & check-out anytime');
            setTimeout(() => setMsg(''), 4000);
        } catch (e) {
            // Rollback optimistic update on failure
            setDraft(prev => ({ ...prev, is_active: !newVal }));
            setErr('Toggle failed — could not reach server.');
        } finally { setToggling(false); }
    };

    // ── Save time hours + thresholds (separate from toggle) ───────────────────
    const handleSave = async () => {
        if (!draft) return;
        setSaving(true); setMsg(''); setErr('');
        try {
            const d = await attendanceService.updateTimeWindow(projectId, {
                checkin_start:         draft.checkin_start,
                checkin_end:           draft.checkin_end,
                checkout_start:        draft.checkout_start,
                checkout_end:          draft.checkout_end,
                late_threshold_minutes:  draft.late_threshold_minutes,
                early_checkout_minutes:  draft.early_checkout_minutes,
            });
            setConfig(d); setDraft(d);
            setMsg('⏱ Window hours saved ✓');
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            setErr(e?.response?.data?.detail || 'Save failed.');
        } finally { setSaving(false); }
    };

    const set = (key, val) => setDraft(prev => ({ ...prev, [key]: val }));

    if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-text3)', fontSize: 13 }}>Loading…</div>;
    if (err && !draft) return <div style={{ padding: 24, color: '#ef4444', fontSize: 13 }}>{err}</div>;
    if (!draft) return null;

    const fieldStyle = {
        width: '100%', padding: '10px 12px', borderRadius: 10,
        border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
        color: 'var(--t-text)', fontSize: 14, boxSizing: 'border-box',
    };
    const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5, display: 'block' };

    return (
        <div>
            {/* ── ON / OFF toggle — auto-saves immediately on click ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 18px', borderRadius: 14,
                background: draft.is_active ? '#10b98112' : 'var(--t-surface2)',
                border: `2px solid ${draft.is_active ? '#10b98140' : 'var(--t-border)'}`,
                marginBottom: 20,
                cursor: toggling ? 'wait' : 'pointer',
                transition: 'all 0.2s',
                opacity: toggling ? 0.8 : 1,
            }} onClick={handleToggle}>
                <div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--t-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {toggling
                            ? <span style={{ fontSize: 13, color: 'var(--t-text3)' }}>Saving…</span>
                            : draft.is_active
                                ? <><span style={{ color: '#10b981' }}>●</span> Time Window Enforcement ON</>
                                : <><span style={{ color: 'var(--t-text3)' }}>○</span> Time Window Enforcement OFF</>
                        }
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t-text3)', marginTop: 3 }}>
                        {draft.is_active
                            ? 'Scans outside configured hours are rejected'
                            : 'Workers can check in & out freely at any time'}
                    </div>
                </div>
                {/* Toggle switch */}
                <div style={{
                    width: 50, height: 28, borderRadius: 14, flexShrink: 0,
                    background: draft.is_active ? '#10b981' : 'var(--t-border)',
                    position: 'relative', transition: 'background 0.25s',
                    boxShadow: draft.is_active ? '0 0 0 3px #10b98125' : 'none',
                }}>
                    <div style={{
                        position: 'absolute', top: 4, left: draft.is_active ? 26 : 4,
                        width: 20, height: 20, borderRadius: '50%', background: '#fff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transition: 'left 0.25s',
                    }} />
                </div>
            </div>

            {/* ── Nepali explanation note ── */}
            <div style={{
                padding: '14px 16px', borderRadius: 12, marginBottom: 16,
                background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
            }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#f97316', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                    📋 यो सुविधा बारे जानकारी
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                        {
                            icon: '❓',
                            title: 'के हो? (What)',
                            body: 'QR Scan Time Window भनेको एउटा समय-सीमा हो जसभित्र मात्र कामदारहरूले हाजिरी लगाउन सक्छन्। यो सुविधाले project को सबै कामदारहरूमा एकै साथ लागु हुन्छ।',
                        },
                        {
                            icon: '⚙️',
                            title: 'कसरी काम गर्छ? (How)',
                            body: 'Toggle ON गरेपछि — Check-in र Check-out को लागि अलग-अलग समय तोक्नुस्। तोकिएको समयभित्र मात्र QR Scan मान्य हुन्छ। बाहिर scan गरेमा "Rejected" देखिन्छ र log मा record रहन्छ। Toggle OFF छ भने — जुनसुकै समयमा पनि check-in/check-out गर्न पाइन्छ।',
                        },
                        {
                            icon: '🕐',
                            title: 'कहिले प्रयोग गर्ने? (When)',
                            body: 'साइटमा निश्चित काम सुरु र सकिने समय भएको खण्डमा ON गर्नुस् — जस्तै बिहान ८ बजेदेखि १० बजेसम्म check-in, साँझ ५ बजेदेखि ७ बजेसम्म check-out। बिदाको दिन वा flexible समय भएमा OFF राख्नुस्।',
                        },
                    ].map(item => (
                        <div key={item.title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t-text)', marginBottom: 2 }}>{item.title}</div>
                                <div style={{ fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.65 }}>{item.body}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {msg && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#10b98115', border: '1px solid #10b98130', color: '#10b981', fontSize: 12, marginBottom: 12 }}>{msg}</div>}
            {err && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#ef444415', color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{err}</div>}

            {/* Time fields + Save — only shown when window enforcement is ON */}
            {draft.is_active && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    {/* Time fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div>
                            <label style={labelStyle}>Check-in Opens</label>
                            <input type="time" style={fieldStyle} value={fmt24(draft.checkin_start)}
                                onChange={e => set('checkin_start', e.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Check-in Closes</label>
                            <input type="time" style={fieldStyle} value={fmt24(draft.checkin_end)}
                                onChange={e => set('checkin_end', e.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Check-out Opens</label>
                            <input type="time" style={fieldStyle} value={fmt24(draft.checkout_start)}
                                onChange={e => set('checkout_start', e.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Check-out Closes</label>
                            <input type="time" style={fieldStyle} value={fmt24(draft.checkout_end)}
                                onChange={e => set('checkout_end', e.target.value)} />
                        </div>
                    </div>

                    {/* Threshold fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                        <div>
                            <label style={labelStyle}>Late Threshold (min)</label>
                            <input type="number" min={0} max={120} style={fieldStyle}
                                value={draft.late_threshold_minutes}
                                onChange={e => set('late_threshold_minutes', parseInt(e.target.value) || 0)} />
                            <div style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 4 }}>
                                Check-in marked LATE after {draft.late_threshold_minutes}m past open time
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Early Checkout (min)</label>
                            <input type="number" min={0} max={120} style={fieldStyle}
                                value={draft.early_checkout_minutes}
                                onChange={e => set('early_checkout_minutes', parseInt(e.target.value) || 0)} />
                            <div style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 4 }}>
                                Check-out marked EARLY if {draft.early_checkout_minutes}m before open time
                            </div>
                        </div>
                    </div>

                    {/* Preview strip */}
                    <div style={{
                        display: 'flex', gap: 16, flexWrap: 'wrap',
                        padding: '10px 14px', borderRadius: 10,
                        background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
                        marginBottom: 16, alignItems: 'center',
                    }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Windows:</span>
                        {[
                            { label: 'IN',  color: '#10b981', start: draft.checkin_start,  end: draft.checkin_end  },
                            { label: 'OUT', color: '#3b82f6', start: draft.checkout_start, end: draft.checkout_end },
                        ].map(w => (
                            <div key={w.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: w.color }}>{w.label}</span>
                                <span style={{ fontSize: 12, color: 'var(--t-text)' }}>{fmt24(w.start)} – {fmt24(w.end)}</span>
                            </div>
                        ))}
                    </div>

                    <button onClick={handleSave} disabled={saving || toggling} style={{
                        padding: '12px 24px', borderRadius: 12, border: 'none',
                        cursor: (saving || toggling) ? 'not-allowed' : 'pointer',
                        background: (saving || toggling) ? 'var(--t-border)' : '#f97316',
                        color: '#fff', fontWeight: 800, fontSize: 13,
                    }}>
                        {saving ? 'Saving…' : '💾 Save Window Hours'}
                    </button>
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--t-text3)' }}>
                        The ON / OFF toggle saves instantly. Use this button to save time hours &amp; thresholds.
                    </p>

                    <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Missed Checkouts
// ─────────────────────────────────────────────────────────────────────────────
function MissedCheckoutsSection({ projectId }) {
    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [checkoutModal, setCheckoutModal] = useState(null); // { record }
    const [checkoutTime,  setCheckoutTime]  = useState('17:00');
    const [checkoutNote,  setCheckoutNote]  = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState('');

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const d = await attendanceService.getMissedCheckouts(projectId);
            setItems(d.missed || []);
        } catch (e) {
            setErr('Could not load missed checkouts.');
        } finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const handleManualCheckout = async () => {
        if (!checkoutModal) return;
        setSubmitting(true);
        try {
            await attendanceService.manualCheckout({
                attendance_id: checkoutModal.attendance_id,
                check_out: checkoutTime,
                note: checkoutNote,
            });
            setCheckoutModal(null);
            setCheckoutTime('17:00');
            setCheckoutNote('');
            await load();
        } catch (e) {
            setErr(e?.response?.data?.error || 'Failed to save checkout.');
        } finally { setSubmitting(false); }
    };

    if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-text3)', fontSize: 13 }}>Loading…</div>;

    return (
        <div>
            {err && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#ef444415', color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{err}</div>}

            {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t-text)' }}>No missed checkouts</div>
                    <div style={{ fontSize: 12, color: 'var(--t-text3)', marginTop: 4 }}>All workers checked out properly</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--t-text3)', marginBottom: 4 }}>
                        {items.length} worker{items.length !== 1 ? 's' : ''} with open check-in from a previous day
                    </div>
                    {items.map(rec => (
                        <div key={rec.attendance_id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 14px', borderRadius: 12,
                            background: '#ef444408', border: '1px solid #ef444425',
                            gap: 12, flexWrap: 'wrap',
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {rec.worker_name}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--t-text3)', marginTop: 2 }}>
                                    {rec.trade} · {rec.date} · IN {rec.check_in}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{
                                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                                    background: '#ef444415', color: '#ef4444',
                                }}>OPEN</span>
                                <button
                                    onClick={() => { setCheckoutModal(rec); setCheckoutTime('17:00'); setCheckoutNote(''); }}
                                    style={{
                                        padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                        background: '#3b82f6', color: '#fff', fontWeight: 800, fontSize: 11,
                                        whiteSpace: 'nowrap',
                                    }}>
                                    Set Checkout
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Manual checkout modal */}
            {checkoutModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 2000,
                    background: 'rgba(0,0,0,0.6)', display: 'flex',
                    alignItems: 'flex-end', justifyContent: 'center',
                }} onClick={() => setCheckoutModal(null)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--t-surface)', borderRadius: '20px 20px 0 0',
                        border: '1px solid var(--t-border)', borderBottom: 'none',
                        padding: '20px 20px 36px', width: '100%', maxWidth: 480,
                        boxShadow: '0 -12px 60px rgba(0,0,0,0.3)',
                    }}>
                        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--t-border)', margin: '0 auto 18px' }} />
                        <h3 style={{ margin: '0 0 4px', fontWeight: 900, fontSize: 15, color: 'var(--t-text)' }}>
                            Manual Checkout
                        </h3>
                        <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--t-text3)' }}>
                            {checkoutModal.worker_name} · {checkoutModal.date} · Checked in {checkoutModal.check_in}
                        </p>

                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>
                            Check-out Time
                        </label>
                        <input type="time" value={checkoutTime} onChange={e => setCheckoutTime(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text)', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }} />

                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>
                            Admin Note (optional)
                        </label>
                        <input type="text" placeholder="e.g. Worker left early, confirmed by supervisor" value={checkoutNote}
                            onChange={e => setCheckoutNote(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text)', fontSize: 13, marginBottom: 20, boxSizing: 'border-box' }} />

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setCheckoutModal(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleManualCheckout} disabled={submitting} style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                                {submitting ? 'Saving…' : '✓ Confirm Checkout'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Scan Attempt Log
// ─────────────────────────────────────────────────────────────────────────────
function ScanLogsSection({ projectId }) {
    const [logs,    setLogs]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter,  setFilter]  = useState('');   // '' | 'VALID' | 'REJECTED' | 'DUPLICATE'
    const [date,    setDate]    = useState(() => new Date().toISOString().slice(0, 10));
    const [err,     setErr]     = useState('');
    const isMobile = useIsMobile();

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true); setErr('');
        try {
            const params = { project: projectId, date, limit: 200 };
            if (filter) params.scan_status = filter;
            const d = await attendanceService.getScanLogs(params);
            setLogs(Array.isArray(d) ? d : []);
        } catch (e) {
            setErr('Could not load scan logs.');
        } finally { setLoading(false); }
    }, [projectId, date, filter]);

    useEffect(() => { load(); }, [load]);

    return (
        <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text)', fontSize: 13 }} />
                {['', 'VALID', 'REJECTED', 'DUPLICATE'].map(s => (
                    <button key={s} onClick={() => setFilter(s)} style={{
                        padding: '7px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                        border: filter === s ? 'none' : '1px solid var(--t-border)',
                        cursor: 'pointer',
                        background: filter === s
                            ? (s === 'VALID' ? '#10b981' : s === 'REJECTED' ? '#ef4444' : s === 'DUPLICATE' ? '#f59e0b' : '#f97316')
                            : 'var(--t-surface2)',
                        color: filter === s ? '#fff' : 'var(--t-text3)',
                    }}>
                        {s || 'All'}
                    </button>
                ))}
                <button onClick={load} style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text)', fontSize: 12, cursor: 'pointer' }}>↻</button>
            </div>

            {err && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{err}</div>}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t-text3)', fontSize: 13 }}>Loading logs…</div>
            ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                    <div style={{ fontSize: 13, color: 'var(--t-text3)' }}>No scan logs for this filter</div>
                </div>
            ) : isMobile ? (
                /* Mobile: stacked cards */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {logs.map(log => {
                        const sc = SCAN_STATUS_COLORS[log.scan_status] || SCAN_STATUS_COLORS.VALID;
                        const tc = SCAN_TYPE_COLORS[log.scan_type]   || { bg: '#88888815', text: '#888' };
                        return (
                            <div key={log.id} style={{
                                padding: '10px 12px', borderRadius: 12,
                                background: 'var(--t-surface2)', border: `1px solid ${sc.border}`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--t-text)' }}>{log.worker_name}</span>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 800, background: tc.bg, color: tc.text }}>{log.scan_type}</span>
                                        <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 800, background: sc.bg, color: sc.text }}>{log.scan_status}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--t-text3)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <span>🕐 {fmtDateTime(log.scanned_at)}</span>
                                    {log.is_late  && <span style={{ color: '#f59e0b', fontWeight: 700 }}>⚠ LATE</span>}
                                    {log.is_early && <span style={{ color: '#8b5cf6', fontWeight: 700 }}>⚠ EARLY</span>}
                                </div>
                                {log.note && <div style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 4, fontStyle: 'italic' }}>{log.note}</div>}
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Desktop: table */
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: 'var(--t-surface2)' }}>
                                {['Time', 'Worker', 'Action', 'Status', 'Flags', 'Note'].map(h => (
                                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--t-text3)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--t-border)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => {
                                const sc = SCAN_STATUS_COLORS[log.scan_status] || SCAN_STATUS_COLORS.VALID;
                                const tc = SCAN_TYPE_COLORS[log.scan_type]   || { bg: '#88888815', text: '#888' };
                                return (
                                    <tr key={log.id} style={{ borderBottom: '1px solid var(--t-border)' }}>
                                        <td style={{ padding: '8px 12px', color: 'var(--t-text3)', whiteSpace: 'nowrap' }}>{fmtDateTime(log.scanned_at)}</td>
                                        <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--t-text)' }}>{log.worker_name}</td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: tc.bg, color: tc.text }}>{log.scan_type}</span>
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{log.scan_status}</span>
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            {log.is_late  && <span style={{ marginRight: 4, fontSize: 10, fontWeight: 800, color: '#f59e0b' }}>⚠LATE</span>}
                                            {log.is_early && <span style={{ fontSize: 10, fontWeight: 800, color: '#8b5cf6' }}>⚠EARLY</span>}
                                        </td>
                                        <td style={{ padding: '8px 12px', color: 'var(--t-text3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.note || '—'}</td>
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

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Per-Worker Custom Time Windows
// ─────────────────────────────────────────────────────────────────────────────
function WorkerWindowsSection({ projectId }) {
    const [workers,  setWorkers]  = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [editing,  setEditing]  = useState(null);   // worker object being edited
    const [draft,    setDraft]    = useState({});
    const [saving,   setSaving]   = useState(false);
    const [msg,      setMsg]      = useState('');
    const [err,      setErr]      = useState('');
    const isMobile = useIsMobile();

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const d = await attendanceService.getWorkers({ project: projectId, active: 'true' });
            setWorkers(Array.isArray(d) ? d : (d.results || []));
        } catch { setErr('Could not load workers.'); }
        finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const openEdit = (w) => {
        setEditing(w);
        setDraft({
            use_custom_window:    w.use_custom_window    || false,
            custom_checkin_start:  w.custom_checkin_start  || '08:00',
            custom_checkin_end:    w.custom_checkin_end    || '10:00',
            custom_checkout_start: w.custom_checkout_start || '17:00',
            custom_checkout_end:   w.custom_checkout_end   || '19:00',
        });
        setMsg(''); setErr('');
    };

    const handleSave = async () => {
        if (!editing) return;
        setSaving(true); setMsg(''); setErr('');
        try {
            const updated = await attendanceService.updateWorker(editing.id, draft);
            setWorkers(prev => prev.map(w => w.id === updated.id ? updated : w));
            setEditing(null);
            setMsg(`✓ Custom window saved for ${updated.name}`);
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            setErr(e?.response?.data?.detail || 'Save failed.');
        } finally { setSaving(false); }
    };

    const handleToggle = async (w) => {
        const newVal = !w.use_custom_window;
        // Optimistic
        setWorkers(prev => prev.map(x => x.id === w.id ? { ...x, use_custom_window: newVal } : x));
        try {
            const updated = await attendanceService.updateWorker(w.id, { use_custom_window: newVal });
            setWorkers(prev => prev.map(x => x.id === updated.id ? updated : x));
        } catch {
            // Rollback
            setWorkers(prev => prev.map(x => x.id === w.id ? { ...x, use_custom_window: !newVal } : x));
        }
    };

    const fmt = t => t ? String(t).slice(0, 5) : '—';
    const fieldStyle = { padding: '9px 11px', borderRadius: 9, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text)', fontSize: 13, width: '100%', boxSizing: 'border-box' };
    const labelStyle = { fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 };

    if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-text3)', fontSize: 13 }}>Loading workers…</div>;

    return (
        <div>
            {/* Info note */}
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#3b82f610', border: '1px solid #3b82f625', marginBottom: 16, fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.6 }}>
                <span style={{ fontWeight: 800, color: '#3b82f6' }}>प्रति-कामदार समय सेटिङ —</span> यहाँ हरेक कामदारको लागि अलग check-in/check-out समय तोक्न सकिन्छ। Custom window ON भएको कामदारको लागि project-level window काम गर्दैन।
            </div>

            {msg && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#10b98115', border: '1px solid #10b98130', color: '#10b981', fontSize: 12, marginBottom: 12 }}>{msg}</div>}
            {err && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#ef444415', color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{err}</div>}

            {workers.length === 0
                ? <div style={{ textAlign: 'center', padding: 32, color: 'var(--t-text3)', fontSize: 13 }}>No active workers found.</div>
                : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {workers.map(w => (
                            <div key={w.id} style={{
                                padding: '12px 14px', borderRadius: 12,
                                background: w.use_custom_window ? '#3b82f608' : 'var(--t-surface2)',
                                border: `1px solid ${w.use_custom_window ? '#3b82f630' : 'var(--t-border)'}`,
                                transition: 'all 0.2s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    {/* Name + trade */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {w.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--t-text3)', marginTop: 1 }}>
                                            {w.trade_display}
                                            {w.use_custom_window && w.custom_checkin_start && (
                                                <span style={{ marginLeft: 8, color: '#3b82f6', fontWeight: 700 }}>
                                                    IN {fmt(w.custom_checkin_start)}–{fmt(w.custom_checkin_end)}
                                                    &nbsp;·&nbsp;OUT {fmt(w.custom_checkout_start)}–{fmt(w.custom_checkout_end)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* ON/OFF toggle */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: w.use_custom_window ? '#3b82f6' : 'var(--t-text3)' }}>
                                            {w.use_custom_window ? 'Custom ON' : 'Project Default'}
                                        </span>
                                        <div onClick={() => handleToggle(w)} style={{
                                            width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
                                            background: w.use_custom_window ? '#3b82f6' : 'var(--t-border)',
                                            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                                        }}>
                                            <div style={{
                                                position: 'absolute', top: 3, left: w.use_custom_window ? 21 : 3,
                                                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left 0.2s',
                                            }} />
                                        </div>
                                        {/* Edit button */}
                                        <button onClick={() => openEdit(w)} style={{
                                            padding: '5px 10px', borderRadius: 7, border: '1px solid var(--t-border)',
                                            background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 11,
                                            fontWeight: 700, cursor: 'pointer',
                                        }}>
                                            ✏️ Set
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Edit bottom sheet */}
            {editing && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
                    onClick={() => setEditing(null)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--t-surface)', borderRadius: '20px 20px 0 0',
                        border: '1px solid var(--t-border)', borderBottom: 'none',
                        padding: '20px 20px 40px', width: '100%', maxWidth: 520,
                        boxShadow: '0 -12px 60px rgba(0,0,0,0.3)',
                    }}>
                        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--t-border)', margin: '0 auto 18px' }} />

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div>
                                <h3 style={{ margin: 0, fontWeight: 900, fontSize: 15, color: 'var(--t-text)' }}>
                                    Custom Window — {editing.name}
                                </h3>
                                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--t-text3)' }}>{editing.trade_display}</p>
                            </div>
                            <button onClick={() => setEditing(null)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', cursor: 'pointer', fontSize: 15, color: 'var(--t-text3)' }}>✕</button>
                        </div>

                        {/* Enable toggle inside sheet */}
                        <div onClick={() => setDraft(d => ({ ...d, use_custom_window: !d.use_custom_window }))}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: draft.use_custom_window ? '#3b82f610' : 'var(--t-surface2)', border: `1px solid ${draft.use_custom_window ? '#3b82f630' : 'var(--t-border)'}`, marginBottom: 16, cursor: 'pointer' }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--t-text)' }}>
                                    {draft.use_custom_window ? '🔵 Custom window ON' : '⚪ Use project default'}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--t-text3)', marginTop: 2 }}>
                                    {draft.use_custom_window ? 'This worker uses the times below' : 'Project-level time window applies'}
                                </div>
                            </div>
                            <div style={{ width: 44, height: 24, borderRadius: 12, background: draft.use_custom_window ? '#3b82f6' : 'var(--t-border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                                <div style={{ position: 'absolute', top: 3, left: draft.use_custom_window ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.2s' }} />
                            </div>
                        </div>

                        {/* Time fields — shown only when custom is ON */}
                        {draft.use_custom_window && (
                            <div style={{ animation: 'fadeIn 0.18s ease' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                    <div><label style={labelStyle}>Check-in Opens</label>
                                        <input type="time" style={fieldStyle} value={draft.custom_checkin_start || ''} onChange={e => setDraft(d => ({ ...d, custom_checkin_start: e.target.value }))} /></div>
                                    <div><label style={labelStyle}>Check-in Closes</label>
                                        <input type="time" style={fieldStyle} value={draft.custom_checkin_end || ''} onChange={e => setDraft(d => ({ ...d, custom_checkin_end: e.target.value }))} /></div>
                                    <div><label style={labelStyle}>Check-out Opens</label>
                                        <input type="time" style={fieldStyle} value={draft.custom_checkout_start || ''} onChange={e => setDraft(d => ({ ...d, custom_checkout_start: e.target.value }))} /></div>
                                    <div><label style={labelStyle}>Check-out Closes</label>
                                        <input type="time" style={fieldStyle} value={draft.custom_checkout_end || ''} onChange={e => setDraft(d => ({ ...d, custom_checkout_end: e.target.value }))} /></div>
                                </div>
                                {/* Preview */}
                                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--t-surface2)', border: '1px solid var(--t-border)', fontSize: 11, color: 'var(--t-text3)', marginBottom: 14, display: 'flex', gap: 16 }}>
                                    <span><b style={{ color: '#10b981' }}>IN</b> {draft.custom_checkin_start}–{draft.custom_checkin_end}</span>
                                    <span><b style={{ color: '#3b82f6' }}>OUT</b> {draft.custom_checkout_start}–{draft.custom_checkout_end}</span>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setEditing(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', background: saving ? 'var(--t-border)' : '#3b82f6', color: '#fff', fontWeight: 800, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
                                {saving ? 'Saving…' : '💾 Save'}
                            </button>
                        </div>
                        <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminScanTab({ projectId }) {
    const [section, setSection] = useState('window');
    const isMobile = useIsMobile();

    const SECTIONS = [
        { id: 'window',  icon: '⏱', label: 'Time Windows'     },
        { id: 'workers', icon: '👷', label: 'Per Worker'       },
        { id: 'missed',  icon: '⚠️', label: 'Missed'          },
        { id: 'logs',    icon: '📋', label: 'Scan Log'         },
    ];

    if (!projectId) {
        return (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--t-text3)', fontSize: 13 }}>
                Select a project to manage scan settings.
            </div>
        );
    }

    return (
        <div>
            {/* Section pill switcher */}
            <div style={{
                display: 'flex', gap: 4, marginBottom: 20,
                background: 'var(--t-surface2)', borderRadius: 14, padding: 4,
                border: '1px solid var(--t-border)',
            }}>
                {SECTIONS.map(s => (
                    <button key={s.id} onClick={() => setSection(s.id)} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 5, padding: isMobile ? '10px 6px' : '10px 16px',
                        borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: section === s.id ? 'var(--t-surface)' : 'transparent',
                        color: section === s.id ? '#f97316' : 'var(--t-text3)',
                        fontWeight: section === s.id ? 800 : 600,
                        fontSize: isMobile ? 11 : 12,
                        boxShadow: section === s.id ? '0 1px 6px rgba(0,0,0,0.10)' : 'none',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                    }}>
                        <span>{s.icon}</span>
                        <span>{isMobile ? s.label.split(' ')[0] : s.label}</span>
                    </button>
                ))}
            </div>

            {/* Section content */}
            {section === 'window' && (
                <div>
                    <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'var(--t-text)' }}>
                        QR Scan Time Windows
                    </h3>
                    <TimeWindowSection projectId={projectId} />
                </div>
            )}
            {section === 'workers' && (
                <div>
                    <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'var(--t-text)' }}>
                        Per-Worker Time Windows
                    </h3>
                    <WorkerWindowsSection projectId={projectId} />
                </div>
            )}
            {section === 'missed' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--t-text)' }}>
                            Missed Checkouts
                        </h3>
                    </div>
                    <MissedCheckoutsSection projectId={projectId} />
                </div>
            )}
            {section === 'logs' && (
                <div>
                    <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'var(--t-text)' }}>
                        Scan Attempt Log
                    </h3>
                    <ScanLogsSection projectId={projectId} />
                </div>
            )}
        </div>
    );
}
