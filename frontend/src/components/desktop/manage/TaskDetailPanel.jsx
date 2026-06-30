/**
 * TaskDetailPanel — Premium redesigned standalone panel for task details.
 * Features:
 *   • Ultra-modern premium SaaS layout (Linear/Stripe aesthetic)
 *   • Glassmorphic cards with soft shadows and custom HSL gradients
 *   • High contrast scannable detail grid with modern micro-animations
 *   • Interactive, animated status/priority cycle pills
 *   • Gorgeous visual media proof gallery with absolute hover overlays
 */
import React, { useState, useEffect, useRef } from 'react';
import { getMediaUrl } from '../../../services/api';
import { useConstruction } from '../../../context/ConstructionContext';
import imageCompression from 'browser-image-compression';
import FilePreviewModal from '../../common/FilePreviewModal';
import ConfirmModal from '../../common/ConfirmModal';
import { getStatusAction } from '../../../shared/utils/statusWorkflow';
import { daysUntilDate, isTaskOverdue } from '../../../shared/utils/taskSchedule';

function useIsMobile() {
    const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
    useEffect(() => {
        const fn = () => setMobile(window.innerWidth < 1024);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);
    return mobile;
}

const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const daysLeft = daysUntilDate;

const STATUS_META = {
    COMPLETED:   { label: 'Completed',   color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
    IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)' },
    BLOCKED:     { label: 'Blocked',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    PENDING:     { label: 'Pending',     color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
};

const PRIORITY_META = {
    CRITICAL: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)' },
    HIGH:     { label: 'High',     color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)' },
    MEDIUM:   { label: 'Medium',   color: '#eab308', bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.2)' },
    LOW:      { label: 'Low',      color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
};

function Pill({ label, color, bg, border, onClick, title }) {
    const [hover, setHover] = useState(false);
    return (
        <span
            onClick={onClick}
            title={title}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                fontSize: 10, fontWeight: 800, padding: '5px 12px', borderRadius: 8,
                background: bg, color, border: `1px solid ${border || `${color}30`}`,
                cursor: onClick ? 'pointer' : 'default',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
                transform: hover && onClick ? 'scale(1.05) translateY(-0.5px)' : 'none',
                boxShadow: hover && onClick ? `0 4px 12px ${color}15` : 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
            {label}
        </span>
    );
}

function SectionHead({ label, icon }) {
    return (
        <div style={{
            fontSize: 10, fontWeight: 900, color: 'var(--t-text3)',
            textTransform: 'uppercase', letterSpacing: '0.14em',
            borderBottom: '1px solid var(--t-border)', paddingBottom: 8, marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8,
        }}>
            <span>{icon}</span>
            <span>{label}</span>
        </div>
    );
}

function MetaCard({ label, value, icon, accent, onClick }) {
    const [hover, setHover] = useState(false);
    return (
        <div 
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                padding: '16px 20px', borderRadius: 16,
                background: 'var(--t-surface2, rgba(255,255,255,0.015))', 
                border: '1px solid var(--t-border)',
                cursor: onClick ? 'pointer' : 'default',
                transform: hover && onClick ? 'translateY(-2px)' : 'none',
                borderColor: hover && onClick ? (accent || 'var(--t-primary)') : 'var(--t-border)',
                boxShadow: hover && onClick ? '0 10px 25px -5px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex', alignItems: 'center', gap: 14,
            }}
        >
            <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: accent ? `${accent}12` : 'rgba(255,255,255,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: accent || 'var(--t-text3)', flexShrink: 0,
                border: `1px solid ${accent ? `${accent}25` : 'var(--t-border)'}`,
            }}>
                {icon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                    {label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: accent || 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value || '—'}
                </div>
            </div>
        </div>
    );
}

function MediaItem({ m, onPreview }) {
    const [hover, setHover] = useState(false);
    return (
        <div 
            onClick={() => onPreview({ file: m.file, name: m.file?.split('/').pop() })}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'block', borderRadius: 14, overflow: 'hidden',
                border: '1px solid var(--t-border)', background: 'var(--t-surface2, rgba(255,255,255,0.015))',
                aspectRatio: '16/10', position: 'relative',
                transform: hover ? 'translateY(-3px) scale(1.01)' : 'none',
                boxShadow: hover ? '0 12px 30px -5px rgba(0,0,0,0.3)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
            }}
        >
            {m.media_type === 'IMAGE' ? (
                <img src={getMediaUrl(m.file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : m.media_type === 'VIDEO' ? (
                <video src={getMediaUrl(m.file)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                    <span style={{ fontSize: 32 }}>📄</span>
                    <span style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 800, textAlign: 'center', padding: '0 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '90%' }}>
                        {m.file.split('/').pop().slice(-25)}
                    </span>
                </div>
            )}
            
            <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: hover ? 1 : 0, transition: 'all 0.2s ease',
            }}>
                <span style={{ 
                    color: '#fff', fontSize: 11, fontWeight: 800, 
                    border: '1px solid rgba(255,255,255,0.3)', padding: '5px 14px', 
                    borderRadius: 20, background: 'rgba(255,255,255,0.1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                }}>
                    View Document
                </span>
            </div>
        </div>
    );
}

export default function TaskDetailPanel({ taskId, onBack, onPhaseClick }) {
    const {
        dashboardData, updateTask, deleteTask,
        uploadTaskMedia, formatCurrency, dispatchGlobalUpload,
        user,
    } = useConstruction();

    const fileInputRef = useRef(null);
    const isMobile = useIsMobile();
    const task = (dashboardData.tasks || []).find(t => t.id === taskId);

    const canManage = user?.is_system_admin || user?.can_manage_phases;
    const isEditing = canManage;
    const [formData,  setFormData]  = useState({});
    const [loading,   setLoading]   = useState(false);
    const [statusChanging, setStatusChanging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null); // { file, name } for FilePreviewModal
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    useEffect(() => {
        if (task) setFormData({ ...task });
    }, [taskId, task?.id]);

    const isDirty = React.useMemo(() => {
        if (!task) return false;
        return (
            (formData.title !== undefined && formData.title !== task.title) ||
            (formData.description !== undefined && formData.description !== task.description) ||
            (formData.priority !== undefined && formData.priority !== task.priority) ||
            (formData.due_date !== undefined && formData.due_date !== task.due_date) ||
            (formData.start_date !== undefined && formData.start_date !== task.start_date) ||
            (formData.completed_date !== undefined && formData.completed_date !== task.completed_date) ||
            (formData.estimated_cost !== undefined && formData.estimated_cost !== task.estimated_cost) ||
            (formData.progress_percentage !== undefined && formData.progress_percentage !== task.progress_percentage) ||
            (formData.room !== undefined && formData.room !== task.room) ||
            (formData.category !== undefined && formData.category !== task.category) ||
            (formData.status !== undefined && formData.status !== task.status) ||
            (formData.phase !== undefined && formData.phase !== task.phase) ||
            (formData.assigned_to !== undefined && formData.assigned_to !== task.assigned_to)
        );
    }, [formData, task]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleNav = (action) => {
        if (isDirty) {
            setPendingAction(() => action);
            setShowDiscardConfirm(true);
        } else {
            action();
        }
    };

    if (!task) {
        return (
            <div style={{ padding: isMobile ? 32 : 64, textAlign: 'center', color: 'var(--t-text3)' }}>
                <p style={{ fontSize: 48 }}>🔍</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t-text)', marginBottom: 20 }}>Task details not found</p>
                <button onClick={onBack} style={{
                    padding: '10px 24px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                    background: 'var(--t-primary)', color: '#fff', border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 15px var(--t-primary-shadow)',
                }}>← Go Back</button>
            </div>
        );
    }

    const sm   = STATUS_META[task.status]     || STATUS_META.PENDING;
    const pm   = PRIORITY_META[task.priority] || PRIORITY_META.MEDIUM;
    const dl   = daysLeft(task.due_date);
    const phase          = (dashboardData.phases         || []).find(p => p.id === task.phase);
    const overdue = isTaskOverdue(task, phase ? [phase] : []);
    const assignedMember = task.assigned_to_detail
        || (dashboardData.contractors || []).find(c => String(c.id) === String(task.assigned_to));
    const assignedTeam   = task.assigned_team_detail || null;
    const assignmentType = task.assignment_type || (assignedTeam ? 'team' : assignedMember ? 'individual' : 'unassigned');
    const room           = (dashboardData.rooms         || []).find(r => r.id === task.room);
    const cat            = (dashboardData.budgetCategories || []).find(c => c.id === task.category);

    const PRIORITY_LEVELS  = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const statusAction = getStatusAction('task', task.status);

    const handleStatusAction = async () => {
        setStatusChanging(true);
        try {
            await updateTask(task.id, { status: statusAction.nextStatus });
        } catch {
            alert('Failed to update task status.');
        } finally {
            setStatusChanging(false);
        }
    };
    
    const cyclePriority = () => {
        const idx  = PRIORITY_LEVELS.indexOf(task.priority);
        const next = PRIORITY_LEVELS[(idx + 1) % PRIORITY_LEVELS.length];
        handleFieldSave({ priority: next });
    };

    const handleFieldSave = async (data) => {
        try { await updateTask(task.id, data); }
        catch { alert('Failed to update task.'); }
    };

    const handleFullSave = async () => {
        setLoading(true);
        try {
            await updateTask(task.id, formData);
        } catch { alert('Failed to save.'); }
        finally { setLoading(false); }
    };

    const handleDelete = async () => {
        setLoading(true);
        try { await deleteTask(task.id); onBack(); }
        catch { alert('Failed to delete.'); }
        finally { setLoading(false); }
    };

    const handleUpload = async (e) => {
        const raw = e.target.files[0];
        if (!raw) return;
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
        fd.append('task', task.id);
        fd.append('file', file);
        fd.append('media_type', mediaType);
        try {
            dispatchGlobalUpload(uploadTaskMedia, fd, file.name || 'Task Media');
        }
        catch { alert('Upload failed.'); }
        finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const inp = {
        width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        border: '1px solid var(--t-border)', background: 'var(--t-surface2, rgba(255,255,255,0.015))',
        color: 'var(--t-text)', outline: 'none', boxSizing: 'border-box',
        transition: 'all 0.2s',
    };

    return (
        <div style={{ minHeight: '100%' }}>
            {previewDoc && (
                <FilePreviewModal
                    file={previewDoc.file}
                    name={previewDoc.name}
                    onClose={() => setPreviewDoc(null)}
                />
            )}
            
            {/* ── Breadcrumb & Actions Bar ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                padding: isMobile ? '12px 16px' : '12px 28px',
                background: 'var(--t-surface)', borderBottom: '1px solid var(--t-border)',
                position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap',
                backdropFilter: 'blur(12px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    {/* One step back → phase detail */}
                    <button 
                        onClick={() => handleNav(onBack)} 
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                            padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                            background: 'var(--t-surface2)', color: 'var(--t-text)',
                            border: '1px solid var(--t-border)', cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                        ← Back
                    </button>

                    {/* Breadcrumb: Phases › Phase Name › Task #id */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, minWidth: 0, overflow: 'hidden' }}>
                        {/* Phases root link */}
                        <button
                            onClick={() => handleNav(() => onPhaseClick ? onPhaseClick(null) : onBack?.())}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                fontSize: 12, fontWeight: 700, color: 'var(--t-primary)',
                                whiteSpace: 'nowrap', flexShrink: 0,
                            }}
                        >📋 Phases</button>
                        {phase && (
                            <>
                                <span style={{ color: 'var(--t-text3)', fontSize: 14, flexShrink: 0 }}>›</span>
                                {/* Phase name link — goes back to phase detail */}
                                <button
                                    onClick={() => handleNav(onBack)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                        fontSize: 12, fontWeight: 700, color: 'var(--t-primary)',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        maxWidth: isMobile ? 90 : 160, flexShrink: 1,
                                    }}
                                    title={phase.name}
                                >{phase.name}</button>
                            </>
                        )}
                        <span style={{ color: 'var(--t-text3)', fontSize: 14, flexShrink: 0 }}>›</span>
                        {/* Current task */}
                        <span style={{
                            fontSize: 12, fontWeight: 900, color: 'var(--t-text)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            maxWidth: isMobile ? 90 : 200, flexShrink: 1,
                        }}>{task.name || `Task #${task.id}`}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                    {canManage && (
                        <>
                            <button
                                type="button"
                                onClick={handleStatusAction}
                                disabled={statusChanging}
                                title={`${statusAction.label}: ${statusAction.dateHint}`}
                                style={{
                                    padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 850,
                                    background: statusAction.color, color: '#fff', border: 'none',
                                    cursor: statusChanging ? 'wait' : 'pointer', opacity: statusChanging ? 0.65 : 1,
                                    boxShadow: `0 4px 14px ${statusAction.color}35`,
                                    flex: isMobile ? '1 1 100%' : '0 0 auto',
                                }}
                            >
                                {statusChanging ? 'Updating…' : `${statusAction.icon} ${statusAction.label}`}
                            </button>
                            <button 
                                onClick={handleFullSave} 
                                disabled={loading || !isDirty} 
                                style={{
                                    padding: '7px 18px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                                    background: isDirty ? '#10b981' : 'var(--t-surface2)', 
                                    color: isDirty ? '#fff' : 'var(--t-text3)', 
                                    border: isDirty ? 'none' : '1px solid var(--t-border)',
                                    cursor: isDirty ? 'pointer' : 'not-allowed',
                                    opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
                                    boxShadow: isDirty ? '0 4px 12px rgba(16,185,129,0.2)' : 'none',
                                    flex: isMobile ? '1 1 100%' : '0 0 auto',
                                }}
                            >
                                {loading ? 'Saving…' : '✓ Save Changes'}
                            </button>
                            {isDirty && (
                                <button 
                                    onClick={() => { 
                                        setFormData({ ...task });
                                    }} 
                                    style={{
                                        padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                                        background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                        border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
                                        flex: isMobile ? '1 1 100%' : '0 0 auto',
                                    }}
                                >
                                    Discard
                                </button>
                            )}
                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                disabled={uploading} 
                                style={{
                                    padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                                    background: 'rgba(16,185,129,0.08)', color: '#10b981',
                                    border: '1px solid rgba(16,185,129,0.25)', cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flex: isMobile ? '1 1 100%' : '0 0 auto',
                                }}
                            >
                                {uploading ? '⏳ Uploading…' : '📤 Upload Proof'}
                            </button>
                            <button 
                                onClick={() => setShowDeleteConfirm(true)} 
                                style={{
                                    padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                                    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                    border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    flex: isMobile ? '1 1 100%' : '0 0 auto',
                                }}
                            >
                                🗑️
                            </button>
                        </>
                    )}
                </div>
            </div>

            <input type="file" ref={fileInputRef} style={{ display: 'none' }}
                accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleUpload} />

            {/* ── Delete Confirmation banner ── */}
            {showDeleteConfirm && (
                <div style={{
                    margin: isMobile ? '16px 20px' : '20px 32px', padding: 20, borderRadius: 16,
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
                    display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#ef4444', margin: 0 }}>⚠️ Delete this task permanently?</p>
                    <p style={{ fontSize: 12, color: 'var(--t-text3)', margin: '0 0 12px' }}>
                        This action cannot be undone. All task logs, data, and proof files will be destroyed.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={handleDelete} disabled={loading} style={{
                            padding: '8px 20px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                            background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer',
                        }}>{loading ? 'Deleting…' : 'Confirm Delete'}</button>
                        <button onClick={() => setShowDeleteConfirm(false)} style={{
                            padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                            background: 'var(--t-surface2)', color: 'var(--t-text)',
                            border: '1px solid var(--t-border)', cursor: 'pointer',
                        }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* ── Main Dashboard Layout Grid ── */}
            <div style={{ 
                padding: isMobile ? '20px' : '28px 32px', 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', 
                gap: 24 
            }}>

                {/* ── LEFT COLUMN: Title & Details Cards ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* 1. Header Card (Title, Status, Priority) */}
                    <div style={{
                        background: 'var(--t-surface)', borderRadius: 18,
                        border: '1px solid var(--t-border)',
                        borderLeft: `4px solid ${pm.color}`,
                        padding: 24,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    }}>
                        {isEditing ? (
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 9, fontWeight: 900, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Task Title</label>
                                <input style={{ ...inp, fontSize: 16, fontWeight: 800 }}
                                    value={formData.title || ''}
                                    onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                                    placeholder="Enter task title…" />
                            </div>
                        ) : (
                            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--t-text)', margin: '0 0 14px', lineHeight: 1.35, letterSpacing: '-0.02em' }}>
                                {task.title}
                            </h2>
                        )}

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: isEditing ? 16 : 0, alignItems: 'center' }}>
                            <Pill
                                label={statusAction.currentLabel} color={sm.color} bg={sm.bg} border={sm.border}
                            />
                            <Pill
                                label={pm.label} color={pm.color} bg={pm.bg} border={pm.border}
                                onClick={!isEditing ? cyclePriority : undefined}
                                title={!isEditing ? 'Click to toggle priority' : undefined}
                            />
                        </div>

                        {isEditing && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 850, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Status</label>
                                    <select style={inp} value={formData.status || ''} onChange={e => setFormData(f => ({ ...f, status: e.target.value }))}>
                                        {['PENDING','IN_PROGRESS','BLOCKED','COMPLETED'].map(s => (
                                            <option key={s} value={s}>{getStatusAction('task', s).currentLabel}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 850, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Priority</label>
                                    <select style={inp} value={formData.priority || ''} onChange={e => setFormData(f => ({ ...f, priority: e.target.value }))}>
                                        {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. Meta Details Card (Phase, Member, Location, Category) */}
                    <div style={{ background: 'var(--t-surface)', borderRadius: 18, border: '1px solid var(--t-border)', padding: 24 }}>
                        <SectionHead label="Assignment & Location" icon="🏗️" />
                        
                        {isEditing ? (
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 850, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Construction Phase</label>
                                    <select style={inp} value={formData.phase || ''} onChange={e => setFormData(f => ({ ...f, phase: parseInt(e.target.value) }))}>
                                        {(dashboardData.phases || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 850, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                                        {assignmentType === 'team' ? '👥 Team Assignment' : 'Worker Assignment'}
                                    </label>
                                    {assignmentType === 'team' ? (
                                        <div style={{
                                            padding: '10px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                            background: 'rgba(139,92,246,0.06)', color: '#8b5cf6',
                                            border: '1px solid rgba(139,92,246,0.2)',
                                        }}>
                                            👥 {assignedTeam?.name} (managed in Workforce)
                                        </div>
                                    ) : (
                                        <select style={inp} value={formData.assigned_to || ''} onChange={e => setFormData(f => ({ ...f, assigned_to: e.target.value || null }))}>
                                            <option value="">Unassigned</option>
                                            {(dashboardData.contractors || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 850, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Room / Location</label>
                                    <select style={inp} value={formData.room || ''} onChange={e => setFormData(f => ({ ...f, room: e.target.value ? parseInt(e.target.value) : null }))}>
                                        <option value="">General Area</option>
                                        {(dashboardData.rooms || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 850, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Budget Category</label>
                                    <select style={inp} value={formData.category || ''} onChange={e => setFormData(f => ({ ...f, category: e.target.value ? parseInt(e.target.value) : null }))}>
                                        <option value="">N/A</option>
                                        {(dashboardData.budgetCategories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                                    <div 
                                        onClick={() => onPhaseClick && phase && onPhaseClick(phase)}
                                        style={{ cursor: onPhaseClick && phase ? 'pointer' : 'default' }}
                                    >
                                        <MetaCard 
                                            label="Phase" 
                                            value={phase ? `📋 ${phase.name}` : 'General Phase'} 
                                            icon="📋" 
                                            accent={onPhaseClick && phase ? '#f97316' : undefined} 
                                        />
                                    </div>
                                    <MetaCard
                                        label={assignmentType === 'team' ? 'Assigned Team' : 'Assigned Worker'}
                                        value={
                                            assignmentType === 'team' && assignedTeam
                                                ? `👥 ${assignedTeam.name} (${assignedTeam.member_count} members)`
                                                : assignedMember
                                                    ? `👤 ${assignedMember.name}`
                                                    : 'Unassigned'
                                        }
                                        icon={assignmentType === 'team' ? '👥' : '👤'}
                                        accent={assignmentType === 'team' ? '#8b5cf6' : assignedMember ? '#3b82f6' : undefined}
                                    />
                                </div>

                                {assignmentType === 'team' && assignedTeam?.members?.length > 0 && (
                                    <div style={{
                                        background: 'rgba(139,92,246,0.04)',
                                        border: '1px solid rgba(139,92,246,0.15)',
                                        borderRadius: 14, padding: '12px 18px',
                                        display: 'flex', flexWrap: 'wrap', gap: 8,
                                    }}>
                                        {assignedTeam.members.map(m => (
                                            <span key={m.id} style={{
                                                fontSize: 10, fontWeight: 800,
                                                background: 'rgba(139,92,246,0.08)',
                                                color: '#8b5cf6',
                                                padding: '4px 10px', borderRadius: 8,
                                                border: '1px solid rgba(139,92,246,0.15)',
                                            }}>👤 {m.name}</span>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                                    <MetaCard label="Room / Area" value={room ? `📍 ${room.name}` : 'General Area'} icon="📍" />
                                    <MetaCard label="Budget Category" value={cat ? `💰 ${cat.name}` : 'N/A'} icon="💰" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT COLUMN: Timeline, Cost & Description ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    
                    {/* 3. Timeline & Budget Card */}
                    <div style={{ background: 'var(--t-surface)', borderRadius: 18, border: '1px solid var(--t-border)', padding: 24 }}>
                        <SectionHead label="Timeline & Costs" icon="📅" />
                        
                        {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[
                                    { key: 'start_date',     label: 'Start Date',     type: 'date'   },
                                    { key: 'completed_date', label: 'Completed On',   type: 'date'   },
                                    { key: 'estimated_cost', label: 'Estimated Cost', type: 'number' },
                                ].map(({ key, label, type }) => (
                                    <div key={key}>
                                        <label style={{ fontSize: 9, fontWeight: 850, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>{label}</label>
                                        <input type={type} style={inp}
                                            value={formData[key] || ''}
                                            onChange={e => setFormData(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))} />
                                    </div>
                                ))}
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 850, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Progress %</label>
                                    <input type="number" min={0} max={100} style={inp}
                                        value={formData.progress_percentage || 0}
                                        onChange={e => setFormData(f => ({ ...f, progress_percentage: parseInt(e.target.value) || 0 }))} />
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                    <MetaCard label="Start Date" value={fmt(task.start_date)} icon="🛫" />
                                    <MetaCard label="Completed On" value={fmt(task.completed_date)} icon="✓" accent={task.completed_date ? '#10b981' : undefined} />
                                    <MetaCard 
                                        label="Estimated Cost" 
                                        value={formatCurrency ? formatCurrency(task.estimated_cost) : `Rs. ${Number(task.estimated_cost || 0).toLocaleString()}`} 
                                        icon="💳" 
                                        accent="#f97316" 
                                    />
                                </div>

                                {task.progress_percentage > 0 && (
                                    <div style={{ marginTop: 6 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: 10, color: 'var(--t-text3)', fontWeight: 800 }}>TASK COMPLETION</span>
                                            <span style={{ fontSize: 10, fontWeight: 900, color: '#3b82f6' }}>{task.progress_percentage}%</span>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 3, background: 'var(--t-border)', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', width: `${task.progress_percentage}%`, borderRadius: 3,
                                                background: task.progress_percentage === 100 ? '#10b981' : '#3b82f6',
                                            }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 4. Description Card */}
                    <div style={{ background: 'var(--t-surface)', borderRadius: 18, border: '1px solid var(--t-border)', padding: 24 }}>
                        <SectionHead label="Description" icon="📝" />
                        {isEditing ? (
                            <textarea rows={5} style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
                                value={formData.description || ''}
                                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                                placeholder="Enter detailed task description…" />
                        ) : task.description ? (
                            <p style={{ 
                                fontSize: 13, color: 'var(--t-text2)', lineHeight: 1.7, margin: 0, 
                                whiteSpace: 'pre-wrap', paddingLeft: 12, borderLeft: '3px solid var(--t-border)' 
                            }}>
                                {task.description}
                            </p>
                        ) : (
                            <p style={{ fontSize: 12, color: 'var(--t-text3)', fontStyle: 'italic', margin: 0 }}>No description provided.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── BOTTOM FULL-WIDTH: Proof of Work & Uploaded Files ── */}
            <div style={{ padding: isMobile ? '0 20px 96px' : '0 32px 96px' }}>
                <div style={{ 
                    background: 'var(--t-surface)', borderRadius: 18, 
                    border: '1px solid var(--t-border)', padding: 24 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <SectionHead label={`Proof of Work & Uploaded Files (${task.media?.length || 0})`} icon="📸" />
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={uploading} 
                            style={{
                                padding: '6px 16px', borderRadius: 10, fontSize: 11, fontWeight: 800,
                                background: 'rgba(16,185,129,0.08)', color: '#10b981',
                                border: '1px solid rgba(16,185,129,0.25)', cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                        >
                            {uploading ? '⏳ Uploading…' : '📤 Upload File'}
                        </button>
                    </div>

                    {(!task.media || task.media.length === 0) ? (
                        <div style={{
                            padding: '48px 0', textAlign: 'center',
                            border: '2.5px dashed var(--t-border)', borderRadius: 16,
                            color: 'var(--t-text3)', background: 'var(--t-surface2, rgba(255,255,255,0.01))',
                        }}>
                            <p style={{ fontSize: 36, margin: '0 0 12px' }}>📸</p>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-text)', margin: '0 0 4px' }}>No proofs uploaded yet</p>
                            <p style={{ fontSize: 11, color: 'var(--t-text3)', margin: '0 0 16px' }}>Upload photos or document files as proof of progress.</p>
                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                style={{
                                    padding: '8px 20px', borderRadius: 10, fontSize: 12, fontWeight: 850,
                                    background: 'rgba(16,185,129,0.08)', color: '#10b981',
                                    border: '1px solid rgba(16,185,129,0.25)', cursor: 'pointer',
                                }}
                            >
                                Upload First Proof
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 16 }}>
                            {task.media.map(m => (
                                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <MediaItem m={m} onPreview={setPreviewDoc} />
                                    {m.telegram_uploader_name && (
                                        <div style={{ fontSize: 9, color: 'var(--t-text3)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>
                                            <span>💬 Bot: {m.telegram_uploader_name}</span>
                                        </div>
                                    )}
                                    {m.description && m.description !== 'Uploaded via Telegram' && (
                                        <div style={{ fontSize: 10, color: 'var(--t-text2)', fontWeight: 600, paddingLeft: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.description}>
                                            {m.description}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Footer Audit Bar ── */}
            <div style={{
                margin: isMobile ? '0 20px 48px' : '0 32px 48px',
                padding: '12px 20px', borderRadius: 12,
                background: 'var(--t-surface2, rgba(255,255,255,0.01))', border: '1px solid var(--t-border)',
                fontSize: 10, fontWeight: 800, color: 'var(--t-text3)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                display: 'flex', gap: 16, flexWrap: 'wrap',
            }}>
                <span>System Task ID: #{task.id}</span>
                <span>Created: {fmtShort(task.created_at)}</span>
                <span>Last Updated: {fmtShort(task.updated_at)}</span>
            </div>

            <ConfirmModal
                isOpen={showDiscardConfirm}
                title="Discard Unsaved Changes?"
                message="You have made changes to this task. Leaving this page will discard all unsaved changes."
                confirmText="Discard Changes"
                cancelText="Keep Editing"
                type="danger"
                onConfirm={() => {
                    setShowDiscardConfirm(false);
                    setFormData({ ...task });
                    if (pendingAction) pendingAction();
                }}
                onCancel={() => {
                    setShowDiscardConfirm(false);
                    setPendingAction(null);
                }}
            />
        </div>
    );
}
