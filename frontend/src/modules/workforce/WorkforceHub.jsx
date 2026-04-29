/**
 * WorkforceHub.jsx
 * ─────────────────
 * Main entry-point for the Workforce Management module.
 * Tabs: Members | Payroll | Assignments | Evaluations | Safety
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import workforceService from '../../services/workforceService';
import IDCardModal from './components/IDCardModal';

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

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
    { id: 'members',     label: 'Members',     icon: '👷', short: 'Members'  },
    { id: 'payroll',     label: 'Payroll',     icon: '💰', short: 'Payroll'  },
    { id: 'assignments', label: 'Assignments', icon: '📌', short: 'Assign'   },
    { id: 'evaluations', label: 'Evaluations', icon: '⭐', short: 'Evals'    },
    { id: 'safety',      label: 'Safety',      icon: '🦺', short: 'Safety'   },
];

// ── Reusable helpers ──────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
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

const TypeBadge = ({ type }) => {
    const map = {
        LABOUR:        '#dbeafe',
        STAFF:         '#ede9fe',
        SUBCONTRACTOR: '#fef3c7',
        FREELANCE:     '#d1fae5',
    };
    return (
        <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 99,
            fontSize: 11, fontWeight: 600,
            background: map[type] || '#f3f4f6',
            color: '#374151',
        }}>{type}</span>
    );
};

const Spinner = () => (
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

const EmptyState = ({ icon, title, subtitle }) => (
    <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--t-text-muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--t-text)', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13 }}>{subtitle}</div>
    </div>
);

// ── Summary Stats Bar ─────────────────────────────────────────────────────────
function StatsBar({ stats }) {
    if (!stats) return null;
    const cards = [
        { label: 'Total', value: stats.total,    color: 'var(--t-primary)' },
        { label: 'Active', value: stats.active,   color: '#10b981' },
        { label: 'On Leave', value: stats.on_leave, color: '#f59e0b' },
        { label: 'Staff', value: stats.staff,    color: '#6366f1' },
        { label: 'Labour', value: stats.labour,   color: '#0ea5e9' },
        { label: 'Linked', value: stats.linked,   color: '#14b8a6' },
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

// ═══════════════════════════════════════════════════════════════════
// TAB: MEMBERS
// ═══════════════════════════════════════════════════════════════════
// ── Today's attendance status dot ────────────────────────────────────────────
const TODAY_COLORS = {
    PRESENT:    { bg: '#22c55e', label: 'Present' },
    HALF_DAY:   { bg: '#f59e0b', label: 'Half Day' },
    ABSENT:     { bg: '#ef4444', label: 'Absent' },
    LEAVE:      { bg: '#6366f1', label: 'Leave' },
    HOLIDAY:    { bg: '#06b6d4', label: 'Holiday' },
    NOT_MARKED: { bg: '#d1d5db', label: '—' },
};

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

function MembersTab({ projectId }) {
    const [members, setMembers] = useState([]);
    const [stats, setStats]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch]   = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter]     = useState('');
    const [selected, setSelected]   = useState(null);
    const [showForm, setShowForm]   = useState(false);
    const [formData, setFormData]   = useState({});
    const [saving, setSaving]       = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [error, setError]         = useState('');
    const [showIDCard, setShowIDCard] = useState(false);
    const [idCardMemberId, setIdCardMemberId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = {};
            if (projectId)    params.current_project = projectId;
            if (statusFilter) params.status          = statusFilter;
            if (typeFilter)   params.worker_type     = typeFilter;
            if (search)       params.search          = search;

            const [m, s] = await Promise.all([
                workforceService.getMembers(params),
                workforceService.getSummaryStats(projectId),
            ]);
            setMembers(Array.isArray(m) ? m : (m.results || []));
            setStats(s);
        } catch (e) {
            setError('Failed to load workforce members.');
        } finally { setLoading(false); }
    }, [projectId, statusFilter, typeFilter, search]);

    useEffect(() => { load(); }, [load]);

    const openNew  = () => { setFormData({ join_date: new Date().toISOString().slice(0, 10) }); setShowForm(true); setSelected(null); };
    const openEdit = m  => { setFormData({ ...m }); setShowForm(true); setSelected(m); };

    const handleSave = async () => {
        setSaving(true); setError('');
        try {
            if (selected) {
                await workforceService.updateMember(selected.id, formData);
            } else {
                await workforceService.createMember(formData);
            }
            setShowForm(false);
            load();
        } catch (e) {
            setError(e?.response?.data?.detail || JSON.stringify(e?.response?.data) || 'Save failed.');
        } finally { setSaving(false); }
    };

    // Import all unlinked AttendanceWorkers as WorkforceMembers
    const handleImport = async (dryRun = false) => {
        setImporting(true); setError(''); setImportResult(null);
        try {
            const body = { dry_run: dryRun };
            if (projectId) body.project = projectId;
            const result = await workforceService.seedFromAttendance(body);
            setImportResult(result);
            if (!dryRun) load();
        } catch (e) {
            setError(e?.response?.data?.detail || 'Import failed.');
        } finally { setImporting(false); }
    };

    return (
        <div>
            <StatsBar stats={stats} />

            {/* Import from Attendance banner */}
            {stats && stats.unlinked > 0 && !importResult && (
                <div style={{
                    background: '#fffbeb', border: '1px solid #fcd34d',
                    borderRadius: 10, padding: '12px 16px', marginBottom: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                }}>
                    <div>
                        <strong style={{ fontSize: 13 }}>👷 {stats.unlinked} attendance worker{stats.unlinked !== 1 ? 's' : ''} not yet in Workforce</strong>
                        <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>
                            Import them to create full profiles with payroll, skills and documents.
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleImport(true)} disabled={importing}
                            style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #fcd34d', background: '#fff', color: '#92400e', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Preview
                        </button>
                        <button onClick={() => handleImport(false)} disabled={importing}
                            style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            {importing ? 'Importing…' : '⬆ Import All'}
                        </button>
                    </div>
                </div>
            )}

            {/* Import result */}
            {importResult && (
                <div style={{
                    background: '#f0fdf4', border: '1px solid #86efac',
                    borderRadius: 10, padding: '12px 16px', marginBottom: 14,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
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
                    <button onClick={() => { setImportResult(null); if (!importResult.dry_run) load(); }}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #86efac', background: 'transparent', cursor: 'pointer', fontSize: 12 }}>
                        Dismiss
                    </button>
                </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search name / ID / phone…"
                    style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13 }}
                />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13 }}>
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="TERMINATED">Terminated</option>
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13 }}>
                    <option value="">All Types</option>
                    <option value="LABOUR">Labour</option>
                    <option value="STAFF">Staff</option>
                    <option value="SUBCONTRACTOR">Subcontractor</option>
                    <option value="FREELANCE">Freelance</option>
                </select>
                <button onClick={openNew} style={{
                    padding: '8px 16px', borderRadius: 8, border: 'none',
                    background: 'var(--t-primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13,
                }}>+ Add Member</button>
            </div>

            {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</div>}

            {loading ? <Spinner /> : members.length === 0 ? (
                <EmptyState icon="👷" title="No members found" subtitle="Add your first workforce member to get started." />
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--t-border)', color: 'var(--t-text-muted)', textAlign: 'left' }}>
                                <th style={{ padding: '8px 10px' }}>ID</th>
                                <th style={{ padding: '8px 10px' }}>Name</th>
                                <th style={{ padding: '8px 10px' }}>Role / Trade</th>
                                <th style={{ padding: '8px 10px' }}>Type</th>
                                <th style={{ padding: '8px 10px' }}>Status</th>
                                <th style={{ padding: '8px 10px' }}>Today</th>
                                <th style={{ padding: '8px 10px' }}>Rate/day</th>
                                <th style={{ padding: '8px 10px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(m => (
                                <tr key={m.id} style={{ borderBottom: '1px solid var(--t-border)' }}>
                                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11, color: 'var(--t-text-muted)' }}>{m.employee_id}</td>
                                    <td style={{ padding: '8px 10px' }}>
                                        <div style={{ fontWeight: 600 }}>{m.full_name || '—'}</div>
                                        <div style={{ fontSize: 11, color: 'var(--t-text-muted)' }}>{m.project_name || ''}</div>
                                    </td>
                                    <td style={{ padding: '8px 10px', color: 'var(--t-text-muted)', fontSize: 12 }}>{m.role_name || '—'}</td>
                                    <td style={{ padding: '8px 10px' }}><TypeBadge type={m.worker_type} /></td>
                                    <td style={{ padding: '8px 10px' }}><StatusBadge status={m.status} /></td>
                                    <td style={{ padding: '8px 10px' }}>
                                        <TodayDot
                                            status={m.today_status || 'NOT_MARKED'}
                                            checkIn={m.today_check_in}
                                            checkOut={m.today_check_out}
                                        />
                                    </td>
                                    <td style={{ padding: '8px 10px', fontSize: 12 }}>
                                        {m.daily_rate ? `NPR ${Number(m.daily_rate).toLocaleString()}` : <span style={{ color: '#d1d5db' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '8px 10px', display: 'flex', gap: 6 }}>
                                        <button onClick={() => openEdit(m)} style={{
                                            padding: '4px 10px', borderRadius: 6, border: '1px solid var(--t-border)',
                                            background: 'transparent', color: 'var(--t-text)', cursor: 'pointer', fontSize: 12,
                                        }}>Edit</button>
                                        <button 
                                            onClick={() => {
                                                setIdCardMemberId(m.id);
                                                setShowIDCard(true);
                                            }}
                                            style={{
                                                padding: '4px 10px', borderRadius: 6, 
                                                border: '1px solid #3b82f6', // Bright blue border
                                                background: '#eff6ff', // Light blue background
                                                color: '#1d4ed8', // Dark blue text
                                                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                                display: 'flex', alignItems: 'center', gap: 4,
                                                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)'
                                            }}
                                            title="View Worker ID Card"
                                        >
                                            🪪 ID Card
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add / Edit Modal */}
            {showForm && (
                <MemberFormModal
                    data={formData}
                    onChange={setFormData}
                    onSave={handleSave}
                    onClose={() => setShowForm(false)}
                    saving={saving}
                    error={error}
                    isEdit={!!selected}
                />
            )}

            {showIDCard && idCardMemberId && (
                <IDCardModal 
                    badgeUrl={workforceService.getBadgeUrl(idCardMemberId)} 
                    onClose={() => setShowIDCard(false)} 
                />
            )}
        </div>
    );
}

// ── Member Form Modal ─────────────────────────────────────────────────────────
function MemberFormModal({ data, onChange, onSave, onClose, saving, error, isEdit }) {
    const set = (k, v) => onChange(prev => ({ ...prev, [k]: v }));
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                background: 'var(--t-bg)', borderRadius: 16, padding: 28,
                width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>
                    {isEdit ? `Edit Member: ${data.employee_id}` : 'Add Workforce Member'}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[
                        { label: 'First Name *', key: '_first_name', type: 'text' },
                        { label: 'Last Name *',  key: '_last_name',  type: 'text' },
                        { label: 'Phone',        key: '_phone',      type: 'tel'  },
                        { label: 'Email',        key: '_email',      type: 'email'},
                        { label: 'Join Date *',  key: 'join_date',   type: 'date' },
                        { label: 'End Date',     key: 'end_date',    type: 'date' },
                    ].map(f => (
                        <div key={f.key}>
                            <label style={{ fontSize: 12, color: 'var(--t-text-muted)', fontWeight: 600 }}>{f.label}</label>
                            <input
                                type={f.type}
                                value={data[f.key] || ''}
                                onChange={e => set(f.key, e.target.value)}
                                style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13, boxSizing: 'border-box' }}
                            />
                        </div>
                    ))}

                    <div>
                        <label style={{ fontSize: 12, color: 'var(--t-text-muted)', fontWeight: 600 }}>Worker Type *</label>
                        <select value={data.worker_type || 'LABOUR'} onChange={e => set('worker_type', e.target.value)}
                            style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13 }}>
                            <option value="LABOUR">Labour</option>
                            <option value="STAFF">Staff</option>
                            <option value="SUBCONTRACTOR">Subcontractor</option>
                            <option value="FREELANCE">Freelance</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 12, color: 'var(--t-text-muted)', fontWeight: 600 }}>Status</label>
                        <select value={data.status || 'ACTIVE'} onChange={e => set('status', e.target.value)}
                            style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13 }}>
                            <option value="ACTIVE">Active</option>
                            <option value="ON_LEAVE">On Leave</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="SUSPENDED">Suspended</option>
                            <option value="TERMINATED">Terminated</option>
                        </select>
                    </div>
                </div>

                <div style={{ marginTop: 14 }}>
                    <label style={{ fontSize: 12, color: 'var(--t-text-muted)', fontWeight: 600 }}>Address</label>
                    <textarea value={data.address || ''} onChange={e => set('address', e.target.value)} rows={2}
                        style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>

                {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 10 }}>{error}</div>}

                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'transparent', color: 'var(--t-text)', cursor: 'pointer', fontSize: 13 }}>
                        Cancel
                    </button>
                    <button onClick={onSave} disabled={saving} style={{
                        padding: '8px 20px', borderRadius: 8, border: 'none',
                        background: saving ? '#9ca3af' : 'var(--t-primary)',
                        color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13,
                    }}>
                        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Member'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// TAB: PAYROLL
// ═══════════════════════════════════════════════════════════════════
function PayrollTab({ projectId }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = projectId ? { project: projectId } : {};
            const data = await workforceService.getPayrollRecords(params);
            setRecords(Array.isArray(data) ? data : (data.results || []));
        } catch {
            setError('Failed to load payroll records.');
        } finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const statusColors = {
        draft:    { bg: '#f3f4f6', color: '#6b7280' },
        approved: { bg: '#dbeafe', color: '#1e40af' },
        paid:     { bg: '#d1fae5', color: '#065f46' },
        void:     { bg: '#fee2e2', color: '#991b1b' },
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: 'var(--t-text-muted)' }}>
                    Payroll records are generated from attendance data via the workforce member's linked QR worker.
                </div>
            </div>

            {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</div>}

            {loading ? <Spinner /> : records.length === 0 ? (
                <EmptyState icon="💰" title="No payroll records" subtitle="Payroll records are created per worker per pay period." />
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--t-border)', color: 'var(--t-text-muted)', textAlign: 'left' }}>
                                <th style={{ padding: '8px 10px' }}>Worker</th>
                                <th style={{ padding: '8px 10px' }}>Period</th>
                                <th style={{ padding: '8px 10px' }}>Days</th>
                                <th style={{ padding: '8px 10px' }}>Base Pay</th>
                                <th style={{ padding: '8px 10px' }}>OT Pay</th>
                                <th style={{ padding: '8px 10px' }}>Deductions</th>
                                <th style={{ padding: '8px 10px' }}>Net Pay</th>
                                <th style={{ padding: '8px 10px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(r => {
                                const sc = statusColors[r.status] || statusColors.draft;
                                return (
                                    <tr key={r.id} style={{ borderBottom: '1px solid var(--t-border)' }}>
                                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.worker_name || r.worker}</td>
                                        <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--t-text-muted)' }}>{r.period_start} → {r.period_end}</td>
                                        <td style={{ padding: '8px 10px' }}>{r.total_days_present}</td>
                                        <td style={{ padding: '8px 10px' }}>NPR {Number(r.base_pay).toLocaleString()}</td>
                                        <td style={{ padding: '8px 10px' }}>NPR {Number(r.overtime_pay).toLocaleString()}</td>
                                        <td style={{ padding: '8px 10px', color: '#ef4444' }}>
                                            NPR {(Number(r.deduction_tax || 0) + Number(r.deduction_advance || 0) + Number(r.deduction_other || 0)).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--t-primary)' }}>NPR {Number(r.net_pay).toLocaleString()}</td>
                                        <td style={{ padding: '8px 10px' }}>
                                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                                                {r.status?.toUpperCase()}
                                            </span>
                                        </td>
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
                                <th style={{ padding: '8px 10px' }}>Project</th>
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
                                    <td style={{ padding: '8px 10px', color: 'var(--t-text-muted)' }}>{a.project_name || a.project}</td>
                                    <td style={{ padding: '8px 10px', fontSize: 12 }}>{a.start_date}</td>
                                    <td style={{ padding: '8px 10px', fontSize: 12 }}>{a.end_date || '—'}</td>
                                    <td style={{ padding: '8px 10px' }}>{a.estimated_days ?? '—'}</td>
                                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{a.actual_days ?? '—'}</td>
                                    <td style={{ padding: '8px 10px' }}>
                                        <span style={{
                                            display: 'inline-block', padding: '2px 8px', borderRadius: 99,
                                            fontSize: 11, fontWeight: 700,
                                            background: statusColors[a.status] || '#f3f4f6', color: '#374151',
                                        }}>{a.status?.replace('_', ' ').toUpperCase()}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
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
                            <div key={e.id} style={{
                                background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                                borderRadius: 12, padding: 16,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{e.worker_name || e.worker}</div>
                                        <div style={{ fontSize: 11, color: 'var(--t-text-muted)' }}>{e.eval_date} · {e.project_name || ''}</div>
                                    </div>
                                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: rc.bg, color: rc.color }}>
                                        {rc.label}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                                    <StarRow label="Quality"      score={e.score_quality} />
                                    <StarRow label="Punctuality"  score={e.score_punctuality} />
                                    <StarRow label="Safety"       score={e.score_safety} />
                                    <StarRow label="Teamwork"     score={e.score_teamwork} />
                                    <StarRow label="Skill"        score={e.score_skill} />
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
                            <div key={s.id} style={{
                                background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                                borderRadius: 10, padding: '12px 16px',
                                borderLeft: `4px solid ${sc.color}`,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ fontWeight: 700 }}>{s.worker_name || s.worker}</div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                                            {s.severity?.toUpperCase()}
                                        </span>
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
    const [activeTab, setActiveTab] = useState('members');

    const renderTab = () => {
        switch (activeTab) {
            case 'members':     return <MembersTab     projectId={activeProjectId} />;
            case 'payroll':     return <PayrollTab     projectId={activeProjectId} />;
            case 'assignments': return <AssignmentsTab projectId={activeProjectId} />;
            case 'evaluations': return <EvaluationsTab projectId={activeProjectId} />;
            case 'safety':      return <SafetyTab      projectId={activeProjectId} />;
            default:            return null;
        }
    };

    // Desktop layout
    if (!isMobile) {
        return (
            <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: 20 }}>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Workforce Management</h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--t-text-muted)', fontSize: 13 }}>
                        Manage members, payroll, assignments, evaluations and safety records.
                    </p>
                </div>

                {/* Tab Bar */}
                <div style={{
                    display: 'flex', gap: 4, marginBottom: 24,
                    borderBottom: '2px solid var(--t-border)', paddingBottom: 0,
                }}>
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

                {/* Content */}
                <div style={{
                    background: 'var(--t-surface)',
                    border: '1px solid var(--t-border)',
                    borderRadius: 14, padding: 24,
                }}>
                    {renderTab()}
                </div>
            </div>
        );
    }

    // Mobile layout
    return (
        <div style={{ paddingBottom: 70 }}>
            {/* Mobile Header */}
            <div style={{ padding: '16px 16px 0', background: 'var(--t-bg)' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Workforce</h2>
            </div>

            {/* Content */}
            <div style={{ padding: 16 }}>
                {renderTab()}
            </div>

            {/* Mobile Bottom Tab Bar */}
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
        </div>
    );
}
