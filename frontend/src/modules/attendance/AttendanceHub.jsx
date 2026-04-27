/**
 * AttendanceHub
 * ─────────────────────────────────────────────────────────────────────────────
 * Main page for the Attendance module.
 * Tabs: Daily Sheet | Workers | Monthly Report | Payroll
 */
import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import DailySheetTab    from './DailySheetTab';
import WorkersTab       from './WorkersTab';
import MonthlyReportTab from './MonthlyReportTab';
import PayrollTab       from './PayrollTab';

const TABS = [
    { id: 'daily',   label: 'Daily Sheet',     icon: '📋', short: 'Daily'   },
    { id: 'workers', label: 'Workers',          icon: '👷', short: 'Workers' },
    { id: 'monthly', label: 'Monthly Report',   icon: '📅', short: 'Monthly' },
    { id: 'payroll', label: 'Payroll',          icon: '💰', short: 'Payroll' },
];

export default function AttendanceHub() {
    const [activeTab, setActiveTab] = useState('daily');
    const { activeProjectId, projects } = useConstruction();

    const activeProject = projects?.find(p => p.id === activeProjectId);

    return (
        <div className="min-h-screen" style={{ background: 'var(--t-bg)', padding: '24px 20px 60px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>

                {/* ── Header ── */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 26 }}>🕐</span>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--t-text)' }}>
                            Attendance
                        </h1>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--t-text3)' }}>
                        {activeProject
                            ? <>Track daily attendance, overtime &amp; payroll for <strong style={{ color: 'var(--t-text)' }}>{activeProject.name}</strong></>
                            : 'Select a project from Project Manager to get started.'}
                    </p>
                </div>

                {/* ── Tab bar ── */}
                <div style={{
                    display: 'flex', gap: 4, marginBottom: 20,
                    borderBottom: '2px solid var(--t-border)', paddingBottom: 0,
                    overflowX: 'auto',
                }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '10px 18px', borderRadius: '10px 10px 0 0',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            border: '1px solid transparent',
                            borderBottom: activeTab === tab.id ? '2px solid #f97316' : '2px solid transparent',
                            background: activeTab === tab.id ? 'var(--t-surface)' : 'transparent',
                            color: activeTab === tab.id ? '#f97316' : 'var(--t-text3)',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s',
                        }}>
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Tab content ── */}
                <div style={{
                    background: 'var(--t-surface)',
                    borderRadius: 16,
                    border: '1px solid var(--t-border)',
                    padding: '20px 20px 24px',
                }}>
                    {activeTab === 'daily'   && <DailySheetTab    projectId={activeProjectId} />}
                    {activeTab === 'workers' && <WorkersTab        projectId={activeProjectId} />}
                    {activeTab === 'monthly' && <MonthlyReportTab  projectId={activeProjectId} />}
                    {activeTab === 'payroll' && <PayrollTab        projectId={activeProjectId} />}
                </div>
            </div>
        </div>
    );
}
