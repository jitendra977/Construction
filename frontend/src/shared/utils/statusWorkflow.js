const WORKFLOW = {
    task: {
        PENDING: { label: 'Start Task', icon: '▶', nextStatus: 'IN_PROGRESS', color: '#2563eb' },
        IN_PROGRESS: { label: 'Complete Task', icon: '✓', nextStatus: 'COMPLETED', color: '#059669' },
        BLOCKED: { label: 'Resume Task', icon: '▶', nextStatus: 'IN_PROGRESS', color: '#2563eb' },
        COMPLETED: { label: 'Reopen Task', icon: '↻', nextStatus: 'IN_PROGRESS', color: '#d97706' },
    },
    phase: {
        PENDING: { label: 'Start Phase', icon: '▶', nextStatus: 'IN_PROGRESS', color: '#2563eb' },
        IN_PROGRESS: { label: 'Complete Phase', icon: '✓', nextStatus: 'COMPLETED', color: '#059669' },
        HALTED: { label: 'Resume Phase', icon: '▶', nextStatus: 'IN_PROGRESS', color: '#2563eb' },
        COMPLETED: { label: 'Reopen Phase', icon: '↻', nextStatus: 'IN_PROGRESS', color: '#d97706' },
    },
};

export const getStatusAction = (type, status) => (
    WORKFLOW[type]?.[status] || WORKFLOW[type]?.PENDING
);
