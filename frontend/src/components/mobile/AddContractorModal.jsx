import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { dashboardService, accountsService } from '../../services/api';
import Modal from '../common/Modal';

const AddContractorModal = ({ isOpen, onClose }) => {
    const { refreshData } = useConstruction();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        role: 'LABOUR',
        phone: '',
        user: null,
        email: '',
        skills: '',
        rate: '',
        citizenship_number: '',
        is_active: true
    });
    const [systemUsers, setSystemUsers] = useState([]);

    React.useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await accountsService.getUsers();
                setSystemUsers(res.data);
            } catch (error) {
                console.error("Failed to fetch users", error);
            }
        };
        if (isOpen) fetchUsers();
    }, [isOpen]);

    const handleUserChange = (userId) => {
        const selectedUser = systemUsers.find(u => u.id === parseInt(userId));
        if (selectedUser) {
            const fullName = `${selectedUser.first_name} ${selectedUser.last_name}`.trim() || selectedUser.username;
            setFormData({
                ...formData,
                user: selectedUser.id,
                name: fullName,
                email: selectedUser.email,
                phone: selectedUser.phone_number || ''
            });
        } else {
            setFormData({
                ...formData,
                user: null
            });
        }
    };

    const roles = [
        { id: 'THEKEDAAR', label: 'Thekedaar' },
        { id: 'ENGINEER', label: 'Civil Engineer' },
        { id: 'MISTRI', label: 'Mistri/Mason' },
        { id: 'LABOUR', label: 'Labour/Helper' },
        { id: 'ELECTRICIAN', label: 'Electrician' },
        { id: 'PLUMBER', label: 'Plumber' },
        { id: 'CARPENTER', label: 'Carpenter' },
        { id: 'PAINTER', label: 'Painter' },
        { id: 'TILE_MISTRI', label: 'Tile/Marble' },
        { id: 'WELDER', label: 'Welder' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await dashboardService.createContractor(formData);
            refreshData();
            onClose();
            // Reset form
            setFormData({
                name: '',
                role: 'LABOUR',
                phone: '',
                email: '',
                skills: '',
                rate: '',
                citizenship_number: '',
                is_active: true
            });
        } catch (error) {
            alert('Failed to save contractor. Please check your inputs.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Contractor">
            <form onSubmit={handleSubmit} className="space-y-5 p-1">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Link System User Account (Optional)</label>
                        <div className="relative">
                            <select
                                value={formData.user || ''}
                                onChange={(e) => handleUserChange(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 appearance-none transition-all"
                            >
                                <option value="">-- No Linked Account --</option>
                                {systemUsers.filter(u => u.role?.code === 'CONTRACTOR').map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.first_name} {u.last_name} ({u.email})
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                            Contractor Full Name {formData.user && <span className="text-[10px] text-blue-500 font-black ml-1">(Synced)</span>}
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={`w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-black text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all ${formData.user ? 'opacity-50 cursor-not-allowed' : ''}`}
                            placeholder="e.g. Ramesh Thapa"
                            required
                            disabled={!!formData.user}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Trade / Role</label>
                            <div className="relative">
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 appearance-none transition-all"
                                >
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.label}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                Phone {formData.user && <span className="text-[10px] text-blue-500 font-black ml-1">(Synced)</span>}
                            </label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className={`w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all font-mono ${formData.user ? 'opacity-50 cursor-not-allowed' : ''}`}
                                placeholder="+977"
                                required
                                disabled={!!formData.user}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Daily Rate (Optional)</label>
                            <input
                                type="number"
                                value={formData.rate}
                                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="Rs. 0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Citizenship No.</label>
                            <input
                                type="text"
                                value={formData.citizenship_number}
                                onChange={(e) => setFormData({ ...formData, citizenship_number: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                placeholder="ID Number"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Primary Skills / Specialization</label>
                        <input
                            type="text"
                            value={formData.skills}
                            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                            className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="e.g. RCC, Brickwork, Plaster"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                            Email (Optional) {formData.user && <span className="text-[10px] text-blue-500 font-black ml-1">(Synced)</span>}
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all ${formData.user ? 'opacity-50 cursor-not-allowed' : ''}`}
                            placeholder="contractor@email.com"
                            disabled={!!formData.user}
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 text-xs font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Adding...' : 'Add Contractor'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddContractorModal;
