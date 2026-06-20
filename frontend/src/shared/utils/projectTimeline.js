const parseDateOnly = (value) => {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
};

const todayOnly = (now) => new Date(now.getFullYear(), now.getMonth(), now.getDate());

function calendarParts(from, to) {
    let cursor = new Date(from);
    let years = to.getFullYear() - cursor.getFullYear();
    cursor.setFullYear(cursor.getFullYear() + years);
    if (cursor > to) {
        years -= 1;
        cursor = new Date(from);
        cursor.setFullYear(cursor.getFullYear() + years);
    }

    let months = (to.getFullYear() - cursor.getFullYear()) * 12 + to.getMonth() - cursor.getMonth();
    const monthCursor = new Date(cursor);
    monthCursor.setMonth(monthCursor.getMonth() + months);
    if (monthCursor > to) months -= 1;
    cursor.setMonth(cursor.getMonth() + months);

    const days = Math.round((to.getTime() - cursor.getTime()) / 86400000);
    return { years, months, days };
}

export function formatCalendarDuration(from, to) {
    const parts = calendarParts(from <= to ? from : to, from <= to ? to : from);
    const values = [
        parts.years > 0 && `${parts.years} ${parts.years === 1 ? 'year' : 'years'}`,
        parts.months > 0 && `${parts.months} ${parts.months === 1 ? 'month' : 'months'}`,
        parts.days > 0 && `${parts.days} ${parts.days === 1 ? 'day' : 'days'}`,
    ].filter(Boolean);
    return values.slice(0, 2).join(' ') || '0 days';
}

export function getProjectTimeline(project = {}, phases = [], now = new Date()) {
    const today = todayOnly(now);
    const start = parseDateOnly(project.start_date);
    const target = parseDateOnly(project.expected_completion_date);
    const isFinished = phases.length > 0 && phases.every(phase => phase.status === 'COMPLETED');

    let runningLabel = 'Start date not set';
    if (start) {
        runningLabel = start > today
            ? `Starts in ${formatCalendarDuration(today, start)}`
            : `Running ${formatCalendarDuration(start, today)}`;
    }

    let targetLabel = 'Target date not set';
    let targetTone = '#6b7280';
    if (isFinished) {
        targetLabel = 'Project finished';
        targetTone = '#10b981';
    } else if (target) {
        if (target > today) {
            targetLabel = `${formatCalendarDuration(today, target)} left`;
            targetTone = '#10b981';
        } else if (target.getTime() === today.getTime()) {
            targetLabel = 'Target is today';
            targetTone = '#f59e0b';
        } else {
            targetLabel = `${formatCalendarDuration(target, today)} past target`;
            targetTone = '#ef4444';
        }
    }

    return { runningLabel, targetLabel, targetTone };
}
