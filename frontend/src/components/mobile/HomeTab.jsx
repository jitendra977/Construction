import React from 'react';

const HomeTab = ({ dashboardData, stats, recentUpdates, formatCurrency }) => {
    return (
        <div className="space-y-6">
            {/* Stats Cards - Horizontal Scroll */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className={`flex-shrink-0 w-32 bg-gradient-to-br ${stat.color} rounded-2xl p-4 shadow-md`}
                    >
                        <div className="text-3xl mb-2">{stat.icon}</div>
                        <div className="text-2xl font-bold truncate">{stat.value}</div>
                        <div className="text-xs text-white/80">{stat.title}</div>
                    </div>
                ))}
            </div>

            {/* Construction Phases (Step-by-Step) */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Construction Journey</h2>
                </div>
                <div className="space-y-4">
                    {dashboardData.phases.map((phase) => {
                        const phaseTasks = dashboardData.tasks.filter(t => t.phase === phase.id);
                        const isCompleted = phase.status === 'COMPLETED';
                        const isInProgress = phase.status === 'IN_PROGRESS';

                        return (
                            <div key={phase.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isCompleted ? 'bg-green-100 text-green-600' :
                                            isInProgress ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                                            }`}>
                                            {phase.order}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 leading-tight">{phase.name}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{phase.description}</p>
                                        </div>
                                    </div>
                                    {isCompleted && <span className="text-green-500 text-xl">✓</span>}
                                </div>

                                {/* Tasks for this phase */}
                                {phaseTasks.length > 0 && (isInProgress || isCompleted) && (
                                    <div className="mt-3 ml-11 space-y-2 border-l-2 border-gray-100 pl-3">
                                        {phaseTasks.map(task => (
                                            <div key={task.id} className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${task.status === 'COMPLETED' ? 'bg-green-400' :
                                                    task.status === 'IN_PROGRESS' ? 'bg-blue-400 animate-pulse' : 'bg-gray-300'
                                                    }`} />
                                                <span className={`text-sm ${task.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                                    {task.title}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Recent Updates */}
            <section>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Updates</h2>
                <div className="space-y-3">
                    {recentUpdates.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center">No recent updates.</p>
                    ) : (
                        recentUpdates.map((update) => (
                            <div key={update.id} className="bg-white rounded-xl p-4 shadow-sm flex gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    <span className="text-lg">{update.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 text-sm">{update.title}</h3>
                                    <p className="text-xs text-gray-500 mt-1">{update.time}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Quick Actions */}
            <section>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { title: 'Add Expense', icon: '💸', color: 'from-red-500 to-pink-500' },
                        { title: 'Schedule', icon: '📅', color: 'from-blue-500 to-cyan-500' },
                        { title: 'Materials', icon: '📦', color: 'from-green-500 to-emerald-500' },
                        { title: 'Photos', icon: '📸', color: 'from-purple-500 to-indigo-500' },
                    ].map((action, index) => (
                        <button
                            key={index}
                            className={`bg-gradient-to-br ${action.color} text-white rounded-xl p-4 shadow-md active:scale-95 transition-transform`}
                        >
                            <div className="text-3xl mb-2">{action.icon}</div>
                            <div className="font-semibold text-sm">{action.title}</div>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default HomeTab;
