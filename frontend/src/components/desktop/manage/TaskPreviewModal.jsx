import React from 'react';
import Modal from '../../common/Modal';
import { getMediaUrl } from '../../../services/api';
import { useConstruction } from '../../../context/ConstructionContext';

const TaskPreviewModal = ({ isOpen, onClose, task }) => {
    const { dashboardData } = useConstruction();

    if (!isOpen || !task) return null;

    const getPhaseName = (id) => dashboardData.phases?.find(p => p.id === id)?.name || 'Unknown Phase';
    const getContractorName = (id) => dashboardData.contractors?.find(c => c.id === id)?.name || 'Unassigned';

    const getStatusStyle = (status) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
            case 'IN_PROGRESS': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'BLOCKED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getPriorityStyle = (priority) => {
        switch (priority) {
            case 'CRITICAL': return 'bg-red-50 text-red-700 border-red-200';
            case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'MEDIUM': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Task Details">
            <div className="p-2 max-h-[85vh] overflow-y-auto custom-scrollbar space-y-6">

                {/* Header Information */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                        {task.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className={`px-2.5 py-1 rounded-md border text-xs font-black uppercase ${getStatusStyle(task.status)}`}>
                            {task.status}
                        </span>
                        <span className={`px-2.5 py-1 rounded-md border text-xs font-black uppercase ${getPriorityStyle(task.priority)}`}>
                            {task.priority} Priority
                        </span>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                            Phase
                        </div>
                        <div className="text-sm font-semibold text-gray-800">
                            {getPhaseName(task.phase)}
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                            Assigned To
                        </div>
                        <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <span>👤</span> {getContractorName(task.assigned_to)}
                        </div>
                    </div>
                </div>

                {/* Description Box */}
                {task.description && (
                    <div>
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-1">
                            Task Description
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed font-medium whitespace-pre-wrap">
                            {task.description}
                        </p>
                    </div>
                )}

                {/* Task Proofs (Media) */}
                {task.media && task.media.length > 0 && (
                    <div>
                        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span>📸</span> Uploaded Proofs
                            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[9px]">
                                {task.media.length} items
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {task.media.map(m => (
                                <a
                                    key={m.id}
                                    href={getMediaUrl(m.file)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block group relative rounded-xl overflow-hidden shadow-sm border border-gray-200 aspect-square"
                                >
                                    <img
                                        src={getMediaUrl(m.file)}
                                        alt="Task Proof"
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white text-xs font-bold shrink-0 px-2 py-1 bg-black/50 rounded-lg backdrop-blur-sm">View Full</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </Modal>
    );
};

export default TaskPreviewModal;
