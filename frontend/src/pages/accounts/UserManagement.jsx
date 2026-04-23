import React, { useState, useEffect } from 'react';
import {
    Users, UserPlus, Shield, Trash2, Edit2, Save, X,
    Check, AlertCircle, RefreshCw, Mail, Phone
} from 'lucide-react';
import { accountsService } from '../../services/api';
import UserCreateModal from '../../components/common/UserCreateModal';
import UserEditModal from '../../components/common/UserEditModal';
import ConfirmModal from '../../components/common/ConfirmModal';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isDeleting, setIsDeleting] = useState(null);

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    const stats = {
        total: users.length,
        active: users.filter(u => u.is_active).length,
    };

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
        setEditingUser(user);
        setShowEditModal(true);
    };

    const handleUserSave = () => {
        fetchData();
    };

    const handleDeleteUser = (userId) => {
        showConfirm({
            title: "Delete User Account?",
            message: "This action will permanently remove this user from the system and terminate their access to the construction dashboard. This cannot be undone.",
            confirmText: "Yes, Delete User",
            type: "danger",
            onConfirm: async () => {
                setIsDeleting(userId);
                try {
                    await accountsService.deleteUser(userId);
                    fetchData();
                    closeConfirm();
                } catch (err) {
                    console.error('Failed to delete user', err);
                    alert('Failed to delete user.');
                    closeConfirm();
                } finally {
                    setIsDeleting(null);
                }
            }
        });
    };

    const getRoleBadgeStyle = (roleCode) => {
        switch (roleCode) {
            case 'SUPER_ADMIN': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
            case 'HOME_OWNER': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
            case 'LEAD_ENGINEER': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'CONTRACTOR': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
            default: return 'bg-[var(--t-surface3)] text-[var(--t-text3)] border-[var(--t-border)]';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-[var(--t-bg)]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-[var(--t-text)] tracking-tight">Access Control</h1>
                    <p className="text-[var(--t-text2)] mt-1 font-medium">Manage team members and project permissions.</p>
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
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg hover:opacity-90 transition-all flex items-center gap-2"
                    >
                        <UserPlus size={18} />
                        Add User
                    </button>
                </div>
            </div>

            {/* Modals */}
            <UserCreateModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onUserCreated={handleUserSave}
            />
            {editingUser && (
                <UserEditModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingUser(null);
                    }}
                    user={editingUser}
                    onUserUpdated={handleUserSave}
                />
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700">
                    <AlertCircle size={20} />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Users', value: stats.total, color: 'indigo-500' },
                    { label: 'Active Sessions', value: stats.active, color: 'emerald-500' },
                    { label: 'Pending Invitations', value: '1', color: 'orange-500' },
                    { label: 'Security Level', value: 'High', color: 'purple-500' }
                ].map((s, i) => (
                    <div key={i} className="bg-[var(--t-surface)] p-5 rounded-2xl border border-[var(--t-border)] shadow-sm">
                        <div className="text-[var(--t-text3)] text-[10px] font-black uppercase tracking-widest">{s.label}</div>
                        <div className="text-2xl font-black mt-1 text-[var(--t-text)]">{s.value}</div>
                    </div>
                ))}
            </div>

            {/* User Table Card */}
            <div className="bg-[var(--t-surface)] rounded-3xl shadow-sm border border-[var(--t-border)] overflow-hidden">
                {loading && !users.length ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <p className="font-medium">Loading users...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                    <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">User Details</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">Role & Permissions</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">Projects</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">Joined Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest text-right">Settings</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--t-border)]">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-[var(--t-surface2)]/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                {user.profile_image ? (
                                                    <img
                                                        src={user.profile_image}
                                                        alt={user.username}
                                                        className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--t-primary)]/20"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-[var(--t-primary)]/10 flex items-center justify-center text-[var(--t-primary)] font-black text-xs ring-2 ring-[var(--t-primary)]/20">
                                                        {user.first_name?.[0] || user.username?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-sm font-black text-[var(--t-text)]">{user.first_name ? `${user.first_name} ${user.last_name}` : user.username}</div>
                                                    <div className="text-[10px] font-medium text-[var(--t-text3)]">{user.email || 'no-email@project.com'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border shadow-sm ${getRoleBadgeStyle(user.role?.code)}`}>
                                                {user.role?.name || 'Unassigned'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            {user.is_system_admin ? (
                                                <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-500/10 px-2.5 py-1 rounded-lg">All Projects (Admin)</span>
                                            ) : user.assigned_projects_data && user.assigned_projects_data.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {user.assigned_projects_data.map(p => (
                                                        <span key={p.id} className="text-[10px] font-bold text-[var(--t-text2)] bg-[var(--t-surface2)] px-2 py-0.5 rounded-md border border-[var(--t-border)]">
                                                            {p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-red-500/80">No Access</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border shadow-sm ${user.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-[var(--t-text2)]">
                                            {new Date(user.date_joined).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditStart(user)}
                                                    className="p-2 text-[var(--t-text3)] hover:text-[var(--t-primary)] hover:bg-[var(--t-primary)]/10 rounded-lg transition-all"
                                                    title="Edit User"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    disabled={isDeleting === user.id || user.is_system_admin}
                                                    className="p-2 text-[var(--t-text3)] hover:text-[var(--t-danger)] hover:bg-[var(--t-danger)]/10 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                                                    title={user.is_system_admin ? "Cannot delete system admin" : "Delete User"}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
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

            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                onConfirm={confirmConfig.onConfirm}
                onCancel={closeConfirm}
                type={confirmConfig.type || 'warning'}
            />
        </div>
    );
};

export default UserManagement;
