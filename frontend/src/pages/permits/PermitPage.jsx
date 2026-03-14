import React, { useState, useEffect } from 'react';
import PermitTracker from '../../components/desktop/permits/PermitTracker';
import DocumentVault from '../../components/desktop/permits/DocumentVault';
import { permitService } from '../../services/api';
import MobileLayout from '../../components/mobile/MobileLayout';

const PermitPage = () => {
    const [isMobile] = useState(window.innerWidth < 1024);
    const [activeTab, setActiveTab] = useState('tracker');
    const [stats, setStats] = useState({
        total: 0,
        approved: 0,
        inProgress: 0,
        pending: 0,
        documents: 0
    });

    const fetchStats = async () => {
        try {
            const stepsResponse = await permitService.getSteps();
            const docsResponse = await permitService.getDocuments();

            const stepsData = stepsResponse.data || [];
            setStats({
                total: stepsData.length,
                approved: stepsData.filter(s => s.status === 'APPROVED').length,
                inProgress: stepsData.filter(s => s.status === 'IN_PROGRESS').length,
                pending: stepsData.filter(s => s.status === 'PENDING').length,
                documents: (docsResponse.data || []).length
            });
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const tabs = [
        { id: 'tracker', label: 'Timeline', icon: '📋' },
        { id: 'documents', label: 'Vault', icon: '📁' }
    ];

    const headerExtra = (
        <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-xl border border-slate-200 shadow-sm">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${activeTab === tab.id
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-emerald-600'
                        }`}
                >
                    <span>{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                </button>
            ))}
        </div>
    );

    const content = (
        <div className="space-y-8 pb-12">
            {!isMobile && (
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 shadow-xl pb-16 pt-8 px-6 rounded-[2rem] relative overflow-hidden mb-12">
                   {/* Desktop Header content would go here if not MobileLayout */}
                </div>
            )}

            {/* Local Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'emerald' },
                    { label: 'Approved', value: stats.approved, color: 'emerald', icon: '✓' },
                    { label: 'In Progress', value: stats.inProgress, color: 'teal', icon: '●' },
                    { label: 'Pending', value: stats.pending, color: 'amber', icon: '⏳' },
                    { label: 'Documents', value: stats.documents, color: 'slate', icon: '📁' }
                ].map((s, i) => (
                    <div key={i} className="card-glass rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
                        <div className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{s.label}</div>
                        <div className={`text-xl font-black mt-1 text-slate-800 flex justify-between items-center tabular-nums text-[20px]`}>
                            {s.value}
                            {s.icon && <span className={`text-[10px] text-${s.color}-500`}>{s.icon}</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="card-glass rounded-[2rem] p-6 shadow-sm min-h-[500px]">
                {activeTab === 'tracker' ? <PermitTracker onUpdate={fetchStats} /> : <DocumentVault onUpdate={fetchStats} />}
            </div>

            {/* Help Section */}
            <div className="card-glass rounded-[2rem] p-8 border border-slate-100 relative overflow-hidden group">
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl">🏛️</div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Municipal Support</h3>
                         <p className="text-slate-500 mt-1 font-medium text-[11px]">Engineering Department: <span className="text-emerald-600 font-bold">082-520000</span></p>
                    </div>
                    <button className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">Guide</button>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <MobileLayout 
                title="Permits" 
                subtitle="Naksha Pass Flow"
                headerExtra={headerExtra}
            >
                {content}
            </MobileLayout>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Permit Engine</h1>
            {content}
        </div>
    );
};

export default PermitPage;
