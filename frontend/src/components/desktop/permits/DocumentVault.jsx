import React, { useState, useEffect } from 'react';
import { permitService } from '../../../services/api';

const DocumentVault = () => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchDocuments = async () => {
        try {
            const response = await permitService.getDocuments();
            setDocuments(response.data);
        } catch (error) {
            console.error("Failed to fetch documents", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name.split('.')[0]); // Default title
        formData.append('document_type', 'OTHER');

        try {
            await permitService.createDocument(formData);
            fetchDocuments(); // Refresh list
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload document");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this document?")) return;
        try {
            await permitService.deleteDocument(id);
            setDocuments(documents.filter(d => d.id !== id));
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    if (loading) return <div>Loading vault...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Legal Documents</h3>
                <div className="relative">
                    <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="vault-upload"
                        disabled={uploading}
                    />
                    <label
                        htmlFor="vault-upload"
                        className={`cursor-pointer px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-sm flex items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {documents.map(doc => (
                    <div key={doc.id} className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="aspect-[3/4] bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-gray-100">
                            {/* Simple preview logic */}
                            {doc.file.endsWith('.pdf') ? (
                                <span className="text-4xl">📄</span>
                            ) : (
                                <img src={doc.file} alt={doc.title} className="w-full h-full object-cover" />
                            )}
                        </div>
                        <h4 className="font-medium text-gray-900 truncate" title={doc.title}>{doc.title}</h4>
                        <p className="text-xs text-gray-500">{doc.document_type_display}</p>

                        <button
                            onClick={() => handleDelete(doc.id)}
                            className="absolute top-2 right-2 bg-white rounded-full p-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all shadow-sm"
                            title="Delete"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                ))}

                {documents.length === 0 && (
                    <div className="col-span-full py-10 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        No documents uploaded yet.
                        <br /><span className="text-xs">Upload your Lalpurja, Nagrikta, Charkilla here.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentVault;
