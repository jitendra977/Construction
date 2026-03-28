import React, { useState, useEffect } from 'react';
import { dashboardService, getMediaUrl } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';

const DesktopPhotos = () => {
    const { stats, budgetStats } = useConstruction();
    const [groupedGallery, setGroupedGallery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('timeline'); // 'timeline', 'phases', 'blueprints', 'permits'
    const [lightboxItem, setLightboxItem] = useState(null);

    useEffect(() => {
        const fetchGallery = async () => {
            setLoading(true);
            try {
                // Pass viewMode as group_by parameter to backend
                const response = await dashboardService.getGallery(viewMode);
                // Process backend data directly
                const processedData = response.data.map(group => ({
                    ...group,
                    items: group.items.map(item => ({
                        ...item,
                        url: getMediaUrl(item.url),
                        // Normalized fields
                        type: (item.media_type || 'IMAGE').toUpperCase()
                    }))
                }));
                setGroupedGallery(processedData);
            } catch (error) {
                console.error("Failed to load gallery:", error);
                setGroupedGallery([]);
            } finally {
                setLoading(false);
            }
        };

        fetchGallery();
    }, [viewMode]);

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = 'https://placehold.co/600x400/e2e8f0/475569?text=Unavailable';
    };

    // Tab Configuration
    const tabs = [
        { id: 'timeline', label: 'Timeline', icon: '📸' },
        { id: 'phases', label: 'Phases', icon: '🏗️' },
        { id: 'blueprints', label: 'Blueprints', icon: '📐' },
        { id: 'permits', label: 'Permits', icon: '🏛️' },
    ];

    return (
        <div className="min-h-screen bg-[var(--t-bg)] font-sans flex flex-col">
            {/* Themed Header */}
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
                                Digital record of photos, blueprints, and permits.
                            </p>
                        </div>

                        {/* Tab Navigation (Glassmorphism) */}
                        <div className="flex bg-[var(--t-surface)]/10 backdrop-blur-md p-1.5 rounded-xl border border-white/20 shadow-lg">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setViewMode(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${viewMode === tab.id
                                        ? 'bg-[var(--t-primary)] text-[var(--t-bg)] shadow-md transform scale-100'
                                        : 'text-[var(--t-text2)] hover:text-[var(--t-text)] hover:bg-[var(--t-surface)]/10'
                                        }`}
                                >
                                    <span className="text-lg">{tab.icon}</span>
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stats Grid inside Header (Matching DesktopHome) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[var(--t-surface2)] rounded-xl p-3 border border-[var(--t-border)]">
                            <div className="text-[var(--t-text3)] text-[10px] font-bold uppercase tracking-wider opacity-80">Timeline Items</div>
                            <div className="text-xl font-bold text-[var(--t-text)] mt-0.5">
                                {groupedGallery.reduce((acc, g) => acc + g.items.length, 0)} Files
                            </div>
                        </div>
                        {stats.slice(0, 3).map((stat, idx) => (
                            <div key={idx} className="bg-[var(--t-surface2)] rounded-xl p-3 border border-[var(--t-border)] hidden sm:block">
                                <div className="text-[var(--t-text3)] text-[10px] font-bold uppercase tracking-wider opacity-80">{stat.title}</div>
                                <div className="text-xl font-bold text-[var(--t-text)] mt-0.5 flex justify-between items-center">
                                    <span>{stat.title.toLowerCase().includes('count') ? stat.value : `${stat.value}`}</span>
                                    <span className="text-lg opacity-60">{stat.icon}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area - Overlapping for modern look */}
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
                                <div key={group.groupName} className="bg-[var(--t-surface)] rounded-3xl shadow-sm border border-[var(--t-border)] overflow-hidden">
                                    {/* Section Header */}
                                    <div className="px-6 py-4 bg-[var(--t-surface2)] border-b border-[var(--t-border)] flex items-center gap-4">
                                        <h2 className="text-lg font-black text-[var(--t-text)] flex items-center gap-2 uppercase tracking-wide">
                                            {group.groupName === 'undefined' ? 'Uncategorized' : group.groupName}
                                            <span className="text-xs font-bold bg-[var(--t-surface3)] text-[var(--t-text2)] px-2 py-1 rounded-md">{group.items.length}</span>
                                        </h2>
                                    </div>

                                    <div className="p-6">
                                        {/* VIEW MODE: TIMELINE (Masonry) */}
                                        {viewMode === 'timeline' && (
                                            <div className="masonry-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                                                {group.items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => setLightboxItem(item)}
                                                        className="group relative cursor-pointer overflow-hidden rounded-lg aspect-square bg-[var(--t-surface3)] border border-[var(--t-border)]"
                                                    >
                                                        {item.type === 'VIDEO' ? (
                                                            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                                                <span className="text-4xl">▶️</span>
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={item.url}
                                                                alt={item.title}
                                                                loading="lazy"
                                                                onError={handleImageError}
                                                                className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                                                            />
                                                        )}
                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                            <p className="text-white font-bold text-[10px] truncate uppercase tracking-tighter">{item.title}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* VIEW MODE: PHASES / BLUEPRINTS (Grid Cards) */}
                                        {(viewMode === 'phases' || viewMode === 'blueprints') && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                {group.items.map((item) => (
                                                    <div key={item.id} className="group cursor-pointer" onClick={() => setLightboxItem(item)}>
                                                        <div className="aspect-square rounded-2xl overflow-hidden bg-[var(--t-surface3)] mb-3 border border-[var(--t-border)] relative shadow-sm group-hover:shadow-md transition-all">
                                                            {item.type === 'PDF' ? (
                                                                <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--t-danger)]/10 text-[var(--t-danger)]">
                                                                    <span className="text-4xl mb-2">📄</span>
                                                                    <span className="text-xs font-bold uppercase tracking-wider">PDF Document</span>
                                                                </div>
                                                            ) : (
                                                                <img
                                                                    src={item.url}
                                                                    alt={item.title}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                    onError={handleImageError}
                                                                />
                                                            )}
                                                            {/* Type Badge */}
                                                            <div className="absolute top-2 right-2">
                                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm ${item.category === 'Blueprint' ? 'bg-blue-500 text-white' :
                                                                    item.category === 'Site Photo' ? 'bg-emerald-500 text-white' :
                                                                        'bg-[var(--t-surface3)] text-[var(--t-text)] backdrop-blur-sm shadow-sm border border-[var(--t-border)]'
                                                                    }`}>
                                                                    {item.category}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-[var(--t-text)] group-hover:text-[var(--t-primary)] transition-colors truncate">{item.title}</h3>
                                                            <p className="text-xs text-[var(--t-text2)] mt-1">{item.subtitle}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* VIEW MODE: PERMITS (List) */}
                                        {viewMode === 'permits' && (
                                            <div className="grid grid-cols-1 gap-3">
                                                {group.items.map((item) => (
                                                    <div key={item.id} className="flex items-center p-4 bg-[var(--t-surface2)] rounded-xl border border-[var(--t-border)] hover:bg-[var(--t-surface)] hover:border-[var(--t-border)] hover:shadow-md transition-all group cursor-pointer" onClick={() => window.open(item.url, '_blank')}>
                                                        <div className="w-12 h-12 rounded-lg bg-[var(--t-danger)]/10 text-[var(--t-danger)] flex items-center justify-center text-2xl mr-4 shrink-0">
                                                            {item.type === 'PDF' ? '📄' : '🖼️'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-bold text-[var(--t-text)] group-hover:text-[var(--t-primary)] truncate">{item.title}</h3>
                                                            <p className="text-xs text-[var(--t-text2)] mt-1 flex items-center gap-2">
                                                                <span className="inline-block w-2 h-2 rounded-full bg-[var(--t-primary)]"></span>
                                                                {item.subtitle} • {new Date(item.uploaded_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <button className="px-4 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg text-xs font-bold uppercase tracking-wider text-[var(--t-text2)] group-hover:bg-[var(--t-nav-active-bg)] group-hover:text-[var(--t-primary)] group-hover:border-[var(--t-border)] transition-colors">
                                                            Download
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {lightboxItem && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center animate-fadeIn"
                    onClick={() => setLightboxItem(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white/50 hover:text-white p-2 transition-colors"
                        onClick={() => setLightboxItem(null)}
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="max-w-7xl max-h-screen p-4 flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        {lightboxItem.type === 'VIDEO' ? (
                            <video src={lightboxItem.url} controls className="max-h-[80vh] w-auto rounded-lg shadow-2xl" />
                        ) : (
                            <img
                                src={lightboxItem.url}
                                alt={lightboxItem.title}
                                className="max-h-[85vh] w-auto object-contain rounded-lg shadow-2xl"
                            />
                        )}
                        <div className="mt-4 text-center">
                            <h3 className="text-white font-bold text-xl">{lightboxItem.title}</h3>
                            <p className="text-white/60 text-sm mt-1">{lightboxItem.subtitle}</p>
                            <a
                                href={lightboxItem.url}
                                download
                                className="mt-4 inline-block px-6 py-2 bg-[var(--t-surface)]/10 hover:bg-[var(--t-surface)]/20 text-white rounded-full text-sm font-bold uppercase tracking-wider transition-colors border border-white/20 backdrop-blur-sm"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Download Original
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DesktopPhotos;
