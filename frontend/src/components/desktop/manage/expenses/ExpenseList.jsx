import React from 'react';

const ExpenseList = ({
    expenses,
    handleViewDetail,
    handleOpenPaymentModal,
    handleOpenModal,
    handleDelete,
    formatCurrency,
    dashboardData
}) => {
    return (
        <div className="space-y-6">
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white/60 backdrop-blur-xl rounded-3xl border border-white shadow-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Expense Details</th>
                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Financials</th>
                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Recipient & Date</th>
                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {expenses.map(e => (
                            <tr key={e.id} className="hover:bg-indigo-50/30 transition-all duration-300 group">
                                <td className="px-8 py-6 cursor-pointer" onClick={() => handleViewDetail(e.id)}>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[14px] font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                                {e.title}
                                            </span>
                                            {e.material_transaction && (
                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded-lg border border-indigo-200" title="Inventory Sync">
                                                    Stock In
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest uppercase ${e.expense_type === 'MATERIAL' ? 'bg-blue-100 text-blue-700' :
                                                e.expense_type === 'LABOR' ? 'bg-orange-100 text-orange-700' :
                                                    e.expense_type === 'FEES' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-gray-100 text-gray-600'
                                                }`}>
                                                {e.expense_type}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                                {e.category_name}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className={`inline-flex items-center px-3 py-1 rounded-2xl text-[10px] font-black uppercase tracking-widest ${e.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-50' :
                                        e.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700 shadow-sm shadow-amber-50' :
                                            'bg-rose-100 text-rose-700 shadow-sm shadow-rose-50'
                                        }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${e.status === 'PAID' ? 'bg-emerald-500' :
                                            e.status === 'PARTIAL' ? 'bg-amber-500' :
                                                'bg-rose-500'
                                            }`} />
                                        {e.status}
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-black text-gray-900">{formatCurrency(e.amount)}</span>
                                        {Number(e.balance_due) > 0 && (
                                            <div className="mt-1.5 flex flex-col gap-1">
                                                <div className="flex justify-between items-center w-32">
                                                    <span className="text-[10px] text-rose-500 font-black uppercase tracking-tighter">Due: {formatCurrency(e.balance_due)}</span>
                                                </div>
                                                <div className="w-32 bg-gray-100 h-1.5 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full transition-all duration-1000 shadow-sm"
                                                        style={{ width: `${(Number(e.total_paid) / Number(e.amount)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            {e.expense_type === 'LABOR' && e.contractor_photo ? (
                                                <img src={getMediaUrl(e.contractor_photo)} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-gray-200" />
                                            ) : e.expense_type === 'MATERIAL' && e.supplier_photo ? (
                                                <img src={getMediaUrl(e.supplier_photo)} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-gray-200" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                    {(e.paid_to || 'U').charAt(0)}
                                                </div>
                                            )}
                                            <span className="text-[12px] font-black text-gray-700 uppercase tracking-tight">{e.paid_to || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-gray-400 font-bold mt-0.5">
                                                {new Date(e.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex justify-end items-center gap-3">
                                        {Number(e.balance_due) > 0 && (
                                            <button
                                                onClick={() => handleOpenPaymentModal(e)}
                                                className="px-4 py-2 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all active:scale-95"
                                            >
                                                Pay Due
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleOpenModal(e)}
                                            className="p-2.5 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-100 hover:shadow-sm"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(e.id)}
                                            className="p-2.5 text-rose-300 hover:text-rose-500 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-100 hover:shadow-sm"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: High-End Cards */}
            <div className="lg:hidden space-y-5">
                {expenses.map(e => (
                    <div key={e.id} className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-6 border border-white shadow-xl flex flex-col gap-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4">
                            <div className={`px-3 py-1 rounded-2xl text-[9px] font-black uppercase tracking-widest ${e.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                e.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                                    'bg-rose-100 text-rose-700'
                                }`}>
                                {e.status}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                {new Date(e.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} • {e.category_name}
                            </span>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight line-clamp-1">{e.title}</h3>
                                {e.material_transaction && (
                                    <span className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between items-end border-y border-gray-50 py-4">
                            <div className="flex items-center gap-3">
                                {e.contractor_photo ? (
                                    <img src={e.contractor_photo} alt={e.contractor_name} className="w-10 h-10 rounded-2xl object-cover border border-white shadow-sm" />
                                ) : (
                                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 shadow-inner">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Recipient</span>
                                    <span className="text-sm font-black text-gray-700">{e.paid_to || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Amount</span>
                                <span className="text-xl font-black text-indigo-600">{formatCurrency(e.amount)}</span>
                                {Number(e.balance_due) > 0 && (
                                    <span className="text-[10px] font-black text-rose-500 uppercase mt-1">Due: {formatCurrency(e.balance_due)}</span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {Number(e.balance_due) > 0 && (
                                <button
                                    onClick={() => handleOpenPaymentModal(e)}
                                    className="col-span-2 py-4 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all"
                                >
                                    Record Payment
                                </button>
                            )}
                            <button
                                onClick={() => handleOpenModal(e)}
                                className="py-3.5 bg-gray-50 text-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(e.id)}
                                className="py-3.5 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {expenses.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center bg-white/50 backdrop-blur-md rounded-3xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl mb-4">🔍</div>
                    <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">No expenses found matching your criteria</p>
                </div>
            )}
        </div>
    );
};

export default ExpenseList;
