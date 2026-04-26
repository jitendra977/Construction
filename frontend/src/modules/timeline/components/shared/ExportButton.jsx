/**
 * ExportButton — print / export timeline as PDF via browser print dialog.
 */
import React, { useState } from 'react';
import { useTimeline } from '../../context/TimelineContext';

export default function ExportButton() {
    const { phases, filteredTasks, criticalPathIds, viewMode } = useTimeline();
    const [open, setOpen] = useState(false);

    function printPage() {
        window.print();
        setOpen(false);
    }

    function exportCSV() {
        const headers = ['Task', 'Phase', 'Status', 'Priority', 'Progress%', 'Start', 'Due', 'Est. Cost (NPR)', 'Critical Path'];
        const phaseMap = Object.fromEntries(phases.map(p => [p.id, p.name]));

        const rows = filteredTasks.map(t => [
            `"${t.title.replace(/"/g, '""')}"`,
            `"${phaseMap[t.phase] || ''}"`,
            t.status,
            t.priority,
            t.progress_percentage || 0,
            t.start_date || '',
            t.due_date || '',
            t.estimated_cost || 0,
            criticalPathIds.includes(t.id) ? 'YES' : 'NO',
        ]);

        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `timeline_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setOpen(false);
    }

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: '1px solid var(--t-border)', background: 'var(--t-surface2)',
                    color: 'var(--t-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}
            >
                📤 Export
            </button>

            {open && (
                <>
                    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
                    <div style={{
                        position: 'absolute', right: 0, top: '110%', zIndex: 31,
                        background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                        borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        minWidth: 160, overflow: 'hidden',
                    }}>
                        <button onClick={exportCSV} style={{
                            width: '100%', padding: '10px 16px', textAlign: 'left',
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            fontSize: 13, color: 'var(--t-text)', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}
                            className="hover:bg-[var(--t-surface2)]"
                        >
                            📊 Export CSV
                        </button>
                        <button onClick={printPage} style={{
                            width: '100%', padding: '10px 16px', textAlign: 'left',
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            fontSize: 13, color: 'var(--t-text)', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 8,
                            borderTop: '1px solid var(--t-border)',
                        }}
                            className="hover:bg-[var(--t-surface2)]"
                        >
                            🖨️ Print / Save PDF
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
