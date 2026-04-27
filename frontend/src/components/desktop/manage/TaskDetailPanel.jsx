/**
 * TaskDetailPanel — full-page inline panel for task details.
 * Shown inside PhasesPage when a task is selected (no modal).
 */
import React, { useState, useEffect, useRef } from 'react';
import { getMediaUrl } from '../../../services/api';
import { useConstruction } from '../../../context/ConstructionContext';
import imageCompression from 'browser-image-compression';

/* ── helpers ── */
const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const daysLeft = (s) => s ? Math.round((new Date(s) - new Date()) / 86400000) : null;

const STATUS_META = {
    COMPLETED:   { label: 'Completed',   color: '#10b981', bg: '#10b98115' },
    IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bg: '#3b82f615' },
    BLOCKED:     { label: 'Blocked',     color: '#f59e0b', bg: '#f59e0b15' },
    PENDING:     { label: 'Pending',     color: '#6b7280', bg: '#6b728015' },
};

const PRIORITY_META = {
    CRITICAL: { label: 'Critical', color: '#ef4444', bg: '#ef444415' },
    HIGH:     { label: 'High',     color: '#f97316', bg: '#f9731615' },
    MEDIUM:   { label: 'Medium',   color: '#f59e0b', bg: '#f59e0b15' },
    LOW:      { label: 'Low',      color: '#6b7280', bg: '#6b728015' },
};

function Pill({ label, color, bg, onClick, title }) {
    return (
        <span
            onClick={onClick}
            title={title}
            style={{
                fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 6,
                background: bg, color, border: `1px solid ${color}30`,
                cursor: onClick ? 'pointer' : 'default',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                userSelect: 'none',
            }}
        >{label}</span>
    );
}

function SectionHead({ label }) {
    return (
        <div style={{
            fontSize: 9, fontWeight: 900, color: 'var(--t-text3)',
            textTransform: 'uppercase', letterSpacing: '0.16em',
            borderBottom: '1px solid var(--t-border)', paddingBottom: 6, marginBottom: 12,
        }}>{label}</div>
    );
}

function MetaCard({ label, value, accent }) {
    return (
        <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
        }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                {label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: accent || 'var(--t-text)' }}>
                {value || '—'}
            </div>
        </div>
    );
}

/* ── MediaItem ── */
function MediaItem({ m }) {
    return (
        <a href={getMediaUrl(m.file)} target="_blank" rel="noopener noreferrer"
            style={{
                display: 'block', borderRadius: 10, overflow: 'hidden',
                border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
                aspectRatio: '16/9', position: 'relative',
            }}>
            {m.media_type === 'IMAGE' ? (
                <img src={getMediaUrl(m.file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : m.media_type === 'VIDEO' ? (
                <video src={getMediaUrl(m.file)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                    <span style={{ fontSize: 28 }}>📄</span>
                    <span style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 700, textAlign: 'center', padding: '0 8px' }}>
                        {m.file.split('/').pop().slice(0, 20)}
                    </span>
                </div>
            )}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s',
            }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0'}
            >
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, border: '1px solid rgba(255,255,255,0.4)', padding: '4px 12px', borderRadius: 20 }}>
                    View
                </span>
            </div>
        </a>
    );
}

/* ── Main component ── */
export default function TaskDetailPanel({ taskId, onBack, onPhaseClick }) {
    const {
        dashboardData, updateTask, deleteTask,
        uploadTaskMedia, formatCurrency,
    } = useConstruction();

    const fileInputRef = useRef(null);

    // Live task from context
    const task = (dashboardData.tasks || []).find(t => t.id === taskId);

    const [isEditing, setIsEditing] = useState(false);
    const [formData,  setFormData]  = useState({});
    const [loading,   setLoading]   = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (task) setFormData({ ...task });
    }, [taskId, task?.id]);

    if (!task) {
        return (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--t-text3)' }}>
                <p style={{ fontSize: 32 }}>🔍</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t-text)' }}>Task not found</p>
                <button onClick={onBack} style={{
                    marginTop: 16, padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                    background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer',
                }}>← Go Back</button>
            </div>
        );
    }

    const sm   = STATUS_META[task.status]     || STATUS_META.PENDING;
    const pm   = PRIORITY_META[task.priority] || PRIORITY_META.MEDIUM;
    const dl   = daysLeft(task.due_date);
    const overdue = dl !== null && dl < 0 && task.status !== 'COMPLETED';
    const phase = (dashboardData.phases    || []).find(p => p.id === task.phase);
    const contractor = (dashboardData.contractors || []).find(c => c.id === task.assigned_to);
    const room  = (dashboardData.rooms     || []).find(r => r.id === task.room);
    const cat   = (dashboardData.budgetCategories || []).find(c => c.id === task.category);

    const STATUS_STATUSES  = ['PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];
    const PRIORITY_LEVELS  = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const cycleStatus   = () => {
        const idx  = STATUS_STATUSES.indexOf(task.status);
        const next = STATUS_STATUSES[(idx + 1) % STATUS_STATUSES.length];
        handleFieldSave({ status: next });
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
            setIsEditing(false);
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
        try { await uploadTaskMedia(fd); }
        catch { alert('Upload failed.'); }
        finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const inp = {
        width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12,
        border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
        color: 'var(--t-text)', outline: 'none', boxSizing: 'border-box',
    };

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
                    ← Back
                </button>
                <span style={{ fontSize: 12, color: 'var(--t-text3)' }}>Task Detail</span>
                <span style={{ fontSize: 12, color: 'var(--t-text3)' }}>›</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                </span>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {!isEditing ? (
                        <>
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
                                padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer',
                            }}>
                                {uploading ? '⏳ Uploading…' : '📤 Upload'}
                            </button>
                            <button onClick={() => setIsEditing(true)} style={{
                                padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                background: 'rgba(249,115,22,0.1)', color: '#f97316',
                                border: '1px solid rgba(249,115,22,0.3)', cursor: 'pointer',
                            }}>✏️ Edit</button>
                            <button onClick={() => setShowDeleteConfirm(true)} style={{
                                padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
                            }}>🗑</button>
                        </>
                    ) : (
                        <>
                            <button onClick={handleFullSave} disabled={loading} style={{
                                padding: '5px 16px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer',
                                opacity: loading ? 0.6 : 1,
                            }}>{loading ? 'Saving…' : '✓ Save'}</button>
                            <button onClick={() => setIsEditing(false)} style={{
                                padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                background: 'var(--t-surface2)', color: 'var(--t-text)',
                                border: '1px solid var(--t-border)', cursor: 'pointer',
                            }}>Cancel</button>
                        </>
                    )}
                </div>
            </div>

            <input type="file" ref={fileInputRef} style={{ display: 'none' }}
                accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleUpload} />

            {/* ── Delete confirm ── */}
            {showDeleteConfirm && (
                <div style={{
                    margin: '16px 24px', padding: 16, borderRadius: 10,
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#ef4444', margin: '0 0 6px' }}>Delete this task?</p>
                    <p style={{ fontSize: 11, color: 'var(--t-text3)', margin: '0 0 12px' }}>
                        This cannot be undone. All task data and proofs will be permanently removed.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleDelete} disabled={loading} style={{
                            padding: '6px 18px', borderRadius: 7, fontSize: 11, fontWeight: 800,
                            background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer',
                        }}>Yes, Delete</button>
                        <button onClick={() => setShowDeleteConfirm(false)} style={{
                            padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                            background: 'var(--t-surface2)', color: 'var(--t-text)',
                            border: '1px solid var(--t-border)', cursor: 'pointer',
                        }}>Cancel</button>
                    </div>
                </div>
            )}

            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                {/* ── LEFT column ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Title + status + priority */}
                    <div style={{
                        background: 'var(--t-surface)', borderRadius: 14,
                        border: '1px solid var(--t-border)',
                        borderLeft: `4px solid ${pm.color}`,
                        padding: 20,
                    }}>
                        {isEditing ? (
                            <input style={{ ...inp, fontSize: 16, fontWeight: 800, marginBottom: 14 }}
                                value={formData.title || ''}
                                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                                placeholder="Task title…" />
                        ) : (
                            <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--t-text)', margin: '0 0 12px', lineHeight: 1.3 }}>
                                {task.title}
                            </h2>
                        )}

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                            <Pill
                                label={sm.label} color={sm.color} bg={sm.bg}
                                onClick={!isEditing ? cycleStatus : undefined}
                                title={!isEditing ? 'Click to cycle status' : undefined}
                            />
                            <Pill
                                label={pm.label} color={pm.color} bg={pm.bg}
                                onClick={!isEditing ? cyclePriority : undefined}
                                title={!isEditing ? 'Click to cycle priority' : undefined}
                            />
                            {overdue && (
                                <Pill label={`${Math.abs(dl)}d overdue`} color="#ef4444" bg="#ef444415" />
                            )}
                        </div>

                        {isEditing && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Status</label>
                                    <select style={inp} value={formData.status || ''} onChange={e => setFormData(f => ({ ...f, status: e.target.value }))}>
                                        {['PENDING','IN_PROGRESS','BLOCKED','COMPLETED'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Priority</label>
                                    <select style={inp} value={formData.priority || ''} onChange={e => setFormData(f => ({ ...f, priority: e.target.value }))}>
                                        {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Meta: phase, contractor, room, category */}
                    <div style={{ background: 'var(--t-surface)', borderRadius: 14, border: '1px solid var(--t-border)', padding: 20 }}>
                        <SectionHead label="Task Details" />
                        {isEditing ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Phase</label>
                                    <select style={inp} value={formData.phase || ''} onChange={e => setFormData(f => ({ ...f, phase: parseInt(e.target.value) }))}>
                                        {(dashboardData.phases || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Contractor</label>
                                    <select style={inp} value={formData.assigned_to || ''} onChange={e => setFormData(f => ({ ...f, assigned_to: e.target.value ? parseInt(e.target.value) : null }))}>
                                        <option value="">Unassigned</option>
                                        {(dashboardData.contractors || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Room / Location</label>
                                    <select style={inp} value={formData.room || ''} onChange={e => setFormData(f => ({ ...f, room: e.target.value ? parseInt(e.target.value) : null }))}>
                                        <option value="">General Area</option>
                                        {(dashboardData.rooms || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Category</label>
                                    <select style={inp} value={formData.category || ''} onChange={e => setFormData(f => ({ ...f, category: e.target.value ? parseInt(e.target.value) : null }))}>
                                        <option value="">N/A</option>
                                        {(dashboardData.budgetCategories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div
                                    onClick={() => onPhaseClick && phase && onPhaseClick(phase)}
                                    style={{ cursor: onPhaseClick && phase ? 'pointer' : 'default' }}
                                >
                                    <MetaCard label="Phase" value={phase ? `📋 ${phase.name}` : 'Unknown'} accent={onPhaseClick && phase ? '#f97316' : undefined} />
                                </div>
                                <MetaCard label="Contractor" value={contractor ? `👤 ${contractor.name}` : 'Unassigned'} />
                                <MetaCard label="Location" value={room ? `📍 ${room.name}` : 'General Area'} />
                                <MetaCard label="Category" value={cat?.name || 'N/A'} />
                            </div>
                        )}
                    </div>

                    {/* Timeline + cost */}
                    <div style={{ background: 'var(--t-surface)', borderRadius: 14, border: '1px solid var(--t-border)', padding: 20 }}>
                        <SectionHead label="Timeline & Budget" />
                        {isEditing ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {[
                                    { key: 'start_date',     label: 'Start Date',       type: 'date'   },
                                    { key: 'due_date',       label: 'Due Date',         type: 'date'   },
                                    { key: 'completed_date', label: 'Completed On',     type: 'date'   },
                                    { key: 'estimated_cost', label: 'Estimated Cost',   type: 'number' },
                                ].map(({ key, label, type }) => (
                                    <div key={key}>
                                        <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{label}</label>
                                        <input type={type} style={inp}
                                            value={formData[key] || ''}
                                            onChange={e => setFormData(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))} />
                                    </div>
                                ))}
                                <div>
                                    <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Progress %</label>
                                    <input type="number" min={0} max={100} style={inp}
                                        value={formData.progress_percentage || 0}
                                        onChange={e => setFormData(f => ({ ...f, progress_percentage: parseInt(e.target.value) || 0 }))} />
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <MetaCard label="Start Date"     value={fmt(task.start_date)} />
                                <MetaCard label="Due Date"
                                    value={task.due_date
                                        ? `${fmt(task.due_date)}${overdue ? ` (${Math.abs(dl)}d over)` : dl !== null && dl <= 3 ? ` (${dl}d left)` : ''}`
                                        : 'TBD'}
                                    accent={overdue ? '#ef4444' : dl !== null && dl <= 3 ? '#f59e0b' : undefined}
                                />
                                <MetaCard label="Completed On"   value={fmt(task.completed_date)} accent={task.completed_date ? '#10b981' : undefined} />
                                <MetaCard label="Estimated Cost"
                                    value={formatCurrency ? formatCurrency(task.estimated_cost) : `Rs. ${Number(task.estimated_cost || 0).toLocaleString()}`}
                                    accent="#f97316"
                                />
                            </div>
                        )}

                        {/* Progress bar */}
                        {!isEditing && (task.progress_percentage > 0) && (
                            <div style={{ marginTop: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, color: 'var(--t-text3)', fontWeight: 700 }}>Progress</span>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: '#3b82f6' }}>{task.progress_percentage}%</span>
                                </div>
                                <div style={{ height: 5, borderRadius: 3, background: 'var(--t-border)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', width: `${task.progress_percentage}%`, borderRadius: 3,
                                        background: task.progress_percentage === 100 ? '#10b981' : '#3b82f6',
                                    }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Audit row */}
                    <div style={{
                        display: 'flex', gap: 16,
                        padding: '10px 14px', borderRadius: 8,
                        background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
                        fontSize: 9, fontWeight: 700, color: 'var(--t-text3)',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                        <span>ID: #{task.id}</span>
                        <span>Created: {fmtShort(task.created_at)}</span>
                        <span>Updated: {fmtShort(task.updated_at)}</span>
                    </div>
                </div>

                {/* ── RIGHT column: description + media ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Description */}
                    <div style={{ background: 'var(--t-surface)', borderRadius: 14, border: '1px solid var(--t-border)', padding: 20 }}>
                        <SectionHead label="Description" />
                        {isEditing ? (
                            <textarea rows={6} style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
                                value={formData.description || ''}
                                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                                placeholder="Describe this task…" />
                        ) : task.description ? (
                            <p style={{ fontSize: 13, color: 'var(--t-text2)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                                {task.description}
                            </p>
                        ) : (
                            <p style={{ fontSize: 12, color: 'var(--t-text3)', fontStyle: 'italic', margin: 0 }}>No description provided.</p>
                        )}
                    </div>

                    {/* Media / Proofs */}
                    <div style={{ background: 'var(--t-surface)', borderRadius: 14, border: '1px solid var(--t-border)', padding: 20, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <SectionHead label={`Proof of Work & Files (${task.media?.length || 0})`} />
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
                                padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                                background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer',
                            }}>
                                {uploading ? '⏳' : '📤 Upload'}
                            </button>
                        </div>

                        {(!task.media || task.media.length === 0) ? (
                            <div style={{
                                padding: '40px 0', textAlign: 'center',
                                border: '1px dashed var(--t-border)', borderRadius: 10,
                                color: 'var(--t-text3)',
                            }}>
                                <p style={{ fontSize: 28, margin: '0 0 8px' }}>📸</p>
                                <p style={{ fontSize: 12, margin: 0 }}>No proofs uploaded yet</p>
                                <button onClick={() => fileInputRef.current?.click()} style={{
                                    marginTop: 12, padding: '6px 18px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                    background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                    border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer',
                                }}>Upload First Proof</button>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                                {task.media.map(m => <MediaItem key={m.id} m={m} />)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
