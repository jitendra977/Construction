import React, { useEffect, useMemo, useState } from 'react';
import {
    Calendar,
    Eye,
    FileText,
    Image as ImageIcon,
    PlayCircle,
    X,
} from 'lucide-react';
import { dashboardService, getMediaUrl } from '../../services/api';
import MediaThumbnail from '../common/MediaThumbnail';
import MobileLayout from './MobileLayout';
import MobilePageHeader from './MobilePageHeader';

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
                        <video
                            src={item.url}
                            controls
                            playsInline
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

const MobileMediaCard = ({ item, onOpen }) => {
    const meta = TYPE_META[item.type] || TYPE_META.FILE;
    const Icon = meta.icon;

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
                    <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] text-white/75">
                        <Eye className="w-3 h-3" />
                        Preview
                    </span>
                </div>
                <p className="text-white text-[11px] font-semibold leading-snug line-clamp-2">{item.title}</p>
                <p className="text-white/70 text-[10px] mt-1 line-clamp-1">{item.subtitle}</p>
            </div>
        </button>
    );
};

const PhotosTab = () => {
    const [groupedGallery, setGroupedGallery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [groupBy, setGroupBy] = useState('timeline');
    const [previewItem, setPreviewItem] = useState(null);

    useEffect(() => {
        const fetchGallery = async () => {
            setLoading(true);
            try {
                const response = await dashboardService.getGallery(groupBy);
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
    }, [groupBy]);

    const totalItems = useMemo(
        () => groupedGallery.reduce((acc, group) => acc + group.items.length, 0),
        [groupedGallery],
    );

    return (
        <MobileLayout>
            <MobilePageHeader
                title="Media Feed"
                subtitle={`${totalItems} project files`}
                rightExtra={(
                    <div style={{ position: 'relative' }}>
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value)}
                            style={{
                                background: 'var(--t-surface2)',
                                border: '1px solid var(--t-border)',
                                borderRadius: 12,
                                padding: '6px 30px 6px 12px',
                                fontSize: 10,
                                textTransform: 'uppercase',
                                letterSpacing: '0.16em',
                                fontFamily: "'DM Mono', monospace",
                                color: 'var(--t-primary)',
                                outline: 'none',
                                appearance: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            <option value="timeline">Timeline</option>
                            <option value="phases">Phases</option>
                            <option value="blueprints">Engine</option>
                            <option value="permits">Docs</option>
                        </select>
                        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--t-primary)', fontSize: 8 }}>▼</div>
                    </div>
                )}
            />

            <div className="cyber-wrap pb-28 pt-4">
                <div className="ht-sec">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[var(--t-text3)]">
                            <div className="w-8 h-8 rounded-full border-2 border-[var(--t-primary)]/20 border-t-[var(--t-primary)] animate-spin mb-4 shadow-[0_0_10px_var(--t-primary)]"></div>
                            <p className="text-[10px] uppercase tracking-widest font-['DM_Mono',monospace] text-[var(--t-primary)] animate-pulse">Syncing Media...</p>
                        </div>
                    ) : groupedGallery.length === 0 ? (
                        <div className="ht-empty">
                            <p>No assets found</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {groupedGallery.map((group) => (
                                <section key={group.groupName} className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-[11px] uppercase tracking-[0.22em] text-[var(--t-text2)] font-['DM_Mono',monospace] truncate">
                                                {group.groupName}
                                            </h3>
                                            <p className="text-[10px] text-[var(--t-text3)] mt-1">
                                                {group.items.length} items
                                            </p>
                                        </div>
                                        <span className="h-px bg-[var(--t-border)] flex-1"></span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {group.items.map((item) => (
                                            <MobileMediaCard
                                                key={item.id}
                                                item={item}
                                                onOpen={setPreviewItem}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 p-5 rounded-2xl bg-[var(--t-surface2)] border border-[var(--t-border)]">
                        <h3 className="text-[12px] font-black text-[var(--t-text)] mb-2 flex items-center gap-2">
                            <span>💡</span> Media प्रकार बुझ्न सजिलो
                        </h3>
                        <div className="text-[10px] text-[var(--t-text2)] space-y-2 leading-relaxed">
                            <p><strong className="text-[var(--t-text)]">Photo:</strong> साइट फोटो र प्रगति तस्वीर।</p>
                            <p><strong className="text-[var(--t-text)]">Video:</strong> प्ले बटन भएको कार्ड खोल्दा भित्रै preview हुन्छ।</p>
                            <p><strong className="text-[var(--t-text)]">PDF:</strong> सेतो/रातो कार्डमा document preview खुल्छ।</p>
                        </div>
                    </div>
                </div>
            </div>

            <MediaPreview item={previewItem} onClose={() => setPreviewItem(null)} />
        </MobileLayout>
    );
};

export default PhotosTab;
