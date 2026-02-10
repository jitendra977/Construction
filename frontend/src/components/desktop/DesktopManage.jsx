import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import PhasesTab from './manage/PhasesTab';
import FloorsTab from './manage/FloorsTab';
import RoomsManageTab from './manage/RoomsManageTab';
import CategoriesTab from './manage/CategoriesTab';
import ExpensesTab from './manage/ExpensesTab';
import ContractorsTab from './manage/ContractorsTab';
import SuppliersTab from './manage/SuppliersTab';
import MaterialsTab from './manage/MaterialsTab';
import StockTab from './manage/StockTab';
import FundingTab from './manage/FundingTab';

const DesktopManage = () => {
    const { dashboardData } = useConstruction();
    const [activeSection, setActiveSection] = useState('structure');
    const [activeTab, setActiveTab] = useState('phases');
    const [searchQuery, setSearchQuery] = useState('');

    const sections = [
        {
            id: 'structure',
            label: 'Project Structure',
            description: 'Phases, Floors & Rooms',
            icon: '🏗️',
            tabs: [
                { id: 'phases', label: 'Construction Phases' },
                { id: 'floors', label: 'Floors' },
                { id: 'rooms', label: 'Rooms' },
            ]
        },
        {
            id: 'finance',
            label: 'Finance & Budget',
            description: 'Funding & Expenses',
            icon: '💰',
            tabs: [
                { id: 'funding', label: 'Financial Funding' },
                { id: 'categories', label: 'Budget Categories' },
                { id: 'expenses', label: 'Expenses' },
            ]
        },
        {
            id: 'resources',
            label: 'Resource Inventory',
            description: 'Materials & Labour',
            icon: '📦',
            tabs: [
                { id: 'suppliers', label: 'Suppliers' },
                { id: 'contractors', label: 'Contractors' },
                { id: 'materials', label: 'Materials' },
                { id: 'stock', label: 'Stock Mgr' },
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Project Management</h2>
                    <p className="text-sm text-gray-500 mt-1">Configure and manage building details, budget, and resources.</p>
                </div>

                <div className="relative w-full md:w-80">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder={`Search in ${tabs.find(t => t.id === activeTab)?.label}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-medium"
                    />
                </div>
            </div>

            {/* Section Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sections.map(section => (
                    <button
                        key={section.id}
                        onClick={() => handleSectionChange(section.id)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${activeSection === section.id
                            ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500 ring-offset-2'
                            : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'
                            }`}
                    >
                        <div className={`p-3 rounded-xl text-xl shadow-inner ${activeSection === section.id ? 'bg-indigo-500' : 'bg-gray-50'}`}>
                            {section.icon}
                        </div>
                        <div>
                            <div className={`font-black text-sm uppercase tracking-wider ${activeSection === section.id ? 'text-indigo-900' : 'text-gray-400'}`}>
                                {section.label}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">{section.description}</div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Sub-Tabs Row */}
            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setSearchQuery('');
                        }}
                        className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl whitespace-nowrap transition-all ${activeTab === tab.id
                            ? 'bg-white text-indigo-600 shadow-md border border-indigo-100'
                            : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[500px]">
                {activeTab === 'funding' && <FundingTab searchQuery={searchQuery} />}
                {activeTab === 'phases' && <PhasesTab searchQuery={searchQuery} />}
                {activeTab === 'floors' && <FloorsTab searchQuery={searchQuery} />}
                {activeTab === 'rooms' && <RoomsManageTab searchQuery={searchQuery} />}
                {activeTab === 'categories' && <CategoriesTab searchQuery={searchQuery} />}
                {activeTab === 'expenses' && <ExpensesTab searchQuery={searchQuery} />}
                {activeTab === 'suppliers' && <SuppliersTab searchQuery={searchQuery} />}
                {activeTab === 'contractors' && <ContractorsTab searchQuery={searchQuery} />}
                {activeTab === 'materials' && <MaterialsTab searchQuery={searchQuery} />}
                {activeTab === 'stock' && <StockTab searchQuery={searchQuery} />}
            </div>
        </div>
    );
};

export default DesktopManage;
