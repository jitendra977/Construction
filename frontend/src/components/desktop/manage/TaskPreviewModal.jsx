import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../common/Modal';
import { getMediaUrl } from '../../../services/api';
import { useConstruction } from '../../../context/ConstructionContext';
import imageCompression from 'browser-image-compression';

const TaskPreviewModal = ({ isOpen, onClose, task, initialMode = 'read' }) => {
    const { 
        dashboardData, updateTask, createTask, deleteTask, 
        uploadTaskMedia, formatCurrency 
    } = useConstruction();
    const [isEditing, setIsEditing] = useState(initialMode !== 'read');
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            if (task && task.id) {
                setFormData({ ...task });
                setIsEditing(initialMode === 'edit');
            } else {
                // Default data for new task, potentially pre-filled
                setFormData({
                    title: task?.title || '',
                    description: task?.description || '',
                    status: task?.status || 'PENDING',
                    priority: task?.priority || 'MEDIUM',
                    phase: task?.phase || dashboardData.phases?.[0]?.id || '',
                    assigned_to: task?.assigned_to || null,
                    room: task?.room || null,
                    category: task?.category || null,
                    estimated_cost: task?.estimated_cost || 0,
                    start_date: task?.start_date || new Date().toISOString().split('T')[0],
                    due_date: task?.due_date || '',
                    completed_date: task?.completed_date || ''
                });
                setIsEditing(true);
            }
        }
    }, [task, isOpen, initialMode, dashboardData.phases]);

    if (!isOpen) return null;

    const mono = { fontFamily: 'var(--f-mono)' };
    const disp = { fontFamily: 'var(--f-disp)' };
    const body = { fontFamily: 'var(--f-body)' };

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

    const getCategoryName = (id) => dashboardData.budgetCategories?.find(c => c.id === id)?.name || 'N/A';
    const getRoomName = (id) => dashboardData.rooms?.find(r => r.id === id)?.name || 'General Area';
    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';

    const handleSave = async () => {
        setLoading(true);
        try {
            if (task && task.id) {
                await updateTask(task.id, formData);
            } else {
                await createTask(formData);
            }
            setIsEditing(false);
            if (!task?.id) onClose(); // Close on create success
        } catch (error) {
            alert('Failed to save task.');
        } finally {
            setLoading(false);
        }
    };


    const handleFileUpload = async (e) => {
        let file = e.target.files[0];
        if (!file || !task) return;

        setUploading(true);
        
        let mediaType = 'DOCUMENT';
        const type = file.type.toLowerCase();
        
        if (type.startsWith('image/')) {
            mediaType = 'IMAGE';
            try {
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1280,
                    useWebWorker: true
                };
                file = await imageCompression(file, options);
            } catch (error) {
                console.error("Image compression error:", error);
            }
        } else if (type.startsWith('video/')) {
            mediaType = 'VIDEO';
        }

        const uploadData = new FormData();
        uploadData.append('task', task.id);
        uploadData.append('file', file);
        uploadData.append('media_type', mediaType);

        try {
            await uploadTaskMedia(uploadData);
        } catch (error) {
            alert('Upload failed.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteTask(task.id);
            onClose();
        } catch (error) {
            alert('Failed to delete task.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={!(task && task.id) ? "Initialize New Task" : isEditing ? "Edit Task" : "Task Details"} 
            maxWidth="max-w-4xl"
            footer={
                <div className="flex justify-between items-center w-full">
                    <div className="flex gap-2">
                        {!isEditing ? (
                            <>
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 bg-[var(--t-primary)] text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2"
                                    style={mono}
                                >
                                    <span>✏️</span> Edit
                                </button>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="px-4 py-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2"
                                    style={mono}
                                >
                                    <span>📤</span> {uploading ? 'Uploading...' : 'Upload'}
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" />
                                <button 
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <span>🗑️</span> Delete
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2"
                                >
                                    {loading ? 'Saving...' : '✅ Save Changes'}
                                </button>
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 bg-[var(--t-surface3)] text-[var(--t-text2)] rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[var(--t-border)] transition-all"
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                    {!isEditing && task && task.id && (
                        <div className="hidden sm:block text-[10px] font-black text-[var(--t-primary)] uppercase tracking-tighter" style={mono}>
                            Node ID: #{task.id}
                        </div>
                    )}
                </div>
            }
        >
            <div className="space-y-6">

                {showDeleteConfirm && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl animate-shake">
                        <div className="text-red-600 font-black text-xs uppercase mb-2">Confirm Task Deletion?</div>
                        <p className="text-[10px] text-red-700/80 mb-4 font-bold">This action cannot be undone. All task data and proofs will be permanently removed.</p>
                        <div className="flex gap-2">
                            <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Yes, Delete Forever</button>
                            <button onClick={() => setShowDeleteConfirm(false)} className="bg-[var(--t-surface)] border border-[var(--t-border)] px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Cancel</button>
                        </div>
                    </div>
                )}

                {/* Task Title & Status */}
                <div>
                    {isEditing ? (
                        <div className="space-y-3">
                            <input 
                                type="text"
                                value={formData.title || ''}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="w-full text-xl font-bold bg-[var(--t-surface2)] border border-[var(--t-border)] p-3 rounded-xl focus:ring-2 focus:ring-[var(--t-primary)] outline-none"
                                placeholder="Task Title"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <select 
                                    value={formData.status || ''}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                    className="bg-[var(--t-surface2)] border border-[var(--t-border)] p-2 rounded-xl text-xs font-black uppercase"
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="BLOCKED">Blocked</option>
                                </select>
                                <select 
                                    value={formData.priority || ''}
                                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                    className="bg-[var(--t-surface2)] border border-[var(--t-border)] p-2 rounded-xl text-xs font-black uppercase"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="CRITICAL">Critical</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-[var(--t-text)] leading-tight" style={disp}>
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
                        </>
                    )}
                </div>

                {/* Primary Details Grid (Edit Mode) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-[var(--t-surface2)] rounded-xl p-3 border border-[var(--t-border)]">
                        <div className="text-[9px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">Phase</div>
                        {isEditing ? (
                            <select 
                                value={formData.phase || ''}
                                onChange={(e) => setFormData({...formData, phase: parseInt(e.target.value)})}
                                className="w-full text-xs font-bold bg-transparent outline-none"
                            >
                                {dashboardData.phases?.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="text-sm font-bold text-[var(--t-text)]">{getPhaseName(task.phase)}</div>
                        )}
                    </div>
                    <div className="bg-[var(--t-surface2)] rounded-xl p-3 border border-[var(--t-border)]">
                        <div className="text-[9px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">Contractor</div>
                        {isEditing ? (
                            <select 
                                value={formData.assigned_to || ''}
                                onChange={(e) => setFormData({...formData, assigned_to: parseInt(e.target.value)})}
                                className="w-full text-xs font-bold bg-transparent outline-none"
                            >
                                <option value="">Unassigned</option>
                                {dashboardData.contractors?.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="text-sm font-bold text-[var(--t-text)] flex items-center gap-2">
                                <span>👤</span> {getContractorName(task.assigned_to)}
                            </div>
                        )}
                    </div>
                    <div className="bg-[var(--t-surface2)] rounded-xl p-3 border border-[var(--t-border)]">
                        <div className="text-[9px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1">Location</div>
                        {isEditing ? (
                            <select 
                                value={formData.room || ''}
                                onChange={(e) => setFormData({...formData, room: parseInt(e.target.value)})}
                                className="w-full text-xs font-bold bg-transparent outline-none"
                            >
                                <option value="">General Area</option>
                                {dashboardData.rooms?.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="text-sm font-bold text-[var(--t-text)]">📍 {getRoomName(task.room)}</div>
                        )}
                    </div>
                </div>

                {/* Timeline & Budget Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-widest border-b border-[var(--t-border)] pb-1">Timeline</div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <div className="text-[8px] font-bold text-[var(--t-text3)] uppercase">Start Date</div>
                                {isEditing ? (
                                    <input 
                                        type="date"
                                        value={formData.start_date || ''}
                                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                                        className="text-[10px] font-semibold bg-[var(--t-surface)] p-1 rounded border border-[var(--t-border)] w-full"
                                    />
                                ) : (
                                    <div className="text-[11px] font-semibold text-[var(--t-text)]">{formatDate(task.start_date)}</div>
                                )}
                            </div>
                            <div>
                                <div className="text-[8px] font-bold text-[var(--t-text3)] uppercase">Due Date</div>
                                {isEditing ? (
                                    <input 
                                        type="date"
                                        value={formData.due_date || ''}
                                        onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                                        className="text-[10px] font-semibold bg-[var(--t-surface)] p-1 rounded border border-[var(--t-border)] w-full"
                                    />
                                ) : (
                                    <div className="text-[11px] font-semibold text-[var(--t-text)]">{formatDate(task.due_date)}</div>
                                )}
                            </div>
                            <div className="col-span-2">
                                <div className="text-[8px] font-bold text-[var(--t-text3)] uppercase">Completed On</div>
                                {isEditing ? (
                                    <input 
                                        type="date"
                                        value={formData.completed_date || ''}
                                        onChange={(e) => setFormData({...formData, completed_date: e.target.value})}
                                        className="text-[10px] font-semibold bg-[var(--t-surface)] p-1 rounded border border-[var(--t-border)] w-full"
                                    />
                                ) : (
                                    <div className={`text-[11px] font-semibold ${task.completed_date ? 'text-green-600' : 'text-[var(--t-text3)]'}`}>{formatDate(task.completed_date)}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-widest border-b border-[var(--t-border)] pb-1">Financials</div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <div className="text-[8px] font-bold text-[var(--t-text3)] uppercase tracking-tighter">Est. Cost</div>
                                {isEditing ? (
                                    <input 
                                        type="number"
                                        value={formData.estimated_cost || 0}
                                        onChange={(e) => setFormData({...formData, estimated_cost: parseFloat(e.target.value)})}
                                        className="text-sm font-black bg-[var(--t-surface)] p-1 rounded border border-[var(--t-border)] w-full"
                                    />
                                ) : (
                                    <div className="text-sm font-black text-[var(--t-text)]">
                                        {formatCurrency ? formatCurrency(task.estimated_cost) : `Rs. ${Number(task.estimated_cost).toLocaleString()}`}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-[8px] font-bold text-[var(--t-text3)] uppercase tracking-tighter">Category</div>
                                {isEditing ? (
                                    <select 
                                        value={formData.category || ''}
                                        onChange={(e) => setFormData({...formData, category: parseInt(e.target.value)})}
                                        className="text-[10px] font-bold bg-[var(--t-surface)] p-1 rounded border border-[var(--t-border)] w-full"
                                    >
                                        <option value="">N/A</option>
                                        {dashboardData.budgetCategories?.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="text-xs font-bold text-[var(--t-primary)] uppercase truncate bg-[var(--t-primary)]/5 px-2 py-0.5 rounded">
                                        {getCategoryName(task.category)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description Box */}
                <div>
                    <div className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-widest mb-2 border-b border-[var(--t-border)] pb-1">
                        Task Description
                    </div>
                    {isEditing ? (
                        <textarea 
                            value={formData.description || ''}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full text-sm text-[var(--t-text2)] leading-relaxed font-medium bg-[var(--t-surface2)] border border-[var(--t-border)] p-3 rounded-xl focus:ring-2 focus:ring-[var(--t-primary)] outline-none min-h-[100px]"
                            placeholder="Describe the task..."
                        />
                    ) : (
                        task.description ? (
                            <p className="text-sm text-[var(--t-text2)] leading-relaxed font-medium whitespace-pre-wrap" style={body}>
                                {task.description}
                            </p>
                        ) : (
                            <p className="text-xs text-[var(--t-text3)] italic">No description provided.</p>
                        )
                    )}
                </div>

                {/* Task Proofs (Media) - View Only for now in this modal */}
                {(() => {
                    const liveTask = (task && task.id) ? dashboardData.tasks?.find(t => t.id === task.id) || task : task;
                    if (!liveTask?.media || liveTask.media.length === 0) return null;
                    
                    return (
                        <div>
                            <div className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-widest mb-3 flex items-center justify-between border-b border-[var(--t-border)] pb-2">
                                <div className="flex items-center gap-2" style={mono}>
                                    <span>📸</span> Proof of Work & Files
                                    <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[9px]">
                                        {liveTask.media.length} items
                                    </span>
                                </div>
                                <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    disabled={uploading}
                                    className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all rounded-sm flex items-center gap-1"
                                >
                                    <span>📤</span> {uploading ? 'UPLOADING...' : 'UPLOAD PROOF'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {liveTask.media.map(m => (
                                    <div key={m.id} className="flex flex-col rounded-xl overflow-hidden border border-[var(--t-border)] bg-[var(--t-surface2)] group relative">
                                        <div className="aspect-video relative overflow-hidden bg-black flex items-center justify-center">
                                            {m.media_type === 'IMAGE' ? (
                                                <img
                                                    src={getMediaUrl(m.file)}
                                                    alt="Task Proof"
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                            ) : m.media_type === 'VIDEO' ? (
                                                <video src={getMediaUrl(m.file)} className="w-full h-full object-contain" controls />
                                            ) : m.file?.toLowerCase().endsWith('.pdf') ? (
                                                <div className="w-full h-full bg-red-600/10 flex flex-col items-center justify-center relative p-4 group">
                                                    <div className="absolute top-3 left-3 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-sm shadow-lg z-10">PDF</div>
                                                    <div className="w-16 h-20 bg-white border-2 border-red-200 rounded-sm shadow-sm flex flex-col items-center justify-center gap-1 group-hover:scale-110 transition-transform">
                                                        <span className="text-2xl">📄</span>
                                                        <div className="w-8 h-1 bg-red-100"></div>
                                                        <div className="w-6 h-1 bg-red-50"></div>
                                                    </div>
                                                    <p className="mt-3 text-[9px] font-black text-red-900/80 uppercase tracking-tighter truncate w-full text-center px-4 relative z-10">
                                                        {m.file.split('/').pop()}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 p-4 text-center">
                                                    <span className="text-3xl">📄</span>
                                                    <span className="text-[10px] text-white/70 uppercase font-black">Document File</span>
                                                    <p className="text-[8px] text-white/40 truncate w-full px-2">{m.file.split('/').pop()}</p>
                                                </div>
                                            )}
                                            <a
                                                href={getMediaUrl(m.file)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2"
                                            >
                                                <span className="text-white text-[10px] font-black uppercase tracking-widest border border-white/30 px-3 py-1.5 rounded-full backdrop-blur-sm">View Full Resolution</span>
                                            </a>
                                        </div>
                                        {m.description && (
                                            <div className="p-2 border-t border-[var(--t-border)]">
                                                <p className="text-[10px] text-[var(--t-text2)] leading-tight italic line-clamp-2">
                                                    {m.description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Footer Audit Information */}
                <div className="mt-8 pt-4 border-t border-dashed border-[var(--t-border)] flex justify-between items-center text-[9px] font-bold text-[var(--t-text3)] uppercase tracking-wider">
                    <span>ID: #{task.id}</span>
                    <div className="flex gap-4">
                        <span>Created: {formatDate(task.created_at)}</span>
                        <span>Updated: {formatDate(task.updated_at)}</span>
                    </div>
                </div>

            </div>
        </Modal>
    );
};

export default TaskPreviewModal;
