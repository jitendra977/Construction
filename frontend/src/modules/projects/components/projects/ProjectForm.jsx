import React, { useState } from 'react';
import api from '../../services/projectsApi';
import { useProjects } from '../../context/ProjectsContext';

const FIELD = {
    background: 'var(--t-bg)', border: '1px solid var(--t-border)',
    borderRadius: 8, color: 'var(--t-text)', fontSize: 13, padding: '8px 12px',
    outline: 'none', width: '100%',
};

const EMPTY = {
    name: '', owner_name: '', address: '',
    total_budget: '', area_sqft: '',
    start_date: '', expected_completion_date: '',
};

export default function ProjectForm({ initial, onClose, onSaved }) {
    const { addProjectLocal, updateProjectLocal } = useProjects();
    const isEdit = !!initial?.id;
    const [form, setForm] = useState(initial ? {
        name:                     initial.name || '',
        owner_name:               initial.owner_name || '',
        address:                  initial.address || '',
        total_budget:             initial.total_budget || '',
        area_sqft:                initial.area_sqft || '',
        start_date:               initial.start_date || '',
        expected_completion_date: initial.expected_completion_date || '',
    } : EMPTY);
    const [saving, setSaving] = useState(false);
    const [err, setErr]       = useState('');

    const change = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setErr('Project name is required.'); return; }
        setSaving(true); setErr('');
        try {
            const payload = {
                ...form,
                total_budget: +form.total_budget || 0,
                area_sqft:    +form.area_sqft    || null,
            };
            if (isEdit) {
                const res = await api.updateProject(initial.id, payload);
                updateProjectLocal(res.data);
                onSaved?.(res.data);
            } else {
                const res = await api.createProject(payload);
                addProjectLocal(res.data);
                onSaved?.(res.data);
            }
            onClose();
        } catch (e) {
            setErr(e.response?.data?.detail || 'Save failed. Check all fields.');
        } finally {
            setSaving(false);
        }
    };

    const Label = ({ children }) => (
        <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--t-text3)' }}>
            {children}
        </p>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', maxHeight: '90vh', overflowY: 'auto' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: '1px solid var(--t-border)' }}>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🏗️</span>
                        <h2 className="font-black text-lg" style={{ color: 'var(--t-text)' }}>
                            {isEdit ? 'Edit Project' : 'New Project'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-2xl opacity-40 hover:opacity-80">×</button>
                </div>

                <form onSubmit={submit} className="px-6 py-5 space-y-4">
                    {err && (
                        <div className="rounded-lg px-4 py-2.5 text-sm font-semibold"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                            ⚠️ {err}
                        </div>
                    )}

                    {/* Project name */}
                    <div>
                        <Label>Project Name *</Label>
                        <input value={form.name} onChange={e => change('name', e.target.value)}
                            style={FIELD} placeholder="e.g. Khadka Family Home, काठमाडौं घर" />
                    </div>

                    {/* Owner + address */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Owner Name</Label>
                            <input value={form.owner_name} onChange={e => change('owner_name', e.target.value)}
                                style={FIELD} placeholder="Owner's full name" />
                        </div>
                        <div>
                            <Label>Build Area (ft²)</Label>
                            <input type="number" min="0" value={form.area_sqft}
                                onChange={e => change('area_sqft', e.target.value)}
                                style={FIELD} placeholder="e.g. 1800" />
                        </div>
                    </div>

                    <div>
                        <Label>Address / ठेगाना</Label>
                        <textarea rows={2} value={form.address} onChange={e => change('address', e.target.value)}
                            style={{ ...FIELD, resize: 'vertical' }} placeholder="Ward, municipality, district" />
                    </div>

                    {/* Budget */}
                    <div>
                        <Label>Total Budget (NPR)</Label>
                        <input type="number" min="0" value={form.total_budget}
                            onChange={e => change('total_budget', e.target.value)}
                            style={FIELD} placeholder="e.g. 5000000" />
                    </div>

                    {/* Timeline */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Start Date</Label>
                            <input type="date" value={form.start_date}
                                onChange={e => change('start_date', e.target.value)} style={FIELD} />
                        </div>
                        <div>
                            <Label>Expected Completion</Label>
                            <input type="date" value={form.expected_completion_date}
                                onChange={e => change('expected_completion_date', e.target.value)} style={FIELD} />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                            style={{ background: 'var(--t-bg)', color: 'var(--t-text3)', border: '1px solid var(--t-border)' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                            style={{ background: saving ? '#9ca3af' : '#f97316' }}>
                            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
