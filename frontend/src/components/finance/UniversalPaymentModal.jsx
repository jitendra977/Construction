import React, { useState } from 'react';
import { dashboardService } from '../../services/api';
import Modal from '../common/Modal';
import { useConstruction } from '../../context/ConstructionContext';

/**
 * UniversalPaymentModal
 * A unified component to handle payments for both Contractors and Suppliers.
 * Handles automatic expense creation, payment processing, and email receipts.
 */
const UniversalPaymentModal = ({ 
    isOpen, 
    onClose, 
    entity, 
    type, // 'CONTRACTOR' or 'SUPPLIER'
    onSuccess 
}) => {
    const { dashboardData, refreshData } = useConstruction();
    const [loading, setLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('IDLE'); // IDLE, PROCESSING, SUCCESS, ERROR
    const [photoPreview, setPhotoPreview] = useState(null);
    const [paymentFormData, setPaymentFormData] = useState({
        amount: entity?.balance_due > 0 ? entity.balance_due : '',
        date: new Date().toISOString().split('T')[0],
        method: 'CASH',
        reference_id: '',
        funding_source: '',
        notes: '',
        proof_photo: null,
        send_receipt: true
    });

    const isContractor = type === 'CONTRACTOR';
    const title = isContractor ? `Pay Contractor: ${entity?.name}` : `Pay Supplier: ${entity?.name}`;

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPaymentFormData({ ...paymentFormData, proof_photo: file });
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        if (!paymentFormData.proof_photo) {
            alert('Security Requirement: Payment proof photo is mandatory to record this transaction.');
            return;
        }

        setLoading(true);
        setPaymentStatus('PROCESSING');

        try {
            // 1. Identify Category
            const searchKeyword = isContractor ? 'labor' : 'material';
            let categoryId = dashboardData.budgetCategories?.find(c => 
                c.name.toLowerCase().includes(searchKeyword)
            )?.id;
            
            if (!categoryId && dashboardData.budgetCategories?.length > 0) {
                categoryId = dashboardData.budgetCategories[0].id;
            }

            // 2. Identify/Create Expense
            let targetExpenseId = null;
            const filterKey = isContractor ? 'contractor' : 'supplier';
            const unpaidExpenses = dashboardData.expenses?.filter(exp => 
                exp[filterKey] === entity.id && exp.balance_due > 0
            );

            if (unpaidExpenses && unpaidExpenses.length > 0) {
                targetExpenseId = unpaidExpenses[0].id;
            } else {
                const expensePayload = {
                    title: `${isContractor ? 'Labor' : 'Material'} Payment/Advance: ${entity.name}`,
                    amount: parseFloat(paymentFormData.amount),
                    expense_type: isContractor ? 'LABOR' : 'MATERIAL',
                    category: categoryId,
                    date: paymentFormData.date,
                    is_paid: false,
                    paid_to: entity.name,
                    funding_source: paymentFormData.funding_source
                };
                expensePayload[filterKey] = entity.id;

                const expenseRes = await dashboardService.createExpense(expensePayload);
                targetExpenseId = expenseRes.data.id;
            }

            // 3. Create Payment with FormData
            const formData = new FormData();
            formData.append('expense', targetExpenseId);
            formData.append('funding_source', paymentFormData.funding_source);
            formData.append('amount', parseFloat(paymentFormData.amount));
            formData.append('date', paymentFormData.date);
            formData.append('method', paymentFormData.method);
            formData.append('reference_id', paymentFormData.reference_id);
            formData.append('notes', paymentFormData.notes);
            formData.append('send_receipt', paymentFormData.send_receipt);
            if (paymentFormData.proof_photo) {
                formData.append('proof_photo', paymentFormData.proof_photo);
            }

            await dashboardService.createPayment(formData);

            setPaymentStatus('SUCCESS');
            refreshData();
            if (onSuccess) onSuccess();
            
            setTimeout(() => {
                onClose();
                setPaymentStatus('IDLE');
                setPhotoPreview(null);
            }, 2000);

        } catch (error) {
            console.error("Universal Payment failed", error);
            setPaymentStatus('ERROR');
            setTimeout(() => setPaymentStatus('IDLE'), 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                {/* Entity Context Card */}
                <div className="bg-[var(--t-surface2)] p-4 rounded-2xl border border-[var(--t-border)] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--t-primary)]/10 text-[var(--t-primary)] flex items-center justify-center font-bold border border-[var(--t-primary)]/10">
                            {entity?.name?.charAt(0)}
                        </div>
                        <div>
                            <div className="text-xs font-black text-[var(--t-text3)] uppercase tracking-widest leading-none mb-1">
                                {isContractor ? entity?.role : entity?.category || 'Supplier'}
                            </div>
                            <div className="text-sm font-bold text-[var(--t-text)]">{entity?.name}</div>
                        </div>
                    </div>
                    {entity?.balance_due > 0 && (
                        <div className="text-right">
                            <div className="text-[9px] font-black text-[var(--t-danger)] uppercase tracking-tighter leading-none mb-1">Unpaid Dues</div>
                            <div className="text-sm font-black text-[var(--t-danger)] leading-none italic">
                                Rs. {entity?.balance_due?.toLocaleString()}
                            </div>
                        </div>
                    )}
                </div>

                {!isContractor && entity?.bank_name && (
                    <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 flex items-center gap-3">
                        <div className="text-xl">🏦</div>
                        <div>
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-tighter leading-none mb-1">Remit To:</div>
                            <div className="text-xs font-bold text-[var(--t-text2)] leading-none">
                                {entity.bank_name} • {entity.account_number}
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Paying Amount (Rs.)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={paymentFormData.amount}
                                onChange={e => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-green-500 p-3 border outline-none font-bold text-green-600 bg-[var(--t-surface)]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Date</label>
                            <input
                                type="date"
                                value={paymentFormData.date}
                                onChange={e => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none bg-[var(--t-surface)]"
                                required
                            />
                        </div>
                    </div>

                    <div className="bg-[var(--t-surface2)] p-5 rounded-2xl border border-[var(--t-border)] mt-4">
                        <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] mb-3 ml-1">Funding Source</label>
                        <select
                            value={paymentFormData.funding_source}
                            onChange={e => setPaymentFormData({ ...paymentFormData, funding_source: e.target.value })}
                            className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none appearance-none bg-[var(--t-surface)] font-black text-[var(--t-text)]"
                            required
                        >
                            <option value="">Select Account / Funding Source</option>
                            {dashboardData.funding?.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.source_type === 'LOAN' ? '🏦 Karja: ' : f.source_type === 'OWN_MONEY' ? '💰 Bachat: ' : '🤝 Saapathi: '}
                                    {f.name} (Avl: Rs. {f.current_balance?.toLocaleString()})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Method</label>
                            <select
                                value={paymentFormData.method}
                                onChange={e => setPaymentFormData({ ...paymentFormData, method: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none bg-[var(--t-surface)] font-medium"
                                required
                            >
                                <option value="CASH">💰 Nagad (Cash)</option>
                                <option value="BANK_TRANSFER">🏦 Bank / ConnectIPS</option>
                                <option value="QR">📱 eSewa / Khalti (QR)</option>
                                <option value="CHECK">📜 Cheque</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Reference ID</label>
                            <input
                                type="text"
                                value={paymentFormData.reference_id}
                                onChange={e => setPaymentFormData({ ...paymentFormData, reference_id: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none bg-[var(--t-surface)]"
                                placeholder="Txn ID / Check #"
                            />
                        </div>
                    </div>

                    <div className="bg-[var(--t-surface2)] p-6 rounded-2xl border-2 border-dashed border-[var(--t-border)] group hover:border-[var(--t-primary)]/50 transition-all flex flex-col items-center gap-4 relative overflow-hidden">
                        <label className="text-[10px] font-black text-[var(--t-warn)] uppercase tracking-widest leading-none mb-1 flex items-center gap-2">
                            📸 Mandatory Payment Proof
                            <span className="text-[var(--t-danger)] leading-none text-[8px] italic">* Required</span>
                        </label>
                        
                        <div className="flex items-center gap-6 w-full">
                            <div className="flex-1">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handlePhotoChange}
                                    className="hidden" 
                                    id="universal-proof-upload"
                                />
                                <label 
                                    htmlFor="universal-proof-upload" 
                                    className="cursor-pointer py-3 px-4 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl flex items-center justify-center gap-3 text-xs font-bold text-[var(--t-text2)] hover:text-[var(--t-primary)] hover:border-[var(--t-primary)]/30 transition-all uppercase tracking-tighter"
                                >
                                    <svg className="w-5 h-5 opacity-40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    {paymentFormData.proof_photo ? paymentFormData.proof_photo.name : 'Select / Snap Receipt'}
                                </label>
                            </div>
                            {photoPreview && (
                                <div className="w-16 h-16 rounded-xl overflow-hidden border border-[var(--t-border)] shadow-sm bg-white shrink-0 transform hover:scale-110 transition-transform">
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1 uppercase tracking-tighter text-[10px]">Remarks / Ledger Notes</label>
                        <textarea
                            value={paymentFormData.notes}
                            onChange={e => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                            className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none min-h-[80px] bg-[var(--t-surface)]"
                            placeholder="Optional payment remarks..."
                        />
                    </div>

                    <div className="bg-[var(--t-surface2)] p-6 rounded-[2rem] border border-[var(--t-border)] flex items-center justify-between group hover:border-[var(--t-primary)] transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm transition-all ${paymentFormData.send_receipt ? 'bg-green-500/10 text-green-500' : 'bg-[var(--t-surface3)] text-[var(--t-text3)]'}`}>
                                {paymentFormData.send_receipt ? '📧' : '🚫'}
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--t-text)] leading-none italic">Send Email Receipt</h4>
                                <p className="text-[9px] text-[var(--t-text3)] font-bold uppercase tracking-tighter mt-1 opacity-60">Automatically deliver PDF to recipient</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={paymentFormData.send_receipt}
                                onChange={e => setPaymentFormData({ ...paymentFormData, send_receipt: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-[var(--t-surface3)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--t-primary)]"></div>
                        </label>
                    </div>

                    {/* Payment Progress Overlay */}
                    {(paymentStatus === 'PROCESSING' || paymentStatus === 'SUCCESS' || paymentStatus === 'ERROR') && (
                        <div className="absolute inset-0 bg-[var(--t-surface2)]/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                            {paymentStatus === 'PROCESSING' && (
                                <div className="space-y-6">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-4 border-[var(--t-primary)]/20 border-t-[var(--t-primary)] rounded-full animate-spin mx-auto"></div>
                                        <div className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">💸</div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-[var(--t-text)] uppercase tracking-tighter italic">Processing Payment...</h3>
                                        <p className="text-xs text-[var(--t-text3)] font-bold uppercase tracking-widest mt-2">{paymentFormData.send_receipt ? 'Generating & delivering PDF receipt' : 'Recording transaction records'}</p>
                                    </div>
                                </div>
                            )}

                            {paymentStatus === 'SUCCESS' && (
                                <div className="space-y-6 animate-in zoom-in duration-500">
                                    <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center text-5xl shadow-2xl shadow-green-500/40 mx-auto transform scale-110">
                                        ✓
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-green-600 uppercase tracking-tighter italic">Success!</h3>
                                        <p className="text-sm text-[var(--t-text2)] font-bold uppercase tracking-widest mt-2">Payment recorded successfully</p>
                                        {paymentFormData.send_receipt && <p className="text-[10px] text-green-500 font-black mt-2 bg-green-500/10 px-3 py-1 rounded-full inline-block">Receipt sent to recipient email</p>}
                                    </div>
                                </div>
                            )}

                            {paymentStatus === 'ERROR' && (
                                <div className="space-y-6 animate-in shake duration-500">
                                    <div className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center text-4xl shadow-2xl shadow-red-500/40 mx-auto">
                                        ✕
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-red-600 uppercase tracking-tighter italic">Payment Failed</h3>
                                        <p className="text-xs text-[var(--t-text2)] font-bold uppercase tracking-widest mt-2">Please check your connection and try again</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-[var(--t-text2)]">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-50 transition-all flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {loading ? 'Processing...' : 'Make Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default UniversalPaymentModal;
