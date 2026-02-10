function ProjectCard({ name, progress, status, deadline, budget }) {
    const statusColors = {
        'On Track': 'bg-blue-100 text-blue-700',
        'At Risk': 'bg-yellow-100 text-yellow-700',
        'Ahead': 'bg-green-100 text-green-700',
        'Delayed': 'bg-red-100 text-red-700',
    };

    const progressColor = progress >= 75 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-yellow-500';

    return (
        <div className="border border-gray-200 rounded-xl p-5 hover:border-purple-300 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{name}</h3>
                    <p className="text-sm text-gray-600 mt-1">Budget: {budget}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
                    {status}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold text-gray-900">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className={`${progressColor} h-2.5 rounded-full transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            {/* Deadline */}
            <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2">📅</span>
                <span>Deadline: {new Date(deadline).toLocaleDateString()}</span>
            </div>
        </div>
    );
}

export default ProjectCard;
