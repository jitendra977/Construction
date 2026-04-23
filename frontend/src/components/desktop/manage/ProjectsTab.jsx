import React, { useState, useEffect } from 'react';
import { useConstruction } from '../../../context/ConstructionContext';
import { dashboardService } from '../../../services/api';

const fmt = (v) => 'NPR ' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const ProjectsTab = () => {
    const { projects, refreshData, switchProject, activeProjectId } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: '',
        owner_name: '',
        address: '',
        total_budget: '',
        start_date: new Date().toISOString().split('T')[0],
        expected_completion_date: '',
        area_sqft: ''
    });

    const handleEdit = (p) => {
        setEditingProject(p);
        setForm({
            name: p.name,
            owner_name: p.owner_name,
            address: p.address,
            total_budget: p.total_budget,
            start_date: p.start_date,
            expected_completion_date: p.expected_completion_date,
            area_sqft: p.area_sqft
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingProject) {
                await dashboardService.updateProject(editingProject.id, form);
            } else {
                await dashboardService.createProject(form);
            }
            setIsModalOpen(false);
            refreshData();
        } catch (err) {
            alert('Failed to save project.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-wider text-[var(--t-text)]">Manage Projects / आयोजना व्यवस्थापन</h3>
                <button 
                    onClick={() => { setEditingProject(null); setForm({ name: '', owner_name: '', address: '', total_budget: '', start_date: new Date().toISOString().split('T')[0], expected_completion_date: '', area_sqft: '' }); setIsModalOpen(true); }}
                    className="bg-[var(--t-primary)] text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight shadow-md hover:opacity-90 transition-all"
                >
                    + Create New Project
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(p => (
                    <div 
                        key={p.id} 
                        className={`bg-[var(--t-surface)] border rounded-xl p-5 transition-all shadow-sm group relative ${activeProjectId == p.id ? 'border-[var(--t-primary)] ring-1 ring-[var(--t-primary)]/20' : 'border-[var(--t-border)]'}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="min-w-0">
                                <h4 className="font-black text-[var(--t-text)] truncate pr-8">{p.name}</h4>
                                <p className="text-[10px] font-bold text-[var(--t-text3)] uppercase mt-0.5">{p.owner_name}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(p)} className="text-[10px] font-bold text-blue-600 hover:underline">Edit</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 py-3 border-y border-[var(--t-border)] mb-4">
                            <div>
                                <p className="text-[9px] font-bold text-[var(--t-text3)] uppercase">Budget</p>
                                <p className="text-xs font-black text-[var(--t-text)]">{fmt(p.total_budget)}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-[var(--t-text3)] uppercase">Area</p>
                                <p className="text-xs font-black text-[var(--t-text)]">{p.area_sqft} sqft</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${activeProjectId == p.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                {activeProjectId == p.id ? 'Active' : 'Inactive'}
                            </span>
                            <button 
                                onClick={() => switchProject(p.id)}
                                className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all ${activeProjectId == p.id ? 'bg-emerald-600 text-white shadow-sm' : 'bg-[var(--t-bg)] text-[var(--t-text2)] hover:bg-[var(--t-surface2)]'}`}
                            >
                                {activeProjectId == p.id ? 'Switching...' : 'Select Project'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-[var(--t-surface)] w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--t-border)] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[var(--t-border)] flex justify-between items-center bg-[var(--t-surface2)]">
                            <h3 className="text-sm font-black text-[var(--t-text)] uppercase">{editingProject ? 'Edit Project' : 'New Project Construction'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[var(--t-text3)] hover:text-[var(--t-text)] text-lg font-bold">✕</button>
                        </div>
                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-wider">Project Name</label>
                                    <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--t-text)]" placeholder="e.g. Dream House Residency" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-wider">Owner Name</label>
                                    <input type="text" value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-2 text-sm font-bold text-[var(--t-text)]" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-wider">Area (Sq. Ft)</label>
                                    <input type="number" value={form.area_sqft} onChange={e => setForm({...form, area_sqft: e.target.value})} className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-2 text-sm font-bold text-[var(--t-text)]" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-wider">Total Budget (NPR)</label>
                                    <input type="number" value={form.total_budget} onChange={e => setForm({...form, total_budget: e.target.value})} className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-2 text-sm font-bold text-[var(--t-text)]" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-wider">Start Date</label>
                                    <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-2 text-sm font-bold text-[var(--t-text)]" required />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-wider">Site Address</label>
                                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--t-text)] h-20" required />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-xs font-black text-[var(--t-text3)] uppercase">Cancel</button>
                                <button type="submit" disabled={loading} className="bg-[var(--t-primary)] text-white px-10 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
                                    {loading ? 'Saving...' : (editingProject ? 'Update Project' : 'Create Project')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectsTab;
