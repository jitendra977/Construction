const WORKFLOW = {
    task: {
        PENDING: { currentLabel: 'Not Started', label: 'Start Work', icon: '▶', nextStatus: 'IN_PROGRESS', color: '#2563eb', dateHint: 'Start date will be set to today' },
        IN_PROGRESS: { currentLabel: 'Work in Progress', label: 'Finish Work', icon: '🏁', nextStatus: 'COMPLETED', color: '#059669', dateHint: 'Finish date will be set to today' },
        BLOCKED: { currentLabel: 'Work Paused', label: 'Resume Work', icon: '▶', nextStatus: 'IN_PROGRESS', color: '#2563eb', dateHint: 'Work will continue with the original start date' },
        COMPLETED: { currentLabel: 'Work Finished', label: 'Reopen Work', icon: '↻', nextStatus: 'IN_PROGRESS', color: '#d97706', dateHint: 'Finish date will be cleared' },
    },
    phase: {
        PENDING: { currentLabel: 'Not Started', label: 'Start Phase', icon: '▶', nextStatus: 'IN_PROGRESS', color: '#2563eb', dateHint: 'Start date will be set to today' },
        IN_PROGRESS: { currentLabel: 'Phase in Progress', label: 'Finish Phase', icon: '🏁', nextStatus: 'COMPLETED', color: '#059669', dateHint: 'End date will be set to today' },
        HALTED: { currentLabel: 'Phase Paused', label: 'Resume Phase', icon: '▶', nextStatus: 'IN_PROGRESS', color: '#2563eb', dateHint: 'Phase will continue with the original start date' },
        COMPLETED: { currentLabel: 'Phase Finished', label: 'Reopen Phase', icon: '↻', nextStatus: 'IN_PROGRESS', color: '#d97706', dateHint: 'End date will be cleared' },
    },
};

export const getStatusAction = (type, status) => (
    WORKFLOW[type]?.[status] || WORKFLOW[type]?.PENDING
);
