import React, { useState, useEffect } from 'react';
import workforceService from '../../../services/workforceService';

// ── Reusable sub-components ──────────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
    const map = {
        ACTIVE:      { bg: '#d1fae5', color: '#065f46', label: 'Active' },
        ON_LEAVE:    { bg: '#fef3c7', color: '#92400e', label: 'On Leave' },
        INACTIVE:    { bg: '#f3f4f6', color: '#6b7280', label: 'Inactive' },
        SUSPENDED:   { bg: '#fee2e2', color: '#991b1b', label: 'Suspended' },
        BLACKLISTED: { bg: '#1f2937', color: '#f9fafb', label: 'Blacklisted' },
        TERMINATED:  { bg: '#fee2e2', color: '#991b1b', label: 'Terminated' },
    };
    const s = map[status] || { bg: '#f3f4f6', color: '#374151', label: status };
    return (
        <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 99,
            fontSize: 11, fontWeight: 700,
            background: s.bg, color: s.color,
        }}>{s.label}</span>
    );
};

export const TypeBadge = ({ type }) => {
    const map = {
        LABOUR:        { bg: '#dbeafe', color: '#1e40af' },
        STAFF:         { bg: '#ede9fe', color: '#5b21b6' },
        SUBCONTRACTOR: { bg: '#fef3c7', color: '#92400e' },
        FREELANCE:     { bg: '#d1fae5', color: '#065f46' },
    };
    const s = map[type] || { bg: '#f3f4f6', color: '#374151' };
    return (
        <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 99,
            fontSize: 11, fontWeight: 600, background: s.bg, color: s.color,
        }}>{type}</span>
    );
};

export const Spinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid var(--t-border)',
            borderTopColor: 'var(--t-primary)',
            animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

function DeleteConfirmModal({ member, onConfirm, onCancel, deleting }) {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--t-bg)', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
                <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
                <h3 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: 17, textAlign: 'center' }}>Delete Member?</h3>
                <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--t-text-muted)', textAlign: 'center' }}>
                    <strong>{member.full_name}</strong> ({member.employee_id})
                </p>
                <p style={{ margin: '0 0 24px', fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
                    This action cannot be undone. All records linked to this member will also be deleted.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'transparent', color: 'var(--t-text)', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 800, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                        {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Drawer Component ────────────────────────────────────────────────────
export default function MemberDrawer({ member, onClose, onSaved, onDeleted, projectId }) {
    const isEdit = !!member;
    const [roles, setRoles]       = useState([]);
    const [teams, setTeams]       = useState([]);
    const [saving, setSaving]     = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDel, setShowDel]   = useState(false);
    const [error, setError]       = useState('');
    const [fetching, setFetching] = useState(isEdit);

    const BLANK = {
        name: '',
        phone: '',
        email: '',
        worker_type: 'LABOUR',
        status: 'ACTIVE',
        join_date: new Date().toISOString().slice(0, 10),
        current_project: projectId || '',
        role: '',
        gender: 'M',
        address: '',
        nationality: 'Nepali',
        language: 'Nepali'
    };

    const [form, setForm] = useState(BLANK);

    useEffect(() => {
        const loadInitial = async () => {
            try {
                const [r, t] = await Promise.all([
                    workforceService.getRoles(),
                    workforceService.getTeams({ project: projectId })
                ]);
                setRoles(Array.isArray(r) ? r : (r.results || []));
                setTeams(Array.isArray(t) ? t : (t.results || []));
                
                if (isEdit) {
                    const full = await workforceService.getMember(member.id);
                    setForm({
                        ...full,
                        name: `${full.first_name || ''} ${full.last_name || ''}`.trim()
                    });
                }
            } catch (e) {
                setError('Failed to load form data.');
            } finally {
                setFetching(false);
            }
        };
        loadInitial();
    }, [isEdit, member, projectId]);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.name.trim()) {
            setError('Name is required.');
            return;
        }
        setSaving(true);
        setError('');

        try {
            // Smart name splitting
            const parts = form.name.trim().split(' ');
            const payload = {
                ...form,
                first_name: parts[0],
                last_name: parts.length > 1 ? parts.slice(1).join(' ') : '',
                current_project: form.current_project || projectId
            };

            if (isEdit) {
                await workforceService.updateMember(member.id, payload);
            } else {
                await workforceService.createMember(payload);
            }
            onSaved();
        } catch (e) {
            setError(e?.response?.data ? JSON.stringify(e.response.data) : 'Save failed. Check required fields.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await workforceService.deleteMember(member.id);
            onDeleted();
        } catch (e) {
            setError('Delete failed.');
            setDeleting(false);
            setShowDel(false);
        }
    };

    const sectionTitleStyle = { fontSize: 13, fontWeight: 900, marginBottom: 16, color: 'var(--t-text)', display: 'flex', alignItems: 'center', gap: 8 };

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 290, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }} />
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 300,
                width: '100%', maxWidth: 480, background: 'var(--t-bg)',
                borderLeft: '1px solid var(--t-border)', boxShadow: '-20px 0 60px rgba(0,0,0,0.2)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ padding: '24px 30px', borderBottom: '1px solid var(--t-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ margin: 0, fontWeight: 900, fontSize: 22 }}>{isEdit ? 'Edit Profile' : 'Register New Staff'}</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--t-text3)', fontWeight: 600 }}>Manage workforce identity & roles.</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', width: 36, height: 36, borderRadius: 12, cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 40px' }}>
                    {fetching ? (
                        <div style={{ padding: 40 }}><Spinner /></div>
                    ) : (
                        <>
                            {/* Identity Section */}
                            <div className="form-section" style={{ padding: '24px 30px' }}>
                                <h3 style={sectionTitleStyle}>👤 Identity</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', marginBottom: 6 }}>Full Name *</label>
                                        <input className="premium-input" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="e.g. Ram Bahadur Tamang" style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', marginBottom: 6 }}>Phone Number *</label>
                                            <input className="premium-input" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="98XXXXXXXX" style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', marginBottom: 6 }}>Staff Type</label>
                                            <select className="premium-input" value={form.worker_type || 'LABOUR'} onChange={e => set('worker_type', e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }}>
                                                <option value="LABOUR">Daily Labour</option>
                                                <option value="STAFF">Internal Staff</option>
                                                <option value="SUBCONTRACTOR">Subcontractor</option>
                                                <option value="FREELANCE">Freelance</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Classification */}
                            <div className="form-section" style={{ background: 'rgba(249,115,22,0.02)', padding: '24px 30px' }}>
                                <h3 style={sectionTitleStyle}>🏗️ Classification</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', marginBottom: 6 }}>Official Role</label>
                                            <select className="premium-input" value={form.role || ''} onChange={e => set('role', e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }}>
                                                <option value="">— select role —</option>
                                                {roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', marginBottom: 6 }}>Status</label>
                                            <select className="premium-input" value={form.status || 'ACTIVE'} onChange={e => set('status', e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }}>
                                                <option value="ACTIVE">✅ Active</option>
                                                <option value="ON_LEAVE">⏳ On Leave</option>
                                                <option value="SUSPENDED">🚫 Suspended</option>
                                                <option value="TERMINATED">❌ Terminated</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', marginBottom: 6 }}>Assign to Project</label>
                                        <select className="premium-input" value={form.current_project || ''} onChange={e => set('current_project', e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }}>
                                            <option value="">All Projects / Unassigned</option>
                                            {projectId && <option value={projectId}>Current Project</option>}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', marginBottom: 6 }}>Assign to Team</label>
                                        <select className="premium-input" value={form.team_id || ''} onChange={e => set('team_id', e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }}>
                                            <option value="">— Independent (No Team) —</option>
                                            {teams.map(t => <option key={t.id} value={t.id}>👥 {t.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="form-section" style={{ padding: '24px 30px' }}>
                                <h3 style={sectionTitleStyle}>📄 Personal Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', marginBottom: 6 }}>Email</label>
                                        <input className="premium-input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="Email address" style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', marginBottom: 6 }}>Join Date</label>
                                        <input className="premium-input" type="date" value={form.join_date || ''} onChange={e => set('join_date', e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', marginBottom: 6 }}>Address</label>
                                    <textarea className="premium-input" style={{ width: '100%', height: 80, resize: 'none', padding: '12px', borderRadius: 12, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }} value={form.address || ''} onChange={e => set('address', e.target.value)} placeholder="Permanent/Current address..." />
                                </div>
                            </div>

                            {error && <div style={{ padding: '12px 30px', color: '#ef4444', fontSize: 12, fontWeight: 700 }}>⚠️ {error}</div>}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '24px 30px', borderTop: '1px solid var(--t-border)', background: 'var(--t-surface)', display: 'flex', gap: 12 }}>
                    {isEdit && (
                        <button onClick={() => setShowDel(true)} style={{ padding: '16px', borderRadius: 16, border: '1px solid #fee2e2', background: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontSize: 18 }}>🗑</button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: 14, border: '1px solid var(--t-border)', background: 'transparent', color: 'var(--t-text)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving || fetching}
                        style={{ padding: '12px 32px', borderRadius: 14, border: 'none', background: '#000', color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    >
                        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Staff'}
                    </button>
                </div>
            </div>

            {showDel && (
                <DeleteConfirmModal
                    member={member}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDel(false)}
                    deleting={deleting}
                />
            )}
        </>
    );
}
