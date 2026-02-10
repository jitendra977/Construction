import { useConstruction } from '../../context/ConstructionContext';

const DesktopRooms = () => {
    const { dashboardData, refreshData } = useConstruction();
    const { rooms, floors = [] } = dashboardData;
    const [updating, setUpdating] = useState(null);

    const handleStatusChange = async (roomId, newStatus) => {
        setUpdating(roomId);
        try {
            await dashboardService.updateRoom(roomId, { status: newStatus });
            refreshData();
        } catch (error) {
            console.error("Failed to update room status", error);
            alert("Failed to update room status");
        } finally {
            setUpdating(null);
        }
    };

    const renderRoomCard = (room) => (
        <div key={room.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">{room.name}</h3>
                </div>
                <select
                    value={room.status}
                    onChange={(e) => handleStatusChange(room.id, e.target.value)}
                    disabled={updating === room.id}
                    className={`text-xs font-bold rounded-full py-1 px-2 border-none ring-1 ring-inset focus:ring-2 cursor-pointer ${room.status === 'COMPLETED' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                        room.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 ring-blue-700/10' :
                            'bg-gray-50 text-gray-600 ring-gray-500/10'
                        }`}
                >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                </select>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium text-gray-600">
                    <span>Completion</span>
                    <span>{room.status === 'COMPLETED' ? '100%' : room.status === 'IN_PROGRESS' ? '50%' : '0%'}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all duration-500 ${room.status === 'COMPLETED' ? 'bg-green-500' :
                            room.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                        style={{ width: room.status === 'COMPLETED' ? '100%' : room.status === 'IN_PROGRESS' ? '50%' : '0%' }}
                    ></div>
                </div>
            </div>

            <div className="mt-6 flex justify-between items-center border-t border-gray-50 pt-4">
                <span className="text-xs text-gray-400">
                    {updating === room.id ? 'Updating...' : 'Last updated recently'}
                </span>
                <button className="text-sm text-indigo-600 font-medium hover:text-indigo-800">
                    View Details →
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Room Management</h2>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                    + Add New Room
                </button>
            </div>

            {floors && floors.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-100">
                    <div className="text-5xl mb-4">🚪</div>
                    <h3 className="text-lg font-bold text-gray-900">No Floor Data Found</h3>
                    <p className="text-gray-500 max-w-xs mx-auto mt-2">
                        We couldn't find any floor records. Please ensure the database is seeded or add a new floor.
                    </p>
                    <button
                        onClick={() => refreshData()}
                        className="mt-6 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                        Try Refreshing View ↻
                    </button>
                </div>
            ) : (
                floors.map((floor) => (
                    <div key={floor.id} className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                            <h3 className="text-lg font-bold text-gray-800">{floor.name}</h3>
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                {floor.rooms ? floor.rooms.length : 0} Rooms
                            </span>
                        </div>

                        {floor.rooms && floor.rooms.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {floor.rooms.map(room => renderRoomCard(room))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">No rooms assigned to this floor yet.</p>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default DesktopRooms;
