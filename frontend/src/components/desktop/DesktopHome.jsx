import React, { useState } from 'react';
import Modal from '../common/Modal';
import { constructionService } from '../../services/api';

const DesktopHome = ({ dashboardData, stats, recentActivities, formatCurrency, onDataRefresh }) => {
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedPhase, setSelectedPhase] = useState(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [loading, setLoading] = useState(false);

    const handleStatusChange = async (phaseId, newStatus) => {
        try {
            await constructionService.updatePhase(phaseId, { status: newStatus });
            onDataRefresh(); // Refresh parent data
        } catch (error) {
            console.error("Failed to update phase status", error);
            alert("Failed to update phase status");
        }
    };

    const handleTaskToggle = async (task) => {
        try {
            const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
            await constructionService.updateTask(task.id, { status: newStatus });
            onDataRefresh();
        } catch (error) {
            console.error("Failed to update task", error);
        }
    };

    const openAddTaskModal = (phase) => {
        setSelectedPhase(phase);
        setNewTaskTitle('');
        setIsTaskModalOpen(true);
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !selectedPhase) return;

        setLoading(true);
        try {
            await constructionService.createTask({
                title: newTaskTitle,
                phase: selectedPhase.id,
                status: 'PENDING',
                priority: 'MEDIUM',
                // Assuming defaults for other fields or backend handles them
            });
            setIsTaskModalOpen(false);
            onDataRefresh();
        } catch (error) {
            console.error("Failed to create task", error);
            alert("Failed to create task");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        try {
            await constructionService.deleteTask(taskId);
            onDataRefresh();
        } catch (error) {
            console.error("Failed to delete task", error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
                                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                                <div className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${stat.trend === 'up' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                                    <span>{stat.change}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-indigo-50 rounded-xl text-2xl text-indigo-600">
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Construction Journey */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Construction Journey</h2>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Manage Mode Active</span>
                        </div>
                        <div className="space-y-6">
                            {dashboardData.phases.map((phase) => {
                                const phaseTasks = dashboardData.tasks.filter(t => t.phase === phase.id);
                                const isCompleted = phase.status === 'COMPLETED';
                                const isInProgress = phase.status === 'IN_PROGRESS';

                                return (
                                    <div key={phase.id} className={`p-4 rounded-xl border transition-all ${isInProgress ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-200'}`}>
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${isCompleted ? 'bg-green-100 text-green-600' :
                                                        isInProgress ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                                                    }`}>
                                                    {phase.order}
                                                </div>
                                                <div>
                                                    <h3 className={`font-semibold text-lg ${isInProgress ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                        {phase.name}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">{phase.description}</p>
                                                </div>
                                            </div>

                                            {/* Phase Status Control */}
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={phase.status}
                                                    onChange={(e) => handleStatusChange(phase.id, e.target.value)}
                                                    className="text-xs font-semibold uppercase tracking-wide border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white py-1 px-2 shadow-sm"
                                                >
                                                    <option value="NOT_STARTED">Not Started</option>
                                                    <option value="IN_PROGRESS">In Progress</option>
                                                    <option value="COMPLETED">Completed</option>
                                                </select>
                                                <button
                                                    onClick={() => openAddTaskModal(phase)}
                                                    title="Add Task"
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-600 transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        {/* Tasks Grid */}
                                        {phaseTasks.length > 0 ? (
                                            <div className="ml-14 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {phaseTasks.map(task => (
                                                    <div
                                                        key={task.id}
                                                        className={`group flex items-center justify-between gap-3 p-3 rounded-lg border transition-all ${task.status === 'COMPLETED'
                                                                ? 'bg-gray-50 border-gray-100 opacity-75'
                                                                : 'bg-white border-gray-200 hover:border-indigo-300 shadow-sm'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={task.status === 'COMPLETED'}
                                                                onChange={() => handleTaskToggle(task)}
                                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                            <span className={`text-sm truncate ${task.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                                                {task.title}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteTask(task.id)}
                                                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="ml-14 text-sm text-gray-400 italic">No tasks yet. Click + to add one.</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Recent Activity & Quick Actions */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { title: 'Add Expense', icon: '💸', color: 'from-red-500 to-pink-600' },
                                { title: 'Schedule', icon: '📅', color: 'from-blue-500 to-cyan-600' },
                                { title: 'Materials', icon: '📦', color: 'from-green-500 to-emerald-600' },
                                { title: 'Updates', icon: '📝', color: 'from-purple-500 to-indigo-600' },
                            ].map((action, index) => (
                                <button
                                    key={index}
                                    className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-white hover:shadow-lg transition-all transform hover:-translate-y-0.5 text-left`}
                                >
                                    <div className="text-2xl mb-1">{action.icon}</div>
                                    <div className="font-medium text-sm">{action.title}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
                        <div className="space-y-4">
                            {recentActivities.map((activity) => (
                                <div key={activity.id} className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                                        {activity.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Task Modal */}
            <Modal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                title={`Add Task to ${selectedPhase?.name}`}
            >
                <form onSubmit={handleAddTask} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="e.g. Pour foundation concrete"
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsTaskModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !newTaskTitle.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add Task'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default DesktopHome;
