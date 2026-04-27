/**
 * ProjectGateway
 * ─────────────────────────────────────────────────────────────────────────────
 * Top-level entry screen. Shows all projects, lets user set active project,
 * or create a new one. Acts as the app's home / project picker.
 *
 * Fully responsive — works on both desktop and mobile.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatformBase } from '../../../shared/utils/platformNav';
import { useProjects }      from '../context/ProjectsContext';
import { useConstruction }  from '../../../context/ConstructionContext';
import ProjectCard           from '../components/projects/ProjectCard';
import ProjectForm           from '../components/projects/ProjectForm';
import api                   from '../services/projectsApi';
import { authService }       from '../../../services/auth';

export default function ProjectGateway() {
    const navigate     = useNavigate();
    const base         = usePlatformBase();   // '/dashboard/desktop' | '/dashboard/mobile'
    const isMobile     = base.includes('mobile');

    const currentUser  = authService.getCurrentUser();
    const isAdmin      = currentUser?.is_system_admin || currentUser?.is_superuser || currentUser?.role?.can_manage_all_systems;

    const { projects: rawProjects, loading, error, removeProjectLocal } = useProjects();
    const projects     = Array.isArray(rawProjects) ? rawProjects : [];
    const { activeProjectId, switchProject } = useConstruction();

    const [showForm, setShowForm]         = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [search, setSearch]             = useState('');
    const [deleting, setDeleting]         = useState(null);

    const filtered = projects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.owner_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.address    || '').toLowerCase().includes(search.toLowerCase())
    );

    const activate = (project) => switchProject(project.id);

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

    const handleEdit = (project, e) => {
        e.stopPropagation();
        setEditingProject(project);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--t-bg)' }}>
            <div className="text-center">
                <div className="text-5xl mb-4 animate-pulse">🏗️</div>
                <p className="font-semibold" style={{ color: 'var(--t-text3)' }}>Loading projects…</p>
            </div>
        </div>
    );

    // Non-admin with no assigned projects → show access-denied page
    if (!loading && !isAdmin && projects.length === 0) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'var(--t-bg)',
                padding: '24px',
            }}>
                <div style={{
                    maxWidth: 460, width: '100%', textAlign: 'center',
                    padding: '48px 32px', borderRadius: 20,
                    background: 'var(--t-surface)',
                    border: '1px solid var(--t-border)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 34, background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                        🔒
                    </div>
                    <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 900, color: 'var(--t-text)' }}>
                        No Projects Assigned
                    </h1>
                    <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--t-text3)', lineHeight: 1.6 }}>
                        You haven't been assigned to any project yet.
                        Please contact your project administrator to get access.
                    </p>
                    <p style={{ margin: '0 0 28px', fontSize: 12, color: 'var(--t-text3)' }}>
                        Logged in as <strong style={{ color: 'var(--t-text)' }}>{currentUser?.username || currentUser?.email}</strong>
                    </p>

                    {/* Divider */}
                    <div style={{ borderTop: '1px solid var(--t-border)', paddingTop: 20, marginBottom: 16 }}>
                        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            What you can do
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button
                                onClick={() => navigate(`${base}/accounts/profile`)}
                                style={{
                                    padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                                    border: '1px solid var(--t-border)', background: 'var(--t-bg)',
                                    color: 'var(--t-text)', cursor: 'pointer',
                                }}>
                                👤 View Your Profile
                            </button>
                        </div>
                    </div>

                    <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)' }}>
                        Once assigned, refresh this page to see your projects.
                    </p>
                </div>
            </div>
        );
    }

    const activeProject = projects.find(p => p.id === activeProjectId);

    return (
        <div
            className="min-h-screen"
            style={{
                background: 'var(--t-bg)',
                padding: isMobile ? '16px 14px 96px' : '32px 24px 48px',
            }}
        >
            {/* ── Hero header ─────────────────────────────────────────── */}
            <div style={{ maxWidth: 1100, margin: '0 auto 24px' }}>
                <div style={{
                    display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                    marginBottom: 16,
                }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: isMobile ? 22 : 28 }}>🏗️</span>
                            <h1 style={{
                                margin: 0,
                                fontSize: isMobile ? 20 : 28,
                                fontWeight: 900,
                                color: 'var(--t-text)',
                            }}>
                                Project Manager
                            </h1>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text3)' }}>
                            Select a project to work in, or create a new one.
                            {activeProjectId && (
                                <span style={{ marginLeft: 8, fontWeight: 700, color: '#f97316' }}>
                                    ● Active: {activeProject?.name || '…'}
                                </span>
                            )}
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowForm(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: isMobile ? '8px 16px' : '10px 20px',
                                borderRadius: 12, fontSize: isMobile ? 12 : 13,
                                fontWeight: 800, color: '#fff', background: '#f97316',
                                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}>
                            + New Project
                        </button>
                    )}
                </div>

                {/* Stats bar */}
                {projects.length > 0 && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                        gap: isMobile ? 8 : 14,
                    }}>
                        {[
                            ['🏗️', 'Total',   projects.length,                                                          '#f97316'],
                            ['✅', 'Active',   activeProjectId ? 1 : 0,                                                  '#10b981'],
                            ['💰', 'Budget',   `NPR ${(projects.reduce((s, p) => s + (+p.total_budget || 0), 0) / 1000).toFixed(0)}K`, '#3b82f6'],
                            ['👥', 'Members',  projects.reduce((s, p) => s + (p.member_count || 0), 0),                  '#8b5cf6'],
                        ].map(([icon, label, val, clr]) => (
                            <div key={label} style={{
                                borderRadius: 12, padding: isMobile ? '12px 14px' : '16px',
                                textAlign: 'center',
                                background: 'var(--t-surface)',
                                border: '1px solid var(--t-border)',
                            }}>
                                <p style={{ margin: 0, fontSize: isMobile ? 10 : 11, color: 'var(--t-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {icon} {label}
                                </p>
                                <p style={{ margin: '4px 0 0', fontSize: isMobile ? 16 : 20, fontWeight: 900, color: clr }}>
                                    {val}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                {/* Search */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 14px', borderRadius: 12,
                        background: 'var(--t-surface)',
                        border: '1px solid var(--t-border)',
                    }}>
                        <span style={{ fontSize: 14, opacity: 0.4 }}>🔍</span>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, owner, or location…"
                            style={{
                                flex: 1, background: 'transparent',
                                border: 'none', outline: 'none',
                                fontSize: 13, color: 'var(--t-text)',
                            }}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                style={{
                                    background: 'none', border: 'none',
                                    cursor: 'pointer', fontSize: 12,
                                    color: 'var(--t-text3)', padding: 0,
                                }}>
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        marginBottom: 14, padding: '12px 16px',
                        borderRadius: 12, fontSize: 13, fontWeight: 600,
                        background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Empty state */}
                {filtered.length === 0 && !loading && (
                    <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        paddingTop: 64, paddingBottom: 64, textAlign: 'center',
                    }}>
                        <p style={{ fontSize: 56, marginBottom: 12 }}>🏗️</p>
                        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: 'var(--t-text)' }}>
                            {search ? 'No projects match your search' : 'No projects yet'}
                        </h2>
                        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--t-text3)' }}>
                            {search
                                ? 'Try a different search term.'
                                : isAdmin
                                    ? 'Create your first construction project to get started.'
                                    : 'You have no assigned projects. Contact your administrator.'}
                        </p>
                        {!search && isAdmin && (
                            <button
                                onClick={() => setShowForm(true)}
                                style={{
                                    padding: '10px 24px', borderRadius: 12,
                                    fontSize: 13, fontWeight: 800,
                                    background: '#f97316', color: '#fff',
                                    border: 'none', cursor: 'pointer',
                                }}>
                                + Create First Project
                            </button>
                        )}
                    </div>
                )}

                {/* Projects grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile
                        ? '1fr'
                        : 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: isMobile ? 12 : 20,
                }}>
                    {filtered.map(project => (
                        <div key={project.id} style={{ position: 'relative' }} className="group">
                            <ProjectCard
                                project={project}
                                isActive={project.id === activeProjectId}
                                onActivate={() => activate(project)}
                            />
                            {/* Delete + Edit — admins only */}
                            {isAdmin && (
                                <>
                                    <button
                                        onClick={(e) => handleDelete(project, e)}
                                        disabled={deleting === project.id}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{
                                            position: 'absolute', top: 12, right: 12,
                                            width: 28, height: 28, borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 14, cursor: 'pointer',
                                            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                            border: '1px solid rgba(239,68,68,0.3)',
                                        }}>
                                        {deleting === project.id ? '…' : '×'}
                                    </button>
                                    <button
                                        onClick={(e) => handleEdit(project, e)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{
                                            position: 'absolute', top: 12, right: 46,
                                            width: 28, height: 28, borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 12, cursor: 'pointer',
                                            background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                                            border: '1px solid rgba(59,130,246,0.3)',
                                        }}>
                                        ✏️
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick-access hint if a project is active */}
            {activeProjectId && (
                <div style={{
                    position: 'fixed',
                    bottom: isMobile ? 80 : 24,   /* clear mobile nav bar */
                    left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12,
                    padding: isMobile ? '10px 14px' : '12px 20px',
                    borderRadius: 20, zIndex: 40, whiteSpace: 'nowrap',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    background: 'var(--t-surface)',
                    border: '2px solid #f97316',
                }}>
                    <span style={{ color: '#f97316', fontSize: isMobile ? 11 : 13, fontWeight: 700 }}>
                        ✓ Active project set
                    </span>
                    <span style={{ color: 'var(--t-border)', fontSize: 16 }}>|</span>
                    <button
                        onClick={() => navigate(`${base}/home`)}
                        style={{ fontSize: isMobile ? 11 : 13, fontWeight: 800, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Dashboard →
                    </button>
                    {!isMobile && (
                        <>
                            <button onClick={() => navigate(`${base}/structure`)}
                                style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                Structure →
                            </button>
                            <button onClick={() => navigate(`${base}/finance`)}
                                style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                Finance →
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Create / Edit modal — admins only */}
            {isAdmin && (showForm || editingProject) && (
                <ProjectForm
                    initial={editingProject}
                    onClose={() => { setShowForm(false); setEditingProject(null); }}
                    onSaved={(p) => activate(p)}
                />
            )}
        </div>
    );
}
