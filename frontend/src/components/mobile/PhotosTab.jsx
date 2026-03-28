import React, { useState, useEffect } from 'react';
import { dashboardService, getMediaUrl } from '../../services/api';
import MobileLayout from './MobileLayout';
import MobilePageHeader from './MobilePageHeader';

const PhotosTab = () => {
    const [groupedGallery, setGroupedGallery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [groupBy, setGroupBy] = useState('timeline');

    useEffect(() => {
        const fetchGallery = async () => {
            setLoading(true);
            try {
                const response = await dashboardService.getGallery(groupBy);
                const processedData = response.data.map(group => ({
                    ...group,
                    items: group.items.map(item => ({
                        ...item,
                        url: getMediaUrl(item.url)
                    }))
                }));
                setGroupedGallery(processedData);
            } catch (error) {
                console.error("Failed to load gallery", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGallery();
    }, [groupBy]);

    const FileIcon = ({ type }) => {
        switch (type) {
            case 'PDF': return <span className="text-[var(--t-danger)] font-bold">PDF</span>;
            case 'VIDEO': return <span className="text-xl">🎬</span>;
            default: return <span className="text-[var(--t-text2)] text-xl">📄</span>;
        }
    };

    const headerExtra = (
        <div className="relative">
            <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-[2px] px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] font-['DM_Mono',monospace] text-[var(--t-primary)] outline-none appearance-none pr-8 cursor-pointer focus:border-[var(--t-primary)] transition-colors"
            >
                <option value="timeline">Timeline</option>
                <option value="phases">Phases</option>
                <option value="blueprints">Engine</option>
                <option value="permits">Docs</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--t-primary)] text-[8px]">▼</div>
        </div>
    );

    return (
        <MobileLayout>
            <MobilePageHeader
                title="Media Feed"
                subtitle="Project Gallery"
                rightExtra={
                    <div style={{ position: 'relative' }}>
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value)}
                            style={{
                                background: 'var(--t-surface2)',
                                border: '1px solid var(--t-border)',
                                borderRadius: 4,
                                padding: '4px 28px 4px 10px',
                                fontSize: 9,
                                textTransform: 'uppercase',
                                letterSpacing: '0.2em',
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
                        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--t-primary)', fontSize: 8 }}>▼</div>
                    </div>
                }
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
                                <div key={group.groupName} className="space-y-3">
                                    <h3 className="flex items-center gap-3">
                                        <span className="text-[10px] uppercase tracking-widest text-[var(--t-text2)] font-['DM_Mono',monospace]">{group.groupName}</span>
                                        <span className="h-px bg-[var(--t-border)] flex-1"></span>
                                        <span className="bg-[var(--t-primary)]/10 text-[var(--t-primary)] border border-[var(--t-primary)]/30 px-2 py-0.5 rounded-[1px] text-[8px] font-['DM_Mono',monospace]">{group.items.length}</span>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {group.items.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (item.url) window.open(item.url, '_blank');
                                                }}
                                                className="aspect-square bg-[var(--t-surface)] rounded-[2px] overflow-hidden border border-[var(--t-border)] relative group active:scale-95 transition-all duration-300 cursor-pointer hover:border-[var(--t-primary)]"
                                            >
                                                {item.media_type === 'IMAGE' ? (
                                                    <img
                                                        src={item.url}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100 mix-blend-luminosity group-hover:mix-blend-normal"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-[var(--t-surface2)] text-2xl group-hover:text-[var(--t-primary)] transition-colors">
                                                        <FileIcon type={item.media_type} />
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-[var(--t-bg)] via-[var(--t-bg)]/80 to-transparent">
                                                    <p className="text-[var(--t-text)] truncate leading-tight text-[10px] uppercase tracking-wider font-['DM_Mono',monospace]">{item.title}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <button className="fixed bottom-24 right-6 w-12 h-12 bg-[var(--t-primary)] text-[var(--t-bg)] flex items-center justify-center rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all z-40 border border-[var(--t-primary)]/20 focus:outline-none">
                <span className="text-xl">📸</span>
            </button>
        </MobileLayout>
    );
};

export default PhotosTab;
