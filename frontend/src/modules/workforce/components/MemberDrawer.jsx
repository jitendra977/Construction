import React, { useState, useEffect, useMemo } from 'react';
import workforceService from '../../../services/workforceService';

// ── Shared style helpers ─────────────────────────────────────────────────────
const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 12,
    border: '1px solid var(--t-border)', background: 'var(--t-surface)',
    color: 'var(--t-text)', fontSize: 14, boxSizing: 'border-box',
};

const labelStyle = {
    display: 'block', fontSize: 10, fontWeight: 800,
    color: 'var(--t-text3)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 6,
};

const sectionStyle = (tint) => ({
    padding: '22px 28px',
    background: tint || 'transparent',
    borderBottom: '1px solid var(--t-border)',
});

const sectionTitleStyle = {
    fontSize: 12, fontWeight: 900, marginBottom: 16,
    color: 'var(--t-text)', display: 'flex', alignItems: 'center', gap: 8,
    textTransform: 'uppercase', letterSpacing: '0.05em',
};

const Field = ({ label, children, half }) => (
    <div style={half ? {} : {}}>
        <label style={labelStyle}>{label}</label>
        {children}
    </div>
);

const Grid = ({ cols = 2, children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
        {children}
    </div>
);

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
            fontSize: 11, fontWeight: 700, background: s.bg, color: s.color,
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

// Worker type → category keyword mapping for smart role filtering
const TYPE_CATEGORY_HINTS = {
    LABOUR:        ['labour', 'labor', 'worker', 'unskilled', 'skilled', 'helper', 'mason', 'carpenter'],
    STAFF:         ['staff', 'management', 'site', 'engineer', 'supervisor', 'admin', 'safety', 'qa'],
    SUBCONTRACTOR: ['subcontract', 'contract', 'vendor'],
    FREELANCE:     ['freelance', 'consultant'],
};

function groupRolesByCategory(roles) {
    const groups = {};
    for (const r of roles) {
        const cat = r.category_name || 'General';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(r);
    }
    return groups;
}

function filterRolesByType(roles, workerType) {
    if (!workerType) return roles;
    const hints = TYPE_CATEGORY_HINTS[workerType] || [];
    if (!hints.length) return roles;
    const matched = roles.filter(r =>
        hints.some(h => (r.category_name || '').toLowerCase().includes(h))
    );
    // If no matches (category names don't match hints), return all roles
    return matched.length > 0 ? matched : roles;
}

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
    const [allRoles, setAllRoles] = useState([]);
    const [projects, setProjects] = useState([]);
    const [teams, setTeams]       = useState([]);
    const [saving, setSaving]     = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDel, setShowDel]   = useState(false);
    const [error, setError]       = useState('');
    const [fetching, setFetching] = useState(true);
    const [showAllRoles, setShowAllRoles] = useState(false);

    const BLANK = {
        name: '',
        phone: '',
        phone_alt: '',
        email: '',
        worker_type: 'LABOUR',
        status: 'ACTIVE',
        join_date: new Date().toISOString().slice(0, 10),
        end_date: '',
        current_project: projectId || '',
        team_id: '',
        role: '',
        gender: 'M',
        date_of_birth: '',
        address: '',
        nationality: 'Nepali',
        language: 'Nepali',
    };

    const [form, setForm] = useState(BLANK);

    useEffect(() => {
        const loadInitial = async () => {
            try {
                const [r, t] = await Promise.all([
                    workforceService.getRoles({ page_size: 200 }),
                    workforceService.getTeams({ project: projectId, page_size: 100 }),
                ]);
                const roleList = Array.isArray(r) ? r : (r.results || []);
                const teamList = Array.isArray(t) ? t : (t.results || []);
                setAllRoles(roleList.filter(role => role.is_active !== false));
                setTeams(teamList);

                if (isEdit) {
                    const full = await workforceService.getMember(member.id);
                    setForm({
                        ...BLANK,
                        ...full,
                        name: `${full.first_name || ''} ${full.last_name || ''}`.trim(),
                        phone: full.phone || '',
                        phone_alt: full.phone_alt || '',
                        email: full.email || '',
                        date_of_birth: full.date_of_birth || '',
                        end_date: full.end_date || '',
                        team_id: full.team_id || '',
                        current_project: full.current_project || projectId || '',
                    });
                }
            } catch (e) {
                setError('Failed to load form data. Please try again.');
            } finally {
                setFetching(false);
            }
        };
        loadInitial();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    // Smart role filtering: only show roles relevant to the selected worker type
    const filteredRoles = useMemo(() => {
        if (showAllRoles) return allRoles;
        return filterRolesByType(allRoles, form.worker_type);
    }, [allRoles, form.worker_type, showAllRoles]);

    const groupedRoles = useMemo(() => groupRolesByCategory(filteredRoles), [filteredRoles]);
    const selectedRoleObj = allRoles.find(r => String(r.id) === String(form.role));

    // When worker_type changes, clear role if it no longer matches the filtered set
    const handleWorkerTypeChange = (newType) => {
        const filtered = filterRolesByType(allRoles, newType);
        const roleStillValid = filtered.some(r => String(r.id) === String(form.role));
        setForm(p => ({
            ...p,
            worker_type: newType,
            role: roleStillValid ? p.role : '',
        }));
        setShowAllRoles(false);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setError('Full name is required.'); return; }
        if (!form.phone.trim()) { setError('Phone number is required.'); return; }
        if (!form.join_date) { setError('Join date is required.'); return; }
        setSaving(true);
        setError('');

        try {
            const parts = form.name.trim().split(/\s+/);
            const payload = {
                ...form,
                first_name: parts[0],
                last_name: parts.length > 1 ? parts.slice(1).join(' ') : '',
                current_project: form.current_project || projectId || null,
                role: form.role || null,
                date_of_birth: form.date_of_birth || null,
                end_date: form.end_date || null,
            };
            delete payload.name;

            let savedId;
            if (isEdit) {
                await workforceService.updateMember(member.id, payload);
                savedId = member.id;
            } else {
                const created = await workforceService.createMember(payload);
                savedId = created?.id;
            }

            // Auto-create + link AttendanceWorker so today_status works immediately
            if (savedId && (form.current_project || projectId)) {
                try { await workforceService.syncAttendance(savedId); } catch { /* non-fatal */ }
            }

            onSaved();
        } catch (e) {
            const data = e?.response?.data;
            if (data && typeof data === 'object') {
                const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
                setError(msgs);
            } else {
                setError('Save failed. Please check the fields and try again.');
            }
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

    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 290, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }} />

            {/* Drawer panel */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 300,
                width: '100%', maxWidth: 500, background: 'var(--t-bg)',
                borderLeft: '1px solid var(--t-border)', boxShadow: '-20px 0 60px rgba(0,0,0,0.2)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                {/* ── Header ── */}
                <div style={{ padding: '22px 28px', borderBottom: '1px solid var(--t-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ margin: 0, fontWeight: 900, fontSize: 21 }}>
                            {isEdit ? 'Edit Staff Profile' : 'Register New Staff'}
                        </h2>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--t-text3)', fontWeight: 600 }}>
                            {isEdit ? `Editing ${member.full_name || member.employee_id}` : 'Add a new team member to the workforce'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', width: 36, height: 36, borderRadius: 12, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                {/* ── Scrollable body ── */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {fetching ? (
                        <div style={{ padding: 40 }}><Spinner /></div>
                    ) : (
                        <>
                            {/* ── Section 1: Identity ── */}
                            <div style={sectionStyle()}>
                                <h3 style={sectionTitleStyle}>👤 Identity</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <Field label="Full Name *">
                                        <input
                                            className="premium-input"
                                            style={inputStyle}
                                            value={form.name || ''}
                                            onChange={e => set('name', e.target.value)}
                                            placeholder="e.g. Ram Bahadur Tamang"
                                        />
                                    </Field>

                                    <Grid cols={2}>
                                        <Field label="Phone Number *">
                                            <input
                                                className="premium-input"
                                                style={inputStyle}
                                                value={form.phone || ''}
                                                onChange={e => set('phone', e.target.value)}
                                                placeholder="98XXXXXXXX"
                                            />
                                        </Field>
                                        <Field label="Alt. Phone">
                                            <input
                                                className="premium-input"
                                                style={inputStyle}
                                                value={form.phone_alt || ''}
                                                onChange={e => set('phone_alt', e.target.value)}
                                                placeholder="Secondary number"
                                            />
                                        </Field>
                                    </Grid>

                                    <Grid cols={2}>
                                        <Field label="Gender">
                                            <select
                                                className="premium-input"
                                                style={inputStyle}
                                                value={form.gender || 'M'}
                                                onChange={e => set('gender', e.target.value)}
                                            >
                                                <option value="M">Male</option>
                                                <option value="F">Female</option>
                                                <option value="O">Other</option>
                                            </select>
                                        </Field>
                                        <Field label="Date of Birth">
                                            <input
                                                className="premium-input"
                                                type="date"
                                                style={inputStyle}
                                                value={form.date_of_birth || ''}
                                                onChange={e => set('date_of_birth', e.target.value)}
                                            />
                                        </Field>
                                    </Grid>

                                    <Grid cols={2}>
                                        <Field label="Nationality">
                                            <input
                                                className="premium-input"
                                                style={inputStyle}
                                                value={form.nationality || ''}
                                                onChange={e => set('nationality', e.target.value)}
                                                placeholder="e.g. Nepali"
                                            />
                                        </Field>
                                        <Field label="Language">
                                            <input
                                                className="premium-input"
                                                style={inputStyle}
                                                value={form.language || ''}
                                                onChange={e => set('language', e.target.value)}
                                                placeholder="e.g. Nepali"
                                            />
                                        </Field>
                                    </Grid>
                                </div>
                            </div>

                            {/* ── Section 2: Classification ── */}
                            <div style={sectionStyle('rgba(249,115,22,0.03)')}>
                                <h3 style={sectionTitleStyle}>🏗️ Role & Classification</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <Grid cols={2}>
                                        <Field label="Staff Type">
                                            <select
                                                className="premium-input"
                                                style={inputStyle}
                                                value={form.worker_type || 'LABOUR'}
                                                onChange={e => handleWorkerTypeChange(e.target.value)}
                                            >
                                                <option value="LABOUR">Daily Labour</option>
                                                <option value="STAFF">Internal Staff</option>
                                                <option value="SUBCONTRACTOR">Subcontractor</option>
                                                <option value="FREELANCE">Freelance</option>
                                            </select>
                                        </Field>
                                        <Field label="Status">
                                            <select
                                                className="premium-input"
                                                style={inputStyle}
                                                value={form.status || 'ACTIVE'}
                                                onChange={e => set('status', e.target.value)}
                                            >
                                                <option value="ACTIVE">✅ Active</option>
                                                <option value="ON_LEAVE">⏳ On Leave</option>
                                                <option value="SUSPENDED">🚫 Suspended</option>
                                                <option value="TERMINATED">❌ Terminated</option>
                                            </select>
                                        </Field>
                                    </Grid>

                                    {/* Official Role — grouped by category */}
                                    <Field label="Official Role">
                                        <select
                                            className="premium-input"
                                            style={inputStyle}
                                            value={form.role || ''}
                                            onChange={e => set('role', e.target.value)}
                                        >
                                            <option value="">— Select role —</option>
                                            {Object.entries(groupedRoles).map(([cat, catRoles]) => (
                                                <optgroup key={cat} label={cat}>
                                                    {catRoles.map(r => (
                                                        <option key={r.id} value={r.id}>
                                                            {r.title}{r.code ? ` (${r.code})` : ''}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>

                                        {/* Role meta hint */}
                                        {selectedRoleObj && (
                                            <div style={{ marginTop: 6, padding: '7px 12px', background: 'rgba(99,102,241,0.07)', borderRadius: 8, fontSize: 12, color: 'var(--t-text3)', display: 'flex', gap: 12 }}>
                                                <span>💼 {selectedRoleObj.category_name}</span>
                                                {selectedRoleObj.default_wage_amount && (
                                                    <span>💰 {selectedRoleObj.currency} {selectedRoleObj.default_wage_amount}/{selectedRoleObj.wage_type_display || selectedRoleObj.default_wage_type}</span>
                                                )}
                                                {selectedRoleObj.requires_license && <span>📋 License required</span>}
                                                {selectedRoleObj.requires_cert && <span>🎓 Cert required</span>}
                                            </div>
                                        )}

                                        {/* Toggle to show all roles */}
                                        {!showAllRoles && filteredRoles.length < allRoles.length && (
                                            <button
                                                type="button"
                                                onClick={() => setShowAllRoles(true)}
                                                style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--t-primary)', fontSize: 12, cursor: 'pointer', padding: 0, fontWeight: 600 }}
                                            >
                                                + Show all {allRoles.length} roles
                                            </button>
                                        )}
                                        {showAllRoles && (
                                            <button
                                                type="button"
                                                onClick={() => setShowAllRoles(false)}
                                                style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--t-text3)', fontSize: 12, cursor: 'pointer', padding: 0, fontWeight: 600 }}
                                            >
                                                ↩ Show suggested roles only
                                            </button>
                                        )}
                                    </Field>

                                    <Grid cols={2}>
                                        <Field label="Assign to Project">
                                            <select
                                                className="premium-input"
                                                style={inputStyle}
                                                value={form.current_project || ''}
                                                onChange={e => set('current_project', e.target.value)}
                                            >
                                                <option value="">All Projects / Unassigned</option>
                                                {projectId && <option value={projectId}>Current Project</option>}
                                            </select>
                                        </Field>
                                        <Field label="Assign to Team">
                                            <select
                                                className="premium-input"
                                                style={inputStyle}
                                                value={form.team_id || ''}
                                                onChange={e => set('team_id', e.target.value)}
                                            >
                                                <option value="">— Independent —</option>
                                                {teams.map(t => (
                                                    <option key={t.id} value={t.id}>👥 {t.name}</option>
                                                ))}
                                            </select>
                                        </Field>
                                    </Grid>
                                </div>
                            </div>

                            {/* ── Section 3: Employment ── */}
                            <div style={sectionStyle('rgba(16,185,129,0.03)')}>
                                <h3 style={sectionTitleStyle}>📅 Employment</h3>
                                <Grid cols={2}>
                                    <Field label="Join Date *">
                                        <input
                                            className="premium-input"
                                            type="date"
                                            style={inputStyle}
                                            value={form.join_date || ''}
                                            onChange={e => set('join_date', e.target.value)}
                                        />
                                    </Field>
                                    <Field label="End Date">
                                        <input
                                            className="premium-input"
                                            type="date"
                                            style={inputStyle}
                                            value={form.end_date || ''}
                                            onChange={e => set('end_date', e.target.value)}
                                        />
                                    </Field>
                                </Grid>
                            </div>

                            {/* ── Section 4: Contact & Address ── */}
                            <div style={sectionStyle()}>
                                <h3 style={sectionTitleStyle}>📋 Contact Details</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <Field label="Email Address">
                                        <input
                                            className="premium-input"
                                            type="email"
                                            style={inputStyle}
                                            value={form.email || ''}
                                            onChange={e => set('email', e.target.value)}
                                            placeholder="worker@example.com"
                                        />
                                    </Field>
                                    <Field label="Address">
                                        <textarea
                                            className="premium-input"
                                            style={{ ...inputStyle, height: 72, resize: 'none' }}
                                            value={form.address || ''}
                                            onChange={e => set('address', e.target.value)}
                                            placeholder="Permanent / current address..."
                                        />
                                    </Field>
                                </div>
                            </div>

                            {/* Error display */}
                            {error && (
                                <div style={{ padding: '12px 28px', color: '#ef4444', fontSize: 12, fontWeight: 700, background: 'rgba(239,68,68,0.06)' }}>
                                    ⚠️ {error}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer ── */}
                <div style={{ padding: '20px 28px', borderTop: '1px solid var(--t-border)', background: 'var(--t-surface)', display: 'flex', gap: 10, alignItems: 'center' }}>
                    {isEdit && (
                        <button
                            onClick={() => setShowDel(true)}
                            style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid #fee2e2', background: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}
                        >🗑</button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button
                        onClick={onClose}
                        style={{ padding: '11px 22px', borderRadius: 12, border: '1px solid var(--t-border)', background: 'transparent', color: 'var(--t-text)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                    >Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={saving || fetching}
                        style={{
                            padding: '11px 30px', borderRadius: 12, border: 'none',
                            background: saving ? '#555' : '#000', color: '#fff',
                            fontWeight: 900, fontSize: 14, cursor: (saving || fetching) ? 'not-allowed' : 'pointer',
                            opacity: fetching ? 0.6 : 1,
                            transition: 'background 0.15s',
                        }}
                    >
                        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Register Staff'}
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
