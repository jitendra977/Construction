import React from 'react';

const PhotosTab = () => {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Site Photos</h2>

            <div className="grid grid-cols-2 gap-3">
                {/* Mock Placeholders */}
                {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={item} className="aspect-square bg-gray-200 rounded-xl animate-pulse flex items-center justify-center">
                        <span className="text-gray-400 text-2xl">📷</span>
                    </div>
                ))}
            </div>

            <div className="text-center py-8">
                <p className="text-gray-500">Gallery feature coming soon...</p>
            </div>

            <button className="fixed bottom-20 right-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-full shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform">
                <span className="text-2xl">📸</span>
            </button>
        </div>
    );
};

export default PhotosTab;
