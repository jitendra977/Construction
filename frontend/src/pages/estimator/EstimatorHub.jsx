import React, { useState } from 'react';
import BrickCalculator from './BrickCalculator';
import ConcreteCalculator from './ConcreteCalculator';
import PlasterCalculator from './PlasterCalculator';
import FlooringCalculator from './FlooringCalculator';
import StructuralBudgetEstimator from './StructuralBudgetEstimator';
import DataTab from './DataTab';

const EstimatorHub = () => {
    const [activeTab, setActiveTab] = useState('budget');

    const tabs = [
        { id: 'budget', label: 'Full Budget', icon: '💰' },
        { id: 'data', label: 'Market Rates', icon: '📊' },
        { id: 'wall', label: 'Walls (Garo)', icon: '🧱' },
        { id: 'concrete', label: 'Concrete (Dhalan)', icon: '🏗️' },
        { id: 'plaster', label: 'Plaster', icon: '🪄' },
        { id: 'flooring', label: 'Flooring (PCC)', icon: '🧊' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans pb-32 md:pb-0">
            {/* Emerald Gradient Header (Dashboard Theme) */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 shadow-xl pb-24 pt-12 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-12 -translate-y-12">
                    <span className="text-[200px]">📐</span>
                </div>

                <div className="max-w-7xl mx-auto relative z-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4">
                        Construction Estimator
                    </h1>
                    <p className="text-emerald-100 text-lg md:text-xl font-medium max-w-2xl mx-auto opacity-90">
                        Advanced material calculations tailored for standard Nepali construction practices.
                    </p>
                </div>
            </div>

            {/* Floating Tabs Navigation */}
            <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-30">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white/10 backdrop-blur-xl p-2 rounded-2xl border border-white/20 shadow-2xl flex flex-wrap md:flex-nowrap gap-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-white text-emerald-900 shadow-lg transform scale-[1.02]'
                                    : 'text-white hover:bg-white/10'
                                    }`}
                            >
                                <span className="text-xl">{tab.icon}</span>
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 py-12 relative z-20">
                <div className="max-w-5xl mx-auto bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden min-h-[500px]">
                    <div className="p-8 md:p-12">
                        {activeTab === 'budget' && <StructuralBudgetEstimator />}
                        {activeTab === 'data' && <DataTab />}
                        {activeTab === 'wall' && <BrickCalculator />}
                        {activeTab === 'concrete' && <ConcreteCalculator />}
                        {activeTab === 'plaster' && <PlasterCalculator />}
                        {activeTab === 'flooring' && <FlooringCalculator />}

                        {/* Professional Note Section */}
                        <div className="mt-12 p-8 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-[24px] border border-emerald-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                            <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
                                <span className="text-5xl">👷‍♂️</span>
                                <div className="text-center md:text-left">
                                    <h4 className="font-black text-emerald-900 text-sm uppercase tracking-[0.2em] mb-2">Technical Disclaimer</h4>
                                    <p className="text-emerald-800/70 text-sm leading-relaxed font-medium">
                                        Calculations include <strong>Standard Nepali Wastage</strong> (5-10% for bricks/cement).
                                        Site specific conditions like material quality and workmanship will vary actual consumption.
                                        Please share these reports with your <strong>Project Engineer</strong> for final verification.
                                    </p>
                                </div>
                                <button className="whitespace-nowrap px-6 py-3 bg-emerald-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors">
                                    Full Guide
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EstimatorHub;
