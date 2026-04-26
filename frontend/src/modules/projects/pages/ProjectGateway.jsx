/**
 * ProjectGateway
 * ─────────────────────────────────────────────────────────────────────────────
 * Top-level entry screen. Shows all projects, lets user set active project,
 * or create a new one. Acts as the app's home / project picker.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects }      from '../context/ProjectsContext';
import { useConstruction }  from '../../../context/ConstructionContext';
import ProjectCard           from '../components/projects/ProjectCard';
import ProjectForm           from '../components/projects/ProjectForm';
import api                   from '../services/projectsApi';

export default function ProjectGateway() {
    const navigate     = useNavigate();
    const { projects: rawProjects, loading, error, removeProjectLocal } = useProjects();
    const projects     = Array.isArray(rawProjects) ? rawProjects : [];
    const { activeProjectId, switchProject }               = useConstruction();
    const [showForm, setShowForm]   = useState(false);
    const [search, setSearch]       = useState('');
    const [deleting, setDeleting]   = useState(null);

    const filtered = projects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.owner_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.address    || '').toLowerCase().includes(search.toLowerCase())
    );

    const activate = (project) => {
        switchProject(project.id);
    };

    const handleDelete = async (project, e) => {
        e.stopPropagation();
        if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
        setDeleting(project.id);
        try {
            await api.deleteProject(project.id);
            removeProjectLocal(project.id);
            if (activeProjectId === project.id) switchProject(null);
        } catch (err) { console.error(err); }
        finally { setDeleting(null); }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--t-bg)' }}>
            <div className="text-center">
                <div className="text-5xl mb-4 animate-pulse">🏗️</div>
                <p className="font-semibold" style={{ color: 'var(--t-text3)' }}>Loading projects…</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen px-6 py-8" style={{ background: 'var(--t-bg)' }}>
            {/* Hero header */}
            <div className="max-w-6xl mx-auto mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-black" style={{ color: 'var(--t-text)' }}>
                            🏗️ Project Manager
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--t-text3)' }}>
                            Select a project to work in, or create a new one.
                            {activeProjectId && (
                                <span className="ml-2 font-semibold" style={{ color: '#f97316' }}>
                                    ● Active: {projects.find(p => p.id === activeProjectId)?.name || '…'}
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:opacity-90"
                        style={{ background: '#f97316' }}>
                        + New Project
                    </button>
                </div>

                {/* Stats bar */}
                {projects.length > 0 && (
                    <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-4">
                        {[
                            ['🏗️ Total Projects',  projects.length,            '#f97316'],
                            ['✅ Active',           projects.filter(p => p.id === activeProjectId).length, '#10b981'],
                            ['💰 Total Budget',     `NPR ${projects.reduce((s, p) => s + (+p.total_budget || 0), 0).toLocaleString()}`, '#3b82f6'],
                            ['👥 Total Members',    projects.reduce((s, p) => s + (p.member_count || 0), 0), '#8b5cf6'],
                        ].map(([label, val, clr]) => (
                            <div key={label} className="rounded-xl p-4 text-center"
                                style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                                <p className="text-lg font-black" style={{ color: clr }}>{val}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--t-text3)' }}>{label}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="max-w-6xl mx-auto">
                {/* Search */}
                <div className="mb-5">
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="🔍  Search projects by name, owner, or location…"
                        className="w-full px-4 py-3 rounded-xl text-sm"
                        style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text)', outline: 'none' }}
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 p-4 rounded-xl text-sm font-semibold"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Empty state */}
                {filtered.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <p className="text-6xl mb-4">🏗️</p>
                        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--t-text)' }}>
                            {search ? 'No projects match your search' : 'No projects yet'}
                        </h2>
                        <p className="text-sm mb-6" style={{ color: 'var(--t-text3)' }}>
                            {search ? 'Try a different search term.' : 'Create your first construction project to get started.'}
                        </p>
                        {!search && (
                            <button onClick={() => setShowForm(true)}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                                style={{ background: '#f97316' }}>
                                + Create First Project
                            </button>
                        )}
                    </div>
                )}

                {/* Projects grid */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(project => (
                        <div key={project.id} className="relative group">
                            <ProjectCard
                                project={project}
                                isActive={project.id === activeProjectId}
                                onActivate={() => activate(project)}
                            />
                            {/* Delete button — appears on hover */}
                            <button
                                onClick={(e) => handleDelete(project, e)}
                                disabled={deleting === project.id}
                                className="absolute top-3 right-3 w-7 h-7 rounded-full items-center justify-center text-sm
                                           opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{
                                    background: 'rgba(239,68,68,0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    display: 'flex',
                                }}>
                                {deleting === project.id ? '…' : '×'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick-access hint if a project is active */}
            {activeProjectId && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl z-10"
                    style={{ background: 'var(--t-surface)', border: '2px solid #f97316' }}>
                    <span style={{ color: '#f97316' }}>✓ Active project set</span>
                    <span style={{ color: 'var(--t-text3)', fontSize: 12 }}>—</span>
                    <button onClick={() => navigate('/dashboard/desktop/home')}
                        className="text-sm font-bold" style={{ color: '#f97316' }}>
                        Go to Dashboard →
                    </button>
                    <button onClick={() => navigate(`/dashboard/desktop/structure`)}
                        className="text-sm font-semibold" style={{ color: 'var(--t-text3)' }}>
                        Structure →
                    </button>
                    <button onClick={() => navigate(`/dashboard/desktop/finance`)}
                        className="text-sm font-semibold" style={{ color: 'var(--t-text3)' }}>
                        Finance →
                    </button>
                </div>
            )}

            {/* Create/Edit modal */}
            {showForm && (
                <ProjectForm
                    onClose={() => setShowForm(false)}
                    onSaved={(p) => activate(p)}
                />
            )}
        </div>
    );
}
