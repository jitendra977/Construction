import React, { useState, useRef } from 'react';
import { constructionService, getMediaUrl } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';
import TaskPreviewModal from './TaskPreviewModal';

const TaskCard = ({ t, handleOpenModal, getPhaseName, getStatusColor, getContractorName, getPriorityColor, setPreviewTask }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div 
            className="bg-[var(--t-surface)] rounded-2xl p-4 border border-[var(--t-border)] shadow-sm relative overflow-hidden transition-colors group"
        >
            {t.media?.length > 0 && (
                <div className="absolute top-0 right-0 p-2 bg-[var(--t-primary)]/10 text-[var(--t-primary)] rounded-bl-xl text-[8px] font-black uppercase tracking-tighter">
                    📸 Proof attached
                </div>
            )}
            <div 
                className="flex justify-between items-start cursor-pointer mb-2"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div>
                    <h3 className="font-bold text-[var(--t-text)] group-hover:text-[var(--t-primary)] transition-colors">{t.title}</h3>
                    <div className="text-[10px] font-black text-[var(--t-primary)] uppercase mt-0.5">
                        {getPhaseName(t.phase)}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${getStatusColor(t.status)}`}>
                        {t.status}
                    </span>
                    <svg 
                        className={`w-5 h-5 text-[var(--t-text2)] transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {isExpanded && (
                <div className="animate-fadeIn mt-4" onClick={(e) => { e.stopPropagation(); setPreviewTask(t); }}>
                    <div className="flex justify-between items-center text-xs text-[var(--t-text2)] mb-4 bg-[var(--t-surface2)] p-2 rounded-xl">
                        <div>
                            <span className="text-[9px] font-bold text-[var(--t-text3)] uppercase block mb-0.5">Assigned To</span>
                            <span className="font-bold text-[var(--t-text)]">{getContractorName(t.assigned_to)}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-bold text-[var(--t-text3)] uppercase block mb-0.5">Priority</span>
                            <span className={`font-black ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                        </div>
                    </div>
                    <div className="flex gap-2 relative z-10">
                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal(t, 'edit'); }} className="flex-1 py-2 bg-[var(--t-primary)]/10 text-[var(--t-primary)] rounded-xl text-xs font-bold hover:bg-[var(--t-primary)]/20">Edit Node</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const TasksTab = ({ searchQuery = '' }) => {
    const { dashboardData } = useConstruction();
    const [previewTask, setPreviewTask] = useState(null);
    const [modalMode, setModalMode] = useState('read'); // 'read' | 'edit' | 'create'
    const [phaseFilter, setPhaseFilter] = useState('');
    const [contractorFilter, setContractorFilter] = useState('');

    const filteredTasks = (dashboardData.tasks || []).filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPhase = phaseFilter ? t.phase === parseInt(phaseFilter) : true;
        const matchesContractor = contractorFilter ? t.assigned_to === parseInt(contractorFilter) : true;
        return matchesSearch && matchesPhase && matchesContractor;
    }).sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date) : null;
        const dateB = b.due_date ? new Date(b.due_date) : null;
        if (dateA && dateB) return dateA - dateB;
        if (dateA) return -1;
        if (dateB) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const tasksByPhase = filteredTasks.reduce((acc, task) => {
        const phaseId = task.phase || 0;
        if (!acc[phaseId]) acc[phaseId] = [];
        acc[phaseId].push(task);
        return acc;
    }, {});

    const sortedPhaseIds = Object.keys(tasksByPhase).sort((a, b) => {
        const phaseA = dashboardData.phases?.find(p => p.id === parseInt(a));
        const phaseB = dashboardData.phases?.find(p => p.id === parseInt(b));
        return (phaseA?.order || 99) - (phaseB?.order || 99);
    });

    const handleOpenModal = (item = null, mode = 'edit') => {
        setPreviewTask(item);
        setModalMode(item ? mode : 'create');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'bg-[var(--t-primary)]/20 text-[var(--t-primary)] border-[var(--t-primary)]/50';
            case 'IN_PROGRESS': return 'bg-[var(--t-info)]/20 text-[var(--t-primary)] border-[var(--t-border)]';
            case 'BLOCKED': return 'bg-[var(--t-danger)]/20 text-[var(--t-danger)] border-[var(--t-danger)]/50';
            default: return 'bg-[var(--t-surface3)] text-[var(--t-text)] border-[var(--t-border)]';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'CRITICAL': return 'text-[var(--t-danger)]';
            case 'HIGH': return 'text-orange-500';
            case 'MEDIUM': return 'text-[var(--t-primary)]';
            default: return 'text-[var(--t-text2)]';
        }
    };

    const getPhaseName = (id) => dashboardData.phases?.find(p => p.id === id)?.name || 'Unknown Phase';
    const getContractorName = (id) => dashboardData.contractors?.find(c => c.id === id)?.name || 'Unassigned';

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <select
                        value={phaseFilter}
                        onChange={e => setPhaseFilter(e.target.value)}
                        className="flex-1 sm:flex-none text-xs font-bold border-[var(--t-border)] rounded-[2px] p-2 outline-none focus:border-[var(--t-primary)] bg-[var(--t-surface2)] text-[var(--t-text)]"
                    >
                        <option value="">All Phases (सबै चरण)</option>
                        {dashboardData.phases?.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <select
                        value={contractorFilter}
                        onChange={e => setContractorFilter(e.target.value)}
                        className="flex-1 sm:flex-none text-xs font-bold border-[var(--t-border)] rounded-[2px] p-2 outline-none focus:border-[var(--t-primary)] bg-[var(--t-surface2)] text-[var(--t-text)]"
                    >
                        <option value="">All Contractors (सबै ठेकेदार)</option>
                        {dashboardData.contractors?.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-[2px] hover:opacity-90 font-['DM_Mono',monospace] uppercase tracking-widest text-[10px] sm:text-xs transition-colors shadow-sm"
                >
                    + Add New Task
                </button>
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block bg-[var(--t-surface)] rounded-xl shadow-sm border border-[var(--t-border)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Task Details</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Phase & Assignment</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Status & Priority</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--t-border)]">
                        {sortedPhaseIds.map(phaseId => (
                            <React.Fragment key={`desktop-phase-${phaseId}`}>
                                <tr className="bg-[var(--t-info)]/10/50">
                                    <td colSpan="4" className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-4 bg-[var(--t-info)]/100 rounded-full"></div>
                                            <span className="text-xs font-black text-[var(--t-primary)] uppercase tracking-wider">
                                                {phaseId === '0' ? 'Unassigned Phase' : getPhaseName(parseInt(phaseId))}
                                            </span>
                                            <span className="text-[10px] font-bold text-[var(--t-primary)] bg-[var(--t-surface)] px-1.5 py-0.5 rounded shadow-sm">
                                                {tasksByPhase[phaseId].length} tasks
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                                {tasksByPhase[phaseId].map(t => (
                                    <tr key={t.id} onClick={() => handleOpenModal(t, 'read')} className="hover:bg-[var(--t-surface2)] transition-colors group cursor-pointer">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="font-bold text-[var(--t-text)] group-hover:text-[var(--t-primary)] transition-colors">{t.title}</div>
                                                {t.media?.length > 0 && (
                                                    <span title="Has Proof Images" className="text-[var(--t-primary)] text-sm">📸</span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-[var(--t-text3)] font-medium line-clamp-1 max-w-xs italic mt-0.5">
                                                {t.description || 'No description provided'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-tighter">
                                                    {getPhaseName(t.phase)}
                                                </div>
                                                <div className="text-xs text-[var(--t-text2)] font-medium">
                                                    👤 {getContractorName(t.assigned_to)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase w-fit ${getStatusColor(t.status)}`}>
                                                    {t.status}
                                                </span>
                                                <div className={`text-[10px] font-bold ${getPriorityColor(t.priority)}`}>
                                                    {t.priority} Priority
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center gap-3 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(t, 'read'); }} className="text-[var(--t-primary)] hover:text-[var(--t-primary)] font-bold text-[10px] uppercase">Details</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(t, 'edit'); }} className="text-[var(--t-primary)] hover:text-[var(--t-primary)] font-bold text-[10px] uppercase">Edit</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                        {filteredTasks.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-[var(--t-text3)] italic text-sm">No tasks found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden space-y-6">
                {sortedPhaseIds.map(phaseId => (
                    <div key={`mobile-phase-${phaseId}`} className="space-y-3">
                        <div className="flex items-center gap-2 sticky top-0 bg-[var(--t-surface2)]/90 backdrop-blur-sm z-10 py-2">
                            <div className="w-1.5 h-4 bg-[var(--t-info)]/100 rounded-full"></div>
                            <h4 className="text-xs font-black text-[var(--t-primary)] uppercase tracking-wider m-0">
                                {phaseId === '0' ? 'Unassigned Phase' : getPhaseName(parseInt(phaseId))}
                            </h4>
                            <span className="text-[10px] font-bold text-[var(--t-primary)] bg-[var(--t-surface)] px-1.5 py-0.5 rounded shadow-sm">
                                {tasksByPhase[phaseId].length} tasks
                            </span>
                        </div>
                        <div className="space-y-3 pl-2 border-l-2 border-[var(--t-info)]/30/50">
                            {tasksByPhase[phaseId].map(t => (
                                <TaskCard 
                                    key={t.id} 
                                    t={t} 
                                    handleOpenModal={handleOpenModal} 
                                    getPhaseName={getPhaseName} 
                                    getStatusColor={getStatusColor} 
                                    getContractorName={getContractorName} 
                                    getPriorityColor={getPriorityColor} 
                                    setPreviewTask={setPreviewTask}
                                />
                            ))}
                        </div>
                    </div>
                ))}
                {filteredTasks.length === 0 && (
                    <div className="py-10 text-center text-[var(--t-text3)] italic bg-[var(--t-surface)] rounded-2xl border-2 border-dashed border-[var(--t-border)]">
                        No tasks found.
                    </div>
                )}
            </div>

            <TaskPreviewModal
                isOpen={!!previewTask || modalMode === 'create'}
                onClose={() => { setPreviewTask(null); setModalMode('read'); }}
                task={previewTask}
                initialMode={modalMode}
            />
        </div>
    );
};

export default TasksTab;
