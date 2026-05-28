import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ImagePlus, MapPin, Upload, Video, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { constructionService } from '../../services/constructionService';
import { authService } from '../../services/auth';
import { useConstruction } from '../../context/ConstructionContext';
import { useMobileTracker } from '../../modules/location/context/MobileTrackerContext';
import VoiceNoteInput from '../common/VoiceNoteInput';

const formatStamp = (date = new Date()) =>
    date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

const routeLabel = (pathname) =>
    pathname
        .replace('/dashboard/mobile/', '')
        .split('/')
        .filter(Boolean)
        .map((part) => part.replace(/-/g, ' '))
        .join(' / ') || 'mobile home';

const buildDescription = ({
    file,
    liveCapture,
    user,
    projectName,
    taskTitle,
    pathname,
    tracker,
    note,
}) => {
    const lines = [
        `Uploaded by: ${user?.full_name || user?.name || user?.username || 'Unknown user'}`,
        `Username: ${user?.username || user?.email || 'N/A'}`,
        `Project: ${projectName || 'Unknown project'}`,
        `Task: ${taskTitle || 'Not assigned'}`,
        `Upload time: ${formatStamp()}`,
        `Upload page: ${routeLabel(pathname)}`,
        `Source: ${liveCapture ? 'Live camera capture' : 'Gallery / file picker'}`,
        `File: ${file.name}`,
    ];

    if (tracker?.geofenceName) {
        lines.push(`Site area: ${tracker.geofenceName}`);
    }

    if (tracker?.position?.lat && tracker?.position?.lon) {
        lines.push(
            `Location: ${tracker.position.lat.toFixed(6)}, ${tracker.position.lon.toFixed(6)}`
            + (tracker.position.accuracy ? ` (±${Math.round(tracker.position.accuracy)}m)` : ''),
        );
    } else {
        lines.push('Location: unavailable');
    }

    if (note?.trim()) {
        lines.push(`Note: ${note.trim()}`);
    }

    return lines.join('\n');
};

export default function MobileQuickCapture({ open, onClose }) {
    const galleryRef = useRef(null);
    const [tasks, setTasks] = useState([]);
    const [taskId, setTaskId] = useState('');
    const [note, setNote] = useState('');
    const [files, setFiles] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    const { activeProjectId, dashboardData, dispatchGlobalUpload } = useConstruction();
    const tracker = useMobileTracker();
    const location = useLocation();
    const user = authService.getCurrentUser();
    const trackerPermission = tracker?.permission;
    const trackerRequestPermission = tracker?.requestPermission;
    const trackerHasPosition = !!tracker?.position;

    useEffect(() => {
        if (!open) return;

        let mounted = true;
        const loadTasks = async () => {
            setLoadingTasks(true);
            try {
                const data = activeProjectId
                    ? await constructionService.getTasksByProject(activeProjectId)
                    : await constructionService.getTasks();
                const list = (Array.isArray(data) ? data : data.results || [])
                    .filter((task) => task.status !== 'COMPLETED');
                if (!mounted) return;
                setTasks(list);
                setTaskId('');
            } catch (error) {
                console.error('Failed to load tasks for quick capture', error);
                if (mounted) setTasks([]);
            } finally {
                if (mounted) setLoadingTasks(false);
            }
        };

        loadTasks();
        if (!trackerHasPosition && trackerPermission === 'prompt') {
            trackerRequestPermission?.();
        }

        return () => {
            mounted = false;
        };
    }, [open, activeProjectId, trackerHasPosition, trackerPermission, trackerRequestPermission]);

    useEffect(() => {
        if (!open) {
            setNote('');
            setFiles((current) => {
                current.forEach((entry) => URL.revokeObjectURL(entry.preview));
                return [];
            });
        }
    }, [open]);

    const selectedTask = useMemo(
        () => tasks.find((task) => String(task.id) === String(taskId)),
        [tasks, taskId],
    );
    const canCapture = !!selectedTask;

    const groupedTasks = useMemo(() => {
        const buckets = new Map();
        tasks.forEach((task) => {
            const phaseName =
                task.phase_detail?.name ||
                task.phase_name ||
                task.phase?.name ||
                'Unassigned Phase';
            const phaseOrder =
                task.phase_detail?.order ??
                task.phase_order ??
                999;
            const key = `${String(phaseOrder).padStart(3, '0')}::${phaseName}`;
            if (!buckets.has(key)) {
                buckets.set(key, {
                    phaseName,
                    phaseOrder,
                    items: [],
                });
            }
            buckets.get(key).items.push(task);
        });

        return Array.from(buckets.values())
            .sort((a, b) => a.phaseOrder - b.phaseOrder || a.phaseName.localeCompare(b.phaseName))
            .map((group) => ({
                ...group,
                items: group.items.sort((a, b) => (a.title || '').localeCompare(b.title || '')),
            }));
    }, [tasks]);

    const addFiles = (rawFiles, liveCapture) => {
        const accepted = Array.from(rawFiles || []).filter(
            (file) => file.type.startsWith('image/') || file.type.startsWith('video/'),
        );
        if (!accepted.length) return;
        setFiles((prev) => [
            ...prev,
            ...accepted.map((file) => ({
                id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
                file,
                preview: URL.createObjectURL(file),
                liveCapture,
                status: 'pending',
            })),
        ]);
    };

    const removeFile = (id) => {
        setFiles((prev) => {
            const target = prev.find((entry) => entry.id === id);
            if (target) URL.revokeObjectURL(target.preview);
            return prev.filter((entry) => entry.id !== id);
        });
    };

    const uploadAll = () => {
        if (!taskId || !files.length) return;

        const pendingFiles = files.filter((file) => file.status === 'pending');
        if (!pendingFiles.length) return;

        for (const entry of pendingFiles) {
            setFiles((prev) => prev.map((file) => (
                file.id === entry.id ? { ...file, status: 'uploading' } : file
            )));

            const payload = new FormData();
            payload.append('task', taskId);
            payload.append('file', entry.file);
            payload.append('media_type', entry.file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE');
            payload.append('description', buildDescription({
                file: entry.file,
                liveCapture: entry.liveCapture,
                user,
                projectName: dashboardData?.project?.name,
                taskTitle: selectedTask?.title,
                pathname: location.pathname,
                tracker,
                note,
            }));

            dispatchGlobalUpload(
                constructionService.uploadTaskMedia,
                payload,
                entry.file.name || 'Site Photo',
            ).then(() => {
                setFiles((prev) => prev.map((file) => (
                    file.id === entry.id ? { ...file, status: 'done' } : file
                )));
            }).catch(() => {
                setFiles((prev) => prev.map((file) => (
                    file.id === entry.id ? { ...file, status: 'error' } : file
                )));
            });
        }
    };

    if (!open) return null;

    const pendingCount = files.filter((file) => file.status === 'pending').length;
    const liveCount = files.filter((file) => file.liveCapture).length;
    const uploading = files.some((file) => file.status === 'uploading');

    return createPortal(
        <div className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
            <div
                className="w-full max-w-xl bg-[var(--t-bg)] rounded-t-[28px] sm:rounded-[28px] border border-[var(--t-border)] shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 pt-4 pb-3 border-b border-[var(--t-border)] bg-[var(--t-surface)]">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.18em] bg-[var(--t-primary)]/10 text-[var(--t-primary)] border border-[var(--t-primary)]/20">
                                <Camera className="w-3.5 h-3.5" />
                                Quick Upload
                            </div>
                            <h3 className="mt-3 text-lg font-black text-[var(--t-text)]">Live site photo upload</h3>
                            <p className="text-xs text-[var(--t-text2)] mt-1">
                                Saves photo with user, time, page, and current GPS context.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-10 h-10 rounded-2xl border border-[var(--t-border)] bg-[var(--t-surface2)] text-[var(--t-text2)] flex items-center justify-center"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="max-h-[78vh] overflow-y-auto px-5 py-5 space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <label
                            className={`relative rounded-3xl p-4 border text-left shadow-lg block overflow-hidden ${
                                canCapture
                                    ? 'border-[var(--t-border)] bg-gradient-to-br from-[var(--t-primary)] to-violet-600 text-white cursor-pointer'
                                    : 'border-[var(--t-border)] bg-[var(--t-surface2)] text-[var(--t-text3)] cursor-not-allowed'
                            }`}
                        >
                            <Camera className="w-6 h-6 mb-3" />
                            <p className="text-sm font-black">Live Photo</p>
                            <p className={`text-[11px] mt-1 ${canCapture ? 'text-white/80' : 'text-[var(--t-text3)]'}`}>
                                {canCapture ? 'Open camera directly' : 'Select task first'}
                            </p>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                disabled={!canCapture}
                                className={`absolute inset-0 opacity-0 ${canCapture ? 'cursor-pointer' : 'pointer-events-none'}`}
                                onChange={(e) => addFiles(e.target.files, true)}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                if (!canCapture) return;
                                galleryRef.current?.click();
                            }}
                            disabled={!canCapture}
                            className={`rounded-3xl p-4 border text-left ${
                                canCapture
                                    ? 'border-[var(--t-border)] bg-[var(--t-surface)]'
                                    : 'border-[var(--t-border)] bg-[var(--t-surface2)] opacity-60 cursor-not-allowed'
                            }`}
                        >
                            <ImagePlus className="w-6 h-6 mb-3 text-[var(--t-primary)]" />
                            <p className="text-sm font-black text-[var(--t-text)]">Gallery / Video</p>
                            <p className="text-[11px] text-[var(--t-text3)] mt-1">
                                {canCapture ? 'Pick stored files' : 'Select task first'}
                            </p>
                        </button>
                    </div>
                    <input
                        ref={galleryRef}
                        type="file"
                        hidden
                        accept="image/*,video/*"
                        multiple
                        onChange={(e) => addFiles(e.target.files, false)}
                    />

                    <div className="rounded-3xl border border-[var(--t-border)] bg-[var(--t-surface)] p-4 space-y-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--t-text3)] mb-2">Attach to task</label>
                            <select
                                value={taskId}
                                onChange={(e) => setTaskId(e.target.value)}
                                className="w-full rounded-2xl border border-[var(--t-border)] bg-[var(--t-bg)] px-4 py-3 text-sm text-[var(--t-text)] outline-none"
                            >
                                <option value="">— पहिले काम छान्नुहोस् —</option>
                                {loadingTasks && <option>Loading tasks…</option>}
                                {!loadingTasks && !tasks.length && <option value="">No in-progress tasks</option>}
                                {groupedTasks.map((group) => (
                                    <optgroup
                                        key={`${group.phaseOrder}-${group.phaseName}`}
                                        label={`Phase ${group.phaseOrder}: ${group.phaseName}`}
                                    >
                                        {group.items.map((task) => (
                                            <option key={task.id} value={task.id}>
                                                {`${task.title} (${String(task.status || 'unknown').toLowerCase().replace(/_/g, ' ')})`}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            {selectedTask && (
                                <p className="mt-2 text-[11px] text-[var(--t-text3)]">
                                    {selectedTask.phase_detail?.name || selectedTask.phase_name || 'Unassigned'} · {selectedTask.status}
                                </p>
                            )}
                            {!selectedTask && !loadingTasks && (
                                <p className="mt-2 text-[11px] text-amber-600">
                                    Select a task first, then take or upload photo/video.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--t-text3)] mb-2">Note</label>
                            <VoiceNoteInput
                                value={note}
                                onChange={setNote}
                                rows={3}
                                placeholder="What is being captured?"
                                disabled={!selectedTask}
                                textareaClassName="w-full rounded-2xl border border-[var(--t-border)] bg-[var(--t-bg)] px-4 py-3 text-sm text-[var(--t-text)] outline-none resize-none"
                            />
                        </div>
                    </div>

                    <div className="rounded-3xl border border-[var(--t-border)] bg-[var(--t-surface)] p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div>
                                <p className="text-sm font-black text-[var(--t-text)]">Upload context</p>
                                <p className="text-[11px] text-[var(--t-text3)]">Auto-added to every file</p>
                            </div>
                            {tracker?.position ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-[0.18em] border border-emerald-500/20">
                                    <MapPin className="w-3.5 h-3.5" />
                                    GPS ready
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => tracker?.requestPermission?.()}
                                    className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-black uppercase tracking-[0.18em] border border-amber-500/20"
                                >
                                    Enable GPS
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                            <div className="rounded-2xl bg-[var(--t-bg)] border border-[var(--t-border)] p-3">
                                <p className="text-[var(--t-text3)] uppercase tracking-[0.18em] text-[9px] font-black mb-1">User</p>
                                <p className="font-semibold text-[var(--t-text)]">{user?.full_name || user?.username || 'Current user'}</p>
                            </div>
                            <div className="rounded-2xl bg-[var(--t-bg)] border border-[var(--t-border)] p-3">
                                <p className="text-[var(--t-text3)] uppercase tracking-[0.18em] text-[9px] font-black mb-1">Time</p>
                                <p className="font-semibold text-[var(--t-text)]">{formatStamp()}</p>
                            </div>
                            <div className="rounded-2xl bg-[var(--t-bg)] border border-[var(--t-border)] p-3">
                                <p className="text-[var(--t-text3)] uppercase tracking-[0.18em] text-[9px] font-black mb-1">Upload place</p>
                                <p className="font-semibold text-[var(--t-text)] capitalize">{routeLabel(location.pathname)}</p>
                            </div>
                            <div className="rounded-2xl bg-[var(--t-bg)] border border-[var(--t-border)] p-3">
                                <p className="text-[var(--t-text3)] uppercase tracking-[0.18em] text-[9px] font-black mb-1">Location</p>
                                <p className="font-semibold text-[var(--t-text)]">
                                    {tracker?.geofenceName || (tracker?.position ? `${tracker.position.lat.toFixed(4)}, ${tracker.position.lon.toFixed(4)}` : 'Unavailable')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {files.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-black text-[var(--t-text)]">{files.length} files selected</p>
                                    <p className="text-[11px] text-[var(--t-text3)]">{liveCount} live capture · {pendingCount} pending upload</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {files.map((entry) => (
                                    <div key={entry.id} className="relative rounded-3xl overflow-hidden border border-[var(--t-border)] bg-[var(--t-surface)] aspect-square">
                                        {entry.file.type.startsWith('video/') ? (
                                            <video src={entry.preview} className="w-full h-full object-cover" muted playsInline />
                                        ) : (
                                            <img src={entry.preview} alt="" className="w-full h-full object-cover" />
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/85">
                                                    {entry.liveCapture ? 'Live' : 'Gallery'}
                                                </span>
                                                {entry.file.type.startsWith('video/') ? (
                                                    <Video className="w-3.5 h-3.5 text-white/80" />
                                                ) : (
                                                    <Camera className="w-3.5 h-3.5 text-white/80" />
                                                )}
                                            </div>
                                        </div>
                                        {entry.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => removeFile(entry.id)}
                                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {entry.status !== 'pending' && (
                                            <div className={`absolute inset-0 flex items-center justify-center text-white text-xs font-black ${
                                                entry.status === 'done' ? 'bg-emerald-500/55' : entry.status === 'error' ? 'bg-rose-500/55' : 'bg-black/45'
                                            }`}>
                                                {entry.status === 'uploading' ? 'Uploading…' : entry.status === 'done' ? 'Done' : 'Failed'}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 border-t border-[var(--t-border)] bg-[var(--t-surface)]">
                    <button
                        type="button"
                        onClick={uploadAll}
                        disabled={uploading || !pendingCount || !taskId}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-4 bg-[var(--t-primary)] text-[var(--t-bg)] text-sm font-black uppercase tracking-[0.18em] disabled:opacity-50"
                    >
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Uploading…' : `Upload ${pendingCount || 0} file${pendingCount === 1 ? '' : 's'}`}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
