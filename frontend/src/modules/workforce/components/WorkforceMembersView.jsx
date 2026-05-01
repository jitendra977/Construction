import React, { useState, useEffect, useCallback } from 'react';
import { useConstruction } from '../../../context/ConstructionContext';
import workforceService from '../../../services/workforceService';
import IDCardModal from './IDCardModal';
import MemberDrawer, { StatusBadge, TypeBadge, Spinner } from './MemberDrawer';

// ── Constants ────────────────────────────────────────────────────────────────
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

const TODAY_COLORS = {
    PRESENT:    { bg: '#22c55e', label: 'Present' },
    HALF_DAY:   { bg: '#f59e0b', label: 'Half Day' },
    ABSENT:     { bg: '#ef4444', label: 'Absent' },
    LEAVE:      { bg: '#6366f1', label: 'Leave' },
    HOLIDAY:    { bg: '#06b6d4', label: 'Holiday' },
    NOT_MARKED: { bg: '#d1d5db', label: '—' },
};

// ── Helpers ──────────────────────────────────────────────────────────
function StatsBar({ stats }) {
    if (!stats) return null;
    const cards = [
        { label: 'Total',    value: stats.total,    color: 'var(--t-primary)' },
        { label: 'Active',   value: stats.active,   color: '#10b981' },
        { label: 'On Leave', value: stats.on_leave, color: '#f59e0b' },
        { label: 'Staff',    value: stats.staff,    color: '#6366f1' },
        { label: 'Labour',   value: stats.labour,   color: '#0ea5e9' },
        { label: 'Linked',   value: stats.linked,   color: '#14b8a6' },
    ];
    return (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            {cards.map(c => (
                <div key={c.label} style={{
                    flex: '1 1 80px',
                    background: 'var(--t-surface)',
                    border: '1px solid var(--t-border)',
                    borderRadius: 10, padding: '10px 14px',
                    minWidth: 80,
                }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value ?? '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--t-text-muted)', marginTop: 2 }}>{c.label}</div>
                </div>
            ))}
        </div>
    );
}

function EmptyState({ icon, title, subtitle }) {
    return (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--t-surface)', borderRadius: 16, border: '1px dashed var(--t-border)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
            <h3 style={{ margin: '0 0 4px', fontWeight: 900, fontSize: 16 }}>{title}</h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text-muted)' }}>{subtitle}</p>
        </div>
    );
}

const TodayDot = ({ status, checkIn, checkOut }) => {
    const s = TODAY_COLORS[status] || TODAY_COLORS.NOT_MARKED;
    const time = checkIn ? `${checkIn}${checkOut ? ' → ' + checkOut : ' (in)'}` : '';
    return (
        <span title={`${s.label}${time ? ' · ' + time : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.bg, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--t-text-muted)' }}>{time || s.label}</span>
        </span>
    );
};

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

// ── MAIN VIEW COMPONENT ───────────────────────────────────────────────────────
export default function WorkforceMembersView({ projectId, hideProjectFilter = false }) {
    const { projects } = useConstruction();
    const [selectedProject, setSelectedProject] = useState(projectId || '');
    const [members, setMembers]     = useState([]);
    const [stats, setStats]         = useState(null);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [statusFilter, setStatus] = useState('');
    const [typeFilter, setType]     = useState('');
    const [drawer, setDrawer]       = useState(null); // null | 'new' | <member obj>
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [error, setError]         = useState('');
    const [showIDCard, setShowIDCard]       = useState(false);
    const [idCardMemberId, setIdCardMemberId] = useState(null);
    const [portalTarget, setPortalTarget]   = useState(null);

    // Sync selectedProject when prop changes (e.g. navigation)
    useEffect(() => {
        if (projectId) setSelectedProject(projectId);
    }, [projectId]);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = { page_size: 1000 };
            const finalProjectId = hideProjectFilter ? projectId : selectedProject;
            
            if (finalProjectId) params.current_project = finalProjectId;
            if (statusFilter)    params.status          = statusFilter;
            if (typeFilter)      params.worker_type     = typeFilter;
            if (search)          params.search          = search;

            const [m, s] = await Promise.all([
                workforceService.getMembers(params),
                workforceService.getSummaryStats(finalProjectId),
            ]);
            setMembers(Array.isArray(m) ? m : (m.results || []));
            setStats(s);
        } catch {
            setError('Failed to load workforce members.');
        } finally { setLoading(false); }
    }, [projectId, selectedProject, statusFilter, typeFilter, search, hideProjectFilter]);

    useEffect(() => { load(); }, [load]);

    const handleImport = async (dryRun = false) => {
        setImporting(true); setError(''); setImportResult(null);
        try {
            const body = { dry_run: dryRun };
            const finalProjectId = hideProjectFilter ? projectId : selectedProject;
            if (finalProjectId) body.project = finalProjectId;
            const result = await workforceService.seedFromAttendance(body);
            setImportResult(result);
            if (!dryRun) load();
        } catch (e) {
            setError(e?.response?.data?.detail || 'Import failed.');
        } finally { setImporting(false); }
    };

    const handleQuickStatus = async (member, newStatus) => {
        try {
            await workforceService.updateMember(member.id, { status: newStatus });
            load();
        } catch { /* ignore */ }
    };

    return (
        <div>
            <StatsBar stats={stats} />

            {/* Import from Attendance banner */}
            {stats && stats.unlinked > 0 && !importResult && (
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <strong style={{ fontSize: 13 }}>👷 {stats.unlinked} attendance worker{stats.unlinked !== 1 ? 's' : ''} not yet in Workforce</strong>
                        <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>Import them to create full profiles with payroll, skills and documents.</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleImport(true)} disabled={importing} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #fcd34d', background: '#fff', color: '#92400e', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Preview</button>
                        <button onClick={() => handleImport(false)} disabled={importing} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{importing ? 'Importing…' : '⬆ Import All'}</button>
                    </div>
                </div>
            )}

            {/* Import result */}
            {importResult && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        {importResult.dry_run
                            ? <><strong>Preview:</strong> {importResult.would_create} workers would be created</>
                            : <><strong>✓ Done:</strong> {importResult.created} workers imported successfully</>
                        }
                        {importResult.errors?.length > 0 && (
                            <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                                {importResult.errors.length} error(s): {importResult.errors.map(e => e.worker).join(', ')}
                            </div>
                        )}
                    </div>
                    <button onClick={() => setImportResult(null)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #86efac', background: 'transparent', cursor: 'pointer', fontSize: 12 }}>Dismiss</button>
                </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / ID / phone…"
                    style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13 }} />
                
                {!hideProjectFilter && (
                    <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13 }}>
                        <option value="">All Projects</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                )}

                <select value={statusFilter} onChange={e => setStatus(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13 }}>
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="TERMINATED">Terminated</option>
                </select>
                <select value={typeFilter} onChange={e => setType(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13 }}>
                    <option value="">All Types</option>
                    <option value="LABOUR">Labour</option>
                    <option value="STAFF">Staff</option>
                    <option value="SUBCONTRACTOR">Subcontractor</option>
                    <option value="FREELANCE">Freelance</option>
                </select>
                <button onClick={() => setDrawer('new')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--t-primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                    + Add Member
                </button>
            </div>

            {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</div>}

            {loading ? <Spinner /> : members.length === 0 ? (
                <EmptyState icon="👷" title="No members found" subtitle="Add your first workforce member or import from attendance." />
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--t-border)', color: 'var(--t-text-muted)', textAlign: 'left', background: 'var(--t-surface)' }}>
                                <th style={{ padding: '9px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>ID</th>
                                <th style={{ padding: '9px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Name</th>
                                <th style={{ padding: '9px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Role / Trade</th>
                                <th style={{ padding: '9px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Type</th>
                                <th style={{ padding: '9px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '9px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Today</th>
                                <th style={{ padding: '9px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Rate/day</th>
                                <th style={{ padding: '9px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Contact</th>
                                <th style={{ padding: '9px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((m, i) => (
                                <tr key={m.id} style={{ borderBottom: '1px solid var(--t-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                                    <td style={{ padding: '9px 10px', fontFamily: 'monospace', fontSize: 11, color: 'var(--t-text-muted)', whiteSpace: 'nowrap' }}>{m.employee_id}</td>
                                    <td style={{ padding: '9px 10px' }}>
                                        <div style={{ fontWeight: 700 }}>{m.full_name || '—'}</div>
                                        {m.date_of_birth && <div style={{ fontSize: 11, color: 'var(--t-text-muted)' }}>DOB: {m.date_of_birth}</div>}
                                    </td>
                                    <td style={{ padding: '9px 10px', color: 'var(--t-text-muted)', fontSize: 12 }}>{m.role_name || '—'}</td>
                                    <td style={{ padding: '9px 10px' }}><TypeBadge type={m.worker_type} /></td>
                                    <td style={{ padding: '9px 10px' }}>
                                        {/* Inline quick-status dropdown */}
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <select
                                                value={m.status}
                                                onChange={e => handleQuickStatus(m, e.target.value)}
                                                title="Change status"
                                                style={{
                                                    appearance: 'none', WebkitAppearance: 'none',
                                                    padding: '2px 22px 2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                                                    border: 'none', cursor: 'pointer', outline: 'none',
                                                    background: ({ ACTIVE: '#d1fae5', ON_LEAVE: '#fef3c7', INACTIVE: '#f3f4f6', SUSPENDED: '#fee2e2', BLACKLISTED: '#1f2937', TERMINATED: '#fee2e2' })[m.status] || '#f3f4f6',
                                                    color: ({ ACTIVE: '#065f46', ON_LEAVE: '#92400e', INACTIVE: '#6b7280', SUSPENDED: '#991b1b', BLACKLISTED: '#f9fafb', TERMINATED: '#991b1b' })[m.status] || '#374151',
                                                }}>
                                                <option value="ACTIVE">Active</option>
                                                <option value="ON_LEAVE">On Leave</option>
                                                <option value="INACTIVE">Inactive</option>
                                                <option value="SUSPENDED">Suspended</option>
                                                <option value="BLACKLISTED">Blacklisted</option>
                                                <option value="TERMINATED">Terminated</option>
                                            </select>
                                            <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 8, pointerEvents: 'none' }}>▼</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '9px 10px' }}>
                                        <TodayDot status={m.today_status || 'NOT_MARKED'} checkIn={m.today_check_in} checkOut={m.today_check_out} />
                                    </td>
                                    <td style={{ padding: '9px 10px', fontSize: 12 }}>
                                        {m.daily_rate ? `NPR ${Number(m.daily_rate).toLocaleString()}` : <span style={{ color: '#d1d5db' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '9px 10px', fontSize: 12, color: 'var(--t-text-muted)' }}>
                                        {m.phone || '—'}
                                    </td>
                                    <td style={{ padding: '9px 10px' }}>
                                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                            <button onClick={() => setDrawer(m)}
                                                title="Edit member"
                                                style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--t-border)', background: 'transparent', color: 'var(--t-text)', cursor: 'pointer', fontSize: 12 }}>
                                                ✏️ Edit
                                            </button>
                                            <button onClick={() => { setIdCardMemberId(m.id); setShowIDCard(true); }}
                                                title="View Worker ID Card"
                                                style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #3b82f6', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                                🪪 ID
                                            </button>
                                            <button onClick={() => setPortalTarget(m)}
                                                title={m.account ? 'Portal account exists' : 'Create worker portal account'}
                                                style={{
                                                    padding: '4px 10px', borderRadius: 6,
                                                    border: `1px solid ${m.account ? '#86efac' : '#f97316'}`,
                                                    background: m.account ? '#f0fdf4' : '#fff7ed',
                                                    color: m.account ? '#065f46' : '#c2410c',
                                                    cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                                }}>
                                                {m.account ? '✅ Portal' : '📱 Portal'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Member Add/Edit Drawer */}
            {drawer !== null && (
                <MemberDrawer
                    member={drawer === 'new' ? null : drawer}
                    projectId={hideProjectFilter ? projectId : selectedProject}
                    onClose={() => setDrawer(null)}
                    onSaved={() => { setDrawer(null); load(); }}
                    onDeleted={() => { setDrawer(null); load(); }}
                />
            )}

            {showIDCard && idCardMemberId && (
                <IDCardModal badgeUrl={workforceService.getBadgeUrl(idCardMemberId)} onClose={() => setShowIDCard(false)} />
            )}

            {portalTarget && (
                <CreateAccountModal member={portalTarget} onClose={() => { setPortalTarget(null); load(); }} />
            )}
        </div>
    );
}
