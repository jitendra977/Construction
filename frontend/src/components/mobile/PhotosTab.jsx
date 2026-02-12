import React, { useState, useEffect } from 'react';
import { dashboardService, getMediaUrl } from '../../services/api';

const PhotosTab = () => {
    const [groupedGallery, setGroupedGallery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [groupBy, setGroupBy] = useState('category');

    useEffect(() => {
        const fetchGallery = async () => {
            setLoading(true);
            try {
                const response = await dashboardService.getGallery(groupBy);
                // Prepend backend URL to relative paths
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
            case 'PDF': return <span className="text-xl font-bold text-red-500">PDF</span>;
            case 'VIDEO': return <span className="text-xl">🎬</span>;
            default: return <span className="text-xl">📄</span>;
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center px-1">
                <h2 className="text-2xl font-bold text-gray-800">Gallery</h2>
                <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="bg-gray-100 rounded-lg px-3 py-1 text-sm font-medium outline-none border-none"
                >
                    <option value="none">All Media</option>
                    <option value="phase">By Phase</option>
                    <option value="task">By Task</option>
                    <option value="engineering">Engineering</option>
                    <option value="category">Others</option>
                </select>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                </div>
            ) : groupedGallery.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-gray-500">No media found</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {groupedGallery.map((group) => (
                        <div key={group.group} className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">
                                {group.group} ({group.items.length})
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {group.items.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (item.url) window.open(item.url, '_blank');
                                        }}
                                        className="aspect-square bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative group active:scale-95 transition-transform"
                                    >
                                        {item.file_type === 'IMAGE' ? (
                                            <img
                                                src={item.url}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                                <FileIcon type={item.file_type} />
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                                            <p className="text-white text-[10px] font-medium truncate">{item.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button className="fixed bottom-24 right-4 bg-indigo-600 text-white p-4 rounded-full shadow-lg shadow-indigo-600/30 hover:scale-105 transition-transform z-10">
                <span className="text-2xl">📸</span>
            </button>
        </div>
    );
};

export default PhotosTab;
