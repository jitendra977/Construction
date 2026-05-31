/**
 * ProjectSettingsPage — edit project details, danger zone (delete).
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import api from '../services/projectsApi';
import { useProjects } from '../context/ProjectsContext';
import { usePlatformBase } from '../../../shared/utils/platformNav';
import structureApi from '../../structure/services/structureApi';
import { SQFT_TO_M2, totalBuildAreaSqft } from '../../structure/utils/area';
import { useConstruction } from '../../../context/ConstructionContext';

const FIELD = {
    background: 'var(--t-bg)', border: '1px solid var(--t-border)',
    borderRadius: 8, color: 'var(--t-text)', fontSize: 13, padding: '8px 12px',
    outline: 'none', width: '100%',
};

const Label = ({ children }) => (
    <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--t-text3)' }}>
        {children}
    </p>
);

export default function ProjectSettingsPage() {
    const { id }                         = useParams();
    const { project: ctxProject }        = useOutletContext() || {};
    const navigate                       = useNavigate();
    const base                           = usePlatformBase();
    const { updateProjectLocal, removeProjectLocal } = useProjects();
    const { dashboardData } = useConstruction();

    const [project, setProject] = useState(null);
    const [form, setForm]       = useState(null);
    const [floors, setFloors]   = useState([]);
    const [saving, setSaving]   = useState(false);
    const [flash, setFlash]     = useState(false);
    const [err, setErr]         = useState('');
    const [deleting, setDel]    = useState(false);

    useEffect(() => {
        if (ctxProject) {
            setProject(ctxProject);
                setForm({
                    name:                     ctxProject.name || '',
                    owner_name:               ctxProject.owner_name || '',
                    address:                  ctxProject.address || '',
                    start_date:               ctxProject.start_date || '',
                    expected_completion_date: ctxProject.expected_completion_date || '',
                });
        } else if (id) {
            api.getProject(id).then(r => {
                setProject(r.data);
                setForm({
                    name:                     r.data.name || '',
                    owner_name:               r.data.owner_name || '',
                    address:                  r.data.address || '',
                    start_date:               r.data.start_date || '',
                    expected_completion_date: r.data.expected_completion_date || '',
                });
            });
        }
    }, [id, ctxProject]);

    const autoTotalBudget = useMemo(() => {
        const categories = dashboardData?.budgetCategories || [];
        return categories.reduce((sum, cat) => sum + Number(cat?.allocation || 0), 0);
    }, [dashboardData?.budgetCategories]);

    useEffect(() => {
        if (!id) return;
        structureApi.getFloors(id)
            .then(r => setFloors(Array.isArray(r.data) ? r.data : []))
            .catch(e => {
                console.error('Could not load floor build area', e);
                setFloors([]);
            });
    }, [id]);

    const change = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const save = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setErr('Project name is required.'); return; }
        setSaving(true); setErr('');
        try {
            const res = await api.updateProject(project.id, {
                ...form,
                total_budget: autoTotalBudget,
            });
            updateProjectLocal(res.data);
            setFlash(true);
            setTimeout(() => setFlash(false), 2000);
        } catch (e) {
            setErr(e.response?.data?.detail || 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Permanently delete "${project.name}"? This cannot be undone.`)) return;
        setDel(true);
        try {
            await api.deleteProject(project.id);
            removeProjectLocal(project.id);
            navigate(`${base}/projects`);
        } catch (e) { console.error(e); setDel(false); }
    };

    if (!form) return (
        <div className="flex items-center justify-center min-h-96">
            <div className="animate-pulse text-4xl">⚙️</div>
        </div>
    );

    const buildAreaSqft = totalBuildAreaSqft(floors);
    const buildAreaM2 = buildAreaSqft * SQFT_TO_M2;

    return (
        <div className="p-6">
            <h2 className="text-xl font-black mb-6" style={{ color: 'var(--t-text)' }}>
                ⚙️ Project Settings
            </h2>

            <form onSubmit={save} className="space-y-5">
                {err && (
                    <div className="rounded-lg px-4 py-2.5 text-sm font-semibold"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                        ⚠️ {err}
                    </div>
                )}

                <div className="rounded-2xl p-5 space-y-4"
                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>Basic Info</h3>

                    <div>
                        <Label>Project Name *</Label>
                        <input value={form.name} onChange={e => change('name', e.target.value)} style={FIELD} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Owner Name</Label>
                            <input value={form.owner_name} onChange={e => change('owner_name', e.target.value)} style={FIELD} />
                        </div>
                        <div>
                            <Label>Build Area (read only)</Label>
                            <div className="rounded-lg px-3 py-2 text-sm font-bold"
                                style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}>
                                {buildAreaSqft > 0 ? `${buildAreaSqft.toFixed(0)} ft²` : '—'}
                                <span className="ml-2 text-[10px] font-semibold" style={{ color: 'var(--t-text3)' }}>
                                    {buildAreaSqft > 0 ? `${buildAreaM2.toFixed(1)} m²` : 'Add floor plan dimensions'}
                                </span>
                            </div>
                            <p className="text-[10px] mt-1" style={{ color: 'var(--t-text3)' }}>
                                Calculated from Structure floors, not manually edited here.
                            </p>
                        </div>
                    </div>
                    <div>
                        <Label>Address</Label>
                        <textarea rows={2} value={form.address} onChange={e => change('address', e.target.value)}
                            style={{ ...FIELD, resize: 'vertical' }} />
                    </div>
                </div>

                <div className="rounded-2xl p-5 space-y-4"
                    style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>Budget & Timeline</h3>
                    <div>
                        <Label>Total Budget (NPR)</Label>
                        <input
                            type="number"
                            value={autoTotalBudget}
                            style={{ ...FIELD, background: 'var(--t-surface2)', cursor: 'not-allowed' }}
                            disabled
                            readOnly
                        />
                        <p className="text-[10px] mt-1" style={{ color: 'var(--t-text3)' }}>
                            Auto-calculated from Finance budget categories (Allocation total). Edit from Finance → Budget.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Start Date</Label>
                            <input type="date" value={form.start_date} onChange={e => change('start_date', e.target.value)} style={FIELD} />
                        </div>
                        <div>
                            <Label>Expected Completion</Label>
                            <input type="date" value={form.expected_completion_date}
                                onChange={e => change('expected_completion_date', e.target.value)} style={FIELD} />
                        </div>
                    </div>
                </div>

                <button type="submit" disabled={saving}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
                    style={{ background: flash ? '#10b981' : saving ? '#9ca3af' : '#f97316' }}>
                    {flash ? '✓ Changes Saved' : saving ? 'Saving…' : 'Save Changes'}
                </button>
            </form>

            {/* Danger zone */}
            <div className="mt-8 rounded-2xl p-5"
                style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
                <h3 className="text-sm font-bold mb-2" style={{ color: '#ef4444' }}>⚠️ Danger Zone</h3>
                <p className="text-xs mb-4" style={{ color: 'var(--t-text3)' }}>
                    Deleting a project is permanent. All floors, rooms, phases, and associated data will be removed.
                </p>
                <button onClick={handleDelete} disabled={deleting}
                    className="px-5 py-2 rounded-lg text-xs font-bold"
                    style={{ background: '#ef4444', color: '#fff' }}>
                    {deleting ? 'Deleting…' : '🗑 Delete Project'}
                </button>
            </div>
        </div>
    );
}
