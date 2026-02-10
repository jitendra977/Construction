function QuickActions() {
    const actions = [
        { title: 'New Project', icon: '➕', color: 'from-purple-500 to-indigo-500' },
        { title: 'Add Worker', icon: '👷', color: 'from-blue-500 to-cyan-500' },
        { title: 'Order Materials', icon: '📦', color: 'from-green-500 to-emerald-500' },
        { title: 'View Reports', icon: '📊', color: 'from-orange-500 to-red-500' },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
                {actions.map((action, index) => (
                    <button
                        key={index}
                        className={`p-6 bg-gradient-to-br ${action.color} text-white rounded-xl hover:shadow-lg transform hover:-translate-y-1 transition-all`}
                    >
                        <div className="text-3xl mb-2">{action.icon}</div>
                        <div className="font-semibold">{action.title}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default QuickActions;
