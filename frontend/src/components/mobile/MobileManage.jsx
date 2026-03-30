import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import MobileLayout from './MobileLayout';
import MobilePageHeader from './MobilePageHeader';

// Import Desktop Components (Reused)
import PhasesTab from '../desktop/manage/PhasesTab';
import FloorsTab from '../desktop/manage/FloorsTab';

import CategoriesTab from '../desktop/manage/CategoriesTab';
import ExpensesTab from '../desktop/manage/ExpensesTab';
import ContractorsTab from '../desktop/manage/ContractorsTab';
import SuppliersTab from '../desktop/manage/SuppliersTab';
import MaterialsTab from '../desktop/manage/MaterialsTab';
import StockTab from '../desktop/manage/StockTab';
import FundingTab from '../desktop/manage/FundingTab';
import PaymentsTab from '../desktop/manage/PaymentsTab';

const MobileManage = () => {
    const { dashboardData } = useConstruction();
    const [activeSection, setActiveSection] = useState('structure');
    const [activeTab, setActiveTab] = useState('phases');
    const [searchQuery, setSearchQuery] = useState('');

    const sections = [
        {
            id: 'structure',
            label: 'Structure',
            nepali: 'संरचना',
            description: 'Phases, Floors & Rooms',
            icon: '🏗️',
            color: 'from-emerald-500 to-teal-600',
            tabs: [
                { id: 'phases', label: 'Schedule', nepali: 'कार्यतालिका' },
                { id: 'floors', label: 'Structure', nepali: 'संरचना' },
            ]
        },
        {
            id: 'finance',
            label: 'Finance',
            nepali: 'आर्थिक',
            description: 'Funding & Expenses',
            icon: '💰',
            color: 'from-emerald-600 to-emerald-700',
            tabs: [
                { id: 'funding', label: 'Funding', nepali: ' लगानी' },
                { id: 'categories', label: 'Categories', nepali: 'शिर्षक' },
                { id: 'expenses', label: 'Expenses', nepali: 'खर्च' },
                { id: 'payments', label: 'Payments', nepali: 'भुक्तानी' },
            ]
        },
        {
            id: 'resources',
            label: 'Resources',
            nepali: 'श्रोत/साधन',
            description: 'Materials & Labour',
            icon: '📦',
            color: 'from-emerald-400 to-teal-500',
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

    return (
        <MobileLayout>

            <div className="cyber-wrap pb-28">
                <div className="ht-sec">
                    <div className="sticky top-[57px] z-30 bg-[var(--t-bg)]/95 backdrop-blur-md -mx-4 px-4 border-b border-[var(--t-border)]">
                        <div className="flex gap-2 mb-1 overflow-x-auto pb-2 scrollbar-hide">
                            {sections.map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => handleSectionChange(section.id)}
                                    className={`flex-shrink-0 w-[120px] p-3 rounded-[2px] border transition-all truncate text-left ${activeSection === section.id
                                        ? 'bg-[var(--t-surface2)] border-[var(--t-primary)]'
                                        : 'bg-[var(--t-surface)] border-[var(--t-border)] opacity-60 hover:opacity-100 hover:border-[var(--t-border2)]'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-sm border mb-2 ${activeSection === section.id ? 'bg-[var(--t-primary)]/10 border-[var(--t-primary)]/30 drop-shadow-[0_0_8px_var(--t-primary)]' : 'bg-[var(--t-surface3)] border-[var(--t-border)] grayscale'}`}>
                                        {section.icon}
                                    </div>
                                    <h3 className={`text-[12px] uppercase tracking-widest font-['DM_Mono',monospace] leading-tight ${activeSection === section.id ? 'text-[var(--t-primary)] flex items-center gap-1 before:content-[""] before:w-1 before:h-1 before:bg-[var(--t-primary)] before:rounded-full before:animate-pulse' : 'text-[var(--t-text2)]'}`}>
                                        {section.label}
                                    </h3>
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-1.5 mb-1 overflow-x-auto pb-1 scrollbar-hide">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-3 py-1.5 rounded-[1px] whitespace-nowrap transition-all text-[9px] uppercase tracking-[0.2em] font-['DM_Mono',monospace] ${activeTab === tab.id
                                        ? 'bg-[var(--t-primary)] text-[var(--t-bg)] font-bold'
                                        : 'bg-[var(--t-surface)] text-[var(--t-text3)] border border-[var(--t-border)] hover:text-[var(--t-text2)] hover:border-[var(--t-border2)]'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative mb-2">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--t-text3)]">
                                🔍
                            </div>
                            <input
                                type="text"
                                placeholder={`SEARCH ${tabs.find(t => t.id === activeTab)?.label.toUpperCase()}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2px] text-[var(--t-text)] text-[10px] uppercase tracking-widest font-['DM_Mono',monospace] placeholder-[var(--t-text3)] outline-none focus:border-[var(--t-primary)] transition-colors"
                            />
                        </div>
                    </div>

                    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[3px] p-4 mt-36 min-h-[400px]">
                        {activeSection === 'structure' && (
                            <>
                                {activeTab === 'phases' && <PhasesTab searchQuery={searchQuery} />}
                                {activeTab === 'floors' && <FloorsTab searchQuery={searchQuery} />}
                            </>
                        )}
                        {activeSection === 'finance' && (
                            <>
                                {activeTab === 'categories' && <CategoriesTab searchQuery={searchQuery} />}
                                {activeTab === 'expenses' && <ExpensesTab searchQuery={searchQuery} />}
                                {activeTab === 'funding' && <FundingTab searchQuery={searchQuery} />}
                                {activeTab === 'payments' && <PaymentsTab searchQuery={searchQuery} />}
                            </>
                        )}
                        {activeSection === 'resources' && (
                            <>
                                {activeTab === 'contractors' && <ContractorsTab searchQuery={searchQuery} />}
                                {activeTab === 'suppliers' && <SuppliersTab searchQuery={searchQuery} />}
                                {activeTab === 'materials' && <MaterialsTab searchQuery={searchQuery} />}
                                {activeTab === 'stock' && <StockTab searchQuery={searchQuery} />}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </MobileLayout>
    );
};

export default MobileManage;
