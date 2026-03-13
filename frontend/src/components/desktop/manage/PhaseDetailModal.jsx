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
                // Update currently selected task with fresh data if it exists in the new tasks array
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

        // Reset only selection, maybe keep price? Usually better to reset.
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
            // Process each item in the cart
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
            // Clear cart on success
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
        <Modal isOpen={isOpen} onClose={onClose} title={`${phase.name} - Task Management`} maxWidth="max-w-5xl">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Left: Phase Details & Task List */}
                <div className="w-full md:w-1/3 space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Current Status</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${phase.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            phase.status === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${phase.status === 'COMPLETED' ? 'bg-green-400' :
                                phase.status === 'IN_PROGRESS' ? 'bg-indigo-400' :
                                    'bg-gray-400'
                                }`}></span>
                            {phase.status.replace('_', ' ')}
                        </span>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Phase Name</h4>
                            <input
                                type="text"
                                value={phase.name}
                                onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                                className="w-full text-sm font-bold text-gray-900 bg-gray-50 border-gray-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
                            <textarea
                                value={phase.description || ''}
                                onChange={(e) => updatePhase(phase.id, { description: e.target.value })}
                                rows="3"
                                className="w-full text-sm text-gray-600 bg-gray-50 border-gray-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                placeholder="Describe the goals of this phase..."
                            />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Construction Documents</h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 hover:border-blue-300 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="text-xl">📐</div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-blue-900 uppercase">Blueprints (Naksa)</span>
                                        {phase.naksa_file ? (
                                            <a href={getMediaUrl(phase.naksa_file)} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold underline">View Blueprint</a>
                                        ) : (
                                            <span className="text-[10px] text-blue-400 font-medium italic">Not Uploaded</span>
                                        )}
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    id="naksa-upload"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const fd = new FormData();
                                            fd.append('naksa_file', file);
                                            updatePhase(phase.id, fd).then(() => refreshData());
                                        }
                                    }}
                                />
                                <label htmlFor="naksa-upload" className="p-1 px-2 bg-white rounded-lg shadow-sm border border-blue-100 text-[10px] font-black text-blue-600 cursor-pointer hover:bg-blue-50 transition-colors">↑</label>
                            </div>

                            <div className="flex items-center justify-between p-2.5 bg-purple-50/50 rounded-xl border border-purple-100 hover:border-purple-300 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="text-xl">🏗️</div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-purple-900 uppercase">Structure Design</span>
                                        {phase.structure_design ? (
                                            <a href={getMediaUrl(phase.structure_design)} target="_blank" rel="noreferrer" className="text-[10px] text-purple-600 font-bold underline">View Design</a>
                                        ) : (
                                            <span className="text-[10px] text-purple-400 font-medium italic">Not Uploaded</span>
                                        )}
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    id="structure-upload"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const fd = new FormData();
                                            fd.append('structure_design', file);
                                            updatePhase(phase.id, fd).then(() => refreshData());
                                        }
                                    }}
                                />
                                <label htmlFor="structure-upload" className="p-1 px-2 bg-white rounded-lg shadow-sm border border-purple-100 text-[10px] font-black text-purple-600 cursor-pointer hover:bg-purple-50 transition-colors">↑</label>
                            </div>
                        </div>
                    </div>


                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Timeline</h4>
                        <div className="space-y-3">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-gray-500">Start Date</span>
                                <input
                                    type="date"
                                    value={phase.start_date || ''}
                                    onChange={(e) => {
                                        updatePhase(phase.id, { start_date: e.target.value || null })
                                            .catch(err => console.error('Failed to update start date', err));
                                    }}
                                    className="border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-gray-500">End Date</span>
                                <input
                                    type="date"
                                    value={phase.end_date || ''}
                                    onChange={(e) => {
                                        updatePhase(phase.id, { end_date: e.target.value || null })
                                            .catch(err => console.error('Failed to update end date', err));
                                    }}
                                    className="border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider mb-2">Danger Zone</h4>
                        <button
                            onClick={async () => {
                                if (window.confirm(`Are you sure you want to delete "${phase.name}"? This action cannot be undone.`)) {
                                    try {
                                        await constructionService.deletePhase(phase.id);
                                        refreshData();
                                        onClose();
                                    } catch (err) {
                                        console.error("Failed to delete phase", err);
                                        alert("Failed to delete phase. Ensure there are no linked expenses or tasks.");
                                    }
                                }
                            }}
                            className="w-full py-2 bg-white text-red-600 text-[10px] font-black uppercase rounded-lg border border-red-200 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                        >
                            Delete Phase
                        </button>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 max-h-[400px] overflow-y-auto">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sub Phases (Tasks)</h4>
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{tasks?.length || 0}</span>
                        </div>

                        {tasks && tasks.length > 0 ? (
                            <ul className="space-y-3 mb-4">
                                {tasks.map(task => (
                                    <li
                                        key={task.id}
                                        className={`group flex flex-col gap-2 p-3 rounded-lg transition-all cursor-pointer border ${selectedTask?.id === task.id
                                            ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                                            : 'hover:bg-gray-50 border-gray-200'
                                            }`}
                                        onClick={() => setSelectedTask(task)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-3 flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={task.status === 'COMPLETED'}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        handleTaskToggle(task);
                                                    }}
                                                    className="w-4 h-4 mt-0.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-sm font-medium block ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                                        {task.title}
                                                    </span>

                                                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                                        <div className="flex items-center gap-1 text-gray-500">
                                                            <span className="font-medium">Start:</span>
                                                            <input
                                                                type="date"
                                                                value={task.start_date || ''}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    constructionService.updateTask(task.id, { start_date: e.target.value || null })
                                                                        .then(() => refreshData())
                                                                        .catch(err => console.error('Failed to update start date', err));
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="border-gray-200 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-1 text-gray-500">
                                                            <span className="font-medium">Due:</span>
                                                            <input
                                                                type="date"
                                                                value={task.due_date || ''}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    constructionService.updateTask(task.id, { due_date: e.target.value || null })
                                                                        .then(() => refreshData())
                                                                        .catch(err => console.error('Failed to update due date', err));
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="border-gray-200 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Media Counter */}
                                                    {task.media && task.media.length > 0 && (
                                                        <div className="mt-2">
                                                            <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                                                📷 {task.media.length} {task.media.length === 1 ? 'file' : 'files'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteTask(task.id);
                                                }}
                                                className="text-gray-300 hover:text-red-500 transition-opacity p-1 flex-shrink-0"
                                                title="Delete Task"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-400 italic mb-4">No sub-phases added.</p>
                        )}

                        <form onSubmit={handleAddTask} className="flex gap-2">
                            <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Add new task..."
                                className="flex-1 text-sm border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 px-3 py-1.5 bg-gray-50"
                            />
                            <button
                                type="submit"
                                disabled={addingTask || !newTaskTitle.trim()}
                                className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right: Media Gallery for Selected Task */}
                <div className="w-full md:w-2/3">
                    {selectedTask ? (
                        <div className="space-y-6">
                            {/* Phase Completion Section */}
                            {phase.status !== 'COMPLETED' ? (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-emerald-50 flex items-center justify-center text-2xl">
                                                ✅
                                            </div>
                                            <div>
                                                <h3 className="font-black text-emerald-900 uppercase tracking-tight text-sm">Finish this Phase</h3>
                                                <p className="text-xs text-emerald-600 font-medium italic">Upload a completion photo to mark project progress.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-4 items-center">
                                        <div
                                            className="w-full md:w-32 h-32 bg-white rounded-xl border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-100/30 transition-all overflow-hidden relative group"
                                            onClick={() => phasePhotoRef.current.click()}
                                        >
                                            {phase.completion_photo ? (
                                                <img src={getMediaUrl(phase.completion_photo)} alt="Completion" className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📸</span>
                                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Proof Photo</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-3 w-full">
                                            <button
                                                onClick={async () => {
                                                    if (!phase.completion_photo) {
                                                        alert("Please upload a completion photo first.");
                                                        return;
                                                    }
                                                    setCompleting(true);
                                                    try {
                                                        await updatePhase(phase.id, { status: 'COMPLETED' });
                                                        refreshData();
                                                    } catch (err) {
                                                        console.error("Failed to complete phase", err);
                                                    } finally {
                                                        setCompleting(false);
                                                    }
                                                }}
                                                disabled={completing}
                                                className="w-full bg-emerald-600 text-white font-black py-3 rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                                            >
                                                {completing ? 'Closing Phase...' : 'Finalize & Mark Completed'}
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        ref={phasePhotoRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const fd = new FormData();
                                                fd.append('completion_photo', file);
                                                await updatePhase(phase.id, fd);
                                                refreshData();
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-white rounded-full shadow-lg border border-green-100 flex items-center justify-center text-3xl mb-3">
                                        🏆
                                    </div>
                                    <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm">Phase Successfully Completed</h3>
                                    <p className="text-xs text-gray-500 mt-1 font-medium italic">Project advanced on {new Date(phase.updated_at).toLocaleDateString()}</p>
                                    {phase.completion_photo && (
                                        <div className="mt-4 w-48 h-32 rounded-xl overflow-hidden shadow-md border-4 border-white rotate-2 hover:rotate-0 transition-transform">
                                            <img src={getMediaUrl(phase.completion_photo)} alt="Completion Proof" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            )}

                            <hr className="border-gray-100" />

                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-800">Task Photos & Videos</h3>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Media Log for <span className="font-medium text-indigo-600">{selectedTask.title}</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current.click()}
                                        disabled={uploading}
                                        className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        {uploading ? 'Uploading...' : (
                                            <>
                                                <span>+</span> Upload Task Media
                                            </>
                                        )}
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        accept="image/*,video/*"
                                    />
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
                                    {selectedTask.media && selectedTask.media.length > 0 ? (
                                        selectedTask.media.map((item) => (
                                            <div key={item.id} className="group relative rounded-xl overflow-hidden border border-gray-200 aspect-square shadow-sm hover:shadow-md transition-shadow bg-gray-50">
                                                {item.media_type === 'VIDEO' ? (
                                                    <video src={getMediaUrl(item.file)} className="w-full h-full object-cover" controls />
                                                ) : (
                                                    <img src={getMediaUrl(item.file)} alt="Construction update" className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500" />
                                                )}

                                                <button
                                                    onClick={() => handleDeleteMedia(item.id)}
                                                    className="absolute top-2 right-2 bg-white/90 text-red-500 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-600 shadow-sm backdrop-blur-sm"
                                                    title="Delete"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div
                                            className="col-span-full py-16 text-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                                            onClick={() => fileInputRef.current.click()}
                                        >
                                            <div className="text-4xl mb-3 opacity-50 group-hover:scale-110 transition-transform duration-300">📸</div>
                                            <p className="font-medium text-gray-900">No media yet</p>
                                            <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">Upload photos or videos to track progress for this task.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <div className="text-center">
                                <div className="text-5xl mb-4 opacity-30">📋</div>
                                <p className="text-gray-500 font-medium">Select a sub-phase to view/add media</p>
                                <p className="text-xs text-gray-400 mt-2">Click on a task from the list on the left</p>
                            </div>
                        </div>
                    )}

                    {/* Associated Materials - Moved from left to right bottom */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Phase Materials</h4>
                                <p className="text-[10px] text-gray-500 mt-1 font-medium">Inventory items allocated to this construction phase.</p>
                            </div>
                            <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase tracking-tighter border border-green-100">Live Allocation</span>
                        </div>

                        <div className="overflow-x-auto mb-6">
                            {phaseMaterials.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="pb-3 text-[10px] font-black text-gray-400 uppercase tracking-tighter">Material Item</th>
                                            <th className="pb-3 text-[10px] font-black text-gray-400 uppercase tracking-tighter text-right">Quantity</th>
                                            <th className="pb-3 text-[10px] font-black text-gray-400 uppercase tracking-tighter text-right">Unit Rate</th>
                                            <th className="pb-3 text-[10px] font-black text-gray-400 uppercase tracking-tighter text-right">Total Cost</th>
                                            <th className="pb-3 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {phaseMaterials.map(m => (
                                            <tr key={m.id} className="group hover:bg-gray-50/50 transition-colors">
                                                <td className="py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900">{m.title}</span>
                                                        <span className="text-[10px] text-gray-400 font-medium lowercase italic">inventory movement</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className="text-sm font-bold text-gray-700">{m.quantity}</span>
                                                    <span className="text-[10px] text-gray-400 ml-1.5 uppercase font-medium">{m.unit || 'pcs'}</span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className="text-sm text-gray-500 font-medium">Rs {parseFloat(m.unit_price).toLocaleString()}</span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className="text-sm font-black text-indigo-600">Rs {parseFloat(m.amount).toLocaleString()}</span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm("Unlink this material from phase?")) {
                                                                deleteExpense(m.id);
                                                            }
                                                        }}
                                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-bold text-xl"
                                                    >
                                                        ×
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-double border-gray-100 bg-gray-50/50">
                                            <td colSpan="3" className="py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Phase Material Investment:</td>
                                            <td className="py-4 text-right text-base font-black text-indigo-600">
                                                Rs {phaseMaterials.reduce((acc, m) => acc + parseFloat(m.amount), 0).toLocaleString()}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : (
                                <div className="py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                    <div className="text-3xl mb-2 opacity-20">🧱</div>
                                    <p className="text-sm text-gray-400 italic">No materials have been allocated to this phase yet.</p>
                                </div>
                            )}
                        </div>

                        {/* Assignment Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
                            <div>
                                <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-4">Allocate New Materials</h4>
                                <form onSubmit={addToCart} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Select Item</label>
                                        <select
                                            value={selectedMaterialId}
                                            onChange={(e) => {
                                                const matId = e.target.value;
                                                setSelectedMaterialId(matId);
                                                const mat = dashboardData.materials.find(m => m.id === parseInt(matId));
                                                if (mat) setMaterialUnitPrice(mat.avg_cost_per_unit || '');
                                            }}
                                            className="w-full text-sm border-gray-100 bg-gray-50 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none px-4 py-3"
                                        >
                                            <option value="">Choose Material from Inventory...</option>
                                            {dashboardData.materials?.map(m => (
                                                <option key={m.id} value={m.id}>{m.name} (Available: {m.current_stock} {m.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Quantity</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={materialQuantity}
                                                onChange={(e) => setMaterialQuantity(e.target.value)}
                                                className="w-full text-sm border-gray-100 bg-gray-50 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none px-4 py-3"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Unit Rate (Rs)</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={materialUnitPrice}
                                                onChange={(e) => setMaterialUnitPrice(e.target.value)}
                                                className="w-full text-sm border-gray-100 bg-gray-50 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none px-4 py-3"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!selectedMaterialId || !materialQuantity}
                                        className="w-full bg-gray-900 text-white text-xs font-black uppercase py-4 rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95 disabled:opacity-30"
                                    >
                                        + Add to Assignment List
                                    </button>
                                </form>
                            </div>

                            <div className="flex flex-col h-full">
                                <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-4">Pending Assignments</h4>
                                {materialCart.length > 0 ? (
                                    <div className="bg-indigo-50/30 flex-1 flex flex-col p-4 rounded-2xl border border-indigo-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="text-xs font-bold text-indigo-900">{materialCart.length} Items Selected</p>
                                            <button
                                                onClick={() => setMaterialCart([])}
                                                className="text-[10px] text-indigo-400 hover:text-red-500 font-bold uppercase transition-colors"
                                            >
                                                Discard All
                                            </button>
                                        </div>
                                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 flex-1">
                                            {materialCart.map(item => (
                                                <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-indigo-50 shadow-sm group animate-in zoom-in-95 duration-200">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-gray-800">{item.name}</span>
                                                        <span className="text-[10px] text-gray-400 font-medium">{item.quantity} {item.unit} x Rs {item.unitPrice}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-black text-indigo-600">Rs {(item.quantity * item.unitPrice).toLocaleString()}</span>
                                                        <button
                                                            onClick={() => removeFromCart(item.id)}
                                                            className="text-gray-300 hover:text-red-500 font-bold px-1 transition-colors"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleLinkMaterial}
                                            disabled={linkingMaterial}
                                            className="w-full mt-4 bg-indigo-600 text-white text-xs font-black uppercase py-4 rounded-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
                                        >
                                            {linkingMaterial ? 'Updating Stock...' : 'Confirm Bulk Allocation'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex-1 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center p-8 opacity-40">
                                        <div className="text-2xl mb-2">🛒</div>
                                        <p className="text-xs font-medium text-gray-400">Cart is empty</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PhaseDetailModal;
