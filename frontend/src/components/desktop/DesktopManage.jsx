/**
 * DesktopManage — System Management Hub
 *
 * A clean control-panel page. The top shows health cards for every module
 * with live stats and a direct link into that module. Below the cards sits
 * the inline Phase & Task manager — the most common day-to-day work area.
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConstruction } from '../../context/ConstructionContext';
import ManagementTabs from './manage/ManagementTabs';

/* ─── ModuleCard ─────────────────────────────────────────────────────────── */
function ModuleCard({ icon, title, subtitle, color, stats, actions, path, badge }) {
    const navigate = useNavigate();
    return (
        <div style={{
            borderRadius: 14, border: '1px solid var(--t-border)',
            background: 'var(--t-surface)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            transition: 'box-shadow 0.15s, transform 0.15s',
        }}
            className="hover:shadow-md hover:-translate-y-0.5"
        >
            {/* Card header */}
            <div style={{
                padding: '14px 16px 12px',
                borderBottom: '1px solid var(--t-border)',
                background: `${color}08`,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${color}18`, fontSize: 18,
                        border: `1px solid ${color}30`,
                    }}>
                        {icon}
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--t-text)' }}>{title}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--t-text3)', fontWeight: 600 }}>{subtitle}</p>
                    </div>
                </div>
                {badge && (
                    <span style={{
                        fontSize: 9, padding: '2px 7px', borderRadius: 6, fontWeight: 900,
                        background: badge.bg || '#ef444418', color: badge.color || '#ef4444',
                        border: `1px solid ${badge.color || '#ef4444'}30`,
                        flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                        {badge.label}
                    </span>
                )}
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, 1fr)`,
                gap: 0, flex: 1,
            }}>
                {stats.map((s, i) => (
                    <div key={i} style={{
                        padding: '10px 14px',
                        borderRight: i < stats.length - 1 ? '1px solid var(--t-border)' : 'none',
                        borderBottom: '1px solid var(--t-border)',
                    }}>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: s.color || color }}>{s.value}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 9, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Actions footer */}
            <div style={{
                padding: '10px 12px', display: 'flex', gap: 6, alignItems: 'center',
            }}>
                {actions.map((a, i) => (
                    <button key={i} onClick={() => navigate(a.path)} style={{
                        padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                        background: a.primary ? color : 'var(--t-surface2)',
                        color: a.primary ? '#fff' : 'var(--t-text)',
                        border: `1px solid ${a.primary ? color : 'var(--t-border)'}`,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>
                        {a.label}
                    </button>
                ))}
                <div style={{ flex: 1 }} />
                <button onClick={() => navigate(path)} style={{
                    padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 800,
                    background: 'transparent', color, border: `1px solid ${color}40`, cursor: 'pointer',
                }}>
                    Open →
                </button>
            </div>
        </div>
    );
}

/* ─── SystemStatusBar ────────────────────────────────────────────────────── */
function SystemStatusBar({ phases, tasks, expenses, materials, permits }) {
    const overdueT = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'COMPLETED').length;
    const lowStock = materials.filter(m => m.quantity_in_stock <= (m.minimum_stock || 5)).length;
    const pendingP = permits.filter(p => p.status === 'PENDING' || p.status === 'IN_PROGRESS').length;
    const blockedT = tasks.filter(t => t.status === 'BLOCKED').length;

    const items = [
        { label: 'Overdue Tasks', value: overdueT, color: overdueT > 0 ? '#ef4444' : '#10b981', icon: overdueT > 0 ? '⚠' : '✓' },
        { label: 'Blocked Tasks', value: blockedT, color: blockedT > 0 ? '#f59e0b' : '#10b981', icon: blockedT > 0 ? '🚫' : '✓' },
        { label: 'Low Stock Items', value: lowStock, color: lowStock > 0 ? '#f97316' : '#10b981', icon: lowStock > 0 ? '📦' : '✓' },
        { label: 'Pending Permits', value: pendingP, color: pendingP > 0 ? '#3b82f6' : '#10b981', icon: pendingP > 0 ? '📜' : '✓' },
    ];

    const hasAlerts = overdueT + blockedT + lowStock + pendingP > 0;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            borderRadius: 10, overflow: 'hidden',
            border: '1px solid var(--t-border)',
            background: 'var(--t-surface)',
            marginBottom: 20,
        }}>
            <div style={{
                padding: '10px 16px', borderRight: '1px solid var(--t-border)',
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
                <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: hasAlerts ? '#f59e0b' : '#10b981',
                    boxShadow: `0 0 6px ${hasAlerts ? '#f59e0b' : '#10b981'}`,
                }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--t-text)', whiteSpace: 'nowrap' }}>
                    System Status
                </span>
            </div>
            {items.map((item, i) => (
                <div key={item.label} style={{
                    flex: 1, padding: '10px 14px', textAlign: 'center',
                    borderRight: i < items.length - 1 ? '1px solid var(--t-border)' : 'none',
                }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: item.color }}>
                        {item.icon} {item.value}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 1 }}>
                        {item.label}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ─── DesktopManage (hub) ────────────────────────────────────────────────── */
const DesktopManage = () => {
    const navigate = useNavigate();
    const { dashboardData, activeProjectId, projects } = useConstruction();

    const projectList = Array.isArray(projects) ? projects : [];
    const activeProject = projectList.find(p => p.id === activeProjectId);

    const phases = dashboardData.phases || [];
    const tasks = dashboardData.tasks || [];
    const expenses = dashboardData.expenses || [];
    const materials = dashboardData.materials || [];
    const contractors = dashboardData.contractors || [];
    const suppliers = dashboardData.suppliers || [];
    const permits = dashboardData.permits || [];
    const floors = dashboardData.floors || [];
    const rooms = dashboardData.rooms || [];

    /* ── Derived stats ── */
    const stats = useMemo(() => {
        const phaseDone = phases.filter(p => p.status === 'COMPLETED').length;
        const phaseActive = phases.filter(p => p.status === 'IN_PROGRESS').length;
        const taskDone = tasks.filter(t => t.status === 'COMPLETED').length;
        const taskActive = tasks.filter(t => t.status === 'IN_PROGRESS').length;
        const taskOverdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'COMPLETED').length;
        const totalSpent = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        const totalBudget = activeProject ? parseFloat(activeProject.total_budget || 0) : 0;
        const lowStock = materials.filter(m => m.quantity_in_stock <= (m.minimum_stock || 5)).length;
        const roomDone = rooms.filter(r => r.status === 'COMPLETED').length;
        return {
            phaseDone, phaseActive,
            taskDone, taskActive, taskOverdue,
            totalSpent, totalBudget,
            lowStock, roomDone,
        };
    }, [phases, tasks, expenses, materials, activeProject, rooms]);

    /* ── Module cards config ── */
    const modules = [
        {
            icon: '📅', title: 'Timeline', subtitle: 'Gantt · Calendar · Kanban',
            color: '#3b82f6', path: '/dashboard/desktop/timeline',
            badge: stats.taskOverdue > 0 ? { label: `${stats.taskOverdue} overdue`, color: '#ef4444', bg: '#ef444414' } : null,
            stats: [
                { label: 'Phases', value: `${stats.phaseDone}/${phases.length}`, color: '#f97316' },
                { label: 'Tasks Done', value: `${stats.taskDone}/${tasks.length}`, color: '#10b981' },
                { label: 'Active', value: stats.taskActive, color: '#3b82f6' },
            ],
            actions: [
                { label: '📊 Gantt', path: '/dashboard/desktop/timeline' },
                { label: '🗂️ Kanban', path: '/dashboard/desktop/timeline' },
            ],
        },
        {
            icon: '💰', title: 'Finance', subtitle: 'Budget · Expenses · Ledger',
            color: '#10b981', path: '/dashboard/desktop/finance',
            badge: stats.totalBudget > 0 && stats.totalSpent / stats.totalBudget > 0.9
                ? { label: '>90% budget used', color: '#ef4444', bg: '#ef444414' } : null,
            stats: [
                { label: 'Budget (Rs.)', value: stats.totalBudget > 0 ? `${(stats.totalBudget / 1000).toFixed(0)}K` : '—', color: '#f97316' },
                { label: 'Spent (Rs.)', value: stats.totalSpent > 0 ? `${(stats.totalSpent / 1000).toFixed(0)}K` : '—', color: '#ef4444' },
                { label: 'Used', value: stats.totalBudget > 0 ? `${Math.round(stats.totalSpent / stats.totalBudget * 100)}%` : '—', color: '#10b981' },
            ],
            actions: [
                { label: '💸 Expenses', path: '/dashboard/desktop/finance' },
                { label: '📒 Ledger', path: '/dashboard/desktop/finance' },
            ],
        },
        {
            icon: '🧱', title: 'Resources', subtitle: 'Materials · Contractors · Stock',
            color: '#f97316', path: '/dashboard/desktop/resource',
            badge: stats.lowStock > 0 ? { label: `${stats.lowStock} low stock`, color: '#f97316', bg: '#f9731614' } : null,
            stats: [
                { label: 'Materials', value: materials.length, color: '#f97316' },
                { label: 'Contractors', value: contractors.length, color: '#8b5cf6' },
                { label: 'Suppliers', value: suppliers.length, color: '#3b82f6' },
            ],
            actions: [
                { label: '📦 Materials', path: '/dashboard/desktop/resource' },
                { label: '👷 Contractors', path: '/dashboard/desktop/resource' },
            ],
        },
        {
            icon: '🏛️', title: 'Structure', subtitle: 'Floors · Rooms · Layout',
            color: '#8b5cf6', path: '/dashboard/desktop/structure',
            stats: [
                { label: 'Floors', value: floors.length, color: '#8b5cf6' },
                { label: 'Rooms', value: rooms.length, color: '#3b82f6' },
                { label: 'Done', value: `${stats.roomDone}/${rooms.length}`, color: '#10b981' },
            ],
            actions: [
                { label: '🗺️ Floor Plan', path: '/dashboard/desktop/structure' },
            ],
        },
        {
            icon: '📜', title: 'Permits', subtitle: 'Municipal · Approvals',
            color: '#06b6d4', path: '/dashboard/desktop/permits',
            badge: permits.filter(p => p.status === 'PENDING').length > 0
                ? { label: `${permits.filter(p => p.status === 'PENDING').length} pending`, color: '#06b6d4', bg: '#06b6d414' } : null,
            stats: [
                { label: 'Total', value: permits.length, color: '#06b6d4' },
                { label: 'Approved', value: permits.filter(p => p.status === 'APPROVED').length, color: '#10b981' },
                { label: 'Pending', value: permits.filter(p => p.status === 'PENDING').length, color: '#f59e0b' },
            ],
            actions: [
                { label: '📋 View All', path: '/dashboard/desktop/permits' },
            ],
        },
        {
            icon: '📈', title: 'Analytics', subtitle: 'Reports · Charts · Insights',
            color: '#f59e0b', path: '/dashboard/desktop/analytics',
            stats: [
                { label: 'Budget Used', value: stats.totalBudget > 0 ? `${Math.round(stats.totalSpent / stats.totalBudget * 100)}%` : '—', color: '#f59e0b' },
                { label: 'Phase Progress', value: phases.length > 0 ? `${Math.round(stats.phaseDone / phases.length * 100)}%` : '—', color: '#10b981' },
                { label: 'Tasks Done', value: tasks.length > 0 ? `${Math.round(stats.taskDone / tasks.length * 100)}%` : '—', color: '#3b82f6' },
            ],
            actions: [
                { label: '📊 Open Reports', path: '/dashboard/desktop/analytics' },
            ],
        },
        {
            icon: '📸', title: 'Gallery', subtitle: 'Photos · Timelapse · Docs',
            color: '#ec4899', path: '/dashboard/desktop/photos',
            stats: [
                { label: 'Gallery', value: '—', color: '#ec4899' },
                { label: 'Timelapse', value: '—', color: '#8b5cf6' },
                { label: 'Imports', value: '—', color: '#06b6d4' },
            ],
            actions: [
                { label: '📷 Photos', path: '/dashboard/desktop/photos' },
                { label: '🎞️ Timelapse', path: '/dashboard/desktop/timelapse' },
            ],
        },
        {
            icon: '⚙️', title: 'Settings', subtitle: 'Users · Import · Guides',
            color: '#6b7280', path: '/dashboard/desktop/guides',
            stats: [
                { label: 'Projects', value: projectList.length, color: '#f97316' },
                { label: 'Active', value: activeProject ? 1 : 0, color: '#10b981' },
                { label: 'Guides', value: (dashboardData.userGuides || []).length, color: '#6b7280' },
            ],
            actions: [
                { label: '📥 Import', path: '/dashboard/desktop/import' },
                { label: '📚 Guides', path: '/dashboard/desktop/guides' },
            ],
        },
    ];

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--t-bg)',
            padding: '0 0 48px',
        }}>
            <ManagementTabs />
            {/* ── Header ────────────────────────────────────────────── */}
            <div style={{
                padding: '24px 28px 20px',
                background: 'var(--t-surface)',
                borderBottom: '1px solid var(--t-border)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 12,
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 22 }}>🛠️</span>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--t-text)' }}>
                            Management Hub
                        </h1>
                        {activeProject && (
                            <span style={{
                                fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 700,
                                background: 'rgba(249,115,22,0.1)', color: '#f97316',
                                border: '1px solid rgba(249,115,22,0.2)',
                            }}>
                                ● {activeProject.name}
                            </span>
                        )}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text3)' }}>
                        Central control panel — navigate to any module or manage tasks directly below.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => navigate('/dashboard/desktop/home')} style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
                        color: 'var(--t-text)', cursor: 'pointer',
                    }}>
                        🏠 Dashboard
                    </button>
                    <button onClick={() => navigate('/dashboard/desktop/projects')} style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        border: '1px solid #f97316', background: '#f97316',
                        color: '#fff', cursor: 'pointer',
                    }}>
                        🗂️ Projects
                    </button>
                </div>
            </div>

            <div style={{ padding: '20px 28px' }}>
                {/* ── System status bar ─────────────────────────────── */}
                <SystemStatusBar
                    phases={phases} tasks={tasks} expenses={expenses}
                    materials={materials} permits={permits}
                />

                {/* ── Module cards grid ─────────────────────────────── */}
                <div style={{ marginBottom: 6 }}>
                    <h2 style={{
                        margin: '0 0 14px', fontSize: 12, fontWeight: 800,
                        color: 'var(--t-text3)', textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                    }}>
                        📦 Modules
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 12,
                        marginBottom: 28,
                    }}>
                        {modules.map(m => (
                            <ModuleCard key={m.title} {...m} />
                        ))}
                    </div>
                </div>

                {/* ── Quick-link to Phases page ─────────────────────── */}
                <div
                    onClick={() => navigate('/dashboard/desktop/phases')}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 18px', borderRadius: 14, cursor: 'pointer',
                        background: 'rgba(249,115,22,0.06)',
                        border: '1px dashed rgba(249,115,22,0.3)',
                        transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(249,115,22,0.06)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: 9,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, background: 'rgba(249,115,22,0.12)',
                            border: '1px solid rgba(249,115,22,0.25)', flexShrink: 0,
                        }}>📋</div>
                        <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--t-text)' }}>
                                Phase &amp; Task Manager
                            </p>
                            <p style={{ margin: 0, fontSize: 10, color: 'var(--t-text3)', fontWeight: 600 }}>
                                {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {phases.length} phase{phases.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#f97316', opacity: 0.7 }}>
                        Open →
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DesktopManage;
