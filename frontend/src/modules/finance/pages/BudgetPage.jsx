/**
 * BudgetPage — budget categories with full detail form.
 * Phase-wise distribution is synced to PhaseBudgetAllocation records,
 * and the category's `allocation` is set to the sum of all phase amounts.
 */
import { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useConstruction } from '../../../context/ConstructionContext';
import PageHeader from '../components/shared/PageHeader';
import financeApi from '../services/financeApi';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmt = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const pct = (spent, alloc) => (!alloc || alloc <= 0 ? 0 : Math.min(100, (spent / alloc) * 100));

function statusColor(p) {
    if (p >= 100) return { bg: 'rgba(239,68,68,0.08)',   text: '#dc2626', bar: '#ef4444', border: 'rgba(239,68,68,0.25)' };
    if (p >= 80)  return { bg: 'rgba(245,158,11,0.08)',  text: '#d97706', bar: '#f59e0b', border: 'rgba(245,158,11,0.25)' };
    return             { bg: 'rgba(34,197,94,0.08)',     text: '#16a34a', bar: '#22c55e', border: 'rgba(34,197,94,0.25)'  };
}

/* ── slide-up sheet ───────────────────────────────────────────────────────── */
function Sheet({ open, onClose, title, children }) {
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);
    if (!open) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }} />
            <div style={{
                position: 'relative', zIndex: 1,
                background: 'var(--t-surface)', borderRadius: '20px 20px 0 0',
                maxHeight: '94vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
            }}>
                <div style={{ padding: '12px 0 4px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--t-border)' }} />
                </div>
                <div style={{ padding: '4px 20px 14px', borderBottom: '1px solid var(--t-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: 'var(--t-text)' }}>{title}</p>
                    <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text2)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

/* ── category form ────────────────────────────────────────────────────────── */
function CategoryForm({ category, projectId, phases, onDone }) {
    const isEdit = !!(category?.id);

    // Core fields
    const [name,        setName]        = useState(category?.name        || '');
    const [description, setDescription] = useState(category?.description || '');

    // Phase-wise allocation map: { phaseId: amountString }
    const [phaseAmounts, setPhaseAmounts] = useState(() => {
        const map = {};
        if (category?.phase_allocations) {
            category.phase_allocations.forEach(a => {
                map[a.phase] = String(Number(a.amount) || '');
            });
        }
        return map;
    });

    const [busy,       setBusy]       = useState(false);
    const [err,        setErr]        = useState('');
    const [confirmDel, setConfirmDel] = useState(false);

    // Total allocation = sum of all phase amounts
    const totalAllocation = useMemo(() =>
        phases.reduce((sum, p) => sum + (Number(phaseAmounts[p.id]) || 0), 0),
        [phaseAmounts, phases]
    );

    // Read-only actuals (edit only)
    const actualSpent  = Number(category?.total_spent    || 0);
    const remaining    = totalAllocation - actualSpent;
    const spentPct     = pct(actualSpent, totalAllocation);
    const sc           = statusColor(spentPct);

    const setPhaseAmt = (phaseId, val) =>
        setPhaseAmounts(prev => ({ ...prev, [phaseId]: val }));

    /* ── save ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) { setErr('Category name is required.'); return; }
        setBusy(true); setErr('');
        try {
            let categoryId = category?.id;

            // 1. Save / create category with totalAllocation
            const payload = {
                name:        name.trim(),
                description: description.trim(),
                allocation:  totalAllocation,
                project:     projectId,
            };

            if (isEdit) {
                await financeApi.updateBudgetCategory(categoryId, payload);
            } else {
                const res = await financeApi.createBudgetCategory(payload);
                categoryId = res.data.id;
            }

            // 2. Sync phase allocations (upsert)
            if (categoryId && phases.length > 0) {
                // Build existing allocation map: { phaseId: allocation }
                const existingMap = {};
                (category?.phase_allocations || []).forEach(a => {
                    existingMap[a.phase] = a;
                });

                const ops = phases.map(async (phase) => {
                    const amount = Number(phaseAmounts[phase.id]) || 0;
                    const existing = existingMap[phase.id];

                    if (existing) {
                        // Update existing allocation
                        return financeApi.updateBudgetAllocation(existing.id, {
                            category: categoryId,
                            phase: phase.id,
                            amount,
                        });
                    } else if (amount > 0) {
                        // Create new allocation only if amount > 0
                        return financeApi.createBudgetAllocation({
                            category: categoryId,
                            phase: phase.id,
                            amount,
                        });
                    }
                });

                await Promise.all(ops.filter(Boolean));
            }

            onDone();
        } catch (ex) {
            setErr(ex?.response?.data?.detail || JSON.stringify(ex?.response?.data) || ex.message);
        } finally {
            setBusy(false);
        }
    };

    /* ── delete ── */
    const handleDelete = async () => {
        setBusy(true);
        try {
            await financeApi.deleteBudgetCategory(category.id);
            onDone();
        } catch (ex) {
            setErr('Delete failed: ' + (ex?.response?.data?.detail || ex.message));
        } finally { setBusy(false); setConfirmDel(false); }
    };

    /* ── styles ── */
    const inp = {
        width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 600,
        border: '1.5px solid var(--t-border)', borderRadius: 10, outline: 'none',
        background: 'var(--t-surface2)', color: 'var(--t-text)', boxSizing: 'border-box',
    };
    const lbl = {
        display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--t-text3)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5,
    };
    const card = {
        background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
        borderRadius: 14, padding: '14px', marginBottom: 14,
    };

    return (
        <form onSubmit={handleSubmit}>
            {err && (
                <div style={{ padding: '10px 12px', marginBottom: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                    {err}
                </div>
            )}

            {/* ── Budget health banner (edit only) ── */}
            {isEdit && totalAllocation > 0 && (
                <div style={{ ...card, background: sc.bg, border: `1px solid ${sc.border}`, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: sc.text, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Budget Health</p>
                            <p style={{ margin: '3px 0 0', fontSize: 22, fontWeight: 900, color: sc.text, fontFamily: 'var(--f-mono)' }}>{spentPct.toFixed(0)}% used</p>
                        </div>
                        <span style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontWeight: 900 }}>
                            {spentPct >= 100 ? '🔴 Over Budget' : spentPct >= 80 ? '🟡 Warning' : '🟢 On Track'}
                        </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 12 }}>
                        <div style={{ height: '100%', width: `${spentPct}%`, background: sc.bar, borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {[
                            { label: 'Estimated',  value: `NPR ${fmt(totalAllocation)}`, color: 'var(--t-text2)' },
                            { label: 'Actual',     value: `NPR ${fmt(actualSpent)}`,     color: sc.text          },
                            { label: 'Remaining',  value: `NPR ${fmt(remaining)}`,       color: remaining < 0 ? '#ef4444' : '#16a34a' },
                        ].map(({ label, value, color }) => (
                            <div key={label} style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase' }}>{label}</p>
                                <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 900, color, fontFamily: 'var(--f-mono)' }}>{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Identity ── */}
            <div style={card}>
                <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 900, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.12em' }}>🏷️ Identity</p>

                <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>Category Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Civil Work, Electrical, Plumbing…" required />
                </div>

                <div>
                    <label style={lbl}>Description</label>
                    <textarea style={{ ...inp, minHeight: 64, resize: 'vertical', lineHeight: 1.5 }}
                        value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="What expenses fall under this category?" />
                </div>
            </div>

            {/* ── Phase-wise Budget Distribution ── */}
            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        📊 Phase-wise Budget
                    </p>
                    {totalAllocation > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#3b82f6', fontFamily: 'var(--f-mono)' }}>
                            NPR {fmt(totalAllocation)}
                        </span>
                    )}
                </div>

                {phases.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text3)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                        No phases found. Create phases first to distribute budget.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {phases.map((phase, idx) => {
                            const amt = Number(phaseAmounts[phase.id]) || 0;
                            const phasePct = totalAllocation > 0 ? ((amt / totalAllocation) * 100).toFixed(0) : 0;
                            return (
                                <div key={phase.id} style={{
                                    background: 'var(--t-surface)',
                                    border: `1px solid ${amt > 0 ? 'rgba(59,130,246,0.3)' : 'var(--t-border)'}`,
                                    borderRadius: 10, padding: '10px 12px',
                                    display: 'flex', alignItems: 'center', gap: 10,
                                }}>
                                    {/* Phase indicator */}
                                    <div style={{
                                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                        background: amt > 0 ? 'rgba(59,130,246,0.12)' : 'var(--t-surface2)',
                                        border: `1px solid ${amt > 0 ? 'rgba(59,130,246,0.25)' : 'var(--t-border)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 900,
                                        color: amt > 0 ? '#3b82f6' : 'var(--t-text3)',
                                    }}>
                                        {idx + 1}
                                    </div>

                                    {/* Phase name */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {phase.name}
                                        </p>
                                        {amt > 0 && (
                                            <p style={{ margin: '1px 0 0', fontSize: 9, color: '#3b82f6', fontWeight: 700 }}>
                                                {phasePct}% of total
                                            </p>
                                        )}
                                    </div>

                                    {/* Amount input */}
                                    <div style={{ width: 110, flexShrink: 0 }}>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 800, color: 'var(--t-text3)', pointerEvents: 'none' }}>₨</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={phaseAmounts[phase.id] || ''}
                                                onChange={e => setPhaseAmt(phase.id, e.target.value)}
                                                placeholder="0"
                                                style={{
                                                    ...inp,
                                                    paddingLeft: 22, paddingTop: 7, paddingBottom: 7,
                                                    fontSize: 12, fontFamily: 'var(--f-mono)',
                                                    textAlign: 'right', paddingRight: 8,
                                                    borderColor: amt > 0 ? 'rgba(59,130,246,0.4)' : 'var(--t-border)',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Total */}
                {totalAllocation > 0 && (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--t-text2)' }}>Total Estimated Budget</span>
                        <span style={{ fontSize: 15, fontWeight: 900, color: '#3b82f6', fontFamily: 'var(--f-mono)' }}>NPR {fmt(totalAllocation)}</span>
                    </div>
                )}
            </div>

            {/* ── Actuals (edit only, read-only) ── */}
            {isEdit && (
                <div style={{ ...card, background: 'var(--t-surface)' }}>
                    <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        📈 Actuals (Read-only)
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                            { label: 'Total Actual Spent',  value: `NPR ${fmt(actualSpent)}`,                                       note: 'From linked expenses'     },
                            { label: 'Remaining Budget',     value: `NPR ${fmt(remaining)}`,                                         note: remaining < 0 ? '⚠ Over budget' : 'Still available' },
                            { label: 'Variance',             value: `${remaining < 0 ? '−' : '+'}NPR ${fmt(Math.abs(remaining))}`,   note: 'Estimated − Actual'       },
                            { label: 'Utilisation',          value: `${spentPct.toFixed(1)}%`,                                       note: 'Of estimated budget'      },
                        ].map(({ label, value, note }) => (
                            <div key={label} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--t-surface2)', border: '1px solid var(--t-border)' }}>
                                <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                                <p style={{ margin: '4px 0 2px', fontSize: 13, fontWeight: 900, color: label === 'Remaining Budget' && remaining < 0 ? '#ef4444' : 'var(--t-text)', fontFamily: 'var(--f-mono)' }}>{value}</p>
                                <p style={{ margin: 0, fontSize: 9, color: 'var(--t-text3)' }}>{note}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Save ── */}
            <button type="submit" disabled={busy} style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: busy ? 'var(--t-border)' : 'var(--t-text)',
                color: 'var(--t-bg)', fontSize: 13, fontWeight: 900,
                cursor: busy ? 'default' : 'pointer', letterSpacing: '0.04em', marginBottom: 10,
            }}>
                {busy ? 'Saving…' : isEdit ? '✓ Update Category' : '+ Create Category'}
            </button>

            {/* ── Delete ── */}
            {isEdit && !confirmDel && (
                <button type="button" onClick={() => setConfirmDel(true)} style={{
                    width: '100%', padding: '10px', borderRadius: 12,
                    border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)',
                    color: '#ef4444', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                }}>
                    🗑 Delete Category
                </button>
            )}
            {isEdit && confirmDel && (
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#ef4444', textAlign: 'center' }}>
                        Delete "{name}"? This cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" onClick={() => setConfirmDel(false)} style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text2)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                        <button type="button" onClick={handleDelete} disabled={busy} style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>Delete</button>
                    </div>
                </div>
            )}
        </form>
    );
}

/* ── budget card ──────────────────────────────────────────────────────────── */
function BudgetCard({ cat, onEdit }) {
    const spent     = Number(cat.total_spent     || 0);
    const alloc     = Number(cat.allocation      || 0);
    const remaining = Number(cat.remaining_budget ?? (alloc - spent));
    const p         = pct(spent, alloc);
    const sc        = statusColor(p);

    // Phase allocations breakdown
    const phases = cat.phase_allocations || [];

    return (
        <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
            {/* accent bar */}
            <div style={{ height: 3, background: alloc > 0 ? sc.bar : 'var(--t-border)' }} />

            <div style={{ padding: '12px 14px 14px' }}>
                {/* Row 1: name + chip + edit */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: 'var(--t-text)', wordBreak: 'break-word' }}>{cat.name}</p>
                        {cat.description && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.4 }}>{cat.description}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {alloc > 0 && (
                            <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontWeight: 900 }}>
                                {p.toFixed(0)}%
                            </span>
                        )}
                        <button onClick={() => onEdit(cat)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text3)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                    </div>
                </div>

                {/* No budget set yet */}
                {alloc === 0 ? (
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px dashed rgba(245,158,11,0.3)', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: 11, color: '#d97706', fontWeight: 700 }}>
                            ⚠ No budget set — tap ✏️ to add phase-wise allocation
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Progress bar */}
                        <div style={{ height: 7, borderRadius: 4, background: 'var(--t-border)', overflow: 'hidden', marginBottom: 10 }}>
                            <div style={{ height: '100%', width: `${p}%`, background: sc.bar, borderRadius: 4, transition: 'width 0.4s' }} />
                        </div>

                        {/* 3 stat tiles */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
                            {[
                                { label: 'Estimated',  value: `NPR ${fmt(alloc)}`,      color: 'var(--t-text2)' },
                                { label: 'Actual',     value: `NPR ${fmt(spent)}`,      color: sc.text          },
                                { label: 'Remaining',  value: `NPR ${fmt(remaining)}`,  color: remaining < 0 ? '#ef4444' : '#16a34a' },
                            ].map(({ label, value, color }) => (
                                <div key={label} style={{ padding: '8px 0', textAlign: 'center', background: 'var(--t-surface2)', borderRadius: 8, border: '1px solid var(--t-border)' }}>
                                    <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
                                    <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 900, color, fontFamily: 'var(--f-mono)' }}>{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Variance */}
                        <div style={{ padding: '7px 10px', borderRadius: 8, background: remaining < 0 ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)', border: `1px solid ${remaining < 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: 'var(--t-text3)', fontWeight: 700 }}>Variance</span>
                            <span style={{ fontSize: 12, fontWeight: 900, color: remaining < 0 ? '#ef4444' : '#16a34a', fontFamily: 'var(--f-mono)' }}>
                                {remaining < 0 ? '−' : '+'} NPR {fmt(Math.abs(remaining))}
                            </span>
                        </div>

                        {/* Phase breakdown (if available) */}
                        {phases.length > 0 && (
                            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {phases.map(a => (
                                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 6, background: 'var(--t-surface2)' }}>
                                        <span style={{ fontSize: 10, color: 'var(--t-text2)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.phase_name}</span>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--t-text)', fontFamily: 'var(--f-mono)', flexShrink: 0, marginLeft: 8 }}>NPR {fmt(a.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

/* ── summary bar ──────────────────────────────────────────────────────────── */
function SummaryBar({ categories }) {
    const totalEst   = categories.reduce((s, c) => s + Number(c.allocation   || 0), 0);
    const totalSpent = categories.reduce((s, c) => s + Number(c.total_spent  || 0), 0);
    const totalRem   = totalEst - totalSpent;
    const overCount  = categories.filter(c => Number(c.total_spent || 0) > Number(c.allocation || 1)).length;
    const p          = pct(totalSpent, totalEst);
    const sc         = statusColor(p);

    return (
        <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                {[
                    { label: 'Total Estimated', value: `NPR ${fmt(totalEst)}`,   color: '#3b82f6' },
                    { label: 'Total Spent',     value: `NPR ${fmt(totalSpent)}`, color: p >= 100 ? '#ef4444' : 'var(--t-text)' },
                    { label: 'Remaining',       value: `NPR ${fmt(totalRem)}`,   color: totalRem < 0 ? '#ef4444' : '#16a34a' },
                    { label: 'Categories',      value: `${categories.length}`,   color: 'var(--t-text)' },
                ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--t-surface2)', border: '1px solid var(--t-border)' }}>
                        <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 900, color, fontFamily: 'var(--f-mono)' }}>{value}</p>
                    </div>
                ))}
            </div>

            {totalEst > 0 && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase' }}>Overall utilisation</span>
                        <span style={{ fontSize: 10, fontWeight: 900, color: sc.text }}>{p.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--t-border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${p}%`, background: sc.bar, transition: 'width 0.4s' }} />
                    </div>
                    {overCount > 0 && (
                        <p style={{ margin: '6px 0 0', fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>
                            ⚠ {overCount} categor{overCount === 1 ? 'y is' : 'ies are'} over budget
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

/* ── page ─────────────────────────────────────────────────────────────────── */
export default function BudgetPage() {
    const { projectId }            = useFinance();
    const { dashboardData }        = useConstruction();
    const phases                   = dashboardData?.phases || [];

    const [categories, setCategories] = useState([]);
    const [fetching,   setFetching]   = useState(false);
    const [sheetOpen,  setSheetOpen]  = useState(false);
    const [editing,    setEditing]    = useState(null);

    const load = async () => {
        setFetching(true);
        try {
            const res = await financeApi.getBudgetCategories(projectId);
            setCategories(res.data?.results || res.data || []);
        } catch { /* ignore */ }
        finally { setFetching(false); }
    };

    useEffect(() => { load(); }, [projectId]);

    const openNew  = ()  => { setEditing(null); setSheetOpen(true); };
    const openEdit = (c) => { setEditing(c);    setSheetOpen(true); };
    const handleDone = () => { setSheetOpen(false); load(); };

    return (
        <div>
            <PageHeader
                title="Budget"
                subtitle="Category allocations & spend tracking"
                actions={
                    <button onClick={openNew} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'var(--t-text)', color: 'var(--t-bg)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
                        🎯 Add Category
                    </button>
                }
            />

            {fetching ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--t-border)', borderTopColor: 'var(--t-text)', animation: 'spin 0.8s linear infinite' }} />
                </div>
            ) : categories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <p style={{ fontSize: 40, marginBottom: 8 }}>🎯</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--t-text)' }}>No budget categories yet</p>
                    <p style={{ margin: '4px 0 20px', fontSize: 12, color: 'var(--t-text3)' }}>Add categories to start tracking budget vs actuals.</p>
                    <button onClick={openNew} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'var(--t-text)', color: 'var(--t-bg)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>
                        + Add First Category
                    </button>
                </div>
            ) : (
                <>
                    <SummaryBar categories={categories} />
                    {categories.map(cat => (
                        <BudgetCard key={cat.id} cat={cat} onEdit={openEdit} />
                    ))}
                </>
            )}

            <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editing ? `Edit: ${editing.name}` : '🎯 Add Budget Category'}>
                <CategoryForm
                    key={editing?.id ?? 'new'}
                    category={editing}
                    projectId={projectId}
                    phases={phases}
                    onDone={handleDone}
                />
            </Sheet>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
