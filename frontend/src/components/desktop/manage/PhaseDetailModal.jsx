import React, { useState, useRef } from 'react';
import Modal from '../../common/Modal';
import { constructionService, getMediaUrl } from '../../../services/api';
import { useConstruction } from '../../../context/ConstructionContext';
import ConfirmModal from '../../common/ConfirmModal';
import TaskPreviewModal from './TaskPreviewModal';
import imageCompression from 'browser-image-compression';

const PhaseDetailModal = ({ isOpen, onClose, phase, tasks, initialMode = 'read' }) => {
    const {
        updatePhase, updateTask, createExpense, deleteExpense,
        createMaterialTransaction, refreshData, dashboardData, formatCurrency
    } = useConstruction();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [completing, setCompleting] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // Material Linkage State
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [materialQuantity, setMaterialQuantity] = useState('');
    const [materialUnitPrice, setMaterialUnitPrice] = useState('');
    const [linkingMaterial, setLinkingMaterial] = useState(false);
    const [materialCart, setMaterialCart] = useState([]);

    const phasePhotoRef = useRef(null);

    const [localPhase, setLocalPhase] = useState({
        name: phase?.name || '',
        description: phase?.description || '',
        start_date: phase?.start_date || '',
        end_date: phase?.end_date || ''
    });
    const [taskDueDateUpdates, setTaskDueDateUpdates] = useState({}); // userId -> dueDate
    const [pendingTaskDeletions, setPendingTaskDeletions] = useState(new Set());
    const [pendingExpenseDeletions, setPendingExpenseDeletions] = useState(new Set());
    const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null); // { id, type, title }
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showCloseWarning, setShowCloseWarning] = useState(false);
    const [isEditing, setIsEditing] = useState(initialMode === 'edit');
    const [taskForDetail, setTaskForDetail] = useState(null);

    // Sync local state when phase prop changes (e.g. modal opened for different phase)
    React.useEffect(() => {
        if (phase) {
            setLocalPhase({
                name: phase.name,
                description: phase.description || '',
                start_date: phase.start_date || '',
                end_date: phase.end_date || ''
            });
            setTaskDueDateUpdates({});
            setPendingTaskDeletions(new Set());
            setPendingExpenseDeletions(new Set());
            setIsDirty(false);
            setIsEditing(initialMode === 'edit');
        }
    }, [phase?.id]);

    const handleLocalChange = (field, value) => {
        setLocalPhase(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleTaskDateChange = (taskId, date) => {
        setTaskDueDateUpdates(prev => ({ ...prev, [taskId]: date }));
        setIsDirty(true);
    };

    const handleGlobalSave = async () => {
        setSaving(true);
        try {
            // 1. Save Phase Details if changed
            await updatePhase(phase.id, localPhase);

            // 2. Save Task Due Dates if changed
            for (const taskId in taskDueDateUpdates) {
                await constructionService.updateTask(taskId, { due_date: taskDueDateUpdates[taskId] || null });
            }

            // 3. Process Pending Task Deletions
            for (const taskId of pendingTaskDeletions) {
                await constructionService.deleteTask(taskId);
            }

            // 4. Process Pending Expense Deletions
            for (const expenseId of pendingExpenseDeletions) {
                await constructionService.deleteExpense(expenseId);
            }

            // 5. Process Material Cart if any
            if (materialCart.length > 0) {
                for (const item of materialCart) {
                    await createMaterialTransaction({
                        material: item.materialId,
                        transaction_type: 'OUT',
                        quantity: item.quantity,
                        unit_price: item.unitPrice,
                        date: new Date().toISOString().split('T')[0],
                        phase: phase.id,
                        purpose: `Allocated for ${phase.name}`,
                        create_expense: true,
                        status: 'RECEIVED'
                    });
                }
                setMaterialCart([]);
            }

            setIsDirty(false);
            setTaskDueDateUpdates({});
            setPendingTaskDeletions(new Set());
            setPendingExpenseDeletions(new Set());
            refreshData();
        } catch (error) {
            console.error("Failed to save changes", error);
            alert("Failed to save some changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleCloseAttempt = () => {
        if (isDirty || materialCart.length > 0 || pendingTaskDeletions.size > 0 || pendingExpenseDeletions.size > 0) {
            setShowCloseWarning(true);
        } else {
            onClose();
        }
    };

    // Get materials associated with this phase
    const phaseMaterials = (phase && dashboardData.expenses) ? dashboardData.expenses.filter(e => e.phase === phase.id && e.expense_type === 'MATERIAL') : [];

    // Auto-select first task when tasks change or update selected task with fresh data
    React.useEffect(() => {
        if (tasks && tasks.length > 0) {
            if (!selectedTask) {
                setSelectedTask(tasks[0]);
            } else {
                const updatedTask = tasks.find(t => t.id === selectedTask.id);
                if (updatedTask && JSON.stringify(updatedTask) !== JSON.stringify(selectedTask)) {
                    setSelectedTask(updatedTask);
                }
            }
        }
    }, [tasks, selectedTask]);

    if (!phase) return null;


    const handleFileUpload = async (e) => {
        let file = e.target.files[0];
        if (!file || !selectedTask) return;

        setUploading(true);
        
        let mediaType = 'DOCUMENT';
        const type = file.type.toLowerCase();
        
        if (type.startsWith('image/')) {
            mediaType = 'IMAGE';
            try {
                const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true };
                file = await imageCompression(file, options);
            } catch (error) {
                console.error("Image compression error:", error);
            }
        } else if (type.startsWith('video/')) {
            mediaType = 'VIDEO';
        }

        const uploadData = new FormData();
        uploadData.append('task', selectedTask.id);
        uploadData.append('file', file);
        uploadData.append('media_type', mediaType);

        try {
            await constructionService.uploadTaskMedia(uploadData);
            refreshData();
        } catch (error) {
            alert('Upload failed.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddTask = () => {
        setTaskForDetail({ phase: phase.id });
    };

    const handleTaskToggle = async (task) => {
        try {
            const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
            await constructionService.updateTask(task.id, { status: newStatus });
            refreshData();
        } catch (error) {
            console.error("Failed to update task", error);
        }
    };

    const confirmDeleteTask = (task) => {
        setDeleteConfirmTarget({ id: task.id, type: 'TASK', title: task.title });
    };

    const handleMarkTaskForDeletion = (taskId) => {
        setPendingTaskDeletions(prev => new Set([...prev, taskId]));
        setIsDirty(true);
        setDeleteConfirmTarget(null);
    };

    const addToCart = (e) => {
        e.preventDefault();
        if (!selectedMaterialId || !materialQuantity || !materialUnitPrice) return;

        const material = dashboardData.materials.find(m => m.id === parseInt(selectedMaterialId));
        if (!material) return;

        const newItem = {
            id: Date.now(), // temporary local id
            materialId: material.id,
            name: material.name,
            quantity: parseFloat(materialQuantity),
            unitPrice: parseFloat(materialUnitPrice),
            unit: material.unit
        };

        setMaterialCart([...materialCart, newItem]);
        setSelectedMaterialId('');
        setMaterialQuantity('');
        setMaterialUnitPrice('');
    };

    const removeFromCart = (tempId) => {
        const newCart = materialCart.filter(item => item.id !== tempId);
        setMaterialCart(newCart);
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleCloseAttempt} 
            title="Phase Structural Console" 
            maxWidth="max-w-7xl"
            footer={
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
                    <div className="flex gap-3 w-full sm:w-auto">
                        {isEditing ? (
                            <button 
                                onClick={async () => {
                                    await handleGlobalSave();
                                    setIsEditing(false);
                                }}
                                disabled={saving}
                                className="flex-1 sm:px-6 py-2.5 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-lg text-[10px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all font-['DM_Mono',monospace]"
                            >
                                {saving ? 'SYNCING DATA...' : 'SYNC ALL CHANGES'}
                            </button>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="flex-1 sm:px-6 py-2.5 bg-[var(--t-surface3)] text-[var(--t-text)] border border-[var(--t-border)] rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[var(--t-surface2)] transition-all font-['DM_Mono',monospace]"
                            >
                                Enter Edit Mode
                            </button>
                        )}
                        <button 
                            onClick={handleCloseAttempt}
                            className="flex-1 sm:px-6 py-2.5 bg-[var(--t-surface2)] text-[var(--t-text3)] border border-[var(--t-border)] rounded-lg text-[10px] font-black uppercase tracking-widest hover:text-[var(--t-text)] transition-all font-['DM_Mono',monospace]"
                        >
                            Close Console
                        </button>
                    </div>
                    
                    {isEditing && (
                        <button 
                            onClick={() => setDeleteConfirmTarget({ id: phase.id, type: 'PHASE', title: phase.name })}
                            className="w-full sm:w-auto text-[9px] font-black text-[var(--t-danger)] uppercase tracking-[.2em] hover:underline"
                        >
                            [ DELETE PHASE ]
                        </button>
                    )}
                </div>
            }
        >
            <div className="flex flex-col lg:flex-row gap-6 bg-[var(--t-bg)] p-2 sm:p-4 lg:p-6 min-h-fit lg:min-h-[600px]">
                {/* Left Column: Core Identity & Structural Nodes */}
                <div className="w-full lg:w-5/12 flex flex-col gap-6">
                    
                    {/* Phase Identity Card */}
                    <div className="cyber-card p-4 sm:p-5 space-y-4 border-l-4 border-l-[var(--t-primary)]">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-[10px] font-black text-[var(--t-text2)] uppercase tracking-[.2em] mb-1" style={{ fontFamily: 'var(--f-mono)' }}>
                                    Structure Node 0{phase.order}
                                </div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={localPhase.name}
                                        onChange={(e) => handleLocalChange('name', e.target.value)}
                                        className="w-full text-xl font-black text-[var(--t-text)] bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-sm px-3 py-2 outline-none focus:border-[var(--t-primary)] transition-all"
                                        style={{ fontFamily: 'var(--f-disp)' }}
                                    />
                                ) : (
                                    <h1 className="text-2xl font-black text-[var(--t-text)] leading-tight tracking-tight" style={{ fontFamily: 'var(--f-disp)' }}>
                                        {localPhase.name}
                                    </h1>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={`px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest border ${
                                    phase.status === 'COMPLETED' ? 'bg-[var(--t-primary)]/10 text-[var(--t-primary)] border-[var(--t-primary)]/30' :
                                    phase.status === 'IN_PROGRESS' ? 'bg-[var(--t-info)]/10 text-[var(--t-info)] border-[var(--t-info)]/30' :
                                    'bg-[var(--t-surface3)] text-[var(--t-text2)] border-[var(--t-border)]'
                                }`} style={{ fontFamily: 'var(--f-mono)' }}>
                                    {phase.status.replace('_', ' ')}
                                </span>
                                
                                {!isEditing && (
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="text-[9px] font-black text-[var(--t-primary)] uppercase tracking-widest hover:underline flex items-center gap-1"
                                        style={{ fontFamily: 'var(--f-mono)' }}
                                    >
                                        <span>[ ✏️ EDIT NODE ]</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="bg-[var(--t-surface2)]/50 p-4 border border-[var(--t-border2)] rounded-sm">
                            <h4 className="text-[9px] font-black text-[var(--t-text3)] uppercase tracking-[.2em] mb-2" style={{ fontFamily: 'var(--f-mono)' }}>Scope of Work</h4>
                            {isEditing ? (
                                <textarea
                                    value={localPhase.description}
                                    onChange={(e) => handleLocalChange('description', e.target.value)}
                                    rows="3"
                                    className="w-full text-xs text-[var(--t-text2)] bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-sm px-3 py-2 outline-none focus:border-[var(--t-primary)] transition-all resize-none"
                                    placeholder="Define the structural goals..."
                                />
                            ) : (
                                <p className="text-[13px] text-[var(--t-text2)] leading-relaxed italic" style={{ fontFamily: 'var(--f-body)' }}>
                                    "{localPhase.description || 'No detailed scope defined.'}"
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[var(--t-surface2)]/30 p-3 border border-[var(--t-border2)] rounded-sm">
                                <span className="text-[8px] font-black text-[var(--t-text3)] uppercase tracking-widest block mb-1" style={{ fontFamily: 'var(--f-mono)' }}>Initiation</span>
                                {isEditing ? (
                                    <input type="date" value={localPhase.start_date} onChange={(e) => handleLocalChange('start_date', e.target.value || null)}
                                        className="w-full bg-transparent text-xs text-[var(--t-text)] outline-none" />
                                ) : (
                                    <div className="text-xs font-bold text-[var(--t-text)]">{localPhase.start_date || 'TBD'}</div>
                                )}
                            </div>
                            <div className="bg-[var(--t-surface2)]/30 p-3 border border-[var(--t-border2)] rounded-sm">
                                <span className="text-[8px] font-black text-[var(--t-text3)] uppercase tracking-widest block mb-1" style={{ fontFamily: 'var(--f-mono)' }}>Target Completion</span>
                                {isEditing ? (
                                    <input type="date" value={localPhase.end_date} onChange={(e) => handleLocalChange('end_date', e.target.value || null)}
                                        className="w-full bg-transparent text-xs text-[var(--t-text)] outline-none" />
                                ) : (
                                    <div className="text-xs font-bold text-[var(--t-text)]">{localPhase.end_date || 'TBD'}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Structural Nodes (Tasks) */}
                    <div className="cyber-card flex-1 flex flex-col p-4 sm:p-5 overflow-hidden">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--t-border)]">
                            <h4 className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-[.2em]" style={{ fontFamily: 'var(--f-mono)' }}>
                                Sub-Structural Units ({tasks?.length || 0})
                            </h4>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {tasks?.length > 0 ? [...tasks].filter(t => !pendingTaskDeletions.has(t.id)).sort((a, b) => {
                                const dateA = a.due_date ? new Date(a.due_date) : null;
                                const dateB = b.due_date ? new Date(b.due_date) : null;
                                if (dateA && dateB) return dateA - dateB;
                                if (dateA) return -1;
                                if (dateB) return 1;
                                return new Date(b.created_at) - new Date(a.created_at);
                            }).map(task => (
                                <div key={task.id} 
                                     onClick={() => setSelectedTask(task)}
                                      className={`group flex flex-col p-3 rounded-sm border transition-all cursor-pointer relative overflow-hidden ${
                                          selectedTask?.id === task.id 
                                          ? 'bg-[var(--t-primary)]/15 border-[var(--t-primary)] border-l-[3px] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] scale-[1.01] -translate-y-0.5' 
                                          : 'bg-[var(--t-surface2)]/40 border-[var(--t-border)] hover:bg-[var(--t-surface2)]/60 hover:border-[var(--t-border2)] opacity-70 hover:opacity-100'
                                      }`}>
                                     {selectedTask?.id === task.id && (
                                         <div className="absolute top-0 right-0 p-1 opacity-40">
                                            <div className="w-1 h-1 rounded-full bg-[var(--t-primary)] animate-pulse"></div>
                                         </div>
                                     )}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <input type="checkbox" checked={task.status === 'COMPLETED'}
                                                    onChange={(e) => { e.stopPropagation(); handleTaskToggle(task); }}
                                                    className="w-3.5 h-3.5 accent-[var(--t-primary)] cursor-pointer" />
                                                <span className={`text-[13px] font-bold truncate ${task.status === 'COMPLETED' ? 'text-[var(--t-text3)] line-through' : 'text-[var(--t-text)]'}`} style={{ fontFamily: 'var(--f-body)' }}>
                                                    {task.title}
                                                </span>
                                                <button onClick={(e) => { e.stopPropagation(); setTaskForDetail(task); }}
                                                        className="text-[var(--t-primary)] text-[10px] hover:underline font-black uppercase tracking-tighter">
                                                    [ DETAIL ]
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm border ${
                                                    task.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    task.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                    'bg-[var(--t-surface3)] text-[var(--t-text3)] border-[var(--t-border)]'
                                                }`} style={{ fontFamily: 'var(--f-mono)' }}>
                                                    {task.priority || 'MEDIUM'}
                                                </span>
                                                <span className="text-[9px] font-bold text-[var(--t-text2)]" style={{ fontFamily: 'var(--f-mono)' }}>
                                                    {task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Due Date'}
                                                </span>
                                            </div>
                                        </div>
                                        {isEditing && (
                                            <button onClick={(e) => { e.stopPropagation(); confirmDeleteTask(task); }}
                                                    className="opacity-0 group-hover:opacity-100 text-[var(--t-danger)] hover:scale-125 transition-all">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-[var(--t-text3)] italic text-xs">No active structural units.</div>
                            )}
                        </div>

                        {isEditing && (
                            <div className="mt-4 pt-4 border-t border-[var(--t-border)]">
                                <button 
                                    onClick={handleAddTask}
                                    className="w-full py-2 bg-[var(--t-primary)]/10 text-[var(--t-primary)] border border-dashed border-[var(--t-primary)]/50 rounded-sm font-black text-xs uppercase tracking-widest hover:bg-[var(--t-primary)]/20 transition-all"
                                >
                                    + Add New Structural Unit
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Evidence Lab & Material Allocation */}
                <div className="w-full lg:w-7/12 flex flex-col gap-6">
                    
                    {/* Visual Evidence (Media) */}
                    <div className="cyber-card p-4 sm:p-5 flex flex-col min-h-[300px]">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-[.2em]" style={{ fontFamily: 'var(--f-mono)' }}>
                                {selectedTask ? `Evidence Lab: ${selectedTask.title}` : 'Select Task for Evidence'}
                            </h4>
                            {selectedTask && (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()} 
                                        disabled={uploading}
                                        className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all rounded-sm flex items-center gap-1"
                                    >
                                        <span>📤</span> {uploading ? 'UPLOADING...' : 'UPLOAD MEDIA'}
                                    </button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-h-[200px] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                                {(() => {
                                    const liveTask = selectedTask ? dashboardData.tasks?.find(t => t.id === selectedTask.id) || selectedTask : null;
                                    return liveTask && liveTask.media?.length > 0 ? liveTask.media.map(m => (
                                        <div key={m.id} className="group relative aspect-video bg-[var(--t-surface2)] rounded-sm border border-[var(--t-border)] overflow-hidden">
                                            {m.media_type === 'VIDEO' ? (
                                                <div className="relative w-full h-full group">
                                                    <video src={getMediaUrl(m.file)} className="w-full h-full object-cover" />
                                                    <a
                                                        href={getMediaUrl(m.file)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                                                    >
                                                        <span className="text-white text-[7px] font-black uppercase tracking-widest border border-white/30 px-2 py-0.5 rounded-full backdrop-blur-sm">View</span>
                                                    </a>
                                                </div>
                                            ) : m.file?.toLowerCase().endsWith('.pdf') ? (
                                                <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center relative p-2 group">
                                                    <div className="absolute top-1 left-1 bg-red-600 text-white text-[7px] font-black px-1 py-0.5 rounded-xs z-10 shadow-sm uppercase">PDF</div>
                                                    <div className="w-10 h-12 bg-white border border-red-100 rounded-xs shadow-xs flex flex-col items-center justify-center gap-0.5 group-hover:scale-105 transition-transform">
                                                        <span className="text-lg">📄</span>
                                                        <div className="w-5 h-0.5 bg-red-50"></div>
                                                    </div>
                                                    <p className="mt-1.5 text-[7px] font-black text-red-900/60 uppercase tracking-tighter truncate w-full text-center px-1">
                                                        {m.file.split('/').pop()}
                                                    </p>
                                                    <a
                                                        href={getMediaUrl(m.file)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 z-20"
                                                    >
                                                        <span className="text-white text-[7px] font-black uppercase tracking-widest border border-white/30 px-2 py-0.5 rounded-full backdrop-blur-sm">View</span>
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="relative w-full h-full group">
                                                    <img src={getMediaUrl(m.file)} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                                    <a
                                                        href={getMediaUrl(m.file)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                                                    >
                                                        <span className="text-white text-[7px] font-black uppercase tracking-widest border border-white/30 px-2 py-0.5 rounded-full backdrop-blur-sm">View</span>
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )) : (
                                        <div className="col-span-full py-16 flex flex-col items-center justify-center border border-dashed border-[var(--t-border2)] rounded-sm grayscale opacity-50 text-center">
                                            <span className="text-3xl mb-2 opacity-30">📂</span>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)] leading-relaxed">
                                                {selectedTask ? 'No Proofs Uploaded' : 'Select a structural unit\nto view evidence log'}
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Material Allocation Registry */}
                    <div className="cyber-card p-4 sm:p-5 flex flex-col flex-1 min-h-[250px]">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--t-border)]">
                            <h4 className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-[.2em]" style={{ fontFamily: 'var(--f-mono)' }}>
                                Resource Allocation Matrix
                            </h4>
                        </div>

                        <div className="flex-1 overflow-x-auto custom-scrollbar mb-4 border border-[var(--t-border)] rounded-sm bg-[var(--t-bg)]">
                            <div className="min-w-[400px]">
                                {phaseMaterials.filter(m => !pendingExpenseDeletions.has(m.id)).length > 0 ? (
                                    <table className="w-full text-left border-collapse">
                                    <thead className="bg-[var(--t-surface2)] sticky top-0 border-b border-[var(--t-border2)]">
                                        <tr>
                                            <th className="px-4 py-2 text-[8px] font-black text-[var(--t-text3)] uppercase tracking-[.2em]" style={{ fontFamily: 'var(--f-mono)' }}>Material Item</th>
                                            <th className="px-4 py-2 text-[8px] font-black text-[var(--t-text3)] uppercase tracking-[.2em] text-right" style={{ fontFamily: 'var(--f-mono)' }}>Qty</th>
                                            <th className="px-4 py-2 text-[8px] font-black text-[var(--t-text3)] uppercase tracking-[.2em] text-right" style={{ fontFamily: 'var(--f-mono)' }}>Valuation</th>
                                            {isEditing && <th className="px-4 py-2 w-8"></th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--t-border2)]">
                                        {phaseMaterials.filter(m => !pendingExpenseDeletions.has(m.id)).map(m => (
                                            <tr key={m.id} className="hover:bg-[var(--t-surface2)]/50 transition-colors">
                                                <td className="px-4 py-3 text-xs font-bold text-[var(--t-text)]">{m.title}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-xs font-black text-[var(--t-text)]" style={{ fontFamily: 'var(--f-mono)' }}>{m.quantity}</span>
                                                    <span className="text-[9px] font-black text-[var(--t-text3)] uppercase ml-1">{m.unit}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs font-black text-[var(--t-primary)]" style={{ fontFamily: 'var(--f-disp)' }}>
                                                    {formatCurrency(m.amount)}
                                                </td>
                                                {isEditing && (
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => setDeleteConfirmTarget({ id: m.id, type: 'EXPENSE', title: m.title })}
                                                            className="text-[var(--t-text3)] hover:text-[var(--t-danger)] transition-colors text-lg line-height-1">×</button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                ) : (
                                    <div className="h-full flex items-center justify-center p-8 text-[var(--t-text3)] text-[10px] font-black uppercase tracking-widest italic opacity-40">
                                        Resource Matrix Empty
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add Materials Matrix */}
                        {isEditing && (
                            <div className="bg-[var(--t-surface2)]/50 p-3 sm:p-4 border border-[var(--t-border2)] rounded-sm space-y-4">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <select value={selectedMaterialId} onChange={e => {
                                        setSelectedMaterialId(e.target.value);
                                        const mat = dashboardData.materials.find(m => m.id === parseInt(e.target.value));
                                        if(mat) setMaterialUnitPrice(mat.avg_cost_per_unit || '');
                                    }} className="flex-1 bg-[var(--t-surface)] border border-[var(--t-border)] text-[10px] font-black uppercase tracking-tight p-2.5 focus:border-[var(--t-primary)] outline-none rounded-sm">
                                        <option value="">Select Resource...</option>
                                        {dashboardData.materials?.map(m => <option key={m.id} value={m.id}>{m.name} [ STOCK: {m.current_stock} {m.unit} ]</option>)}
                                    </select>
                                    <div className="flex gap-2 w-full sm:w-32">
                                        <input type="number" placeholder="QTY" value={materialQuantity} onChange={e => setMaterialQuantity(e.target.value)}
                                               className="flex-1 sm:w-full bg-[var(--t-surface)] border border-[var(--t-border)] text-xs font-black text-center p-2 outline-none focus:border-[var(--t-primary)] rounded-sm"/>
                                        <button onClick={addToCart} disabled={!selectedMaterialId || !materialQuantity}
                                            className="bg-[var(--t-primary)] text-[var(--t-bg)] px-4 py-2 sm:py-0 rounded-sm font-black text-[10px] uppercase tracking-tighter hover:opacity-90 disabled:opacity-50">
                                            Link
                                        </button>
                                    </div>
                                </div>

                                {materialCart.length > 0 && (
                                    <div className="border border-[var(--t-primary)]/20 bg-[var(--t-primary)]/5 p-3 space-y-2 rounded-sm border-dashed">
                                        <div className="flex justify-between items-center pb-2 border-b border-[var(--t-primary)]/10">
                                            <span className="text-[9px] font-black text-[var(--t-primary)] uppercase tracking-widest">Staging Matrix ({materialCart.length})</span>
                                        </div>
                                        {materialCart.map(item => (
                                            <div key={item.id} className="flex justify-between items-center text-[10px] py-1">
                                                <span className="text-[var(--t-text2)] font-black uppercase">{item.name} [{item.quantity} {item.unit}]</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-[var(--t-primary)]" style={{ fontFamily: 'var(--f-disp)' }}>{formatCurrency(item.quantity * item.unitPrice)}</span>
                                                    <button onClick={() => removeFromCart(item.id)} className="text-[var(--t-danger)] hover:scale-125 transition-all text-sm">×</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Node Finalization */}
                    <div className={`cyber-card p-4 sm:p-5 mt-auto border-t-4 ${phase.status === 'COMPLETED' ? 'border-t-[var(--t-primary)] bg-[var(--t-primary)]/5' : 'border-t-[var(--t-info)]/30'}`}>
                        <div className="flex flex-col sm:flex-row gap-5 items-center">
                            <div className="relative group w-full sm:w-32 h-24 sm:h-20 bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-sm overflow-hidden shadow-inner cursor-pointer"
                                 onClick={() => isEditing && phasePhotoRef.current.click()}>
                                {phase.completion_photo ? (
                                    <img src={getMediaUrl(phase.completion_photo)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xl">🛠️</span>
                                        <span className="text-[8px] font-black uppercase mt-1">Proof Scan</span>
                                    </div>
                                )}
                                {isEditing && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] font-black text-white uppercase tracking-widest">Update Photo</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-sm font-black text-[var(--t-text)] uppercase tracking-widest mb-1" style={{ fontFamily: 'var(--f-disp)' }}>
                                    {phase.status === 'COMPLETED' ? 'Structural Unit Online' : 'Deployment Finalization'}
                                </h3>
                                <p className="text-[10px] text-[var(--t-text3)] font-black uppercase tracking-tight mb-3">
                                    {phase.status === 'COMPLETED' ? `Certified on ${new Date(phase.updated_at).toLocaleDateString()}` : 'Status pending structural confirmation scan.'}
                                </p>
                                {isEditing && phase.status !== 'COMPLETED' && (
                                    <button onClick={async () => {
                                        // 1. Mandatory Photo Check
                                        if (!phase.completion_photo) return alert("Structural confirmation photo required.");

                                        // 2. All Tasks Completion Check
                                        const incompleteTasks = (tasks || []).filter(t => t.status !== 'COMPLETED');
                                        if (incompleteTasks.length > 0) {
                                            return alert(`Cannot complete phase. There are ${incompleteTasks.length} incomplete tasks that must be finalized first.`);
                                        }

                                        setCompleting(true);
                                        await updatePhase(phase.id, { status: 'COMPLETED' });
                                        refreshData();
                                        setCompleting(false);
                                    }} disabled={completing}
                                    className="w-full md:w-auto px-10 py-2 bg-gradient-to-r from-[var(--t-primary)] to-[var(--t-primary2)] text-[var(--t-bg)] text-[10px] font-black uppercase tracking-[.2em] rounded-sm shadow-lg hover:opacity-90 disabled:opacity-50 transition-all">
                                        {completing ? 'PROCESSING...' : 'CONFIRM COMPLETION'}
                                    </button>
                                )}
                            </div>
                        </div>
                        <input type="file" ref={phasePhotoRef} className="hidden" accept="image/*" onChange={async (e) => {
                            if (e.target.files[0]) {
                                const fd = new FormData();
                                fd.append('completion_photo', e.target.files[0]);
                                await updatePhase(phase.id, fd);
                                refreshData();
                            }
                        }} />
                    </div>

                </div>
            </div>

            <ConfirmModal 
                isOpen={showCloseWarning}
                title="Synchronicity Error"
                message="Unsaved matrix modifications detected. Disconnecting now will purge local staging data."
                confirmText="Purge & Disconnect"
                cancelText="Resume Sync"
                type="warning"
                onConfirm={() => {
                    setShowCloseWarning(false);
                    onClose();
                }}
                onCancel={() => setShowCloseWarning(false)}
            />

            <ConfirmModal 
                isOpen={!!deleteConfirmTarget}
                title={`Purge ${deleteConfirmTarget?.type === 'TASK' ? 'Structural Unit' : deleteConfirmTarget?.type === 'PHASE' ? 'Entire Phase' : 'Resource'}`}
                message={deleteConfirmTarget?.type === 'PHASE' 
                    ? `FATAL: Are you sure you want to permanently decommission "${deleteConfirmTarget?.title}"? All associated tasks, materials, and expense records will be removed. This action is irreversible.`
                    : `Are you sure you want to mark "${deleteConfirmTarget?.title}" for extraction? This will be finalized on next global sync.`}
                confirmText={deleteConfirmTarget?.type === 'PHASE' ? 'Decommission Phase' : 'Mark for Extraction'}
                cancelText={deleteConfirmTarget?.type === 'PHASE' ? 'Abort' : 'Retain Unit'}
                type="danger"
                onConfirm={async () => {
                    if (deleteConfirmTarget.type === 'TASK') {
                        handleMarkTaskForDeletion(deleteConfirmTarget.id);
                    } else if (deleteConfirmTarget.type === 'PHASE') {
                        try {
                            await constructionService.deletePhase(deleteConfirmTarget.id);
                            refreshData();
                            setDeleteConfirmTarget(null);
                            onClose();
                        } catch (e) { 
                            alert("Decommissioning failed."); 
                            setDeleteConfirmTarget(null);
                        }
                    } else {
                        setPendingExpenseDeletions(prev => new Set([...prev, deleteConfirmTarget.id]));
                        setIsDirty(true);
                        setDeleteConfirmTarget(null);
                    }
                }}
                onCancel={() => setDeleteConfirmTarget(null)}
            />

            <TaskPreviewModal 
                isOpen={!!taskForDetail}
                onClose={() => {
                    setTaskForDetail(null);
                    refreshData();
                }}
                task={taskForDetail}
            />
        </Modal>
    );
};

export default PhaseDetailModal;
