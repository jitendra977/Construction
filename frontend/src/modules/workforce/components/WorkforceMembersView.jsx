import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConstruction } from '../../../context/ConstructionContext';
import workforceService from '../../../services/workforceService';
import { accountsService } from '../../../services/accountsService';
import { getMediaUrl } from '../../../services/api';
import IDCardModal from './IDCardModal';
import MemberDrawer, { StatusBadge, TypeBadge, Spinner } from './MemberDrawer';
import * as faceapi from '@vladmandic/face-api';
import api from '../../../services/client';
import { toast } from 'sonner';

// ── Tiny sound beeps via Web Audio ──────────────────────────────────────────
function beep(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        if (type === 'tick') {
            o.type = 'sine'; o.frequency.value = 880;
            g.gain.setValueAtTime(0.08, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
            o.start(); o.stop(ctx.currentTime + 0.1);
        } else if (type === 'success') {
            o.type = 'sine';
            o.frequency.setValueAtTime(523, ctx.currentTime);
            o.frequency.setValueAtTime(783, ctx.currentTime + 0.12);
            o.frequency.setValueAtTime(1046, ctx.currentTime + 0.24);
            g.gain.setValueAtTime(0.1, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            o.start(); o.stop(ctx.currentTime + 0.5);
        } else if (type === 'error') {
            o.type = 'sawtooth'; o.frequency.value = 120;
            g.gain.setValueAtTime(0.1, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
            o.start(); o.stop(ctx.currentTime + 0.3);
        }
    } catch (_) {}
}

const IconFaceID = ({ size = 13, color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
        style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }}>
        <path d="M3 7V5a2 2 0 0 1 2-2h2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" strokeWidth="3.5" />
        <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" strokeWidth="3.5" />
    </svg>
);

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

function useIsMobile() {
    const [mobile, setMobile] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return mobile;
}

// ── Helpers ──────────────────────────────────────────────────────────
function StatsBar({ stats, isMobile = false }) {
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
        <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, minmax(0, 1fr))' : 'repeat(6, minmax(0, 1fr))',
            gap: isMobile ? 8 : 10,
            marginBottom: 20,
        }}>
            {cards.map(c => (
                <div key={c.label} style={{
                    background: 'var(--t-surface)',
                    border: '1px solid var(--t-border)',
                    borderRadius: isMobile ? 8 : 10,
                    padding: isMobile ? '9px 10px' : '10px 14px',
                    minWidth: 0,
                }}>
                    <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: c.color, lineHeight: 1.1 }}>{c.value ?? '—'}</div>
                    <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--t-text-muted)', marginTop: 3, lineHeight: 1.2 }}>{c.label}</div>
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

function MobileMemberCard({
    member,
    onOpenDrawer,
}) {
    const initials = (member.full_name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const avatarColors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316'];
    const avatarBg = avatarColors[(member.id || 0) % avatarColors.length];
    const todayS = TODAY_COLORS[member.today_status || 'NOT_MARKED'] || TODAY_COLORS.NOT_MARKED;
    const timeStr = member.today_check_in ? `${member.today_check_in}${member.today_check_out ? ` → ${member.today_check_out}` : ''}` : '';
    const photoUrl = member.photo ? getMediaUrl(member.photo) : '';

    return (
        <button
            type="button"
            onClick={() => onOpenDrawer(member)}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textAlign: 'left',
                border: '1px solid var(--t-border)',
                background: 'var(--t-surface)',
                padding: '10px 12px',
                borderRadius: 12,
                cursor: 'pointer',
            }}
        >
            <div style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: `${avatarBg}22`, color: avatarBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900, letterSpacing: '0.03em',
                border: `1.5px solid ${avatarBg}44`,
                overflow: 'hidden',
            }}>
                {photoUrl ? (
                    <img
                        src={photoUrl}
                        alt={member.full_name || 'Member photo'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    initials
                )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                        {member.full_name || '—'}
                    </div>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: todayS.bg, display: 'inline-block', flexShrink: 0 }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--t-text-muted)', marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace' }}>{member.employee_id}</span>
                    {member.role_name && <span>{member.role_name}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t-text3)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>{member.phone || 'No phone'}</span>
                    <span>{member.current_project_name || 'No project'}</span>
                    {timeStr && <span>{timeStr}</span>}
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <TypeBadge type={member.worker_type} />
                {member.account && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#5b21b6' }}>Portal</span>
                )}
                <span style={{ fontSize: 16, color: 'var(--t-text-muted)', lineHeight: 1 }}>›</span>
            </div>
        </button>
    );
}

function CreateAccountModal({ member, projects = [], defaultProjectId = '', onClose }) {
    const isExistingAccount = Boolean(member.account);
    const memberEmail = member.email && !member.email.endsWith('@worker.local') ? member.email : '';
    const existingAdminEmail = member.account_email && !member.account_email.endsWith('@worker.local') ? member.account_email : '';
    const initialAdminAccess = Boolean(member.has_admin_access);

    const [pin, setPin]                   = useState('');
    const [result, setResult]             = useState(null);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');
    const [adminAccess, setAdminAccess]   = useState(initialAdminAccess);
    const [systemRoles, setSystemRoles]   = useState([]);
    const [roleId, setRoleId]             = useState(member.account_role_id ? String(member.account_role_id) : '');
    const [accountProjectId, setAccountProjectId] = useState(member.current_project || defaultProjectId || '');
    const [changePin, setChangePin]       = useState(!isExistingAccount);
    const [resetAdminPassword, setResetAdminPassword] = useState(!initialAdminAccess);
    const [adminLoginEmail, setAdminLoginEmail] = useState(existingAdminEmail || memberEmail || '');
    // Email send step
    const [emailDest, setEmailDest]       = useState(memberEmail ? 'member' : 'custom'); // 'member' | 'custom'
    const [customEmail, setCustomEmail]   = useState('');
    const [sending, setSending]           = useState(false);
    const [emailStatus, setEmailStatus]   = useState(null); // null | 'sent' | 'failed'
    const [emailError, setEmailError]     = useState('');

    const [sendEmail, setSendEmail]       = useState(false);

    useEffect(() => {
        setAccountProjectId(member.current_project || defaultProjectId || '');
    }, [member.current_project, defaultProjectId]);

    useEffect(() => {
        accountsService.getRoles()
            .then(res => {
                const data = res.data;
                const roles = Array.isArray(data) ? data : (data.results || []);
                setSystemRoles(roles);
                const currentRole = roles.find(r => String(r.id) === String(member.account_role_id || ''));
                const fallback = currentRole || roles.find(r => r.code === 'VIEWER') || roles[0];
                if (fallback) setRoleId(String(fallback.id));
            })
            .catch(() => setSystemRoles([]));
    }, [member.account_role_id]);

    useEffect(() => {
        if (!adminAccess) {
            setResetAdminPassword(false);
            return;
        }
        if (!initialAdminAccess) {
            setResetAdminPassword(true);
        }
    }, [adminAccess, initialAdminAccess]);

    const executeAction = async (actionFn, actionName) => {
        if (sendEmail) {
            const resolvedEmail = emailDest === 'member' ? memberEmail : customEmail.trim();
            if (!resolvedEmail) {
                setEmailError('Please enter a valid email address.');
                return;
            }
            if (isExistingAccount && !changePin) {
                setEmailError('Reset the worker PIN to send a full credentials email.');
                return;
            }
        }
        if (adminAccess && !roleId) {
            setError('Select a system role for admin panel access.');
            return;
        }
        if (adminAccess && !adminLoginEmail.trim()) {
            setError('Enter an admin login email for admin panel access.');
            return;
        }
        
        setLoading(true); setError(''); setEmailError('');
        try {
            const payload = {};
            if (isExistingAccount) {
                payload.admin_access = adminAccess;
                payload.reset_pin = changePin;
                payload.project_id = accountProjectId || '';
                if (changePin && pin) payload.pin = pin;
                if (adminAccess) {
                    payload.role_id = roleId;
                    payload.email = adminLoginEmail.trim();
                    if (!initialAdminAccess || resetAdminPassword) {
                        payload.reset_admin_password = true;
                    }
                }
            } else {
                if (pin) payload.pin = pin;
                payload.admin_access = adminAccess;
                if (accountProjectId) payload.project_id = accountProjectId;
                if (adminAccess) {
                    payload.role_id = roleId;
                    payload.email = adminLoginEmail.trim() || memberEmail || customEmail.trim() || undefined;
                }
            }
            const data = await actionFn(member.id, payload);
            setResult(data);
            
            if (sendEmail) {
                const resolvedEmail = emailDest === 'member' ? (memberEmail || data.email) : customEmail.trim();
                setSending(true);
                try {
                    await workforceService.sendPortalCredentials(member.id, {
                        recipient_email: resolvedEmail,
                        pin:             data.pin,
                        password:        data.password || '',
                        portal_url:      `${window.location.origin}/worker`,
                        admin_url:       `${window.location.origin}/dashboard/desktop`,
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
    const handleUpdate = () => executeAction(workforceService.updateAccount, 'update account');

    const fieldStyle = {
        width: '100%', padding: '9px 12px', borderRadius: 10,
        border: '1px solid var(--t-border)', background: 'var(--t-surface)',
        color: 'var(--t-text)', fontSize: 13, boxSizing: 'border-box',
    };

    const renderEmailConfig = () => (
        <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={e => {
                        setSendEmail(e.target.checked);
                        if (e.target.checked && !memberEmail) setEmailDest('custom');
                    }}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
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

    const renderAdminAccessConfig = () => (
        <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                <input type="checkbox" checked={adminAccess} onChange={e => setAdminAccess(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                Allow admin panel access
            </label>
            {adminAccess && (
                <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t-text-muted)', marginBottom: 6 }}>
                        Admin login email
                    </label>
                    <input
                        type="email"
                        value={adminLoginEmail}
                        onChange={e => setAdminLoginEmail(e.target.value)}
                        placeholder="name@example.com"
                        style={{ ...fieldStyle, marginBottom: 12 }}
                    />
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t-text-muted)', marginBottom: 6 }}>
                        System role
                    </label>
                    <select value={roleId} onChange={e => setRoleId(e.target.value)} style={{ ...fieldStyle, marginBottom: 10 }}>
                        {systemRoles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>
                    {isExistingAccount && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--t-text)', marginBottom: 8 }}>
                            <input
                                type="checkbox"
                                checked={resetAdminPassword}
                                onChange={e => setResetAdminPassword(e.target.checked)}
                                style={{ width: 16, height: 16, cursor: 'pointer' }}
                            />
                            Generate a new admin password
                        </label>
                    )}
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--t-text-muted)' }}>
                        {isExistingAccount
                            ? 'Update dashboard access, role, and optional admin password for this worker.'
                            : 'A random dashboard password will be generated. Sidebar and routes use this role permissions.'}
                    </p>
                </div>
            )}
        </div>
    );

    const renderProjectConfig = () => (
        <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t-text-muted)', marginBottom: 6 }}>
                Assign project
            </label>
            <select value={accountProjectId} onChange={e => setAccountProjectId(e.target.value)} style={fieldStyle}>
                <option value="">No Project</option>
                {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                ))}
            </select>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--t-text-muted)' }}>
                Defaults to this member's project, otherwise the active project.
            </p>
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
                                <div style={{ fontSize: 12, color: '#065f46', opacity: 0.8, marginTop: 4 }}>
                                    Admin access: <strong>{adminAccess ? 'Enabled' : 'Disabled'}</strong>{adminAccess && member.account_role_name ? ` · ${member.account_role_name}` : ''}
                                </div>
                            </div>
                            {renderProjectConfig()}
                            {renderAdminAccessConfig()}
                            <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, marginBottom: changePin ? 12 : 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={changePin}
                                        onChange={e => setChangePin(e.target.checked)}
                                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                                    />
                                    Reset worker PIN
                                </label>
                                {changePin && (
                                    <>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--t-text-muted)', marginBottom: 6 }}>
                                            New PIN (4-6 digits)
                                        </label>
                                        <input
                                            type="text" inputMode="numeric" maxLength={6}
                                            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Leave blank to auto-generate"
                                            style={{ ...fieldStyle, fontSize: 16, letterSpacing: '0.25em' }}
                                        />
                                        <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--t-text-muted)' }}>
                                            Leave blank to auto-generate a new worker portal PIN.
                                        </p>
                                    </>
                                )}
                            </div>
                            {renderEmailConfig()}
                            {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{error}</div>}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={handleUpdate} disabled={loading || sending} style={{
                                    flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                                    background: (loading || sending) ? '#9ca3af' : '#2563eb', color: '#fff', fontWeight: 800, cursor: (loading || sending) ? 'not-allowed' : 'pointer',
                                }}>{(loading || sending) ? 'Processing…' : 'Save Account Settings'}</button>
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
                            {renderProjectConfig()}
                            {renderEmailConfig()}
                            {renderAdminAccessConfig()}
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
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46', marginBottom: 12 }}>
                                ✅ {isExistingAccount ? 'Account updated successfully!' : 'Account created!'}
                            </div>
                            {[
                                { label: 'Employee ID',      value: result.employee_id },
                                { label: 'Username (phone)', value: result.username },
                                ...(result.pin ? [{ label: 'PIN', value: result.pin, mono: true, highlight: true }] : []),
                                ...(result.admin_access ? [
                                    { label: 'Admin email', value: result.admin_username || result.email },
                                    ...(result.password ? [{ label: 'Admin password', value: result.password, mono: true }] : []),
                                    { label: 'Role', value: result.role || '—' },
                                ] : []),
                            ].filter(f => f.value !== undefined && f.value !== null && f.value !== '').map(f => (
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

function BiometricTrainingModal({ member, onClose }) {
    const [modelReady, setModelReady] = useState(false);
    const [modelLoading, setModelLoading] = useState(false);
    const [camError, setCamError]     = useState(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const [regCountdown, setRegCountdown] = useState(null); // null | 3 | 2 | 1 | 0
    const [regStatus, setRegStatus]       = useState('idle'); // idle | detecting | countdown | saving | done | error

    const videoRef    = useRef(null);
    const canvasRef   = useRef(null);
    const streamRef   = useRef(null);
    const loopRef     = useRef(null);
    const busyRef     = useRef(false);
    const stableCount = useRef(0);
    const countdownTimer = useRef(null);
    const capturedDescRef = useRef(null);

    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

    useEffect(() => {
        const load = async () => {
            setModelLoading(true);
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
                setModelReady(true);
            } catch (e) {
                toast.error('AI models failed to load — check internet connection.');
            } finally {
                setModelLoading(false);
            }
        };
        load();
        return () => stopEverything();
    }, []);

    useEffect(() => {
        if (modelReady) startCamera();
        return () => stopEverything();
    }, [modelReady]);

    const startCamera = async () => {
        setCamError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                loopRef.current = requestAnimationFrame(frameLoop);
            }
        } catch (e) {
            setCamError('Camera permission denied. Please allow camera access.');
        }
    };

    const stopCamera = () => {
        if (loopRef.current) { cancelAnimationFrame(loopRef.current); loopRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };

    const stopEverything = () => {
        stopCamera();
        if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
    };

    const resetState = () => {
        busyRef.current = false;
        stableCount.current = 0;
        capturedDescRef.current = null;
        setFaceDetected(false);
        setRegCountdown(null);
        setRegStatus('idle');
        if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
    };

    const frameLoop = useCallback(async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || video.paused || video.ended || !canvas) {
            loopRef.current = requestAnimationFrame(frameLoop);
            return;
        }

        try {
            const det = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (det) {
                    setFaceDetected(true);
                    stableCount.current += 1;

                    const dims = faceapi.matchDimensions(canvas, video, true);
                    const resized = faceapi.resizeResults(det, dims);
                    ctx.fillStyle = 'rgba(16,185,129,0.7)';
                    resized.landmarks.positions.forEach(p => {
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    });

                    capturedDescRef.current = det.descriptor;
                    handleRegisterFrame();
                } else {
                    setFaceDetected(false);
                    stableCount.current = 0;
                    capturedDescRef.current = null;
                    if (countdownTimer.current) {
                        clearInterval(countdownTimer.current); countdownTimer.current = null;
                        setRegCountdown(null);
                        setRegStatus('detecting');
                    }
                }
            }
        } catch (_) {}

        loopRef.current = requestAnimationFrame(frameLoop);
    }, []);

    const handleRegisterFrame = () => {
        if (busyRef.current) return;

        if (stableCount.current === 10 && !countdownTimer.current) {
            setRegStatus('countdown');
            setRegCountdown(3);
            beep('tick');

            let count = 3;
            countdownTimer.current = setInterval(() => {
                count -= 1;
                if (count > 0) {
                    setRegCountdown(count);
                    beep('tick');
                } else {
                    clearInterval(countdownTimer.current);
                    countdownTimer.current = null;
                    setRegCountdown(0);
                    if (capturedDescRef.current) {
                        submitRegistration(Array.from(capturedDescRef.current));
                    }
                }
            }, 1000);
        }

        if (stableCount.current < 10) {
            setRegStatus('detecting');
        }
    };

    const submitRegistration = async (encoding) => {
        busyRef.current = true;
        setRegStatus('saving');
        stopCamera();
        try {
            await api.post('/biometrics/train/', {
                encoding,
                user_id: member.account
            });
            beep('success');
            setRegStatus('done');
            toast.success('Face ID biometrics successfully trained for ' + member.full_name + '!');
        } catch (e) {
            beep('error');
            setRegStatus('error');
            toast.error(e.response?.data?.error || 'Failed to save biometric signature.');
            busyRef.current = false;
        }
    };

    const retry = () => {
        resetState();
        stopEverything();
        setTimeout(() => startCamera(), 300);
    };

    // Derived SVG metrics
    const CIRC = 2 * Math.PI * 78;
    let ringProgress = 0;
    if (regStatus === 'detecting') ringProgress = Math.min((stableCount.current / 10) * 30, 30);
    else if (regStatus === 'countdown' && regCountdown !== null) ringProgress = 30 + ((3 - regCountdown) / 3) * 60;
    else if (regStatus === 'saving') ringProgress = 90;
    else if (regStatus === 'done') ringProgress = 100;
    const ringDash = CIRC - (CIRC * ringProgress) / 100;

    let statusMsg = '';
    let statusSub = '';
    if (camError) {
        statusMsg = 'Camera Error';
        statusSub = camError;
    } else if (modelLoading) {
        statusMsg = 'Loading AI Models…';
        statusSub = 'Preparing face detection networks';
    } else if (!modelReady) {
        statusMsg = 'Initialising…';
    } else {
        if (regStatus === 'idle' || regStatus === 'detecting') {
            if (!faceDetected) { statusMsg = 'Position worker\'s face in circle'; statusSub = 'Ensure face is well-lit and centered'; }
            else { statusMsg = 'Hold still…'; statusSub = 'Capturing stable frames'; }
        } else if (regStatus === 'countdown') {
            statusMsg = regCountdown > 0 ? `Capturing in ${regCountdown}…` : 'Capturing…';
            statusSub = 'Keep still';
        } else if (regStatus === 'saving') {
            statusMsg = 'Saving Face ID…';
            statusSub = 'Linking biometric signature to user';
        } else if (regStatus === 'done') {
            statusMsg = 'Face ID Registered! ✓';
            statusSub = 'Biometric signature successfully linked';
        } else if (regStatus === 'error') {
            statusMsg = 'Registration failed';
            statusSub = 'Ensure worker is centered and try again';
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 450, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#121212', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#10b981' }}>
                            <IconFaceID size={18} color="#10b981" />
                            Train Face ID Biometrics
                        </h3>
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9ca3af' }}>
                            {member.full_name} · {member.employee_id}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 18, cursor: 'pointer', outline: 'none' }}>×</button>
                </div>

                {/* Webcam + Ring Tracers */}
                <div style={{ position: 'relative', width: 180, height: 180 }}>
                    <svg width="180" height="180" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', zIndex: 10, pointerEvents: 'none' }}>
                        <circle cx="90" cy="90" r="78" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                        <circle
                            cx="90" cy="90" r="78" fill="none"
                            stroke={regStatus === 'done' ? '#10b981' : regStatus === 'error' ? '#ef4444' : '#10b981'}
                            strokeWidth="4"
                            strokeDasharray={`${CIRC}`}
                            strokeDashoffset={ringDash}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                        />
                    </svg>

                    <div style={{
                        position: 'absolute', inset: 8,
                        borderRadius: '50%', overflow: 'hidden',
                        background: '#0a0a0a',
                        boxShadow: faceDetected
                            ? `0 0 0 2px ${regStatus === 'done' ? '#10b981' : '#10b981'}44`
                            : 'none',
                        transition: 'box-shadow 0.3s',
                    }}>
                        <video ref={videoRef} autoPlay muted playsInline width="640" height="480"
                            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) scaleX(-1)', height: '100%', width: 'auto', objectFit: 'cover' }}
                        />
                        <canvas ref={canvasRef} width="164" height="164"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none', transform: 'scaleX(-1)' }}
                        />

                        {/* Scan line */}
                        {regStatus !== 'done' && regStatus !== 'error' && faceDetected && (
                            <div style={{
                                position: 'absolute', left: 0, right: 0, height: 2,
                                background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
                                boxShadow: '0 0 8px #10b981',
                                animation: 'sweep 2.5s ease-in-out infinite',
                                zIndex: 5,
                            }} />
                        )}

                        {/* Success overlay */}
                        {regStatus === 'done' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.15)', zIndex: 8 }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" style={{ width: 42, height: 42 }}>
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Countdown */}
                    {regStatus === 'countdown' && regCountdown !== null && regCountdown > 0 && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff', boxShadow: '0 0 15px rgba(16,185,129,0.5)' }}>
                                {regCountdown}
                            </div>
                        </div>
                    )}
                </div>

                {/* Status text */}
                <div style={{ textAlign: 'center', width: '100%' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: regStatus === 'done' ? '#10b981' : regStatus === 'error' ? '#ef4444' : '#fff' }}>
                        {statusMsg}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>
                        {statusSub}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 6 }}>
                    {(regStatus === 'done' || regStatus === 'error' || camError) ? (
                        <button onClick={retry} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 12 }}>
                            Scan Again
                        </button>
                    ) : (
                        <p style={{ width: '100%', margin: 0, fontSize: 10, color: '#6b7280', textAlign: 'center', lineHeight: 1.3 }}>
                            Please have the worker hold still centered inside the frame. Camera captures automatically.
                        </p>
                    )}
                    <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #374151', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 12 }}>
                        Close
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes sweep {
                    0%   { top: 5%; }
                    50%  { top: 90%; }
                    100% { top: 5%; }
                }
            `}</style>
        </div>
    );
}

// ── MAIN VIEW COMPONENT ───────────────────────────────────────────────────────
export default function WorkforceMembersView({ projectId, hideProjectFilter = false }) {
    const { projects, activeProjectId } = useConstruction();
    const isMobile = useIsMobile();
    const [searchParams, setSearchParams] = useSearchParams();
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
    const [importPreview, setImportPreview] = useState(null);
    const [syncAllResult, setSyncAllResult] = useState(null);
    const [syncingAllAttendance, setSyncingAllAttendance] = useState(false);
    const [error, setError]         = useState('');
    const [showIDCard, setShowIDCard]       = useState(false);
    const [idCardMemberId, setIdCardMemberId] = useState(null);
    const [portalTarget, setPortalTarget]   = useState(null);
    const [biometricTarget, setBiometricTarget] = useState(null);
    // Assign-to-project state (used in Workforce Hub where hideProjectFilter=false)
    const [assigningProject, setAssigningProject] = useState({}); // { [memberId]: bool }
    // Per-member attendance sync state
    const [syncingAttendance, setSyncingAttendance] = useState({}); // { [memberId]: bool }
    const openedFromQueryRef = useRef(false);

    // Sync selectedProject when prop changes (e.g. navigation)
    useEffect(() => {
        if (projectId) setSelectedProject(projectId);
    }, [projectId]);

    const effectiveProjectId = hideProjectFilter
        ? projectId
        : (selectedProject || projectId || activeProjectId || '');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = { page_size: 1000 };
            const finalProjectId = effectiveProjectId;
            
            if (finalProjectId) params.current_project = finalProjectId;
            if (statusFilter)    params.status          = statusFilter;
            if (typeFilter)      params.worker_type     = typeFilter;
            if (search)          params.search          = search;

            const importBody = { dry_run: true };
            if (finalProjectId) importBody.project = finalProjectId;

            const [m, s, preview] = await Promise.all([
                workforceService.getMembers(params),
                workforceService.getSummaryStats(finalProjectId),
                workforceService.seedFromAttendance(importBody).catch(() => null),
            ]);
            setMembers(Array.isArray(m) ? m : (m.results || []));
            setStats(s);
            setImportPreview(preview);
        } catch {
            setError('Failed to load workforce members.');
        } finally { setLoading(false); }
    }, [effectiveProjectId, statusFilter, typeFilter, search]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const requestedMemberId = searchParams.get('member');
        if (!requestedMemberId || openedFromQueryRef.current || members.length === 0) return;
        const match = members.find((member) => String(member.id) === String(requestedMemberId));
        if (!match) return;
        setDrawer(match);
        openedFromQueryRef.current = true;
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('member');
        setSearchParams(nextParams, { replace: true });
    }, [members, searchParams, setSearchParams]);

    const handleImport = async (dryRun = false) => {
        setImporting(true); setError(''); setImportResult(null);
        try {
            const body = { dry_run: dryRun };
            const finalProjectId = effectiveProjectId;
            if (finalProjectId) body.project = finalProjectId;
            const result = await workforceService.seedFromAttendance(body);
            setImportResult(result);
            if (!dryRun) load();
        } catch (e) {
            setError(e?.response?.data?.detail || 'Import failed.');
        } finally { setImporting(false); }
    };

    const pendingAttendanceImports =
        importPreview?.would_create ??
        importPreview?.total_eligible ??
        stats?.unlinked ??
        0;

    const unlinkedWorkforceCount = members.filter(m => !m.has_attendance_link && !m.attendance_worker_id).length;

    const handleQuickStatus = async (member, newStatus) => {
        try {
            await workforceService.updateMember(member.id, { status: newStatus });
            load();
        } catch { /* ignore */ }
    };

    const handleSyncAttendance = async (member) => {
        setSyncingAttendance(p => ({ ...p, [member.id]: true }));
        try {
            await workforceService.syncAttendance(member.id);
            load();
        } catch { /* ignore */ }
        finally {
            setSyncingAttendance(p => { const n = { ...p }; delete n[member.id]; return n; });
        }
    };

    const handleSyncAllAttendance = async () => {
        if (!effectiveProjectId) {
            setError('Select a project before bulk linking attendance.');
            return;
        }
        setSyncingAllAttendance(true);
        setError('');
        setSyncAllResult(null);
        try {
            const result = await workforceService.syncAllAttendance({ project: effectiveProjectId });
            setSyncAllResult(result);
            await load();
        } catch (e) {
            setError(e?.response?.data?.error || 'Bulk attendance link failed.');
        } finally {
            setSyncingAllAttendance(false);
        }
    };

    // Assign/remove worker from project — the unified link that makes the worker
    // appear in task dropdowns, phase workforce tab, and project team workers tab.
    const handleAssignProject = async (member, targetProjectId) => {
        setAssigningProject(p => ({ ...p, [member.id]: true }));
        try {
            if (targetProjectId) {
                await workforceService.assignToProject(member.id, targetProjectId);
            } else {
                await workforceService.removeFromProject(member.id);
            }
            load();
        } catch { alert('Failed to update project assignment.'); }
        finally { setAssigningProject(p => ({ ...p, [member.id]: false })); }
    };

    return (
        <div>
            <StatsBar stats={stats} isMobile={isMobile} />

            {/* Import from Attendance banner */}
            {pendingAttendanceImports > 0 && !(importResult && !importResult.dry_run) && (
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <strong style={{ fontSize: 13 }}>👷 {pendingAttendanceImports} attendance worker{pendingAttendanceImports !== 1 ? 's' : ''} not yet in Workforce</strong>
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

            {syncAllResult && (
                <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: '#1e40af' }}>
                        <strong>Attendance linked:</strong> {syncAllResult.total_synced} member{syncAllResult.total_synced !== 1 ? 's' : ''} synced
                        <span style={{ marginLeft: 6, color: '#64748b' }}>({syncAllResult.created} created, {syncAllResult.linked} linked)</span>
                    </div>
                    <button onClick={() => setSyncAllResult(null)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #93c5fd', background: 'transparent', cursor: 'pointer', fontSize: 12 }}>Dismiss</button>
                </div>
            )}

            {unlinkedWorkforceCount > 0 && (
                <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <strong style={{ fontSize: 13 }}>⚡ {unlinkedWorkforceCount} workforce member{unlinkedWorkforceCount !== 1 ? 's' : ''} not linked to attendance</strong>
                        <div style={{ fontSize: 12, color: '#3730a3', marginTop: 2 }}>
                            Bulk link them to the active project so attendance, payroll and QR records work.
                        </div>
                    </div>
                    <button
                        onClick={handleSyncAllAttendance}
                        disabled={syncingAllAttendance || !effectiveProjectId}
                        style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 800, cursor: syncingAllAttendance || !effectiveProjectId ? 'not-allowed' : 'pointer', opacity: syncingAllAttendance || !effectiveProjectId ? 0.65 : 1 }}
                    >
                        {syncingAllAttendance ? 'Linking…' : `Bulk Link Attendance (${unlinkedWorkforceCount})`}
                    </button>
                </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / ID / phone…"
                    style={{ flex: 1, width: isMobile ? '100%' : undefined, minWidth: isMobile ? 0 : 200, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13 }} />
                
                {!hideProjectFilter && (
                    <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
                        style={{ width: isMobile ? '100%' : undefined, padding: '10px 10px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13 }}>
                        <option value="">All Projects</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                )}

                <select value={statusFilter} onChange={e => setStatus(e.target.value)}
                    style={{ width: isMobile ? '100%' : undefined, padding: '10px 10px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13 }}>
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="TERMINATED">Terminated</option>
                </select>
                <select value={typeFilter} onChange={e => setType(e.target.value)}
                    style={{ width: isMobile ? '100%' : undefined, padding: '10px 10px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13 }}>
                    <option value="">All Types</option>
                    <option value="LABOUR">Labour</option>
                    <option value="STAFF">Staff</option>
                    <option value="SUBCONTRACTOR">Subcontractor</option>
                    <option value="FREELANCE">Freelance</option>
                </select>
                <button onClick={() => setDrawer('new')} style={{ width: isMobile ? '100%' : undefined, padding: '10px 16px', borderRadius: 10, border: 'none', background: 'var(--t-primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                    + Add Member
                </button>
            </div>

            {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</div>}

            {loading ? <Spinner /> : members.length === 0 ? (
                <EmptyState icon="👷" title="No members found" subtitle="Add your first workforce member or import from attendance." />
            ) : isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {members.map(member => (
                        <MobileMemberCard
                            key={member.id}
                            member={member}
                            onOpenDrawer={setDrawer}
                        />
                    ))}
                </div>
            ) : (
                <div style={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 280px)',
                    border: '1px solid var(--t-border)',
                    borderRadius: 12,
                }}>
                    <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', fontSize: 13 }}>
                        {/* ── Sticky header ───────────────────────────────────── */}
                        <thead>
                            <tr style={{
                                background: 'var(--t-surface)',
                                borderBottom: '2px solid var(--t-border)',
                                position: 'sticky', top: 0, zIndex: 2,
                            }}>
                                {[
                                    { label: 'Member',  w: '28%' },
                                    { label: 'Type & Status', w: '18%' },
                                    { label: 'Project', w: '16%' },
                                    { label: 'Today',   w: '14%' },
                                    { label: 'Rate / Phone', w: '13%' },
                                    { label: 'Actions', w: '11%' },
                                ].map(h => (
                                    <th key={h.label} style={{
                                        padding: '10px 12px', width: h.w,
                                        fontWeight: 700, fontSize: 10, textTransform: 'uppercase',
                                        letterSpacing: '0.06em', color: 'var(--t-text-muted)',
                                        textAlign: 'left', whiteSpace: 'nowrap',
                                    }}>{h.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((m, i) => {
                                const initials = (m.full_name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
                                const avatarColors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316'];
                                const avatarBg = avatarColors[(m.id || 0) % avatarColors.length];
                                const photoUrl = m.photo ? getMediaUrl(m.photo) : '';
                                const statusBg    = { ACTIVE:'#d1fae5', ON_LEAVE:'#fef3c7', INACTIVE:'#f3f4f6', SUSPENDED:'#fee2e2', BLACKLISTED:'#1f2937', TERMINATED:'#fee2e2' }[m.status] || '#f3f4f6';
                                const statusColor = { ACTIVE:'#065f46', ON_LEAVE:'#92400e', INACTIVE:'#6b7280', SUSPENDED:'#991b1b', BLACKLISTED:'#f9fafb', TERMINATED:'#991b1b' }[m.status] || '#374151';
                                const todayS = TODAY_COLORS[m.today_status || 'NOT_MARKED'] || TODAY_COLORS.NOT_MARKED;
                                const timeStr = m.today_check_in ? `${m.today_check_in}${m.today_check_out ? '→'+m.today_check_out : ''}` : '';

                                return (
                                    <tr key={m.id} style={{
                                        borderBottom: '1px solid var(--t-border)',
                                        background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.013)',
                                    }}>
                                        {/* ── Member: avatar + name + role + ID ── */}
                                        <td style={{ padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                {/* Avatar */}
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                                    background: `${avatarBg}22`, color: avatarBg,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 12, fontWeight: 900, letterSpacing: '0.03em',
                                                    border: `1.5px solid ${avatarBg}44`,
                                                    overflow: 'hidden',
                                                }}>
                                                    {photoUrl ? (
                                                        <img
                                                            src={photoUrl}
                                                            alt={m.full_name || 'Member photo'}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        initials
                                                    )}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {m.full_name || '—'}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                                                        <span style={{ fontSize: 10, color: 'var(--t-text-muted)', fontFamily: 'monospace' }}>{m.employee_id}</span>
                                                        {m.role_name && <span style={{ fontSize: 10, color: 'var(--t-text-muted)' }}>· {m.role_name}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* ── Type + Status (stacked) ── */}
                                        <td style={{ padding: '10px 12px' }}>
                                            <TypeBadge type={m.worker_type} />
                                            <div style={{ marginTop: 5, position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                                <select
                                                    value={m.status}
                                                    onChange={e => handleQuickStatus(m, e.target.value)}
                                                    title="Change status"
                                                    style={{
                                                        appearance: 'none', WebkitAppearance: 'none',
                                                        padding: '3px 20px 3px 8px', borderRadius: 99,
                                                        fontSize: 10, fontWeight: 700, border: 'none',
                                                        cursor: 'pointer', outline: 'none',
                                                        background: statusBg, color: statusColor,
                                                    }}>
                                                    <option value="ACTIVE">Active</option>
                                                    <option value="ON_LEAVE">On Leave</option>
                                                    <option value="INACTIVE">Inactive</option>
                                                    <option value="SUSPENDED">Suspended</option>
                                                    <option value="BLACKLISTED">Blacklisted</option>
                                                    <option value="TERMINATED">Terminated</option>
                                                </select>
                                                <span style={{ position: 'absolute', right: 6, top: '52%', transform: 'translateY(-50%)', fontSize: 7, pointerEvents: 'none', color: statusColor }}>▼</span>
                                            </div>
                                        </td>

                                        {/* ── Project assignment ── */}
                                        <td style={{ padding: '10px 12px' }}>
                                            {assigningProject[m.id] ? (
                                                <span style={{ fontSize: 11, color: 'var(--t-text-muted)' }}>Saving…</span>
                                            ) : (
                                                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%', maxWidth: 140 }}>
                                                    <select
                                                        value={m.current_project || ''}
                                                        onChange={e => handleAssignProject(m, e.target.value || null)}
                                                        title="Assign to project"
                                                        style={{
                                                            appearance: 'none', WebkitAppearance: 'none',
                                                            width: '100%', padding: '4px 22px 4px 8px',
                                                            borderRadius: 7, fontSize: 11, fontWeight: 600,
                                                            border: `1px solid ${m.current_project ? '#86efac' : '#fcd34d'}`,
                                                            background: m.current_project ? '#f0fdf4' : '#fffbeb',
                                                            color: m.current_project ? '#065f46' : '#92400e',
                                                            cursor: 'pointer', outline: 'none',
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        }}>
                                                        <option value="">No Project</option>
                                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                    <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 7, pointerEvents: 'none' }}>▼</span>
                                                </div>
                                            )}
                                        </td>

                                        {/* ── Today attendance ── */}
                                        <td style={{ padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <span style={{ width: 9, height: 9, borderRadius: '50%', background: todayS.bg, display: 'inline-block', flexShrink: 0 }} />
                                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-text)' }}>{todayS.label}</span>
                                            </div>
                                            {timeStr && <div style={{ fontSize: 10, color: 'var(--t-text-muted)', marginTop: 2, fontFamily: 'monospace' }}>{timeStr}</div>}
                                            <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                                                {(m.has_attendance_link || m.attendance_worker_id) ? (
                                                    <span title="Linked to attendance" style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: '#d1fae5', color: '#065f46' }}>⏱ linked</span>
                                                ) : (
                                                    <button onClick={() => handleSyncAttendance(m)} disabled={syncingAttendance[m.id]}
                                                        title="Create attendance link"
                                                        style={{ fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 4, border: 'none', cursor: syncingAttendance[m.id] ? 'wait' : 'pointer', background: '#fef3c7', color: '#92400e' }}>
                                                        {syncingAttendance[m.id] ? '⏳' : '⚡ link'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>

                                        {/* ── Rate + Phone ── */}
                                        <td style={{ padding: '10px 12px' }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)' }}>
                                                {m.daily_rate ? `NPR ${Number(m.daily_rate).toLocaleString()}` : <span style={{ color: '#d1d5db', fontWeight: 400 }}>—</span>}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--t-text-muted)', marginTop: 2 }}>
                                                {m.phone || <span style={{ color: '#d1d5db' }}>no phone</span>}
                                            </div>
                                            {m.account && (
                                                <span style={{ display: 'inline-block', marginTop: 3, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: '#ede9fe', color: '#5b21b6' }}>👤 portal</span>
                                            )}
                                        </td>

                                        {/* ── Actions ── */}
                                        <td style={{ padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <button onClick={() => setDrawer(m)} title="Edit member"
                                                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--t-border)', background: 'transparent', color: 'var(--t-text)', cursor: 'pointer', fontSize: 11, fontWeight: 600, textAlign: 'left' }}>
                                                    ✏️ Edit
                                                </button>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button onClick={() => { setIdCardMemberId(m.id); setShowIDCard(true); }} title="ID Card"
                                                        style={{ flex: 1, padding: '4px 6px', borderRadius: 6, border: '1px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
                                                        🪪
                                                    </button>
                                                    <button onClick={() => setPortalTarget(m)} title={m.account ? 'Manage portal' : 'Create portal account'}
                                                        style={{
                                                            flex: 1, padding: '4px 6px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                                            border: `1px solid ${m.account ? '#86efac' : '#fdba74'}`,
                                                            background: m.account ? '#f0fdf4' : '#fff7ed',
                                                            color: m.account ? '#065f46' : '#c2410c',
                                                            cursor: 'pointer',
                                                        }}>
                                                        {m.account ? '✅' : '📱'}
                                                    </button>
                                                    {m.account && (
                                                        <button onClick={() => setBiometricTarget(m)} title={m.has_face_id ? 'Face ID Trained' : 'Train Face ID'}
                                                            style={{
                                                                flex: 1, padding: '4px 6px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                                                border: `1px solid ${m.has_face_id ? '#10b981' : '#d1d5db'}`,
                                                                background: m.has_face_id ? 'rgba(16,185,129,0.1)' : 'var(--t-surface)',
                                                                color: m.has_face_id ? '#10b981' : 'var(--t-text-muted)',
                                                                cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            }}>
                                                            <IconFaceID size={12} color={m.has_face_id ? '#10b981' : 'var(--t-text-muted)'} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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
                <IDCardModal memberId={idCardMemberId} onClose={() => setShowIDCard(false)} />
            )}

            {portalTarget && (
                <CreateAccountModal
                    member={portalTarget}
                    projects={projects}
                    defaultProjectId={effectiveProjectId}
                    onClose={() => { setPortalTarget(null); load(); }}
                />
            )}

            {biometricTarget && (
                <BiometricTrainingModal
                    member={biometricTarget}
                    onClose={() => { setBiometricTarget(null); load(); }}
                />
            )}
        </div>
    );
}
