import React from 'react';
import PermitTracker from '../../components/desktop/permits/PermitTracker';
import DocumentVault from '../../components/desktop/permits/DocumentVault';

const PermitPage = () => {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                <h1 className="text-2xl font-bold">Permits & Legal</h1>
                <p className="text-indigo-100 opacity-90 mt-1">
                    Track your Nagar Palika process and store important legal documents safely.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <PermitTracker />
                </div>
                <div className="lg:col-span-2">
                    <DocumentVault />
                </div>
            </div>
        </div>
    );
};

export default PermitPage;
