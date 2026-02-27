import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { dashboardService } from '../../services/api';
import Modal from '../common/Modal';

const AddPhotoModal = ({ isOpen, onClose }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        document_type: 'SITE_PHOTO',
        phase: '',
        room: '',
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            // Default title to filename if empty
            if (!formData.title) {
                setFormData({ ...formData, title: file.name.split('.')[0] });
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        setLoading(true);
        try {
            const uploadData = new FormData();
            uploadData.append('file_upload', selectedFile);
            uploadData.append('title', formData.title);
            uploadData.append('document_type', formData.document_type);
            if (formData.phase) uploadData.append('phase', formData.phase);
            if (formData.room) uploadData.append('room', formData.room);

            await dashboardService.createDocument(uploadData);
            refreshData();
            onClose();
            // Reset
            setSelectedFile(null);
            setPreviewUrl(null);
            setFormData({ title: '', document_type: 'SITE_PHOTO', phase: '', room: '' });
        } catch (error) {
            alert('Failed to upload photo.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Upload Progress Photo">
            <form onSubmit={handleSubmit} className="space-y-6 p-1">
                {/* File Upload / Preview Area */}
                <div
                    className={`relative aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all ${previewUrl ? 'border-transparent' : 'border-gray-200 bg-gray-50'
                        }`}
                >
                    {previewUrl ? (
                        <>
                            <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                            <button
                                type="button"
                                onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                                className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full backdrop-blur-md"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </>
                    ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl mb-3">📸</div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Phase Photo</p>
                        </label>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Photo Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-black text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all font-outfit"
                            placeholder="e.g. Ground Floor Pillar Complete"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Phase</label>
                            <select
                                value={formData.phase}
                                onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 appearance-none transition-all"
                            >
                                <option value="">General Project</option>
                                {dashboardData.phases?.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Room / Area</label>
                            <select
                                value={formData.room}
                                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 appearance-none transition-all"
                            >
                                <option value="">N/A</option>
                                {dashboardData.rooms?.map(r => (
                                    <option key={r.id} value={r.id}>{r.name} ({r.floor_name})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 text-xs font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !selectedFile}
                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Uploading...' : 'Upload Photo'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddPhotoModal;
