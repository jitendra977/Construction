import React, { useState, useEffect } from 'react';
import { X, User, Mail, Lock, Phone, Shield, UserPlus } from 'lucide-react';
import Modal from './Modal';
import { accountsService } from '../../services/api';

const UserCreateModal = ({ isOpen, onClose, onUserCreated }) => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone_number: '',
        role_id: ''
    });

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await accountsService.getRoles();
                setRoles(res.data);
            } catch (err) {
                console.error("Failed to fetch roles", err);
            }
        };
        if (isOpen) fetchRoles();
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await accountsService.createUser(formData);
            onUserCreated();
            onClose();
            // Reset form
            setFormData({
                username: '',
                email: '',
                password: '',
                first_name: '',
                last_name: '',
                phone_number: '',
                role_id: ''
            });
        } catch (err) {
            console.error("Failed to create user", err);
            alert("Failed to create user. Please check if username/email is unique.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New System User">
            <form onSubmit={handleSubmit} className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                name="username"
                                type="text"
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                                placeholder="johndoe"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">First Name</label>
                        <input
                            name="first_name"
                            type="text"
                            value={formData.first_name}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                            placeholder="John"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
                        <input
                            name="last_name"
                            type="text"
                            value={formData.last_name}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                            placeholder="Doe"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                name="phone_number"
                                type="text"
                                value={formData.phone_number}
                                onChange={handleChange}
                                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                                placeholder="+977"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">System Role</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <select
                                name="role_id"
                                value={formData.role_id}
                                onChange={handleChange}
                                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all appearance-none bg-white"
                                required
                            >
                                <option value="">Select Role</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] px-4 py-3 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <UserPlus size={18} />
                        {loading ? 'Creating...' : 'Create User'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default UserCreateModal;
