import React, { useState, useEffect } from 'react';
import { permitService } from '../../../services/api';

const PermitTracker = () => {
    const [steps, setSteps] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSteps = async () => {
        try {
            const response = await permitService.getSteps();
            // Sort by order or basic ID if order is 0
            const sortedSteps = response.data.sort((a, b) => a.order - b.order || a.id - b.id);
            setSteps(sortedSteps);
        } catch (error) {
            console.error("Failed to fetch permit steps", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSteps();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (loading) return <div className="p-4 text-center">Loading steps...</div>;

    if (steps.length === 0) {
        return (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No permit steps defined yet.</p>
                <div className="mt-4 text-sm text-gray-400">
                    (In a real app, admin would seed these: Darta, Asthayi, DPC, Sthayi)
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Naksha Pass Process (Nagar Palika)</h3>
            <div className="relative border-l-2 border-indigo-200 ml-3 space-y-8 pb-4">
                {steps.map((step, index) => (
                    <div key={step.id} className="relative pl-8">
                        {/* Timeline Connector Dot */}
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${step.status === 'APPROVED' ? 'bg-green-500 border-green-500' : 'bg-white border-indigo-300'}`}></div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-gray-900">{step.title}</h4>
                                    <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-bold rounded-lg border ${getStatusColor(step.status)}`}>
                                    {step.status.replace('_', ' ')}
                                </span>
                            </div>
                            {step.date_issued && (
                                <div className="mt-2 text-xs text-gray-500">
                                    Issued: {new Date(step.date_issued).toLocaleDateString()}
                                </div>
                            )}
                            {step.notes && (
                                <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-100">
                                    Note: {step.notes}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PermitTracker;
