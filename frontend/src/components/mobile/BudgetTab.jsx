import React, { useState } from 'react';
import { useConstruction } from '../../context/ConstructionContext';
import ExpenseDetailModal from '../common/ExpenseDetailModal';
import MobileLayout from './MobileLayout';
import MobilePageHeader from './MobilePageHeader';

const BudgetTab = () => {
    const { dashboardData, budgetStats, formatCurrency } = useConstruction();
    const { expenses } = dashboardData;
    const {
        totalBudget,
        totalSpent,
        budgetPercent,
        inventoryValue,
        availableCash,
        totalFunded,
        totalDebt,
        fundingCoverage,
        debtToEquity,
        lowStockItems
    } = budgetStats;

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);

    const handleViewDetail = (id) => {
        setSelectedExpenseId(id);
        setIsDetailModalOpen(true);
    };

    const headerExtra = (
        <div className={`px-3 py-1 rounded-full dynamic-subtitle shadow-sm ${availableCash > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-[var(--t-danger)]'}`}>
            {availableCash > 0 ? 'Stable' : 'Deficit'}
        </div>
    );

    return (
        <MobileLayout>
            <MobilePageHeader
                title="Finance Engine"
                subtitle={availableCash > 0 ? 'Budget Stable' : 'Budget Deficit'}
                rightExtra={
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: 2,
                        fontSize: 8,
                        textTransform: 'uppercase',
                        letterSpacing: '0.2em',
                        fontFamily: "'DM Mono', monospace",
                        background: availableCash > 0 ? 'color-mix(in srgb, var(--t-primary) 10%, transparent)' : 'color-mix(in srgb, var(--t-danger) 10%, transparent)',
                        color: availableCash > 0 ? 'var(--t-primary)' : 'var(--t-danger)',
                        border: `1px solid ${availableCash > 0 ? 'color-mix(in srgb, var(--t-primary) 30%, transparent)' : 'color-mix(in srgb, var(--t-danger) 30%, transparent)'}`,
                    }}>{availableCash > 0 ? 'Stable' : 'Deficit'}</span>
                }
            />
            <div className="cyber-wrap pb-28 pt-4">
                {/* Main Stats Grid */}
                <div className="ht-sec">
                        <div className="cyber-card group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl rotate-12 grayscale group-hover:grayscale-0 transition-all">💰</div>
                            <div className="relative z-10">
                                <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--t-text2)] font-['DM_Mono',monospace] mb-1">Total Utilization</p>
                                <h3 className="text-4xl text-[var(--t-text)] leading-none font-['Bebas_Neue',sans-serif] tracking-wide">{formatCurrency(totalSpent)}</h3>
                                <p className="text-[10px] text-[var(--t-text3)] font-['DM_Mono',monospace] mt-1">of {formatCurrency(totalBudget)} planned</p>

                                <div className="mt-6">
                                    <div className="flex justify-between text-[9px] uppercase tracking-widest font-['DM_Mono',monospace] text-[var(--t-text2)] mb-2">
                                        <span>Used</span>
                                        <span className="text-[var(--t-primary)]">{budgetPercent.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-1 bg-[var(--t-surface3)] rounded-sm overflow-hidden">
                                        <div
                                            className="h-full bg-[var(--t-primary)] transition-all duration-1000 ease-out"
                                            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="cyber-card flex flex-col justify-end group cursor-default">
                                <div className="absolute -bottom-2 -right-2 text-3xl opacity-10 -rotate-6 grayscale group-hover:grayscale-0 transition-all">💵</div>
                                <p className="text-[8px] uppercase tracking-widest text-[var(--t-text2)] font-['DM_Mono',monospace] mb-1">Liquid</p>
                                <p className="text-2xl text-[var(--t-primary)] font-['Bebas_Neue',sans-serif] tracking-wide leading-none">{formatCurrency(availableCash)}</p>
                            </div>

                            <div className="cyber-card flex flex-col justify-end group cursor-default">
                                <div className="absolute -bottom-2 -right-2 text-3xl opacity-10 -rotate-6 grayscale group-hover:grayscale-0 transition-all">🏗️</div>
                                <p className="text-[8px] uppercase tracking-widest text-[var(--t-text2)] font-['DM_Mono',monospace] mb-1">Inventory</p>
                                <p className="text-2xl text-[var(--t-text)] font-['Bebas_Neue',sans-serif] tracking-wide leading-none">{formatCurrency(inventoryValue)}</p>
                            </div>
                        </div>
                </div>

                {/* Funding & Debt Section */}
                <div className="ht-sec">
                    <div className="cyber-card border-l-2 border-l-[var(--t-info)]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[10px] uppercase tracking-widest text-[var(--t-text2)] font-['DM_Mono',monospace]">Equity Matrix</h3>
                            <span className="text-[8px] uppercase tracking-widest font-['DM_Mono',monospace] bg-[var(--t-info)]/10 text-[var(--t-info)] px-2 py-0.5 rounded border border-[var(--t-info)]/20">
                                {fundingCoverage.toFixed(0)}% Cover
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col">
                                <span className="text-[8px] uppercase tracking-widest text-[var(--t-text3)] font-['DM_Mono',monospace] mb-1">Funded</span>
                                <span className="text-lg text-[var(--t-text)] font-['Bebas_Neue',sans-serif] leading-none tracking-wide">{formatCurrency(totalFunded)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] uppercase tracking-widest text-[var(--t-text3)] font-['DM_Mono',monospace] mb-1">Debt</span>
                                <span className="text-lg text-[var(--t-danger)] font-['Bebas_Neue',sans-serif] leading-none tracking-wide">{formatCurrency(totalDebt)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] uppercase tracking-widest text-[var(--t-text3)] font-['DM_Mono',monospace] mb-1">Ratio</span>
                                <span className="text-lg text-[var(--t-warn)] font-['Bebas_Neue',sans-serif] leading-none tracking-wide">{debtToEquity}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction Log */}
                <div className="ht-sec">
                    <div className="ht-sec-head">
                        <span className="ht-sec-label">Transactions</span>
                        {lowStockItems?.length > 0 && (
                            <span className="text-[8px] uppercase tracking-widest text-[var(--t-warn)] font-['DM_Mono',monospace] animate-pulse">
                                {lowStockItems.length} Low Stock
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-0.5">
                        {expenses && expenses.length === 0 ? (
                            <div className="ht-empty">
                                <p>No records found</p>
                            </div>
                        ) : (
                            expenses?.slice(0, 10).map((expense) => (
                                <div
                                    key={expense.id}
                                    onClick={() => handleViewDetail(expense.id)}
                                    className="bg-[var(--t-surface)] border border-[var(--t-border)] p-3 flex items-center gap-3 cursor-pointer hover:border-[var(--t-primary)] transition-colors rounded-[2px]"
                                >
                                    <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-sm border ${expense.expense_type === 'MATERIAL' ? 'bg-[var(--t-info)]/10 border-[var(--t-info)]/30' : expense.expense_type === 'LABOR' ? 'bg-[var(--t-warn)]/10 border-[var(--t-warn)]/30' : 'bg-[var(--t-surface3)] border-[var(--t-border)]'}`}>
                                        {expense.expense_type === 'MATERIAL' ? '📦' : expense.expense_type === 'LABOR' ? '👷' : '💸'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] text-[var(--t-text)] font-semibold truncate leading-tight">{expense.title}</p>
                                        <p className="text-[9px] text-[var(--t-text3)] font-['DM_Mono',monospace] mt-1">{new Date(expense.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[16px] text-[var(--t-text)] font-['Bebas_Neue',sans-serif] tracking-wide leading-none mb-1">{formatCurrency(expense.amount)}</p>
                                        <span className={`text-[7px] uppercase tracking-widest font-['DM_Mono',monospace] ${Number(expense.balance_due) > 0 ? 'text-[var(--t-warn)]' : 'text-[var(--t-primary)]'}`}>
                                            {Number(expense.balance_due) > 0 ? 'Due' : 'Paid'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <ExpenseDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                expenseId={selectedExpenseId}
            />
        </MobileLayout>
    );
};

export default BudgetTab;
