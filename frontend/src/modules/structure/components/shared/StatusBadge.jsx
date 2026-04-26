import React from 'react';

export const STATUS_MAP = {
    NOT_STARTED: { label: 'Not Started', np: 'सुरु भएन',  dot: '#94a3b8', bg: '#f1f5f9', text: '#64748b' },
    IN_PROGRESS:  { label: 'In Progress', np: 'काम जारी',  dot: '#3b82f6', bg: '#dbeafe', text: '#1d4ed8' },
    COMPLETED:    { label: 'Completed',   np: 'सकियो',    dot: '#10b981', bg: '#d1fae5', text: '#065f46' },
};

export default function StatusBadge({ status }) {
    const s = STATUS_MAP[status] || STATUS_MAP.NOT_STARTED;
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: s.bg, color: s.text }}
        >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
            {s.label}
        </span>
    );
}
