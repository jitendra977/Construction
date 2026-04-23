import React, { useState, useEffect } from 'react';
import { useConstruction } from '../../../context/ConstructionContext';
import { accountingService } from '../../../services/accountingService';
import TreasuryTab from './TreasuryTab';
import PayablesTab from './PayablesTab';
import LedgerTab from './LedgerTab';
import BudgetTab from './BudgetTab';
import CostAnalysisTab from './CostAnalysisTab';
import CashFlowTab from './CashFlowTab';

const fmt = (v) => 'NPR ' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const SummaryCard = ({ label, value, sub, accent }) => (
    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--t-text3)] mb-1">{label}</p>
        <p className={`text-2xl font-black ${accent || 'text-[var(--t-text)]'}`}>{value}</p>
        {sub && <p className="text-xs text-[var(--t-text3)] mt-1">{sub}</p>}
    </div>
);

const AccountingDashboard = () => {
    const { dashboardData, activeProjectId } = useConstruction();
    const projectId = activeProjectId || dashboardData?.project?.id;

    const [activeTab, setActiveTab] = useState('overview');
    const [summary, setSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // Mixed bilingual — English primary, Nepali secondary
    const tabs = [
        { id: 'overview',   en: 'Overview',    np: 'सारांश' },
        { id: 'milestones', en: 'Milestones',  np: 'माइलस्टोन' },
        { id: 'bills',      en: 'Bills',        np: 'बिलहरू' },
        { id: 'treasury',   en: 'Treasury',    np: 'बैंक/नगद' },
        { id: 'budget',     en: 'Budget',      np: 'बजेट' },
        { id: 'ledger',     en: 'Ledger',      np: 'खाताबही' },
    ];

    useEffect(() => {
        if (!projectId) return;
        setLoadingSummary(true);
        accountingService.getSummary(projectId)
            .then(res => setSummary(res.data))
            .catch(err => console.error('Summary load error', err))
            .finally(() => setLoadingSummary(false));
    }, [projectId]);

    // summary shape from backend: { gl, cash: { total_cash, bank_accounts }, payables: { total_billed, total_paid, total_due, overdue_count, overdue_amount }, payment_requests: { pending_count, pending_amount }, phase_summary, cash_flow }
    const totalCash    = summary?.cash?.total_cash ?? 0;
    const totalBilled  = summary?.payables?.total_billed ?? 0;
    const outstanding  = summary?.payables?.total_due ?? 0;
    const pendingCount = summary?.payment_requests?.pending_count ?? 0;
    const pendingAmt   = summary?.payment_requests?.pending_amount ?? 0;

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header — mixed bilingual, no toggle */}
            <div className="pb-4 border-b border-[var(--t-border)] flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-black text-[var(--t-text)]">
                        Construction Accounting <span className="text-sm font-bold text-[var(--t-text3)] ml-1">/ निर्माण लेखा</span>
                    </h2>
                    <p className="text-sm text-[var(--t-text3)] mt-0.5">
                        Financial management · <span className="opacity-70">वित्तीय व्यवस्थापन</span>
                    </p>
                </div>
                {dashboardData?.project && (
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-primary)]">Active Project</p>
                        <p className="text-sm font-bold text-[var(--t-text)]">{dashboardData.project.name} <span className="text-[10px] opacity-50">#{dashboardData.project.id}</span></p>
                    </div>
                )}
            </div>

            {/* Tab Bar */}
            <div className="flex flex-wrap gap-1 p-1 bg-[var(--t-surface2)] rounded-xl w-fit border border-[var(--t-border)]">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap text-left ${
                            activeTab === tab.id
                                ? 'bg-[var(--t-surface)] shadow-sm text-[var(--t-text)]'
                                : 'text-[var(--t-text3)] hover:text-[var(--t-text)]'
                        }`}
                    >
                        <span className="text-sm font-bold">{tab.en}</span>
                        <span className="text-[10px] font-semibold ml-1.5 opacity-50">{tab.np}</span>
                    </button>
                ))}
            </div>

            {/* Summary Cards — Overview tab only */}
            {activeTab === 'overview' && (
                loadingSummary ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm p-5 animate-pulse h-24" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard label={<>Total Cash <span className="opacity-50 font-normal">/ कुल नगद</span></>} value={fmt(totalCash)} accent="text-emerald-600" />
                        <SummaryCard label={<>Total Billed <span className="opacity-50 font-normal">/ कुल बिल</span></>} value={fmt(totalBilled)} accent="text-[var(--t-text)]" />
                        <SummaryCard label={<>Outstanding <span className="opacity-50 font-normal">/ बाँकी</span></>} value={fmt(outstanding)} accent="text-red-600" />
                        <SummaryCard
                            label={<>Pending <span className="opacity-50 font-normal">/ विचाराधीन</span></>}
                            value={`${pendingCount} requests`}
                            sub={fmt(pendingAmt)}
                            accent="text-amber-600"
                        />
                    </div>
                )
            )}

            {/* Content */}
            <div className="min-h-[500px]">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Phase Summary */}
                        {summary?.phase_summary && summary.phase_summary.length > 0 && (
                            <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b border-[var(--t-border)] bg-[var(--t-surface2)]">
                                    <h3 className="text-sm font-black uppercase tracking-wider text-[var(--t-text)]">Phase Summary</h3>
                                </div>
                                <div className="divide-y divide-[var(--t-border)]">
                                    {summary.phase_summary.map((ph, i) => (
                                        <div key={i} className="flex items-center justify-between px-5 py-3">
                                            <span className="text-sm font-semibold text-[var(--t-text)]">{ph.phase_name}</span>
                                            <div className="flex items-center gap-6 text-right">
                                                <div>
                                                    <p className="text-[10px] text-[var(--t-text3)] uppercase font-bold">Budget</p>
                                                    <p className="text-sm font-bold text-[var(--t-text2)]">{fmt(ph.budgeted_amount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-[var(--t-text3)] uppercase font-bold">Spent</p>
                                                    <p className="text-sm font-bold text-[var(--t-text2)]">{fmt(ph.spent_amount)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!summary && !loadingSummary && (
                            <div className="p-12 border-2 border-dashed border-[var(--t-border)] rounded-xl text-center text-[var(--t-text3)]">
                                Select a project to view accounting data.
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'milestones' && <PayablesTab projectId={projectId} section="milestones" />}
                {activeTab === 'bills' && <PayablesTab projectId={projectId} section="bills" />}
                {activeTab === 'treasury' && <TreasuryTab projectId={projectId} />}
                {activeTab === 'budget' && <BudgetTab projectId={projectId} />}
                {activeTab === 'ledger' && <LedgerTab projectId={projectId} />}
            </div>
        </div>
    );
};

export default AccountingDashboard;
