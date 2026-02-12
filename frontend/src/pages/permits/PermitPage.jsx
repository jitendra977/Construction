import React, { useState, useEffect } from 'react';
import PermitTracker from '../../components/desktop/permits/PermitTracker';
import DocumentVault from '../../components/desktop/permits/DocumentVault';
import { permitService } from '../../services/api';

const PermitPage = () => {
    const [activeTab, setActiveTab] = useState('tracker');
    const [stats, setStats] = useState({
        total: 0,
        approved: 0,
        inProgress: 0,
        pending: 0,
        documents: 0
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const stepsResponse = await permitService.getSteps();
            const docsResponse = await permitService.getDocuments();

            const steps = stepsResponse.data;
            setStats({
                total: steps.length,
                approved: steps.filter(s => s.status === 'APPROVED').length,
                inProgress: steps.filter(s => s.status === 'IN_PROGRESS').length,
                pending: steps.filter(s => s.status === 'PENDING').length,
                documents: docsResponse.data.length
            });
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    const tabs = [
        { id: 'tracker', label: 'Permit Timeline', icon: '📋' },
        { id: 'documents', label: 'Document Vault', icon: '📁' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 shadow-xl">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <span className="text-4xl">🏛️</span>
                                Municipal Permits & Legal Documents
                            </h1>
                            <p className="text-indigo-100 mt-2 text-lg">
                                Tulsipur Sub-Metropolitan City - Naksha Pass Management
                            </p>
                        </div>
                        <div className="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                            <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-white font-semibold">System Active</span>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="text-white/70 text-xs font-semibold uppercase tracking-wide">Total Steps</div>
                            <div className="text-3xl font-bold text-white mt-1">{stats.total}</div>
                        </div>
                        <div className="bg-green-500/20 backdrop-blur-sm rounded-xl p-4 border border-green-400/30">
                            <div className="text-green-100 text-xs font-semibold uppercase tracking-wide">Approved</div>
                            <div className="text-3xl font-bold text-green-50 mt-1">{stats.approved}</div>
                        </div>
                        <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-400/30">
                            <div className="text-blue-100 text-xs font-semibold uppercase tracking-wide">In Progress</div>
                            <div className="text-3xl font-bold text-blue-50 mt-1">{stats.inProgress}</div>
                        </div>
                        <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-400/30">
                            <div className="text-yellow-100 text-xs font-semibold uppercase tracking-wide">Pending</div>
                            <div className="text-3xl font-bold text-yellow-50 mt-1">{stats.pending}</div>
                        </div>
                        <div className="bg-purple-500/20 backdrop-blur-sm rounded-xl p-4 border border-purple-400/30">
                            <div className="text-purple-100 text-xs font-semibold uppercase tracking-wide">Documents</div>
                            <div className="text-3xl font-bold text-purple-50 mt-1">{stats.documents}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-4 font-semibold text-sm transition-all relative ${activeTab === tab.id
                                        ? 'text-indigo-600 bg-indigo-50'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-lg">{tab.icon}</span>
                                    {tab.label}
                                </span>
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === 'tracker' && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Permit Process Timeline</h2>
                                <p className="text-gray-500 mt-1">Track your Naksha Pass application through all municipal steps</p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-semibold text-blue-800">
                                    Progress: {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                        <PermitTracker onUpdate={fetchStats} />
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Legal Document Vault</h2>
                            <p className="text-gray-500 mt-1">Securely store and manage all your construction-related legal documents</p>
                        </div>
                        <DocumentVault onUpdate={fetchStats} />
                    </div>
                )}
            </div>

            {/* Help Section */}
            <div className="max-w-7xl mx-auto px-6 pb-8">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">Need Help with Permits?</h3>
                            <p className="text-gray-600 mt-1 text-sm">
                                Contact Tulsipur Sub-Metropolitan City Engineering Department: <strong>Phone: 082-520000</strong> |
                                Office Hours: Sunday-Friday, 10:00 AM - 5:00 PM
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-white rounded-lg text-xs font-semibold text-gray-700 border border-gray-200">
                                    📄 Required: Lalpurja, Nagrikta, Tax Clearance
                                </span>
                                <span className="px-3 py-1 bg-white rounded-lg text-xs font-semibold text-gray-700 border border-gray-200">
                                    📐 Blueprint Approval: 7-15 days
                                </span>
                                <span className="px-3 py-1 bg-white rounded-lg text-xs font-semibold text-gray-700 border border-gray-200">
                                    💰 Fees: Based on construction area
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PermitPage;
