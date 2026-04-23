import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Phone, Shield, UserPlus } from 'lucide-react';
import Modal from './Modal';
import { accountsService, dashboardService } from '../../services/api';

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
        role_id: '',
        assigned_project_ids: []
    });

    const [projects, setProjects] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rolesRes, projectsRes] = await Promise.all([
                    accountsService.getRoles(),
                    dashboardService.getProjects().catch(() => ({data: []}))
                ]);
                setRoles(rolesRes.data);
                setProjects(projectsRes.data);
            } catch (err) {
                console.error("Failed to fetch roles", err);
            }
        };
        if (isOpen) fetchData();
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        if (type === 'select-multiple') {
            const values = Array.from(e.target.selectedOptions, option => option.value);
            setFormData(prev => ({ ...prev, [name]: values }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
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
                role_id: '',
                assigned_project_ids: []
            });
        } catch (err) {
            console.error("Failed to create user", err);
            alert("Failed to create user. Please check if username/email is unique.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New System User" maxWidth="max-w-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest ml-1">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text3)]" size={16} />
                            <input
                                name="username"
                                type="text"
                                required
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full pl-10 pr-3 py-2.5 bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--t-primary)]/20 focus:border-[var(--t-primary)] outline-none transition-all placeholder:text-[var(--t-text3)]/50 text-[var(--t-text)]"
                                placeholder="johndoe"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text3)]" size={16} />
                            <input
                                name="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full pl-10 pr-3 py-2.5 bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--t-primary)]/20 focus:border-[var(--t-primary)] outline-none transition-all placeholder:text-[var(--t-text3)]/50 text-[var(--t-text)]"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text3)]" size={16} />
                        <input
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full pl-10 pr-3 py-2.5 bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--t-primary)]/20 focus:border-[var(--t-primary)] outline-none transition-all placeholder:text-[var(--t-text3)]/50 text-[var(--t-text)]"
                            placeholder="john@example.com"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest ml-1">First Name</label>
                        <input
                            name="first_name"
                            type="text"
                            value={formData.first_name}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--t-primary)]/20 focus:border-[var(--t-primary)] outline-none transition-all placeholder:text-[var(--t-text3)]/50 text-[var(--t-text)]"
                            placeholder="John"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest ml-1">Last Name</label>
                        <input
                            name="last_name"
                            type="text"
                            value={formData.last_name}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--t-primary)]/20 focus:border-[var(--t-primary)] outline-none transition-all placeholder:text-[var(--t-text3)]/50 text-[var(--t-text)]"
                            placeholder="Doe"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest ml-1">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text3)]" size={16} />
                            <input
                                name="phone_number"
                                type="text"
                                value={formData.phone_number}
                                onChange={handleChange}
                                className="w-full pl-10 pr-3 py-2.5 bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--t-primary)]/20 focus:border-[var(--t-primary)] outline-none transition-all placeholder:text-[var(--t-text3)]/50 text-[var(--t-text)]"
                                placeholder="+977"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest ml-1">Role</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text3)]" size={16} />
                            <select
                                name="role_id"
                                value={formData.role_id}
                                onChange={handleChange}
                                className="w-full pl-10 pr-3 py-2.5 bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--t-primary)]/20 focus:border-[var(--t-primary)] outline-none transition-all text-[var(--t-text)] appearance-none"
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

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest ml-1">Assigned Projects</label>
                    <div className="relative">
                        <select
                            name="assigned_project_ids"
                            multiple
                            value={formData.assigned_project_ids}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--t-primary)]/20 focus:border-[var(--t-primary)] outline-none transition-all text-[var(--t-text)] min-h-[100px]"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <p className="text-[10px] text-[var(--t-text3)] ml-1">Hold Ctrl/Cmd to select multiple. Leave empty if user should have no project access.</p>
                </div>

                <div className="pt-4 flex gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--t-text2)] hover:text-[var(--t-text)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] px-8 py-3 bg-[var(--t-primary)] text-[var(--t-bg)] rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-[var(--t-primary)]/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <UserPlus size={18} />
                        {loading ? 'Processing...' : 'Grant Access'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default UserCreateModal;
