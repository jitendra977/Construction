import { describe, expect, it } from 'vitest';
import { daysUntilDate, isTaskOverdue } from '../shared/utils/taskSchedule';
import { getProjectTimeline } from '../shared/utils/projectTimeline';

const now = new Date(2026, 5, 20, 15, 30);

describe('construction schedule rules', () => {
    it('does not mark today, completed tasks, or tasks in completed phases overdue', () => {
        expect(daysUntilDate('2026-06-20', now)).toBe(0);
        expect(isTaskOverdue({ due_date: '2026-06-20', status: 'PENDING' }, [], now)).toBe(false);
        expect(isTaskOverdue({ due_date: '2026-06-01', status: 'COMPLETED' }, [], now)).toBe(false);
        expect(isTaskOverdue(
            { due_date: '2026-06-01', status: 'PENDING', phase: 4 },
            [{ id: 4, status: 'COMPLETED' }],
            now
        )).toBe(false);
    });

    it('marks only unfinished work in an unfinished phase overdue', () => {
        expect(isTaskOverdue(
            { due_date: '2026-06-01', status: 'IN_PROGRESS', phase: 4 },
            [{ id: 4, status: 'IN_PROGRESS' }],
            now
        )).toBe(true);
    });

    it('shows elapsed and remaining project time in calendar units', () => {
        expect(getProjectTimeline({
            start_date: '2026-05-18',
            expected_completion_date: '2026-12-22',
        }, [{ status: 'IN_PROGRESS' }], now)).toMatchObject({
            runningLabel: 'Running 1 month 2 days',
            targetLabel: '6 months 2 days left',
        });
    });

    it('shows a finished project instead of time left', () => {
        expect(getProjectTimeline({ expected_completion_date: '2026-12-22' }, [
            { status: 'COMPLETED' },
            { status: 'COMPLETED' },
        ], now).targetLabel).toBe('Project finished');
    });
});
