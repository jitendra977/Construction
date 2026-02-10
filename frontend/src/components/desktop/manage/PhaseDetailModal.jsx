import React, { useState, useRef } from 'react';
import Modal from '../../common/Modal';
import { constructionService } from '../../../services/api';
import { useConstruction } from '../../../context/ConstructionContext';

const PhaseDetailModal = ({ isOpen, onClose, phase, tasks }) => {
    const { updatePhase, updateTask, refreshData } = useConstruction();
    const [uploading, setUploading] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [addingTask, setAddingTask] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const fileInputRef = useRef(null);

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

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{phase.description || "No description provided."}</p>
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

                    {/* Sub Phases / Tasks Section */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 max-h-[400px] overflow-y-auto">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sub Phases (Tasks)</h4>
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{tasks?.length || 0}</span>
                        </div>

                        {/* Task List */}
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

                                                    {/* Task Dates */}
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
                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 flex-shrink-0"
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

                        {/* Add Task Form */}
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
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-800">Task Photos & Videos</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        <span className="font-medium text-indigo-600">{selectedTask.title}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    disabled={uploading}
                                    className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    {uploading ? 'Uploading...' : (
                                        <>
                                            <span>+</span> Upload Media
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

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                                {selectedTask.media && selectedTask.media.length > 0 ? (
                                    selectedTask.media.map((item) => (
                                        <div key={item.id} className="group relative rounded-xl overflow-hidden border border-gray-200 aspect-square shadow-sm hover:shadow-md transition-shadow bg-gray-50">
                                            {item.media_type === 'VIDEO' ? (
                                                <video src={item.file} className="w-full h-full object-cover" controls />
                                            ) : (
                                                <img src={item.file} alt="Construction update" className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500" />
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
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <div className="text-center">
                                <div className="text-5xl mb-4 opacity-30">📋</div>
                                <p className="text-gray-500 font-medium">Select a sub-phase to view/add media</p>
                                <p className="text-xs text-gray-400 mt-2">Click on a task from the list on the left</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default PhaseDetailModal;
