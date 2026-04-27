import React, { useState } from 'react';
import MobileLayout from '../../components/mobile/MobileLayout';
import BoQWizard from '../../components/estimator/BoQWizard';
import SavedEstimatesTab from './SavedEstimatesTab';
import QuickCalcTab from './QuickCalcTab';
import BuildEstimateTab from './BuildEstimateTab';
import MarketRatesTab from './MarketRatesTab';
import { useConstruction } from '../../context/ConstructionContext';

const TABS = [
    { id: 'saved',   label: 'Saved Estimates', icon: '📋', shortLabel: 'Saved'   },
    { id: 'build',   label: 'Build Estimate',  icon: '🏗️',  shortLabel: 'Build'   },
    { id: 'calc',    label: 'Calculators',     icon: '🧮',  shortLabel: 'Calc'    },
    { id: 'rates',   label: 'Market Rates',    icon: '📊',  shortLabel: 'Rates'   },
    { id: 'boq',     label: 'Auto BoQ',        icon: '✨',  shortLabel: 'BoQ'     },
];

const EstimatorHub = () => {
    const [isMobile] = useState(window.innerWidth < 1024);
    const [activeTab, setActiveTab] = useState('saved');
    const { dashboardData } = useConstruction();
    const projectId = dashboardData?.project?.id;

    const headerExtra = (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        activeTab === tab.id
                            ? 'bg-emerald-600 text-white shadow-md scale-110'
                            : 'bg-white/50 text-slate-400'
                    }`}>
                    <span className="text-base">{tab.icon}</span>
                </button>
            ))}
        </div>
    );

    const content = (
        <div className="card-glass rounded-[2rem] p-6 shadow-sm min-h-[500px]">
            {activeTab === 'saved' && <SavedEstimatesTab />}
            {activeTab === 'build' && <BuildEstimateTab />}
            {activeTab === 'calc'  && <QuickCalcTab />}
            {activeTab === 'rates' && <MarketRatesTab />}
            {activeTab === 'boq'   && <BoQWizard projectId={projectId} />}
        </div>
    );

    if (isMobile) {
        return (
            <MobileLayout
                title="Estimator"
                subtitle="Material Intelligence"
                headerExtra={headerExtra}
            >
                {/* Mobile tab bar */}
                <div className="flex overflow-x-auto gap-1 mb-4 pb-1 scrollbar-hide">
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-white/60 text-slate-400'
                            }`}>
                            <span>{tab.icon}</span> {tab.shortLabel}
                        </button>
                    ))}
                </div>
                {content}
            </MobileLayout>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Estimator Engine</h1>
                    <p className="text-slate-500 font-medium mt-1">Advanced material & cost calculations for construction.</p>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 gap-1 flex-wrap">
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}>
                            <span>{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {content}
        </div>
    );
};

export default EstimatorHub;
