import React, { useState, useRef } from 'react';
import { constructionService, getMediaUrl } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';
import TaskPreviewModal from './TaskPreviewModal';

const TaskCard = ({ t, handleOpenModal, setTaskToDelete, getPhaseName, getStatusColor, getContractorName, getPriorityColor, setPreviewTask }) => {
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
                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal(t); }} className="flex-1 py-2 bg-[var(--t-info)]/10 text-[var(--t-primary)] rounded-xl text-xs font-bold hover:bg-[var(--t-info)]/20">Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); setTaskToDelete({ id: t.id, title: t.title }); }} className="px-4 py-2 bg-[var(--t-danger)]/10 text-[var(--t-danger)] rounded-xl text-xs font-bold hover:bg-[var(--t-danger)]/20">Delete</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const TasksTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [pendingUploadTaskId, setPendingUploadTaskId] = useState(null);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [mediaToDelete, setMediaToDelete] = useState(null);
    const [phaseFilter, setPhaseFilter] = useState('');
    const [contractorFilter, setContractorFilter] = useState('');
    const [previewTask, setPreviewTask] = useState(null);
    const fileInputRef = useRef(null);
    const quickFileInputRef = useRef(null);

    const filteredTasks = (dashboardData.tasks || []).filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPhase = phaseFilter ? t.phase === parseInt(phaseFilter) : true;
        const matchesContractor = contractorFilter ? t.assigned_to === parseInt(contractorFilter) : true;
        return matchesSearch && matchesPhase && matchesContractor;
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

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(item);
        } else {
            setFormData({
                status: 'PENDING',
                priority: 'MEDIUM',
                phase: dashboardData.phases?.[0]?.id || ''
            });
        }
        setIsModalOpen(true);
    };

    const confirmDeleteTask = async () => {
        if (!taskToDelete) return;
        try {
            await constructionService.deleteTask(taskToDelete.id);
            setTaskToDelete(null);
            refreshData();
        } catch (error) {
            alert('Delete failed.');
            setTaskToDelete(null);
        }
    };

    const handleFileUpload = async (e, taskId = null) => {
        const file = e.target.files[0];
        const targetTaskId = taskId || editingItem?.id || pendingUploadTaskId;
        if (!file || !targetTaskId) return;

        setUploading(true);
        const uploadData = new FormData();
        uploadData.append('task', targetTaskId);
        uploadData.append('file', file);
        uploadData.append('media_type', 'IMAGE');

        try {
            await constructionService.uploadTaskMedia(uploadData);
            refreshData();
        } catch (error) {
            alert('Upload failed.');
        } finally {
            setUploading(false);
            setPendingUploadTaskId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (quickFileInputRef.current) quickFileInputRef.current.value = '';
        }
    };

    const handleQuickUploadClick = (e, taskId) => {
        e.stopPropagation();
        setPendingUploadTaskId(taskId);
        quickFileInputRef.current?.click();
    };

    const confirmDeleteMedia = async () => {
        if (!mediaToDelete) return;
        try {
            await constructionService.deleteTaskMedia(mediaToDelete);
            setMediaToDelete(null);
            refreshData();
        } catch (error) {
            alert('Failed to delete media.');
            setMediaToDelete(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingItem) await constructionService.updateTask(editingItem.id, formData);
            else await constructionService.createTask(formData);
            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert('Save failed. Please check your inputs.');
        } finally {
            setLoading(false);
        }
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

            <input
                type="file"
                ref={quickFileInputRef}
                onChange={(e) => handleFileUpload(e)}
                accept="image/*"
                className="hidden"
            />

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
                                    <tr key={t.id} onClick={() => setPreviewTask(t)} className="hover:bg-[var(--t-surface2)] transition-colors group cursor-pointer">
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
                                                <button
                                                    onClick={(e) => handleQuickUploadClick(e, t.id)}
                                                    className="text-[var(--t-primary)] hover:opacity-80 font-black text-[10px] uppercase flex items-center gap-1 bg-[var(--t-primary)]/10 px-2 py-1 rounded"
                                                >
                                                    {uploading && pendingUploadTaskId === t.id ? '...' : '+ Upload'}
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(t); }} className="text-[var(--t-primary)] hover:text-[var(--t-primary)] font-bold text-[10px] uppercase">Edit</button>
                                                <button onClick={(e) => { e.stopPropagation(); setTaskToDelete({ id: t.id, title: t.title }); }} className="text-[var(--t-danger)] hover:text-[var(--t-danger)] font-bold text-[10px] uppercase">Delete</button>
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
                                    setTaskToDelete={setTaskToDelete} 
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Task`}>
                <div className="cyber-wrap max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar p-2">
                    <form onSubmit={handleSubmit} className="space-y-4 p-1">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text)] mb-1">Task Title</label>
                            <input
                                type="text"
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="cyber-input w-full rounded-xl bg-[var(--t-surface2)] border border-[var(--t-border)] text-[var(--t-text)] border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none font-medium"
                                placeholder="e.g. Concrete Pouring"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text)] mb-1">Description</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="cyber-input w-full rounded-xl bg-[var(--t-surface2)] border border-[var(--t-border)] text-[var(--t-text)] border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none min-h-[80px]"
                                placeholder="Add details about the task..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--t-text)] mb-1">Phase</label>
                                <select
                                    value={formData.phase || ''}
                                    onChange={e => setFormData({ ...formData, phase: parseInt(e.target.value) })}
                                    className="cyber-input w-full rounded-xl bg-[var(--t-surface2)] border border-[var(--t-border)] text-[var(--t-text)] border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none appearance-none bg-[var(--t-surface)] font-medium"
                                    required
                                >
                                    <option value="">Select Phase</option>
                                    {dashboardData.phases?.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--t-text)] mb-1">Assigned Contractor</label>
                                <select
                                    value={formData.assigned_to || ''}
                                    onChange={e => setFormData({ ...formData, assigned_to: e.target.value ? parseInt(e.target.value) : null })}
                                    className="cyber-input w-full rounded-xl bg-[var(--t-surface2)] border border-[var(--t-border)] text-[var(--t-text)] border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none appearance-none bg-[var(--t-surface)] font-medium"
                                >
                                    <option value="">Unassigned</option>
                                    {dashboardData.contractors?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--t-text)] mb-1">Status</label>
                                <select
                                    value={formData.status || 'PENDING'}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="cyber-input w-full rounded-xl bg-[var(--t-surface2)] border border-[var(--t-border)] text-[var(--t-text)] border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none appearance-none bg-[var(--t-surface)] font-medium"
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="BLOCKED">Blocked</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--t-text)] mb-1">Priority</label>
                                <select
                                    value={formData.priority || 'MEDIUM'}
                                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                    className="cyber-input w-full rounded-xl bg-[var(--t-surface2)] border border-[var(--t-border)] text-[var(--t-text)] border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none appearance-none bg-[var(--t-surface)] font-medium"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="CRITICAL">Critical</option>
                                </select>
                            </div>
                        </div>
                        {/* Media Section - Only for existing tasks */}
                        {editingItem && (
                            <div className="mt-6 pt-6 border-t border-[var(--t-border)]">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-[var(--t-text)] flex items-center gap-2">
                                        <span>📸</span> Proof of Work (कामको प्रमाण)
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="text-[10px] font-black uppercase text-[var(--t-primary)] hover:text-[var(--t-primary)] flex items-center gap-1 bg-[var(--t-info)]/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {uploading ? 'Processing...' : '+ Upload Image'}
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>

                                {editingItem.media?.length > 0 ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {editingItem.media.map(m => (
                                            <div key={m.id} className="relative aspect-square group rounded-xl overflow-hidden border border-[var(--t-border)] bg-[var(--t-surface2)]">
                                                <img
                                                    src={getMediaUrl(m.file)}
                                                    alt="Proof"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setMediaToDelete(m.id)}
                                                    className="absolute top-1 right-1 bg-[var(--t-danger)]/100  p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-[var(--t-surface2)] border-2 border-dashed border-[var(--t-border)] rounded-2xl py-8 flex flex-col items-center justify-center text-[var(--t-text3)]">
                                        <span className="text-3xl mb-2">🖼️</span>
                                        <p className="text-[10px] font-bold uppercase tracking-widest">No proof uploaded yet</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-8 pb-2">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-[var(--t-text2)] hover:text-[var(--t-text)]">Cancel</button>
                            <button type="submit" disabled={loading} className="px-8 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] font-black  rounded-xl font-bold shadow-lg shadow-[var(--t-primary)]/20 hover:bg-[var(--t-primary2)] disabled:opacity-50 transition-all">
                                {loading ? 'Saving...' : (editingItem ? 'Update Task' : 'Create Task')}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Custom Delete Confirmation Modal */}
            {(taskToDelete || mediaToDelete) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-[var(--t-surface)] rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-[var(--t-danger)]/20 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-[var(--t-danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[var(--t-text)]">Confirm Deletion</h3>
                                <p className="text-sm text-[var(--t-text2)]">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-[var(--t-text)] mb-6">
                            {taskToDelete
                                ? <>Are you sure you want to delete task "<strong>{taskToDelete.title}</strong>"?</>
                                : <>Are you sure you want to delete this proof image?</>
                            }
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => { setTaskToDelete(null); setMediaToDelete(null); }}
                                className="px-4 py-2 text-[var(--t-text)] bg-[var(--t-surface3)] rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={taskToDelete ? confirmDeleteTask : confirmDeleteMedia}
                                className="px-4 py-2 bg-[var(--t-danger)] text-white font-black  rounded-lg hover:opacity-90 transition-colors font-semibold shadow-lg shadow-[var(--t-danger)]/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <TaskPreviewModal
                isOpen={!!previewTask}
                onClose={() => setPreviewTask(null)}
                task={previewTask}
            />
        </div>
    );
};

export default TasksTab;
