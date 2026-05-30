/**
 * WorkerPhotoPage.jsx
 * Camera / gallery photo upload page for field workers.
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
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Camera, FolderOpen, RefreshCw, Search, UploadCloud } from 'lucide-react';
import workerPortalApi from '../../../services/workerPortalApi';
import VoiceNoteInput from '../../../components/common/VoiceNoteInput';
import { useTheme } from '../../../context/ThemeContext';
import { useWorkerUpload } from '../../../context/WorkerUploadContext';

const TRANSLATIONS = {
    en: {
        title: "Live site photo upload",
        subtitle: "Saves photo with user, time, page, and current GPS context.",
        upload: "Upload",
        gallery: "Gallery",
        gpsActive: "Smart Site Telemetry Active",
        gpsSub: "Saves photo with user, time, page, and current GPS context automatically.",
        gpsOk: "GPS OK",
        gpsError: "GPS Error",
        gpsLocating: "Locating...",
        attachTask: "Attach to task",
        optional: "optional",
        noTask: "— No task —",
        taskHelp: "Select a task first, then take or upload photo/video.",
        note: "Note",
        noteLabel: "What is being captured?",
        notePlaceholder: "Tap Voice Typing or start typing...",
        livePhoto: "Live Photo",
        livePhotoSub: "Open camera and capture directly",
        galleryVideo: "Gallery / Video",
        galleryVideoSub: "Pick photos or video from device",
        readyToSave: "✓ Media Ready to Save",
        retakeCancel: "Retake / Cancel",
        gpsContext: "📍 GPS CONTEXT:",
        user: "👤 USER:",
        time: "⏱️ TIME:",
        page: "📄 PAGE:",
        saving: "Saving to Server...",
        saveBtn: "Save & Upload Photo",
        permissionDenied: "Permission denied",
        locatingGps: "Locating GPS...",
        uploadedSuccess: "Photo uploaded successfully!",
        emptyPhotos: "No photos yet",
        switchUpload: "Switch to Upload to add your first photo.",
        uploadPhotosBtn: "Upload Photos",
        filterPlaceholder: "Filter by task or phase...",
        loadingPhotos: "Loading photos...",
        noMatchFilter: "No photos match your filter.",
    },
    ne: {
        title: "लाइभ साइट फोटो अपलोड",
        subtitle: "प्रयोक्ता, समय, पृष्ठ र हालको GPS विवरण सहित फोटो सुरक्षित गर्दछ।",
        upload: "अपलोड",
        gallery: "ग्यालरी",
        gpsActive: "स्मार्ट साइट टेलिमेट्री सक्रिय",
        gpsSub: "प्रयोक्ता, समय, पृष्ठ र हालको GPS विवरण सहित फोटो स्वतः सुरक्षित गर्दछ।",
        gpsOk: "GPS ठीक छ",
        gpsError: "GPS त्रुटि",
        gpsLocating: "खोज्दै...",
        attachTask: "कार्यमा जोड्नुहोस्",
        optional: "ऐच्छिक",
        noTask: "— कुनै कार्य छैन —",
        taskHelp: "पहिलो कार्य चयन गर्नुहोस्, त्यसपछि फोटो/भिडियो खिच्नुहोस् वा अपलोड गर्नुहोस्।",
        note: "टिप्पणी",
        noteLabel: "फोटोको विवरण",
        notePlaceholder: "आवाज टाइपिंग ट्याप गर्नुहोस् वा टाइप गर्न सुरु गर्नुहोस्...",
        livePhoto: "लाइभ फोटो",
        livePhotoSub: "क्यामेरा खोली सिधै खिच्नुहोस्",
        galleryVideo: "ग्यालरी / भिडियो",
        galleryVideoSub: "डिभाइसबाट फोटो वा भिडियो रोज्नुहोस्",
        readyToSave: "✓ मिडिया सुरक्षित गर्न तयार छ",
        retakeCancel: "पुनः खिच्नुहोस् / रद्द गर्नुहोस्",
        gpsContext: "📍 GPS सन्दर्भ:",
        user: "👤 प्रयोक्ता:",
        time: "⏱️ समय:",
        page: "📄 पृष्ठ:",
        saving: "सर्भरमा सुरक्षित गर्दै...",
        saveBtn: "फोटो सुरक्षित र अपलोड गर्नुहोस्",
        permissionDenied: "अनुमति अस्वीकृत",
        locatingGps: "GPS खोज्दै...",
        uploadedSuccess: "फोटो सफलतापूर्वक अपलोड भयो!",
        emptyPhotos: "अहिलेसम्म कुनै फोटो छैन",
        switchUpload: "तपाईंको पहिलो फोटो थप्न अपलोडमा जानुहोस्।",
        uploadPhotosBtn: "फोटोहरू अपलोड गर्नुहोस्",
        filterPlaceholder: "कार्य वा चरण द्वारा फिल्टर गर्नुहोस्...",
        loadingPhotos: "फोटोहरू लोड हुँदैछ...",
        noMatchFilter: "तपाईंको फिल्टरसँग मिल्ने कुनै फोटो छैन।",
    }
};

// ─── Design tokens ─────────────────────────────────────────────────────────────
function getPalette(theme) {
    if (theme === 'light') {
        return {
            bg: '#f8fafc',
            surface: '#ffffff',
            card: '#f8fafc',
            border: '#dbe4ee',
            text: '#0f172a',
            muted: '#64748b',
            dim: '#475569',
            blue: '#2563eb',
            blueD: '#1d4ed8',
            green: '#16a34a',
            greenD: '#15803d',
            amber: '#d97706',
            red: '#dc2626',
            purple: '#7c3aed',
            shadow: '0 20px 48px rgba(15,23,42,0.08)',
            overlay: 'rgba(248,250,252,0.96)',
        };
    }
    return {
        bg: '#020617',
        surface: '#0f172a',
        card: '#0d1826',
        border: '#1e293b',
        text: '#f1f5f9',
        muted: '#64748b',
        dim: '#94a3b8',
        blue: '#38bdf8',
        blueD: '#0369a1',
        green: '#4ade80',
        greenD: '#15803d',
        amber: '#fbbf24',
        red: '#f87171',
        purple: '#a78bfa',
        shadow: '0 24px 60px rgba(2,6,23,0.32)',
        overlay: 'rgba(2,6,23,0.96)',
    };
}

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
function UploadItem({ item, onRemove, c }) {
    const preview = URL.createObjectURL(item.file);
    const borderColor = item.error ? c.red : item.done ? c.green : c.border;
    const bgColor = item.error ? 'rgba(248,113,113,.06)' : item.done ? 'rgba(74,222,128,.06)' : c.card;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 14, marginBottom: 8,
            background: bgColor, border: `1px solid ${borderColor}`,
            boxShadow: item.done ? `0 0 10px rgba(74,222,128,.12)` : item.error ? `0 0 10px rgba(248,113,113,.1)` : 'none',
        }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={preview} alt=""
                    style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 14, border: `1px solid ${c.border}` }} />
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
                <p style={{ fontSize: 13, fontWeight: 800, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: c.text }}>
                    {item.file.name}
                </p>
                <p style={{ fontSize: 11, color: c.muted, margin: 0 }}>
                    {(item.file.size / 1024).toFixed(0)} KB
                </p>
                {item.uploading && (
                    <div style={{ marginTop: 8, height: 5, background: c.border, borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: 999, width: `${item.progress}%`,
                            background: `linear-gradient(90deg, ${c.blueD}, ${c.blue})`,
                            transition: 'width .2s',
                            boxShadow: `0 0 6px ${c.blue}60`,
                            animation: 'wpProgressPulse 1.2s infinite',
                        }} />
                    </div>
                )}
                {item.error && (
                    <p style={{ fontSize: 11, color: c.red, margin: '6px 0 0', fontWeight: 700 }}>{item.error}</p>
                )}
                {item.done && (
                    <p style={{ fontSize: 11, color: c.green, margin: '6px 0 0', fontWeight: 800 }}>Uploaded</p>
                )}
            </div>
            {!item.uploading && !item.done && (
                <button onClick={() => onRemove(item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, fontSize: 18, padding: 4, flexShrink: 0 }}>
                    ✕
                </button>
            )}
        </div>
    );
}

// ─── Photo thumbnail ───────────────────────────────────────────────────────────
function PhotoThumb({ photo, onClick, c }) {
    return (
        <div className="wp-photo-card" onClick={() => onClick(photo)}
            style={{ cursor: 'pointer', position: 'relative', borderRadius: 18, overflow: 'hidden', border: `1px solid ${c.border}`, background: c.card, boxShadow: c.shadow }}>
            <img src={photo.url} alt={photo.task_name}
                style={{ width: '100%', aspectRatio: '1.1', objectFit: 'cover', display: 'block' }} />
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: themeAwareGradient(c),
                padding: '28px 10px 10px',
            }}>
                <p style={{ fontSize: 11, color: '#fff', margin: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {photo.task_name || 'Untagged'}
                </p>
                {photo.phase_name && (
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,.78)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {photo.phase_name}
                    </p>
                )}
            </div>
            {photo.quality_score && (
                <div style={{
                    position: 'absolute', top: 10, right: 10,
                    background: photo.quality_score > 7 ? c.green : photo.quality_score > 4 ? c.amber : c.red,
                    color: '#000', fontSize: 9, fontWeight: 800,
                    padding: '4px 7px', borderRadius: 999,
                }}>
                    ★{photo.quality_score}
                </div>
            )}
        </div>
    );
}

// ─── Lightbox viewer ──────────────────────────────────────────────────────────
function themeAwareGradient(c) {
    return c.bg === '#f8fafc'
        ? 'linear-gradient(transparent, rgba(15,23,42,.76))'
        : 'linear-gradient(transparent, rgba(2,6,23,.88))';
}

function Lightbox({ photo, onClose, onPrev, onNext, c }) {
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
            background: c.overlay, backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Top bar */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                background: c.bg === '#f8fafc' ? 'rgba(255,255,255,.82)' : 'rgba(15,23,42,.6)',
            }}>
                <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: c.text, margin: 0 }}>{photo.task_name || 'Site Photo'}</p>
                    <p style={{ fontSize: 11, color: c.muted, margin: '2px 0 0' }}>{formatDate(photo.created_at)}</p>
                </div>
                <button onClick={onClose}
                    style={{ background: c.bg === '#f8fafc' ? 'rgba(15,23,42,.08)' : 'rgba(255,255,255,.1)', border: 'none', color: c.text, width: 36, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 16 }}>
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
                            background: c.bg === '#f8fafc' ? 'rgba(15,23,42,.08)' : 'rgba(255,255,255,.1)', border: 'none', color: c.text,
                            width: 40, height: 40, borderRadius: 10, cursor: 'pointer', fontSize: 18,
                        }}>‹</button>
                )}
                {onNext && (
                    <button onClick={e => { e.stopPropagation(); onNext(); }}
                        style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            background: c.bg === '#f8fafc' ? 'rgba(15,23,42,.08)' : 'rgba(255,255,255,.1)', border: 'none', color: c.text,
                            width: 40, height: 40, borderRadius: 10, cursor: 'pointer', fontSize: 18,
                        }}>›</button>
                )}
            </div>

            {/* Bottom metadata */}
            <div style={{ padding: '16px 20px', background: c.bg === '#f8fafc' ? 'rgba(255,255,255,.82)' : 'rgba(15,23,42,.6)' }}>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                    {photo.phase_name && (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 10, color: c.muted, margin: 0 }}>PHASE</p>
                            <p style={{ fontSize: 12, color: c.blue, fontWeight: 700, margin: '2px 0 0' }}>{photo.phase_name}</p>
                        </div>
                    )}
                    {photo.description && (
                        <div style={{ textAlign: 'center', maxWidth: 200 }}>
                            <p style={{ fontSize: 10, color: c.muted, margin: 0 }}>NOTE</p>
                            <p style={{ fontSize: 12, color: c.dim, fontWeight: 600, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {photo.description}
                            </p>
                        </div>
                    )}
                    {photo.quality_score && (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 10, color: c.muted, margin: 0 }}>QUALITY</p>
                            <p style={{ fontSize: 12, color: photo.quality_score > 7 ? c.green : c.amber, fontWeight: 700, margin: '2px 0 0' }}>
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
function Toast({ message, color, onDone, c }) {
    useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
    return (
        <div className="wp-toast" style={{
            position: 'fixed', bottom: 110, left: '50%', transform: 'translateX(-50%)',
            background: color || c.green, color: '#fff',
            padding: '11px 22px', borderRadius: 14, fontSize: 13, fontWeight: 800,
            zIndex: 2000, whiteSpace: 'nowrap', boxShadow: `0 4px 24px ${color || c.green}50`,
        }}>
            {message}
        </div>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function WorkerPhotoPage() {
    useEffect(() => { injectStyles(); }, []);
    const { theme } = useTheme();
    const c = useMemo(() => getPalette(theme), [theme]);

    const [tab, setTab]             = useState('upload');
    const [tasks, setTasks]         = useState([]);
    const [selectedTask, setTask]   = useState('');
    const [description, setDesc]    = useState('');
    const [queue, setQueue]         = useState([]);
    const [photos, setPhotos]       = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [lightbox, setLightbox]   = useState(null);  // index into photos[]
    const [toast, setToast]         = useState(null);   // { message, color }
    const [galleryFilter, setFilter] = useState('');    // filter by phase/task name
    const [gps, setGps]             = useState(null);   // GPS context
    const [lang, setLang]           = useState('ne');   // Language state: 'en' or 'ne'
    const fileInputRef = useRef(null);
    const cameraRef    = useRef(null);
    const { dispatchWorkerUpload } = useWorkerUpload();

    useEffect(() => {
        // Fetch GPS coordinates immediately on mount
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setGps({
                        lat: position.coords.latitude.toFixed(6),
                        lng: position.coords.longitude.toFixed(6),
                        accuracy: position.coords.accuracy.toFixed(0),
                    });
                },
                (err) => {
                    setGps({ error: err.message || "GPS access denied" });
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            setGps({ error: "Geolocation not supported" });
        }
    }, []);

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

    const uploadAll = useCallback(() => {
        const pending = queue.filter(i => !i.done && !i.error);
        if (!pending.length) return;

        const currentWorker = workerPortalApi.getCurrentWorker();
        const workerName = currentWorker ? (currentWorker.name || `${currentWorker.first_name || ''} ${currentWorker.last_name || ''}`.trim() || 'Worker') : 'Worker';
        const timeStr = new Date().toLocaleString('en-IN', { hour12: true });
        const gpsStr = gps && !gps.error ? `📍 GPS Context: ${gps.lat}, ${gps.lng} (±${gps.accuracy}m)` : '📍 GPS Context: Unknown / Not allowed';
        const finalDescription = `${description ? `${description}\n\n` : ''}— Captured by: ${workerName}\n— Time: ${timeStr}\n— Page: Worker Portal Photo Upload\n— Context: ${gpsStr}`;

        for (const item of pending) {
            const taskId = selectedTask ? Number(selectedTask) : null;
            const filename = item.file.name;

            // Mark item as uploading in the local queue UI immediately
            setQueue(q => q.map(i => i.id === item.id ? { ...i, uploading: true, error: '' } : i));

            // Dispatch to global background upload manager
            dispatchWorkerUpload(
                (onProgress) => workerPortalApi.uploadPhoto(
                    item.file, taskId, finalDescription,
                    (pct) => {
                        // Update local queue progress
                        setQueue(q => q.map(i => i.id === item.id ? { ...i, progress: pct } : i));
                        // Also pass raw event to dispatchWorkerUpload
                        onProgress({ loaded: pct, total: 100 });
                    }
                ).then(() => {
                    setQueue([]);
                    setTask('');
                    setDesc('');
                    setToast({ message: TRANSLATIONS[lang || 'en'].uploadedSuccess, color: '#10b981' });
                    loadPhotos();
                }).catch(e => {
                    const msg = e.response?.data?.error || e.response?.data?.file?.[0] || 'Upload failed';
                    setQueue(q => q.map(i => i.id === item.id ? { ...i, uploading: false, error: msg } : i));
                    throw e;
                }),
                filename,
            );
        }

        setDesc('');
    }, [description, dispatchWorkerUpload, queue, selectedTask, gps, lang, loadPhotos]);

    const doneCount    = queue.filter(i => i.done).length;
    const pendingCount = queue.filter(i => !i.done && !i.uploading).length;
    const uploading    = queue.some(i => i.uploading);
    const canUpload    = pendingCount > 0;

    const t = TRANSLATIONS[lang || 'en'];

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
        <div style={{ minHeight: '100vh', background: c.bg, paddingBottom: 160, color: c.text }}>

            {/* ── Header ── */}
            <div style={{
                background: c.surface,
                borderBottom: `1px solid ${c.border}`,
                position: 'sticky', top: 0, zIndex: 50,
                boxShadow: c.shadow,
                overflow: 'hidden',
            }}>
                {/* Hero strip */}
                <div style={{
                    padding: '18px 20px 0',
                    background: `linear-gradient(135deg, rgba(56,189,248,.12) 0%, rgba(167,139,250,.08) 100%)`,
                    borderBottom: `1px solid ${c.border}`,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 12,
                                    background: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 18, boxShadow: '0 4px 12px rgba(99,102,241,.4)',
                                }}>📸</div>
                                <div>
                                    <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: c.text, lineHeight: 1.1 }}>{t.title}</h2>
                                    <p style={{ fontSize: 10, color: c.muted, margin: '2px 0 0', fontWeight: 600, maxWidth: 190, lineHeight: 1.2 }}>
                                        {t.subtitle}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* Language Selector */}
                            <button onClick={() => setLang(l => l === 'en' ? 'ne' : 'en')}
                                style={{
                                    background: c.card, border: `1.5px solid ${c.border}`, borderRadius: 12,
                                    padding: '6px 10px', fontSize: 11, fontWeight: 800, color: c.text, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                                }}>
                                <span>{lang === 'en' ? '🇳🇵' : '🇬🇧'}</span>
                                <span>{lang === 'en' ? 'नेपाली' : 'English'}</span>
                            </button>

                            {tab === 'gallery' && (
                                <button onClick={loadPhotos} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, color: c.muted, width: 34, height: 34, cursor: 'pointer' }}>
                                    <RefreshCw size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 0, background: `${c.border}40`, borderRadius: 14, padding: 3, marginBottom: 16 }}>
                        {[
                            { key: 'upload',  icon: '📤', label: t.upload },
                            { key: 'gallery', icon: '🖼️', label: `${t.gallery}${photos.length > 0 ? ` (${photos.length})` : ''}` },
                        ].map(tItem => (
                            <button key={tItem.key} className="wp-tab-btn" onClick={() => setTab(tItem.key)}
                                style={{
                                    flex: 1, padding: '10px 6px', borderRadius: 11, border: 'none',
                                    background: tab === tItem.key
                                        ? `linear-gradient(135deg,${c.blueD},${c.blue})`
                                        : 'transparent',
                                    color: tab === tItem.key ? '#fff' : c.muted,
                                    fontSize: 12, fontWeight: 800, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    boxShadow: tab === tItem.key ? `0 4px 14px ${c.blue}40` : 'none',
                                    transition: 'all .2s',
                                }}>
                                <span>{tItem.icon}</span> {tItem.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── UPLOAD tab ── */}
            {tab === 'upload' && (
                <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 20 }} className="wp-fade">
                    
                    {/* ── GPS Context Banner ── */}
                    <div style={{
                        background: `linear-gradient(135deg, ${c.blue}12, ${c.purple}08)`,
                        border: `1.5px solid ${c.border}`,
                        borderRadius: 20,
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                    }}>
                        <div style={{ fontSize: 24 }}>🛰️</div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 900, color: c.text, margin: 0 }}>{t.gpsActive}</p>
                            <p style={{ fontSize: 11, color: c.muted, margin: '2px 0 0', lineHeight: 1.4 }}>
                                {t.gpsSub}
                            </p>
                        </div>
                        {gps && !gps.error ? (
                            <div style={{ background: c.green + '22', color: c.green, padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>
                                {t.gpsOk}
                            </div>
                        ) : (
                            <div style={{ background: c.amber + '22', color: c.amber, padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>
                                {gps?.error ? t.gpsError : t.gpsLocating}
                            </div>
                        )}
                    </div>

                    {/* ── SECTION 1: ATTACH TO TASK ── */}
                    <div style={{
                        borderRadius: 22, border: `1.5px solid ${selectedTask ? c.blue : c.border}`,
                        background: c.surface, overflow: 'hidden', transition: 'all 0.3s'
                    }}>
                        <div style={{
                            padding: '14px 18px', background: selectedTask ? `${c.blue}10` : `${c.border}30`,
                            borderBottom: `1px solid ${selectedTask ? `${c.blue}20` : c.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 18 }}>📎</span>
                                <span style={{ fontSize: 14, fontWeight: 900, color: c.text }}>{t.attachTask}</span>
                            </div>
                            <span style={{ fontSize: 10, color: c.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.optional}</span>
                        </div>

                        <div style={{ padding: 18 }}>
                            <select value={selectedTask} onChange={e => setTask(e.target.value)}
                                style={{
                                    width: '100%', padding: '12px 14px', borderRadius: 14,
                                    border: `1.5px solid ${selectedTask ? c.blue : c.border}`,
                                    fontSize: 13, fontWeight: 700,
                                    color: selectedTask ? c.text : c.muted,
                                    background: c.card, outline: 'none',
                                    transition: 'border .2s',
                                }}>
                                <option value="">{t.noTask}</option>
                                {Object.entries(
                                    tasks.reduce((acc, tItem) => {
                                        const phase = tItem.phase_name || 'Other';
                                        if (!acc[phase]) acc[phase] = [];
                                        acc[phase].push(tItem);
                                        return acc;
                                    }, {})
                                ).map(([phase, phaseTasks]) => (
                                    <optgroup key={phase} label={phase}>
                                        {phaseTasks.map(tItem => (
                                            <option key={tItem.id} value={tItem.id}>
                                                {tItem.title}{tItem.assigned_to_name ? ` · ${tItem.assigned_to_name}` : ''}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <p style={{ fontSize: 11, color: c.muted, margin: '8px 0 0 4px', lineHeight: 1.4 }}>
                                {t.taskHelp}
                            </p>
                        </div>
                    </div>

                    {/* ── SECTION 2: NOTE & VOICE TYPING ── */}
                    <div style={{
                        borderRadius: 22, border: `1.5px solid ${description ? c.purple : c.border}`,
                        background: c.surface, overflow: 'hidden', transition: 'all 0.3s'
                    }}>
                        <div style={{
                            padding: '14px 18px', background: description ? `${c.purple}10` : `${c.border}30`,
                            borderBottom: `1px solid ${description ? `${c.purple}20` : c.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 18 }}>📝</span>
                                <span style={{ fontSize: 14, fontWeight: 900, color: c.text }}>{t.note}</span>
                            </div>
                            <span style={{ fontSize: 10, color: c.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.optional}</span>
                        </div>

                        <div style={{ padding: 18 }}>
                            <p style={{ fontSize: 11, fontWeight: 800, color: c.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                                {t.noteLabel}
                            </p>
                            <VoiceNoteInput
                                value={description}
                                onChange={setDesc}
                                rows={3}
                                placeholder={t.notePlaceholder}
                                textareaStyle={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: 14,
                                    border: `1.5px solid ${description ? c.purple : c.border}`,
                                    fontSize: 13,
                                    background: c.card,
                                    color: c.text,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    resize: 'none',
                                    minHeight: 76,
                                    transition: 'border .2s',
                                }}
                            />
                        </div>
                    </div>

                    {/* ── SECTION 3: CAPTURE BUTTONS ── */}
                    {queue.length === 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {/* Live Photo */}
                            <button onClick={() => cameraRef.current?.click()}
                                style={{
                                    padding: '20px 14px 18px', borderRadius: 22, border: `1px solid ${c.border}`, cursor: 'pointer',
                                    background: c.surface,
                                    boxShadow: c.shadow,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                    transition: 'transform .1s',
                                    textAlign: 'center'
                                }}
                                className="wp-photo-card"
                            >
                                <div style={{ fontSize: 32 }}>📷</div>
                                <div style={{ fontSize: 14, fontWeight: 900, color: c.text }}>{t.livePhoto}</div>
                                <div style={{ fontSize: 10, color: c.muted, lineHeight: 1.3 }}>
                                    {t.livePhotoSub}
                                </div>
                            </button>

                            {/* Gallery / Video */}
                            <button onClick={() => fileInputRef.current?.click()}
                                style={{
                                    padding: '20px 14px 18px', borderRadius: 22, border: `1px solid ${c.border}`, cursor: 'pointer',
                                    background: c.surface,
                                    boxShadow: c.shadow,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                    transition: 'transform .1s',
                                    textAlign: 'center'
                                }}
                                className="wp-photo-card"
                            >
                                <div style={{ fontSize: 32 }}>🖼️</div>
                                <div style={{ fontSize: 14, fontWeight: 900, color: c.text }}>{t.galleryVideo}</div>
                                <div style={{ fontSize: 10, color: c.muted, lineHeight: 1.3 }}>
                                    {t.galleryVideoSub}
                                </div>
                            </button>
                        </div>
                    ) : (
                        /* Selected Media & Metadata Summary Preview */
                        <div style={{
                            borderRadius: 22, border: `2px solid ${c.green}`,
                            background: c.surface, overflow: 'hidden',
                            boxShadow: `0 12px 30px ${c.green}15`
                        }}>
                            <div style={{ padding: '12px 18px', background: `${c.green}10`, borderBottom: `1px solid ${c.green}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: 900, color: c.green, textTransform: 'uppercase', letterSpacing: '.05em' }}>{t.readyToSave}</span>
                                <button onClick={() => setQueue([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.red, fontSize: 11, fontWeight: 800 }}>
                                    {t.retakeCancel}
                                </button>
                            </div>

                            <div style={{ padding: 18 }}>
                                <div style={{ display: 'flex', gap: 16, marginBottom: 18, alignItems: 'center' }}>
                                    <img 
                                        src={URL.createObjectURL(queue[queue.length - 1].file)} 
                                        alt="Preview" 
                                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 14, border: `1px solid ${c.border}` }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 13, fontWeight: 800, color: c.text, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {queue[queue.length - 1].file.name}
                                        </p>
                                        <p style={{ fontSize: 11, color: c.muted, margin: 0 }}>
                                            Size: {(queue[queue.length - 1].file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>

                                {/* Metadata List */}
                                <div style={{ background: c.card, borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, border: `1px solid ${c.border}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                        <span style={{ color: c.muted, fontWeight: 700 }}>{t.user}</span>
                                        <span style={{ color: c.text, fontWeight: 800 }}>
                                            {workerPortalApi.getCurrentWorker()?.name || "Logged Worker"}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                        <span style={{ color: c.muted, fontWeight: 700 }}>{t.time}</span>
                                        <span style={{ color: c.text, fontWeight: 800 }}>{new Date().toLocaleTimeString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                        <span style={{ color: c.muted, fontWeight: 700 }}>{t.page}</span>
                                        <span style={{ color: c.text, fontWeight: 800 }}>Worker Portal</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, alignItems: 'center' }}>
                                        <span style={{ color: c.muted, fontWeight: 700 }}>{t.gpsContext}</span>
                                        <span style={{ color: gps && !gps.error ? c.green : c.amber, fontWeight: 800 }}>
                                            {gps && !gps.error ? `${gps.lat}, ${gps.lng} (±${gps.accuracy}m)` : gps?.error ? t.permissionDenied : t.locatingGps}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Hidden input references */}
                    <input ref={cameraRef}    type="file" accept="image/*,video/*" capture="environment" onChange={onFilePick} style={{ display: 'none' }} />
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={onFilePick} style={{ display: 'none' }} />

                </div>
            )}

            {/* ── FLOATING SAVE BUTTON BAR (FLOATS OVER PAGE) ── */}
            {tab === 'upload' && queue.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: 86, // Floats nicely above the bottom tab navigation bar
                    left: 16,
                    right: 16,
                    zIndex: 1100,
                    background: c.bg === '#f8fafc' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    padding: '14px 18px',
                    borderRadius: 24,
                    boxShadow: '0 -10px 30px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.08)',
                    border: `1.5px solid ${c.green}`,
                    animation: 'wpSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 900, color: c.green, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                                {t.readyToSave}
                            </span>
                            <button onClick={() => setQueue([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.red, fontSize: 11, fontWeight: 800 }}>
                                {t.retakeCancel}
                            </button>
                        </div>

                        {queue.map(item => item.uploading && (
                            <div key={item.id}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                    <span style={{ color: c.muted }}>{t.saving}</span>
                                    <span style={{ color: c.blue, fontWeight: 800 }}>{item.progress}%</span>
                                </div>
                                <div style={{ height: 6, background: c.border, borderRadius: 999, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${item.progress}%`, background: `linear-gradient(90deg, ${c.blueD}, ${c.blue})`, transition: 'width .1s' }} />
                                </div>
                            </div>
                        ))}

                        <button onClick={uploadAll} disabled={uploading}
                            style={{
                                width: '100%', padding: '15px', borderRadius: 16, border: 'none',
                                background: `linear-gradient(135deg, ${c.green}, ${c.greenD})`,
                                color: '#fff', fontSize: 14, fontWeight: 900, cursor: 'pointer',
                                boxShadow: `0 8px 24px ${c.green}40`,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            }}
                            className="wp-btn"
                        >
                            <UploadCloud size={18} />
                            {uploading ? t.saving : t.saveBtn}
                        </button>
                    </div>
                </div>
            )}

            {/* ── GALLERY tab ── */}
            {tab === 'gallery' && (
                <div style={{ padding: '14px 16px' }}>

                    {/* Search */}
                    {photos.length > 0 && (
                        <div style={{ position: 'relative', marginBottom: 14 }}>
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.muted }}><Search size={14} /></span>
                            <input
                                value={galleryFilter} onChange={e => setFilter(e.target.value)}
                                placeholder={t.filterPlaceholder}
                                style={{
                                    width: '100%', padding: '10px 12px 10px 36px',
                                    borderRadius: 14, border: `1px solid ${c.border}`,
                                    fontSize: 13, background: c.card,
                                    color: c.text, outline: 'none', boxSizing: 'border-box',
                                }} />
                        </div>
                    )}

                    {loadingPhotos && (
                        <div style={{ textAlign: 'center', padding: 60 }}>
                            <div className="wp-spinner" />
                            <p style={{ fontSize: 13, color: c.muted, marginTop: 16 }}>{t.loadingPhotos}</p>
                        </div>
                    )}

                    {!loadingPhotos && photos.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 60, color: c.muted }}>
                            <div style={{ width: 60, height: 60, margin:'0 auto 16px', borderRadius: 20, display:'grid', placeItems:'center', background: c.card, border:`1px solid ${c.border}`, color: c.blue }}>
                                <Camera size={28} />
                            </div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: c.dim }}>{t.emptyPhotos}</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>{t.switchUpload}</p>
                            <button onClick={() => setTab('upload')}
                                style={{
                                    marginTop: 16, padding: '10px 24px', borderRadius: 12,
                                    background: `linear-gradient(135deg,${c.blueD},${c.blue})`,
                                    color: '#fff', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                                }}>
                                {t.uploadPhotosBtn}
                            </button>
                        </div>
                    )}

                    {!loadingPhotos && photos.length > 0 && (
                        Object.keys(photosByPhase).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: c.muted }}>
                                <p style={{ fontSize: 13 }}>{t.noMatchFilter}</p>
                            </div>
                        ) : (
                            Object.entries(photosByPhase).map(([phase, pList]) => (
                                <div key={phase} style={{ marginBottom: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: c.blue }}>{phase}</span>
                                        <span style={{ fontSize: 11, color: c.muted }}>({pList.length})</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                                        {pList.map(p => (
                                            <PhotoThumb key={p.id} photo={p} c={c} onClick={(ph) => {
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
                    c={c}
                    onClose={() => setLightbox(null)}
                    onPrev={lightbox > 0 ? () => setLightbox(i => i - 1) : null}
                    onNext={lightbox < flatPhotos.length - 1 ? () => setLightbox(i => i + 1) : null}
                />
            )}

            {/* Toast */}
            {toast && <Toast message={toast.message} color={toast.color} c={c} onDone={() => setToast(null)} />}
        </div>
    );
}
