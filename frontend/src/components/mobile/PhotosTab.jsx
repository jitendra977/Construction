import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    Calendar,
    Eye,
    FileText,
    Image as ImageIcon,
    PlayCircle,
    Trash2,
    X,
} from 'lucide-react';
import { constructionService, dashboardService, getMediaUrl } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';
import MediaThumbnail from '../common/MediaThumbnail';
import ConfirmModal from '../common/ConfirmModal';
import MobileLayout from './MobileLayout';
import MobilePageHeader from './MobilePageHeader';
import CustomVideoPlayer from '../common/CustomVideoPlayer';

const TYPE_META = {
    IMAGE: {
        label: 'Photo',
        icon: ImageIcon,
        badgeClass: 'bg-emerald-500/90 text-white border-emerald-400/70',
        panelClass: 'from-slate-900 via-slate-800 to-slate-900',
        iconClass: 'text-emerald-300',
    },
    VIDEO: {
        label: 'Video',
        icon: PlayCircle,
        badgeClass: 'bg-violet-500/90 text-white border-violet-400/70',
        panelClass: 'from-slate-950 via-violet-950/80 to-slate-900',
        iconClass: 'text-violet-300',
    },
    PDF: {
        label: 'PDF',
        icon: FileText,
        badgeClass: 'bg-rose-500/90 text-white border-rose-400/70',
        panelClass: 'from-white via-rose-50 to-slate-100',
        iconClass: 'text-rose-500',
    },
    FILE: {
        label: 'File',
        icon: FileText,
        badgeClass: 'bg-slate-500/90 text-white border-slate-400/70',
        panelClass: 'from-slate-200 via-slate-100 to-white',
        iconClass: 'text-slate-500',
    },
};

const PHOTO_VIEW_OPTIONS = [
    { id: 'phase', label: 'Phase' },
    { id: 'task', label: 'Task' },
    { id: 'all', label: 'All' },
    { id: 'date', label: 'Date' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'plan', label: 'Design' },
    { id: 'docs', label: 'Docs' },
];

const getPhaseAlbumLabel = (groupName, group) => {
    const rawLabel = String(groupName || '').trim();
    let label = rawLabel.replace(/^\d+\.\s*/, '').trim();

    if (!label || /^unassigned$/i.test(label)) {
        const sample = group?.items?.find((item) => item?.subtitle || item?.title);
        const subtitlePhase = String(sample?.subtitle || '').match(/^Phase\s+\d+:\s*([^•]+)/i)?.[1]?.trim();
        const titlePhase = String(sample?.title || '').match(/^(.+?)\s+-\s+(Completion|Blueprint|Structure)$/i)?.[1];
        label = subtitlePhase || titlePhase || label;
    }

    return label && !/^unassigned$/i.test(label) ? label : 'Unassigned Album';
};

const getItemPhaseLabel = (item) => (
    String(item?.subtitle || '').match(/^Phase\s+\d+:\s*([^•]+)/i)?.[1]?.trim()
    || String(item?.subtitle || '').split('•')[0]?.trim()
    || ''
);

const formatDateAlbum = (date) => {
    if (!date || Number.isNaN(date.getTime())) return 'No Date Album';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatMonthAlbum = (date) => {
    if (!date || Number.isNaN(date.getTime())) return 'No Date Album';
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const formatWeekAlbum = (date) => {
    if (!date || Number.isNaN(date.getTime())) return 'No Date Album';
    const start = new Date(date);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

const getPhotoViewConfig = (view) => {
    if (view === 'phase' || view === 'task') return { scope: 'phases', mode: view === 'task' ? 'task' : 'group', timeMode: 'all' };
    if (view === 'plan') return { scope: 'blueprints', mode: 'group', timeMode: 'all' };
    if (view === 'docs') return { scope: 'permits', mode: 'group', timeMode: 'all' };
    return { scope: 'timeline', mode: 'group', timeMode: ['all', 'date', 'week', 'month'].includes(view) ? view : 'all' };
};

const normalizeItem = (item) => {
    const type = (item.media_type || item.file_type || 'FILE').toUpperCase();
    const safeType = TYPE_META[type] ? type : 'FILE';
    const uploadedAt = item.uploaded_at ? new Date(item.uploaded_at) : null;

    return {
        ...item,
        type: safeType,
        url: getMediaUrl(item.url),
        subtitle: item.subtitle || item.category || TYPE_META[safeType].label,
        uploadedAt,
        uploadedLabel: uploadedAt && !Number.isNaN(uploadedAt.getTime())
            ? uploadedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : '',
    };
};

const MediaPreview = ({ item, onClose }) => {
    if (!item) return null;

    const meta = TYPE_META[item.type] || TYPE_META.FILE;

    return (
        <div
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={onClose}
        >
            <div
                className="w-full max-w-4xl bg-[var(--t-surface)] border border-[var(--t-border)] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 px-4 py-4 border-b border-[var(--t-border)] bg-[var(--t-surface2)]">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 border px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] ${meta.badgeClass}`}>
                                <meta.icon className="w-3.5 h-3.5" />
                                {meta.label}
                            </span>
                            {item.uploadedLabel && (
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-[var(--t-text3)]">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {item.uploadedLabel}
                                </span>
                            )}
                        </div>
                        <h3 className="text-sm font-black text-[var(--t-text)] line-clamp-2">{item.title}</h3>
                        <p className="text-xs text-[var(--t-text2)] mt-1 line-clamp-2">{item.subtitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 w-9 h-9 rounded-full border border-[var(--t-border)] bg-[var(--t-surface)] text-[var(--t-text2)] flex items-center justify-center"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="bg-black/90 min-h-[46vh] max-h-[70vh] flex items-center justify-center p-3 sm:p-5">
                    {item.type === 'IMAGE' && (
                        <img
                            src={item.url}
                            alt={item.title}
                            className="max-h-[62vh] w-full object-contain rounded-2xl"
                        />
                    )}
                    {item.type === 'VIDEO' && (
                        <CustomVideoPlayer
                            src={item.url}
                            className="max-h-[62vh] w-full rounded-2xl bg-black"
                        />
                    )}
                    {item.type === 'PDF' && (
                        <iframe
                            src={item.url}
                            title={item.title}
                            className="w-full h-[62vh] rounded-2xl bg-white"
                        />
                    )}
                    {item.type === 'FILE' && (
                        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center">
                            <FileText className="w-14 h-14 mx-auto text-slate-500 mb-4" />
                            <h4 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h4>
                            <p className="text-sm text-slate-600">Preview is not available for this file type.</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-4 border-t border-[var(--t-border)] bg-[var(--t-surface2)]">
                    <p className="text-[11px] text-[var(--t-text3)] line-clamp-2">{item.category}</p>
                    <div className="flex items-center gap-2">
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 rounded-xl border border-[var(--t-border)] text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--t-text2)]"
                        >
                            Open
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

const getTaskMediaId = (item) => {
    if (item?.source_type !== 'TASK_MEDIA') return null;
    const rawId = String(item.id || '').replace(/^task_/, '');
    const numericId = Number(rawId);
    return Number.isFinite(numericId) ? numericId : null;
};

const isUnassignedTaskMedia = (item) => item?.source_type === 'TASK_MEDIA' && !item?.meta?.task_id;

const MobileMediaCard = ({ item, onOpen, onAssign }) => {
    const meta = TYPE_META[item.type] || TYPE_META.FILE;
    const Icon = meta.icon;
    const canAssign = Boolean(onAssign) && isUnassignedTaskMedia(item);

    return (
        <button
            type="button"
            onClick={() => onOpen(item)}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-[var(--t-border)] bg-[var(--t-surface)] text-left shadow-sm active:scale-[0.985] transition-transform"
        >
            {item.type === 'FILE' ? (
                <div className={`w-full h-full bg-gradient-to-br ${meta.panelClass} flex flex-col items-start justify-between p-3`}>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${meta.badgeClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                    </span>
                    <div className="w-full">
                        <div className={`w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm ${item.type === 'PDF' ? '' : 'backdrop-blur-sm'}`}>
                            <Icon className={`w-7 h-7 ${meta.iconClass}`} />
                        </div>
                        <p className={`mt-3 text-xs font-semibold ${item.type === 'PDF' ? 'text-slate-700' : 'text-white/80'}`}>
                            Tap to preview
                        </p>
                    </div>
                </div>
            ) : (
                <MediaThumbnail item={item} />
            )}

            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${meta.badgeClass}`}>
                        <Icon className="w-3 h-3" />
                        {meta.label}
                    </span>
                    {canAssign ? (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                onAssign(item);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onAssign(item);
                                }
                            }}
                            className="inline-flex items-center rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-900"
                        >
                            Assign
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] text-white/75">
                            <Eye className="w-3 h-3" />
                            Preview
                        </span>
                    )}
                </div>
                <p className="text-white text-[11px] font-semibold leading-snug line-clamp-2">{item.title}</p>
                <p className="text-white/70 text-[10px] mt-1 line-clamp-1">{item.subtitle}</p>
            </div>
        </button>
    );
};

const AlbumCard = ({ group, onOpen, albumLabel, typeLabel = 'Album' }) => {
    const visibleCount = group.items.length > 4 ? 3 : Math.min(group.items.length, 4);
    const coverItems = group.items.slice(0, visibleCount);
    const label = albumLabel || getPhaseAlbumLabel(group.groupName, group);
    const renderThumb = (item, idx) => (
        <div key={item?.id || idx} className="h-full w-full overflow-hidden rounded-[10px] bg-[var(--t-surface)]">
            {item ? (
                <MediaThumbnail item={item} />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--t-text3)] text-[10px] font-bold">
                    Album
                </div>
            )}
        </div>
    );

    return (
        <button
            type="button"
            onClick={() => onOpen(group)}
            aria-label={`Open ${label}`}
            className="w-full overflow-hidden rounded-[16px] border border-[var(--t-border)] bg-[var(--t-surface)] text-left shadow-sm active:scale-[0.99] transition-transform"
        >
            <div className="relative aspect-[4/2.25] bg-[var(--t-surface2)] p-1">
                {visibleCount === 1 && (
                    <div className="h-full">
                        {renderThumb(coverItems[0], 0)}
                    </div>
                )}

                {visibleCount === 2 && (
                    <div className="grid h-full grid-cols-2 gap-1">
                        {coverItems.map(renderThumb)}
                    </div>
                )}

                {visibleCount === 3 && (
                    <div className="grid h-full grid-cols-[1.35fr_1fr] gap-1">
                        {renderThumb(coverItems[0], 0)}
                        <div className="grid grid-rows-2 gap-1">
                            {coverItems.slice(1).map(renderThumb)}
                        </div>
                    </div>
                )}

                {visibleCount === 4 && (
                    <div className="grid h-full grid-cols-2 grid-rows-2 gap-1">
                        {coverItems.map(renderThumb)}
                    </div>
                )}

                {visibleCount === 0 && (
                    <div className="h-full rounded-[10px] bg-[var(--t-surface)] flex items-center justify-center text-[var(--t-text3)] text-xs font-bold">
                        No Cover
                    </div>
                )}

                <div className="pointer-events-none absolute inset-x-1 bottom-1 rounded-b-[10px] bg-gradient-to-t from-black/85 via-black/55 to-transparent px-3 pb-2.5 pt-8">
                    <p className="text-[14px] font-semibold text-white leading-tight truncate drop-shadow">
                        {label}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-white/18 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/90 backdrop-blur">
                            {typeLabel}
                        </span>
                        <span className="text-[10px] font-medium text-white/80">
                            {group.items.length} files
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
};

const AssignMediaModal = ({ item, phases, tasks, onClose, onAssigned }) => {
    const [phaseId, setPhaseId] = useState('');
    const [taskId, setTaskId] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [error, setError] = useState('');

    const phaseTasks = useMemo(
        () => tasks.filter((task) => String(task.phase) === String(phaseId)),
        [tasks, phaseId],
    );

    useEffect(() => {
        setTaskId('');
    }, [phaseId]);

    useEffect(() => {
        setPhaseId('');
        setTaskId('');
        setSaving(false);
        setDeleting(false);
        setConfirmDeleteOpen(false);
        setError('');
    }, [item]);

    if (!item) return null;

    const submit = async () => {
        const mediaId = getTaskMediaId(item);
        if (!mediaId || !taskId) return;
        setSaving(true);
        setError('');
        try {
            await constructionService.updateTaskMedia(mediaId, { task: taskId });
            onAssigned();
        } catch {
            setError('Could not assign this photo. Try again.');
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        const mediaId = getTaskMediaId(item);
        if (!mediaId) return;
        setDeleting(true);
        setError('');
        try {
            await constructionService.deleteTaskMedia(mediaId);
            onAssigned();
        } catch {
            setError('Could not delete this photo. Try again.');
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-3xl border border-[var(--t-border)] bg-[var(--t-surface)] p-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--t-primary)]">Assign Photo</p>
                        <h3 className="mt-1 truncate text-[15px] font-black text-[var(--t-text)]">{item.title || 'Unassigned photo'}</h3>
                        <p className="mt-1 text-[11px] text-[var(--t-text3)]">Link this upload to a construction task.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--t-border)] bg-[var(--t-surface2)] text-[var(--t-text2)]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-3">
                    <label className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-[var(--t-text3)]">Phase</span>
                        <select
                            value={phaseId}
                            onChange={(e) => setPhaseId(e.target.value)}
                            className="w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface2)] px-3 py-3 text-[13px] font-bold text-[var(--t-text)] outline-none"
                        >
                            <option value="">Select phase</option>
                            {phases.map((phase) => (
                                <option key={phase.id} value={phase.id}>{phase.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-[var(--t-text3)]">Task</span>
                        <select
                            value={taskId}
                            onChange={(e) => setTaskId(e.target.value)}
                            disabled={!phaseId}
                            className="w-full rounded-xl border border-[var(--t-border)] bg-[var(--t-surface2)] px-3 py-3 text-[13px] font-bold text-[var(--t-text)] outline-none disabled:opacity-50"
                        >
                            <option value="">{phaseId ? 'Select task' : 'Select phase first'}</option>
                            {phaseTasks.map((task) => (
                                <option key={task.id} value={task.id}>{task.title}</option>
                            ))}
                        </select>
                    </label>

                    {error && <p className="text-[11px] font-bold text-red-500">{error}</p>}

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={submit}
                            disabled={!taskId || saving || deleting}
                            className="w-full rounded-xl bg-[var(--t-primary)] px-4 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-white disabled:opacity-50"
                        >
                            {saving ? 'Assigning...' : 'Assign'}
                        </button>
                        <button
                            type="button"
                        onClick={() => setConfirmDeleteOpen(true)}
                        disabled={saving || deleting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-red-600 disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmDeleteOpen}
                title="Delete Photo"
                message="Are you sure you want to permanently delete this photo? This cannot be undone."
                confirmText={deleting ? 'Deleting...' : 'Delete'}
                cancelText="Cancel"
                type="danger"
                onConfirm={handleDelete}
                onCancel={() => {
                    if (deleting) return;
                    setConfirmDeleteOpen(false);
                }}
            />
        </div>
    );
};

const PhotosTab = () => {
    const { dashboardData } = useConstruction();
    const [groupedGallery, setGroupedGallery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [photoView, setPhotoView] = useState('phase');
    const [previewItem, setPreviewItem] = useState(null);
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [assignItem, setAssignItem] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const phases = dashboardData?.phases || [];
    const tasks = dashboardData?.tasks || [];
    const viewConfig = useMemo(() => getPhotoViewConfig(photoView), [photoView]);
    const albumScope = viewConfig.scope;
    const organizeMode = viewConfig.mode;
    const timeAlbumMode = viewConfig.timeMode;

    useEffect(() => {
        const fetchGallery = async () => {
            setLoading(true);
            try {
                const response = await dashboardService.getGallery(albumScope);
                const processedData = response.data.map((group) => ({
                    ...group,
                    items: group.items.map(normalizeItem),
                }));
                setGroupedGallery(processedData);
            } catch (error) {
                console.error('Failed to load gallery', error);
                setGroupedGallery([]);
            } finally {
                setLoading(false);
            }
        };

        fetchGallery();
    }, [albumScope, reloadKey]);

    useEffect(() => {
        setSelectedAlbum(null);
    }, [photoView]);

    const totalItems = useMemo(
        () => groupedGallery.reduce((acc, group) => acc + group.items.length, 0),
        [groupedGallery],
    );

    const supportsTaskGrouping = albumScope === 'timeline' || albumScope === 'phases';
    const isPhaseAlbumGrid = albumScope === 'phases' && organizeMode === 'group';
    const isTimelineAlbumGrid = albumScope === 'timeline' && organizeMode === 'group';
    const isDocumentGroupView = (albumScope === 'blueprints' || albumScope === 'permits') && organizeMode === 'group';
    const isTimelineFlatGrid = isTimelineAlbumGrid && timeAlbumMode === 'all';
    const isAlbumGrid = isPhaseAlbumGrid || isDocumentGroupView || (isTimelineAlbumGrid && timeAlbumMode !== 'all');

    const allGalleryItems = useMemo(
        () => groupedGallery.flatMap((group) => group.items || []),
        [groupedGallery],
    );

    const displayGroups = useMemo(() => {
        if (isTimelineAlbumGrid) {
            if (timeAlbumMode === 'all') {
                return [{
                    groupName: 'All Photos',
                    albumType: 'All',
                    items: allGalleryItems.slice().sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)),
                }];
            }

            const buckets = new Map();
            allGalleryItems.forEach((item) => {
                const date = item.uploadedAt instanceof Date ? item.uploadedAt : null;
                let key = 'no-date';
                let groupName = 'No Date Album';

                if (date && !Number.isNaN(date.getTime())) {
                    if (timeAlbumMode === 'month') {
                        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        groupName = formatMonthAlbum(date);
                    } else if (timeAlbumMode === 'week') {
                        const start = new Date(date);
                        const day = start.getDay() || 7;
                        start.setDate(start.getDate() - day + 1);
                        key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
                        groupName = formatWeekAlbum(date);
                    } else {
                        key = date.toISOString().slice(0, 10);
                        groupName = formatDateAlbum(date);
                    }
                }

                if (!buckets.has(key)) {
                    buckets.set(key, { groupName, albumType: timeAlbumMode, sortTime: 0, items: [] });
                }
                const bucket = buckets.get(key);
                const itemTime = date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
                bucket.sortTime = Math.max(bucket.sortTime, itemTime);
                bucket.items.push(item);
            });

            return Array.from(buckets.values())
                .map((group) => ({
                    ...group,
                    items: group.items.slice().sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)),
                }))
                .sort((a, b) => b.sortTime - a.sortTime);
        }

        if (organizeMode !== 'task' || !supportsTaskGrouping) {
            if (albumScope !== 'phases' || organizeMode !== 'group') return groupedGallery;
            const mergedPhaseGroups = new Map();
            groupedGallery.forEach((group) => {
                const label = getPhaseAlbumLabel(group.groupName, group);
                const key = label === 'Unassigned Album' ? 'unassigned' : label.toLowerCase();
                if (!mergedPhaseGroups.has(key)) {
                    mergedPhaseGroups.set(key, { ...group, groupName: label, items: [] });
                }
                mergedPhaseGroups.get(key).items.push(...(group.items || []));
            });

            return Array.from(mergedPhaseGroups.values()).map((group) => ({
                ...group,
                items: group.items.slice().sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)),
            })).sort((a, b) => {
                const aLabel = getPhaseAlbumLabel(a.groupName, a);
                const bLabel = getPhaseAlbumLabel(b.groupName, b);
                if (aLabel === 'Unassigned Album') return 1;
                if (bLabel === 'Unassigned Album') return -1;
                return aLabel.localeCompare(bLabel);
            });
        }

        const taskGroups = new Map();

        groupedGallery.forEach((group) => {
            group.items.forEach((item) => {
                const taskId = item.meta?.task_id;
                const phaseId = item.meta?.phase_id;
                const phaseLabel = getItemPhaseLabel(item) || getPhaseAlbumLabel(group.groupName, group);
                const hasPhaseLabel = phaseId && phaseLabel && phaseLabel !== 'Unassigned Album';
                const key = taskId ? `task-${taskId}` : hasPhaseLabel ? `phase-${phaseId}` : `misc-${item.category || 'general'}`;
                const groupName = taskId ? item.title || 'Untitled Task' : hasPhaseLabel ? phaseLabel : 'Unassigned Album';

                if (!taskGroups.has(key)) {
                    taskGroups.set(key, { groupName, items: [] });
                }
                taskGroups.get(key).items.push(item);
            });
        });

        return Array.from(taskGroups.values())
            .map((group) => ({
                ...group,
                items: group.items.slice().sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)),
            }))
            .sort((a, b) => {
                if (a.groupName === 'Unassigned Album') return 1;
                if (b.groupName === 'Unassigned Album') return -1;
                return a.groupName.localeCompare(b.groupName);
            });
    }, [allGalleryItems, albumScope, groupedGallery, isTimelineAlbumGrid, organizeMode, supportsTaskGrouping, timeAlbumMode]);

    const activeAlbumItems = selectedAlbum?.items || [];
    const selectedAlbumLabel = selectedAlbum
        ? (isPhaseAlbumGrid ? getPhaseAlbumLabel(selectedAlbum.groupName, selectedAlbum) : selectedAlbum.groupName)
        : '';
    const selectedAlbumTypeLabel = selectedAlbum?.albumType
        ? `${selectedAlbum.albumType} Album`
        : isPhaseAlbumGrid ? 'Phase Album' : isDocumentGroupView ? (albumScope === 'blueprints' ? 'Plan Files' : 'Documents') : 'Photo Album';

    return (
        <MobileLayout>
            <MobilePageHeader
                title="Photo Album"
                subtitle={`${totalItems} project files`}
                showActions={false}
                rightExtra={(
                    <div />
                )}
            />

            <div className="cyber-wrap pb-28 pt-4">
                <div className="ht-sec">
                    <div className="mb-5 rounded-[18px] border border-[var(--t-border)] bg-[var(--t-surface)] p-2.5 shadow-sm">
                        <div className="flex gap-1.5 overflow-x-auto rounded-[14px] border border-[var(--t-border)] bg-[var(--t-surface2)] p-1 scrollbar-hide">
                            {PHOTO_VIEW_OPTIONS.map((option) => {
                                const active = photoView === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setPhotoView(option.id)}
                                        className="shrink-0 rounded-[10px] px-3 py-2 text-[9px] font-black uppercase tracking-[0.08em] transition-colors"
                                        style={{
                                            background: active ? 'var(--t-primary)' : 'transparent',
                                            color: active ? 'white' : 'var(--t-text2)',
                                            border: active ? '1px solid var(--t-primary)' : '1px solid transparent',
                                        }}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>

                        {organizeMode === 'task' && !supportsTaskGrouping && (
                            <p className="mt-3 text-[10px] leading-relaxed text-[var(--t-text3)]">
                                Task album works best in Timeline Album or Phase Album. Current files stay grouped by album type here.
                            </p>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[var(--t-text3)]">
                            <div className="w-8 h-8 rounded-full border-2 border-[var(--t-primary)]/20 border-t-[var(--t-primary)] animate-spin mb-4 shadow-[0_0_10px_var(--t-primary)]"></div>
                            <p className="text-[10px] uppercase tracking-widest font-['DM_Mono',monospace] text-[var(--t-primary)] animate-pulse">Syncing Media...</p>
                        </div>
                    ) : displayGroups.length === 0 ? (
                        <div className="ht-empty">
                            <p>No assets found</p>
                        </div>
                    ) : isAlbumGrid && selectedAlbum ? (
                        <div className="space-y-4">
                            <button
                                type="button"
                                onClick={() => setSelectedAlbum(null)}
                                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--t-border)] bg-[var(--t-surface)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--t-text2)]"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Albums
                            </button>

                            <div className="rounded-[18px] border border-[var(--t-border)] bg-[var(--t-surface)] p-3.5">
                                <h3 className="text-[17px] font-semibold text-[var(--t-text)] leading-tight">
                                    {selectedAlbumLabel}
                                </h3>
                                <div className="mt-2 flex items-center gap-1.5">
                                    <span className="inline-flex items-center rounded-full bg-[var(--t-primary)]/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-[var(--t-primary)]">
                                        {selectedAlbumTypeLabel}
                                    </span>
                                    <span className="text-[10px] font-medium text-[var(--t-text3)]">
                                        {activeAlbumItems.length} photos
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {activeAlbumItems.map((item) => (
                                    <MobileMediaCard
                                        key={item.id}
                                        item={item}
                                        onOpen={setPreviewItem}
                                        onAssign={setAssignItem}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {isTimelineFlatGrid ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {displayGroups.flatMap((group) => group.items).map((item) => (
                                        <MobileMediaCard
                                            key={item.id}
                                            item={item}
                                            onOpen={setPreviewItem}
                                            onAssign={setAssignItem}
                                        />
                                    ))}
                                </div>
                            ) : isAlbumGrid ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {displayGroups.map((group) => (
                                        <AlbumCard
                                            key={group.groupName}
                                            group={group}
                                            albumLabel={isPhaseAlbumGrid ? getPhaseAlbumLabel(group.groupName, group) : group.groupName}
                                            typeLabel={isPhaseAlbumGrid ? 'Phase' : albumScope === 'blueprints' ? 'Plan' : albumScope === 'permits' ? 'Docs' : group.albumType || 'Photo'}
                                            onOpen={setSelectedAlbum}
                                        />
                                    ))}
                                </div>
                            ) : (
                                displayGroups.map((group) => (
                                    <section key={group.groupName} className="space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="text-[14px] font-semibold text-[var(--t-text)] leading-tight truncate">
                                                    {getPhaseAlbumLabel(group.groupName, group)}
                                                </h3>
                                                <div className="mt-1.5 flex items-center gap-1.5">
                                                    <span className="inline-flex items-center rounded-full bg-[var(--t-surface2)] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-[var(--t-text3)]">
                                                        Album
                                                    </span>
                                                    <span className="text-[10px] font-medium text-[var(--t-text3)]">
                                                        {group.items.length} items
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {group.items.map((item) => (
                                                <MobileMediaCard
                                                key={item.id}
                                                item={item}
                                                onOpen={setPreviewItem}
                                                onAssign={setAssignItem}
                                            />
                                        ))}
                                    </div>
                                    </section>
                                ))
                            )}
                        </div>
                    )}

                    <div className="mt-8 p-5 rounded-2xl bg-[var(--t-surface2)] border border-[var(--t-border)]">
                        <h3 className="text-[12px] font-black text-[var(--t-text)] mb-2 flex items-center gap-2">
                            <span>💡</span> Album guide
                        </h3>
                        <div className="text-[10px] text-[var(--t-text2)] space-y-2 leading-relaxed">
                            <p><strong className="text-[var(--t-text)]">Phase Album:</strong> each phase shows as one album card with grouped thumbnails.</p>
                            <p><strong className="text-[var(--t-text)]">By Task:</strong> turns progress photos into task-wise mini albums where task media exists.</p>
                            <p><strong className="text-[var(--t-text)]">Open Album:</strong> tap a phase card to see all linked task photos like a photo album.</p>
                        </div>
                    </div>
                </div>
            </div>

            <MediaPreview item={previewItem} onClose={() => setPreviewItem(null)} />
            <AssignMediaModal
                item={assignItem}
                phases={phases}
                tasks={tasks}
                onClose={() => setAssignItem(null)}
                onAssigned={() => {
                    setAssignItem(null);
                    setSelectedAlbum(null);
                    setReloadKey((key) => key + 1);
                }}
            />
        </MobileLayout>
    );
};

export default PhotosTab;
