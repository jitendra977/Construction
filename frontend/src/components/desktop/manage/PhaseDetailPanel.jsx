/**
 * PhaseDetailPanel — full-page inline panel for phase details.
 * Shown inside PhasesPage when a phase is selected (no modal).
 */
import React, { useState, useRef, useEffect } from 'react';
import { constructionService, getMediaUrl } from '../../../services/api';
import { useConstruction } from '../../../context/ConstructionContext';
import ConfirmModal from '../../common/ConfirmModal';
import imageCompression from 'browser-image-compression';
import workforceService from '../../../services/workforceService';

/* ── helpers ── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD';
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';
const daysLeft = (s) => s ? Math.round((new Date(s) - new Date()) / 86400000) : null;

const PHASE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'HALTED'];
const TASK_STATUSES  = ['PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];

const STATUS_COLOR = {
    COMPLETED:   { color: '#10b981', bg: '#10b98115', label: 'Completed'   },
    IN_PROGRESS: { color: '#3b82f6', bg: '#3b82f615', label: 'In Progress' },
    HALTED:      { color: '#ef4444', bg: '#ef444415', label: 'Halted'      },
    PENDING:     { color: '#6b7280', bg: '#6b728015', label: 'Pending'     },
};
const PRIORITY_COLOR = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#6b7280' };

/* ── small sub-components ── */
function Pill({ label, color, bg }) {
    return (
        <span style={{
            fontSize: 9, fontWeight: 900, padding: '3px 10px', borderRadius: 6,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            background: bg, color, border: `1px solid ${color}30`,
        }}>{label}</span>
    );
}

function SectionHead({ label }) {
    return (
        <div style={{
            fontSize: 9, fontWeight: 900, color: 'var(--t-text3)',
            textTransform: 'uppercase', letterSpacing: '0.16em',
            borderBottom: '1px solid var(--t-border)', paddingBottom: 6, marginBottom: 10,
        }}>{label}</div>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
            {children}
        </div>
    );
}

/* ── TaskMiniRow ── */
function TaskMiniRow({ task, isSelected, onClick, onTaskClick, canDelete, onDelete }) {
    const sm = STATUS_COLOR[task.status] || STATUS_COLOR.PENDING;
    const dl = daysLeft(task.due_date);
    const overdue = dl !== null && dl < 0 && task.status !== 'COMPLETED';

    return (
        <div
            onClick={() => onClick(task)}
            style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                background: isSelected ? 'rgba(249,115,22,0.08)' : 'var(--t-surface2)',
                border: `1px solid ${isSelected ? 'rgba(249,115,22,0.4)' : 'var(--t-border)'}`,
                transition: 'all 0.15s',
                marginBottom: 4,
            }}
        >
            {/* priority strip */}
            <div style={{
                width: 3, height: 32, borderRadius: 2, flexShrink: 0,
                background: PRIORITY_COLOR[task.priority] || '#6b7280',
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--t-text)',
                    textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {task.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{
                        fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                        background: sm.bg, color: sm.color,
                    }}>{sm.label}</span>
                    {task.due_date && (
                        <span style={{
                            fontSize: 9, fontWeight: 700,
                            color: overdue ? '#ef4444' : 'var(--t-text3)',
                        }}>
                            {overdue ? `⚠ ${Math.abs(dl)}d over` : `📅 ${fmtShort(task.due_date)}`}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {task.technical_requirement && (
                        <span title="Technical Specs Available" style={{ fontSize: 12, cursor: 'help' }}>📜</span>
                    )}
                    {canDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                            style={{
                                background: 'none', border: 'none', color: '#ef4444',
                                cursor: 'pointer', fontSize: 14, opacity: 0.6,
                                padding: '4px 8px',
                            }}
                        >🗑</button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                        style={{
                            padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 900,
                            background: 'rgba(249,115,22,0.1)', color: '#f97316',
                            border: '1px solid rgba(249,115,22,0.3)', cursor: 'pointer',
                        }}
                    >Detail →</button>
                </div>
                {task.technical_requirement && isSelected && (
                    <div style={{
                        marginTop: 4, padding: '6px 10px', borderRadius: 6,
                        background: 'var(--t-surface)', border: '1px solid #f9731630',
                        fontSize: 10, color: 'var(--t-text2)', fontStyle: 'italic',
                        maxWidth: 240, borderLeft: '2px solid #f97316',
                    }}>
                        <div style={{ fontWeight: 800, color: '#f97316', fontSize: 8, textTransform: 'uppercase', marginBottom: 2 }}>Engineer's Specs:</div>
                        {task.technical_requirement}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── MediaGrid ── */
function MediaGrid({ media, onUpload, uploading, canUpload, onDelete }) {
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <SectionHead label={`Evidence / Media (${media.length})`} />
                {canUpload && (
                    <button onClick={onUpload} disabled={uploading} style={{
                        padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                        background: 'rgba(16,185,129,0.1)', color: '#10b981',
                        border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer',
                        opacity: uploading ? 0.6 : 1,
                    }}>
                        {uploading ? '⏳ Uploading…' : '📤 Upload'}
                    </button>
                )}
            </div>
            {media.length === 0 ? (
                <div style={{
                    padding: '28px 0', textAlign: 'center',
                    border: '1px dashed var(--t-border)', borderRadius: 10,
                    color: 'var(--t-text3)', fontSize: 11,
                }}>
                    📂 No media uploaded yet
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {media.map(m => (
                        <div key={m.id} style={{ position: 'relative' }}>
                            <a href={getMediaUrl(m.file)} target="_blank" rel="noopener noreferrer"
                                style={{
                                    display: 'block', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden',
                                    background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
                                }}>
                                {m.media_type === 'IMAGE' ? (
                                    <img src={getMediaUrl(m.file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : m.media_type === 'VIDEO' ? (
                                    <video src={getMediaUrl(m.file)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{
                                        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center', gap: 4,
                                    }}>
                                        <span style={{ fontSize: 24 }}>📄</span>
                                        <span style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 700 }}>
                                            {m.file.split('/').pop().slice(0, 14)}
                                        </span>
                                    </div>
                                )}
                            </a>
                            {onDelete && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(m.id); }}
                                    style={{
                                        position: 'absolute', top: 4, right: 4,
                                        width: 18, height: 18, borderRadius: '50%',
                                        background: 'rgba(239,68,68,0.8)', color: '#fff',
                                        border: 'none', cursor: 'pointer', fontSize: 10,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    }}
                                >✕</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Main component ── */
export default function PhaseDetailPanel({ phase, onBack, onTaskClick }) {
    const {
        updatePhase, updateTask, createExpense, deleteExpense, updateExpense,
        createMaterialTransaction, refreshData, dashboardData, formatCurrency,
        deleteTask, deleteTaskMedia, createTask, user
    } = useConstruction();

    const canManage = user?.is_system_admin || user?.can_manage_phases;

    const fileInputRef  = useRef(null);
    const phasePhotoRef = useRef(null);

    const [localPhase, setLocalPhase] = useState({
        name:        phase?.name        || '',
        description: phase?.description || '',
        status:      phase?.status      || 'PENDING',
        start_date:  phase?.start_date  || '',
        end_date:    phase?.end_date    || '',
        estimated_budget: phase?.estimated_budget || 0,
    });

    const [isEditing,      setIsEditing]      = useState(false);
    const [saving,         setSaving]         = useState(false);
    const [isDirty,        setIsDirty]        = useState(false);
    const [completing,     setCompleting]     = useState(false);
    const [uploading,      setUploading]      = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [materialCart,   setMaterialCart]   = useState([]);
    const [selMat,         setSelMat]         = useState('');
    const [matQty,         setMatQty]         = useState('');
    const [matPrice,       setMatPrice]       = useState('');
    const [editingMatId,   setEditingMatId]   = useState(null);
    const [editMatData,    setEditMatData]     = useState({});
    const [confirmCfg,     setConfirmCfg]     = useState({ isOpen: false });
    const [activeTab,      setActiveTab]      = useState('tasks'); // 'tasks' | 'media' | 'materials' | 'assignments'

    // ── Task management state ──
    const [newTaskTitle,    setNewTaskTitle]    = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
    const [newTaskSpec,     setNewTaskSpec]     = useState('');

    // ── Assignments state ──
    const [phaseAssignments, setPhaseAssignments] = useState([]);
    const [allMembers,      setAllMembers]       = useState([]);
    const [loadingAssign,   setLoadingAssign]    = useState(false);
    const [selMember,       setSelMember]        = useState('');
    const [selTask,         setSelTask]          = useState('');
    const [editingAssignId, setEditingAssignId]  = useState(null);
    const [editAssignData,  setEditAssignData]   = useState({});
    const [allRoles,        setAllRoles]         = useState([]);

    // Sync when phase prop changes
    useEffect(() => {
        if (phase) {
            setLocalPhase({
                name:        phase.name,
                description: phase.description || '',
                technical_spec: phase.technical_spec || '',
                status:      phase.status,
                start_date:  phase.start_date  || '',
                end_date:    phase.end_date    || '',
                estimated_budget: phase.estimated_budget || 0,
            });
            setIsDirty(false);
            setIsEditing(false);
            fetchPhaseAssignments();
            fetchRoles();
        }
    }, [phase?.id]);

    const fetchRoles = async () => {
        try {
            const data = await workforceService.getRoles();
            setAllRoles(data);
        } catch { console.error("Failed to fetch roles"); }
    };

    const fetchPhaseAssignments = async () => {
        if (!phase?.id) return;
        setLoadingAssign(true);
        try {
            const data = await workforceService.getAssignments({ phase: phase.id });
            setPhaseAssignments(Array.isArray(data) ? data : (data.results || []));
            
            // Also fetch members if editing
            const mems = await workforceService.getMembers({ limit: 100 });
            setAllMembers(Array.isArray(mems) ? mems : (mems.results || []));
        } catch (err) {
            console.error("Failed to fetch assignments", err);
        } finally {
            setLoadingAssign(false);
        }
    };

    const set = (k, v) => { setLocalPhase(p => ({ ...p, [k]: v })); setIsDirty(true); };

    // Live tasks for this phase
    const phaseTasks     = (dashboardData.tasks || []).filter(t => (t.phase === phase?.id) || (t.phase?.id === phase?.id));
    const doneCount      = phaseTasks.filter(t => t.status === 'COMPLETED').length;
    const progress       = phaseTasks.length > 0 ? Math.round(doneCount / phaseTasks.length * 100) : 0;
    const phaseMaterials = (dashboardData.expenses || []).filter(e => 
        ((e.phase === phase?.id) || (e.phase?.id === phase?.id)) && 
        (e.expense_type === 'MATERIAL')
    );
    const selectedTask   = phaseTasks.find(t => t.id === selectedTaskId) || null;
    const liveTask       = selectedTask ? (dashboardData.tasks || []).find(t => t.id === selectedTask.id) || selectedTask : null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await updatePhase(phase.id, localPhase);
            setIsDirty(false);
            setIsEditing(false);
            refreshData();
        } catch { alert('Failed to save.'); }
        finally { setSaving(false); }
    };

    const handleUploadMedia = async (e) => {
        const raw = e.target.files[0];
        if (!raw || !selectedTask) return;
        setUploading(true);
        let file = raw;
        let mediaType = 'DOCUMENT';
        if (raw.type.startsWith('image/')) {
            mediaType = 'IMAGE';
            try { file = await imageCompression(raw, { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true }); } catch {}
        } else if (raw.type.startsWith('video/')) {
            mediaType = 'VIDEO';
        }
        const fd = new FormData();
        fd.append('task', selectedTask.id);
        fd.append('file', file);
        fd.append('media_type', mediaType);
        try { await constructionService.uploadTaskMedia(fd); refreshData(); }
        catch { alert('Upload failed.'); }
        finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleTaskToggle = async (task) => {
        const next = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        try { await constructionService.updateTask(task.id, { status: next }); refreshData(); }
        catch {}
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        setSaving(true);
        try {
            await createTask({
                phase: phase.id,
                title: newTaskTitle,
                priority: newTaskPriority,
                technical_requirement: newTaskSpec,
            });
            setNewTaskTitle('');
            setNewTaskSpec('');
            setNewTaskPriority('MEDIUM');
            refreshData();
        } catch { alert('Failed to create task.'); }
        finally { setSaving(false); }
    };

    const handleDeleteTask = async (id) => {
        if (!window.confirm("Delete this task and all its media/updates?")) return;
        try {
            await deleteTask(id);
            refreshData();
        } catch { alert('Failed to delete task.'); }
    };

    const handleDeleteMedia = async (id) => {
        if (!window.confirm("Delete this media file?")) return;
        try {
            await deleteTaskMedia(id);
            refreshData();
        } catch { alert('Failed to delete media.'); }
    };

    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append(field, file);

        setSaving(true);
        try {
            await updatePhase(phase.id, formData);
            refreshData();
            alert('File uploaded successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to upload file.');
        } finally {
            setSaving(false);
        }
    };

    const handleAddToCart = (e) => {
        e.preventDefault();
        if (!selMat || !matQty) return;
        const mat = (dashboardData.materials || []).find(m => String(m.id) === String(selMat));
        if (!mat) return;
        setMaterialCart(c => [...c, {
            id: Date.now(), materialId: mat.id, name: mat.name,
            quantity: parseFloat(matQty), unitPrice: parseFloat(matPrice || mat.avg_cost_per_unit || 0), unit: mat.unit,
        }]);
        setSelMat(''); setMatQty(''); setMatPrice('');
    };

    const handleCommitCart = async () => {
        if (!materialCart.length) return;
        setSaving(true);
        try {
            for (const item of materialCart) {
                await createMaterialTransaction({
                    material: item.materialId, transaction_type: 'OUT',
                    quantity: item.quantity, unit_price: item.unitPrice,
                    date: new Date().toISOString().split('T')[0],
                    phase: phase.id, purpose: `Allocated for ${phase.name}`,
                    create_expense: true, status: 'RECEIVED',
                });
            }
            setMaterialCart([]);
            refreshData();
        } catch { alert('Failed to allocate materials.'); }
        finally { setSaving(false); }
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        if (!selMember) return;
        setSaving(true);
        try {
            await workforceService.createAssignment({
                worker: selMember,
                project: phase.project,
                phase: phase.id,
                task: selTask || null,
                start_date: localPhase.start_date || new Date().toISOString().split('T')[0],
                status: 'active',
            });
            setSelMember('');
            setSelTask('');
            fetchPhaseAssignments();
        } catch { alert('Failed to create assignment.'); }
        finally { setSaving(false); }
    };

    const handleDeleteAssignment = async (id) => {
        if (!window.confirm("Remove this worker from the phase?")) return;
        try {
            await workforceService.deleteAssignment(id);
            fetchPhaseAssignments();
        } catch { alert('Failed to remove assignment.'); }
    };

    const handleUpdateAssignment = async (id) => {
        setSaving(true);
        try {
            await workforceService.updateAssignment(id, {
                task: editAssignData.task || null,
                role_override: editAssignData.role_override || '',
                start_date: editAssignData.start_date,
            });
            setEditingAssignId(null);
            fetchPhaseAssignments();
        } catch { alert('Failed to update assignment.'); }
        finally { setSaving(false); }
    };

    const startEditAssignment = (a) => {
        setEditingAssignId(a.id);
        setEditAssignData({
            task: a.task,
            role_override: a.role_override || '',
            start_date: a.start_date,
        });
    };

    const handleDeleteAllocation = async (expenseId) => {
        if (!window.confirm('Remove this material allocation? This cannot be undone.')) return;
        try {
            await deleteExpense(expenseId);
        } catch { alert('Failed to delete allocation.'); }
    };

    const handleUpdateAllocation = async (expenseId) => {
        setSaving(true);
        try {
            await updateExpense(expenseId, {
                title:      editMatData.title,
                quantity:   parseFloat(editMatData.quantity),
                unit_price: parseFloat(editMatData.unit_price),
                amount:     parseFloat(editMatData.quantity) * parseFloat(editMatData.unit_price),
            });
            setEditingMatId(null);
        } catch { alert('Failed to update allocation.'); }
        finally { setSaving(false); }
    };

    const handleComplete = async () => {
        if (!phase.completion_photo) { alert('Phase completion photo is required.'); return; }
        const incomplete = phaseTasks.filter(t => t.status !== 'COMPLETED');
        if (incomplete.length > 0) { alert(`${incomplete.length} tasks still incomplete.`); return; }
        setCompleting(true);
        try { await updatePhase(phase.id, { status: 'COMPLETED' }); refreshData(); }
        finally { setCompleting(false); }
    };

    const inp = {
        width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12,
        border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
        color: 'var(--t-text)', outline: 'none', boxSizing: 'border-box',
    };

    const sm = STATUS_COLOR[localPhase.status] || STATUS_COLOR.PENDING;

    return (
        <div style={{ minHeight: '100%' }}>
            {/* ── Breadcrumb bar ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 24px',
                background: 'var(--t-surface)', borderBottom: '1px solid var(--t-border)',
                position: 'sticky', top: 0, zIndex: 20,
            }}>
                <button onClick={onBack} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                    background: 'var(--t-surface2)', color: 'var(--t-text)',
                    border: '1px solid var(--t-border)', cursor: 'pointer',
                }}>
                    ← Back to Phases
                </button>
                <span style={{ fontSize: 12, color: 'var(--t-text3)' }}>Phase Detail</span>
                <span style={{ fontSize: 12, color: 'var(--t-text3)' }}>›</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t-text)' }}>{localPhase.name}</span>
                <div style={{ flex: 1 }} />
                {canManage && (
                    isEditing ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleSave} disabled={saving} style={{
                                padding: '6px 18px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer',
                                opacity: saving ? 0.6 : 1,
                            }}>{saving ? 'Saving…' : '✓ Save Changes'}</button>
                            <button onClick={() => { setIsEditing(false); setIsDirty(false); }} style={{
                                padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                background: 'var(--t-surface2)', color: 'var(--t-text)',
                                border: '1px solid var(--t-border)', cursor: 'pointer',
                            }}>Cancel</button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} style={{
                            padding: '6px 16px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                            background: 'rgba(249,115,22,0.1)', color: '#f97316',
                            border: '1px solid rgba(249,115,22,0.3)', cursor: 'pointer',
                        }}>✏️ Edit Phase</button>
                    )
                )}
            </div>

            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>

                {/* ── LEFT: Identity + Tasks ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Phase identity card */}
                    <div style={{
                        background: 'var(--t-surface)', borderRadius: 14,
                        border: '1px solid var(--t-border)',
                        borderLeft: `4px solid ${sm.color}`,
                        padding: 18,
                    }}>
                        {/* Order badge + status */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{
                                fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 6,
                                background: 'rgba(249,115,22,0.12)', color: '#f97316',
                                border: '1px solid rgba(249,115,22,0.2)',
                            }}>Phase {phase.order}</span>
                            {isEditing ? (
                                <select value={localPhase.status} onChange={e => set('status', e.target.value)} style={{ ...inp, width: 140 }}>
                                    {PHASE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                </select>
                            ) : (
                                <Pill label={sm.label} color={sm.color} bg={sm.bg} />
                            )}
                        </div>

                        {/* Name */}
                        {isEditing ? (
                            <input style={{ ...inp, fontSize: 15, fontWeight: 800, marginBottom: 10 }}
                                value={localPhase.name} onChange={e => set('name', e.target.value)} placeholder="Phase name…" />
                        ) : (
                            <h2 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 900, color: 'var(--t-text)' }}>
                                {localPhase.name}
                            </h2>
                        )}

                        {/* Progress bar */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-text3)' }}>Progress</span>
                                <span style={{ fontSize: 10, fontWeight: 900, color: '#f97316' }}>{progress}%</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 3, background: 'var(--t-border)', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', width: `${progress}%`, borderRadius: 3,
                                    background: progress === 100 ? '#10b981' : 'linear-gradient(90deg, #f97316, #fb923c)',
                                    transition: 'width 0.5s',
                                }} />
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 4 }}>
                                {doneCount}/{phaseTasks.length} tasks completed
                            </div>
                        </div>

                        {/* Dates */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                            <Field label="Start Date">
                                {isEditing
                                    ? <input type="date" style={inp} value={localPhase.start_date} onChange={e => set('start_date', e.target.value)} />
                                    : <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)' }}>{fmt(localPhase.start_date)}</span>
                                }
                            </Field>
                            <Field label="End Date">
                                {isEditing
                                    ? <input type="date" style={inp} value={localPhase.end_date} onChange={e => set('end_date', e.target.value)} />
                                    : <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)' }}>{fmt(localPhase.end_date)}</span>
                                }
                            </Field>
                        </div>

                        {/* Budget */}
                        <Field label="Estimated Budget">
                            {isEditing
                                ? <input type="number" style={inp} value={localPhase.estimated_budget} onChange={e => set('estimated_budget', e.target.value)} />
                                : <span style={{ fontSize: 14, fontWeight: 900, color: '#f97316' }}>
                                    {formatCurrency ? formatCurrency(localPhase.estimated_budget) : `Rs. ${Number(localPhase.estimated_budget).toLocaleString()}`}
                                  </span>
                            }
                        </Field>

                        {/* Description */}
                        <div style={{ marginTop: 12 }}>
                            <SectionHead label="Scope of Work" />
                            {isEditing
                                ? <textarea rows={3} style={{ ...inp, resize: 'vertical' }}
                                    value={localPhase.description} onChange={e => set('description', e.target.value)}
                                    placeholder="Describe the work in this phase…" />
                                : <p style={{ fontSize: 12, color: 'var(--t-text2)', lineHeight: 1.6, margin: 0, fontStyle: localPhase.description ? 'normal' : 'italic' }}>
                                    {localPhase.description || 'No description provided.'}
                                  </p>
                            }
                        </div>
                    </div>

                    {/* Completion photo + finalize */}
                    <div style={{
                        background: 'var(--t-surface)', borderRadius: 14,
                        border: `1px solid ${phase.status === 'COMPLETED' ? '#10b98140' : 'var(--t-border)'}`,
                        padding: 18,
                    }}>
                        <SectionHead label="Phase Completion" />
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div
                                onClick={() => isEditing && phasePhotoRef.current?.click()}
                                style={{
                                    width: 80, height: 60, borderRadius: 8, overflow: 'hidden',
                                    border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
                                    flexShrink: 0, cursor: isEditing ? 'pointer' : 'default',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                {phase.completion_photo
                                    ? <img src={getMediaUrl(phase.completion_photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <span style={{ fontSize: 24, opacity: 0.3 }}>🛠️</span>
                                }
                            </div>
                            <input type="file" ref={phasePhotoRef} className="hidden" accept="image/*" style={{ display: 'none' }}
                                onChange={async (e) => {
                                    if (e.target.files[0]) {
                                        const fd = new FormData();
                                        fd.append('completion_photo', e.target.files[0]);
                                        await updatePhase(phase.id, fd);
                                        refreshData();
                                    }
                                }} />
                            <div style={{ flex: 1 }}>
                                {phase.status === 'COMPLETED' ? (
                                    <p style={{ fontSize: 12, fontWeight: 800, color: '#10b981', margin: 0 }}>✓ Phase Completed</p>
                                ) : isEditing ? (
                                    <button onClick={handleComplete} disabled={completing} style={{
                                        width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                        background: 'linear-gradient(90deg,#f97316,#ea580c)', color: '#fff',
                                        border: 'none', cursor: 'pointer', opacity: completing ? 0.6 : 1,
                                    }}>
                                        {completing ? 'Processing…' : '🏁 Mark Complete'}
                                    </button>
                                ) : (
                                    <p style={{ fontSize: 11, color: 'var(--t-text3)', margin: 0, lineHeight: 1.5 }}>
                                        Click "Edit Phase" then upload a completion photo and mark phase complete.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Tasks + Media + Materials ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                    {/* Tab bar */}
                    <div style={{
                        display: 'flex', borderBottom: '1px solid var(--t-border)',
                        marginBottom: 16,
                    }}>
                        {[
                            { id: 'tasks',       label: `Execution Tasks (${phaseTasks.length})` },
                            { id: 'design',      label: `Design & Specs` },
                            { id: 'media',       label: `Media (${liveTask?.media?.length ?? 0})` },
                            { id: 'materials',   label: `Materials (${phaseMaterials.length})` },
                            { id: 'assignments', label: `Workforce & Team (${phaseAssignments.length})` },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                                padding: '8px 18px', fontSize: 11, fontWeight: 800, border: 'none',
                                background: 'none', cursor: 'pointer',
                                color: activeTab === tab.id ? '#f97316' : 'var(--t-text3)',
                                borderBottom: `2px solid ${activeTab === tab.id ? '#f97316' : 'transparent'}`,
                                marginBottom: -1, transition: 'all 0.15s',
                            }}>{tab.label}</button>
                        ))}
                    </div>

                    {/* Tasks tab */}
                    {activeTab === 'tasks' && (
                        <div>
                            {/* Quick add task at top */}
                            {canManage && (
                                <div style={{
                                    marginBottom: 16, padding: 16, borderRadius: 12,
                                    background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                }}>
                                    <SectionHead label="Add New Task" />
                                    <form onSubmit={handleAddTask} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px auto', gap: 10, alignItems: 'end' }}>
                                        <Field label="Task Name">
                                            <input
                                                value={newTaskTitle}
                                                onChange={e => setNewTaskTitle(e.target.value)}
                                                placeholder="e.g. Concrete Pouring"
                                                style={inp}
                                            />
                                        </Field>
                                        <Field label="Technical Requirement">
                                            <input
                                                value={newTaskSpec}
                                                onChange={e => setNewTaskSpec(e.target.value)}
                                                placeholder="e.g. Mix ratio 1:2:4..."
                                                style={inp}
                                            />
                                        </Field>
                                        <Field label="Priority">
                                            <select
                                                value={newTaskPriority}
                                                onChange={e => setNewTaskPriority(e.target.value)}
                                                style={inp}
                                            >
                                                <option value="LOW">Low</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="HIGH">High</option>
                                                <option value="CRITICAL">Critical</option>
                                            </select>
                                        </Field>
                                        <button type="submit" disabled={!newTaskTitle || saving} style={{
                                            padding: '8px 20px', borderRadius: 8, background: '#f97316', color: '#fff',
                                            border: 'none', fontWeight: 900, fontSize: 12, cursor: 'pointer',
                                            opacity: (!newTaskTitle || saving) ? 0.5 : 1,
                                            boxShadow: '0 2px 4px rgba(249,115,22,0.3)',
                                        }}>
                                            {saving ? '...' : '+ Create Task'}
                                        </button>
                                    </form>
                                </div>
                            )}
                            {phaseTasks.length === 0 ? (
                                <div style={{
                                    padding: 40, textAlign: 'center',
                                    border: '1px dashed var(--t-border)', borderRadius: 12,
                                    color: 'var(--t-text3)',
                                }}>
                                    <p style={{ fontSize: 28, margin: '0 0 8px' }}>📋</p>
                                    <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: 'var(--t-text)' }}>No Execution Tasks</p>
                                    <p style={{ fontSize: 12, margin: 0 }}>Add the first task above to start tracking progress for this phase.</p>
                                </div>
                            ) : (
                                <div>
                                    {/* Column headers */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: '1fr 120px',
                                        padding: '0 12px 6px',
                                        fontSize: 9, fontWeight: 900, color: 'var(--t-text3)',
                                        textTransform: 'uppercase', letterSpacing: '0.1em',
                                    }}>
                                        <span>Task</span>
                                        <span style={{ textAlign: 'right' }}>Action</span>
                                    </div>

                                    {[...phaseTasks].sort((a, b) => {
                                        if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
                                        if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
                                        return 0;
                                    }).map(task => (
                                        <TaskMiniRow
                                            key={task.id}
                                            task={task}
                                            isSelected={selectedTaskId === task.id}
                                            onClick={t => setSelectedTaskId(t.id === selectedTaskId ? null : t.id)}
                                            onTaskClick={onTaskClick}
                                            canDelete={canManage}
                                            onDelete={handleDeleteTask}
                                        />
                                    ))}

                                    {/* Stats summary row */}
                                    <div style={{
                                        display: 'flex', gap: 12, padding: '12px 12px 0',
                                        borderTop: '1px solid var(--t-border)', marginTop: 8,
                                    }}>
                                        {[
                                            { label: 'Total',   value: phaseTasks.length,                                       color: 'var(--t-text)' },
                                            { label: 'Done',    value: doneCount,                                               color: '#10b981' },
                                            { label: 'Active',  value: phaseTasks.filter(t => t.status === 'IN_PROGRESS').length, color: '#3b82f6' },
                                            { label: 'Blocked', value: phaseTasks.filter(t => t.status === 'BLOCKED').length,    color: '#f59e0b' },
                                            { label: 'Overdue', value: phaseTasks.filter(t => t.due_date && daysLeft(t.due_date) < 0 && t.status !== 'COMPLETED').length, color: '#ef4444' },
                                        ].map(s => (
                                            <div key={s.label} style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                                                <div style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Media tab */}
                    {activeTab === 'media' && (
                        <div>
                            {/* Header / Filter info */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginBottom: 16, padding: '8px 12px', borderRadius: 8,
                                background: selectedTaskId ? 'rgba(249,115,22,0.06)' : 'var(--t-surface2)',
                                border: `1px solid ${selectedTaskId ? 'rgba(249,115,22,0.2)' : 'var(--t-border)'}`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 12 }}>{selectedTaskId ? '🎯' : '🖼️'}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)' }}>
                                        {selectedTaskId ? `Media for ${liveTask?.title}` : `All Phase Media (${phaseTasks.reduce((acc, t) => acc + (t.media?.length || 0), 0)})`}
                                    </span>
                                </div>
                                {selectedTaskId && (
                                    <button onClick={() => setSelectedTaskId(null)} style={{
                                        background: 'none', border: 'none', color: '#f97316',
                                        fontSize: 10, fontWeight: 800, cursor: 'pointer', padding: 0,
                                    }}>Show All</button>
                                )}
                            </div>

                            <MediaGrid
                                media={selectedTaskId
                                    ? (liveTask?.media || [])
                                    : phaseTasks.flatMap(t => (t.media || []).map(m => ({ ...m, taskTitle: t.title })))
                                }
                                uploading={uploading}
                                canUpload={!!selectedTaskId && canManage} // Can only upload if task selected AND canManage
                                onDelete={canManage ? handleDeleteMedia : null}
                                onUpload={() => fileInputRef.current?.click()}
                            />
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }}
                                accept="image/*,video/*,.pdf,.doc,.docx"
                                onChange={handleUploadMedia} />
                            
                            {!selectedTaskId && (
                                <p style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>
                                    Select a task in the "Tasks" tab to upload new media.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Materials tab */}
                    {activeTab === 'materials' && (
                        <div>
                            {/* Material table */}
                            <div style={{
                                border: '1px solid var(--t-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16,
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--t-surface2)' }}>
                                            {['Material', 'Qty', 'Rate', 'Valuation', ''].map((h, i) => (
                                                <th key={i} style={{
                                                    padding: '8px 14px', textAlign: h === 'Material' ? 'left' : 'right',
                                                    fontSize: 9, fontWeight: 900, color: 'var(--t-text3)',
                                                    textTransform: 'uppercase', letterSpacing: '0.1em',
                                                    borderBottom: '1px solid var(--t-border)',
                                                    width: h === '' ? 72 : undefined,
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {phaseMaterials.length === 0 ? (
                                            <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: 'var(--t-text3)', fontStyle: 'italic' }}>
                                                No materials allocated yet
                                            </td></tr>
                                        ) : phaseMaterials.map(m => {
                                            const isEditing = editingMatId === m.id;
                                            return isEditing ? (
                                                <tr key={m.id} style={{ background: 'rgba(249,115,22,0.04)', borderBottom: '1px solid var(--t-border)' }}>
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <input
                                                            value={editMatData.title || ''}
                                                            onChange={e => setEditMatData(d => ({ ...d, title: e.target.value }))}
                                                            style={{ ...inp, fontSize: 11, width: '100%' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 6px' }}>
                                                        <input type="number" min="0" step="0.01"
                                                            value={editMatData.quantity || ''}
                                                            onChange={e => setEditMatData(d => ({ ...d, quantity: e.target.value }))}
                                                            style={{ ...inp, fontSize: 11, width: 70, textAlign: 'right' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 6px' }}>
                                                        <input type="number" min="0" step="0.01"
                                                            value={editMatData.unit_price || ''}
                                                            onChange={e => setEditMatData(d => ({ ...d, unit_price: e.target.value }))}
                                                            style={{ ...inp, fontSize: 11, width: 80, textAlign: 'right' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12, fontWeight: 900, color: '#f97316' }}>
                                                        Rs.{((parseFloat(editMatData.quantity || 0) * parseFloat(editMatData.unit_price || 0))).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                        <button onClick={() => handleUpdateAllocation(m.id)} disabled={saving}
                                                            style={{ marginRight: 4, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer' }}>
                                                            {saving ? '…' : '✓ Save'}
                                                        </button>
                                                        <button onClick={() => setEditingMatId(null)}
                                                            style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: 'var(--t-surface2)', color: 'var(--t-text3)', border: '1px solid var(--t-border)', cursor: 'pointer' }}>
                                                            ✕
                                                        </button>
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr key={m.id} style={{ borderBottom: '1px solid var(--t-border)' }}>
                                                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--t-text)' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span>{m.material_name || m.title}</span>
                                                            {m.material_name && m.title && m.title !== m.material_name && (
                                                                <span style={{ fontSize: 9, fontWeight: 500, color: 'var(--t-text3)' }}>{m.title}</span>
                                                            )}
                                                        </div>
                                                        {m.is_inventory_usage && <span style={{ fontSize: 8, display: 'inline-block', marginTop: 2, padding: '1px 4px', borderRadius: 3, background: '#f59e0b18', color: '#f59e0b', fontWeight: 800 }}>STOCK</span>}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--t-text)' }}>
                                                        {m.quantity}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, color: 'var(--t-text3)' }}>
                                                        {formatCurrency ? formatCurrency(m.unit_price) : `Rs.${Number(m.unit_price || 0).toLocaleString()}`}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 900, color: '#f97316' }}>
                                                        {formatCurrency ? formatCurrency(m.amount) : `Rs.${Number(m.amount).toLocaleString()}`}
                                                    </td>
                                                    {canManage && (
                                                        <td style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                            <button title="Edit" onClick={() => { setEditingMatId(m.id); setEditMatData({ title: m.title, quantity: m.quantity, unit_price: m.unit_price }); }}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6366f1', marginRight: 6, padding: 2, borderRadius: 4 }}>
                                                                ✏️
                                                            </button>
                                                            <button title="Delete" onClick={() => handleDeleteAllocation(m.id)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ef4444', padding: 2, borderRadius: 4 }}>
                                                                🗑️
                                                            </button>
                                                        </td>
                                                    )}
                                                    {!canManage && <td />}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Allocate materials form */}
                            {canManage && (
                                <div style={{
                                    padding: 16, borderRadius: 10,
                                    background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                                }}>
                                    <SectionHead label="Allocate Materials" />
                                    <form onSubmit={handleAddToCart} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px auto', gap: 8, alignItems: 'end' }}>
                                        <Field label="Material">
                                            <select style={inp} value={selMat} onChange={e => {
                                                setSelMat(e.target.value);
                                                const mat = (dashboardData.materials || []).find(m => String(m.id) === String(e.target.value));
                                                if (mat) setMatPrice(mat.avg_cost_per_unit || mat.unit_price || '');
                                            }}>
                                                <option value="">Select…</option>
                                                {(dashboardData.materials || []).map(m => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name} — {m.stock_qty ?? m.current_stock ?? 0} {m.unit} in stock
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="Quantity">
                                            <input type="number" style={inp} value={matQty} onChange={e => setMatQty(e.target.value)} placeholder="0" min="0" />
                                        </Field>
                                        <Field label="Unit Price">
                                            <input type="number" style={inp} value={matPrice} onChange={e => setMatPrice(e.target.value)} placeholder="0" min="0" />
                                        </Field>
                                        <button type="submit" disabled={!selMat || !matQty} style={{
                                            padding: '7px 16px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                            background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer',
                                            opacity: (!selMat || !matQty) ? 0.5 : 1,
                                        }}>Add</button>
                                    </form>

                                    {/* Cart */}
                                    {materialCart.length > 0 && (
                                        <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'rgba(249,115,22,0.05)', border: '1px dashed rgba(249,115,22,0.3)' }}>
                                            <div style={{ fontSize: 9, fontWeight: 900, color: '#f97316', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                Staging ({materialCart.length})
                                            </div>
                                            {materialCart.map(item => (
                                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <span style={{ fontSize: 11, color: 'var(--t-text)' }}>{item.name} × {item.quantity} {item.unit}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: 12, fontWeight: 900, color: '#f97316' }}>
                                                            Rs.{(item.quantity * item.unitPrice).toLocaleString()}
                                                        </span>
                                                        <button onClick={() => setMaterialCart(c => c.filter(x => x.id !== item.id))} style={{
                                                            background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14,
                                                        }}>×</button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={handleCommitCart} disabled={saving} style={{
                                                marginTop: 8, width: '100%', padding: '7px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                                background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer',
                                                opacity: saving ? 0.6 : 1,
                                            }}>
                                                {saving ? 'Allocating…' : '✓ Commit Allocation'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Assignments tab */}
                    {activeTab === 'assignments' && (
                        <div>
                            {/* Assignment table */}
                            <div style={{
                                border: '1px solid var(--t-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16,
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--t-surface2)' }}>
                                            {['Worker', 'Task (Optional)', 'Role', ''].map(h => (
                                                <th key={h} style={{
                                                    padding: '8px 14px', textAlign: 'left',
                                                    fontSize: 9, fontWeight: 900, color: 'var(--t-text3)',
                                                    textTransform: 'uppercase', letterSpacing: '0.1em',
                                                    borderBottom: '1px solid var(--t-border)',
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {phaseAssignments.length === 0 ? (
                                            <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: 'var(--t-text3)', fontStyle: 'italic' }}>
                                                No workers assigned to this phase yet
                                            </td></tr>
                                        ) : phaseAssignments.map(a => {
                                            const isEditingThis = editingAssignId === a.id;
                                            return (
                                                <tr key={a.id} style={{ borderBottom: '1px solid var(--t-border)', background: isEditingThis ? 'rgba(249,115,22,0.03)' : 'transparent' }}>
                                                    <td style={{ padding: '10px 14px' }}>
                                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)' }}>{a.worker_name || a.worker}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--t-text3)' }}>
                                                            {isEditingThis ? (
                                                                <input
                                                                    type="date"
                                                                    value={editAssignData.start_date || ''}
                                                                    onChange={e => setEditAssignData({ ...editAssignData, start_date: e.target.value })}
                                                                    style={{ ...inp, padding: '2px 4px', fontSize: 10, height: 'auto', marginTop: 4 }}
                                                                />
                                                            ) : (
                                                                `Joined: ${fmtShort(a.start_date)}`
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t-text2)' }}>
                                                        {isEditingThis ? (
                                                            <select
                                                                value={editAssignData.task || ''}
                                                                onChange={e => setEditAssignData({ ...editAssignData, task: e.target.value })}
                                                                style={{ ...inp, padding: '4px', fontSize: 11, height: 'auto' }}
                                                            >
                                                                <option value="">Whole Phase</option>
                                                                {phaseTasks.map(t => (
                                                                    <option key={t.id} value={t.id}>{t.title}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            a.task_name || '—'
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '10px 14px' }}>
                                                        {isEditingThis ? (
                                                            <select
                                                                value={editAssignData.role_override || ''}
                                                                onChange={e => setEditAssignData({ ...editAssignData, role_override: e.target.value })}
                                                                style={{ ...inp, padding: '4px', fontSize: 11, height: 'auto' }}
                                                            >
                                                                <option value="">Default (Profile)</option>
                                                                {allRoles.map(r => (
                                                                    <option key={r.id} value={r.id}>{r.title}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--t-bg)', color: 'var(--t-text3)', border: '1px solid var(--t-border)' }}>
                                                                {a.role_name || a.role_override_name || 'Standard'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                                            {isEditingThis ? (
                                                                <>
                                                                    <button onClick={() => handleUpdateAssignment(a.id)} disabled={saving} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 12, fontWeight: 800 }}>
                                                                        {saving ? '...' : 'SAVE'}
                                                                    </button>
                                                                    <button onClick={() => setEditingAssignId(null)} style={{ background: 'none', border: 'none', color: 'var(--t-text3)', cursor: 'pointer', fontSize: 12, fontWeight: 800 }}>
                                                                        X
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {canManage && (
                                                                        <button onClick={() => startEditAssignment(a)} style={{ background: 'none', border: 'none', color: 'var(--t-text3)', cursor: 'pointer', fontSize: 12 }}>
                                                                            ✏️
                                                                        </button>
                                                                    )}
                                                                    {canManage && (
                                                                        <button onClick={() => handleDeleteAssignment(a.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                                                                            🗑
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Assign worker form */}
                            {canManage && (
                                <div style={{
                                    padding: 16, borderRadius: 10,
                                    background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                                }}>
                                    <SectionHead label="Assign Worker to Phase" />
                                    <form onSubmit={handleCreateAssignment} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                                        <Field label="Select Worker">
                                            <select style={inp} value={selMember} onChange={e => setSelMember(e.target.value)}>
                                                <option value="">Select Worker…</option>
                                                {allMembers.map(m => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.full_name} ({m.role_name || 'General Labour'})
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="Specific Task (Optional)">
                                            <select style={inp} value={selTask} onChange={e => setSelTask(e.target.value)}>
                                                <option value="">Whole Phase</option>
                                                {phaseTasks.map(t => (
                                                    <option key={t.id} value={t.id}>{t.title}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <button type="submit" disabled={!selMember || saving} style={{
                                            padding: '7px 16px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                            background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer',
                                            opacity: (!selMember || saving) ? 0.5 : 1,
                                        }}>
                                            {saving ? '...' : 'Assign'}
                                        </button>
                                    </form>
                                    <p style={{ fontSize: 9, color: 'var(--t-text3)', marginTop: 8 }}>
                                        * Assigning a worker to this phase will make them available for attendance on this site.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Design & Specs tab */}
                    {activeTab === 'design' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{
                                background: 'var(--t-surface)', borderRadius: 12, border: '1px solid var(--t-border)',
                                padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            }}>
                                <SectionHead label="Engineer's Execution Instructions" />
                                <p style={{ fontSize: 11, color: 'var(--t-text3)', marginBottom: 12 }}>
                                    Provide a detailed step-by-step guide on how to successfully complete this phase.
                                </p>
                                <textarea
                                    value={localPhase.technical_spec || ''}
                                    onChange={e => set('technical_spec', e.target.value)}
                                    placeholder="e.g. 1. Level the ground, 2. Mix concrete 1:2:4, 3. Cure for 14 days..."
                                    style={{
                                        ...inp, width: '100%', minHeight: 180, resize: 'vertical',
                                        fontSize: 13, lineHeight: 1.6, padding: 12,
                                    }}
                                />
                                {canManage && isDirty && (
                                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                                        <button onClick={handleSave} disabled={saving} style={{
                                            padding: '8px 24px', borderRadius: 8, background: '#10b981', color: '#fff',
                                            border: 'none', fontWeight: 900, fontSize: 11, cursor: 'pointer',
                                        }}>
                                            {saving ? 'Saving...' : 'Update Instructions'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                {/* Naksa / Blueprint */}
                                <div style={{
                                    background: 'var(--t-surface)', borderRadius: 12, border: '1px solid var(--t-border)',
                                    padding: 20,
                                }}>
                                    <SectionHead label="Architectural Blueprint (Naksa)" />
                                    {phase.naksa_file ? (
                                        <div style={{ marginBottom: 16 }}>
                                            <a href={getMediaUrl(phase.naksa_file)} target="_blank" rel="noopener noreferrer" style={{
                                                display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                                                background: 'var(--t-surface2)', borderRadius: 8, textDecoration: 'none',
                                                border: '1px solid var(--t-border)',
                                            }}>
                                                <span style={{ fontSize: 24 }}>🗺️</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {phase.naksa_file.split('/').pop()}
                                                    </div>
                                                    <div style={{ fontSize: 9, color: '#f97316', fontWeight: 700 }}>Click to open blueprint</div>
                                                </div>
                                            </a>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '20px 0', textAlign: 'center', border: '1px dashed var(--t-border)', borderRadius: 8, marginBottom: 16, color: 'var(--t-text3)', fontSize: 11 }}>
                                            No naksa file uploaded
                                        </div>
                                    )}
                                    <input type="file" id="naksa-upload" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'naksa_file')} />
                                    <button onClick={() => document.getElementById('naksa-upload').click()} style={{
                                        width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--t-border)',
                                        background: 'var(--t-surface2)', color: 'var(--t-text)', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                                    }}>
                                        {phase.naksa_file ? 'Replace Naksa' : 'Upload Naksa File'}
                                    </button>
                                </div>

                                {/* Structural Design */}
                                <div style={{
                                    background: 'var(--t-surface)', borderRadius: 12, border: '1px solid var(--t-border)',
                                    padding: 20,
                                }}>
                                    <SectionHead label="Structural Design" />
                                    {phase.structure_design ? (
                                        <div style={{ marginBottom: 16 }}>
                                            <a href={getMediaUrl(phase.structure_design)} target="_blank" rel="noopener noreferrer" style={{
                                                display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                                                background: 'var(--t-surface2)', borderRadius: 8, textDecoration: 'none',
                                                border: '1px solid var(--t-border)',
                                            }}>
                                                <span style={{ fontSize: 24 }}>🏗️</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {phase.structure_design.split('/').pop()}
                                                    </div>
                                                    <div style={{ fontSize: 9, color: '#3b82f6', fontWeight: 700 }}>Click to open structural design</div>
                                                </div>
                                            </a>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '20px 0', textAlign: 'center', border: '1px dashed var(--t-border)', borderRadius: 8, marginBottom: 16, color: 'var(--t-text3)', fontSize: 11 }}>
                                            No structural design uploaded
                                        </div>
                                    )}
                                    <input type="file" id="structure-upload" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'structure_design')} />
                                    <button onClick={() => document.getElementById('structure-upload').click()} style={{
                                        width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--t-border)',
                                        background: 'var(--t-surface2)', color: 'var(--t-text)', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                                    }}>
                                        {phase.structure_design ? 'Replace Structural' : 'Upload Structural File'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmCfg.isOpen}
                title={confirmCfg.title}
                message={confirmCfg.message}
                confirmText={confirmCfg.confirmText}
                type={confirmCfg.type}
                onConfirm={confirmCfg.onConfirm}
                onCancel={() => setConfirmCfg(c => ({ ...c, isOpen: false }))}
            />
        </div>
    );
}
