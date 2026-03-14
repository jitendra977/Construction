import React, { useState, useEffect } from 'react';
import { dashboardService, getMediaUrl } from '../../services/api';
import MobileLayout from './MobileLayout';

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
            case 'PDF': return <span className="dynamic-subtitle text-red-500">PDF</span>;
            case 'VIDEO': return <span className="text-xl">🎬</span>;
            default: return <span className="text-xl">📄</span>;
        }
    };

    const headerExtra = (
        <div className="relative">
            <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="bg-white/50 backdrop-blur-md border border-slate-200 rounded-xl px-4 py-2 dynamic-subtitle outline-none shadow-sm appearance-none pr-8 text-emerald-600"
            >
                <option value="timeline">Timeline</option>
                <option value="phases">Phases</option>
                <option value="blueprints">Engine</option>
                <option value="permits">Docs</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500 text-[10px]">▼</div>
        </div>
    );

    return (
        <MobileLayout 
            title="Gallery" 
            subtitle="Project Media Feed"
            headerExtra={headerExtra}
        >
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mb-6"></div>
                    <p className="dynamic-subtitle opacity-50">Syncing Media...</p>
                </div>
            ) : groupedGallery.length === 0 ? (
                <div className="text-center py-24 card-glass rounded-[2rem] border-dashed border-slate-100">
                    <p className="text-slate-400 dynamic-body">No assets found</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {groupedGallery.map((group) => (
                        <div key={group.groupName} className="space-y-5 px-1">
                            <h3 className="text-slate-400 dynamic-subtitle flex items-center gap-3">
                                {group.groupName}
                                <span className="h-px bg-slate-100 flex-1"></span>
                                <span className="bg-emerald-50 text-emerald-500 px-2 py-0.5 rounded-lg tabular-nums dynamic-subtitle">{group.items.length}</span>
                            </h3>
                            <div className="grid grid-cols-2 gap-5">
                                {group.items.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (item.url) window.open(item.url, '_blank');
                                        }}
                                        className="aspect-square bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 relative group active:scale-95 transition-all duration-300 card-glass"
                                    >
                                        {item.media_type === 'IMAGE' ? (
                                            <img
                                                src={item.url}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-50 text-3xl">
                                                <FileIcon type={item.media_type} />
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                                            <p className="text-white truncate leading-tight dynamic-subtitle">{item.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button className="fixed bottom-28 right-6 bg-emerald-600 text-white w-16 h-16 rounded-2xl shadow-xl shadow-emerald-100 hover:scale-110 active:scale-90 transition-all z-40 flex items-center justify-center border-4 border-white">
                <span className="text-2xl">📸</span>
            </button>
        </MobileLayout>
    );
};

export default PhotosTab;
