import { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { constructionService } from '../../services/api';
import Modal from '../common/Modal';

const RoomsTab = () => {
    const { dashboardData, refreshData } = useConstruction();
    const { rooms, floors = [] } = dashboardData;
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [roomFormData, setRoomFormData] = useState({});
    const [savingRoom, setSavingRoom] = useState(false);

    const handleOpenRoomModal = () => {
        setRoomFormData({ floor: floors[0]?.id, status: 'NOT_STARTED' });
        setIsRoomModalOpen(true);
    };

    const handleRoomSubmit = async (e) => {
        e.preventDefault();
        setSavingRoom(true);
        try {
            await constructionService.createRoom(roomFormData);
            setIsRoomModalOpen(false);
            refreshData();
        } catch (error) {
            console.error("Failed to create room", error);
            alert("Failed to create room");
        } finally {
            setSavingRoom(false);
        }
    };
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-gray-800">My Rooms</h2>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                    {rooms.length} Total
                </span>
            </div>

            {floors && floors.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border-2 border-dashed border-gray-100 p-6">
                    <div className="text-4xl mb-3">🏠</div>
                    <h3 className="font-bold text-gray-900">No Floors Found</h3>
                    <p className="text-sm text-gray-500 mt-1">We couldn't load any floor data. Try refreshing below.</p>
                    <button
                        onClick={() => refreshData()}
                        className="mt-4 text-indigo-600 text-sm font-bold"
                    >
                        Refresh Data ↻
                    </button>
                </div>
            ) : (
                floors.map((floor) => (
                    <div key={floor.id} className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-1">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{floor.name}</h3>
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                {floor.rooms?.length || 0}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {floor.rooms && floor.rooms.length > 0 ? (
                                floor.rooms.map((room) => (
                                    <div key={room.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg">{room.name}</h3>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${room.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                room.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {room.status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs text-gray-600 font-medium">
                                                <span>Completion</span>
                                                <span>{room.status === 'COMPLETED' ? '100%' : room.status === 'IN_PROGRESS' ? '50%' : '0%'}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${room.status === 'COMPLETED' ? 'bg-green-500' :
                                                        room.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-gray-300'
                                                        }`}
                                                    style={{ width: room.status === 'COMPLETED' ? '100%' : room.status === 'IN_PROGRESS' ? '50%' : '0%' }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-gray-400 italic py-2">No rooms on this floor</p>
                            )}
                        </div>
                    </div>
                ))
            )}

            <button
                onClick={handleOpenRoomModal}
                className="w-full py-4 bg-white text-indigo-600 rounded-xl border-2 border-dashed border-indigo-100 font-bold hover:bg-indigo-50 transition-colors shadow-sm"
            >
                + Add New Room
            </button>

            {/* Room Modal */}
            <Modal
                isOpen={isRoomModalOpen}
                onClose={() => setIsRoomModalOpen(false)}
                title="Add New Room"
            >
                <form onSubmit={handleRoomSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                        <input
                            type="text"
                            value={roomFormData.name || ''}
                            onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Master Bedroom"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                        <select
                            value={roomFormData.floor || ''}
                            onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        >
                            <option value="">Select Floor</option>
                            {floors.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Area (sqft)</label>
                            <input
                                type="number"
                                value={roomFormData.area_sqft || ''}
                                onChange={(e) => setRoomFormData({ ...roomFormData, area_sqft: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Budget Allocation</label>
                            <input
                                type="number"
                                value={roomFormData.budget_allocation || ''}
                                onChange={(e) => setRoomFormData({ ...roomFormData, budget_allocation: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={savingRoom}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50"
                    >
                        {savingRoom ? 'Creating...' : 'Create Room'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default RoomsTab;
