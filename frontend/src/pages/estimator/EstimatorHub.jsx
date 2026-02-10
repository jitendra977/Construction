import React, { useState } from 'react';
import BrickCalculator from './BrickCalculator';
import ConcreteCalculator from './ConcreteCalculator';

const EstimatorHub = () => {
    const [activeTab, setActiveTab] = useState('wall');

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Construction Estimator</h1>

            <div className="flex space-x-2 mb-6 bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setActiveTab('wall')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'wall'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Brick Wall
                </button>
                <button
                    onClick={() => setActiveTab('concrete')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'concrete'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Concrete (Dhalan)
                </button>
            </div>

            {activeTab === 'wall' ? <BrickCalculator /> : <ConcreteCalculator />}

            <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                <p className="font-bold mb-1">Note:</p>
                <p>These calculations are estimates based on standard Nepali construction practices. Actual usage may vary due to wastage (approx 5-10%), specific material quality, and site conditions. Always consult with your Thekedaar or Engineer for final ordering.</p>
            </div>
        </div>
    );
};

export default EstimatorHub;
