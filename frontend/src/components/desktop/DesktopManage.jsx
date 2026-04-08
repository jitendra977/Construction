import React, { useState, useEffect } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import PhasesTab from './manage/PhasesTab';
import FloorsTab from './manage/FloorsTab';
import CategoriesTab from './manage/CategoriesTab';
import ExpensesTab from './manage/ExpensesTab';
import ContractorsTab from './manage/ContractorsTab';
import SuppliersTab from './manage/SuppliersTab';
import MaterialsTab from './manage/MaterialsTab';
import StockTab from './manage/StockTab';
import FundingTab from './manage/FundingTab';
import BudgetOverview from '../finance/BudgetOverview';

const DesktopManage = () => {
    const { dashboardData, setActiveHelpKey } = useConstruction();
    const [activeSection, setActiveSection] = useState('structure');
    const [activeTab, setActiveTab] = useState('phases');
    const [searchQuery, setSearchQuery] = useState('');
    const [resolveMetadata, setResolveMetadata] = useState(null);

    useEffect(() => {
        setActiveHelpKey(activeTab);
    }, [activeTab, setActiveHelpKey]);

    const sections = [
        {
            id: 'structure',
            label: 'Structure',
            labelNe: 'संरचना',
            description: 'Phases, Floors & Logic',
            icon: '🏗️',
            accent: 'var(--t-primary)',
            bgGlow: 'rgba(59, 130, 246, 0.1)',
            tabs: [
                { id: 'phases', label: 'Schedule', labelNe: 'कार्यतालिका' },
                { id: 'floors', label: 'Structure', labelNe: 'संरचना' },
            ]
        },
        {
            id: 'finance',
            label: 'Finance',
            labelNe: 'आर्थिक',
            description: 'Banking & Budgeting',
            icon: '💰',
            accent: '#10b981', // Emerald
            bgGlow: 'rgba(16, 185, 129, 0.1)',
            tabs: [
                { id: 'overview', label: 'Overview', labelNe: 'सारांश' },
                { id: 'funding', label: 'Funding', labelNe: 'लगानी' },
                { id: 'categories', label: 'Categories', labelNe: 'शिर्षक' },
                { id: 'expenses', label: 'Expenses', labelNe: 'खर्च' },
            ]
        },
        {
            id: 'resources',
            label: 'Resources',
            labelNe: 'श्रोत/साधन',
            description: 'Vendors, Materials & Stock',
            icon: '🏢',
            accent: '#f59e0b', // Amber
            bgGlow: 'rgba(245, 158, 11, 0.1)',
            tabs: [
                { id: 'suppliers', label: 'Suppliers', labelNe: 'सप्लायर्स' },
                { id: 'contractors', label: 'Contractors', labelNe: 'ठेकेदार' },
                { id: 'materials', label: 'Materials', labelNe: 'सामग्री' },
                { id: 'stock', label: 'Stock', labelNe: 'मौज्दात' },
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

    const handleResolve = (type, data) => {
        if (type === 'UNASSIGNED_BUDGET') {
            setActiveSection('finance'); setActiveTab('categories');
            setResolveMetadata({ highlightId: data.category_id, expand: true });
        } else if (['SYNC_MISMATCH', 'OVER_ALLOCATED_CAT'].includes(type)) {
            setActiveSection('finance'); setActiveTab('categories');
        } else if (['PHASE_OVERLOAD', 'OVER_ALLOCATED_PHASE'].includes(type)) {
            setActiveSection('structure'); setActiveTab('phases');
        }
    };

    return (
        <div className="min-h-screen bg-[var(--t-bg)] flex flex-col font-sans transition-all duration-500">
            {/* Header — matched to Dashboard proportions */}
            <div className="relative pt-8 pb-16 px-6 overflow-hidden border-b border-[var(--t-border)] bg-[var(--t-surface)]">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--t-primary)]/5 blur-[100px] -mr-48 -mt-48 rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/5 blur-[80px] -ml-32 -mb-32 rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="px-2.5 py-0.5 bg-[var(--t-primary)]/10 text-[var(--t-primary)] rounded-full text-[10px] font-black uppercase tracking-widest border border-[var(--t-primary)]/20">Intelligence Center</span>
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--t-primary2)] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--t-primary2)]"></span>
                            </span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--t-text)' }}>
                            Project <span className="opacity-40">Intelligence</span>
                        </h1>
                        <p className="text-[var(--t-text2)] font-medium text-sm max-w-lg leading-relaxed opacity-80">
                            Configure construction architecture, streamline funding, and manage resources.
                        </p>
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-[320px] group transition-all">
                        <div className="relative bg-[var(--t-bg)]/40 backdrop-blur-sm border border-[var(--t-border)] rounded-xl flex items-center group-focus-within:border-[var(--t-primary)] transition-all px-3 py-2 gap-2">
                            <span className="text-[var(--t-text3)] opacity-60 text-sm">🔍</span>
                            <input
                                type="text"
                                placeholder={`Search ${tabs.find(t => t.id === activeTab)?.label}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-sm font-bold outline-none placeholder-[var(--t-text3)]/50"
                                style={{ color: 'var(--t-text)' }}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-xs opacity-40 hover:opacity-100 text-[var(--t-text3)]">✕</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Section Cards — compact, matched to Dashboard card sizes */}
            <div className="max-w-7xl mx-auto px-6 -mt-6 relative z-20 w-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => handleSectionChange(section.id)}
                            className={`relative group bg-[var(--t-surface)] border border-[var(--t-border)] p-4 rounded-2xl transition-all hover:shadow-lg overflow-hidden text-left ${activeSection === section.id
                                ? 'shadow-md border-[var(--t-primary)] ring-1 ring-[var(--t-primary)]/20'
                                : 'opacity-80 hover:opacity-100 hover:-translate-y-0.5'}`}
                        >
                            {activeSection === section.id && (
                                <div className="absolute inset-0 transition-opacity pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${section.bgGlow}, transparent)` }} />
                            )}

                            <div className="relative z-10 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0 transition-transform group-hover:scale-105 ${activeSection === section.id ? 'bg-[var(--t-primary)] text-white shadow-md shadow-[var(--t-primary)]/20' : 'bg-[var(--t-bg)]'}`}>
                                    {section.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-black tracking-tight truncate" style={{ color: activeSection === section.id ? 'var(--t-text)' : 'var(--t-text2)' }}>{section.label}</h3>
                                        <span className="text-[9px] font-black opacity-30 uppercase tracking-tight">{section.labelNe}</span>
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-40 mt-0.5">{section.description}</p>
                                </div>
                                {activeSection === section.id && (
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: section.accent, boxShadow: `0 0 6px ${section.accent}` }} />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Workspace Area */}
            <div className="max-w-7xl mx-auto px-6 mt-6 w-full pb-12">
                <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                    {/* Tab Bar — tighter, like Dashboard's nav */}
                    <div className="border-b border-[var(--t-border)] bg-[var(--t-surface2)]/30 backdrop-blur sticky top-0 z-30">
                        <div className="flex overflow-x-auto no-scrollbar px-4">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`group relative px-6 py-4 text-xs font-black uppercase tracking-[0.15em] transition-all duration-300 whitespace-nowrap flex flex-col items-center gap-1.5 ${activeTab === tab.id
                                        ? 'text-[var(--t-primary)]'
                                        : 'text-[var(--t-text3)] hover:text-[var(--t-text)] opacity-60 hover:opacity-100'
                                    }`}
                                    style={{ fontFamily: 'var(--f-mono)' }}
                                >
                                    <span>{tab.label}</span>
                                    <span className="text-[10px] opacity-40 lowercase font-bold tracking-normal">{tab.labelNe}</span>

                                    {activeTab === tab.id && (
                                        <div className="absolute inset-x-4 bottom-0 h-0.5 bg-[var(--t-primary)] rounded-t-full shadow-[0_0_8px_var(--t-primary)]" />
                                    )}
                                    <div className={`absolute inset-0 transition-colors rounded-t-lg ${activeTab === tab.id ? 'bg-[var(--t-primary)]/5' : 'group-hover:bg-black/2'}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6 flex-1 relative overflow-hidden">
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-full">
                            {/* Structure Section Tabs */}
                            {activeSection === 'structure' && (
                                <>
                                    {activeTab === 'phases' && <PhasesTab searchQuery={searchQuery} />}
                                    {activeTab === 'floors' && <FloorsTab searchQuery={searchQuery} />}
                                </>
                            )}

                            {/* Finance Section Tabs */}
                            {activeSection === 'finance' && (
                                <>
                                    {activeTab === 'overview' && <BudgetOverview onResolve={handleResolve} />}
                                    {activeTab === 'categories' && (
                                        <CategoriesTab
                                            searchQuery={searchQuery}
                                            resolveMetadata={resolveMetadata}
                                            onClearMetadata={() => setResolveMetadata(null)}
                                        />
                                    )}
                                    {activeTab === 'expenses' && <ExpensesTab searchQuery={searchQuery} />}
                                    {activeTab === 'funding' && <FundingTab searchQuery={searchQuery} />}
                                </>
                            )}

                            {/* Resources Section Tabs */}
                            {activeSection === 'resources' && (
                                <>
                                    {activeTab === 'suppliers' && <SuppliersTab searchQuery={searchQuery} />}
                                    {activeTab === 'contractors' && <ContractorsTab searchQuery={searchQuery} />}
                                    {activeTab === 'materials' && <MaterialsTab searchQuery={searchQuery} />}
                                    {activeTab === 'stock' && <StockTab searchQuery={searchQuery} />}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default DesktopManage;
