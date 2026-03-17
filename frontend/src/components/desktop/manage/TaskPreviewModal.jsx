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
            case 'IN_PROGRESS': return 'bg-[var(--t-nav-active-bg)] text-[var(--t-nav-active-text)] border-[var(--t-border)]';
            case 'BLOCKED': return 'bg-red-100 text-[var(--t-danger)] border-[var(--t-danger)]/30';
            default: return 'bg-[var(--t-surface3)] text-[var(--t-text2)] border-[var(--t-border)]';
        }
    };

    const getPriorityStyle = (priority) => {
        switch (priority) {
            case 'CRITICAL': return 'bg-[var(--t-danger)]/10 text-[var(--t-danger)] border-[var(--t-danger)]/30';
            case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'MEDIUM': return 'bg-[var(--t-nav-active-bg)] text-[var(--t-nav-active-text)] border-[var(--t-border)]';
            default: return 'bg-[var(--t-surface2)] text-[var(--t-text2)] border-[var(--t-border)]';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Task Details">
            <div className="p-2 max-h-[85vh] overflow-y-auto custom-scrollbar space-y-6">

                {/* Header Information */}
                <div>
                    <h2 className="text-xl font-bold text-[var(--t-text)] leading-tight">
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
                <div className="bg-[var(--t-surface2)] rounded-xl p-4 border border-[var(--t-border)] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">
                            Phase
                        </div>
                        <div className="text-sm font-semibold text-[var(--t-text)]">
                            {getPhaseName(task.phase)}
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">
                            Assigned To
                        </div>
                        <div className="text-sm font-semibold text-[var(--t-text)] flex items-center gap-2">
                            <span>👤</span> {getContractorName(task.assigned_to)}
                        </div>
                    </div>
                </div>

                {/* Description Box */}
                {task.description && (
                    <div>
                        <div className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-widest mb-2 border-b border-[var(--t-border)] pb-1">
                            Task Description
                        </div>
                        <p className="text-sm text-[var(--t-text2)] leading-relaxed font-medium whitespace-pre-wrap">
                            {task.description}
                        </p>
                    </div>
                )}

                {/* Task Proofs (Media) */}
                {task.media && task.media.length > 0 && (
                    <div>
                        <div className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-widest mb-3 flex items-center gap-2">
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
                                    className="block group relative rounded-xl overflow-hidden shadow-sm border border-[var(--t-border)] aspect-square"
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
