import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';

// Import Desktop Components (Reused)
import PhasesTab from '../desktop/manage/PhasesTab';
import FloorsTab from '../desktop/manage/FloorsTab';
import RoomsManageTab from '../desktop/manage/RoomsManageTab';
import CategoriesTab from '../desktop/manage/CategoriesTab';
import ExpensesTab from '../desktop/manage/ExpensesTab';
import ContractorsTab from '../desktop/manage/ContractorsTab';
import SuppliersTab from '../desktop/manage/SuppliersTab';
import MaterialsTab from '../desktop/manage/MaterialsTab';
import StockTab from '../desktop/manage/StockTab';
import FundingTab from '../desktop/manage/FundingTab';

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
            color: 'from-blue-500 to-indigo-600',
            tabs: [
                { id: 'phases', label: 'Phases', nepali: 'चरणहरू' },
                { id: 'floors', label: 'Floors', nepali: 'तल्लाहरू' },
                { id: 'rooms', label: 'Rooms', nepali: 'कोठाहरू' },
            ]
        },
        {
            id: 'finance',
            label: 'Finance',
            nepali: 'आर्थिक',
            description: 'Funding & Expenses',
            icon: '💰',
            color: 'from-emerald-500 to-teal-600',
            tabs: [
                { id: 'funding', label: 'Funding', nepali: 'लगानी' },
                { id: 'categories', label: 'Categories', nepali: 'शिर्षक' },
                { id: 'expenses', label: 'Expenses', nepali: 'खर्च' },
            ]
        },
        {
            id: 'resources',
            label: 'Resources',
            nepali: 'श्रोत/साधन',
            description: 'Materials & Labour',
            icon: '📦',
            color: 'from-orange-500 to-red-600',
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
        <div className="flex flex-col min-h-screen pb-24">
            {/* Header Section */}
            <div className="px-1 mb-6">
                <h2 className="text-2xl font-black text-gray-900">Manage Project</h2>
                <p className="text-gray-500 text-sm">Configure and track project details</p>
            </div>

            {/* Sticky Navigation Container */}
            <div className="sticky top-0 z-30 bg-gray-50 pt-2 -mx-4 px-4 pb-2 border-b border-gray-100 mb-6">
                {/* Section Selection - Large Touchable Cards */}
                <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => handleSectionChange(section.id)}
                            className={`flex-shrink-0 w-[140px] p-3 rounded-2xl border transition-all ${activeSection === section.id
                                ? 'bg-white border-indigo-500 shadow-lg scale-105 z-10'
                                : 'bg-white border-gray-100 opacity-70'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg mb-2 bg-gradient-to-br ${section.color} text-white shadow-sm`}>
                                {section.icon}
                            </div>
                            <h3 className="font-black text-gray-900 text-[10px] leading-tight">
                                {section.label}
                                <span className="block text-[8px] text-gray-400 font-bold mt-0.5">{section.nepali}</span>
                            </h3>
                        </button>
                    ))}
                </div>

                {/* Tab Navigation - Pill style */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'
                                }`}
                        >
                            {tab.nepali} / {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search Bar - Integrated */}
                <div className="relative">
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
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none text-[10px] font-bold shadow-sm"
                    />
                </div>
            </div>

            {/* Content Area - Scrollable */}
            <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm min-h-[400px]">
                {activeSection === 'structure' && (
                    <>
                        {activeTab === 'phases' && <PhasesTab searchQuery={searchQuery} />}
                        {activeTab === 'floors' && <FloorsTab searchQuery={searchQuery} />}
                        {activeTab === 'rooms' && <RoomsManageTab searchQuery={searchQuery} />}
                    </>
                )}

                {activeSection === 'finance' && (
                    <>
                        {activeTab === 'categories' && <CategoriesTab searchQuery={searchQuery} />}
                        {activeTab === 'expenses' && <ExpensesTab searchQuery={searchQuery} />}
                        {activeTab === 'funding' && <FundingTab searchQuery={searchQuery} />}
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
    );
};

export default MobileManage;
