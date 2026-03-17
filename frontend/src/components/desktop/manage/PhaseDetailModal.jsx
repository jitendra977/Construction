import React, { useState, useRef } from 'react';
import Modal from '../../common/Modal';
import { constructionService, getMediaUrl } from '../../../services/api';
import { useConstruction } from '../../../context/ConstructionContext';

const PhaseDetailModal = ({ isOpen, onClose, phase, tasks }) => {
    const {
        updatePhase, updateTask, createExpense, deleteExpense,
        createMaterialTransaction, refreshData, dashboardData, formatCurrency
    } = useConstruction();
    const [uploading, setUploading] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [addingTask, setAddingTask] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // Material Linkage State
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [materialQuantity, setMaterialQuantity] = useState('');
    const [materialUnitPrice, setMaterialUnitPrice] = useState('');
    const [linkingMaterial, setLinkingMaterial] = useState(false);
    const [materialCart, setMaterialCart] = useState([]);

    const fileInputRef = useRef(null);
    const phasePhotoRef = useRef(null);

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
        const file = e.target.files[0];
        if (!file || !selectedTask) return;

        const formData = new FormData();
        formData.append('task', selectedTask.id);
        formData.append('file', file);
        formData.append('media_type', file.type.startsWith('image/') ? 'IMAGE' : 'VIDEO');

        setUploading(true);
        try {
            await constructionService.uploadTaskMedia(formData);
            refreshData();
            e.target.value = null;
        } catch (error) {
            console.error("Failed to upload media", error);
            alert("Failed to upload media. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteMedia = async (mediaId) => {
        if (!window.confirm("Delete this file?")) return;
        try {
            await constructionService.deleteTaskMedia(mediaId);
            refreshData();
        } catch (error) {
            console.error("Failed to delete media", error);
        }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        setAddingTask(true);
        try {
            await constructionService.createTask({
                title: newTaskTitle,
                phase: phase.id,
                status: 'PENDING',
                priority: 'MEDIUM'
            });
            setNewTaskTitle('');
            refreshData();
        } catch (error) {
            console.error("Failed to add task", error);
            alert("Failed to add task.");
        } finally {
            setAddingTask(false);
        }
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

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        try {
            await constructionService.deleteTask(taskId);
            if (selectedTask?.id === taskId) {
                setSelectedTask(null);
            }
            refreshData();
        } catch (error) {
            console.error("Failed to delete task", error);
        }
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
        setMaterialCart(materialCart.filter(item => item.id !== tempId));
    };

    const handleLinkMaterial = async () => {
        if (materialCart.length === 0) return;

        setLinkingMaterial(true);
        try {
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
            refreshData();
        } catch (error) {
            console.error("Failed to link materials", error);
            alert("Failed to process some materials. Please check progress.");
        } finally {
            setLinkingMaterial(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${phase.name} - Task Management`} maxWidth="max-w-6xl">
            <div className="p-4 flex flex-col lg:flex-row gap-6 bg-[var(--t-bg)]">
                {/* Left Column: Info & Tasks */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4">
                    
                    {/* Status & Name */}
                    <div className="bg-[var(--t-surface)] p-4 rounded-[2px] border border-[var(--t-border)] space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-widest">Phase Details</h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-[1px] text-[9px] font-['DM_Mono',monospace] uppercase tracking-widest border ${
                                phase.status === 'COMPLETED' ? 'bg-[var(--t-primary)]/10 text-[var(--t-primary)] border-[var(--t-primary)]/40' :
                                phase.status === 'IN_PROGRESS' ? 'bg-[var(--t-info)]/10 text-[var(--t-info)] border-[var(--t-info)]/40' :
                                'bg-[var(--t-surface2)] text-[var(--t-text)] border-[var(--t-border)]'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                    phase.status === 'COMPLETED' ? 'bg-[var(--t-primary)]' :
                                    phase.status === 'IN_PROGRESS' ? 'bg-[var(--t-info)]' :
                                    'bg-[var(--t-text3)]'
                                }`}></span>
                                {phase.status.replace('_', ' ')}
                            </span>
                        </div>
                        <div>
                            <input
                                type="text"
                                value={phase.name}
                                onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                                className="w-full text-[14px] font-bold text-[var(--t-text)] bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-[2px] px-3 py-2 outline-none focus:border-[var(--t-primary)] transition-colors"
                            />
                        </div>
                        <div>
                            <textarea
                                value={phase.description || ''}
                                onChange={(e) => updatePhase(phase.id, { description: e.target.value })}
                                rows="2"
                                className="w-full text-[12px] text-[var(--t-text2)] bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-[2px] px-3 py-2 outline-none focus:border-[var(--t-primary)] transition-colors resize-none"
                                placeholder="Describe the goals..."
                            />
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-[var(--t-surface)] p-4 rounded-[2px] border border-[var(--t-border)]">
                        <h4 className="text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-widest mb-3">Timeline</h4>
                        <div className="flex gap-4">
                            <div className="flex-1 space-y-1">
                                <span className="text-[9px] font-['DM_Mono',monospace] text-[var(--t-text2)] uppercase">Start Date</span>
                                <input
                                    type="date"
                                    value={phase.start_date || ''}
                                    onChange={(e) => updatePhase(phase.id, { start_date: e.target.value || null })}
                                    className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-[2px] px-2 py-1.5 text-[12px] text-[var(--t-text)] outline-none focus:border-[var(--t-primary)]"
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <span className="text-[9px] font-['DM_Mono',monospace] text-[var(--t-text2)] uppercase">End Date</span>
                                <input
                                    type="date"
                                    value={phase.end_date || ''}
                                    onChange={(e) => updatePhase(phase.id, { end_date: e.target.value || null })}
                                    className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-[2px] px-2 py-1.5 text-[12px] text-[var(--t-text)] outline-none focus:border-[var(--t-primary)]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Documents */}
                    <div className="bg-[var(--t-surface)] p-4 rounded-[2px] border border-[var(--t-border)]">
                        <h4 className="text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-widest mb-3">Documents</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-[var(--t-info)]/5 border border-[var(--t-info)]/20 rounded-[2px]">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">📐</span>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-semibold text-[var(--t-text)] uppercase">Blueprints</span>
                                        {phase.naksa_file ? (
                                            <a href={getMediaUrl(phase.naksa_file)} target="_blank" rel="noreferrer" className="text-[9px] font-['DM_Mono',monospace] text-[var(--t-info)] hover:underline">View File</a>
                                        ) : (
                                            <span className="text-[9px] font-['DM_Mono',monospace] text-[var(--t-text3)]">Not Uploaded</span>
                                        )}
                                    </div>
                                </div>
                                <input type="file" className="hidden" id="naksa-upload" onChange={(e) => {
                                    if (e.target.files[0]) {
                                        const fd = new FormData();
                                        fd.append('naksa_file', e.target.files[0]);
                                        updatePhase(phase.id, fd).then(() => refreshData());
                                    }
                                }}/>
                                <label htmlFor="naksa-upload" className="px-2 py-1 bg-[var(--t-surface)] border border-[var(--t-info)]/30 text-[var(--t-info)] text-[10px] rounded-[2px] cursor-pointer hover:bg-[var(--t-info)]/10 transition">↑</label>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-[var(--t-warn)]/5 border border-[var(--t-warn)]/20 rounded-[2px]">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">🏗️</span>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-semibold text-[var(--t-text)] uppercase">Structure</span>
                                        {phase.structure_design ? (
                                            <a href={getMediaUrl(phase.structure_design)} target="_blank" rel="noreferrer" className="text-[9px] font-['DM_Mono',monospace] text-[var(--t-warn)] hover:underline">View Design</a>
                                        ) : (
                                            <span className="text-[9px] font-['DM_Mono',monospace] text-[var(--t-text3)]">Not Uploaded</span>
                                        )}
                                    </div>
                                </div>
                                <input type="file" className="hidden" id="structure-upload" onChange={(e) => {
                                    if (e.target.files[0]) {
                                        const fd = new FormData();
                                        fd.append('structure_design', e.target.files[0]);
                                        updatePhase(phase.id, fd).then(() => refreshData());
                                    }
                                }}/>
                                <label htmlFor="structure-upload" className="px-2 py-1 bg-[var(--t-surface)] border border-[var(--t-warn)]/30 text-[var(--t-warn)] text-[10px] rounded-[2px] cursor-pointer hover:bg-[var(--t-warn)]/10 transition">↑</label>
                            </div>
                        </div>
                    </div>

                    {/* Task List */}
                    <div className="bg-[var(--t-surface)] p-4 rounded-[2px] border border-[var(--t-border)] flex-1 flex flex-col min-h-[300px]">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-widest">Sub-Phases ({tasks?.length || 0})</h4>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-4 max-h-[300px]">
                            {tasks?.length > 0 ? tasks.map(task => (
                                <div key={task.id} 
                                     onClick={() => setSelectedTask(task)}
                                     className={`group flex flex-col p-3 rounded-[2px] cursor-pointer border transition-colors ${
                                         selectedTask?.id === task.id ? 'bg-[var(--t-primary)]/5 border-[var(--t-primary)]/40' : 'bg-[var(--t-surface2)] border-[var(--t-border)] hover:border-[var(--t-border2)]'
                                     }`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <input type="checkbox" checked={task.status === 'COMPLETED'}
                                                onChange={(e) => { e.stopPropagation(); handleTaskToggle(task); }}
                                                className="mt-1 w-3.5 h-3.5 accent-[var(--t-primary)] cursor-pointer" />
                                            <div className="flex-1">
                                                <span className={`text-[13px] font-semibold leading-tight ${task.status === 'COMPLETED' ? 'line-through text-[var(--t-text3)]' : 'text-[var(--t-text)]'}`}>
                                                    {task.title}
                                                </span>
                                                <div className="flex gap-3 mt-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[8px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase">Due</span>
                                                        <input type="date" value={task.due_date || ''}
                                                            onClick={e => e.stopPropagation()}
                                                            onChange={e => constructionService.updateTask(task.id, { due_date: e.target.value || null }).then(refreshData)}
                                                            className="text-[9px] bg-transparent border-b border-[var(--t-border)] text-[var(--t-text2)] outline-none focus:border-[var(--t-primary)]" />
                                                    </div>
                                                    {task.media?.length > 0 && (
                                                        <span className="text-[8px] font-['DM_Mono',monospace] bg-[var(--t-surface3)] px-1.5 py-0.5 rounded-[1px] text-[var(--t-text)]">
                                                            {task.media.length} MEDIA
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                                className="opacity-0 group-hover:opacity-100 text-[14px] text-[var(--t-danger)] p-1 hover:bg-[var(--t-danger)]/10 rounded-[2px]">
                                            ×
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-[11px] text-[var(--t-text3)] italic">No sub-phases added.</p>
                            )}
                        </div>

                        <form onSubmit={handleAddTask} className="flex gap-2 mt-auto">
                            <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                                placeholder="Add new task..."
                                className="flex-1 text-[12px] bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-[2px] px-3 py-2 outline-none focus:border-[var(--t-primary)]" />
                            <button type="submit" disabled={addingTask || !newTaskTitle.trim()}
                                className="bg-[var(--t-primary)] text-[var(--t-bg)] px-3 rounded-[2px] font-bold text-lg disabled:opacity-50">
                                +
                            </button>
                        </form>
                    </div>

                    <button onClick={async () => {
                        if (window.confirm("Delete this phase?")) {
                            try {
                                await constructionService.deletePhase(phase.id);
                                refreshData();
                                onClose();
                            } catch (e) { alert("Delete failed"); }
                        }
                    }} className="w-full py-2 border border-[var(--t-danger)]/40 text-[var(--t-danger)] text-[10px] font-['DM_Mono',monospace] uppercase tracking-widest rounded-[2px] hover:bg-[var(--t-danger)] hover:text-white transition-colors">
                        Delete Phase
                    </button>
                </div>

                {/* Right Column: Media Gallery & Material Cart */}
                <div className="w-full lg:w-2/3 flex flex-col gap-4">
                    
                    {/* Phase Completion */}
                    {phase.status !== 'COMPLETED' ? (
                        <div className="bg-[var(--t-surface)] p-4 border border-[var(--t-primary)]/40 rounded-[2px] flex flex-col md:flex-row gap-4 items-center">
                            <div className="w-full md:w-32 h-24 bg-[var(--t-surface2)] border border-dashed border-[var(--t-primary)]/50 rounded-[2px] flex items-center justify-center cursor-pointer overflow-hidden group relative"
                                 onClick={() => phasePhotoRef.current.click()}>
                                {phase.completion_photo ? (
                                    <img src={getMediaUrl(phase.completion_photo)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl group-hover:scale-110 transition-transform">📸</span>
                                        <span className="text-[8px] font-['DM_Mono',monospace] text-[var(--t-text2)] uppercase mt-1">Proof Photo</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[13px] font-bold text-[var(--t-primary)] uppercase tracking-tight mb-2">Finalize Phase</h3>
                                <button onClick={async () => {
                                    if (!phase.completion_photo) return alert("Upload proof first.");
                                    setCompleting(true);
                                    await updatePhase(phase.id, { status: 'COMPLETED' });
                                    refreshData();
                                    setCompleting(false);
                                }} disabled={completing}
                                className="w-full bg-[var(--t-primary)] text-[var(--t-bg)] text-[10px] font-['DM_Mono',monospace] uppercase tracking-widest py-2.5 rounded-[2px] hover:opacity-90 disabled:opacity-50 transition-opacity">
                                    {completing ? 'Closing...' : 'Mark Completed'}
                                </button>
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
                    ) : (
                        <div className="bg-[var(--t-surface)] p-4 border border-[var(--t-primary)] rounded-[2px] flex items-center gap-4">
                            <div className="w-12 h-12 bg-[var(--t-primary)]/10 flex items-center justify-center text-2xl rounded-[2px]">🏆</div>
                            <div>
                                <h3 className="text-[13px] font-bold text-[var(--t-text)] uppercase tracking-widest">Phase Completed</h3>
                                <p className="text-[10px] font-['DM_Mono',monospace] text-[var(--t-text2)] uppercase">Updated {new Date(phase.updated_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    )}

                    {/* Task Media Gallery */}
                    <div className="bg-[var(--t-surface)] p-4 rounded-[2px] border border-[var(--t-border)]">
                        {selectedTask ? (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h4 className="text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-widest">Task Media: {selectedTask.title}</h4>
                                    </div>
                                    <button onClick={() => fileInputRef.current.click()} disabled={uploading}
                                        className="bg-[var(--t-primary)] text-[var(--t-bg)] text-[9px] font-['DM_Mono',monospace] uppercase tracking-widest px-3 py-1.5 rounded-[2px] hover:opacity-90 disabled:opacity-50">
                                        {uploading ? 'Uploading...' : 'Upload Media'}
                                    </button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto">
                                    {selectedTask.media?.length > 0 ? selectedTask.media.map(m => (
                                        <div key={m.id} className="aspect-square bg-[var(--t-surface2)] rounded-[2px] border border-[var(--t-border)] relative group overflow-hidden">
                                            {m.media_type === 'VIDEO' ? (
                                                <video src={getMediaUrl(m.file)} className="w-full h-full object-cover" controls />
                                            ) : (
                                                <img src={getMediaUrl(m.file)} className="w-full h-full object-cover" />
                                            )}
                                            <button onClick={() => handleDeleteMedia(m.id)}
                                                className="absolute top-1 right-1 w-6 h-6 bg-[var(--t-bg)]/80 text-[var(--t-danger)] backdrop-blur text-[14px] flex items-center justify-center rounded-[2px] opacity-0 group-hover:opacity-100 hover:bg-[var(--t-danger)] hover:text-[var(--t-bg)] transition-all">
                                                ×
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="col-span-full py-10 flex flex-col items-center justify-center border border-dashed border-[var(--t-border)] rounded-[2px] text-[var(--t-text3)]">
                                            <span className="text-2xl mb-2">📸</span>
                                            <span className="text-[10px] font-['DM_Mono',monospace] uppercase">No media uploaded</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center text-[var(--t-text3)]">
                                <span className="text-3xl mb-2">👈</span>
                                <span className="text-[10px] font-['DM_Mono',monospace] uppercase tracking-widest">Select a task to view media</span>
                            </div>
                        )}
                    </div>

                    {/* Associated Materials Box */}
                    <div className="bg-[var(--t-surface)] p-4 rounded-[2px] border border-[var(--t-border)] flex-1 flex flex-col">
                        <h4 className="text-[10px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-widest mb-4">Allocated Materials</h4>
                        
                        {/* Material List */}
                        <div className="max-h-[200px] overflow-y-auto mb-4 border border-[var(--t-border)] rounded-[2px]">
                            {phaseMaterials.length > 0 ? (
                                <table className="w-full text-left">
                                    <thead className="bg-[var(--t-surface2)] border-b border-[var(--t-border)] sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-[8px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-widest">Item</th>
                                            <th className="px-3 py-2 text-[8px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-widest text-right">Qty</th>
                                            <th className="px-3 py-2 text-[8px] font-['DM_Mono',monospace] text-[var(--t-text3)] uppercase tracking-widest text-right">Total</th>
                                            <th className="px-3 py-2 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--t-border)]">
                                        {phaseMaterials.map(m => (
                                            <tr key={m.id} className="hover:bg-[var(--t-surface2)]">
                                                <td className="px-3 py-2 text-[12px] font-bold text-[var(--t-text)]">{m.title}</td>
                                                <td className="px-3 py-2 text-right">
                                                    <span className="text-[12px] font-['Bebas_Neue',sans-serif] text-[var(--t-text)]">{m.quantity}</span>
                                                    <span className="text-[8px] font-['DM_Mono',monospace] ml-1 uppercase text-[var(--t-text3)]">{m.unit}</span>
                                                </td>
                                                <td className="px-3 py-2 text-right text-[12px] font-['Bebas_Neue',sans-serif] text-[var(--t-primary)]">
                                                    {formatCurrency(m.amount)}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button onClick={() => window.confirm("Unlink?") && deleteExpense(m.id)}
                                                        className="text-[var(--t-border2)] hover:text-[var(--t-danger)]">×</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-6 text-center text-[var(--t-text3)] text-[10px] font-['DM_Mono',monospace] uppercase">No materials allocated</div>
                            )}
                        </div>

                        {/* Add Materials Row */}
                        <div className="border border-[var(--t-border)] bg-[var(--t-surface2)] rounded-[2px] p-3 flex flex-col md:flex-row gap-3">
                            <select value={selectedMaterialId} onChange={e => {
                                setSelectedMaterialId(e.target.value);
                                const mat = dashboardData.materials.find(m => m.id === parseInt(e.target.value));
                                if(mat) setMaterialUnitPrice(mat.avg_cost_per_unit || '');
                            }} className="flex-1 bg-[var(--t-surface)] border border-[var(--t-border)] outline-none text-[11px] p-2 focus:border-[var(--t-primary)] rounded-[2px]">
                                <option value="">Select Inventory Item...</option>
                                {dashboardData.materials?.map(m => <option key={m.id} value={m.id}>{m.name} ({m.current_stock} {m.unit})</option>)}
                            </select>
                            <div className="flex gap-2">
                                <input type="number" placeholder="Qty" value={materialQuantity} onChange={e => setMaterialQuantity(e.target.value)}
                                       className="w-16 bg-[var(--t-surface)] border border-[var(--t-border)] text-[12px] p-2 outline-none focus:border-[var(--t-primary)] rounded-[2px] text-center"/>
                                <button onClick={addToCart} disabled={!selectedMaterialId || !materialQuantity}
                                    className="bg-[var(--t-text)] text-[var(--t-bg)] px-3 text-[10px] font-['DM_Mono',monospace] uppercase rounded-[2px] hover:opacity-90 disabled:opacity-50">Add</button>
                            </div>
                        </div>

                        {/* Pending Cart */}
                        {materialCart.length > 0 && (
                            <div className="mt-3 bg-[var(--t-primary)]/10 border border-[var(--t-primary)]/30 rounded-[2px] p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-['DM_Mono',monospace] uppercase text-[var(--t-primary)]">Pending ({materialCart.length})</span>
                                    <button onClick={handleLinkMaterial} disabled={linkingMaterial}
                                        className="bg-[var(--t-primary)] text-[var(--t-bg)] text-[9px] font-['DM_Mono',monospace] uppercase px-3 py-1.5 rounded-[2px] hover:opacity-90">
                                        {linkingMaterial ? 'Allocating...' : 'Confirm Allocation'}
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {materialCart.map(item => (
                                        <div key={item.id} className="flex justify-between text-[11px] bg-[var(--t-bg)] p-1.5 rounded-[2px] border border-[var(--t-border)]">
                                            <span>{item.name} ({item.quantity} {item.unit})</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-['Bebas_Neue',sans-serif] text-[13px]">{formatCurrency(item.quantity * item.unitPrice)}</span>
                                                <button onClick={() => removeFromCart(item.id)} className="text-[var(--t-danger)]">×</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PhaseDetailModal;
