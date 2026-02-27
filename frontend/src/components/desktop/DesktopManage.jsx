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
import TasksTab from './manage/TasksTab';
import PaymentsTab from './manage/PaymentsTab';

const DesktopManage = () => {
    const { dashboardData } = useConstruction();
    const [activeSection, setActiveSection] = useState('structure');
    const [activeTab, setActiveTab] = useState('phases');
    const [searchQuery, setSearchQuery] = useState('');

    const sections = [
        {
            id: 'structure',
            label: 'Structure (संरचना)',
            description: 'Phases, Floors & Rooms',
            icon: '🏗️',
            color: 'from-blue-500 to-indigo-600',
            tabs: [
                { id: 'phases', label: 'Phases (चरणहरू)' },
                { id: 'tasks', label: 'Tasks (कामहरू)' },
                { id: 'floors', label: 'Floors (तल्लाहरू)' },
                { id: 'rooms', label: 'Rooms (कोठाहरू)' },
            ]
        },
        {
            id: 'finance',
            label: 'Finance (आर्थिक)',
            description: 'Funding & Expenses',
            icon: '💰',
            color: 'from-emerald-500 to-teal-600',
            tabs: [
                { id: 'funding', label: 'Funding (लगानी)' },
                { id: 'categories', label: 'Categories (शिर्षक)' },
                { id: 'expenses', label: 'Expenses (खर्च)' },
                { id: 'payments', label: 'Payments (भुक्तानी)' },
            ]
        },
        {
            id: 'resources',
            label: 'Resources (श्रोत/साधन)',
            description: 'Materials & Labour',
            icon: '📦',
            color: 'from-orange-500 to-red-600',
            tabs: [
                { id: 'suppliers', label: 'Suppliers (सप्लायर्स)' },
                { id: 'contractors', label: 'Contractors (ठेकेदार)' },
                { id: 'materials', label: 'Materials (सामग्री)' },
                { id: 'stock', label: 'Stock (मौज्दात)' },
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 shadow-xl pb-16 pt-8 px-6 relative overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <span>🛠️</span>
                                Project Management
                            </h1>
                            <p className="text-emerald-100 mt-2 text-lg">
                                Configure and manage building details, budget, and resources.
                            </p>
                        </div>
                        {/* Integrated Search Bar */}
                        <div className="relative w-full md:w-96">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-200">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                placeholder={`Search in ${tabs.find(t => t.id === activeTab)?.label}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-md border border-emerald-400/30 rounded-xl text-white placeholder-emerald-200/70 focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all outline-none font-medium shadow-lg"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Container - Overlap Effect */}
            <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20 pb-12">
                {/* Section Selector Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => handleSectionChange(section.id)}
                            className={`relative overflow-hidden p-5 rounded-2xl border transition-all duration-300 text-left group ${activeSection === section.id
                                ? 'bg-white border-white shadow-xl ring-2 ring-emerald-500 ring-offset-2 ring-offset-gray-100 transform -translate-y-1'
                                : 'bg-white/80 border-white/50 hover:bg-white hover:border-white shadow-sm hover:shadow-md backdrop-blur-sm'
                                }`}
                        >
                            <div className={`p-3 rounded-xl inline-flex mb-3 transition-colors ${activeSection === section.id ? 'bg-gradient-to-br ' + section.color + ' text-white shadow-lg' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
                                <span className="text-2xl">{section.icon}</span>
                            </div>
                            <h3 className={`text-lg font-bold ${activeSection === section.id ? 'text-gray-900' : 'text-gray-600'}`}>{section.label}</h3>
                            <p className="text-sm text-gray-400 mt-1 font-medium">{section.description}</p>

                            {/* Active Indicator */}
                            {activeSection === section.id && (
                                <div className="absolute top-0 right-0 p-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px]">
                    {/* Tabs Navigation - Sticky */}
                    <div className="border-b border-gray-100 bg-gray-50/50 sticky top-0 z-30 backdrop-blur-md">
                        <div className="flex overflow-x-auto no-scrollbar px-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative min-w-[120px] px-6 py-4 text-sm font-bold uppercase tracking-wide transition-all duration-300 ${activeTab === tab.id
                                        ? 'text-emerald-600 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.02)] z-10'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                                        }`}
                                >
                                    {/* Active Tab Top Line Indicator */}
                                    {activeTab === tab.id && (
                                        <span className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500"></span>
                                    )}

                                    <span className="relative z-10">{tab.label}</span>

                                    {/* Active Tab Bottom Fade */}
                                    {activeTab === tab.id && (
                                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent opacity-50"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6 bg-white">
                        {/* Structure Section Tabs */}
                        {activeSection === 'structure' && (
                            <>
                                {activeTab === 'phases' && <PhasesTab searchQuery={searchQuery} />}
                                {activeTab === 'tasks' && <TasksTab searchQuery={searchQuery} />}
                                {activeTab === 'floors' && <FloorsTab searchQuery={searchQuery} />}
                                {activeTab === 'rooms' && <RoomsManageTab searchQuery={searchQuery} />}
                            </>
                        )}

                        {/* Finance Section Tabs */}
                        {activeSection === 'finance' && (
                            <>
                                {activeTab === 'categories' && <CategoriesTab searchQuery={searchQuery} />}
                                {activeTab === 'expenses' && <ExpensesTab searchQuery={searchQuery} />}
                                {activeTab === 'funding' && <FundingTab searchQuery={searchQuery} />}
                                {activeTab === 'payments' && <PaymentsTab searchQuery={searchQuery} />}
                            </>
                        )}

                        {/* Resources Section Tabs */}
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
        </div>
    );
};

export default DesktopManage;
