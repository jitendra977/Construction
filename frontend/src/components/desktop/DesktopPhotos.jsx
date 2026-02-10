import React from 'react';

const DesktopPhotos = () => {
    const [photos, setPhotos] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchPhotos = async () => {
            try {
                // Assuming 'dashboardService' is imported from parent or available props. 
                // However, since this is a child component, it might be better to import it directly if not passed.
                // Checking previous code, DesktopDashboard imports DesktopPhotos. 
                // I'll import dashboardService here to be safe and independent.
                const { dashboardService } = require('../../services/api');
                const response = await dashboardService.getDocuments('PHOTO');
                setPhotos(response.data);
            } catch (error) {
                console.error("Failed to load photos", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPhotos();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Site Gallery</h2>
                <div className="flex gap-3">
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                        Filters
                    </button>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                        + Upload Photos
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading gallery...</div>
            ) : photos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No photos uploaded yet.</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {photos.map((photo) => (
                        <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer">
                            {/* Assuming 'file' is the URL field from DocumentSerializer */}
                            <img src={photo.file} alt={photo.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-white text-sm font-medium truncate">{photo.title}</p>
                                <p className="text-white/80 text-xs">{new Date(photo.uploaded_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DesktopPhotos;
