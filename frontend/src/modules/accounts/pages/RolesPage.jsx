/**
 * RolesPage — view, create, edit roles and their permission flags.
 */
import { useMemo, useState } from 'react';
import { useAccounts } from '../context/AccountsContext';
import accountsApi from '../services/accountsApi';
import Modal from '../components/shared/Modal';
import Badge from '../components/shared/Badge';

const ROLE_COLORS = { SUPER_ADMIN:'#ef4444', HOME_OWNER:'#f97316', LEAD_ENGINEER:'#3b82f6', CONTRACTOR:'#8b5cf6', VIEWER:'#6b7280' };

const PERMISSION_GROUPS = [
    { key: 'System', label: 'System', icon: '🛡️', hint: 'Global override and high-level control' },
    { key: 'Projects', label: 'Projects', icon: '🗂️', hint: 'Project access and project operations' },
    { key: 'Dashboard', label: 'Dashboard', icon: '📊', hint: 'Home, analytics, estimator, guides, media' },
    { key: 'Profile', label: 'Profile', icon: '👤', hint: 'Personal profile pages' },
    { key: 'Admin Config', label: 'Admin Config', icon: '⚙️', hint: 'Users, roles, activity, and admin tools' },
    { key: 'Construction', label: 'Construction', icon: '🏗️', hint: 'Phases, tasks, and timeline control' },
    { key: 'Finance', label: 'Finance', icon: '💰', hint: 'Budgets, expenses, and payments' },
    { key: 'Structure', label: 'Structure', icon: '🏛️', hint: 'Floors and rooms' },
    { key: 'Resources', label: 'Resources', icon: '🧱', hint: 'Materials, suppliers, and purchases' },
    { key: 'Workforce', label: 'Workforce', icon: '👷', hint: 'Workers, attendance, payroll, and teams' },
    { key: 'Admin', label: 'Admin Tools', icon: '📦', hint: 'Settings and data transfer' },
];

const PERMISSIONS = [
    { key: 'can_manage_all_systems', label: 'Manage All Systems',    desc: 'Full system access',              group: 'System' },
    { key: 'can_view_projects',      label: 'View Projects',         desc: 'Open assigned projects',          group: 'Projects' },
    { key: 'can_manage_projects',    label: 'Manage Projects',       desc: 'Create/edit/delete projects',     group: 'Projects' },
    { key: 'can_view_dashboard',     label: 'View Dashboard',        desc: 'Dashboard, analytics, estimator, gallery, guides', group: 'Dashboard' },
    { key: 'can_view_profile',       label: 'View Profile',          desc: 'Open personal profile pages',     group: 'Profile' },
    { key: 'can_manage_admin_config', label: 'Manage Admin Config',   desc: 'Users, roles, activity, admin tools', group: 'Admin Config' },
    { key: 'can_view_phases',        label: 'View Phases',           desc: 'Read-only phases and timeline',   group: 'Construction' },
    { key: 'can_manage_phases',      label: 'Manage Phases & Tasks', desc: 'Create/edit construction work',   group: 'Construction' },
    { key: 'can_view_finances',      label: 'View Finances',         desc: 'Read-only finance data',          group: 'Finance' },
    { key: 'can_manage_finances',    label: 'Manage Finances',       desc: 'Create/edit expenses and budgets',group: 'Finance' },
    { key: 'can_view_structure',     label: 'View Structure',        desc: 'Read-only floors and rooms',      group: 'Structure' },
    { key: 'can_manage_structure',   label: 'Manage Structure',      desc: 'Create/edit floors and rooms',    group: 'Structure' },
    { key: 'can_view_resources',     label: 'View Resources',        desc: 'Read-only materials and suppliers', group: 'Resources' },
    { key: 'can_manage_resources',   label: 'Manage Resources',      desc: 'Create/edit resources and purchases', group: 'Resources' },
    { key: 'can_view_workforce',     label: 'View Workforce',        desc: 'Read-only workforce and attendance', group: 'Workforce' },
    { key: 'can_manage_workforce',   label: 'Manage Workforce',      desc: 'Manage workforce, attendance, payroll', group: 'Workforce' },
    { key: 'can_manage_users',       label: 'Manage Users & Roles',  desc: 'Invite, edit, deactivate users',  group: 'Admin' },
    { key: 'can_manage_settings',    label: 'Manage Settings',       desc: 'Application settings',            group: 'Admin' },
    { key: 'can_manage_data_transfer', label: 'Manage Data Transfer', desc: 'Import, export, restore data',   group: 'Admin' },
];

const PERMISSIONS_BY_GROUP = PERMISSIONS.reduce((acc, perm) => {
    (acc[perm.group] = acc[perm.group] || []).push(perm);
    return acc;
}, {});

const PAGE_CSS = `
  .roles-page-shell {
    width: 100%;
    box-sizing: border-box;
    padding: 0 clamp(12px, 2vw, 24px);
  }
  .roles-toolbar-row,
  .roles-editor-grid,
  .roles-legend-grid {
    width: 100%;
  }
  .roles-search {
    min-width: 220px;
    flex: 1;
  }
  .roles-search input {
    min-width: 0;
  }
  .roles-card-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
  .roles-table-wrap {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .roles-table {
    width: 100%;
    min-width: 980px;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
  }
  .roles-table th {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--t-text3);
    text-align: left;
    font-weight: 900;
    padding: 14px 14px 12px;
    position: sticky;
    top: 0;
    background: color-mix(in srgb, var(--t-surface) 96%, black);
    z-index: 1;
    border-bottom: 1px solid var(--t-border);
  }
  .roles-table th:first-child { border-top-left-radius: 14px; }
  .roles-table th:last-child { border-top-right-radius: 14px; }
  .roles-table td {
    padding: 14px;
    vertical-align: top;
    border-bottom: 1px solid var(--t-border);
    background: color-mix(in srgb, var(--t-surface) 94%, transparent);
  }
  .roles-table-row {
    background: var(--t-surface);
  }
  .roles-table-row:hover {
    background: color-mix(in srgb, var(--t-surface) 88%, #6366f1);
  }
  .roles-table-row:nth-child(even) td {
    background: color-mix(in srgb, var(--t-bg) 62%, var(--t-surface));
  }
  .roles-table-row:hover td {
    background: color-mix(in srgb, var(--t-surface) 84%, #6366f1);
  }
  .roles-role-name {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .roles-role-meta {
    min-width: 0;
  }
  .roles-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .roles-mini-bar {
    width: 100%;
    height: 7px;
    border-radius: 999px;
    background: var(--t-border);
    overflow: hidden;
    margin-top: 8px;
  }
  .roles-mini-bar > span {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
  }
  .roles-table-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--t-border);
    background: color-mix(in srgb, var(--t-surface) 96%, transparent);
  }
  .roles-table-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(110px, 1fr));
    gap: 10px;
  }
  .roles-table-stat {
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--t-border);
    background: var(--t-bg);
    min-width: 0;
  }
  .roles-table-stat-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 900;
    color: var(--t-text3);
  }
  .roles-table-stat-value {
    margin-top: 4px;
    font-size: 16px;
    font-weight: 900;
    color: var(--t-text);
  }
  .roles-legend-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
  .roles-editor-grid {
    grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  }
  .roles-toolbar-actions {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    flex-shrink: 0;
  }
  .roles-page-shell .roles-mobile-full {
    width: auto;
  }
  @media (max-width: 1180px) {
    .roles-editor-grid {
      grid-template-columns: 1fr;
    }
    .roles-toolbar-row {
      flex-direction: column;
      align-items: stretch;
    }
    .roles-toolbar-actions {
      align-items: stretch;
      width: 100%;
      flex-wrap: wrap;
    }
    .roles-toolbar-actions > button {
      flex: 1 1 140px;
    }
  }
  @media (max-width: 720px) {
    .roles-page-shell {
      padding: 0 12px;
    }
    .roles-card-grid,
    .roles-legend-grid {
      grid-template-columns: 1fr;
    }
    .roles-search {
      min-width: 0;
      width: 100%;
    }
    .roles-search input {
      width: 100%;
    }
    .roles-toolbar-actions > button,
    .roles-mobile-full {
      width: 100%;
    }
    .roles-toolbar-actions {
      flex-direction: column;
      align-items: stretch;
    }
    .roles-table {
      min-width: 920px;
    }
  }
`;

const inp = { width:'100%', padding:'8px 12px', fontSize:13, borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', outline:'none', fontFamily:'inherit', boxSizing:'border-box' };
const lbl = { display:'block', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-text3)', marginBottom:4 };

/* ── Permission toggle row ─────────────────────────────────────────────── */
function PermToggle({ permKey, label, desc, value, onChange, disabled }) {
    return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--t-border)' }}>
            <div>
                <p style={{ margin:0, fontSize:12, fontWeight:700, color:'var(--t-text)' }}>{label}</p>
                <p style={{ margin:'2px 0 0', fontSize:10, color:'var(--t-text3)' }}>{desc}</p>
            </div>
            <button type="button" onClick={() => !disabled && onChange(permKey, !value)}
                style={{
                    width:44, height:24, borderRadius:12, border:'none', cursor: disabled ? 'not-allowed' : 'pointer',
                    background: value ? '#6366f1' : 'var(--t-border)', transition:'background 0.2s', flexShrink:0,
                    position:'relative', opacity: disabled ? 0.5 : 1,
                }}>
                <span style={{ position:'absolute', top:2, left: value ? 22 : 2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.2s', display:'block' }} />
            </button>
        </div>
    );
}

function SearchIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
        </svg>
    );
}

/* ── Role form ─────────────────────────────────────────────────────────── */
function RoleForm({ role, onDone }) {
    const isEdit = !!role;
    const SYSTEM_CODES = ['SUPER_ADMIN','HOME_OWNER','LEAD_ENGINEER','CONTRACTOR','VIEWER'];
    const isSystem = isEdit && SYSTEM_CODES.includes(role.code);

    const [form, setForm] = useState({
        code:                   role?.code        || '',
        name:                   role?.name        || '',
        ...PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: role?.[p.key] ?? false }), {}),
        can_view_projects:      role?.can_view_projects      ?? true,
        can_view_dashboard:     role?.can_view_dashboard     ?? true,
        can_view_profile:       role?.can_view_profile       ?? true,
        can_view_phases:        role?.can_view_phases        ?? true,
        can_view_structure:     role?.can_view_structure     ?? true,
    });
    const [busy, setBusy] = useState(false);
    const [err,  setErr]  = useState('');
    const [query, setQuery] = useState('');
    const [activeGroup, setActiveGroup] = useState('All');

    const setPerm = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const filteredGroups = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return PERMISSION_GROUPS.map(group => {
            const perms = PERMISSIONS_BY_GROUP[group.key] || [];
            const visible = perms.filter(p => {
                const matchesGroup = activeGroup === 'All' || activeGroup === group.key;
                if (!matchesGroup) return false;
                if (!normalized) return true;
                return [p.label, p.desc, p.key, group.key].some(text => text.toLowerCase().includes(normalized));
            });
            return { ...group, perms: visible, total: perms.length };
        }).filter(group => group.perms.length > 0);
    }, [query, activeGroup]);

    const permissionCount = useMemo(
        () => PERMISSIONS.filter(p => form[p.key]).length,
        [form]
    );
    const totalPermissionCount = PERMISSIONS.length;
    const groupCount = PERMISSION_GROUPS.length;

    const quickSetAll = (value) => {
        setForm(f => {
            const next = { ...f };
            PERMISSIONS.forEach(p => { next[p.key] = value; });
            next.can_manage_all_systems = value;
            if (value) {
                next.can_view_projects = true;
                next.can_view_dashboard = true;
                next.can_view_profile = true;
                next.can_view_phases = true;
                next.can_view_structure = true;
                next.can_view_resources = true;
                next.can_view_workforce = true;
            }
            return next;
        });
    };

    const clearPermissions = () => {
        setForm(f => {
            const next = { ...f };
            PERMISSIONS.forEach(p => { next[p.key] = false; });
            next.can_view_projects = true;
            next.can_view_dashboard = true;
            next.can_view_profile = true;
            next.can_view_phases = true;
            next.can_view_structure = true;
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true); setErr('');
        try {
            if (isEdit) await accountsApi.updateRole(role.id, form);
            else        await accountsApi.createRole(form);
            onDone();
        } catch (ex) {
            setErr(ex?.response?.data?.detail || JSON.stringify(ex?.response?.data) || 'Failed to save role.');
        } finally { setBusy(false); }
    };

    return (
        <form onSubmit={handleSubmit} style={{ padding:24 }} className="space-y-4">
            <style>{PAGE_CSS}</style>
            {err && <div style={{ padding:'8px 12px', borderRadius:8, background:'#ef444412', color:'#ef4444', fontSize:12, fontWeight:600 }}>❌ {err}</div>}

            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '14px 16px', borderRadius: 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)',
            }}>
                <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-text3)' }}>
                        Permission summary
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--t-text2)' }}>
                        {permissionCount} enabled of {totalPermissionCount} permissions across {groupCount} groups
                    </p>
                </div>
                <div className="roles-toolbar-actions">
                    <button type="button" onClick={() => quickSetAll(true)} style={summaryBtnStyle('#10b981')}>Enable all</button>
                    <button type="button" onClick={clearPermissions} style={summaryBtnStyle('#f59e0b')}>Reset</button>
                    <button type="button" onClick={() => quickSetAll(false)} style={summaryBtnStyle('#ef4444')}>Disable all</button>
                </div>
            </div>

            {!isSystem && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                        <label style={lbl}>Role Code <span style={{color:'#ef4444'}}>*</span></label>
                        <input style={inp} required value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase().replace(/\s/g,'_')}))} placeholder="e.g. SITE_MANAGER" disabled={isEdit} />
                    </div>
                    <div>
                        <label style={lbl}>Display Name <span style={{color:'#ef4444'}}>*</span></label>
                        <input style={inp} required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Site Manager" />
                    </div>
                </div>
            )}
            {isSystem && (
                <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', fontSize:12, color:'#f59e0b', fontWeight:600 }}>
                    ⚠️ System role — name and code are fixed. You can only edit permission flags.
                </div>
            )}

            <div className="roles-editor-grid" style={{ display: 'grid', gap: 12 }}>
                <div style={{ padding: 16, borderRadius: 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                        <div>
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-text3)' }}>
                                Permission groups
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--t-text3)' }}>
                                Use the filters to jump to a category.
                            </p>
                        </div>
                        <label className="roles-search" style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                            borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-bg)', minWidth: 220,
                        }}>
                            <SearchIcon />
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search permissions"
                                style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--t-text)', width: '100%', fontSize: 12 }}
                            />
                        </label>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                        <FilterChip active={activeGroup === 'All'} onClick={() => setActiveGroup('All')} label={`All (${PERMISSIONS.length})`} />
                        {PERMISSION_GROUPS.map(group => {
                            const count = (PERMISSIONS_BY_GROUP[group.key] || []).length;
                            return (
                                <FilterChip
                                    key={group.key}
                                    active={activeGroup === group.key}
                                    onClick={() => setActiveGroup(group.key)}
                                    label={`${group.icon} ${group.label} (${count})`}
                                />
                            );
                        })}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                        {filteredGroups.map(group => (
                            <div key={group.key} style={{
                                borderRadius: 14,
                                border: '1px solid var(--t-border)',
                                background: 'var(--t-bg)',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    padding: '12px 14px',
                                    borderBottom: '1px solid var(--t-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--t-text)' }}>
                                            {group.icon} {group.label}
                                        </p>
                                        <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--t-text3)' }}>
                                            {group.hint}
                                        </p>
                                    </div>
                                    <div style={{
                                        padding: '3px 8px',
                                        borderRadius: 999,
                                        fontSize: 10,
                                        fontWeight: 900,
                                        color: '#6366f1',
                                        background: 'color-mix(in srgb, #6366f1 12%, transparent)',
                                        border: '1px solid color-mix(in srgb, #6366f1 24%, transparent)',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {group.perms.length}/{group.total}
                                    </div>
                                </div>
                                <div style={{ padding: '2px 14px 10px' }}>
                                    {group.perms.map(p => (
                                        <PermToggle
                                            key={p.key}
                                            permKey={p.key}
                                            label={p.label}
                                            desc={p.desc}
                                            value={form[p.key]}
                                            onChange={setPerm}
                                            disabled={form.can_manage_all_systems && p.key !== 'can_manage_all_systems'}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                        {filteredGroups.length === 0 && (
                            <div style={{
                                gridColumn: '1 / -1',
                                padding: 24,
                                borderRadius: 14,
                                border: '1px dashed var(--t-border)',
                                color: 'var(--t-text3)',
                                fontSize: 12,
                            }}>
                                No permissions match the current search or group filter.
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ padding: 16, borderRadius: 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)' }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-text3)' }}>
                            Selected role
                        </p>
                        <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 900, color: 'var(--t-text)' }}>{form.name || 'Untitled role'}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--t-text3)', fontFamily: 'monospace' }}>{form.code || 'NO_CODE'}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                            {PERMISSIONS.filter(p => form[p.key]).slice(0, 10).map(p => (
                                <span key={p.key} style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800, color: '#10b981', background: '#10b98114', border: '1px solid #10b98124' }}>
                                    ✓ {p.label}
                                </span>
                            ))}
                            {permissionCount > 10 && (
                                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
                                    +{permissionCount - 10} more
                                </span>
                            )}
                            {permissionCount === 0 && (
                                <span style={{ fontSize: 11, color: 'var(--t-text3)' }}>No permissions enabled</span>
                            )}
                        </div>
                    </div>

                    <div style={{ padding: 16, borderRadius: 14, border: '1px solid var(--t-border)', background: 'var(--t-surface)' }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-text3)' }}>
                            Permission categories
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                            {PERMISSION_GROUPS.map(group => {
                                const groupPerms = PERMISSIONS_BY_GROUP[group.key] || [];
                                const enabled = groupPerms.filter(p => form[p.key]).length;
                                return (
                                    <button
                                        key={group.key}
                                        type="button"
                                        onClick={() => setActiveGroup(group.key)}
                                        style={{
                                            textAlign: 'left',
                                            borderRadius: 12,
                                            border: activeGroup === group.key ? '1px solid #6366f1' : '1px solid var(--t-border)',
                                            background: activeGroup === group.key ? 'color-mix(in srgb, #6366f1 10%, transparent)' : 'var(--t-bg)',
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            color: 'var(--t-text)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 900 }}>{group.icon} {group.label}</div>
                                                <div style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 2 }}>{group.hint}</div>
                                            </div>
                                            <div style={{ fontSize: 11, fontWeight: 900, color: enabled ? '#10b981' : 'var(--t-text3)' }}>
                                                {enabled}/{groupPerms.length}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <button type="submit" disabled={busy}
                style={{ width:'100%', padding:'10px 0', borderRadius:10, background:'#6366f1', color:'#fff', fontSize:13, fontWeight:900, border:'none', cursor:'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Saving…' : isEdit ? '💾 Update Role' : '➕ Create Role'}
            </button>
        </form>
    );
}

function summaryBtnStyle(color) {
    return {
        padding: '7px 10px',
        borderRadius: 10,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        color,
        fontSize: 11,
        fontWeight: 900,
        cursor: 'pointer',
    };
}

function FilterChip({ active, label, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: '7px 10px',
                borderRadius: 999,
                border: active ? '1px solid #6366f1' : '1px solid var(--t-border)',
                background: active ? 'color-mix(in srgb, #6366f1 12%, transparent)' : 'var(--t-bg)',
                color: active ? '#6366f1' : 'var(--t-text3)',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
            }}
        >
            {label}
        </button>
    );
}

/* ── Role card ─────────────────────────────────────────────────────────── */
function RoleCard({ role, onEdit, onDelete }) {
    const color = ROLE_COLORS[role.code] || '#6366f1';
    const grouped = PERMISSION_GROUPS.map(group => ({
        ...group,
        perms: (PERMISSIONS_BY_GROUP[group.key] || []).filter(p => role[p.key]),
    })).filter(group => group.perms.length > 0);
    const SYSTEM_CODES = ['SUPER_ADMIN','HOME_OWNER','LEAD_ENGINEER','CONTRACTOR','VIEWER'];
    const isSystem = SYSTEM_CODES.includes(role.code);

    return (
        <div style={{ borderRadius:14, border:'1px solid var(--t-border)', background:'var(--t-surface)', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--t-border)', background:`${color}08`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:`${color}18`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🛡️</div>
                    <div>
                        <p style={{ margin:0, fontSize:14, fontWeight:900, color:'var(--t-text)' }}>{role.name}</p>
                        <p style={{ margin:'2px 0 0', fontSize:10, fontWeight:700, color:'var(--t-text3)', fontFamily:'monospace' }}>{role.code}</p>
                    </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                    <div style={{ padding:'3px 10px', borderRadius:6, background:`${color}18`, color, fontSize:11, fontWeight:900 }}>
                        {role.user_count ?? 0} user{(role.user_count ?? 0) !== 1 ? 's' : ''}
                    </div>
                    {isSystem && <Badge label="System" color="#6b7280" />}
                </div>
            </div>

            {/* Permissions */}
            <div style={{ padding:'12px 18px' }}>
                {grouped.length === 0 ? (
                    <p style={{ fontSize:11, color:'var(--t-text3)', fontStyle:'italic' }}>No permissions granted</p>
                ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {grouped.map(group => (
                            <div key={group.key} style={{ padding:'10px 12px', borderRadius:10, background:'var(--t-bg)', border:'1px solid var(--t-border)' }}>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                                    <div style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-text3)' }}>
                                        {group.icon} {group.label}
                                    </div>
                                    <div style={{ fontSize:10, fontWeight:900, color }}>
                                        {group.perms.length}
                                    </div>
                                </div>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                    {group.perms.slice(0, 3).map(p => (
                                        <span key={p.key} style={{ padding:'2px 8px', borderRadius:6, background:`${color}12`, color, fontSize:10, fontWeight:700, border:`1px solid ${color}20` }}>
                                            ✓ {p.label}
                                        </span>
                                    ))}
                                    {group.perms.length > 3 && (
                                        <span style={{ padding:'2px 8px', borderRadius:6, background:'var(--t-bg)', color:'var(--t-text3)', fontSize:10, fontWeight:700, border:'1px solid var(--t-border)' }}>
                                            +{group.perms.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div style={{ padding:'10px 18px', borderTop:'1px solid var(--t-border)', display:'flex', gap:8 }}>
                <button onClick={() => onEdit(role)}
                    style={{ flex:1, padding:'7px 0', borderRadius:8, background:`${color}12`, color, fontSize:11, fontWeight:900, border:`1px solid ${color}25`, cursor:'pointer' }}>
                    ✏️ Edit Permissions
                </button>
                {!isSystem && (
                    <button onClick={() => onDelete(role)}
                        style={{ padding:'7px 14px', borderRadius:8, background:'rgba(239,68,68,0.08)', color:'#ef4444', fontSize:11, fontWeight:900, border:'1px solid rgba(239,68,68,0.2)', cursor:'pointer' }}>
                        🗑️
                    </button>
                )}
            </div>
        </div>
    );
}

function RoleTable({ roles, onEdit, onDelete }) {
    const getEnabledGroups = (role) =>
        PERMISSION_GROUPS.map(group => ({
            ...group,
            count: (PERMISSIONS_BY_GROUP[group.key] || []).filter(p => role[p.key]).length,
        })).filter(group => group.count > 0);

    return (
        <div className="roles-table-wrap" style={{ borderRadius: 16, border: '1px solid var(--t-border)', background: 'var(--t-surface)', overflow: 'hidden' }}>
            <div className="roles-table-head">
                <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-text3)' }}>
                        Roles table
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--t-text3)' }}>
                        Clean summary view for quickly reviewing access.
                    </p>
                </div>
                <div className="roles-table-stats">
                    <div className="roles-table-stat">
                        <div className="roles-table-stat-label">Roles</div>
                        <div className="roles-table-stat-value">{roles.length}</div>
                    </div>
                    <div className="roles-table-stat">
                        <div className="roles-table-stat-label">System</div>
                        <div className="roles-table-stat-value">{roles.filter(role => ['SUPER_ADMIN','HOME_OWNER','LEAD_ENGINEER','CONTRACTOR','VIEWER'].includes(role.code)).length}</div>
                    </div>
                    <div className="roles-table-stat">
                        <div className="roles-table-stat-label">Custom</div>
                        <div className="roles-table-stat-value">{roles.filter(role => !['SUPER_ADMIN','HOME_OWNER','LEAD_ENGINEER','CONTRACTOR','VIEWER'].includes(role.code)).length}</div>
                    </div>
                    <div className="roles-table-stat">
                        <div className="roles-table-stat-label">Access</div>
                        <div className="roles-table-stat-value">{Math.round((roles.reduce((sum, role) => sum + PERMISSIONS.filter(p => role[p.key]).length, 0) / Math.max(roles.length, 1)) * 10) / 10}</div>
                    </div>
                </div>
            </div>
            <table className="roles-table">
                <thead>
                    <tr>
                        <th style={{ width: '22%' }}>Role</th>
                        <th style={{ width: '18%' }}>Access</th>
                        <th style={{ width: '32%' }}>Groups</th>
                        <th style={{ width: '16%' }}>Status</th>
                        <th style={{ width: '12%' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {roles.map(role => {
                        const color = ROLE_COLORS[role.code] || '#6366f1';
                        const groups = getEnabledGroups(role);
                        const enabledPerms = PERMISSIONS.filter(p => role[p.key]);
                        const totalPerms = PERMISSIONS.length;
                        const pct = Math.max(4, Math.round((enabledPerms.length / totalPerms) * 100));
                        const SYSTEM_CODES = ['SUPER_ADMIN','HOME_OWNER','LEAD_ENGINEER','CONTRACTOR','VIEWER'];
                        const isSystem = SYSTEM_CODES.includes(role.code);

                        return (
                            <tr key={role.id} className="roles-table-row">
                                <td>
                                    <div className="roles-role-name">
                                        <div style={{ width:38, height:38, borderRadius:10, background:`${color}18`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🛡️</div>
                                        <div className="roles-role-meta">
                                            <p style={{ margin:0, fontSize:13, fontWeight:900, color:'var(--t-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                                {role.name}
                                            </p>
                                            <p style={{ margin:'2px 0 0', fontSize:10, fontWeight:700, color:'var(--t-text3)', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                                {role.code}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8 }}>
                                        <div style={{ fontSize: 13, fontWeight: 900, color:'var(--t-text)' }}>
                                            {enabledPerms.length}
                                        </div>
                                        <div style={{ fontSize: 10, color:'var(--t-text3)' }}>
                                            of {totalPerms}
                                        </div>
                                    </div>
                                    <div className="roles-mini-bar" aria-hidden="true">
                                        <span style={{ width: `${pct}%` }} />
                                    </div>
                                </td>
                                <td>
                                    <div className="roles-chip-list">
                                        {groups.slice(0, 4).map(group => (
                                            <span key={group.key} style={{
                                                padding:'4px 8px', borderRadius:999, background:`${color}12`, color,
                                                fontSize:10, fontWeight:800, border:`1px solid ${color}20`, whiteSpace:'nowrap',
                                            }}>
                                                {group.icon} {group.label}
                                            </span>
                                        ))}
                                        {groups.length > 4 && (
                                            <span style={{
                                                padding:'4px 8px', borderRadius:999, background:'var(--t-bg)', color:'var(--t-text3)',
                                                fontSize:10, fontWeight:800, border:'1px solid var(--t-border)', whiteSpace:'nowrap',
                                            }}>
                                                +{groups.length - 4} more
                                            </span>
                                        )}
                                        {groups.length === 0 && (
                                            <span style={{ fontSize: 11, color:'var(--t-text3)' }}>No groups enabled</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                                            <div style={{ fontSize: 12, fontWeight: 900, color }}>
                                                {role.user_count ?? 0}
                                            </div>
                                            <div style={{ fontSize: 10, color:'var(--t-text3)' }}>
                                                user{(role.user_count ?? 0) !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                                            {isSystem && <Badge label="System" color="#6b7280" />}
                                            <span style={{
                                                padding:'3px 8px', borderRadius:999, fontSize:10, fontWeight:800,
                                                color: isSystem ? '#ef4444' : '#10b981',
                                                background: isSystem ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                                                border:`1px solid ${isSystem ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}`,
                                            }}>
                                                {isSystem ? 'Fixed' : 'Custom'}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display:'flex', gap:8, alignItems:'center', justifyContent:'flex-start' }}>
                                        <button onClick={() => onEdit(role)}
                                            title="Edit role"
                                            style={{ width:34, height:34, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:10, background:`${color}12`, color, fontSize:14, fontWeight:900, border:`1px solid ${color}25`, cursor:'pointer' }}>
                                            ✏️
                                        </button>
                                        {!isSystem && (
                                            <button onClick={() => onDelete(role)}
                                                title="Delete role"
                                                style={{ width:34, height:34, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:10, background:'rgba(239,68,68,0.08)', color:'#ef4444', fontSize:14, fontWeight:900, border:'1px solid rgba(239,68,68,0.2)', cursor:'pointer' }}>
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {roles.length === 0 && (
                        <tr>
                            <td colSpan={5} style={{ padding: 24, color: 'var(--t-text3)', textAlign: 'center' }}>
                                No roles yet
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function RolesPage() {
    const { roles, loading, refreshRoles, refreshUsers } = useAccounts();
    const [showCreate, setShowCreate] = useState(false);
    const [editing,    setEditing]    = useState(null);
    const [confirmDel, setConfirmDel] = useState(null);
    const [delBusy,    setDelBusy]    = useState(false);
    const [delErr,     setDelErr]     = useState('');

    const handleDelete = async (role) => {
        setDelBusy(true); setDelErr('');
        try {
            await accountsApi.deleteRole(role.id);
            await refreshRoles();
            setConfirmDel(null);
        } catch (ex) {
            setDelErr(ex?.response?.data?.error || ex?.response?.data?.detail || 'Cannot delete this role.');
        } finally { setDelBusy(false); }
    };

    const roleGroups = useMemo(() => PERMISSION_GROUPS, []);

    return (
        <div className="roles-page-shell" style={{ width: '100%', margin: '0 auto' }}>

            {/* Toolbar */}
            <div className="roles-toolbar-row" style={{
                display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16,
                marginBottom:20, padding:18, borderRadius:16, border:'1px solid var(--t-border)', background:'var(--t-surface)',
            }}>
                <div style={{ minWidth:0 }}>
                    <p style={{ margin:0, fontSize:22, fontWeight:900, color:'var(--t-text)' }}>Roles & Permissions</p>
                    <p style={{ margin:'6px 0 0', fontSize:12, color:'var(--t-text3)', maxWidth:720 }}>
                        Permissions are grouped by module so admins can find the right control quickly.
                    </p>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:12 }}>
                        {roleGroups.map(group => (
                            <span key={group.key} style={{
                                padding:'5px 10px', borderRadius:999, border:'1px solid var(--t-border)',
                                background:'var(--t-bg)', color:'var(--t-text3)', fontSize:11, fontWeight:800,
                            }}>
                                {group.icon} {group.label}
                            </span>
                        ))}
                    </div>
                </div>
                <button onClick={() => setShowCreate(true)} className="roles-mobile-full"
                    style={{ padding:'10px 18px', borderRadius:12, background:'#6366f1', color:'#fff', fontSize:12, fontWeight:900, border:'none', cursor:'pointer', flexShrink:0 }}>
                    ➕ New Role
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign:'center', padding:60 }}><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" /></div>
            ) : (
                <RoleTable
                    roles={roles}
                    onEdit={r => setEditing(r)}
                    onDelete={r => setConfirmDel(r)}
                />
            )}

            {/* Permissions legend */}
            <div style={{ marginTop:24, padding:20, borderRadius:16, border:'1px solid var(--t-border)', background:'var(--t-surface)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:12 }}>
                    <div>
                        <p style={{ margin:0, fontSize:11, fontWeight:900, color:'var(--t-text3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>📖 Permission reference</p>
                        <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--t-text3)' }}>All permissions grouped by area.</p>
                    </div>
                </div>
                <div className="roles-legend-grid" style={{ display:'grid', gap:12 }}>
                    {PERMISSION_GROUPS.map(group => (
                        <div key={group.key} style={{ padding:14, borderRadius:12, border:'1px solid var(--t-border)', background:'var(--t-bg)' }}>
                            <p style={{ margin:0, fontSize:12, fontWeight:900, color:'var(--t-text)' }}>{group.icon} {group.label}</p>
                            <p style={{ margin:'4px 0 10px', fontSize:10, color:'var(--t-text3)' }}>{group.hint}</p>
                            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                                {(PERMISSIONS_BY_GROUP[group.key] || []).map(p => (
                                    <div key={p.key} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                                        <span style={{ width:8, height:8, borderRadius:2, background:'#6366f1', marginTop:4, flexShrink:0 }} />
                                        <div>
                                            <p style={{ margin:0, fontSize:11, fontWeight:700, color:'var(--t-text)' }}>{p.label}</p>
                                            <p style={{ margin:'1px 0 0', fontSize:10, color:'var(--t-text3)' }}>{p.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create modal */}
            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Role" maxWidth="max-w-5xl">
                <RoleForm onDone={() => { setShowCreate(false); refreshRoles(); }} />
            </Modal>

            {/* Edit modal */}
            <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={`Edit Role — ${editing?.name}`} maxWidth="max-w-5xl">
                {editing && <RoleForm role={editing} onDone={() => { setEditing(null); refreshRoles(); refreshUsers(); }} />}
            </Modal>

            {/* Confirm delete */}
            <Modal isOpen={!!confirmDel} onClose={() => { setConfirmDel(null); setDelErr(''); }} title="Delete Role?" maxWidth="max-w-sm">
                {confirmDel && (
                    <div style={{ padding:24 }}>
                        {delErr && <div style={{ marginBottom:12, padding:'8px 12px', borderRadius:8, background:'#ef444412', color:'#ef4444', fontSize:12 }}>❌ {delErr}</div>}
                        <p style={{ margin:'0 0 6px', fontSize:14, fontWeight:700, color:'var(--t-text)' }}>Delete <strong>{confirmDel.name}</strong>?</p>
                        <p style={{ margin:'0 0 20px', fontSize:12, color:'var(--t-text3)' }}>Users assigned this role will lose their permissions.</p>
                        <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => { setConfirmDel(null); setDelErr(''); }} style={{ flex:1, padding:'9px 0', borderRadius:10, border:'1px solid var(--t-border)', background:'var(--t-bg)', color:'var(--t-text)', fontSize:12, fontWeight:700, cursor:'pointer' }}>Cancel</button>
                            <button onClick={() => handleDelete(confirmDel)} disabled={delBusy}
                                style={{ flex:1, padding:'9px 0', borderRadius:10, background:'#ef4444', color:'#fff', fontSize:12, fontWeight:900, border:'none', cursor:'pointer' }}>
                                {delBusy ? 'Deleting…' : '🗑️ Delete'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
