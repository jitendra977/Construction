import React, { useState, useEffect, useCallback } from 'react';
import attendanceService from '../../services/attendanceService';
import WorkerHistoryModal from './WorkerHistoryModal';

const ROLE_COLORS = {
    OWNER: '#f97316', MANAGER: '#f97316', ENGINEER: '#3b82f6',
    SUPERVISOR: '#8b5cf6', CONTRACTOR: '#10b981', VIEWER: '#64748b',
};

const TRADES = [
    'MASON','HELPER','CARPENTER','ELECTRICIAN','PLUMBER','PAINTER',
    'STEEL_FIXER','SUPERVISOR','TILE_SETTER','EXCAVATOR','WATERPROOF',
    'DRIVER','SECURITY','ENGINEER','ACCOUNTANT','MANAGER','OTHER',
];
const TRADE_LABELS = {
    MASON:'Mason (Dakarmi)', HELPER:'Helper (Jugi)', CARPENTER:'Carpenter (Mistri)',
    ELECTRICIAN:'Electrician', PLUMBER:'Plumber', PAINTER:'Painter',
    STEEL_FIXER:'Steel Fixer (Lohari)', SUPERVISOR:'Site Supervisor',
    TILE_SETTER:'Tile Setter', EXCAVATOR:'Excavator Operator',
    WATERPROOF:'Waterproofing Applicator', DRIVER:'Driver',
    SECURITY:'Security Guard', ENGINEER:'Engineer',
    ACCOUNTANT:'Accountant', MANAGER:'Project Manager', OTHER:'Other',
};

const EMPTY_FORM = {
    name: '', trade: 'MASON', worker_type: 'LABOUR',
    daily_rate: '', overtime_rate_per_hour: '', phone: '', joined_date: '', notes: '',
};

export default function WorkersTab({ projectId }) {
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing]   = useState(null);
    const [form, setForm]         = useState(EMPTY_FORM);
    const [saving, setSaving]     = useState(false);
    const [filter, setFilter]       = useState('ALL'); // ALL | LABOUR | STAFF
    const [showImport, setShowImport] = useState(false);
    const [unlinked, setUnlinked]   = useState([]);
    const [importRates, setImportRates] = useState({}); // memberId → daily_rate
    const [importing, setImporting] = useState(null);
    const [selectedHistoryWorker, setSelectedHistoryWorker] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const data = await attendanceService.getWorkers({ project: projectId });
            setWorkers(Array.isArray(data) ? data : data.results || []);
        } catch { setError('Failed to load workers.'); }
        finally   { setLoading(false); }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const deleteWorker = async (id) => {
        if (!window.confirm('Are you sure you want to delete this worker? This will also delete their attendance records.')) return;
        try {
            await attendanceService.deleteWorker(id);
            load();
        } catch { setError('Failed to delete worker.'); }
    };

    const openImport = async () => {
        const data = await attendanceService.getUnlinkedTeamMembers(projectId);
        const list = Array.isArray(data) ? data : [];
        setUnlinked(list);
        const rates = {};
        list.forEach(m => { rates[m.member_id] = ''; });
        setImportRates(rates);
        setShowImport(true);
    };

    const doImport = async (member) => {
        setImporting(member.member_id);
        try {
            await attendanceService.importTeamMember({
                project: projectId,
                member_id: member.member_id,
                daily_rate: importRates[member.member_id] || 0,
                worker_type: 'STAFF',
            });
            setUnlinked(u => u.filter(m => m.member_id !== member.member_id));
            load();
        } catch (e) {
            setError(e.response?.data?.error || 'Import failed.');
        } finally {
            setImporting(null);
        }
    };

    const openAdd  = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
    const openEdit = (w) => {
        setEditing(w.id);
        setForm({
            name: w.name, trade: w.trade, worker_type: w.worker_type,
            daily_rate: w.daily_rate, overtime_rate_per_hour: w.overtime_rate_per_hour || '',
            phone: w.phone || '', joined_date: w.joined_date || '', notes: w.notes || '',
        });
        setShowForm(true);
    };

    const save = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const payload = { ...form, project: projectId };
            if (editing) await attendanceService.updateWorker(editing, payload);
            else         await attendanceService.createWorker(payload);
            setShowForm(false);
            load();
        } catch (e) {
            setError(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed.');
        } finally { setSaving(false); }
    };

    const toggleActive = async (w) => {
        try {
            await attendanceService.updateWorker(w.id, { is_active: !w.is_active });
            load();
        } catch { setError('Update failed.'); }
    };

    const displayed = workers.filter(w => {
        const matchesFilter = filter === 'ALL' ? true : w.worker_type === filter;
        const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             w.trade_display.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    if (!projectId) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>
            Select a project first.
        </div>
    );

    return (
        <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                    {['ALL','LABOUR','STAFF'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            border: '1px solid var(--t-border)',
                            background: filter === f ? '#f97316' : 'var(--t-surface)',
                            color: filter === f ? '#fff' : 'var(--t-text)',
                            cursor: 'pointer',
                        }}>{f}</button>
                    ))}
                </div>
                
                <input 
                    type="text" 
                    placeholder="Search worker..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12,
                        border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                        color: 'var(--t-text)', width: 180,
                    }}
                />

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button onClick={openImport} style={{
                        padding: '8px 16px', borderRadius: 10, fontSize: 13,
                        fontWeight: 700, background: 'var(--t-surface)', color: '#3b82f6',
                        border: '1px solid #3b82f6', cursor: 'pointer',
                    }}>👥 Import from Team</button>
                    <button onClick={openAdd} style={{
                        padding: '8px 18px', borderRadius: 10, fontSize: 13,
                        fontWeight: 800, background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer',
                    }}>+ Add Worker</button>
                </div>
            </div>

            {error && <div style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}

            {/* Table */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>Loading…</div>
            ) : displayed.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', borderRadius: 12, background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text3)' }}>
                    No workers yet. Click "+ Add Worker" to get started.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: 'var(--t-surface)' }}>
                                {['Name', 'Type', 'Trade', 'Daily Rate', 'OT Rate/hr', 'Phone', 'Status', ''].map(h => (
                                    <th key={h} style={{
                                        padding: '10px 12px', textAlign: 'left',
                                        fontWeight: 800, fontSize: 11, textTransform: 'uppercase',
                                        letterSpacing: '0.05em', color: 'var(--t-text3)',
                                        borderBottom: '2px solid var(--t-border)',
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.map((w, i) => (
                                <tr key={w.id} style={{
                                    borderBottom: '1px solid var(--t-border)',
                                    opacity: w.is_active ? 1 : 0.5,
                                    background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                                }}>
                                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--t-text)' }}>{w.name}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                            background: w.worker_type === 'STAFF' ? 'rgba(59,130,246,0.1)' : 'rgba(249,115,22,0.1)',
                                            color: w.worker_type === 'STAFF' ? '#3b82f6' : '#f97316',
                                        }}>{w.worker_type}</span>
                                    </td>
                                    <td style={{ padding: '10px 12px', color: 'var(--t-text3)' }}>{w.trade_display}</td>
                                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--t-text)' }}>NPR {Number(w.daily_rate).toLocaleString()}</td>
                                    <td style={{ padding: '10px 12px', color: 'var(--t-text3)' }}>
                                        {Number(w.overtime_rate_per_hour) > 0
                                            ? `NPR ${Number(w.overtime_rate_per_hour).toLocaleString()}`
                                            : <span style={{ color: '#10b981', fontSize: 11 }}>Auto (1.5×)</span>}
                                    </td>
                                    <td style={{ padding: '10px 12px', color: 'var(--t-text3)' }}>{w.phone || '—'}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <button onClick={() => toggleActive(w)} style={{
                                            padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                            border: `1px solid ${w.is_active ? '#10b981' : '#ef4444'}`,
                                            background: w.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                            color: w.is_active ? '#10b981' : '#ef4444', cursor: 'pointer',
                                        }}>{w.is_active ? 'Active' : 'Inactive'}</button>
                                    </td>
                                    <td style={{ padding: '10px 12px', display: 'flex', gap: 6 }}>
                                        <button onClick={() => openEdit(w)} style={{
                                            padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                                            border: '1px solid var(--t-border)', background: 'var(--t-bg)',
                                            color: 'var(--t-text)', cursor: 'pointer',
                                        }}>✏️ Edit</button>
                                        <button onClick={() => setSelectedHistoryWorker(w.id)} style={{
                                            padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                                            border: '1px solid var(--t-border)', background: 'var(--t-bg)',
                                            color: 'var(--t-text3)', cursor: 'pointer',
                                        }}>🕒</button>
                                        <button onClick={() => deleteWorker(w.id)} style={{
                                            padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                                            border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)',
                                            color: '#ef4444', cursor: 'pointer',
                                        }}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Import from Team Modal */}
            {showImport && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
                }}>
                    <div style={{
                        background: 'var(--t-surface)', borderRadius: 16, padding: 28,
                        width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto',
                        border: '1px solid var(--t-border)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--t-text)' }}>
                                👥 Import from Project Team
                            </h3>
                            <button onClick={() => setShowImport(false)} style={{
                                background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--t-text3)',
                            }}>✕</button>
                        </div>

                        {unlinked.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--t-text3)', fontSize: 14 }}>
                                All team members are already imported as workers.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--t-text3)' }}>
                                    Set a daily rate for each member you want to import, then click Import.
                                </p>
                                {unlinked.map(m => (
                                    <div key={m.member_id} style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '12px 14px', borderRadius: 10,
                                        border: '1px solid var(--t-border)', background: 'var(--t-bg)',
                                    }}>
                                        {/* Avatar circle */}
                                        <div style={{
                                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                            background: ROLE_COLORS[m.role] || '#64748b',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontWeight: 800, fontSize: 14,
                                        }}>
                                            {m.name.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {m.name}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--t-text3)' }}>
                                                <span style={{
                                                    padding: '1px 6px', borderRadius: 4, fontWeight: 700,
                                                    background: `${ROLE_COLORS[m.role] || '#64748b'}22`,
                                                    color: ROLE_COLORS[m.role] || '#64748b',
                                                    marginRight: 6,
                                                }}>{m.role}</span>
                                                {m.email}
                                            </div>
                                        </div>

                                        {/* Daily rate input */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                                            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase' }}>Daily Rate</label>
                                            <input
                                                type="number"
                                                placeholder="NPR"
                                                value={importRates[m.member_id] || ''}
                                                onChange={e => setImportRates(r => ({ ...r, [m.member_id]: e.target.value }))}
                                                style={{
                                                    width: 90, padding: '5px 8px', borderRadius: 7,
                                                    border: '1px solid var(--t-border)', background: 'var(--t-surface)',
                                                    color: 'var(--t-text)', fontSize: 12, textAlign: 'right',
                                                }}
                                            />
                                        </div>

                                        {/* Import button */}
                                        <button
                                            onClick={() => doImport(m)}
                                            disabled={importing === m.member_id}
                                            style={{
                                                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                                                background: importing === m.member_id ? '#94a3b8' : '#3b82f6',
                                                color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0,
                                                opacity: importing === m.member_id ? 0.7 : 1,
                                            }}
                                        >
                                            {importing === m.member_id ? '…' : 'Import'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ marginTop: 20, textAlign: 'right' }}>
                            <button onClick={() => setShowImport(false)} style={{
                                padding: '9px 22px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                                border: '1px solid var(--t-border)', background: 'var(--t-bg)',
                                color: 'var(--t-text)', cursor: 'pointer',
                            }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showForm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
                }}>
                    <div style={{
                        background: 'var(--t-surface)', borderRadius: 16, padding: 28,
                        width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
                        border: '1px solid var(--t-border)',
                    }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: 'var(--t-text)' }}>
                            {editing ? '✏️ Edit Worker' : '➕ Add Worker'}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { label: 'Name *', key: 'name', type: 'text' },
                                { label: 'Phone', key: 'phone', type: 'text' },
                                { label: 'Daily Rate (NPR)', key: 'daily_rate', type: 'number' },
                                { label: 'OT Rate/hour (NPR, 0=auto)', key: 'overtime_rate_per_hour', type: 'number' },
                                { label: 'Joining Date', key: 'joined_date', type: 'date' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase' }}>{f.label}</label>
                                    <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        style={{
                                            width: '100%', marginTop: 4, padding: '8px 12px', borderRadius: 8,
                                            border: '1px solid var(--t-border)', background: 'var(--t-bg)',
                                            color: 'var(--t-text)', fontSize: 13, boxSizing: 'border-box',
                                        }} />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase' }}>Type</label>
                                <select value={form.worker_type} onChange={e => setForm(p => ({ ...p, worker_type: e.target.value }))}
                                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', fontSize: 13 }}>
                                    <option value="LABOUR">Daily Labour</option>
                                    <option value="STAFF">Salaried Staff</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase' }}>Trade / Role</label>
                                <select value={form.trade} onChange={e => setForm(p => ({ ...p, trade: e.target.value }))}
                                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', fontSize: 13 }}>
                                    {TRADES.map(t => <option key={t} value={t}>{TRADE_LABELS[t]}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase' }}>Notes</label>
                                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                                    style={{ width: '100%', marginTop: 4, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button onClick={() => setShowForm(false)} style={{
                                flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700,
                                border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)', cursor: 'pointer',
                            }}>Cancel</button>
                            <button onClick={save} disabled={saving || !form.name.trim()} style={{
                                flex: 2, padding: '10px', borderRadius: 10, fontWeight: 800,
                                background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1,
                            }}>{saving ? 'Saving…' : editing ? 'Update Worker' : 'Add Worker'}</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedHistoryWorker && (
                <WorkerHistoryModal 
                    workerId={selectedHistoryWorker} 
                    onClose={() => setSelectedHistoryWorker(null)} 
                />
            )}
        </div>
    );
}
