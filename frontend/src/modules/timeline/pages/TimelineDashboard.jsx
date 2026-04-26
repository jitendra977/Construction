/**
 * TimelineDashboard — main page: switches between Gantt / Calendar / List / Kanban.
 */
import React, { useState } from 'react';
import { useTimeline } from '../context/TimelineContext';
import TimelineLayout from '../components/layout/TimelineLayout';
import GanttView from '../components/views/GanttView';
import CalendarView from '../components/views/CalendarView';
import ListView from '../components/views/ListView';
import KanbanView from '../components/views/KanbanView';
import TaskDetailDrawer from '../components/shared/TaskDetailDrawer';

export default function TimelineDashboard() {
    const { viewMode, phases, tasks } = useTimeline();
    const [selectedTask, setSelectedTask] = useState(null);

    const noData = phases.length === 0 && tasks.length === 0;

    return (
        <TimelineLayout>
            {noData ? (
                <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    height: '100%', textAlign: 'center', padding: 40,
                }}>
                    <p style={{ fontSize: 56, marginBottom: 12 }}>📅</p>
                    <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: 'var(--t-text)' }}>
                        No timeline data yet
                    </h2>
                    <p style={{ color: 'var(--t-text3)', fontSize: 14, maxWidth: 360 }}>
                        Make sure you have an active project selected, and that phases and tasks
                        have been created with start / due dates.
                    </p>
                </div>
            ) : (
                <>
                    {viewMode === 'gantt'    && <GanttView    onTaskClick={setSelectedTask} />}
                    {viewMode === 'calendar' && <CalendarView onTaskClick={setSelectedTask} />}
                    {viewMode === 'list'     && <ListView     onTaskClick={setSelectedTask} />}
                    {viewMode === 'kanban'   && <KanbanView   onTaskClick={setSelectedTask} />}
                </>
            )}

            {selectedTask && (
                <TaskDetailDrawer
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                />
            )}
        </TimelineLayout>
    );
}
