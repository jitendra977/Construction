function StatsCard({ title, value, change, trend, icon }) {
    const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';
    const bgGradient = trend === 'up'
        ? 'from-green-50 to-emerald-50'
        : 'from-red-50 to-rose-50';

    return (
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${bgGradient}`}>
                        <span className={trendColor}>
                            {trend === 'up' ? '↑' : '↓'} {change}
                        </span>
                    </div>
                </div>
                <div className="text-4xl">{icon}</div>
            </div>
        </div>
    );
}

export default StatsCard;
