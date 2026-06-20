const DAY_MS = 24 * 60 * 60 * 1000;

const dateOnly = (value) => {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Number.isNaN(date.getTime()) ? null : date;
};

const phaseIdForTask = (task) => String(task?.phase?.id ?? task?.phase ?? task?.phase_id ?? '');

export function daysUntilDate(value, now = new Date()) {
    const target = dateOnly(value);
    if (!target) return null;
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

export function isParentPhaseCompleted(task, phases = []) {
    if (task?.phase_detail?.status === 'COMPLETED' || task?.phase_status === 'COMPLETED') return true;
    const phaseId = phaseIdForTask(task);
    return phases.some(phase => String(phase.id) === phaseId && phase.status === 'COMPLETED');
}

export function isTaskOverdue(task, phases = [], now = new Date()) {
    const daysLeft = daysUntilDate(task?.due_date, now);
    return daysLeft !== null
        && daysLeft < 0
        && task?.status !== 'COMPLETED'
        && !isParentPhaseCompleted(task, phases);
}
