import React, { useEffect, useMemo, useState } from 'react';
import {
    Calendar,
    Download,
    Eye,
    FileText,
    Image as ImageIcon,
    PlayCircle,
    X,
} from 'lucide-react';
import { dashboardService, getMediaUrl } from '../../services/api';
import MediaThumbnail from '../common/MediaThumbnail';
import { useConstruction } from '../../context/ConstructionContext';
import ManagementTabs from './manage/ManagementTabs';

const TYPE_META = {
    IMAGE: {
        label: 'Photo',
        icon: ImageIcon,
        badgeClass: 'bg-emerald-500 text-white border-emerald-400',
        panelClass: 'from-slate-900 via-slate-800 to-slate-900',
        iconClass: 'text-emerald-300',
    },
    VIDEO: {
        label: 'Video',
        icon: PlayCircle,
        badgeClass: 'bg-violet-500 text-white border-violet-400',
        panelClass: 'from-slate-950 via-violet-950/80 to-slate-900',
        iconClass: 'text-violet-300',
    },
    PDF: {
        label: 'PDF',
        icon: FileText,
        badgeClass: 'bg-rose-500 text-white border-rose-400',
        panelClass: 'from-white via-rose-50 to-slate-100',
        iconClass: 'text-rose-500',
    },
    FILE: {
        label: 'File',
        icon: FileText,
        badgeClass: 'bg-slate-500 text-white border-slate-400',
        panelClass: 'from-slate-200 via-slate-100 to-white',
        iconClass: 'text-slate-500',
    },
};

const normalizeItem = (item) => {
    const type = (item.media_type || item.file_type || 'FILE').toUpperCase();
    const safeType = TYPE_META[type] ? type : 'FILE';
    const uploadedAt = item.uploaded_at ? new Date(item.uploaded_at) : null;

    return {
        ...item,
        url: getMediaUrl(item.url),
        type: safeType,
        subtitle: item.subtitle || item.category || TYPE_META[safeType].label,
        uploadedAt,
        uploadedLabel: uploadedAt && !Number.isNaN(uploadedAt.getTime())
            ? uploadedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : '',
    };
};

const MediaVisual = ({ item, rounded = 'rounded-3xl' }) => {
    const meta = TYPE_META[item.type] || TYPE_META.FILE;
    const Icon = meta.icon;

    if (item.type !== 'FILE') {
        return (
            <div className={`w-full h-full overflow-hidden ${rounded}`}>
                <MediaThumbnail item={item} />
            </div>
        );
    }

    return (
        <div className={`w-full h-full bg-gradient-to-br ${meta.panelClass} ${rounded} flex flex-col justify-between p-4`}>
            <span className={`inline-flex items-center gap-1 self-start rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${meta.badgeClass}`}>
                <Icon className="w-3.5 h-3.5" />
                {meta.label}
            </span>
            <div>
                <div className="w-16 h-16 rounded-2xl bg-white/85 backdrop-blur-sm flex items-center justify-center shadow-sm">
                    <Icon className={`w-9 h-9 ${meta.iconClass}`} />
                </div>
                <p className={`mt-4 text-sm font-semibold ${item.type === 'PDF' || item.type === 'FILE' ? 'text-slate-700' : 'text-white/80'}`}>
                    Click to preview
                </p>
            </div>
        </div>
    );
};

const MediaCard = ({ item, onOpen, compact = false }) => {
    const meta = TYPE_META[item.type] || TYPE_META.FILE;
    const Icon = meta.icon;

    return (
        <button
            type="button"
            onClick={() => onOpen(item)}
            className="group relative w-full overflow-hidden rounded-3xl border border-[var(--t-border)] bg-[var(--t-surface3)] text-left shadow-sm hover:shadow-lg transition-all"
        >
            <div className={compact ? 'aspect-square' : 'aspect-[4/5]'}>
                <MediaVisual item={item} />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${meta.badgeClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                    </span>
                    {item.uploadedLabel && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-white/70">
                            <Calendar className="w-3.5 h-3.5" />
                            {item.uploadedLabel}
                        </span>
                    )}
                </div>
                <h3 className="text-white font-bold text-sm leading-snug line-clamp-2">{item.title}</h3>
                <p className="text-white/70 text-xs mt-1 line-clamp-1">{item.subtitle}</p>
            </div>
        </button>
    );
};

const MediaPreviewModal = ({ item, onClose }) => {
    if (!item) return null;
    const meta = TYPE_META[item.type] || TYPE_META.FILE;

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/92 backdrop-blur-md flex items-center justify-center p-4"
            onClick={onClose}
        >
            <button
                type="button"
                className="absolute top-4 right-4 text-white/70 hover:text-white p-2 transition-colors"
                onClick={onClose}
            >
                <X className="w-8 h-8" />
            </button>

            <div
                className="w-full max-w-6xl max-h-[92vh] bg-[var(--t-surface)] rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[var(--t-border)] bg-[var(--t-surface2)]">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${meta.badgeClass}`}>
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
                        <h3 className="text-xl font-black text-[var(--t-text)] line-clamp-2">{item.title}</h3>
                        <p className="text-sm text-[var(--t-text2)] mt-1 line-clamp-2">{item.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--t-border)] text-xs font-bold uppercase tracking-[0.18em] text-[var(--t-text2)] hover:text-[var(--t-text)]"
                        >
                            <Eye className="w-4 h-4" />
                            Open
                        </a>
                        <a
                            href={item.url}
                            download
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--t-primary)] text-[var(--t-bg)] text-xs font-bold uppercase tracking-[0.18em]"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </a>
                    </div>
                </div>

                <div className="min-h-[60vh] max-h-[78vh] bg-black/95 flex items-center justify-center p-6">
                    {item.type === 'IMAGE' && (
                        <img
                            src={item.url}
                            alt={item.title}
                            className="max-h-[72vh] max-w-full object-contain rounded-2xl"
                        />
                    )}
                    {item.type === 'VIDEO' && (
                        <video
                            src={item.url}
                            controls
                            playsInline
                            className="max-h-[72vh] max-w-full rounded-2xl bg-black"
                        />
                    )}
                    {item.type === 'PDF' && (
                        <iframe
                            src={item.url}
                            title={item.title}
                            className="w-full h-[72vh] rounded-2xl bg-white"
                        />
                    )}
                    {item.type === 'FILE' && (
                        <div className="w-full max-w-lg rounded-3xl bg-white p-10 text-center">
                            <FileText className="w-16 h-16 mx-auto text-slate-500 mb-4" />
                            <h4 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h4>
                            <p className="text-sm text-slate-600">Preview is not available for this file type.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DesktopPhotos = () => {
    const { stats } = useConstruction();
    const [groupedGallery, setGroupedGallery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('phases');
    const [lightboxItem, setLightboxItem] = useState(null);

    useEffect(() => {
        const fetchGallery = async () => {
            setLoading(true);
            try {
                const response = await dashboardService.getGallery(viewMode);
                const processedData = response.data.map((group) => ({
                    ...group,
                    items: group.items.map(normalizeItem),
                }));
                setGroupedGallery(processedData);
            } catch (error) {
                console.error('Failed to load gallery:', error);
                setGroupedGallery([]);
            } finally {
                setLoading(false);
            }
        };

        fetchGallery();
    }, [viewMode]);

    const totalItems = useMemo(
        () => groupedGallery.reduce((acc, group) => acc + group.items.length, 0),
        [groupedGallery],
    );

    const tabs = [
        { id: 'timeline', label: 'Timeline', icon: '📸' },
        { id: 'phases', label: 'Phases', icon: '🏗️' },
        { id: 'blueprints', label: 'Blueprints', icon: '📐' },
        { id: 'permits', label: 'Permits', icon: '🏛️' },
    ];

    return (
        <div className="min-h-screen bg-[var(--t-bg)] font-sans flex flex-col">
            <ManagementTabs />

            <div className="bg-[var(--t-surface)] border-b border-[var(--t-border)] shadow-xl pb-16 pt-8 px-6 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <span className="text-9xl">📸</span>
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-[var(--t-text)] tracking-tight flex items-center gap-3">
                                🖼️ Construction Archive
                            </h1>
                            <p className="text-[var(--t-text2)] mt-1 text-sm md:text-base font-medium opacity-90">
                                Photos, videos, PDFs, and site records in one clean gallery.
                            </p>
                        </div>

                        <div className="flex bg-[var(--t-surface)]/10 backdrop-blur-md p-1.5 rounded-xl border border-white/20 shadow-lg">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setViewMode(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                                        viewMode === tab.id
                                            ? 'bg-[var(--t-primary)] text-[var(--t-bg)] shadow-md'
                                            : 'text-[var(--t-text2)] hover:text-[var(--t-text)] hover:bg-[var(--t-surface)]/10'
                                    }`}
                                >
                                    <span className="text-lg">{tab.icon}</span>
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[var(--t-surface2)] rounded-xl p-3 border border-[var(--t-border)]">
                            <div className="text-[var(--t-text3)] text-[10px] font-bold uppercase tracking-wider opacity-80">Gallery Items</div>
                            <div className="text-xl font-bold text-[var(--t-text)] mt-0.5">
                                {totalItems} Files
                            </div>
                        </div>
                        {stats.slice(0, 3).map((stat, idx) => (
                            <div key={idx} className="bg-[var(--t-surface2)] rounded-xl p-3 border border-[var(--t-border)] hidden sm:block">
                                <div className="text-[var(--t-text3)] text-[10px] font-bold uppercase tracking-wider opacity-80">{stat.title}</div>
                                <div className="text-xl font-bold text-[var(--t-text)] mt-0.5 flex justify-between items-center">
                                    <span>{stat.value}</span>
                                    <span className="text-lg opacity-60">{stat.icon}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto -mt-6 pb-20 relative z-20">
                <div className="max-w-7xl mx-auto px-6 md:px-8">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--t-primary)] border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fadeIn">
                            {groupedGallery.length === 0 && (
                                <div className="text-center py-20 bg-[var(--t-surface)] rounded-3xl border border-dashed border-[var(--t-border)]">
                                    <div className="text-6xl mb-4">📂</div>
                                    <h3 className="text-xl font-bold text-[var(--t-text3)]">No items found</h3>
                                    <p className="text-sm text-[var(--t-text3)] mt-2">This collection is empty.</p>
                                </div>
                            )}

                            {groupedGallery.map((group) => (
                                <section key={group.groupName} className="bg-[var(--t-surface)] rounded-3xl shadow-sm border border-[var(--t-border)] overflow-hidden">
                                    <div className="px-6 py-4 bg-[var(--t-surface2)] border-b border-[var(--t-border)] flex items-center gap-4">
                                        <h2 className="text-lg font-black text-[var(--t-text)] flex items-center gap-2 uppercase tracking-wide">
                                            {group.groupName === 'undefined' ? 'Uncategorized' : group.groupName}
                                            <span className="text-xs font-bold bg-[var(--t-surface3)] text-[var(--t-text2)] px-2 py-1 rounded-md">{group.items.length}</span>
                                        </h2>
                                    </div>

                                    <div className="p-6">
                                        {viewMode === 'timeline' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                {group.items.map((item) => (
                                                    <MediaCard
                                                        key={item.id}
                                                        item={item}
                                                        onOpen={setLightboxItem}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {(viewMode === 'phases' || viewMode === 'blueprints') && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                {group.items.map((item) => (
                                                    <MediaCard
                                                        key={item.id}
                                                        item={item}
                                                        onOpen={setLightboxItem}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {viewMode === 'permits' && (
                                            <div className="grid grid-cols-1 gap-4">
                                                {group.items.map((item) => {
                                                    const meta = TYPE_META[item.type] || TYPE_META.FILE;
                                                    const Icon = meta.icon;

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center gap-4 p-4 bg-[var(--t-surface2)] rounded-2xl border border-[var(--t-border)] hover:shadow-md transition-all"
                                                        >
                                                            <div className="w-24 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setLightboxItem(item)}
                                                                    className="w-full aspect-[4/5] overflow-hidden rounded-2xl border border-[var(--t-border)]"
                                                                >
                                                                    <MediaVisual item={item} rounded="rounded-2xl" />
                                                                </button>
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${meta.badgeClass}`}>
                                                                        <Icon className="w-3.5 h-3.5" />
                                                                        {meta.label}
                                                                    </span>
                                                                    {item.uploadedLabel && (
                                                                        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--t-text3)]">
                                                                            {item.uploadedLabel}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <h3 className="font-bold text-[var(--t-text)] text-base line-clamp-2">{item.title}</h3>
                                                                <p className="text-sm text-[var(--t-text2)] mt-1 line-clamp-2">{item.subtitle}</p>
                                                            </div>
                                                            <div className="flex flex-col gap-2 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setLightboxItem(item)}
                                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--t-text2)]"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                    Preview
                                                                </button>
                                                                <a
                                                                    href={item.url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl text-xs font-bold uppercase tracking-wider"
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                    Open
                                                                </a>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}

                    <div className="mt-12 p-6 rounded-[2rem] bg-blue-50/50 border border-blue-100">
                        <h3 className="text-lg font-black text-blue-900 mb-3 flex items-center gap-2">
                            <span>💡</span> Media archive guide
                        </h3>
                        <div className="text-sm font-medium text-blue-800/80 space-y-3 leading-relaxed">
                            <p><strong className="text-blue-900">Photo:</strong> Site images and progress shots preview directly.</p>
                            <p><strong className="text-blue-900">Video:</strong> Video cards no longer render as black boxes; open them to play inside the viewer.</p>
                            <p><strong className="text-blue-900">PDF:</strong> Permit and blueprint PDFs open in the preview panel with a clear document tile.</p>
                        </div>
                    </div>
                </div>
            </div>

            <MediaPreviewModal item={lightboxItem} onClose={() => setLightboxItem(null)} />
        </div>
    );
};

export default DesktopPhotos;
