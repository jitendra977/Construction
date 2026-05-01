/**
 * WorkforceHub.jsx
 * ─────────────────
 * Main entry-point for the Workforce Management module.
 * Tabs: Members | Payroll | Assignments | Evaluations | Safety
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { Link } from 'react-router-dom';
import workforceService from '../../services/workforceService';
import attendanceService from '../../services/attendanceService';
import { dashboardService } from '../../services/api';
import IDCardModal from './components/IDCardModal';
import MemberDrawer, { StatusBadge, TypeBadge, Spinner } from './components/MemberDrawer';
import WorkforceMembersView from './components/WorkforceMembersView';

// ── Constants ────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'MEMBERS',     label: 'Members',      short: 'Staff',   icon: '👥' },
    { id: 'PAYROLL',     label: 'Payroll',      short: 'Wage',    icon: '💰' },
    { id: 'ASSIGNMENTS', label: 'Assignments',  short: 'Tasks',   icon: '🏗️' },
    { id: 'EVALUATIONS', label: 'Evaluations',  short: 'Stats',   icon: '📈' },
    { id: 'SAFETY',      label: 'Safety',       short: 'Safe',    icon: '🦺' },
];

const STATUS_MAP = {
    ACTIVE:      { bg: '#d1fae5', color: '#065f46', label: 'Active' },
    ON_LEAVE:    { bg: '#fef3c7', color: '#92400e', label: 'On Leave' },
    INACTIVE:    { bg: '#f3f4f6', color: '#6b7280', label: 'Inactive' },
    SUSPENDED:   { bg: '#fee2e2', color: '#991b1b', label: 'Suspended' },
    BLACKLISTED: { bg: '#1f2937', color: '#f9fafb', label: 'Blacklisted' },
};

const TYPE_COLORS = {
    LABOUR:        { bg: '#dbeafe', color: '#1e40af' },
    STAFF:         { bg: '#ede9fe', color: '#5b21b6' },
    SUBCONTRACTOR: { bg: '#fef3c7', color: '#92400e' },
    FREELANCE:     { bg: '#d1fae5', color: '#065f46' },
};

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


// ── Create Portal Account Modal ───────────────────────────────────────────────
function CreateAccountModal({ member, onClose }) {
    const [pin, setPin]                   = useState('');
    const [result, setResult]             = useState(null);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');
    // Email send step
    const [emailDest, setEmailDest]       = useState('member'); // 'member' | 'custom'
    const [customEmail, setCustomEmail]   = useState('');
    const [sending, setSending]           = useState(false);
    const [emailStatus, setEmailStatus]   = useState(null); // null | 'sent' | 'failed'
    const [emailError, setEmailError]     = useState('');

    const [sendEmail, setSendEmail]       = useState(false);

    // Pre-fill member email when result arrives or from member object
    const memberEmail = member.email && !member.email.endsWith('@worker.local') ? member.email : '';

    const executeAction = async (actionFn, actionName) => {
        if (sendEmail) {
            const resolvedEmail = emailDest === 'member' ? memberEmail : customEmail.trim();
            if (!resolvedEmail) {
                setEmailError('Please enter a valid email address.');
                return;
            }
        }
        
        setLoading(true); setError(''); setEmailError('');
        try {
            const data = await actionFn(member.id, pin ? { pin } : {});
            setResult(data);
            
            if (sendEmail) {
                const resolvedEmail = emailDest === 'member' ? (memberEmail || data.email) : customEmail.trim();
                setSending(true);
                try {
                    await workforceService.sendPortalCredentials(member.id, {
                        recipient_email: resolvedEmail,
                        pin:             data.pin,
                        portal_url:      `${window.location.origin}/worker`,
                        project_name:    member.project_name || 'Construction Site',
                    });
                    setEmailStatus('sent');
                } catch (e) {
                    setEmailStatus('failed');
                    setEmailError(e?.response?.data?.error || 'Email delivery failed. Check server email settings.');
                } finally { setSending(false); }
            }
        } catch (e) {
            setError(e?.response?.data?.error || `Failed to ${actionName}.`);
        } finally { setLoading(false); }
    };

    const handleCreate = () => executeAction(workforceService.createAccount, 'create account');
    const handleReset  = () => executeAction(workforceService.resetPin, 'reset PIN');

    const fieldStyle = {
        width: '100%', padding: '9px 12px', borderRadius: 10,
        border: '1px solid var(--t-border)', background: 'var(--t-surface)',
        color: 'var(--t-text)', fontSize: 13, boxSizing: 'border-box',
    };

    const renderEmailConfig = () => (
        <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                ✉️ Send credentials via email
            </label>
            {sendEmail && (
                <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        {[
                            { val: 'member', label: `Member's email`, sub: memberEmail || 'Not set', disabled: !memberEmail },
                            { val: 'custom', label: 'Custom address', sub: 'Enter any email' },
                        ].map(opt => (
                            <button key={opt.val} onClick={() => !opt.disabled && setEmailDest(opt.val)}
                                disabled={opt.disabled}
                                style={{
                                    flex: 1, padding: '10px 8px', borderRadius: 9, cursor: opt.disabled ? 'not-allowed' : 'pointer',
                                    border: `2px solid ${emailDest === opt.val ? '#3b82f6' : 'var(--t-border)'}`,
                                    background: emailDest === opt.val ? '#eff6ff' : 'var(--t-surface)',
                                    opacity: opt.disabled ? 0.45 : 1,
                                    textAlign: 'left',
                                }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: emailDest === opt.val ? '#1d4ed8' : 'var(--t-text)' }}>{opt.label}</div>
                                <div style={{ fontSize: 11, color: 'var(--t-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.sub}</div>
                            </button>
                        ))}
                    </div>
                    {emailDest === 'custom' && (
                        <input
                            type="email"
                            value={customEmail}
                            onChange={e => setCustomEmail(e.target.value)}
                            placeholder="Recipient email address"
                            style={{ ...fieldStyle, marginBottom: 12 }}
                        />
                    )}
                    {emailError && <div style={{ color: '#ef4444', fontSize: 12 }}>{emailError}</div>}
                </div>
            )}
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--t-bg)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 4px', fontWeight: 900, fontSize: 17 }}>📱 {member.account ? 'Manage Worker Portal Account' : 'Create Worker Portal Account'}</h3>
                <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--t-text-muted)' }}>
                    {member.full_name} — {member.employee_id}
                </p>

                {/* ── STEP 1: Create or Reset account ── */}
                {!result ? (
                    member.account ? (
                        <>
                            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>✅ Portal account exists</div>
                                <div style={{ fontSize: 12, color: '#065f46', opacity: 0.8 }}>Username: <strong>{member.phone || '(hidden)'}</strong></div>
                            </div>
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t-text-muted)', marginBottom: 6 }}>
                                    New PIN (4-6 digits — leave blank to auto-generate)
                                </label>
                                <input
                                    type="text" inputMode="numeric" maxLength={6}
                                    value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Auto-generate"
                                    style={{ ...fieldStyle, fontSize: 16, letterSpacing: '0.25em' }}
                                />
                            </div>
                            {renderEmailConfig()}
                            {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{error}</div>}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={handleReset} disabled={loading || sending} style={{
                                    flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                                    background: (loading || sending) ? '#9ca3af' : '#dc2626', color: '#fff', fontWeight: 800, cursor: (loading || sending) ? 'not-allowed' : 'pointer',
                                }}>{(loading || sending) ? 'Processing…' : 'Reset PIN'}</button>
                                <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'transparent', color: 'var(--t-text)', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t-text-muted)', marginBottom: 6 }}>
                                    PIN (4-6 digits — leave blank to auto-generate)
                                </label>
                                <input
                                    type="text" inputMode="numeric" maxLength={6}
                                    value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Auto-generate"
                                    style={{ ...fieldStyle, fontSize: 16, letterSpacing: '0.25em' }}
                                />
                            </div>
                            <p style={{ margin: '0 0 18px', fontSize: 11, color: 'var(--t-text-muted)' }}>
                                Phone <strong>{member.phone || '(none set)'}</strong> will be the username. PIN is shown only once.
                            </p>
                            {renderEmailConfig()}
                            {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{error}</div>}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={handleCreate} disabled={loading || sending || !member.phone} style={{
                                    flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                                    background: (loading || sending) ? '#9ca3af' : '#f97316', color: '#fff', fontWeight: 800, cursor: (loading || sending) ? 'not-allowed' : 'pointer',
                                }}>{(loading || sending) ? 'Processing…' : 'Create Account'}</button>
                                <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'transparent', color: 'var(--t-text)', cursor: 'pointer' }}>Cancel</button>
                            </div>
                            {!member.phone && <p style={{ margin: '10px 0 0', fontSize: 11, color: '#ef4444' }}>No phone number set. Edit the member first.</p>}
                        </>
                    )
                ) : (
                    <>
                        {/* ── STEP 2: Show credentials ── */}
                        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46', marginBottom: 12 }}>✅ {member.account ? 'PIN reset successfully!' : 'Account created!'}</div>
                            {[
                                { label: 'Employee ID',      value: result.employee_id },
                                { label: 'Username (phone)', value: result.username },
                                { label: 'PIN',              value: result.pin, mono: true, highlight: true },
                            ].map(f => (
                                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, color: '#065f46', opacity: 0.8 }}>{f.label}</span>
                                    <span style={{
                                        fontSize: f.highlight ? 24 : 13,
                                        fontFamily: f.mono ? 'monospace' : 'inherit',
                                        fontWeight: f.highlight ? 900 : 600,
                                        color: f.highlight ? '#ea580c' : '#065f46',
                                        letterSpacing: f.highlight ? '0.25em' : 'normal',
                                    }}>{f.value}</span>
                                </div>
                            ))}
                        </div>

                        {sendEmail && emailStatus === 'sent' && (
                            <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1e40af', fontWeight: 700, marginBottom: 16 }}>
                                ✉️ Email sent successfully!
                            </div>
                        )}
                        {sendEmail && emailStatus === 'failed' && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b', fontWeight: 700, marginBottom: 16 }}>
                                ❌ Failed to auto-send email. {emailError}
                            </div>
                        )}

                        <button onClick={onClose} style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'var(--t-primary)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Done</button>
                    </>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// PAYROLL TAB — Merged (Attendance-based + Formal Records)
// ═══════════════════════════════════════════════════════════════════

function thisMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Post-to-Finance modal ─────────────────────────────────────────────────────
function PostToFinanceModal({ totals, projectId, month, onClose }) {
    const [categories,     setCategories]     = useState([]);
    const [fundingSources, setFundingSources] = useState([]);
    const [postData,       setPostData]       = useState({ category: '', funding_source: '' });
    const [posting,        setPosting]        = useState(false);
    const [loadingOpts,    setLoadingOpts]    = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [cats, funds] = await Promise.all([dashboardService.getBudgetCategories(), dashboardService.getFundingSources()]);
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--t-surface)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, border: '1px solid var(--t-border)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: 'var(--t-text)' }}>💸 Post Payroll as Expense</h3>
                <p style={{ fontSize: 13, color: 'var(--t-text-muted)', marginBottom: 20 }}>
                    This will create a new Expense entry for <strong>NPR {Math.round(totals.total_wage_bill || 0).toLocaleString()}</strong>.
                </p>
                {loadingOpts ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--t-text-muted)', fontSize: 13 }}>Loading finance options…</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text-muted)', textTransform: 'uppercase' }}>Budget Category *</label>
                            <select value={postData.category} onChange={e => setPostData(p => ({ ...p, category: e.target.value }))}
                                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', fontSize: 13 }}>
                                <option value="">-- Select Category --</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text-muted)', textTransform: 'uppercase' }}>Funding Source (Optional)</label>
                            <select value={postData.funding_source} onChange={e => setPostData(p => ({ ...p, funding_source: e.target.value }))}
                                style={{ width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', fontSize: 13 }}>
                                <option value="">-- Select Source --</option>
                                {fundingSources.map(s => <option key={s.id} value={s.id}>{s.name} (Bal: NPR {Number(s.current_balance).toLocaleString()})</option>)}
                            </select>
                        </div>
                    </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, fontWeight: 700, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={doPost} disabled={posting || !postData.category || loadingOpts} style={{ flex: 2, padding: '12px', borderRadius: 12, fontWeight: 800, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', opacity: (posting || !postData.category || loadingOpts) ? 0.7 : 1 }}>
                        {posting ? 'Posting…' : 'Confirm & Post'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Formal Payroll Records (collapsible) ──────────────────────────────────────
function FormalRecordsSection({ projectId }) {
    const [open, setOpen]       = useState(false);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded]   = useState(false);

    const load = async () => {
        if (loaded) return;
        setLoading(true);
        try {
            const params = projectId ? { project: projectId } : {};
            const data = await workforceService.getPayrollRecords(params);
            setRecords(Array.isArray(data) ? data : (data.results || []));
            setLoaded(true);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const toggle = () => {
        setOpen(o => !o);
        if (!open && !loaded) load();
    };

    const statusColors = {
        draft:    { bg: '#f3f4f6', color: '#6b7280' },
        approved: { bg: '#dbeafe', color: '#1e40af' },
        paid:     { bg: '#d1fae5', color: '#065f46' },
        void:     { bg: '#fee2e2', color: '#991b1b' },
    };

    return (
        <div style={{ marginTop: 32, border: '1px solid var(--t-border)', borderRadius: 14, overflow: 'hidden' }}>
            <button onClick={toggle} style={{
                width: '100%', padding: '14px 20px', border: 'none', cursor: 'pointer',
                background: 'var(--t-surface)', color: 'var(--t-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 13, fontWeight: 700, textAlign: 'left',
            }}>
                <span>📋 Formal Payroll Records {loaded && records.length > 0 ? `(${records.length})` : ''}</span>
                <span style={{ fontSize: 11, color: 'var(--t-text-muted)', fontWeight: 500 }}>
                    {open ? '▲ collapse' : '▼ expand'} · Approved/paid records from workforce module
                </span>
            </button>

            {open && (
                <div style={{ padding: '0 20px 20px', background: 'var(--t-bg)' }}>
                    {loading ? <Spinner /> : records.length === 0 ? (
                        <EmptyState icon="📋" title="No formal payroll records" subtitle="Payroll records are created per worker per pay period when approved." />
                    ) : (
                        <div style={{ overflowX: 'auto', marginTop: 12 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--t-border)', color: 'var(--t-text-muted)', textAlign: 'left' }}>
                                        {['Worker', 'Period', 'Days', 'Base Pay', 'OT Pay', 'Deductions', 'Net Pay', 'Status'].map(h => (
                                            <th key={h} style={{ padding: '8px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map(r => {
                                        const sc = statusColors[r.status] || statusColors.draft;
                                        const totalDeductions = (Number(r.deduction_tax || 0) + Number(r.deduction_advance || 0) + Number(r.deduction_other || 0));
                                        return (
                                            <tr key={r.id} style={{ borderBottom: '1px solid var(--t-border)' }}>
                                                <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.worker_name || r.worker}</td>
                                                <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--t-text-muted)' }}>{r.period_start} → {r.period_end}</td>
                                                <td style={{ padding: '8px 10px' }}>{r.total_days_present}</td>
                                                <td style={{ padding: '8px 10px' }}>NPR {Number(r.base_pay).toLocaleString()}</td>
                                                <td style={{ padding: '8px 10px', color: '#8b5cf6' }}>NPR {Number(r.overtime_pay).toLocaleString()}</td>
                                                <td style={{ padding: '8px 10px', color: '#ef4444' }}>NPR {totalDeductions.toLocaleString()}</td>
                                                <td style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--t-primary)' }}>NPR {Number(r.net_pay).toLocaleString()}</td>
                                                <td style={{ padding: '8px 10px' }}>
                                                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{r.status?.toUpperCase()}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Attendance-based Payroll (main) ───────────────────────────────────────────
function PayrollTab({ projectId }) {
    const [month,         setMonth]    = useState(thisMonth());
    const [summary,       setSummary]  = useState(null);
    const [loading,       setLoading]  = useState(false);
    const [error,         setError]    = useState('');
    const [showPost,      setShowPost] = useState(false);

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

    if (!projectId) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text-muted)' }}>Select a project first.</div>;

    const workers       = summary?.workers || [];
    const totals        = summary?.totals  || {};
    const labourWorkers = workers.filter(w => w.worker_type === 'LABOUR');
    const staffWorkers  = workers.filter(w => w.worker_type === 'STAFF');
    const labourTotal   = labourWorkers.reduce((s, w) => s + w.grand_total, 0);
    const staffTotal    = staffWorkers.reduce((s,  w) => s + w.grand_total, 0);

    return (
        <div>
            {/* Controls bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 10, fontSize: 13, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }} />
                <button onClick={load} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', cursor: 'pointer' }}>🔄 Refresh</button>
                <button onClick={exportCsv} disabled={workers.length === 0}
                    style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', cursor: 'pointer', opacity: workers.length === 0 ? 0.5 : 1 }}>
                    📥 Export CSV
                </button>
                <button onClick={() => setShowPost(true)} disabled={workers.length === 0}
                    style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 800, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', opacity: workers.length === 0 ? 0.5 : 1, marginLeft: 'auto' }}>
                    💸 Post to Finance
                </button>
                {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
            </div>

            {loading ? <Spinner /> : workers.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', borderRadius: 12, background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text-muted)' }}>
                    No attendance data for {month}. Mark attendance first.
                </div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                        {[
                            { label: 'Total Payroll', value: `NPR ${Math.round(totals.total_wage_bill || 0).toLocaleString()}`, color: '#10b981', icon: '💰' },
                            { label: 'Labour Wages',  value: `NPR ${Math.round(labourTotal).toLocaleString()}`,                color: '#f97316', icon: '👷' },
                            { label: 'Staff Wages',   value: `NPR ${Math.round(staffTotal).toLocaleString()}`,                 color: '#3b82f6', icon: '👔' },
                            { label: 'Total Workers', value: totals.total_workers || 0,                                        color: '#8b5cf6', icon: '👥' },
                        ].map(c => (
                            <div key={c.label} style={{ padding: '18px 16px', borderRadius: 14, background: 'var(--t-surface)', border: '1px solid var(--t-border)', textAlign: 'center' }}>
                                <div style={{ fontSize: 28, marginBottom: 6 }}>{c.icon}</div>
                                <div style={{ fontSize: 11, color: 'var(--t-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Labour and Staff tables */}
                    {[
                        { title: '👷 Daily Labour', list: labourWorkers, total: labourTotal },
                        { title: '👔 Staff',        list: staffWorkers,  total: staffTotal  },
                    ].map(({ title, list, total }) => list.length === 0 ? null : (
                        <div key={title} style={{ marginBottom: 28 }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: 'var(--t-text)' }}>{title}</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--t-surface)' }}>
                                            {['Worker', 'Trade', 'Daily Rate', 'Eff. Days', 'Base Pay', 'OT hrs', 'OT Pay', 'TOTAL'].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--t-text-muted)', borderBottom: '2px solid var(--t-border)' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.map((w, idx) => (
                                            <tr key={w.worker_id} style={{ borderBottom: '1px solid var(--t-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                                                <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--t-text)' }}>{w.worker_name}</td>
                                                <td style={{ padding: '10px 12px', color: 'var(--t-text-muted)' }}>{w.trade}</td>
                                                <td style={{ padding: '10px 12px', color: 'var(--t-text-muted)' }}>NPR {Number(w.daily_rate).toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', fontWeight: 700 }}>{w.effective_days.toFixed(1)}</td>
                                                <td style={{ padding: '10px 12px', color: 'var(--t-text-muted)' }}>NPR {Math.round(w.total_wage).toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', color: '#8b5cf6' }}>{w.total_overtime_hours.toFixed(1)}</td>
                                                <td style={{ padding: '10px 12px', color: '#8b5cf6' }}>NPR {Math.round(w.total_overtime_pay).toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', fontWeight: 900, color: '#10b981', fontSize: 14 }}>NPR {Math.round(w.grand_total).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        <tr style={{ background: 'var(--t-surface)' }}>
                                            <td colSpan={7} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--t-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>Subtotal</td>
                                            <td style={{ padding: '10px 12px', fontWeight: 900, color: '#10b981', fontSize: 15 }}>NPR {Math.round(total).toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* Grand total */}
                    <div style={{ padding: '20px 24px', borderRadius: 14, background: 'rgba(16,185,129,0.08)', border: '2px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Grand Total Payroll — {month}</div>
                            <div style={{ fontSize: 11, color: 'var(--t-text-muted)', marginTop: 2 }}>{totals.total_workers} workers · {totals.days_in_month} days in month</div>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981' }}>NPR {Math.round(totals.total_wage_bill || 0).toLocaleString()}</div>
                    </div>
                </>
            )}

            {/* Formal Records collapsible section */}
            <FormalRecordsSection projectId={projectId} />

            {showPost && <PostToFinanceModal totals={totals} projectId={projectId} month={month} onClose={() => setShowPost(false)} />}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// TAB: ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════
function AssignmentsTab({ projectId }) {
    const [items, setItems]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = projectId ? { project: projectId } : {};
            const data = await workforceService.getAssignments(params);
            setItems(Array.isArray(data) ? data : (data.results || []));
        } catch {
            setError('Failed to load assignments.');
        } finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const statusColors = {
        scheduled: '#dbeafe', active: '#d1fae5',
        completed: '#f3f4f6', cancelled: '#fee2e2', on_hold: '#fef3c7',
    };

    return (
        <div>
            {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</div>}
            {loading ? <Spinner /> : items.length === 0 ? (
                <EmptyState icon="📌" title="No assignments" subtitle="Create assignments to track which workers are assigned to which projects." />
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--t-border)', color: 'var(--t-text-muted)', textAlign: 'left' }}>
                                <th style={{ padding: '8px 10px' }}>Worker</th>
                                <th style={{ padding: '8px 10px' }}>Phase / Task</th>
                                <th style={{ padding: '8px 10px' }}>Start</th>
                                <th style={{ padding: '8px 10px' }}>End</th>
                                <th style={{ padding: '8px 10px' }}>Est. Days</th>
                                <th style={{ padding: '8px 10px' }}>Actual Days</th>
                                <th style={{ padding: '8px 10px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(a => (
                                <tr key={a.id} style={{ borderBottom: '1px solid var(--t-border)' }}>
                                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{a.worker_name || a.worker}</td>
                                    <td style={{ padding: '8px 10px' }}>
                                        <div style={{ fontSize: 12, fontWeight: 700 }}>
                                            {a.phase ? (
                                                <Link to={`/dashboard/desktop/phases?phase=${a.phase}`} style={{ color: 'var(--t-primary)', textDecoration: 'none' }}>
                                                    {a.phase_name}
                                                </Link>
                                            ) : '—'}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--t-text-muted)' }}>
                                            {a.task ? (
                                                <Link to={`/dashboard/desktop/phases?task=${a.task}`} style={{ color: 'var(--t-text-muted)', textDecoration: 'none' }}>
                                                    {a.task_name}
                                                </Link>
                                            ) : '—'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '8px 10px', fontSize: 12 }}>{a.start_date}</td>
                                    <td style={{ padding: '8px 10px', fontSize: 12 }}>{a.end_date || '—'}</td>
                                    <td style={{ padding: '8px 10px' }}>{a.estimated_days ?? '—'}</td>
                                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{a.actual_days ?? '—'}</td>
                                    <td style={{ padding: '8px 10px' }}>
                                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: statusColors[a.status] || '#f3f4f6', color: '#374151' }}>
                                            {a.status?.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Nepali Guide Note */}
            <div style={{ marginTop: 32, padding: 20, background: 'rgba(59,130,246,0.05)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.1)' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: 'var(--t-primary)' }}>📌 काम बाँडफाँड (Assignments) मार्गनिर्देशन</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--t-text)', marginBottom: 4 }}>🤔 के हो? (What)</div>
                        <div style={{ fontSize: 12, color: 'var(--t-text-muted)', lineHeight: 1.5 }}>कामदारहरूलाई प्रोजेक्टको निश्चित चरण (Phase) वा काम (Task) मा तोक्ने प्रक्रिया हो।</div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--t-text)', marginBottom: 4 }}>💡 किन? (Why)</div>
                        <div style={{ fontSize: 12, color: 'var(--t-text-muted)', lineHeight: 1.5 }}>कुन फेजमा कति जनशक्ति खपत भयो र अनुमानित समयभित्र काम सकियो कि नाइँ भनेर हेर्न।</div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--t-text)', marginBottom: 4 }}>⏰ कहिले? (When)</div>
                        <div style={{ fontSize: 12, color: 'var(--t-text-muted)', lineHeight: 1.5 }}>नयाँ काम सुरु गर्दा वा कामदारलाई अर्को प्रोजेक्टमा पठाउँदा यो अपडेट गर्नुपर्छ।</div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--t-text)', marginBottom: 4 }}>👤 कसले? (Who)</div>
                        <div style={{ fontSize: 12, color: 'var(--t-text-muted)', lineHeight: 1.5 }}>सुपरभाइजर वा म्यानेजरले यहाँबाट कामदारको ड्युटी तोक्न सक्छन्।</div>
                    </div>
                </div>
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed var(--t-border)', fontSize: 12, color: 'var(--t-text-muted)' }}>
                    🛠️ **कसरी (How):** 'New Assignment' बटन थिच्नुहोस्, कामदार र फेज छान्नुहोस्, र सुरु हुने मिति तय गर्नुहोस्। कामदारले हाजिरी गर्दा यो स्वतः गणना हुनेछ।
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// TAB: EVALUATIONS
// ═══════════════════════════════════════════════════════════════════
function EvaluationsTab({ projectId }) {
    const [items, setItems]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = projectId ? { project: projectId } : {};
            const data = await workforceService.getEvaluations(params);
            setItems(Array.isArray(data) ? data : (data.results || []));
        } catch {
            setError('Failed to load evaluations.');
        } finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const recColors = {
        rehire:      { bg: '#d1fae5', color: '#065f46', label: 'Rehire' },
        conditional: { bg: '#fef3c7', color: '#92400e', label: 'Conditional' },
        do_not:      { bg: '#fee2e2', color: '#991b1b', label: 'Do Not Rehire' },
        promote:     { bg: '#ede9fe', color: '#5b21b6', label: 'Promote' },
    };

    const StarRow = ({ label, score }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 90, color: 'var(--t-text-muted)' }}>{label}</span>
            <span style={{ color: '#f59e0b' }}>{'★'.repeat(score || 0)}{'☆'.repeat(5 - (score || 0))}</span>
        </div>
    );

    return (
        <div>
            {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</div>}
            {loading ? <Spinner /> : items.length === 0 ? (
                <EmptyState icon="⭐" title="No evaluations yet" subtitle="Evaluations are created at the end of a project for each worker." />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {items.map(e => {
                        const rc = recColors[e.recommendation] || recColors.conditional;
                        return (
                            <div key={e.id} style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 12, padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{e.worker_name || e.worker}</div>
                                        <div style={{ fontSize: 11, color: 'var(--t-text-muted)' }}>{e.eval_date} · {e.project_name || ''}</div>
                                    </div>
                                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: rc.bg, color: rc.color }}>{rc.label}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                                    <StarRow label="Quality"     score={e.score_quality} />
                                    <StarRow label="Punctuality" score={e.score_punctuality} />
                                    <StarRow label="Safety"      score={e.score_safety} />
                                    <StarRow label="Teamwork"    score={e.score_teamwork} />
                                    <StarRow label="Skill"       score={e.score_skill} />
                                </div>
                                {e.comments && (
                                    <div style={{ fontSize: 12, color: 'var(--t-text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--t-border)', paddingTop: 8 }}>
                                        "{e.comments}"
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// TAB: SAFETY
// ═══════════════════════════════════════════════════════════════════
function SafetyTab({ projectId }) {
    const [items, setItems]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = projectId ? { project: projectId } : {};
            const data = await workforceService.getSafetyRecords(params);
            setItems(Array.isArray(data) ? data : (data.results || []));
        } catch {
            setError('Failed to load safety records.');
        } finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const sevColors = {
        low:      { bg: '#d1fae5', color: '#065f46' },
        medium:   { bg: '#fef3c7', color: '#92400e' },
        high:     { bg: '#fed7aa', color: '#9a3412' },
        critical: { bg: '#fee2e2', color: '#991b1b' },
    };

    return (
        <div>
            {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</div>}
            {loading ? <Spinner /> : items.length === 0 ? (
                <EmptyState icon="🦺" title="No safety incidents" subtitle="Safety incidents and violations are logged here." />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {items.map(s => {
                        const sc = sevColors[s.severity] || sevColors.medium;
                        return (
                            <div key={s.id} style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 10, padding: '12px 16px', borderLeft: `4px solid ${sc.color}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ fontWeight: 700 }}>{s.worker_name || s.worker}</div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{s.severity?.toUpperCase()}</span>
                                        <span style={{ fontSize: 11, color: 'var(--t-text-muted)' }}>{s.incident_date}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--t-text-muted)' }}>
                                    <strong>{s.incident_type?.replace('_', ' ')}</strong>
                                    {s.description && ` — ${s.description}`}
                                </div>
                                {s.project_name && (
                                    <div style={{ fontSize: 11, color: 'var(--t-text-muted)', marginTop: 4 }}>📍 {s.project_name}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HUB
// ═══════════════════════════════════════════════════════════════════
export default function WorkforceHub() {
    const { activeProjectId } = useConstruction();
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState('MEMBERS');

    const renderTab = () => {
        switch (activeTab) {
            case 'MEMBERS':     return <WorkforceMembersView projectId={activeProjectId} />;
            case 'PAYROLL':     return <PayrollTab     projectId={activeProjectId} />;
            case 'ASSIGNMENTS': return <AssignmentsTab projectId={activeProjectId} />;
            case 'EVALUATIONS': return <EvaluationsTab projectId={activeProjectId} />;
            case 'SAFETY':      return <SafetyTab      projectId={activeProjectId} />;
            default:            return null;
        }
    };

    // Desktop layout
    if (!isMobile) {
        return (
            <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ marginBottom: 20 }}>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Workforce Management</h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--t-text-muted)', fontSize: 13 }}>
                        Manage members, payroll, assignments, evaluations and safety records.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--t-border)', paddingBottom: 0 }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                            padding: '10px 18px', border: 'none', cursor: 'pointer',
                            background: 'transparent', fontSize: 13, fontWeight: 600,
                            color: activeTab === t.id ? 'var(--t-primary)' : 'var(--t-text-muted)',
                            borderBottom: activeTab === t.id ? '2px solid var(--t-primary)' : '2px solid transparent',
                            marginBottom: -2, transition: 'color 0.15s',
                        }}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 14, padding: 24 }}>
                    {renderTab()}
                </div>

                {/* ── Nepali Note Section (Workforce Hub - Desktop) ── */}
                <div style={{ marginTop: 40, padding: 30, background: '#f8fafc', borderRadius: 24, border: '1px solid var(--t-border)', display: 'flex', gap: 24, alignItems: 'center' }}>
                    <div style={{ fontSize: 48 }}>👷</div>
                    <div>
                        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: '#f97316' }}>कामदार व्यवस्थापन निर्देशिका (Workforce Management Guide)</h3>
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--t-text3)', lineHeight: 1.6, fontWeight: 600 }}>
                            यो 'Workforce Hub' बाट तपाइँले आफ्नो कम्पनीका सबै कामदारहरूको रेकर्ड, तलब, र कार्यसम्पादन एकै ठाउँबाट हेर्न सक्नुहुन्छ। 
                            नयाँ कामदार थप्न 'Members' ट्याबमा गएर 'Add Member' थिच्नुहोस्।
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Mobile layout
    return (
        <div style={{ paddingBottom: 70 }}>
            <div style={{ padding: '16px 16px 0', background: 'var(--t-bg)' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Workforce</h2>
            </div>

            <div style={{ padding: 16 }}>
                {renderTab()}
            </div>

            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
                background: 'var(--t-surface)',
                borderTop: '1px solid var(--t-border)',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.10)',
                display: 'flex', overflowX: 'auto',
            }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                        flex: '0 0 auto', minWidth: 64, padding: '10px 12px',
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        color: activeTab === t.id ? 'var(--t-primary)' : 'var(--t-text-muted)',
                        fontWeight: activeTab === t.id ? 800 : 500,
                        borderTop: activeTab === t.id ? '2px solid var(--t-primary)' : '2px solid transparent',
                        fontSize: 11,
                    }}>
                        <span style={{ fontSize: 18 }}>{t.icon}</span>
                        {t.short}
                    </button>
                ))}
            </div>

            {/* ── Nepali Note Section (Workforce Hub) ── */}
            <div style={{ margin: '30px 16px 100px', padding: 24, background: '#f8fafc', borderRadius: 20, border: '1px solid var(--t-border)' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 900, color: '#f97316' }}>👷 कामदार व्यवस्थापन निर्देशिका (Workforce Guide)</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text3)', lineHeight: 1.5, fontWeight: 600 }}>
                    यहाँबाट तपाइँले सम्पूर्ण परियोजनाका कामदारहरूलाई एकै ठाउँबाट व्यवस्थापन गर्न सक्नुहुन्छ:
                </p>
                <ul style={{ margin: '15px 0 0', paddingLeft: 20, fontSize: 11, color: 'var(--t-text3)', lineHeight: 1.8 }}>
                    <li><strong>नयाँ दर्ता:</strong> '+ Add Member' बटन थिचेर नयाँ कामदार थप्नुहोस्।</li>
                    <li><strong>हाजिरी:</strong> कामदारको प्रोफाइलमा गएर दैनिक हाजिरी र 'QR Code' हेर्न सकिन्छ।</li>
                    <li><strong>तलब विवरण:</strong> 'Payroll' सेक्सनमा गएर कामदारको मासिक वा दैनिक भुक्तानी हिसाब गर्नुहोस्।</li>
                    <li><strong>प्रमाणपत्र:</strong> कामदारको 'ID Card' र अन्य कागजातहरू यहाँबाट प्रिन्ट गर्न सकिन्छ।</li>
                </ul>
            </div>
        </div>
    );
}
