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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans pb-32 md:pb-0">
            {/* Emerald Gradient Header (Dashboard Theme) */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 shadow-xl pb-16 pt-8 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <span className="text-9xl">🏛️</span>
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                🏛️ Municipal Permits
                            </h1>
                            <p className="text-emerald-100 mt-1 text-sm md:text-base font-medium opacity-90">
                                Tulsipur Sub-Metropolitan City - Naksha Pass Management
                            </p>
                        </div>

                        {/* Tab Navigation (Glassmorphism) - Floating Design */}
                        <div className="flex bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/20 shadow-lg">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === tab.id
                                        ? 'bg-white text-emerald-900 shadow-md transform scale-100'
                                        : 'text-white/70 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    <span className="text-lg">{tab.icon}</span>
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Local Stats Grid (Matching Dashboard Aesthetic) */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                            <div className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider opacity-80">Total Steps</div>
                            <div className="text-xl font-bold text-white mt-0.5">{stats.total}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                            <div className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider opacity-80">Approved</div>
                            <div className="text-xl font-bold text-white mt-0.5 flex justify-between items-center text-emerald-300">
                                {stats.approved}
                                <span className="text-sm">✓</span>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                            <div className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider opacity-80">In Progress</div>
                            <div className="text-xl font-bold text-white mt-0.5 flex justify-between items-center text-blue-300">
                                {stats.inProgress}
                                <span className="text-sm animate-pulse">●</span>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                            <div className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider opacity-80">Pending</div>
                            <div className="text-xl font-bold text-white mt-0.5 flex justify-between items-center text-yellow-300">
                                {stats.pending}
                                <span className="text-sm">⏳</span>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                            <div className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider opacity-80">Documents</div>
                            <div className="text-xl font-bold text-white mt-0.5 flex justify-between items-center">
                                {stats.documents}
                                <span className="text-sm">📁</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Overlapping for modern look */}
            <div className="max-w-7xl mx-auto px-6 -mt-6 pb-8 relative z-20">
                {activeTab === 'tracker' && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-6">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Permit Process Timeline</h2>
                                <p className="text-gray-500 mt-1 font-medium">Track your Naksha Pass application through all municipal steps</p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                <span className="text-sm font-bold text-emerald-800 tracking-wide">
                                    {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}% Approved
                                </span>
                            </div>
                        </div>
                        <PermitTracker onUpdate={fetchStats} />
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-6">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Legal Document Vault</h2>
                            <p className="text-gray-500 mt-1 font-medium">Securely store and manage all your construction-related legal documents</p>
                        </div>
                        <DocumentVault onUpdate={fetchStats} />
                    </div>
                )}
            </div>

            {/* Help Section - Modernized */}
            <div className="max-w-7xl mx-auto px-6 pb-12">
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                        <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 group-hover:rotate-0 transition-transform">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Need Help with Permits?</h3>
                            <p className="text-gray-600 mt-1 font-medium">
                                Contact Tulsipur Sub-Metropolitan City Engineering Department: <span className="text-emerald-600 font-bold ml-1">082-520000</span>
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                                {['📄 Required: Lalpurja, Nagrikta', '📐 Approval: 7-15 days', '💰 Fees: Area Based'].map((pill, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-600 border border-gray-100 uppercase tracking-widest">
                                        {pill}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-md hover:shadow-lg active:scale-95">
                            Official Guide
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PermitPage;
