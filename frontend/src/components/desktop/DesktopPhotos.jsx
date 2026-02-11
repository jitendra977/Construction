import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/api';

const DesktopPhotos = () => {
    const [groupedGallery, setGroupedGallery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [groupBy, setGroupBy] = useState('none'); // 'none' (All), 'phase', 'task', 'engineering', 'category' (Others)
    const [collapsedGroups, setCollapsedGroups] = useState({});

    const toggleGroup = (groupName) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    useEffect(() => {
        const fetchGallery = async () => {
            setLoading(true);
            try {
                const response = await dashboardService.getGallery(groupBy);
                // Prepend backend URL to relative paths if needed
                const backendUrl = 'http://localhost:8000'; // Make sure this matches your API_URL root
                const processedData = response.data.map(group => ({
                    ...group,
                    items: group.items.map(item => ({
                        ...item,
                        url: item.url && item.url.startsWith('/') ? `${backendUrl}${item.url}` : item.url
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
            case 'PDF':
                return (
                    <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-500">
                        <span className="text-4xl font-bold">PDF</span>
                    </div>
                );
            case 'VIDEO':
                return (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500">
                        <span className="text-4xl">🎬</span>
                    </div>
                );
            default:
                return (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                        <span className="text-4xl">📄</span>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Site Gallery</h2>
                    <p className="text-sm text-gray-500">Consolidated view of all construction media and documents</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {[
                            { id: 'none', label: 'All' },
                            { id: 'phase', label: 'Phase' },
                            { id: 'task', label: 'Task' },
                            { id: 'engineering', label: 'Engineering' },
                            { id: 'category', label: 'Others' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setGroupBy(tab.id)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${groupBy === tab.id
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm">
                        + Add Media
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p>Aggregating site media...</p>
                </div>
            ) : groupedGallery.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-20 text-center">
                    <div className="text-4xl mb-4">📸</div>
                    <h3 className="text-lg font-medium text-gray-900">No media found</h3>
                    <p className="text-gray-500">Photos and documents will appear here once uploaded.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {groupedGallery.map((group) => {
                        const isCollapsed = collapsedGroups[group.group];

                        // Hide headers if it's the 'All' view and there's only one group
                        if (groupBy === 'none') {
                            return (
                                <div key={group.group} className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {group.items.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (item.url) window.open(item.url, '_blank');
                                                }}
                                                className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                                            >
                                                <div className="aspect-square relative flex items-center justify-center overflow-hidden bg-gray-50">
                                                    {item.file_type === 'IMAGE' ? (
                                                        <img
                                                            src={item.url}
                                                            alt={item.title}
                                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <FileIcon type={item.file_type} />
                                                    )}

                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

                                                    <div className="absolute top-2 right-2">
                                                        <span className="bg-white/90 backdrop-blur-sm shadow-sm text-[10px] font-bold px-2 py-1 rounded-md text-gray-700 uppercase">
                                                            {item.source_type.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="p-3">
                                                    <p className="text-gray-900 text-sm font-semibold truncate group-hover:text-indigo-600 transition-colors">
                                                        {item.title}
                                                    </p>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <p className="text-gray-400 text-[11px]">
                                                            {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString() : 'System'}
                                                        </p>
                                                        <p className="text-indigo-500 text-[10px] font-bold uppercase tracking-wider">
                                                            {item.file_type}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={group.group} className="space-y-4 border border-gray-200 rounded-xl overflow-hidden">
                                <div
                                    className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => toggleGroup(group.group)}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`transform transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                                            ▼
                                        </span>
                                        <h3 className="text-lg font-bold text-gray-800">{group.group}</h3>
                                        <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">
                                            {group.items.length}
                                        </span>
                                    </div>
                                </div>

                                {!isCollapsed && (
                                    <div className="p-4 bg-white">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                            {group.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (item.url) window.open(item.url, '_blank');
                                                    }}
                                                    className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                                                >
                                                    <div className="aspect-square relative flex items-center justify-center overflow-hidden bg-gray-50">
                                                        {item.file_type === 'IMAGE' ? (
                                                            <img
                                                                src={item.url}
                                                                alt={item.title}
                                                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                            />
                                                        ) : (
                                                            <FileIcon type={item.file_type} />
                                                        )}

                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

                                                        <div className="absolute top-2 right-2">
                                                            <span className="bg-white/90 backdrop-blur-sm shadow-sm text-[10px] font-bold px-2 py-1 rounded-md text-gray-700 uppercase">
                                                                {item.source_type.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="p-3">
                                                        <p className="text-gray-900 text-sm font-semibold truncate group-hover:text-indigo-600 transition-colors">
                                                            {item.title}
                                                        </p>
                                                        <div className="flex justify-between items-center mt-1">
                                                            <p className="text-gray-400 text-[11px]">
                                                                {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString() : 'System'}
                                                            </p>
                                                            <p className="text-indigo-500 text-[10px] font-bold uppercase tracking-wider">
                                                                {item.file_type}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DesktopPhotos;
