import React, { useState } from 'react';
import BrickCalculator from './BrickCalculator';
import ConcreteCalculator from './ConcreteCalculator';
import PlasterCalculator from './PlasterCalculator';
import FlooringCalculator from './FlooringCalculator';
import StructuralBudgetEstimator from './StructuralBudgetEstimator';
import DataTab from './DataTab';
import MobileLayout from '../../components/mobile/MobileLayout';

const EstimatorHub = () => {
    const [isMobile] = useState(window.innerWidth < 1024);
    const [activeTab, setActiveTab] = useState('budget');

    const tabs = [
        { id: 'budget', label: 'Full Budget', icon: '💰' },
        { id: 'data', label: 'Market Rates', icon: '📊' },
        { id: 'wall', label: 'Walls', icon: '🧱' },
        { id: 'concrete', label: 'Concrete', icon: '🏗️' },
        { id: 'plaster', label: 'Plaster', icon: '🪄' },
        { id: 'flooring', label: 'Flooring', icon: '🧊' }
    ];

    const headerExtra = (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide max-w-[200px]">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === tab.id
                        ? 'bg-emerald-600 text-white shadow-md scale-110'
                        : 'bg-white/50 text-slate-400'
                        }`}
                >
                    <span className="text-lg">{tab.icon}</span>
                </button>
            ))}
        </div>
    );

    const content = (
        <div className="space-y-8">
            <div className="card-glass rounded-[2rem] p-6 shadow-sm min-h-[500px]">
                {activeTab === 'budget' && <StructuralBudgetEstimator />}
                {activeTab === 'data' && <DataTab />}
                {activeTab === 'wall' && <BrickCalculator />}
                {activeTab === 'concrete' && <ConcreteCalculator />}
                {activeTab === 'plaster' && <PlasterCalculator />}
                {activeTab === 'flooring' && <FlooringCalculator />}

                {/* Professional Note Section */}
                <div className="mt-12 p-8 bg-emerald-50/50 rounded-[2rem] border border-emerald-100/50 relative overflow-hidden group">
                    <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
                        <span className="text-4xl">👷‍♂️</span>
                        <div className="text-center md:text-left">
                            <h4 className="font-black text-emerald-900 text-[10px] uppercase tracking-[0.2em] mb-2">Engineering Note</h4>
                            <p className="text-slate-600 text-[11px] leading-relaxed font-medium">
                                Calculations include **Standard Nepali Wastage** (5-10%). 
                                Please share these reports with your **Project Engineer** for final verification.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <MobileLayout 
                title="Estimator" 
                subtitle="Material Intelligence"
                headerExtra={headerExtra}
            >
                {content}
            </MobileLayout>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Estimator Engine</h1>
                    <p className="text-slate-500 font-medium">Advanced material calculations for construction.</p>
                </div>
                <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100 gap-2">
                    {tabs.map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-600'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>
            {content}
        </div>
    );
};

export default EstimatorHub;
