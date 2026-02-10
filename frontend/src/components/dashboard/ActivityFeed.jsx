function ActivityFeed({ activities }) {
    const getActivityIcon = (type) => {
        const icons = {
            task: '✅',
            material: '📦',
            worker: '👷',
            budget: '💰',
        };
        return icons[type] || '📌';
    };

    const getActivityColor = (type) => {
        const colors = {
            task: 'bg-green-100 text-green-700',
            material: 'bg-blue-100 text-blue-700',
            worker: 'bg-purple-100 text-purple-700',
            budget: 'bg-yellow-100 text-yellow-700',
        };
        return colors[type] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Recent Activity</h2>
            <div className="space-y-4">
                {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center text-lg`}>
                            {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 font-medium">{activity.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">{activity.user}</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">{activity.time}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button className="w-full mt-6 py-2 text-purple-600 hover:bg-purple-50 rounded-lg font-semibold text-sm transition-colors">
                View All Activity
            </button>
        </div>
    );
}

export default ActivityFeed;
