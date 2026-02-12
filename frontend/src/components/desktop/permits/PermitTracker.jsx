import React, { useState, useEffect } from 'react';
import { permitService } from '../../../services/api';
import api from '../../../services/api';

const PermitTracker = ({ onUpdate }) => {
    const [steps, setSteps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStep, setEditingStep] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'PENDING',
        date_issued: '',
        notes: '',
        order: 0
    });

    const fetchSteps = async () => {
        try {
            const response = await permitService.getSteps();
            const sortedSteps = response.data.sort((a, b) => a.order - b.order || a.id - b.id);
            setSteps(sortedSteps);
        } catch (error) {
            console.error("Failed to fetch permit steps", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSteps();
    }, []);

    const handleOpenModal = (step = null) => {
        if (step) {
            setEditingStep(step);
            setFormData({
                title: step.title,
                description: step.description || '',
                status: step.status,
                date_issued: step.date_issued || '',
                notes: step.notes || '',
                order: step.order
            });
        } else {
            setEditingStep(null);
            const maxOrder = steps.length > 0 ? Math.max(...steps.map(s => s.order)) : 0;
            setFormData({
                title: '',
                description: '',
                status: 'PENDING',
                date_issued: '',
                notes: '',
                order: maxOrder + 1
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingStep(null);
        setFormData({
            title: '',
            description: '',
            status: 'PENDING',
            date_issued: '',
            notes: '',
            order: 0
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingStep) {
                await permitService.updateStep(editingStep.id, formData);
            } else {
                await permitService.createStep(formData);
            }
            await fetchSteps();
            handleCloseModal();
            onUpdate?.();
        } catch (error) {
            console.error("Failed to save permit step", error);
            alert("Failed to save permit step. Please try again.");
        }
    };

    const handleDelete = async (stepId) => {
        try {
            await permitService.deleteStep(stepId);
            await fetchSteps();
            setDeleteConfirm(null);
            onUpdate?.();
        } catch (error) {
            console.error("Failed to delete permit step", error);
            alert("Failed to delete permit step. Please try again.");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (loading) return <div className="p-4 text-center">Loading steps...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Naksha Pass Process (Nagar Palika)</h3>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Step
                </button>
            </div>

            {steps.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">No permit steps defined yet.</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="mt-4 text-indigo-600 hover:text-indigo-700 font-semibold"
                    >
                        Create your first step
                    </button>
                </div>
            ) : (
                <div className="relative border-l-2 border-indigo-200 ml-3 space-y-8 pb-4">
                    {steps.map((step) => (
                        <div key={step.id} className="relative pl-8">
                            <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${step.status === 'APPROVED' ? 'bg-green-500 border-green-500' : 'bg-white border-indigo-300'}`}></div>

                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900">{step.title}</h4>
                                        <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-lg border ${getStatusColor(step.status)}`}>
                                            {step.status.replace('_', ' ')}
                                        </span>
                                        <button
                                            onClick={() => handleOpenModal(step)}
                                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                            title="Edit"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(step)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                {step.date_issued && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        Issued: {new Date(step.date_issued).toLocaleDateString()}
                                    </div>
                                )}
                                {step.notes && (
                                    <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-100">
                                        Note: {step.notes}
                                    </div>
                                )}

                                {/* Documents Section */}
                                {step.documents && step.documents.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="text-xs font-semibold text-gray-700">
                                                Documents ({step.documents.length})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {step.documents.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <div className="flex-shrink-0">
                                                            {doc.document_type === 'NAKSHA' ? (
                                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            ) : doc.document_type === 'PHOTO' ? (
                                                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                            ) : doc.document_type === 'PERMIT' ? (
                                                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-gray-900 truncate">
                                                                {doc.title}
                                                            </p>
                                                            {doc.description && (
                                                                <p className="text-[10px] text-gray-500 truncate">
                                                                    {doc.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {doc.file && (
                                                        <a
                                                            href={doc.file}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-shrink-0 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                            title="View/Download"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingStep ? 'Edit Permit Step' : 'Add New Permit Step'}
                            </h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="e.g., Darta / Chalani (File Registration)"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    rows="3"
                                    placeholder="Detailed description of this permit step"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Status *
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="REJECTED">Rejected</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Order
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.order}
                                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Date Issued
                                </label>
                                <input
                                    type="date"
                                    value={formData.date_issued}
                                    onChange={(e) => setFormData({ ...formData, date_issued: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    rows="2"
                                    placeholder="Additional notes, permit numbers, etc."
                                />
                            </div>

                            {/* Document Management Section - Only show when editing existing step */}
                            {editingStep && (
                                <div className="pt-4 border-t border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Attached Documents</h4>

                                    {editingStep.documents && editingStep.documents.length > 0 ? (
                                        <div className="space-y-2 mb-4">
                                            {editingStep.documents.map((doc) => (
                                                <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <span className="text-xs font-medium text-gray-900 truncate">{doc.title}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                await permitService.detachDocument(editingStep.id, doc.id);
                                                                await fetchSteps();
                                                                // Update editingStep with fresh data
                                                                const response = await permitService.getSteps();
                                                                const updatedStep = response.data.find(s => s.id === editingStep.id);
                                                                setEditingStep(updatedStep);
                                                            } catch (error) {
                                                                console.error("Failed to detach document", error);
                                                                alert("Failed to remove document");
                                                            }
                                                        }}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Remove document"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 mb-4">No documents attached yet</p>
                                    )}

                                    <div className="flex gap-2">
                                        <label className="flex-1 cursor-pointer">
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files[0];
                                                    if (!file) return;

                                                    const formData = new FormData();
                                                    formData.append('file', file);
                                                    formData.append('title', file.name.split('.')[0]);
                                                    formData.append('document_type', 'OTHER');
                                                    formData.append('description', `Document for ${editingStep.title}`);

                                                    try {
                                                        // Upload document using resources API
                                                        const docResponse = await api.post('/documents/', formData, {
                                                            headers: { 'Content-Type': 'multipart/form-data' }
                                                        });

                                                        const newDoc = docResponse.data;

                                                        // Attach to permit step
                                                        await permitService.attachDocument(editingStep.id, newDoc.id);

                                                        // Refresh data
                                                        await fetchSteps();
                                                        const updatedResponse = await permitService.getSteps();
                                                        const updatedStep = updatedResponse.data.find(s => s.id === editingStep.id);
                                                        setEditingStep(updatedStep);

                                                        alert('Document uploaded and attached successfully!');
                                                    } catch (error) {
                                                        console.error("Upload failed", error);
                                                        alert(`Failed to upload document: ${error.response?.data?.detail || error.message}`);
                                                    }

                                                    // Reset input
                                                    e.target.value = '';
                                                }}
                                            />
                                            <div className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                Upload & Attach Document
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                                >
                                    {editingStep ? 'Update Step' : 'Create Step'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Delete Permit Step</h3>
                                <p className="text-sm text-gray-500">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to delete "<strong>{deleteConfirm.title}</strong>"?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermitTracker;
