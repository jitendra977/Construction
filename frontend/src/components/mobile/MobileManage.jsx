import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import MobileLayout from './MobileLayout';

// Import Desktop Components (Reused)
import PhasesTab from '../desktop/manage/PhasesTab';
import FloorsTab from '../desktop/manage/FloorsTab';
import RoomsManageTab from '../desktop/manage/RoomsManageTab';
import TasksTab from '../desktop/manage/TasksTab';
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
                { id: 'phases', label: 'Phases', nepali: 'चरणहरू' },
                { id: 'floors', label: 'Floors', nepali: 'तल्लाहरू' },
                { id: 'rooms', label: 'Rooms', nepali: 'कोठाहरू' },
                { id: 'tasks', label: 'Tasks', nepali: 'कामहरू' },
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
        <MobileLayout 
            title="Manage" 
            subtitle="Project Engine"
            spacing="space-y-6"
        >
            <div className="sticky top-[-1rem] z-30 bg-[#f8fafc]/80 backdrop-blur-xl pt-4 -mx-6 px-6 pb-6 border-b border-emerald-50 mb-4 h-full">
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => handleSectionChange(section.id)}
                            className={`flex-shrink-0 w-[140px] p-4 rounded-3xl border transition-all ${activeSection === section.id
                                ? 'bg-white border-emerald-600 shadow-lg shadow-emerald-50 scale-105 z-10'
                                : 'bg-white/50 border-slate-100 opacity-60'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-3 bg-gradient-to-br ${section.color} text-white shadow-sm`}>
                                {section.icon}
                            </div>
                            <h3 className="text-slate-800 leading-tight dynamic-subtitle">
                                {section.label}
                            </h3>
                        </button>
                    ))}
                </div>

                <div className="flex gap-3 mb-5 overflow-x-auto pb-1 scrollbar-hide px-1 mt-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2 rounded-xl whitespace-nowrap transition-all dynamic-subtitle ${activeTab === tab.id
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100'
                                : 'bg-white text-slate-400 border border-slate-100'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative px-1">
                    <input
                        type="text"
                        placeholder={`Search ${tabs.find(t => t.id === activeTab)?.label}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-6 pr-6 py-3.5 bg-white border border-slate-100 rounded-2xl text-slate-800 placeholder-slate-300 outline-none dynamic-body font-bold shadow-sm"
                    />
                </div>
            </div>

            <div className="card-glass rounded-[2rem] p-4 shadow-sm min-h-[400px]">
                {activeSection === 'structure' && (
                    <>
                        {activeTab === 'phases' && <PhasesTab searchQuery={searchQuery} />}
                        {activeTab === 'floors' && <FloorsTab searchQuery={searchQuery} />}
                        {activeTab === 'rooms' && <RoomsManageTab searchQuery={searchQuery} />}
                        {activeTab === 'tasks' && <TasksTab searchQuery={searchQuery} />}
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
        </MobileLayout>
    );
};

export default MobileManage;
