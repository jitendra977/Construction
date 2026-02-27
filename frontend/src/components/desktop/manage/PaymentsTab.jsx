import React, { useMemo } from 'react';
import { useConstruction } from '../../../context/ConstructionContext';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const PaymentsTab = ({ searchQuery = '' }) => {
    const { dashboardData, loading } = useConstruction();

    const flattenedPayments = useMemo(() => {
        if (!dashboardData?.expenses) return [];
        let payments = [];
        dashboardData.expenses.forEach(exp => {
            if (exp.payments && exp.payments.length > 0) {
                exp.payments.forEach(payment => {
                    const fundingSource = dashboardData.funding?.find(f => f.id === payment.funding_source);
                    payments.push({
                        ...payment,
                        expense_title: exp.title,
                        paid_to: exp.paid_to || exp.contractor_name || exp.supplier_name || 'Self/Other',
                        category_name: exp.category_name,
                        funding_source_name: fundingSource ? fundingSource.name : 'Unknown',
                        expense_type: exp.expense_type
                    });
                });
            }
        });

        // Sort by dates descending
        payments.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Filter by searchQuery
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return payments.filter(p =>
                p.expense_title?.toLowerCase().includes(query) ||
                p.paid_to?.toLowerCase().includes(query) ||
                p.method?.toLowerCase().includes(query) ||
                p.reference_id?.toLowerCase().includes(query)
            );
        }

        return payments;
    }, [dashboardData, searchQuery]);

    const getMethodColor = (method) => {
        const colors = {
            'CASH': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'BANK_TRANSFER': 'bg-blue-100 text-blue-700 border-blue-200',
            'CHECK': 'bg-purple-100 text-purple-700 border-purple-200',
            'QR': 'bg-pink-100 text-pink-700 border-pink-200'
        };
        return colors[method] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    if (loading) {
        return <div className="p-4 bg-white rounded-xl shadow-sm"><Skeleton count={10} height={40} className="mb-2" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500">View all historical payments and transactions generated across the project.</p>
                <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-sm font-bold border border-indigo-100 shadow-sm">
                    {flattenedPayments.length} Payments Found
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Paid To / Expense</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Method & Record</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Funding Source</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Amount Out</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {flattenedPayments.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 border border-green-100 shadow-sm">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date(p.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{p.paid_to}</div>
                                    <div className="text-xs text-gray-500 max-w-[200px] truncate" title={p.expense_title}>{p.expense_title}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider w-fit mb-1 border ${getMethodColor(p.method)}`}>
                                        {p.method.replace('_', ' ')}
                                    </div>
                                    {p.reference_id && (
                                        <div className="text-[10px] text-gray-400 font-mono">Ref: {p.reference_id}</div>
                                    )}
                                    {p.notes && (
                                        <div className="text-[10px] text-gray-500 italic mt-1 bg-yellow-50/50 px-2 py-0.5 rounded border border-yellow-100 max-w-[200px] truncate" title={p.notes}>Note: {p.notes}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-xs font-semibold text-gray-600">
                                        🏦 {p.funding_source_name || 'Main Budget'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-red-500 font-black text-lg">
                                        - {Number(p.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {flattenedPayments.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic text-sm">No recorded payments found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile List View */}
            <div className="lg:hidden space-y-3">
                {flattenedPayments.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-50 flex flex-col items-center justify-center text-red-600 border border-red-100 leading-tight shrink-0">
                                    <span className="text-[10px] font-bold uppercase">{new Date(p.date).toLocaleDateString('en-GB', { month: 'short' })}</span>
                                    <span className="text-lg font-black">{new Date(p.date).getDate()}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base leading-tight truncate w-[160px]">{p.paid_to}</h3>
                                    <p className="text-xs text-gray-500 truncate w-[160px]">{p.expense_title}</p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-lg font-black text-red-500 leading-none">-{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center text-xs">
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Method</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border w-fit ${getMethodColor(p.method)}`}>
                                    {p.method.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 text-right">
                                <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Source</span>
                                <span className="text-gray-700 font-semibold max-w-[120px] truncate">{p.funding_source_name}</span>
                            </div>
                        </div>
                        {p.notes && (
                            <div className="bg-yellow-50/30 text-yellow-800 rounded-xl px-3 py-2 text-xs italic border border-yellow-100/50">
                                <strong>Note:</strong> {p.notes}
                            </div>
                        )}
                    </div>
                ))}
                {flattenedPayments.length === 0 && (
                    <div className="py-10 text-center text-gray-400 italic bg-white rounded-2xl shadow-sm border border-gray-100">
                        No recorded payments found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentsTab;
