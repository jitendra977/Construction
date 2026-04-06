import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import MobileLayout from './MobileLayout';

// Import Desktop Components (Reused for non-phases tabs)
import FloorsTab from '../desktop/manage/FloorsTab';
import ExpensesTab from '../desktop/manage/ExpensesTab';
import MobileContractorList from './MobileContractorList';
import MobileSupplierList from './MobileSupplierList';
import MobileMaterialList from './MobileMaterialList';
import MobileStockList from './MobileStockList';
import MobileCategoryList from './MobileCategoryList';
import FundingTab from '../desktop/manage/FundingTab';
import PaymentsTab from '../desktop/manage/PaymentsTab';
import TaskPreviewModal from '../desktop/manage/TaskPreviewModal';
import PhaseDetailModal from '../desktop/manage/PhaseDetailModal';

// ── Mobile Phase List ─────────────────────────────────────────────────────────
const MobilePhaseList = ({ searchQuery, onEditTask, onEditPhase }) => {
    const { dashboardData, formatCurrency } = useConstruction();
    const [expandedId, setExpandedId] = useState(null);

    const phases = (dashboardData.phases || []).filter(p =>
        p.name.toLowerCase().includes((searchQuery || '').toLowerCase())
    );

    const statusMeta = {
        COMPLETED: { label: 'Done', color: 'var(--t-primary2)', bg: 'oklch(from var(--t-primary2) l c h / 0.12)' },
        IN_PROGRESS: { label: 'Active', color: 'var(--t-primary)', bg: 'oklch(from var(--t-primary) l c h / 0.10)' },
        HALTED: { label: 'Halted', color: 'var(--t-danger)', bg: 'oklch(from var(--t-danger) l c h / 0.10)' },
        NOT_STARTED: { label: 'Pending', color: 'var(--t-text3)', bg: 'var(--t-surface2)' },
        PENDING: { label: 'Pending', color: 'var(--t-text3)', bg: 'var(--t-surface2)' },
    };

    if (phases.length === 0) {
        return (
            <div className="text-center py-14 text-[var(--t-text3)]">
                <div className="text-3xl mb-2">🏗️</div>
                <p className="text-sm font-semibold">No phases found</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {phases.map(phase => {
                const tasks = dashboardData.tasks?.filter(t => t.phase === phase.id) || [];
                const done = tasks.filter(t => t.status === 'COMPLETED').length;
                const total = tasks.length;
                const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                const meta = statusMeta[phase.status] || statusMeta.PENDING;
                const isExpanded = expandedId === phase.id;
                const isActive = phase.status === 'IN_PROGRESS';

                return (
                    <div
                        key={phase.id}
                        className="rounded-xl border overflow-hidden transition-all"
                        style={{
                            background: 'var(--t-surface)',
                            borderColor: isActive ? 'var(--t-primary)' : 'var(--t-border)',
                            boxShadow: isActive ? '0 0 0 1px color-mix(in srgb, var(--t-primary) 20%, transparent)' : 'none',
                        }}
                    >
                        {/* ── Main Row ── */}
                        <button
                            className="w-full text-left px-4 py-3.5"
                            onClick={() => setExpandedId(isExpanded ? null : phase.id)}
                        >
                            {/* Top line: Phase name + Budget */}
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    {/* Order badge */}
                                    <span
                                        className="shrink-0 w-6 h-6 rounded-md text-[10px] font-black flex items-center justify-center"
                                        style={{
                                            background: meta.bg,
                                            color: meta.color,
                                        }}
                                    >
                                        {phase.order}
                                    </span>
                                    {/* Phase name */}
                                    <span
                                        className="font-semibold text-sm truncate"
                                        style={{ color: isActive ? 'var(--t-primary)' : 'var(--t-text)' }}
                                    >
                                        {phase.name}
                                    </span>
                                    {isActive && (
                                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--t-primary)] animate-pulse" />
                                    )}
                                </div>

                                {/* Budget — right side */}
                                <span
                                    className="shrink-0 text-sm font-bold tabular-nums"
                                    style={{ color: 'var(--t-text)' }}
                                >
                                    {phase.estimated_budget
                                        ? formatCurrency(phase.estimated_budget)
                                        : <span className="text-[var(--t-text3)] text-xs">—</span>
                                    }
                                </span>
                            </div>

                            {/* Bottom line: Progress bar + stats */}
                            <div className="flex items-center gap-3">
                                {/* Progress bar */}
                                <div
                                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                                    style={{ background: 'var(--t-surface2)' }}
                                >
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${progress}%`,
                                            background: progress === 100
                                                ? 'var(--t-primary2)'
                                                : isActive
                                                    ? 'var(--t-primary)'
                                                    : 'var(--t-text3)',
                                        }}
                                    />
                                </div>
                                {/* Progress % */}
                                <span
                                    className="shrink-0 text-[11px] font-bold tabular-nums"
                                    style={{ color: meta.color, minWidth: '34px', textAlign: 'right' }}
                                >
                                    {progress}%
                                </span>
                                {/* Task count */}
                                <span className="shrink-0 text-[11px]" style={{ color: 'var(--t-text3)' }}>
                                    {done}/{total}
                                </span>
                                {/* Status pill */}
                                <span
                                    className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                    style={{ background: meta.bg, color: meta.color }}
                                >
                                    {meta.label}
                                </span>
                            </div>
                        </button>

                        {/* ── Expanded Task List ── */}
                        {isExpanded && (
                            <div
                                className="border-t px-4 py-3"
                                style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface2)' }}
                            >
                                <div className="flex gap-2 mb-3">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if(onEditPhase) onEditPhase(phase);
                                        }}
                                        className="flex-1 py-1.5 bg-[var(--t-primary)]/10 text-[var(--t-primary)] border border-[var(--t-primary)]/20 rounded-lg text-[10px] font-black uppercase tracking-widest active:bg-[var(--t-primary)]/20 transition-all text-center"
                                    >
                                        Phase Details
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                {tasks.length === 0 ? (
                                    <p className="text-xs text-[var(--t-text3)] text-center py-3 italic">No tasks yet</p>
                                ) : (
                                    tasks.map(task => {
                                        const isDone = task.status === 'COMPLETED';
                                        return (
                                            <div
                                                key={task.id}
                                                className="flex items-center gap-2.5 py-1.5"
                                            >
                                                {/* Checkbox indicator */}
                                                <span
                                                    className="shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[9px]"
                                                    style={{
                                                        borderColor: isDone ? 'var(--t-primary2)' : 'var(--t-border2)',
                                                        background: isDone ? 'var(--t-primary2)' : 'transparent',
                                                        color: '#fff',
                                                    }}
                                                >
                                                    {isDone && '✓'}
                                                </span>
                                                <div
                                                    className="flex-1 flex flex-col justify-center"
                                                >
                                                    <span 
                                                        className="text-sm leading-tight"
                                                        style={{
                                                            color: isDone ? 'var(--t-text3)' : 'var(--t-text)',
                                                            textDecoration: isDone ? 'line-through' : 'none',
                                                        }}
                                                    >
                                                        {task.title}
                                                    </span>
                                                    {task.priority === 'CRITICAL' && (
                                                        <span className="text-[9px] font-bold text-[var(--t-danger)] uppercase tracking-widest mt-0.5">Critical Priority</span>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if(onEditTask) onEditTask(task);
                                                    }}
                                                    className="shrink-0 ml-1 px-3 py-1.5 rounded-lg bg-[var(--t-surface3)] text-[var(--t-text2)] border border-[var(--t-border)] text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                                >
                                                    Details
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const MobileManage = () => {
    const { dashboardData } = useConstruction();
    const [activeSection, setActiveSection] = useState('structure');
    const [activeTab, setActiveTab] = useState('phases');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);
    const [showTaskPreview, setShowTaskPreview] = useState(false);
    const [selectedPhase, setSelectedPhase] = useState(null);
    const [showPhaseModal, setShowPhaseModal] = useState(false);

    const getTasksForPhase = (phaseId) => {
        if (!phaseId) return [];
        return (dashboardData.tasks || []).filter(t => t.phase === phaseId);
    };

    const sections = [
        {
            id: 'structure',
            label: 'Structure',
            nepali: 'संरचना',
            icon: '🏗️',
            tabs: [
                { id: 'phases', label: 'Schedule', nepali: 'कार्यतालिका' },
                { id: 'floors', label: 'Structure', nepali: 'संरचना' },
            ]
        },
        {
            id: 'finance',
            label: 'Finance',
            nepali: 'आर्थिक',
            icon: '💰',
            tabs: [
                { id: 'funding', label: 'Funding', nepali: 'लगानी' },
                { id: 'categories', label: 'Categories', nepali: 'शिर्षक' },
                { id: 'expenses', label: 'Expenses', nepali: 'खर्च' },
                { id: 'payments', label: 'Payments', nepali: 'भुक्तानी' },
            ]
        },
        {
            id: 'resources',
            label: 'Inventory',
            nepali: 'श्रोत',
            icon: '📦',
            tabs: [
                { id: 'suppliers', label: 'Suppliers', nepali: 'सप्लायर्स' },
                { id: 'contractors', label: 'Contractors', nepali: 'ठेकेदार' },
                { id: 'materials', label: 'Materials', nepali: 'सामग्री' },
                { id: 'stock', label: 'Stock', nepali: 'मौज्दात' },
            ]
        }
    ];

    const currentSection = sections.find(s => s.id === activeSection);
    const tabs = currentSection.tabs;

    const handleSectionChange = (sectionId) => {
        setActiveSection(sectionId);
        const section = sections.find(s => s.id === sectionId);
        setActiveTab(section.tabs[0].id);
        setSearchQuery('');
    };

    const handleEditTask = (task) => {
        setSelectedTask(task);
        setShowTaskPreview(true);
    };

    const handleEditPhase = (phase) => {
        setSelectedPhase(phase);
        setShowPhaseModal(true);
    };

    return (
        <MobileLayout>
            <div className="pb-28" style={{ background: 'var(--t-bg)' }}>

                {/* ── Sticky Nav Header ─────────────────────────────── */}
                <div
                    className="sticky top-[57px] z-30 -mx-0 border-b"
                    style={{
                        background: 'color-mix(in srgb, var(--t-bg) 95%, transparent)',
                        backdropFilter: 'blur(12px)',
                        borderColor: 'var(--t-border)',
                    }}
                >
                    {/* Section tabs */}
                    <div className="flex gap-0 overflow-x-auto scrollbar-hide border-b" style={{ borderColor: 'var(--t-border)' }}>
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => handleSectionChange(section.id)}
                                className="flex items-center gap-2 px-4 py-3 shrink-0 transition-all border-b-2 text-sm font-semibold"
                                style={{
                                    borderBottomColor: activeSection === section.id ? 'var(--t-primary)' : 'transparent',
                                    color: activeSection === section.id ? 'var(--t-primary)' : 'var(--t-text3)',
                                    background: activeSection === section.id
                                        ? 'color-mix(in srgb, var(--t-primary) 6%, transparent)'
                                        : 'transparent',
                                }}
                            >
                                <span className="text-base">{section.icon}</span>
                                <span>{section.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Sub-tabs */}
                    <div className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="shrink-0 flex flex-col items-start px-3 py-1.5 rounded-lg transition-all"
                                style={{
                                    background: activeTab === tab.id
                                        ? 'var(--t-primary)'
                                        : 'var(--t-surface)',
                                    color: activeTab === tab.id ? '#fff' : 'var(--t-text2)',
                                    border: `1px solid ${activeTab === tab.id ? 'transparent' : 'var(--t-border)'}`,
                                }}
                            >
                                <span className="text-[12px] font-semibold whitespace-nowrap">{tab.label}</span>
                                <span
                                    className="text-[9px] whitespace-nowrap"
                                    style={{ opacity: 0.65 }}
                                >
                                    {tab.nepali}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="px-3 pb-2">
                        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
                            <span className="text-[var(--t-text3)] text-sm">🔍</span>
                            <input
                                type="text"
                                placeholder={`Search ${tabs.find(t => t.id === activeTab)?.label}…`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-sm outline-none placeholder-[var(--t-text3)]"
                                style={{ color: 'var(--t-text)' }}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-[var(--t-text3)] text-xs">✕</button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Tab Content ───────────────────────────────────── */}
                <div className="px-3 pt-24">
                    {activeSection === 'structure' && (
                        <>
                            {activeTab === 'phases' && <MobilePhaseList searchQuery={searchQuery} onEditTask={handleEditTask} onEditPhase={handleEditPhase} />}
                            {activeTab === 'floors' && <FloorsTab searchQuery={searchQuery} />}
                        </>
                    )}
                    {activeSection === 'finance' && (
                        <>
                            {activeTab === 'funding' && <FundingTab searchQuery={searchQuery} />}
                            {activeTab === 'categories' && <MobileCategoryList searchQuery={searchQuery} />}
                            {activeTab === 'expenses' && <ExpensesTab searchQuery={searchQuery} />}
                            {activeTab === 'payments' && <PaymentsTab searchQuery={searchQuery} />}
                        </>
                    )}
                    {activeSection === 'resources' && (
                        <>
                            {activeTab === 'suppliers' && <MobileSupplierList searchQuery={searchQuery} />}
                            {activeTab === 'contractors' && <MobileContractorList searchQuery={searchQuery} />}
                            {activeTab === 'materials' && <MobileMaterialList searchQuery={searchQuery} />}
                            {activeTab === 'stock' && <MobileStockList searchQuery={searchQuery} />}
                        </>
                    )}
                </div>

            </div>

            {/* Task Details Modal */}
            <TaskPreviewModal 
                isOpen={showTaskPreview}
                onClose={() => setShowTaskPreview(false)}
                task={selectedTask}
                initialMode="read"
            />
            
            {/* Phase Details Modal */}
            <PhaseDetailModal
                isOpen={showPhaseModal}
                onClose={() => setShowPhaseModal(false)}
                phase={selectedPhase}
                tasks={getTasksForPhase(selectedPhase?.id)}
                initialMode={selectedPhase ? 'edit' : 'create'}
            />
        </MobileLayout>
    );
};

export default MobileManage;
