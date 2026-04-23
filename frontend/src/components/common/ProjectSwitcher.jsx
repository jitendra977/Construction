import React, { useState, useRef, useEffect } from 'react';
import { useConstruction } from '../../context/ConstructionContext';

/**
 * ProjectSwitcher — dropdown to switch between HouseProject instances.
 * Shows in sidebar header. Active project name is highlighted.
 */
const ProjectSwitcher = ({ collapsed = false }) => {
    const { projects, activeProjectId, switchProject, dashboardData } = useConstruction();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const activeProject = dashboardData?.project;
    const activeLabel = activeProject?.name ?? 'Select Project';

    // Short label for collapsed sidebar
    const shortLabel = activeProject?.name
        ? activeProject.name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()
        : '?';

    const handleSelect = async (id) => {
        setOpen(false);
        await switchProject(id);
    };

    if (!projects || projects.length === 0) return null;

    return (
        <div ref={ref} className="relative w-full">
            <button
                onClick={() => setOpen(o => !o)}
                title={activeLabel}
                className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-xl
                    bg-[var(--t-surface2)] border border-[var(--t-border)]
                    hover:border-[var(--t-primary)] transition-all duration-200
                    text-left group
                `}
            >
                {/* Colour dot */}
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--t-primary)] shrink-0" />

                {!collapsed && (
                    <>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-widest text-[var(--t-text3)] leading-none mb-0.5">
                                Active Project
                            </p>
                            <p className="text-xs font-bold text-[var(--t-text)] truncate leading-tight">
                                {activeLabel}
                            </p>
                        </div>
                        <svg
                            className={`w-3.5 h-3.5 shrink-0 text-[var(--t-text3)] transition-transform ${open ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </>
                )}

                {collapsed && (
                    <span className="text-[10px] font-black text-[var(--t-text)] tracking-wider">
                        {shortLabel}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-xl shadow-xl border border-[var(--t-border)] bg-[var(--t-surface)] overflow-hidden">
                    <div className="px-3 pt-2.5 pb-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)]">
                            Switch Project
                        </p>
                    </div>
                    <ul className="py-1 max-h-72 overflow-y-auto">
                        {projects.map((proj) => {
                            const isActive = String(proj.id) === String(activeProjectId) ||
                                (!activeProjectId && proj.id === activeProject?.id);
                            return (
                                <li key={proj.id}>
                                    <button
                                        onClick={() => handleSelect(proj.id)}
                                        className={`
                                            w-full flex items-start gap-3 px-3 py-2.5 text-left
                                            hover:bg-[var(--t-surface2)] transition-colors
                                            ${isActive ? 'bg-[var(--t-surface2)]' : ''}
                                        `}
                                    >
                                        <span className={`
                                            mt-0.5 w-2.5 h-2.5 rounded-full shrink-0
                                            ${isActive ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-border)]'}
                                        `} />
                                        <div className="min-w-0">
                                            <p className={`text-xs font-bold truncate leading-snug ${isActive ? 'text-[var(--t-primary)]' : 'text-[var(--t-text)]'}`}>
                                                {proj.name}
                                            </p>
                                            <p className="text-[10px] text-[var(--t-text3)] truncate">
                                                {proj.owner_name} · NPR {Number(proj.total_budget).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        {isActive && (
                                            <svg className="ml-auto w-3.5 h-3.5 shrink-0 text-[var(--t-primary)] mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ProjectSwitcher;
