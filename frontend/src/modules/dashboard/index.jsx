/**
 * Dashboard Module — clean overview dashboard.
 *
 * Replaces DesktopHome as the main /home route.
 * Phase & Task details are handled in PhasesPage — no modals here.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConstruction } from '../../context/ConstructionContext';
import { usePlatformBase } from '../../shared/utils/platformNav';

/* ── tiny helpers ── */
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';
const daysLeft = (s) => s ? Math.round((new Date(s) - new Date()) / 86400000) : null;
const today    = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

/* ── Status / priority meta ── */
const PHASE_STATUS = {
    COMPLETED:   { label: 'Done',        color: '#10b981', bg: '#10b98115' },
    IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bg: '#3b82f615' },
    HALTED:      { label: 'Halted',      color: '#ef4444', bg: '#ef444415' },
    PENDING:     { label: 'Pending',     color: '#6b7280', bg: '#6b728015' },
};

const TASK_STATUS = {
    COMPLETED:   { color: '#10b981', label: 'Done'        },
    IN_PROGRESS: { color: '#3b82f6', label: 'In Progress' },
    BLOCKED:     { color: '#f59e0b', label: 'Blocked'     },
    PENDING:     { color: '#6b7280', label: 'Pending'     },
};

const PRIORITY_COLOR = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#6b7280' };

/* ── KPI Card ── */
function KpiCard({ icon, label, value, hint, accent = '#f97316' }) {
    return (
        <div style={{
            background: 'var(--t-surface)', borderRadius: 14,
            border: '1px solid var(--t-border)',
            borderLeft: `4px solid ${accent}`,
            padding: '16px 20px',
            display: 'flex', flexDirection: 'column', gap: 8,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
                <span style={{ fontSize: 20 }}>{icon}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--t-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            {hint && <div style={{ fontSize: 11, color: 'var(--t-text3)' }}>{hint}</div>}
        </div>
    );
}

/* ── Progress bar ── */
function ProgressBar({ pct, color = '#f97316' }) {
    return (
        <div style={{ height: 4, borderRadius: 2, background: 'var(--t-border)', overflow: 'hidden' }}>
            <div style={{
                height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`,
                background: color, borderRadius: 2, transition: 'width 0.5s',
            }} />
        </div>
    );
}

/* ── Section header ── */
function SectionHead({ label, action, onAction }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
        }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--t-text)', margin: 0 }}>{label}</h3>
            {action && (
                <button onClick={onAction} style={{
                    fontSize: 11, fontWeight: 700, color: '#f97316',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0,
                }}>{action} →</button>
            )}
        </div>
    );
}

/* ── Phase mini card ── */
function PhaseCard({ phase, tasks, onViewDetail }) {
    const sm       = PHASE_STATUS[phase.status] || PHASE_STATUS.PENDING;
    const pTasks   = tasks.filter(t => t.phase === phase.id);
    const done     = pTasks.filter(t => t.status === 'COMPLETED').length;
    const pct      = pTasks.length > 0 ? Math.round(done / pTasks.length * 100) : 0;
    const overdue  = pTasks.filter(t => t.due_date && daysLeft(t.due_date) < 0 && t.status !== 'COMPLETED').length;

    return (
        <div style={{
            background: 'var(--t-surface)', borderRadius: 12,
            border: `1px solid var(--t-border)`,
            borderLeft: `3px solid ${sm.color}`,
            padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 8,
            transition: 'box-shadow 0.15s',
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: 13, fontWeight: 800, color: 'var(--t-text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {phase.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 2 }}>
                        {fmtDate(phase.start_date)} → {fmtDate(phase.end_date)}
                    </div>
                </div>
                <span style={{
                    fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 5,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    background: sm.bg, color: sm.color, flexShrink: 0,
                }}>{sm.label}</span>
            </div>

            <ProgressBar pct={pct} color={pct === 100 ? '#10b981' : sm.color} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--t-text3)' }}>{done}/{pTasks.length} tasks</span>
                    {overdue > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444' }}>⚠ {overdue} overdue</span>
                    )}
                </div>
                <button onClick={() => onViewDetail(phase)} style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 6,
                    background: 'rgba(249,115,22,0.08)', color: '#f97316',
                    border: '1px solid rgba(249,115,22,0.25)', cursor: 'pointer',
                }}>Detail →</button>
            </div>
        </div>
    );
}

/* ── Task priority row ── */
function PriorityTaskRow({ task, phases, onViewDetail }) {
    const sm   = TASK_STATUS[task.status] || TASK_STATUS.PENDING;
    const dl   = daysLeft(task.due_date);
    const over = dl !== null && dl < 0;
    const ph   = phases.find(p => p.id === task.phase);

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 0', borderBottom: '1px solid var(--t-border)',
        }}>
            {/* Priority strip */}
            <div style={{
                width: 3, height: 36, borderRadius: 2, flexShrink: 0,
                background: PRIORITY_COLOR[task.priority] || '#6b7280',
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--t-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {task.title}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    {ph && <span style={{ fontSize: 9, color: 'var(--t-text3)' }}>📋 {ph.name}</span>}
                    {task.due_date && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: over ? '#ef4444' : 'var(--t-text3)' }}>
                            {over ? `⚠ ${Math.abs(dl)}d over` : `📅 ${fmtDate(task.due_date)}`}
                        </span>
                    )}
                </div>
            </div>

            <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 5,
                background: `${PRIORITY_COLOR[task.priority] || '#6b7280'}18`,
                color: PRIORITY_COLOR[task.priority] || '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
            }}>{task.priority}</span>

            <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 5,
                background: `${sm.color}15`, color: sm.color,
                textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
            }}>{sm.label}</span>

            <button onClick={() => onViewDetail(task)} style={{
                fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 6,
                background: 'var(--t-surface2)', color: 'var(--t-text2)',
                border: '1px solid var(--t-border)', cursor: 'pointer', flexShrink: 0,
            }}>Detail</button>
        </div>
    );
}

/* ── Quick Action button ── */
function QuickAction({ icon, title, sub, accent, onClick }) {
    return (
        <button onClick={onClick} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', borderRadius: 12,
            background: 'var(--t-surface)', border: '1px solid var(--t-border)',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            width: '100%',
        }}
            onMouseEnter={e => e.currentTarget.style.borderColor = accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--t-border)'}
        >
            <span style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, background: `${accent}15`,
            }}>{icon}</span>
            <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t-text)' }}>{title}</div>
                <div style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 2 }}>{sub}</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 16, color: 'var(--t-text3)' }}>›</span>
        </button>
    );
}

/* ── Activity item ── */
function ActivityItem({ activity }) {
    const icon = activity.category === 'task' ? '☑️'
               : activity.category === 'phase' ? '📋'
               : activity.category === 'finance' ? '💰'
               : activity.category === 'permit' ? '📜'
               : '📌';

    return (
        <div style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--t-border)' }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--t-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{activity.title}</div>
                <div style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 1 }}>{activity.timestamp_human || ''}</div>
            </div>
        </div>
    );
}

/* ── Budget donut-like bar ── */
function BudgetBar({ label, spent, budget, color }) {
    const pct = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0;
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text)' }}>{label}</span>
                <span style={{ fontSize: 10, color: 'var(--t-text3)' }}>{pct}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'var(--t-border)', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', width: `${pct}%`, background: color,
                    borderRadius: 3, transition: 'width 0.5s',
                }} />
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   Main Dashboard component
════════════════════════════════════════════════════════════ */
export default function Dashboard() {
    const navigate = useNavigate();
    const base     = usePlatformBase();

    const {
        dashboardData, stats, budgetStats, recentActivities,
        formatCurrency,
    } = useConstruction();

    const phases = dashboardData?.phases || [];
    const tasks  = dashboardData?.tasks  || [];

    /* ── derived stats ── */
    const phaseStats = useMemo(() => {
        const total   = phases.length;
        const done    = phases.filter(p => p.status === 'COMPLETED').length;
        const active  = phases.filter(p => p.status === 'IN_PROGRESS').length;
        const pct     = total > 0 ? Math.round(done / total * 100) : 0;
        return { total, done, active, pct };
    }, [phases]);

    const taskStats = useMemo(() => {
        const total    = tasks.length;
        const done     = tasks.filter(t => t.status === 'COMPLETED').length;
        const inProg   = tasks.filter(t => t.status === 'IN_PROGRESS').length;
        const blocked  = tasks.filter(t => t.status === 'BLOCKED').length;
        const overdue  = tasks.filter(t => t.due_date && daysLeft(t.due_date) < 0 && t.status !== 'COMPLETED').length;
        const pct      = total > 0 ? Math.round(done / total * 100) : 0;
        return { total, done, inProg, blocked, overdue, pct };
    }, [tasks]);

    const priorityTasks = useMemo(() => {
        const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return tasks
            .filter(t => t.status !== 'COMPLETED')
            .sort((a, b) => (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2))
            .slice(0, 6);
    }, [tasks]);

    const activePhasesShow  = phases.filter(p => p.status !== 'COMPLETED').slice(0, 4);
    const completedPhases   = phases.filter(p => p.status === 'COMPLETED').length;
    const lowStockItems     = (budgetStats?.lowStockItems || []).slice(0, 4);
    const overBudget        = (budgetStats?.budgetPercent || 0) > 90;

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    }, []);

    /* ── navigation helpers ── */
    const goPhaseDetail = (phase) => navigate(`${base}/phases`, { state: { openPhase: phase.id } });
    const goTaskDetail  = (task)  => navigate(`${base}/phases`, { state: { openTask: task.id } });
    const go            = (path)  => navigate(path);

    const quickActions = [
        { icon: '💰', title: 'Finance',    sub: 'Budget, Expenses & Loans',  accent: '#10b981', path: `${base}/finance`   },
        { icon: '📅', title: 'Timeline',   sub: 'Gantt, Calendar & Kanban',  accent: '#3b82f6', path: `${base}/timeline`  },
        { icon: '📸', title: 'Gallery',    sub: 'Site Photos & Progress',    accent: '#8b5cf6', path: `${base}/photos`    },
        { icon: '📈', title: 'Analytics',  sub: 'Forecast & Trends',         accent: '#f59e0b', path: `${base}/analytics` },
        { icon: '🧱', title: 'Resources',  sub: 'Materials & Stock',         accent: '#f97316', path: `${base}/resource`  },
        { icon: '🏛️', title: 'Structure', sub: 'Floors, Rooms & Areas',     accent: '#6366f1', path: `${base}/structure` },
        { icon: '📜', title: 'Permits',    sub: 'Naksha & Approvals',        accent: '#ef4444', path: `${base}/permits`   },
        { icon: '🛠️', title: 'Manage',    sub: 'Contractors & Supplies',    accent: '#6b7280', path: `${base}/manage`    },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--t-bg)' }}>

            {/* ── Sticky top bar ── */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 30,
                background: 'var(--t-surface)', borderBottom: '1px solid var(--t-border)',
                padding: '12px 28px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                backdropFilter: 'blur(8px)',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--t-text)' }}>
                        {greeting} 👋
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)' }}>
                        {today} · {dashboardData.project?.name || 'Project Overview'}
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Overall progress pill */}
                    <span style={{
                        fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20,
                        background: 'rgba(249,115,22,0.1)', color: '#f97316',
                        border: '1px solid rgba(249,115,22,0.25)',
                    }}>
                        {phaseStats.pct}% Complete
                    </span>

                    {/* Quick refresh */}
                    <button onClick={() => navigate(`${base}/phases`)} style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                        background: 'rgba(249,115,22,0.1)', color: '#f97316',
                        border: '1px solid rgba(249,115,22,0.25)', cursor: 'pointer',
                    }}>📋 Phases & Tasks</button>
                </div>
            </div>

            <div style={{ padding: '24px 28px 96px' }}>

                {/* ── Alert banner — overdue or over budget ── */}
                {(taskStats.overdue > 0 || overBudget) && (
                    <div style={{
                        marginBottom: 20, padding: '12px 18px', borderRadius: 10,
                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
                        display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                        <span style={{ fontSize: 20 }}>⚠️</span>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#ef4444' }}>Attention Required</p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)' }}>
                                {taskStats.overdue > 0 && `${taskStats.overdue} overdue task${taskStats.overdue > 1 ? 's' : ''}`}
                                {taskStats.overdue > 0 && overBudget && ' · '}
                                {overBudget && `Budget at ${Math.round(budgetStats.budgetPercent)}%`}
                            </p>
                        </div>
                        <button onClick={() => navigate(`${base}/phases`)} style={{
                            padding: '5px 14px', borderRadius: 7, fontSize: 11, fontWeight: 800,
                            background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer',
                        }}>View Tasks</button>
                    </div>
                )}

                {/* ── KPI row ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                    <KpiCard
                        icon="💰" label="Total Budget"
                        value={formatCurrency ? formatCurrency(budgetStats?.totalBudget) : `Rs. ${(budgetStats?.totalBudget || 0).toLocaleString()}`}
                        hint="Project master budget"
                        accent="#f97316"
                    />
                    <KpiCard
                        icon="💸" label="Total Spent"
                        value={formatCurrency ? formatCurrency(budgetStats?.totalSpent) : `Rs. ${(budgetStats?.totalSpent || 0).toLocaleString()}`}
                        hint={`${Math.round(budgetStats?.budgetPercent || 0)}% of budget used`}
                        accent={overBudget ? '#ef4444' : (budgetStats?.budgetPercent || 0) > 70 ? '#f59e0b' : '#10b981'}
                    />
                    <KpiCard
                        icon="📋" label="Phases"
                        value={`${phaseStats.done} / ${phaseStats.total}`}
                        hint={`${phaseStats.active} active · ${phaseStats.total - phaseStats.done - phaseStats.active} pending`}
                        accent="#6366f1"
                    />
                    <KpiCard
                        icon="☑️" label="Tasks"
                        value={`${taskStats.done} / ${taskStats.total}`}
                        hint={`${taskStats.inProg} in progress · ${taskStats.overdue} overdue`}
                        accent={taskStats.overdue > 0 ? '#ef4444' : '#10b981'}
                    />
                </div>

                {/* ── Main grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 20 }}>

                    {/* LEFT: Phases + Priority tasks */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {/* Active phases */}
                        <div style={{
                            background: 'var(--t-surface)', borderRadius: 14,
                            border: '1px solid var(--t-border)', padding: 20,
                        }}>
                            <SectionHead
                                label={`Phases (${activePhasesShow.length} active · ${completedPhases} done)`}
                                action="All Phases"
                                onAction={() => navigate(`${base}/phases`)}
                            />

                            {/* Overall progress bar */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-text3)' }}>Overall completion</span>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: '#f97316' }}>{phaseStats.pct}%</span>
                                </div>
                                <div style={{ height: 7, borderRadius: 4, background: 'var(--t-border)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', width: `${phaseStats.pct}%`, borderRadius: 4,
                                        background: phaseStats.pct === 100 ? '#10b981' : 'linear-gradient(90deg,#f97316,#fb923c)',
                                        transition: 'width 0.5s',
                                    }} />
                                </div>
                            </div>

                            {activePhasesShow.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--t-text3)' }}>
                                    <p style={{ fontSize: 28, margin: '0 0 8px' }}>🎉</p>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-text)', margin: '0 0 4px' }}>All phases complete!</p>
                                    <p style={{ fontSize: 11, margin: 0 }}>Great work on finishing all construction phases.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {activePhasesShow.map(phase => (
                                        <PhaseCard
                                            key={phase.id}
                                            phase={phase}
                                            tasks={tasks}
                                            onViewDetail={goPhaseDetail}
                                        />
                                    ))}
                                </div>
                            )}

                            {phases.length > 4 && (
                                <button onClick={() => navigate(`${base}/phases`)} style={{
                                    marginTop: 12, width: '100%', padding: '8px 0', borderRadius: 8,
                                    fontSize: 11, fontWeight: 800, cursor: 'pointer',
                                    background: 'var(--t-surface2)', color: 'var(--t-text2)',
                                    border: '1px solid var(--t-border)',
                                }}>
                                    View all {phases.length} phases →
                                </button>
                            )}
                        </div>

                        {/* Priority tasks */}
                        <div style={{
                            background: 'var(--t-surface)', borderRadius: 14,
                            border: '1px solid var(--t-border)', padding: 20,
                        }}>
                            <SectionHead
                                label={`Priority Tasks (${priorityTasks.length} pending)`}
                                action="All Tasks"
                                onAction={() => navigate(`${base}/phases`)}
                            />
                            {priorityTasks.length === 0 ? (
                                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--t-text3)', fontSize: 12 }}>
                                    ✓ No pending tasks
                                </div>
                            ) : (
                                <div>
                                    {priorityTasks.map(task => (
                                        <PriorityTaskRow
                                            key={task.id}
                                            task={task}
                                            phases={phases}
                                            onViewDetail={goTaskDetail}
                                        />
                                    ))}
                                    {taskStats.total - taskStats.done > priorityTasks.length && (
                                        <button onClick={() => navigate(`${base}/phases`)} style={{
                                            marginTop: 8, width: '100%', padding: '7px 0', borderRadius: 8,
                                            fontSize: 11, fontWeight: 800, cursor: 'pointer',
                                            background: 'var(--t-surface2)', color: 'var(--t-text2)',
                                            border: '1px solid var(--t-border)',
                                        }}>
                                            View all {taskStats.total - taskStats.done} pending tasks →
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Budget summary + activity + stock */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                        {/* Budget summary */}
                        <div style={{
                            background: 'var(--t-surface)', borderRadius: 14,
                            border: '1px solid var(--t-border)', padding: 20,
                        }}>
                            <SectionHead
                                label="Budget Summary"
                                action="Finance"
                                onAction={() => navigate(`${base}/finance`)}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                                {[
                                    { label: 'Budget',    value: formatCurrency ? formatCurrency(budgetStats?.totalBudget) : `Rs.${(budgetStats?.totalBudget||0).toLocaleString()}`, color: '#f97316' },
                                    { label: 'Spent',     value: formatCurrency ? formatCurrency(budgetStats?.totalSpent)  : `Rs.${(budgetStats?.totalSpent ||0).toLocaleString()}`, color: overBudget ? '#ef4444' : '#3b82f6' },
                                    { label: 'Cash',      value: formatCurrency ? formatCurrency(budgetStats?.availableCash) : '—', color: '#10b981' },
                                    { label: 'Payable',   value: formatCurrency ? formatCurrency(budgetStats?.totalPayables) : '—', color: '#f59e0b' },
                                ].map(s => (
                                    <div key={s.label} style={{
                                        padding: '10px 12px', borderRadius: 10,
                                        background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
                                    }}>
                                        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                                        <div style={{ fontSize: 13, fontWeight: 900, color: s.color }}>{s.value}</div>
                                    </div>
                                ))}
                            </div>

                            <BudgetBar
                                label="Budget Used"
                                spent={budgetStats?.totalSpent || 0}
                                budget={budgetStats?.totalBudget || 1}
                                color={overBudget ? '#ef4444' : '#f97316'}
                            />
                            {budgetStats?.netPosition !== undefined && budgetStats?.netPosition !== null && (
                                <div style={{
                                    marginTop: 10, padding: '8px 12px', borderRadius: 8,
                                    background: budgetStats.netPosition >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                                    border: `1px solid ${budgetStats.netPosition >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-text3)' }}>Net Position</span>
                                    <span style={{
                                        fontSize: 14, fontWeight: 900,
                                        color: budgetStats.netPosition >= 0 ? '#10b981' : '#ef4444',
                                    }}>
                                        {formatCurrency ? formatCurrency(budgetStats.netPosition) : `Rs.${budgetStats.netPosition.toLocaleString()}`}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Task stat chips */}
                        <div style={{
                            background: 'var(--t-surface)', borderRadius: 14,
                            border: '1px solid var(--t-border)', padding: 20,
                        }}>
                            <SectionHead label="Task Overview" action="Manage" onAction={() => navigate(`${base}/phases`)} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {[
                                    { label: 'Total',      value: taskStats.total,   color: 'var(--t-text)' },
                                    { label: 'Done',       value: taskStats.done,    color: '#10b981' },
                                    { label: 'In Progress',value: taskStats.inProg,  color: '#3b82f6' },
                                    { label: 'Blocked',    value: taskStats.blocked, color: '#f59e0b' },
                                    { label: 'Overdue',    value: taskStats.overdue, color: taskStats.overdue > 0 ? '#ef4444' : 'var(--t-text3)' },
                                    { label: 'Completion', value: `${taskStats.pct}%`, color: '#6366f1' },
                                ].map(s => (
                                    <div key={s.label} style={{
                                        padding: '10px 12px', borderRadius: 10, textAlign: 'center',
                                        background: 'var(--t-surface2)', border: '1px solid var(--t-border)',
                                    }}>
                                        <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                                        <div style={{ fontSize: 9, color: 'var(--t-text3)', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Low stock alert */}
                        {lowStockItems.length > 0 && (
                            <div style={{
                                background: 'var(--t-surface)', borderRadius: 14,
                                border: '1px solid rgba(239,68,68,0.25)', padding: 20,
                            }}>
                                <SectionHead
                                    label={`⚠ Low Stock (${lowStockItems.length})`}
                                    action="Resources"
                                    onAction={() => navigate(`${base}/resource`)}
                                />
                                {lowStockItems.map(item => (
                                    <div key={item.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '7px 0', borderBottom: '1px solid var(--t-border)',
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)' }}>{item.name}</div>
                                            <div style={{ fontSize: 10, color: '#ef4444' }}>
                                                {item.current_stock} {item.unit} (min: {item.min_stock_level})
                                            </div>
                                        </div>
                                        <span style={{ fontSize: 18 }}>📦</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Recent activity */}
                        {recentActivities && recentActivities.length > 0 && (
                            <div style={{
                                background: 'var(--t-surface)', borderRadius: 14,
                                border: '1px solid var(--t-border)', padding: 20,
                            }}>
                                <SectionHead label="Recent Activity" />
                                {recentActivities.slice(0, 6).map((a, i) => (
                                    <ActivityItem key={i} activity={a} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Quick Actions grid ── */}
                <div style={{
                    background: 'var(--t-surface)', borderRadius: 14,
                    border: '1px solid var(--t-border)', padding: 20,
                }}>
                    <SectionHead label="Quick Access" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                        {quickActions.map(a => (
                            <QuickAction key={a.title} {...a} onClick={() => go(a.path)} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
