import React, { useState, useEffect } from 'react';
import {
    Users, UserPlus, Shield, Trash2, Edit2, Save, X,
    Check, AlertCircle, RefreshCw, Mail, Phone
} from 'lucide-react';
import { accountsService } from '../../services/api';
import UserCreateModal from '../../components/common/UserCreateModal';
import UserEditModal from '../../components/common/UserEditModal';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isDeleting, setIsDeleting] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersRes, rolesRes] = await Promise.all([
                accountsService.getUsers(),
                accountsService.getRoles()
            ]);
            setUsers(usersRes.data);
            setRoles(rolesRes.data);
        } catch (err) {
            console.error('Failed to fetch user management data', err);
            setError('Failed to load user data. You may not have administrative permissions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEditStart = (user) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const handleUserSave = () => {
        fetchData();
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        setIsDeleting(userId);
        try {
            await accountsService.deleteUser(userId);
            fetchData();
        } catch (err) {
            console.error('Failed to delete user', err);
            alert('Failed to delete user.');
        } finally {
            setIsDeleting(null);
        }
    };

    const getRoleBadgeColor = (roleCode) => {
        switch (roleCode) {
            case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'HOME_OWNER': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'LEAD_ENGINEER': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CONTRACTOR': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Users className="text-indigo-600" size={28} />
                        User Management
                    </h1>
                    <p className="text-gray-500 mt-1">Manage system access, roles, and permissions for all team members.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        <UserPlus size={18} />
                        Add User
                    </button>
                </div>
            </div>

            {/* Modals */}
            <UserCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onUserCreated={handleUserSave}
            />
            {selectedUser && (
                <UserEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedUser(null);
                    }}
                    user={selectedUser}
                    onUserUpdated={handleUserSave}
                />
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700">
                    <AlertCircle size={20} />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {loading && !users.length ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <p className="font-medium">Loading users...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                                    <th className="p-4 pl-6">Member</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Role / Permissions</th>
                                    <th className="p-4 text-center">Admin</th>
                                    <th className="p-4 pr-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4 pl-6 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    {user.profile_image ? (
                                                        <img
                                                            src={user.profile_image}
                                                            alt={user.username}
                                                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm border-2 border-white shadow-sm">
                                                            {user.first_name?.[0] || user.username?.[0]?.toUpperCase()}
                                                        </div>
                                                    )}
                                                    {user.is_verified && (
                                                        <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                                                            <Check size={8} strokeWidth={4} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                                                    </p>
                                                    <p className="text-xs text-gray-500">@{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                    <Mail size={12} className="text-gray-400" />
                                                    {user.email}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                    <Phone size={12} className="text-gray-400" />
                                                    {user.phone_number || 'No phone'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border shadow-sm ${getRoleBadgeColor(user.role?.code)}`}>
                                                {user.role?.name || 'Unassigned'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {user.is_system_admin ? (
                                                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600" title="System Administrator">
                                                    <Shield size={16} strokeWidth={2.5} />
                                                </div>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 pr-6 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditStart(user)}
                                                    className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 rounded-lg transition-all"
                                                    title="Edit User"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    disabled={isDeleting === user.id || user.is_system_admin}
                                                    className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                                                    title={user.is_system_admin ? "Cannot delete system admin" : "Delete User"}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;
