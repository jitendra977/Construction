import React, { useState } from 'react';
import BrickCalculator from './BrickCalculator';
import ConcreteCalculator from './ConcreteCalculator';

const EstimatorHub = () => {
    const [activeTab, setActiveTab] = useState('wall');

    const tabs = [
        { id: 'wall', label: 'Brick Wall', icon: '🧱' },
        { id: 'concrete', label: 'Concrete (Dhalan)', icon: '🏗️' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 shadow-xl pb-16 pt-8 px-6 relative overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <span>📐</span>
                                Construction Estimator
                            </h1>
                            <p className="text-emerald-100 mt-2 text-lg">
                                Calculate material requirements for walls and concrete structures.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-6 -mt-8 relative z-20 pb-12">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Tabs Navigation */}
                    <div className="border-b border-gray-100 bg-gray-50/50 flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold uppercase tracking-wide transition-all duration-300 relative ${activeTab === tab.id
                                    ? 'text-emerald-600 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.02)] z-10'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                                    }`}
                            >
                                <span className="text-xl">{tab.icon}</span>
                                {tab.label}

                                {/* Active Tab Indicators */}
                                {activeTab === tab.id && (
                                    <>
                                        <span className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500"></span>
                                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent opacity-50"></div>
                                    </>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Calculator Content */}
                    <div className="p-8">
                        {activeTab === 'wall' ? <BrickCalculator /> : <ConcreteCalculator />}

                        <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200/50 flex gap-4 items-start">
                            <span className="text-2xl">💡</span>
                            <div>
                                <h4 className="font-bold text-amber-800 text-sm uppercase tracking-wide mb-1">Estimation Note</h4>
                                <p className="text-amber-900/80 text-sm leading-relaxed">
                                    These calculations are estimates based on standard Nepali construction practices.
                                    Actual usage may vary due to wastage (approx 5-10%), specific material quality, and site conditions.
                                    Always consult with your Thekedaar or Engineer for final ordering.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EstimatorHub;
