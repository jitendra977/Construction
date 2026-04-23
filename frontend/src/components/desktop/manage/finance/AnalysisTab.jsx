import React from 'react';
import { useConstruction } from '../../../../context/ConstructionContext';

const fmt = (val) => `Rs. ${parseFloat(val || 0).toLocaleString('en-IN')}`;
const pct = (num, den) => den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0;

/* ── Stat card ── */
const StatCard = ({ icon, title, subtitle, value, valueColor = 'text-[var(--t-text)]', children }) => (
    <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{icon}</span>
            <div>
                <h3 className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest">{title}</h3>
                {subtitle && <p className="text-[11px] text-[var(--t-text3)] opacity-70 mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <p className={`text-2xl font-black ${valueColor} mb-4`}>{value}</p>
        {children && <div className="space-y-2 pt-4 border-t border-[var(--t-border)]">{children}</div>}
    </div>
);

/* ── Info row inside a card ── */
const InfoRow = ({ label, value, valueClass = 'text-[var(--t-text)]' }) => (
    <div className="flex justify-between items-center text-xs">
        <span className="text-[var(--t-text2)]">{label}</span>
        <span className={`font-bold ${valueClass}`}>{value}</span>
    </div>
);

/* ── Section heading ── */
const SectionHead = ({ icon, title, description }) => (
    <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl mt-0.5">{icon}</span>
        <div>
            <h3 className="text-sm font-black text-[var(--t-text)]">{title}</h3>
            <p className="text-[11px] text-[var(--t-text3)] mt-0.5 leading-relaxed">{description}</p>
        </div>
    </div>
);

/* ── Progress bar ── */
const Bar = ({ pct: p, color = 'bg-[var(--t-primary)]' }) => (
    <div className="h-2 w-full bg-[var(--t-surface2)] rounded-full overflow-hidden border border-[var(--t-border)]">
        <div
            className={`h-full rounded-full transition-all duration-700 ${color}`}
            style={{ width: `${Math.min(100, Math.max(0, p))}%` }}
        />
    </div>
);

/* ══════════════════════════════════════════════════════════════════════════ */
const AnalysisTab = () => {
    const { financeOverview: data, loading } = useConstruction();

    if (loading || !data) return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-[var(--t-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--t-text3)] font-medium">Generating financial intelligence…</p>
        </div>
    );

    const assetBalance = data.account_balances?.ASSET || 0;
    const liabilityBalance = data.account_balances?.LIABILITY || 0;
    const netPosition = assetBalance - (data.total_accounts_payable || 0);
    const dailyBurn = data.total_spent / (data.days_active || 1);
    const daysOfCash = dailyBurn > 0 ? Math.floor(assetBalance / dailyBurn) : null;
    const apCoverage = pct(data.total_accounts_payable, assetBalance);

    return (
        <div className="space-y-10">

            {/* ── Intro banner ── */}
            <div className="p-5 rounded-2xl bg-[var(--t-primary)]/5 border border-[var(--t-primary)]/20 flex items-start gap-4">
                <span className="text-3xl mt-0.5">💡</span>
                <div>
                    <h2 className="text-base font-black text-[var(--t-text)]">Financial Analysis Dashboard</h2>
                    <p className="text-[13px] text-[var(--t-text2)] mt-1 leading-relaxed">
                        This page summarises your project's real-time financial health — sourced directly from your double-entry ledger.
                        All figures update automatically when bills, payments, and transfers are recorded.
                    </p>
                </div>
            </div>

            {/* ════════════════════ SECTION 1 — Net Position ════════════════════ */}
            <div>
                <SectionHead
                    icon="⚖️"
                    title="Net Financial Position"
                    description="Can you pay everything you owe right now? Net Position = Total Cash & Bank minus all outstanding bills."
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        icon="⚖️"
                        title="Net Financial Position"
                        subtitle="Cash & Bank  minus  Accounts Payable"
                        value={fmt(netPosition)}
                        valueColor={netPosition < 0 ? 'text-rose-600' : 'text-emerald-600'}
                    >
                        <InfoRow label="Total Cash & Bank (Assets)" value={fmt(assetBalance)} valueClass="text-emerald-600" />
                        <InfoRow label="Total Accounts Payable (Owed)" value={fmt(data.total_accounts_payable)} valueClass="text-rose-600" />
                        <InfoRow
                            label="Verdict"
                            value={netPosition >= 0 ? '✅ Solvent' : '🔴 Cash-Negative'}
                            valueClass={netPosition >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                        />
                    </StatCard>

                    <StatCard
                        icon="💧"
                        title="Liquidity (Available Cash)"
                        subtitle="How much money you can spend right now"
                        value={fmt(data.funding_balance)}
                        valueColor="text-sky-600"
                    >
                        <InfoRow label="Funding Balance Available" value={fmt(data.funding_balance)} />
                        <InfoRow label="GL Asset Balance (Bank/Cash)" value={fmt(assetBalance)} valueClass="text-sky-600" />
                        <div className="pt-1">
                            <div className="flex justify-between text-[10px] text-[var(--t-text3)] mb-1">
                                <span>AP coverage of assets</span>
                                <span className={apCoverage > 80 ? 'text-rose-600 font-bold' : 'text-[var(--t-text3)]'}>{apCoverage}%</span>
                            </div>
                            <Bar pct={apCoverage} color={apCoverage > 80 ? 'bg-rose-500' : 'bg-sky-400'} />
                        </div>
                    </StatCard>

                    <StatCard
                        icon="🔥"
                        title="Burn Rate"
                        subtitle="Average daily spending — tells you how fast money is leaving"
                        value={`${fmt(dailyBurn)} / day`}
                        valueColor="text-amber-600"
                    >
                        <InfoRow label="Days Active" value={`${data.days_active} days`} />
                        <InfoRow label="Total Spent (All Time)" value={fmt(data.total_spent)} />
                        {daysOfCash !== null && (
                            <InfoRow
                                label="Estimated Cash Runway"
                                value={`~${daysOfCash} days`}
                                valueClass={daysOfCash < 30 ? 'text-rose-600' : 'text-emerald-600'}
                            />
                        )}
                    </StatCard>
                </div>
            </div>

            {/* ════════════════════ SECTION 2 — Cash & Bank ════════════════════ */}
            <div>
                <SectionHead
                    icon="🏦"
                    title="Cash & Bank Balances"
                    description="Each account listed here represents a physical bank account, cash wallet, or fund. Balances come from the General Ledger — every deposit and withdrawal is tracked."
                />
                {data.bank_cash_details?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.bank_cash_details.map(acc => {
                            const bal = parseFloat(acc.balance || 0);
                            const sharePct = assetBalance > 0 ? pct(Math.max(0, bal), assetBalance) : 0;
                            return (
                                <div key={acc.id} className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-5 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-xl">🏦</div>
                                        <div className="min-w-0">
                                            <p className="font-black text-[var(--t-text)] truncate">{acc.name}</p>
                                            <p className="font-mono text-[10px] text-[var(--t-text3)] uppercase tracking-wider">{acc.code}</p>
                                        </div>
                                    </div>
                                    <p className={`text-2xl font-black font-mono mb-3 ${bal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {bal < 0 ? '- ' : ''}{fmt(Math.abs(bal))}
                                    </p>
                                    <div className="flex justify-between text-[10px] text-[var(--t-text3)] mb-1">
                                        <span>Share of total assets</span>
                                        <span className="font-bold">{sharePct}%</span>
                                    </div>
                                    <Bar pct={sharePct} color="bg-emerald-500" />
                                    <p className="text-[10px] text-[var(--t-text3)] mt-2">
                                        {bal < 0 ? '⚠️ Negative balance — check for missing credits.' : '✅ Funds available'}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-[var(--t-surface2)]/30 border-2 border-dashed border-[var(--t-border)] rounded-2xl">
                        <p className="text-2xl mb-2 opacity-20">🏦</p>
                        <p className="text-sm font-bold text-[var(--t-text2)]">No asset accounts found.</p>
                        <p className="text-xs text-[var(--t-text3)]">Go to the Accounts tab and add a Bank or Cash account with an opening balance.</p>
                    </div>
                )}
            </div>

            {/* ════════════════════ SECTION 3 — Accounts Payable ════════════════════ */}
            <div>
                <SectionHead
                    icon="📋"
                    title="Accounts Payable — What You Owe"
                    description="Money owed to suppliers and contractors for recorded but unpaid bills. This is a liability — it reduces your net position until settled."
                />
                <div className="bg-rose-50/40 rounded-2xl border border-rose-200/50 p-6 flex flex-col sm:flex-row gap-6 items-center">
                    <div className="text-center sm:text-left flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Outstanding Payables</p>
                        <p className="text-4xl font-black text-rose-600 mb-2">{fmt(data.total_accounts_payable)}</p>
                        <p className="text-xs text-rose-700/70 max-w-sm leading-relaxed">
                            Total balance on all <strong>Unpaid</strong> and <strong>Partially Paid</strong> vendor bills.
                            Go to the <strong>Bills</strong> tab to settle these.
                        </p>
                    </div>
                    <div className="w-full sm:w-64">
                        <div className="flex justify-between text-[10px] text-rose-600 font-bold mb-1">
                            <span>Payables vs Cash</span>
                            <span>{apCoverage}% of assets</span>
                        </div>
                        <div className="h-3 w-full bg-rose-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-rose-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.3)] transition-all duration-700"
                                style={{ width: `${apCoverage}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-rose-500 mt-2">
                            {apCoverage >= 100
                                ? '🔴 Payables exceed your cash — urgent action needed!'
                                : apCoverage >= 70
                                    ? '⚠️ High payables relative to cash.'
                                    : '✅ Payables are manageable relative to available cash.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ════════════════════ SECTION 4 — Category Burn ════════════════════ */}
            {data.category_breakdown?.length > 0 && (
                <div>
                    <SectionHead
                        icon="📊"
                        title="Budget Category — Spending vs Allocation"
                        description="How much of each category's budget has been used? A red bar means you are over the allocated amount."
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {data.category_breakdown.map(cat => {
                            const spentPct = pct(cat.spent, cat.allocation);
                            const isOver = cat.variance < 0;
                            return (
                                <div key={cat.id} className={`bg-[var(--t-surface)] border rounded-xl p-4 ${isOver ? 'border-rose-400/50' : 'border-[var(--t-border)]'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="text-xs font-black text-[var(--t-text)] uppercase tracking-tight truncate max-w-[130px]">
                                            {cat.name}
                                        </h4>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOver ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {spentPct}%
                                        </span>
                                    </div>
                                    <Bar pct={spentPct} color={isOver ? 'bg-rose-500' : 'bg-[var(--t-primary)]'} />
                                    <div className="flex justify-between mt-3 text-[11px]">
                                        <div>
                                            <p className="text-[var(--t-text3)]">Spent</p>
                                            <p className="font-black text-[var(--t-text)]">{fmt(cat.spent)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[var(--t-text3)]">Budget</p>
                                            <p className="font-black text-[var(--t-text)]">{fmt(cat.allocation)}</p>
                                        </div>
                                    </div>
                                    {isOver && (
                                        <p className="mt-2 text-[10px] text-rose-600 font-bold">
                                            ⚠️ Over by {fmt(Math.abs(cat.variance))}
                                        </p>
                                    )}
                                    {!isOver && (
                                        <p className="mt-2 text-[10px] text-emerald-600">
                                            ✅ {fmt(cat.variance)} remaining
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ════════════════════ SECTION 5 — Phase Breakdown ════════════════════ */}
            {data.phase_breakdown?.length > 0 && (
                <div>
                    <SectionHead
                        icon="🏗️"
                        title="Construction Phase — Spending vs Estimate"
                        description="How much has been spent in each phase compared to its estimated budget. Overruns appear in red."
                    />
                    <div className="space-y-3">
                        {data.phase_breakdown.map(phase => {
                            const spentPct = pct(phase.spent, phase.estimate);
                            const isOver = phase.variance < 0;
                            return (
                                <div key={phase.id} className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                <h4 className="font-black text-[var(--t-text)]">{phase.name}</h4>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOver ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {spentPct}% used
                                                </span>
                                                {isOver && <span className="text-[10px] font-bold text-rose-600">🔴 OVER BUDGET</span>}
                                            </div>
                                            <Bar pct={spentPct} color={isOver ? 'bg-rose-500' : 'bg-[var(--t-primary)]'} />
                                        </div>
                                        <div className="flex gap-6 text-xs shrink-0 font-mono">
                                            <div>
                                                <p className="text-[var(--t-text3)] mb-0.5">Spent</p>
                                                <p className="font-black text-[var(--t-text)]">{fmt(phase.spent)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[var(--t-text3)] mb-0.5">Estimated</p>
                                                <p className="font-black text-[var(--t-text)]">{fmt(phase.estimate)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[var(--t-text3)] mb-0.5">{isOver ? 'Over by' : 'Remaining'}</p>
                                                <p className={`font-black ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {fmt(Math.abs(phase.variance))}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

        </div>
    );
};

export default AnalysisTab;
