/**
 * RolesTeamsTab.jsx
 * ─────────────────
 * Setup tab for managing WorkforceRoles, WorkforceCategories, and Teams.
 *
 * Features:
 *  - View all roles grouped by category
 *  - Add / edit / delete roles
 *  - View all teams
 *  - Add / edit / delete teams
 *  - Quick-seed default roles button
 */
import React, { useState, useEffect, useCallback } from 'react';
import workforceService from '../../../services/workforceService';

// ── Tiny UI helpers ──────────────────────────────────────────────────────────
const inputStyle = {
    width: '100%', padding: '10px 13px', borderRadius: 10,
    border: '1px solid var(--t-border)', background: 'var(--t-surface)',
    color: 'var(--t-text)', fontSize: 14, boxSizing: 'border-box',
};
const labelStyle = {
    display: 'block', fontSize: 10, fontWeight: 800,
    color: 'var(--t-text3)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 5,
};
const btnPrimary = (disabled) => ({
    padding: '9px 20px', borderRadius: 10, border: 'none',
    background: disabled ? '#aaa' : '#000', color: '#fff',
    fontWeight: 800, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
});
const btnGhost = {
    padding: '8px 16px', borderRadius: 10,
    border: '1px solid var(--t-border)', background: 'transparent',
    color: 'var(--t-text)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const btnDanger = {
    padding: '6px 12px', borderRadius: 8, border: '1px solid #fee2e2',
    background: '#fff5f5', color: '#dc2626', fontWeight: 700,
    fontSize: 12, cursor: 'pointer',
};
const card = {
    background: 'var(--t-bg)', border: '1px solid var(--t-border)',
    borderRadius: 14, overflow: 'hidden',
};

const WAGE_TYPES = ['daily', 'hourly', 'monthly'];

const CATEGORY_COLORS = [
    '#FF5733', '#3357FF', '#33C3FF', '#FF8C33', '#8C33FF',
    '#33FF8C', '#FFD700', '#FF3380', '#00CED1', '#7CFC00',
];

// ── Default roles for quick-seed ──────────────────────────────────────────────
const DEFAULT_ROLES_BY_CATEGORY = {
    'Civil & Structural': [
        { title: 'Lead Mason',    code: 'MASON_L', trade_code: 'MASON',       default_wage_type: 'daily',   default_wage_amount: 900 },
        { title: 'Mason',         code: 'MASON',   trade_code: 'MASON',       default_wage_type: 'daily',   default_wage_amount: 800 },
        { title: 'Helper / Jugi', code: 'HELPER',  trade_code: 'HELPER',      default_wage_type: 'daily',   default_wage_amount: 600 },
        { title: 'Steel Fixer',   code: 'LOHARI',  trade_code: 'STEEL_FIXER', default_wage_type: 'daily',   default_wage_amount: 750 },
        { title: 'Carpenter',     code: 'CARP',    trade_code: 'CARPENTER',   default_wage_type: 'daily',   default_wage_amount: 800 },
    ],
    'MEP Services': [
        { title: 'Electrician',   code: 'ELEC',    trade_code: 'ELECTRICIAN', default_wage_type: 'daily',   default_wage_amount: 850 },
        { title: 'Plumber',       code: 'PLUMB',   trade_code: 'PLUMBER',     default_wage_type: 'daily',   default_wage_amount: 800 },
    ],
    'Finishing': [
        { title: 'Painter',       code: 'PAINT',   trade_code: 'PAINTER',     default_wage_type: 'daily',   default_wage_amount: 700 },
        { title: 'Tile Setter',   code: 'TILE',    trade_code: 'TILE_SETTER', default_wage_type: 'daily',   default_wage_amount: 750 },
    ],
    'Site Management': [
        { title: 'Site Supervisor', code: 'SUPV',  trade_code: 'SUPERVISOR',  default_wage_type: 'daily',   default_wage_amount: 1200 },
        { title: 'Site Engineer',   code: 'ENG',   trade_code: 'ENGINEER',    default_wage_type: 'monthly', default_wage_amount: 55000 },
        { title: 'Project Manager', code: 'PM',    trade_code: 'MANAGER',     default_wage_type: 'monthly', default_wage_amount: 75000 },
    ],
    'Administration': [
        { title: 'Accountant',    code: 'ACCT',    trade_code: 'ACCOUNTANT',  default_wage_type: 'monthly', default_wage_amount: 40000 },
        { title: 'Driver',        code: 'DRVR',    trade_code: 'DRIVER',      default_wage_type: 'daily',   default_wage_amount: 700 },
        { title: 'Security Guard',code: 'SEC',     trade_code: 'SECURITY',    default_wage_type: 'daily',   default_wage_amount: 650 },
    ],
};

// ── Role Form Modal ───────────────────────────────────────────────────────────
function RoleModal({ role, categories, onClose, onSaved }) {
    const isEdit = !!role;
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');
    const [form, setForm] = useState({
        title: role?.title || '',
        code:  role?.code || '',
        category: role?.category || (categories[0]?.id || ''),
        trade_code: role?.trade_code || '',
        default_wage_type:   role?.default_wage_type || 'daily',
        default_wage_amount: role?.default_wage_amount || '',
        currency: role?.currency || 'NPR',
        description: role?.description || '',
        requires_license: role?.requires_license || false,
        requires_cert:    role?.requires_cert || false,
        is_active: role?.is_active !== false,
    });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.title.trim()) { setError('Role title is required.'); return; }
        if (!form.code.trim())  { setError('Role code is required.'); return; }
        if (!form.category)     { setError('Category is required.'); return; }
        setSaving(true); setError('');
        try {
            const payload = { ...form, code: form.code.toUpperCase().replace(/\s+/g, '_') };
            if (isEdit) {
                await workforceService.updateRole(role.id, payload);
            } else {
                await workforceService.createRole(payload);
            }
            onSaved();
        } catch (e) {
            const data = e?.response?.data;
            if (data && typeof data === 'object') {
                setError(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '));
            } else {
                setError('Save failed.');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--t-bg)', borderRadius: 18, padding: 28, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: 18 }}>{isEdit ? 'Edit Role' : 'Add New Role'}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--t-text3)' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Role Title *</label>
                            <input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Mason" />
                        </div>
                        <div>
                            <label style={labelStyle}>Short Code *</label>
                            <input style={inputStyle} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="e.g. MASON" maxLength={20} />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Category *</label>
                        <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
                            <option value="">— Select category —</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Wage Type</label>
                            <select style={inputStyle} value={form.default_wage_type} onChange={e => set('default_wage_type', e.target.value)}>
                                {WAGE_TYPES.map(w => <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Default Rate</label>
                            <input style={inputStyle} type="number" value={form.default_wage_amount} onChange={e => set('default_wage_amount', e.target.value)} placeholder="e.g. 800" />
                        </div>
                        <div>
                            <label style={labelStyle}>Currency</label>
                            <input style={inputStyle} value={form.currency} onChange={e => set('currency', e.target.value)} placeholder="NPR" maxLength={3} />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Description (optional)</label>
                        <textarea style={{ ...inputStyle, height: 60, resize: 'none' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description..." />
                    </div>

                    <div style={{ display: 'flex', gap: 20 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.requires_license} onChange={e => set('requires_license', e.target.checked)} />
                            Requires License
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.requires_cert} onChange={e => set('requires_cert', e.target.checked)} />
                            Requires Certification
                        </label>
                    </div>

                    {error && <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 700 }}>⚠️ {error}</div>}

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button style={btnGhost} onClick={onClose}>Cancel</button>
                        <button style={btnPrimary(saving)} onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Role'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Team Form Modal ───────────────────────────────────────────────────────────
function TeamModal({ team, members, projectId, onClose, onSaved }) {
    const isEdit = !!team;
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({
        name:        team?.name || '',
        description: team?.description || '',
        leader:      team?.leader || '',
        project:     team?.project || projectId || '',
    });
    const [selectedMembers, setSelectedMembers] = useState(
        team?.members?.map(m => (typeof m === 'object' ? m.id : m)) || []
    );
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const toggleMember = (id) => {
        setSelectedMembers(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const filteredMembers = members.filter(m => {
        const q = search.toLowerCase();
        return !q || m.full_name?.toLowerCase().includes(q) || m.role_name?.toLowerCase().includes(q);
    });

    const handleSave = async () => {
        if (!form.name.trim()) { setError('Team name is required.'); return; }
        setSaving(true); setError('');
        try {
            const payload = { ...form };
            if (!payload.leader) delete payload.leader;

            let savedTeam;
            if (isEdit) {
                savedTeam = await workforceService.updateTeam(team.id, payload);
            } else {
                savedTeam = await workforceService.createTeam(payload);
            }

            // Sync members
            if (savedTeam?.id) {
                if (selectedMembers.length > 0) {
                    await workforceService.addTeamMembers(savedTeam.id, selectedMembers);
                }
            }
            onSaved();
        } catch (e) {
            setError('Save failed. Check required fields.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--t-bg)', borderRadius: 18, padding: 28, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: 18 }}>{isEdit ? 'Edit Team' : 'Create Team'}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--t-text3)' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={labelStyle}>Team Name *</label>
                        <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Civil Works Team" />
                    </div>

                    <div>
                        <label style={labelStyle}>Team Leader</label>
                        <select style={inputStyle} value={form.leader || ''} onChange={e => set('leader', e.target.value)}>
                            <option value="">— No leader assigned —</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.full_name} {m.role_name ? `(${m.role_name})` : ''}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Description</label>
                        <input style={inputStyle} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief team description..." />
                    </div>

                    {/* Member picker */}
                    <div>
                        <label style={labelStyle}>Team Members ({selectedMembers.length} selected)</label>
                        <input
                            style={{ ...inputStyle, marginBottom: 8 }}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search members..."
                        />
                        <div style={{ border: '1px solid var(--t-border)', borderRadius: 10, maxHeight: 220, overflowY: 'auto' }}>
                            {filteredMembers.length === 0 ? (
                                <div style={{ padding: 16, textAlign: 'center', color: 'var(--t-text3)', fontSize: 13 }}>No members found</div>
                            ) : filteredMembers.map(m => (
                                <label key={m.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '9px 14px', cursor: 'pointer',
                                    borderBottom: '1px solid var(--t-border)',
                                    background: selectedMembers.includes(m.id) ? 'rgba(99,102,241,0.07)' : 'transparent',
                                }}>
                                    <input type="checkbox" checked={selectedMembers.includes(m.id)} onChange={() => toggleMember(m.id)} />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700 }}>{m.full_name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--t-text3)' }}>{m.role_name || m.worker_type}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {error && <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 700 }}>⚠️ {error}</div>}

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button style={btnGhost} onClick={onClose}>Cancel</button>
                        <button style={btnPrimary(saving)} onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : isEdit ? 'Save Team' : 'Create Team'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Category Form Modal ───────────────────────────────────────────────────────
function CategoryModal({ category, allCategories, onClose, onSaved }) {
    const isEdit = !!category;
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');
    const [form, setForm] = useState({
        name:        category?.name || '',
        parent:      category?.parent || '',
        description: category?.description || '',
        color:       category?.color || CATEGORY_COLORS[0],
        icon:        category?.icon || '',
    });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.name.trim()) { setError('Category name is required.'); return; }
        setSaving(true); setError('');
        try {
            const payload = { ...form, parent: form.parent || null };
            if (isEdit) {
                await workforceService.updateCategory(category.id, payload);
            } else {
                await workforceService.createCategory(payload);
            }
            onSaved();
        } catch (e) {
            const data = e?.response?.data;
            setError(data ? JSON.stringify(data) : 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    const parents = allCategories.filter(c => !c.parent && c.id !== category?.id);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--t-bg)', borderRadius: 18, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: 18 }}>{isEdit ? 'Edit Category' : 'Add Category'}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--t-text3)' }}>✕</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={labelStyle}>Category Name *</label>
                        <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Civil & Structural" />
                    </div>
                    <div>
                        <label style={labelStyle}>Parent Category (optional)</label>
                        <select style={inputStyle} value={form.parent || ''} onChange={e => set('parent', e.target.value)}>
                            <option value="">— Top level —</option>
                            {parents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Color</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {CATEGORY_COLORS.map(c => (
                                <div
                                    key={c}
                                    onClick={() => set('color', c)}
                                    style={{
                                        width: 28, height: 28, borderRadius: '50%',
                                        background: c, cursor: 'pointer',
                                        border: form.color === c ? '3px solid var(--t-text)' : '2px solid transparent',
                                        transition: 'border 0.1s',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    {error && <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 700 }}>⚠️ {error}</div>}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button style={btnGhost} onClick={onClose}>Cancel</button>
                        <button style={btnPrimary(saving)} onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : isEdit ? 'Save' : 'Add Category'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RolesTeamsTab({ projectId }) {
    const [activeSection, setActiveSection] = useState('roles');
    const [roles,      setRoles]      = useState([]);
    const [categories, setCategories] = useState([]);
    const [teams,      setTeams]      = useState([]);
    const [members,    setMembers]    = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState('');

    // Modals
    const [roleModal,     setRoleModal]     = useState(null); // null | 'new' | role object
    const [teamModal,     setTeamModal]     = useState(null);
    const [catModal,      setCatModal]      = useState(null);
    const [deleteTarget,  setDeleteTarget]  = useState(null); // { type, id, name }
    const [deleting,      setDeleting]      = useState(false);
    const [seeding,       setSeeding]       = useState(false);
    const [seedMsg,       setSeedMsg]       = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [r, c, t, m] = await Promise.all([
                workforceService.getRoles({ page_size: 200 }),
                workforceService.getCategories({ page_size: 100 }),
                workforceService.getTeams({ project: projectId, page_size: 100 }),
                workforceService.getMembers({ page_size: 300, current_project: projectId }),
            ]);
            setRoles(Array.isArray(r) ? r : (r.results || []));
            setCategories(Array.isArray(c) ? c : (c.results || []));
            setTeams(Array.isArray(t) ? t : (t.results || []));
            setMembers(Array.isArray(m) ? m : (m.results || []));
        } catch (e) {
            setError('Failed to load data.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    // Group roles by category
    const rolesByCategory = roles.reduce((acc, role) => {
        const cat = role.category_name || 'Uncategorised';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(role);
        return acc;
    }, {});

    // ── Quick-seed default roles ───────────────────────────────────────────────
    const handleSeedDefaults = async () => {
        setSeeding(true); setSeedMsg('');
        let created = 0;
        try {
            // Ensure base categories exist
            const existingCats = {};
            for (const cat of categories) existingCats[cat.name] = cat;

            for (const [catName, roleList] of Object.entries(DEFAULT_ROLES_BY_CATEGORY)) {
                let cat = existingCats[catName];
                if (!cat) {
                    cat = await workforceService.createCategory({ name: catName, color: CATEGORY_COLORS[created % CATEGORY_COLORS.length] });
                    existingCats[catName] = cat;
                }
                for (const role of roleList) {
                    const exists = roles.find(r => r.code === role.code);
                    if (!exists) {
                        await workforceService.createRole({ ...role, category: cat.id });
                        created++;
                    }
                }
            }
            setSeedMsg(`✅ Added ${created} default roles.`);
            load();
        } catch (e) {
            setSeedMsg('⚠️ Some roles may already exist or there was an error.');
            load();
        } finally {
            setSeeding(false);
        }
    };

    // ── Delete handler ────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            if (deleteTarget.type === 'role')     await workforceService.deleteRole(deleteTarget.id);
            if (deleteTarget.type === 'category') await workforceService.deleteCategory(deleteTarget.id);
            setDeleteTarget(null);
            load();
        } catch (e) {
            alert('Delete failed. This item may be in use.');
        } finally {
            setDeleting(false);
        }
    };

    const SECTIONS = [
        { id: 'roles',      label: 'Roles',       icon: '🏷️' },
        { id: 'teams',      label: 'Teams',        icon: '👥' },
        { id: 'categories', label: 'Categories',   icon: '📂' },
    ];

    if (loading) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚙️</div>
            Loading setup data…
        </div>
    );

    return (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

            {/* Section tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {SECTIONS.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        style={{
                            padding: '9px 20px', borderRadius: 10, cursor: 'pointer',
                            border: '1px solid var(--t-border)', fontWeight: 700, fontSize: 13,
                            background: activeSection === s.id ? '#000' : 'var(--t-surface)',
                            color: activeSection === s.id ? '#fff' : 'var(--t-text)',
                            transition: 'background 0.15s',
                        }}
                    >{s.icon} {s.label}</button>
                ))}
            </div>

            {error && <div style={{ padding: '10px 16px', background: '#fee2e2', borderRadius: 10, color: '#dc2626', marginBottom: 16, fontSize: 13 }}>⚠️ {error}</div>}

            {/* ── ROLES SECTION ── */}
            {activeSection === 'roles' && (
                <div>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h2 style={{ margin: 0, fontWeight: 900, fontSize: 18 }}>Staff Roles</h2>
                            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--t-text3)' }}>
                                {roles.length} role{roles.length !== 1 ? 's' : ''} across {Object.keys(rolesByCategory).length} categories
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            {roles.length === 0 && (
                                <button
                                    onClick={handleSeedDefaults}
                                    disabled={seeding}
                                    style={{ ...btnGhost, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', color: '#6366f1', fontWeight: 700 }}
                                >
                                    {seeding ? '⏳ Adding…' : '⚡ Load Default Roles'}
                                </button>
                            )}
                            <button onClick={() => setRoleModal('new')} style={btnPrimary(false)}>+ Add Role</button>
                        </div>
                    </div>

                    {seedMsg && (
                        <div style={{ padding: '8px 14px', background: 'rgba(16,185,129,0.1)', borderRadius: 8, fontSize: 12, color: '#065f46', marginBottom: 14 }}>{seedMsg}</div>
                    )}

                    {roles.length === 0 ? (
                        <div style={{ ...card, padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🏷️</div>
                            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>No roles yet</div>
                            <div style={{ color: 'var(--t-text3)', fontSize: 13, marginBottom: 20 }}>
                                Roles define the job positions in your workforce.<br />Click "Load Default Roles" for common construction roles.
                            </div>
                            <button onClick={handleSeedDefaults} disabled={seeding} style={btnPrimary(seeding)}>
                                {seeding ? '⏳ Loading…' : '⚡ Load Default Roles'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {Object.entries(rolesByCategory).map(([catName, catRoles]) => (
                                <div key={catName} style={card}>
                                    {/* Category header */}
                                    <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--t-border)', background: 'var(--t-surface)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: catRoles[0]?.category_color || '#ccc' }} />
                                        <span style={{ fontWeight: 800, fontSize: 13 }}>{catName}</span>
                                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t-text3)', fontWeight: 600 }}>{catRoles.length} role{catRoles.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    {/* Role rows */}
                                    {catRoles.map((role, idx) => (
                                        <div key={role.id} style={{
                                            padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12,
                                            borderBottom: idx < catRoles.length - 1 ? '1px solid var(--t-border)' : 'none',
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontWeight: 700, fontSize: 14 }}>{role.title}</span>
                                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 6, background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text3)' }}>
                                                        {role.code}
                                                    </span>
                                                    {role.requires_license && <span title="Requires License" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 5, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>📋 License</span>}
                                                    {role.requires_cert && <span title="Requires Certificate" style={{ fontSize: 10, padding: '1px 6px', borderRadius: 5, background: '#ede9fe', color: '#5b21b6', fontWeight: 700 }}>🎓 Cert</span>}
                                                </div>
                                                {role.default_wage_amount && (
                                                    <div style={{ fontSize: 12, color: 'var(--t-text3)', marginTop: 2 }}>
                                                        {role.currency || 'NPR'} {Number(role.default_wage_amount).toLocaleString()} / {role.wage_type_display || role.default_wage_type}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => setRoleModal(role)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                                                <button onClick={() => setDeleteTarget({ type: 'role', id: role.id, name: role.title })} style={btnDanger}>✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── TEAMS SECTION ── */}
            {activeSection === 'teams' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h2 style={{ margin: 0, fontWeight: 900, fontSize: 18 }}>Teams</h2>
                            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--t-text3)' }}>
                                {teams.length} team{teams.length !== 1 ? 's' : ''} for this project
                            </p>
                        </div>
                        <button onClick={() => setTeamModal('new')} style={btnPrimary(false)}>+ Create Team</button>
                    </div>

                    {teams.length === 0 ? (
                        <div style={{ ...card, padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>No teams yet</div>
                            <div style={{ color: 'var(--t-text3)', fontSize: 13, marginBottom: 20 }}>
                                Group your workforce into teams for better organisation.
                            </div>
                            <button onClick={() => setTeamModal('new')} style={btnPrimary(false)}>+ Create First Team</button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                            {teams.map(team => {
                                const teamMembers = team.members || [];
                                const leaderName = typeof team.leader === 'object'
                                    ? team.leader?.full_name
                                    : members.find(m => m.id === team.leader)?.full_name;
                                return (
                                    <div key={team.id} style={{ ...card, padding: 18 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                            <div style={{ fontWeight: 900, fontSize: 15 }}>👥 {team.name}</div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => setTeamModal(team)} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid var(--t-border)', background: 'var(--t-surface)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                                            </div>
                                        </div>
                                        {leaderName && (
                                            <div style={{ fontSize: 12, color: 'var(--t-text3)', marginBottom: 8 }}>
                                                👑 Leader: <strong>{leaderName}</strong>
                                            </div>
                                        )}
                                        <div style={{ fontSize: 12, color: 'var(--t-text3)' }}>
                                            {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
                                        </div>
                                        {teamMembers.length > 0 && (
                                            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {(Array.isArray(teamMembers) ? teamMembers.slice(0, 6) : []).map(m => {
                                                    const name = typeof m === 'object' ? m.full_name : members.find(x => x.id === m)?.full_name;
                                                    return name ? (
                                                        <span key={typeof m === 'object' ? m.id : m} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--t-surface)', border: '1px solid var(--t-border)', fontWeight: 600 }}>
                                                            {name.split(' ')[0]}
                                                        </span>
                                                    ) : null;
                                                })}
                                                {teamMembers.length > 6 && (
                                                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 700 }}>
                                                        +{teamMembers.length - 6} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── CATEGORIES SECTION ── */}
            {activeSection === 'categories' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h2 style={{ margin: 0, fontWeight: 900, fontSize: 18 }}>Role Categories</h2>
                            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--t-text3)' }}>
                                Organise roles into groups
                            </p>
                        </div>
                        <button onClick={() => setCatModal('new')} style={btnPrimary(false)}>+ Add Category</button>
                    </div>

                    {categories.length === 0 ? (
                        <div style={{ ...card, padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                            <div style={{ fontWeight: 800, marginBottom: 16 }}>No categories yet</div>
                            <button onClick={() => setCatModal('new')} style={btnPrimary(false)}>+ Add First Category</button>
                        </div>
                    ) : (
                        <div style={card}>
                            {categories.map((cat, idx) => (
                                <div key={cat.id} style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: idx < categories.length - 1 ? '1px solid var(--t-border)' : 'none' }}>
                                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: cat.color || '#ccc', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                                            {cat.parent_name ? <span style={{ color: 'var(--t-text3)', fontWeight: 400 }}>{cat.parent_name} → </span> : null}
                                            {cat.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--t-text3)' }}>
                                            {cat.roles?.length || 0} role{(cat.roles?.length || 0) !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => setCatModal(cat)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                                        <button onClick={() => setDeleteTarget({ type: 'category', id: cat.id, name: cat.name })} style={btnDanger}>✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Modals ── */}
            {roleModal && (
                <RoleModal
                    role={roleModal === 'new' ? null : roleModal}
                    categories={categories}
                    onClose={() => setRoleModal(null)}
                    onSaved={() => { setRoleModal(null); load(); }}
                />
            )}
            {teamModal && (
                <TeamModal
                    team={teamModal === 'new' ? null : teamModal}
                    members={members}
                    projectId={projectId}
                    onClose={() => setTeamModal(null)}
                    onSaved={() => { setTeamModal(null); load(); }}
                />
            )}
            {catModal && (
                <CategoryModal
                    category={catModal === 'new' ? null : catModal}
                    allCategories={categories}
                    onClose={() => setCatModal(null)}
                    onSaved={() => { setCatModal(null); load(); }}
                />
            )}

            {/* Delete confirm */}
            {deleteTarget && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: 'var(--t-bg)', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
                        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 10 }}>🗑️</div>
                        <h3 style={{ margin: '0 0 8px', textAlign: 'center', fontWeight: 900 }}>Delete {deleteTarget.type}?</h3>
                        <p style={{ margin: '0 0 20px', textAlign: 'center', fontSize: 13, color: 'var(--t-text3)' }}>
                            <strong>"{deleteTarget.name}"</strong> will be permanently removed.
                            {deleteTarget.type === 'category' && ' Roles inside will lose their category.'}
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setDeleteTarget(null)} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
                            <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 800, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                                {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
