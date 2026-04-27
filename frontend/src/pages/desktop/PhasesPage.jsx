/**
 * PhasesPage — standalone Phase & Task Manager page.
 *
 * Three views managed inline (no modals):
 *   list  → PhasesTab  (all phases + inline tasks)
 *   phase → PhaseDetailPanel  (click "Detail →" on a phase)
 *   task  → TaskDetailPanel   (click "Detail" on a task row)
 */
import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import { usePlatformBase } from '../../shared/utils/platformNav';
import { useNavigate } from 'react-router-dom';
import ManagementTabs from '../../components/desktop/manage/ManagementTabs';
import PhasesTab from '../../components/desktop/manage/PhasesTab';
import PhaseDetailPanel from '../../components/desktop/manage/PhaseDetailPanel';
import TaskDetailPanel from '../../components/desktop/manage/TaskDetailPanel';

export default function PhasesPage() {
    const { dashboardData } = useConstruction();
    const base     = usePlatformBase();
    const navigate = useNavigate();

    const phases    = dashboardData?.phases || [];
    const tasks     = dashboardData?.tasks  || [];
    const done      = phases.filter(p => p.status === 'COMPLETED').length;
    const inProg    = phases.filter(p => p.status === 'IN_PROGRESS').length;
    const tasksDone = tasks.filter(t => t.status === 'COMPLETED').length;

    // view: { type:'list' } | { type:'phase', phase } | { type:'task', taskId, fromPhase }
    const [view,   setView]   = useState({ type: 'list' });
    const [search, setSearch] = useState('');

    const goPhase = (phase)             => setView({ type: 'phase', phase });
    const goTask  = (task, fromPhase)   => setView({ type: 'task', taskId: task.id, fromPhase: fromPhase || null });
    const goList  = ()                  => setView({ type: 'list' });
    const goBack  = ()                  => {
        if (view.type === 'task' && view.fromPhase) {
            setView({ type: 'phase', phase: view.fromPhase });
        } else {
            goList();
        }
    };

    const isDetail = view.type !== 'list';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--t-bg)' }}>
            <ManagementTabs />

            {/* ── Sticky header — only in list view ── */}
            {!isDetail && (
                <div style={{
                    position: 'sticky', top: 0, zIndex: 30,
                    background: 'var(--t-surface)',
                    borderBottom: '1px solid var(--t-border)',
                    padding: '14px 24px',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 20, background: 'rgba(249,115,22,0.12)',
                            border: '1px solid rgba(249,115,22,0.25)',
                        }}>📋</div>

                        <div>
                            <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: 'var(--t-text)' }}>
                                Phase &amp; Task Manager
                            </p>
                            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--t-text3)', letterSpacing: '0.06em' }}>
                                {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {phases.length} phase{phases.length !== 1 ? 's' : ''}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{
                                fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 6,
                                textTransform: 'uppercase', letterSpacing: '0.1em',
                                background: 'rgba(16,185,129,0.10)', color: '#10b981',
                                border: '1px solid rgba(16,185,129,0.22)',
                            }}>✓ {done} done</span>

                            {inProg > 0 && (
                                <span style={{
                                    fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 6,
                                    textTransform: 'uppercase', letterSpacing: '0.1em',
                                    background: 'rgba(59,130,246,0.10)', color: '#3b82f6',
                                    border: '1px solid rgba(59,130,246,0.22)',
                                }}>◎ {inProg} active</span>
                            )}

                            <span style={{
                                fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 6,
                                textTransform: 'uppercase', letterSpacing: '0.1em',
                                background: 'rgba(249,115,22,0.10)', color: '#f97316',
                                border: '1px solid rgba(249,115,22,0.22)',
                            }}>{tasksDone}/{tasks.length} tasks</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute', left: 10, top: '50%',
                                transform: 'translateY(-50%)', fontSize: 12, opacity: 0.35,
                                pointerEvents: 'none',
                            }}>🔍</span>
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search phases & tasks…"
                                style={{
                                    paddingLeft: 30, paddingRight: search ? 28 : 12,
                                    paddingTop: 7, paddingBottom: 7,
                                    borderRadius: 10, fontSize: 12, fontWeight: 600,
                                    border: '1px solid var(--t-border)',
                                    background: 'var(--t-bg)',
                                    color: 'var(--t-text)', outline: 'none', width: 220,
                                }}
                            />
                            {search && (
                                <button onClick={() => setSearch('')} style={{
                                    position: 'absolute', right: 8, top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none', border: 'none',
                                    cursor: 'pointer', fontSize: 11,
                                    color: 'var(--t-text3)', padding: 0,
                                }}>✕</button>
                            )}
                        </div>

                        <button onClick={() => navigate(`${base}/timeline`)} style={{
                            padding: '7px 14px', borderRadius: 10, fontSize: 11, fontWeight: 800,
                            border: '1px solid rgba(59,130,246,0.35)',
                            background: 'rgba(59,130,246,0.08)',
                            color: '#3b82f6', cursor: 'pointer',
                            whiteSpace: 'nowrap', letterSpacing: '0.02em',
                        }}>📅 Timeline</button>
                    </div>
                </div>
            )}

            {/* ── Views ── */}
            {view.type === 'list' && (
                <div style={{ padding: '20px 24px 96px' }}>
                    <PhasesTab
                        searchQuery={search}
                        onPhaseClick={goPhase}
                        onTaskClick={(task) => goTask(task, null)}
                    />
                </div>
            )}

            {view.type === 'phase' && (
                <div style={{ paddingBottom: 96 }}>
                    <PhaseDetailPanel
                        phase={view.phase}
                        onBack={goList}
                        onTaskClick={(task) => goTask(task, view.phase)}
                    />
                </div>
            )}

            {view.type === 'task' && (
                <div style={{ paddingBottom: 96 }}>
                    <TaskDetailPanel
                        taskId={view.taskId}
                        onBack={goBack}
                        onPhaseClick={(phase) => setView({ type: 'phase', phase })}
                    />
                </div>
            )}
        </div>
    );
}
