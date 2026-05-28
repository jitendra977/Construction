import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConstruction } from '../../context/ConstructionContext';
import { usePlatformBase } from '../../shared/utils/platformNav';
import ManagementTabs from '../../components/desktop/manage/ManagementTabs';
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

export default function TaskDetailPage() {
    const { id } = useParams();
    const { dashboardData } = useConstruction();
    const base = usePlatformBase();
    const navigate = useNavigate();
    const isMobile = useIsMobileLayout();

    const taskId = parseInt(id);
    const tasks = dashboardData?.tasks || [];
    const targetTask = tasks.find(t => t.id === taskId);

    const goBack = () => {
        if (targetTask && targetTask.phase_id) {
            navigate(`${base}/phases/${targetTask.phase_id}`);
        } else {
            navigate(`${base}/phases`);
        }
    };

    const goPhase = (phase) => {
        navigate(`${base}/phases/${phase.id}`);
    };

    if (!targetTask) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--t-bg)' }}>
                {!isMobile && <ManagementTabs />}
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--t-text)' }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Task not found</h3>
                    <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--t-text3)' }}>
                        The requested task could not be found or has been deleted.
                    </p>
                    <button onClick={() => navigate(`${base}/phases`)} style={{
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

            <div style={{ paddingBottom: 96 }}>
                <TaskDetailPanel
                    taskId={taskId}
                    onBack={goBack}
                    onPhaseClick={goPhase}
                />
            </div>
        </div>
    );
}
