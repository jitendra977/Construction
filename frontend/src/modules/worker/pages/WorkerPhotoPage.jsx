/**
 * WorkerPhotoPage.jsx  — Advanced Dark + Colorful Edition
 * ─────────────────────────────────────────────────────────
 * Camera / gallery photo upload page for field workers.
 * Dark theme matching WorkerPortal.jsx color palette.
 *
 * Features:
 *  • Camera capture with live preview area
 *  • Gallery multi-select with thumbnail queue
 *  • Task tagging (optional) + caption
 *  • Animated upload progress per photo
 *  • Gallery grid with fullscreen lightbox + metadata
 *  • Phase grouping in gallery
 *  • Success/error feedback with colored toasts
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import workerPortalApi from '../../../services/workerPortalApi';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
    bg:      '#020617',
    surface: '#0f172a',
    card:    '#0d1826',
    border:  '#1e293b',
    text:    '#f1f5f9',
    muted:   '#64748b',
    dim:     '#94a3b8',
    blue:    '#38bdf8',
    blueD:   '#0369a1',
    green:   '#4ade80',
    greenD:  '#15803d',
    amber:   '#fbbf24',
    red:     '#f87171',
    purple:  '#a78bfa',
};

// ─── CSS ───────────────────────────────────────────────────────────────────────
const STYLES = `
@keyframes wpFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes wpSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
@keyframes wpSpin { to{transform:rotate(360deg)} }
@keyframes wpPop { 0%{transform:scale(.9);opacity:0} 100%{transform:scale(1);opacity:1} }
@keyframes wpToastIn { from{opacity:0;transform:translateX(-50%) translateY(20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
@keyframes wpShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes wpProgressPulse { 0%,100%{opacity:1} 50%{opacity:.6} }
.wp-photo-card { animation:wpFadeIn .22s ease both; }
.wp-photo-card:active { transform:scale(.97); transition:transform .1s; }
.wp-tab-btn { transition:all .15s; }
.wp-spinner { width:24px;height:24px;border:3px solid #1e293b;border-top-color:#38bdf8;border-radius:50%;animation:wpSpin .8s linear infinite;margin:0 auto; }
.wp-toast { animation:wpToastIn .3s ease; }
`;

function injectStyles() {
    if (document.getElementById('worker-photo-styles')) return;
    const s = document.createElement('style');
    s.id = 'worker-photo-styles';
    s.textContent = STYLES;
    document.head.appendChild(s);
}

function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
}

// ─── Upload queue item ─────────────────────────────────────────────────────────
function UploadItem({ item, onRemove }) {
    const preview = URL.createObjectURL(item.file);
    const borderColor = item.error ? C.red : item.done ? C.green : C.border;
    const bgColor = item.error ? 'rgba(248,113,113,.06)' : item.done ? 'rgba(74,222,128,.06)' : C.card;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 14, marginBottom: 8,
            background: bgColor, border: `1px solid ${borderColor}`,
            boxShadow: item.done ? `0 0 10px rgba(74,222,128,.12)` : item.error ? `0 0 10px rgba(248,113,113,.1)` : 'none',
        }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={preview} alt=""
                    style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }} />
                {item.done && (
                    <div style={{
                        position: 'absolute', inset: 0, borderRadius: 10,
                        background: 'rgba(74,222,128,.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18,
                    }}>✓</div>
                )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.text }}>
                    {item.file.name}
                </p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                    {(item.file.size / 1024).toFixed(0)} KB
                </p>
                {item.uploading && (
                    <div style={{ marginTop: 6, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: 2, width: `${item.progress}%`,
                            background: `linear-gradient(90deg, ${C.blueD}, ${C.blue})`,
                            transition: 'width .2s',
                            boxShadow: `0 0 6px ${C.blue}60`,
                            animation: 'wpProgressPulse 1.2s infinite',
                        }} />
                    </div>
                )}
                {item.error && (
                    <p style={{ fontSize: 11, color: C.red, margin: '4px 0 0', fontWeight: 600 }}>⚠️ {item.error}</p>
                )}
                {item.done && (
                    <p style={{ fontSize: 11, color: C.green, margin: '4px 0 0', fontWeight: 700 }}>✅ Uploaded</p>
                )}
            </div>
            {!item.uploading && !item.done && (
                <button onClick={() => onRemove(item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18, padding: 4, flexShrink: 0 }}>
                    ✕
                </button>
            )}
        </div>
    );
}

// ─── Photo thumbnail ───────────────────────────────────────────────────────────
function PhotoThumb({ photo, onClick }) {
    return (
        <div className="wp-photo-card" onClick={() => onClick(photo)}
            style={{ cursor: 'pointer', position: 'relative', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <img src={photo.url} alt={photo.task_name}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(2,6,23,.85))',
                padding: '20px 6px 6px',
            }}>
                <p style={{ fontSize: 10, color: '#fff', margin: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {photo.task_name || 'Untagged'}
                </p>
            </div>
            {/* AI badge */}
            {photo.quality_score && (
                <div style={{
                    position: 'absolute', top: 5, right: 5,
                    background: photo.quality_score > 7 ? C.green : photo.quality_score > 4 ? C.amber : C.red,
                    color: '#000', fontSize: 9, fontWeight: 800,
                    padding: '2px 5px', borderRadius: 6,
                }}>
                    ★{photo.quality_score}
                </div>
            )}
        </div>
    );
}

// ─── Lightbox viewer ──────────────────────────────────────────────────────────
function Lightbox({ photo, onClose, onPrev, onNext }) {
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') onNext?.();
            if (e.key === 'ArrowLeft') onPrev?.();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, onNext, onPrev]);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            background: 'rgba(2,6,23,.97)', backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Top bar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'rgba(15,23,42,.6)',
            }}>
                <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{photo.task_name || 'Site Photo'}</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{formatDate(photo.created_at)}</p>
                </div>
                <button onClick={onClose}
                    style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: C.text, width: 36, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 16 }}>
                    ✕
                </button>
            </div>

            {/* Image */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', padding: '0 60px',
            }} onClick={onClose}>
                <img src={photo.url} alt=""
                    style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12, objectFit: 'contain', animation: 'wpPop .25s ease' }}
                    onClick={e => e.stopPropagation()} />

                {onPrev && (
                    <button onClick={e => { e.stopPropagation(); onPrev(); }}
                        style={{
                            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,.1)', border: 'none', color: C.text,
                            width: 40, height: 40, borderRadius: 10, cursor: 'pointer', fontSize: 18,
                        }}>‹</button>
                )}
                {onNext && (
                    <button onClick={e => { e.stopPropagation(); onNext(); }}
                        style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,.1)', border: 'none', color: C.text,
                            width: 40, height: 40, borderRadius: 10, cursor: 'pointer', fontSize: 18,
                        }}>›</button>
                )}
            </div>

            {/* Bottom metadata */}
            <div style={{ padding: '16px 20px', background: 'rgba(15,23,42,.6)' }}>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                    {photo.phase_name && (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>PHASE</p>
                            <p style={{ fontSize: 12, color: C.blue, fontWeight: 700, margin: '2px 0 0' }}>{photo.phase_name}</p>
                        </div>
                    )}
                    {photo.description && (
                        <div style={{ textAlign: 'center', maxWidth: 200 }}>
                            <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>NOTE</p>
                            <p style={{ fontSize: 12, color: C.dim, fontWeight: 600, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {photo.description}
                            </p>
                        </div>
                    )}
                    {photo.quality_score && (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>QUALITY</p>
                            <p style={{ fontSize: 12, color: photo.quality_score > 7 ? C.green : C.amber, fontWeight: 700, margin: '2px 0 0' }}>
                                ★ {photo.quality_score}/10
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, color, onDone }) {
    useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
    return (
        <div className="wp-toast" style={{
            position: 'fixed', bottom: 110, left: '50%', transform: 'translateX(-50%)',
            background: color || C.green, color: '#000',
            padding: '11px 22px', borderRadius: 14, fontSize: 13, fontWeight: 800,
            zIndex: 2000, whiteSpace: 'nowrap', boxShadow: `0 4px 24px ${color || C.green}50`,
        }}>
            {message}
        </div>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function WorkerPhotoPage() {
    useEffect(() => { injectStyles(); }, []);

    const [tab, setTab]             = useState('upload');
    const [tasks, setTasks]         = useState([]);
    const [selectedTask, setTask]   = useState('');
    const [description, setDesc]    = useState('');
    const [queue, setQueue]         = useState([]);
    const [uploading, setUploading] = useState(false);
    const [photos, setPhotos]       = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [lightbox, setLightbox]   = useState(null);  // index into photos[]
    const [toast, setToast]         = useState(null);   // { message, color }
    const [galleryFilter, setFilter] = useState('');    // filter by phase/task name
    const fileInputRef = useRef(null);
    const cameraRef    = useRef(null);

    useEffect(() => {
        // Use all project tasks (not just assigned-to-me) so any task can be tagged.
        workerPortalApi.getProjectTasks()
            .then(t => setTasks(Array.isArray(t) ? t.filter(x => x.status !== 'COMPLETED') : []))
            .catch(() => {
                // Fallback to assigned tasks if project-tasks endpoint fails
                workerPortalApi.getTasks()
                    .then(t => setTasks(Array.isArray(t) ? t.filter(x => x.status !== 'COMPLETED') : []))
                    .catch(() => {});
            });
    }, []);

    const loadPhotos = useCallback(() => {
        setLoadingPhotos(true);
        workerPortalApi.getPhotos()
            .then(p => setPhotos(Array.isArray(p) ? p : []))
            .catch(() => {})
            .finally(() => setLoadingPhotos(false));
    }, []);

    useEffect(() => {
        if (tab === 'gallery') loadPhotos();
    }, [tab, loadPhotos]);

    const onFilePick = (e) => {
        const files = Array.from(e.target.files || []);
        const items = files.map(f => ({
            id: Math.random().toString(36).slice(2),
            file: f,
            progress: 0,
            uploading: false,
            done: false,
            error: '',
        }));
        setQueue(q => [...q, ...items]);
        e.target.value = '';
    };

    const removeFromQueue = (id) => setQueue(q => q.filter(i => i.id !== id));

    const uploadAll = async () => {
        const pending = queue.filter(i => !i.done && !i.uploading);
        if (!pending.length) return;
        setUploading(true);
        let successCount = 0;
        for (const item of pending) {
            setQueue(q => q.map(i => i.id === item.id ? { ...i, uploading: true, error: '' } : i));
            try {
                // task is optional — pass null/undefined if none selected
                const taskId = selectedTask ? Number(selectedTask) : null;
                await workerPortalApi.uploadPhoto(
                    item.file, taskId, description,
                    (pct) => setQueue(q => q.map(i => i.id === item.id ? { ...i, progress: pct } : i)),
                );
                setQueue(q => q.map(i => i.id === item.id ? { ...i, uploading: false, done: true, progress: 100 } : i));
                successCount++;
            } catch (e) {
                const msg = e.response?.data?.error || e.response?.data?.file?.[0] || 'Upload failed';
                setQueue(q => q.map(i => i.id === item.id ? { ...i, uploading: false, error: msg } : i));
            }
        }
        setUploading(false);
        setDesc('');
        if (successCount > 0) {
            setToast({ message: `✅ ${successCount} photo${successCount !== 1 ? 's' : ''} uploaded`, color: C.green });
        }
    };

    const doneCount    = queue.filter(i => i.done).length;
    const pendingCount = queue.filter(i => !i.done && !i.uploading).length;
    const canUpload    = pendingCount > 0 && !uploading;

    // Gallery filtering + grouping by phase
    const filteredPhotos = photos.filter(p =>
        !galleryFilter
        || p.task_name?.toLowerCase().includes(galleryFilter.toLowerCase())
        || p.phase_name?.toLowerCase().includes(galleryFilter.toLowerCase())
    );

    const photosByPhase = filteredPhotos.reduce((acc, p) => {
        const key = p.phase_name || 'Untagged';
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
    }, {});

    // Flat index for lightbox prev/next
    const flatPhotos = filteredPhotos;

    return (
        <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 100, color: C.text }}>

            {/* ── Header ── */}
            <div style={{
                padding: '20px 20px 0',
                background: C.surface,
                borderBottom: `1px solid ${C.border}`,
                position: 'sticky', top: 0, zIndex: 50,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: C.text }}>Site Photos</h2>
                        <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
                            {photos.length > 0 ? `${photos.length} photos uploaded` : 'Document your work'}
                        </p>
                    </div>
                    {tab === 'gallery' && (
                        <button onClick={loadPhotos} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                            ↻
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                    {[
                        { key: 'upload',  label: '📷 Upload' },
                        { key: 'gallery', label: `🖼️ Gallery (${photos.length})` },
                    ].map(t => (
                        <button key={t.key} className="wp-tab-btn" onClick={() => setTab(t.key)}
                            style={{
                                flex: 1, padding: '9px 4px', borderRadius: 10, border: 'none',
                                background: tab === t.key
                                    ? `linear-gradient(135deg,${C.blueD},${C.blue})`
                                    : C.card,
                                color: tab === t.key ? '#000' : C.muted,
                                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                                boxShadow: tab === t.key ? `0 4px 14px ${C.blue}40` : 'none',
                            }}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── UPLOAD tab ── */}
            {tab === 'upload' && (
                <div style={{ padding: '16px 16px' }}>

                    {/* Task picker — optional */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                            Tag to task <span style={{ color: C.muted, fontWeight: 500, textTransform: 'none' }}>(optional)</span>
                        </label>
                        <select value={selectedTask} onChange={e => setTask(e.target.value)}
                            style={{
                                width: '100%', padding: '12px 14px', borderRadius: 12,
                                border: `1.5px solid ${C.border}`,
                                fontSize: 13, fontWeight: 600,
                                color: selectedTask ? C.text : C.muted,
                                background: C.card, outline: 'none',
                            }}>
                            <option value="">No task — general site photo</option>
                            {/* Group by phase for easier navigation */}
                            {Object.entries(
                                tasks.reduce((acc, t) => {
                                    const phase = t.phase_name || 'Other';
                                    if (!acc[phase]) acc[phase] = [];
                                    acc[phase].push(t);
                                    return acc;
                                }, {})
                            ).map(([phase, phaseTasks]) => (
                                <optgroup key={phase} label={phase}>
                                    {phaseTasks.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.title}{t.assigned_to_name ? ` (${t.assigned_to_name})` : ''}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <p style={{ fontSize: 11, color: C.muted, margin: '5px 0 0' }}>
                            📌 Tag to a task for better tracking, or leave blank for general photos
                        </p>
                    </div>

                    {/* Caption */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                            Caption (optional)
                        </label>
                        <input value={description} onChange={e => setDesc(e.target.value)}
                            placeholder="e.g. Foundation pour — Level 1 complete"
                            style={{
                                width: '100%', padding: '12px 14px', borderRadius: 12,
                                border: `1px solid ${C.border}`, fontSize: 13,
                                background: C.card, color: C.text, outline: 'none', boxSizing: 'border-box',
                            }} />
                    </div>

                    {/* Capture buttons */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                        <button onClick={() => cameraRef.current?.click()}
                            style={{
                                flex: 1, padding: '16px 0', borderRadius: 14,
                                border: `1.5px dashed ${C.blue}`,
                                background: 'rgba(56,189,248,.06)',
                                color: C.blue, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            }}>
                            <span style={{ fontSize: 24 }}>📷</span>
                            <span style={{ fontSize: 11 }}>Camera</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()}
                            style={{
                                flex: 1, padding: '16px 0', borderRadius: 14,
                                border: `1.5px dashed ${C.purple}`,
                                background: 'rgba(167,139,250,.06)',
                                color: C.purple, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            }}>
                            <span style={{ fontSize: 24 }}>🖼️</span>
                            <span style={{ fontSize: 11 }}>Gallery</span>
                        </button>
                    </div>

                    {/* Hidden inputs */}
                    <input ref={cameraRef}    type="file" accept="image/*" capture="environment" multiple onChange={onFilePick} style={{ display: 'none' }} />
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFilePick} style={{ display: 'none' }} />

                    {/* Queue */}
                    {queue.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: C.dim, margin: 0 }}>
                                    {queue.length} photo{queue.length !== 1 ? 's' : ''} selected
                                    {doneCount > 0 && <span style={{ color: C.green }}> · {doneCount} uploaded</span>}
                                </p>
                                {doneCount === queue.length && queue.length > 0 && (
                                    <button onClick={() => setQueue([])}
                                        style={{ fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                                        Clear all
                                    </button>
                                )}
                            </div>
                            {queue.map(item => (
                                <UploadItem key={item.id} item={item} onRemove={removeFromQueue} />
                            ))}
                        </div>
                    )}

                    {/* Upload button */}
                    <button onClick={uploadAll} disabled={!canUpload}
                        style={{
                            width: '100%', padding: '15px', borderRadius: 14, border: 'none',
                            background: canUpload
                                ? `linear-gradient(135deg,${C.blueD},${C.blue})`
                                : C.border,
                            color: canUpload ? '#000' : C.muted,
                            fontSize: 14, fontWeight: 800,
                            cursor: canUpload ? 'pointer' : 'default',
                            boxShadow: canUpload ? `0 4px 20px ${C.blue}40` : 'none',
                            transition: 'all .2s',
                        }}>
                        {uploading
                            ? '⏳ Uploading…'
                            : pendingCount > 0
                                ? `Upload ${pendingCount} Photo${pendingCount !== 1 ? 's' : ''} →`
                                : doneCount > 0
                                    ? '✅ All Uploaded'
                                    : 'Select Photos First'}
                    </button>

                    {/* Hint when queue is empty */}
                    {queue.length === 0 && (
                        <div style={{
                            marginTop: 20, padding: '30px 20px', borderRadius: 16,
                            border: `1.5px dashed ${C.border}`,
                            background: 'rgba(255,255,255,.01)',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: 40, marginBottom: 10 }}>📸</div>
                            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                                Tap <strong style={{ color: C.blue }}>Camera</strong> or <strong style={{ color: C.purple }}>Gallery</strong> to add photos
                            </p>
                            <p style={{ fontSize: 11, color: C.muted, margin: '6px 0 0', opacity: .7 }}>
                                No task selection needed — just tap and upload
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── GALLERY tab ── */}
            {tab === 'gallery' && (
                <div style={{ padding: '14px 16px' }}>

                    {/* Search */}
                    {photos.length > 0 && (
                        <div style={{ position: 'relative', marginBottom: 14 }}>
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: C.muted }}>🔍</span>
                            <input
                                value={galleryFilter} onChange={e => setFilter(e.target.value)}
                                placeholder="Filter by task or phase…"
                                style={{
                                    width: '100%', padding: '10px 12px 10px 36px',
                                    borderRadius: 12, border: `1px solid ${C.border}`,
                                    fontSize: 13, background: C.card,
                                    color: C.text, outline: 'none', boxSizing: 'border-box',
                                }} />
                        </div>
                    )}

                    {loadingPhotos && (
                        <div style={{ textAlign: 'center', padding: 60 }}>
                            <div className="wp-spinner" />
                            <p style={{ fontSize: 13, color: C.muted, marginTop: 16 }}>Loading photos…</p>
                        </div>
                    )}

                    {!loadingPhotos && photos.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
                            <div style={{ fontSize: 52, marginBottom: 16 }}>📷</div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: C.dim }}>No photos yet</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>Switch to Upload to add your first photo.</p>
                            <button onClick={() => setTab('upload')}
                                style={{
                                    marginTop: 16, padding: '10px 24px', borderRadius: 12,
                                    background: `linear-gradient(135deg,${C.blueD},${C.blue})`,
                                    color: '#000', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                                }}>
                                Upload Photos →
                            </button>
                        </div>
                    )}

                    {!loadingPhotos && photos.length > 0 && (
                        Object.keys(photosByPhase).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>
                                <p style={{ fontSize: 13 }}>No photos match your filter.</p>
                            </div>
                        ) : (
                            Object.entries(photosByPhase).map(([phase, pList]) => (
                                <div key={phase} style={{ marginBottom: 20 }}>
                                    {/* Phase label */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                        <span style={{ fontSize: 12 }}>📂</span>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: C.blue }}>{phase}</span>
                                        <span style={{ fontSize: 11, color: C.muted }}>({pList.length})</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                                        {pList.map(p => (
                                            <PhotoThumb key={p.id} photo={p} onClick={(ph) => {
                                                const idx = flatPhotos.findIndex(x => x.id === ph.id);
                                                setLightbox(idx);
                                            }} />
                                        ))}
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            )}

            {/* Lightbox */}
            {lightbox !== null && lightbox >= 0 && lightbox < flatPhotos.length && (
                <Lightbox
                    photo={flatPhotos[lightbox]}
                    onClose={() => setLightbox(null)}
                    onPrev={lightbox > 0 ? () => setLightbox(i => i - 1) : null}
                    onNext={lightbox < flatPhotos.length - 1 ? () => setLightbox(i => i + 1) : null}
                />
            )}

            {/* Toast */}
            {toast && <Toast message={toast.message} color={toast.color} onDone={() => setToast(null)} />}
        </div>
    );
}
