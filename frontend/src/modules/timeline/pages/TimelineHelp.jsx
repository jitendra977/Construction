/**
 * TimelineHelp — comprehensive help & docs page for the Timeline module.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SECTIONS = [
    {
        id: 'overview',
        icon: '📅',
        title: 'Overview',
        content: `The Timeline module gives you a full picture of your construction schedule across all phases and tasks. You can switch between four views — Gantt, Calendar, List, and Kanban — to see your project from different angles.

The module is linked to the active project selected in the sidebar. Use the project dropdown in the toolbar to switch between projects without leaving the timeline.`,
    },
    {
        id: 'gantt',
        icon: '📊',
        title: 'Gantt View',
        content: `The Gantt chart shows phases and tasks as horizontal bars on a date axis.

• Phase bars (taller, colored by status) span from phase start_date to end_date.
• Task bars (narrower) appear below their phase. The lighter fill inside a bar shows progress %.
• A red 🔴 outlined bar means that task is on the Critical Path (cannot be delayed without pushing the project end date).
• The vertical orange line marks today's date.
• Scroll right to see future dates; the ruler shows months and week markers.

Tips:
- Click any task bar to open the Task Detail Drawer.
- If a task has no start/due dates it will not appear in the Gantt. Set dates in Manage → Phases.`,
    },
    {
        id: 'calendar',
        icon: '📅',
        title: 'Calendar View',
        content: `The calendar shows a monthly grid with task and phase events.

• 📌 Phase chips appear on every day within a phase's date range.
• ▶ chips mark task start dates; ⏰ chips mark due dates.
• ⚡ suffix indicates a Critical Path task.
• The orange circle highlights today.
• Navigate months with the ‹ › arrows. Click "Today" to jump back.

Limit: only 3 events are shown per cell. Look for "+N more" if a day is busy.`,
    },
    {
        id: 'list',
        icon: '📋',
        title: 'List View',
        content: `A sortable, filterable table of all tasks across all phases.

Columns:
• Task — title, dependency icon 🔗, and ⚡CP badge for critical tasks.
• Phase — which construction phase the task belongs to.
• Status — color-coded badge (Done / In Progress / Blocked / Pending).
• Priority — CRITICAL / HIGH / MEDIUM / LOW.
• Progress — mini bar with percentage.
• Start / Due — dates with a days-remaining or overdue counter.
• Cost — estimated cost in NPR.

Click any column header to sort ascending/descending. Use the filter bar to narrow by status, phase, and priority, or type in the search box.

Row highlighting: red left border = Critical Path task; yellow tint = overdue.`,
    },
    {
        id: 'kanban',
        icon: '🗂️',
        title: 'Kanban View',
        content: `Four columns: Pending → In Progress → Blocked → Done.

Drag a card from one column to another to instantly update its status (saved to the server automatically). The card turns semi-transparent while dragging.

Each card shows:
• Priority dot (red = CRITICAL, orange = HIGH, yellow = MEDIUM, grey = LOW).
• ⚡CP badge if on the critical path.
• Progress bar.
• 🔗 dependency notice if the task has a blocked_by relation.
• Due date or overdue warning.

Click a card to open the Task Detail Drawer for a full edit.`,
    },
    {
        id: 'critical',
        icon: '⚡',
        title: 'Critical Path',
        content: `The Critical Path is the longest chain of dependent tasks that determines the minimum project duration. Any delay on a Critical Path task directly delays the project finish.

How it works:
1. The system reads task dependencies (blocked_by relationships).
2. It performs a forward pass (Earliest Start / Finish) and backward pass (Latest Start / Finish).
3. Tasks with zero float (LS – ES = 0) are on the Critical Path.

Visual indicators:
• Gantt: red border + red glow on bar.
• List: ⚡CP badge + red left border.
• Kanban: red card border + ⚡CP badge.
• Task Drawer: red CRITICAL PATH banner + stats panel (duration, float, ES, EF).

To shorten the critical path: add resources to CP tasks, split work, or remove dependencies.`,
    },
    {
        id: 'dependencies',
        icon: '🔗',
        title: 'Task Dependencies',
        content: `Dependencies are set via the "blocked_by" field on a task. A task with a dependency cannot logically start until its predecessor is complete.

To set a dependency:
1. Go to Manage → Phases → open a task.
2. In the task form, set "Blocked By" to the predecessor task.

The Timeline module then:
• Shows 🔗 icons on dependent tasks in List/Kanban views.
• Includes dependency info in the Task Detail Drawer.
• Uses the dependency graph for the Critical Path algorithm.

Circular dependencies are handled gracefully — the system detects cycles and still shows all tasks.`,
    },
    {
        id: 'progress',
        icon: '📈',
        title: 'Progress & Updates',
        content: `Each task has a progress_percentage (0–100). You can update it in two ways:

1. Task Detail Drawer: drag the Progress slider, then click "Save Changes".
2. Post a Progress Note: write a note and the current % is saved as a dated TaskUpdate entry.

The Update Log shows all notes in reverse chronological order (newest first), each with its own progress snapshot.

When progress reaches 100%, the task status is automatically set to COMPLETED.

The progress bar appears in Gantt bars (as a lighter fill), Kanban cards, and the List view.`,
    },
    {
        id: 'export',
        icon: '📤',
        title: 'Export & Print',
        content: `Click the 📤 Export button in the top-right toolbar to access export options:

• Export CSV — downloads a .csv file with all currently filtered tasks (respects your active filters). Columns: Task, Phase, Status, Priority, Progress%, Start, Due, Est. Cost, Critical Path.

• Print / Save PDF — opens the browser print dialog. Switch to any view (Gantt, List, etc.) before printing to capture that layout. In Chrome/Edge, choose "Save as PDF" as the destination.

Tip: apply filters first to export only what you need (e.g., only IN_PROGRESS tasks in Phase 3).`,
    },
    {
        id: 'filters',
        icon: '🔍',
        title: 'Filters & Search',
        content: `The filter bar (below the toolbar) lets you narrow down which tasks are visible across all views simultaneously.

• Search box — live search by task title.
• Status — filter to one status (or show all).
• Phase — show only tasks from a specific construction phase.
• Priority — filter to CRITICAL, HIGH, MEDIUM, or LOW.

Filters are reset when you reload the page or switch projects. The task count on the right of the filter bar shows how many tasks match.`,
    },
];

export default function TimelineHelp() {
    const navigate = useNavigate();
    const [active, setActive] = useState('overview');

    const section = SECTIONS.find(s => s.id === active) || SECTIONS[0];

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--t-bg)' }}>
            {/* ── Sidebar ─────────────────────────────────────────── */}
            <div style={{
                width: 220, flexShrink: 0, background: 'var(--t-surface)',
                borderRight: '1px solid var(--t-border)', overflowY: 'auto',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* Back */}
                <button onClick={() => navigate(-1)} style={{
                    padding: '12px 16px', textAlign: 'left', border: 'none',
                    borderBottom: '1px solid var(--t-border)',
                    background: 'transparent', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, color: '#f97316',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    ← Back to Timeline
                </button>

                <div style={{ padding: '12px 10px' }}>
                    <p style={{ margin: '0 0 8px 6px', fontSize: 9, fontWeight: 800, color: 'var(--t-text3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Help Topics
                    </p>
                    {SECTIONS.map(s => (
                        <button key={s.id} onClick={() => setActive(s.id)} style={{
                            width: '100%', padding: '8px 12px', textAlign: 'left',
                            borderRadius: 8, border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: 12, fontWeight: active === s.id ? 800 : 600,
                            background: active === s.id ? 'rgba(249,115,22,0.12)' : 'transparent',
                            color: active === s.id ? '#f97316' : 'var(--t-text)',
                            marginBottom: 2,
                        }}>
                            <span style={{ fontSize: 14 }}>{s.icon}</span>
                            {s.title}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Content ─────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', maxWidth: 720 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <span style={{ fontSize: 32 }}>{section.icon}</span>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--t-text)' }}>
                        {section.title}
                    </h1>
                </div>

                <div style={{
                    padding: '20px 24px', borderRadius: 12,
                    background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                }}>
                    {section.content.split('\n\n').map((para, i) => {
                        // Detect bullet lists
                        if (para.includes('\n•')) {
                            const [intro, ...lines] = para.split('\n');
                            return (
                                <div key={i} style={{ marginBottom: 16 }}>
                                    {intro && <p style={{ margin: '0 0 8px', color: 'var(--t-text)', lineHeight: 1.7, fontSize: 14 }}>{intro}</p>}
                                    {lines.map((line, j) => (
                                        <div key={j} style={{
                                            display: 'flex', gap: 8, marginBottom: 4,
                                            alignItems: 'flex-start',
                                        }}>
                                            <span style={{ color: '#f97316', fontWeight: 800, flexShrink: 0 }}>•</span>
                                            <span style={{ color: 'var(--t-text2)', fontSize: 13, lineHeight: 1.6 }}>
                                                {line.replace('• ', '')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        }
                        return (
                            <p key={i} style={{
                                margin: '0 0 14px', color: 'var(--t-text)',
                                lineHeight: 1.75, fontSize: 14,
                            }}>
                                {para}
                            </p>
                        );
                    })}
                </div>

                {/* ── Navigation ───────────────────────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                    {SECTIONS[SECTIONS.findIndex(s => s.id === active) - 1] ? (
                        <button onClick={() => setActive(SECTIONS[SECTIONS.findIndex(s => s.id === active) - 1].id)} style={{
                            padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
                            color: 'var(--t-text)', cursor: 'pointer',
                        }}>
                            ← Previous
                        </button>
                    ) : <div />}
                    {SECTIONS[SECTIONS.findIndex(s => s.id === active) + 1] && (
                        <button onClick={() => setActive(SECTIONS[SECTIONS.findIndex(s => s.id === active) + 1].id)} style={{
                            padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            border: '1px solid #f97316', background: '#f97316',
                            color: '#fff', cursor: 'pointer',
                        }}>
                            Next →
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
