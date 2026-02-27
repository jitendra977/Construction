import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { CheckCircle2, Circle, Clock, ChevronRight } from 'lucide-react';

const TaskUpdateDrawer = ({ isOpen, onClose }) => {
    const { dashboardData, updateTaskStatus } = useConstruction();
    const [updatingTaskId, setUpdatingTaskId] = useState(null);

    if (!isOpen) return null;

    // Filter tasks that are not completed, prioritized by the active phase
    const activePhase = dashboardData.phases?.find(p => p.status === 'IN_PROGRESS');
    const pendingTasks = dashboardData.tasks
        ?.filter(t => t.status !== 'COMPLETED')
        .sort((a, b) => {
            if (activePhase) {
                if (a.phase === activePhase.id && b.phase !== activePhase.id) return -1;
                if (a.phase !== activePhase.id && b.phase === activePhase.id) return 1;
            }
            return new Date(a.due_date) - new Date(b.due_date);
        })
        .slice(0, 10); // Show top 10 relevant tasks

    const handleToggleTask = async (task) => {
        setUpdatingTaskId(task.id);
        try {
            const newStatus = task.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS';
            await updateTaskStatus(task.id, newStatus);
        } catch (error) {
            alert('Failed to update task status.');
        } finally {
            setUpdatingTaskId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-500">
                {/* Drag Handle */}
                <div className="w-full flex justify-center py-4">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                </div>

                <div className="px-6 pb-4">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Quick Task Update</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Pending tasks for your review</p>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-3">
                    {pendingTasks && pendingTasks.length > 0 ? (
                        pendingTasks.map((task) => (
                            <div
                                key={task.id}
                                className={`p-4 rounded-2xl border transition-all flex items-center justify-between group active:scale-[0.98] ${task.status === 'IN_PROGRESS'
                                        ? 'bg-indigo-50 border-indigo-100'
                                        : 'bg-white border-gray-100 shadow-sm'
                                    }`}
                                onClick={() => handleToggleTask(task)}
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="relative">
                                        {updatingTaskId === task.id ? (
                                            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                        ) : task.status === 'IN_PROGRESS' ? (
                                            <div className="w-6 h-6 rounded-full border-2 border-indigo-600 flex items-center justify-center">
                                                <div className="w-3 h-3 bg-indigo-600 rounded-full" />
                                            </div>
                                        ) : (
                                            <Circle className="w-6 h-6 text-gray-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`text-sm font-black truncate ${task.status === 'IN_PROGRESS' ? 'text-indigo-900' : 'text-gray-900'}`}>
                                            {task.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate max-w-[120px]">
                                                {task.phase_name || 'General Task'}
                                            </span>
                                            {task.due_date && (
                                                <>
                                                    <span className="text-gray-200 text-[10px]">•</span>
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500 uppercase tracking-tighter">
                                                        <Clock size={10} />
                                                        <span>{new Date(task.due_date).toLocaleDateString()}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className={`w-5 h-5 transition-colors ${task.status === 'IN_PROGRESS' ? 'text-indigo-400' : 'text-gray-300'}`} />
                            </div>
                        ))
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-4xl mb-4">🎉</div>
                            <h3 className="text-lg font-black text-gray-900">All caught up!</h3>
                            <p className="text-sm text-gray-400 mt-2">No pending tasks for the current phase.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 text-xs font-black text-gray-500 uppercase tracking-[0.2em] hover:text-gray-900 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskUpdateDrawer;
