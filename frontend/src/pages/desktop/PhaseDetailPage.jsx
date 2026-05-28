import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConstruction } from '../../context/ConstructionContext';
import { usePlatformBase } from '../../shared/utils/platformNav';
import ManagementTabs from '../../components/desktop/manage/ManagementTabs';
import PhaseDetailPanel from '../../components/desktop/manage/PhaseDetailPanel';
import TaskDetailPanel from '../../components/desktop/manage/TaskDetailPanel';

function useIsMobileLayout() {
    const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
    useEffect(() => {
        const fn = () => setMobile(window.innerWidth < 1024);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);
    return mobile;
}

export default function PhaseDetailPage() {
    const { id } = useParams();
    const { dashboardData } = useConstruction();
    const base = usePlatformBase();
    const navigate = useNavigate();
    const isMobile = useIsMobileLayout();

    const phases = dashboardData?.phases || [];
    const targetPhase = phases.find(p => p.id === parseInt(id));

    // view: { type: 'phase' } | { type: 'task', taskId: number }
    const [view, setView] = useState({ type: 'phase' });

    const goPhase = () => setView({ type: 'phase' });
    const goTask = (task) => setView({ type: 'task', taskId: task.id });
    const goList = () => navigate(`${base}/phases`);

    if (!targetPhase) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--t-bg)' }}>
                {!isMobile && <ManagementTabs />}
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--t-text)' }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Phase not found</h3>
                    <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--t-text3)' }}>
                        The requested phase could not be found or has been deleted.
                    </p>
                    <button onClick={goList} style={{
                        padding: '8px 16px', borderRadius: 8, border: 'none',
                        background: 'var(--t-primary)', color: '#fff', fontSize: 13, fontWeight: 700,
                        cursor: 'pointer'
                    }}>
                        Back to Phase List
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--t-bg)' }}>
            {!isMobile && <ManagementTabs />}

            {view.type === 'phase' && (
                <div style={{ paddingBottom: 96 }}>
                    <PhaseDetailPanel
                        phase={targetPhase}
                        onBack={goList}
                        onTaskClick={goTask}
                    />
                </div>
            )}

            {view.type === 'task' && (
                <div style={{ paddingBottom: 96 }}>
                    <TaskDetailPanel
                        taskId={view.taskId}
                        onBack={goPhase}
                    />
                </div>
            )}
        </div>
    );
}
