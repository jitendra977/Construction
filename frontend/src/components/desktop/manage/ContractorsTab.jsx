import React, { useState } from 'react';
import { dashboardService, accountsService, getMediaUrl } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';
import ConfirmModal from '../../common/ConfirmModal';

const ContractorsTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [systemUsers, setSystemUsers] = useState([]);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [activeContractor, setActiveContractor] = useState(null);
    const [paymentFormData, setPaymentFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        method: 'CASH',
        reference_id: '',
        funding_source: '',
        notes: '',
        send_receipt: true
    });
    const [paymentStatus, setPaymentStatus] = useState('IDLE'); // IDLE, PROCESSING, SUCCESS, ERROR
    const [roleFilter, setRoleFilter] = useState('ALL');

    // Confirmation Modal System
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
    const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

    const roleChoices = [
        { value: 'ALL', label: 'All Roles' },
        { value: 'THEKEDAAR', label: 'Thekedaar (Contractor)' },
        { value: 'ENGINEER', label: 'Civil Engineer' },
        { value: 'MISTRI', label: 'Mistri (Mason)' },
        { value: 'LABOUR', label: 'Labour (Helper)' },
        { value: 'ELECTRICIAN', label: 'Electrician' },
        { value: 'PLUMBER', label: 'Plumber' },
        { value: 'CARPENTER', label: 'Carpenter' },
        { value: 'PAINTER', label: 'Painter' },
        { value: 'TILE_MISTRI', label: 'Tile/Marble' },
        { value: 'WELDER', label: 'Welder' },
    ];

    const filteredContractors = dashboardData.contractors?.filter(c => {
        const matchesSearch = (c.display_name || c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.skills || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || c.role === roleFilter;
        return matchesSearch && matchesRole;
    }) || [];

    const handleOpenModal = async (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(item);
        } else {
            setFormData({ is_active: true, role: 'LABOUR' });
        }
        setIsModalOpen(true);

        // Fetch users if not already fetched
        if (systemUsers.length === 0) {
            try {
                const res = await accountsService.getUsers();
                // Filter users with CONTRACTOR role or just show all for now
                setSystemUsers(res.data);
            } catch (error) {
                console.error("Failed to fetch users", error);
            }
        }
    };

    const handleUserChange = (userId) => {
        const selectedUser = systemUsers.find(u => u.id === parseInt(userId));
        if (selectedUser) {
            const fullName = `${selectedUser.first_name} ${selectedUser.last_name}`.trim() || selectedUser.username;
            setFormData({
                ...formData,
                user: selectedUser.id,
                name: fullName,
                email: selectedUser.email,
                phone: selectedUser.phone_number || ''
            });
        } else {
            setFormData({
                ...formData,
                user: null
            });
        }
    };

    const handleDelete = (id) => {
        showConfirm({
            title: "Delete Contractor?",
            message: "Are you sure you want to permanently remove this contractor from the project? This will affect your labor records and historical billing data. This action is irreversible.",
            confirmText: "Yes, Delete Contractor",
            type: "danger",
            onConfirm: async () => {
                try {
                    await dashboardService.deleteContractor(id);
                    refreshData();
                    closeConfirm();
                } catch (error) {
                    alert("Delete failed. This item might be linked to other records.");
                    closeConfirm();
                }
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Use FormData for file upload support
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== undefined) {
                    if (key === 'photo' && formData[key] instanceof File) {
                        data.append('photo', formData[key]);
                    } else if (key !== 'photo') {
                        data.append(key, formData[key]);
                    }
                }
            });

            if (editingItem) await dashboardService.updateContractor(editingItem.id, data);
            else await dashboardService.createContractor(data);

            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            alert("Save failed. Please check your data.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPaymentModal = (contractor) => {
        setActiveContractor(contractor);
        setPaymentFormData({
            amount: contractor.balance_due > 0 ? contractor.balance_due : '',
            date: new Date().toISOString().split('T')[0],
            method: 'CASH',
            reference_id: '',
            funding_source: '',
            notes: '',
            send_receipt: true
        });
        setIsPaymentModalOpen(true);
    };

    const handleOpenHistoryModal = (contractor) => {
        setActiveContractor(contractor);
        setIsHistoryModalOpen(true);
    };

    const getContractorHistory = (contractorId) => {
        if (!contractorId || !dashboardData?.expenses) return [];
        let history = [];
        const contractorExpenses = dashboardData.expenses.filter(exp => exp.contractor === contractorId && exp.balance_due !== undefined);
        contractorExpenses.forEach(exp => {
            history.push({ id: `exp-${exp.id}`, date: exp.date, type: 'BILL', title: exp.title, amount: exp.amount, status: exp.status, notes: exp.notes });
            if (exp.payments && exp.payments.length > 0) {
                exp.payments.forEach(payment => {
                    history.push({ id: `pay-${payment.id}`, date: payment.date, type: 'PAYMENT', title: `Payment: ${exp.title}`, amount: payment.amount, method: payment.method, notes: payment.notes });
                });
            }
        });
        return history.sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Find Labour category
            let categoryId = dashboardData.budgetCategories?.find(c => c.name.toLowerCase().includes('labor') || c.name.toLowerCase().includes('labour'))?.id;
            if (!categoryId && dashboardData.budgetCategories?.length > 0) categoryId = dashboardData.budgetCategories[0].id;

            // Find if there's an exact matching unpaid expense
            let targetExpenseId = null;
            const unpaidExpenses = dashboardData.expenses?.filter(exp => exp.contractor === activeContractor.id && exp.balance_due > 0);

            if (unpaidExpenses && unpaidExpenses.length > 0) {
                // To keep it simple, just pick the first unpaid expense if the amount matches, or just apply it to the first open bill.
                targetExpenseId = unpaidExpenses[0].id;
            } else {
                // Auto-create a Labor Expense
                const expenseRes = await dashboardService.createExpense({
                    title: `Labor Payment/Advance: ${activeContractor.name}`,
                    amount: parseFloat(paymentFormData.amount),
                    expense_type: 'LABOR',
                    category: categoryId,
                    contractor: activeContractor.id,
                    date: paymentFormData.date,
                    is_paid: false,
                    paid_to: activeContractor.name,
                    funding_source: paymentFormData.funding_source
                });
                targetExpenseId = expenseRes.data.id;
            }

            setPaymentStatus('PROCESSING');
            await dashboardService.createPayment({
                expense: targetExpenseId,
                funding_source: paymentFormData.funding_source,
                amount: parseFloat(paymentFormData.amount),
                date: paymentFormData.date,
                method: paymentFormData.method,
                reference_id: paymentFormData.reference_id,
                notes: paymentFormData.notes,
                send_receipt: paymentFormData.send_receipt
            });
            setPaymentStatus('SUCCESS');
            refreshData();
            
            setTimeout(() => {
                setIsPaymentModalOpen(false);
                setPaymentStatus('IDLE');
            }, 2000);
        } catch (error) {
            console.error("Payment failed", error);
            setPaymentStatus('ERROR');
            setTimeout(() => setPaymentStatus('IDLE'), 3000);
        } finally {
            setLoading(false);
        }
    };

    const getRoleColor = (role) => {
        const colors = {
            'THEKEDAAR': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            'ENGINEER': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'MISTRI': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            'LABOUR': 'bg-[var(--t-surface3)] text-[var(--t-text2)] border-[var(--t-border)]',
            'ELECTRICIAN': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            'PLUMBER': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        };
        return colors[role] || 'bg-[var(--t-surface3)] text-[var(--t-text2)] border-[var(--t-border)]';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-[var(--t-text2)]">Manage site contractors, roles, and contact credentials.</p>
                <div className="flex items-center gap-3">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-3 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg text-xs font-bold text-[var(--t-text2)] focus:ring-2 focus:ring-[var(--t-primary)] outline-none appearance-none cursor-pointer"
                    >
                        {roleChoices.map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2 bg-[var(--t-primary)] text-white rounded-lg hover:bg-[var(--t-primary2)] font-medium transition-colors shadow-sm"
                    >
                        + Add New Contractor
                    </button>
                </div>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block bg-[var(--t-surface)] rounded-xl shadow-sm border border-[var(--t-border)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Contractor Profile</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Role & Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider">Paid / Total</th>
                            <th className="px-6 py-4 text-xs font-bold text-[var(--t-text3)] uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--t-border)]">
                        {filteredContractors.map(c => {
                            const percent = c.total_amount > 0 ? (c.total_paid / c.total_amount) * 100 : 0;
                            return (
                                <tr key={c.id} className="hover:bg-[var(--t-surface2)] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {c.photo ? (
                                                <img
                                                    src={getMediaUrl(c.photo)}
                                                    alt={c.name}
                                                    className="w-10 h-10 rounded-full object-cover border border-[var(--t-border)] shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-[var(--t-nav-active-bg)] flex items-center justify-center text-[var(--t-primary)] font-bold border border-[var(--t-border)] shadow-sm relative">
                                                    {c.display_name?.charAt(0) || c.name?.charAt(0)}
                                                    {c.user && (
                                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-[var(--t-surface)]" title="Linked to System User" />
                                                    )}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-[var(--t-text)] flex items-center gap-1.5">
                                                    {c.display_name || c.name}
                                                    {c.user && (
                                                        <span className="text-[8px] bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded border border-blue-500/20 font-black">ACCOUNT LINKED</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-[var(--t-text3)] font-medium uppercase truncate max-w-[150px]">
                                                    {c.display_email || c.email || (c.skills || 'No specialization listed')}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase w-fit ${getRoleColor(c.role)}`}>
                                                {c.role}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                <span className="text-[10px] text-[var(--t-text2)] font-medium">
                                                    {c.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="text-sm font-black text-[var(--t-text)]">{c.total_paid?.toLocaleString()}</span>
                                                <span className="text-[10px] text-[var(--t-text3)] font-bold uppercase tracking-tight">of {c.total_amount?.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-[var(--t-surface3)] h-1 rounded-full overflow-hidden">
                                                <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${percent}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenPaymentModal(c)} className="text-green-600 hover:text-green-900 font-bold text-[10px] uppercase tracking-wider bg-green-50 hover:bg-green-100 px-2 py-1 rounded">Pay</button>
                                            <button onClick={() => handleOpenHistoryModal(c)} className="text-blue-600 hover:text-blue-900 font-bold text-[10px] uppercase tracking-wider bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded">History</button>
                                            <button onClick={() => handleOpenModal(c)} className="text-[var(--t-primary)] hover:text-[var(--t-primary)] font-bold text-[10px] uppercase tracking-wider">Edit</button>
                                            <button onClick={() => handleDelete(c.id)} className="text-[var(--t-danger)] hover:text-[var(--t-danger)] font-bold text-[10px] uppercase tracking-wider">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredContractors.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-[var(--t-text3)] italic text-sm">No contractors found matching your search.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Cards */}
            <div className="lg:hidden space-y-4">
                {filteredContractors.map(c => {
                    const percent = c.total_amount > 0 ? (c.total_paid / c.total_amount) * 100 : 0;
                    return (
                        <div key={c.id} className="bg-[var(--t-surface)] rounded-2xl p-4 border border-[var(--t-border)] shadow-sm flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    {c.photo ? (
                                        <img
                                            src={getMediaUrl(c.photo)}
                                            alt={c.name}
                                            className="w-10 h-10 rounded-full object-cover border border-[var(--t-border)]"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-[var(--t-nav-active-bg)] flex items-center justify-center text-[var(--t-primary)] font-bold border border-[var(--t-border)] relative">
                                            {c.display_name?.charAt(0) || c.name?.charAt(0)}
                                            {c.user && (
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm" />
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="font-bold text-[var(--t-text)] text-base leading-tight">{c.display_name || c.name}</h3>
                                            <div className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            {c.user && <span className="text-[8px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded border border-blue-100 font-black">LINKED</span>}
                                        </div>
                                        <div className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase w-fit inline-block leading-none ${getRoleColor(c.role)}`}>
                                            {c.role}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest leading-none mb-1">Total Pay</div>
                                    <div className="text-sm font-black text-[var(--t-text)] leading-none">{c.total_amount?.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="bg-[var(--t-surface2)] rounded-2xl p-4">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-[var(--t-text3)] uppercase tracking-tighter leading-none mb-1">Payments Made</span>
                                        <span className="text-lg font-black text-[var(--t-primary)] leading-none">{c.total_paid?.toLocaleString()}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-tight">{Math.round(percent)}% PAID</span>
                                    </div>
                                </div>
                                <div className="w-full bg-[var(--t-surface)] h-2 rounded-full overflow-hidden border border-[var(--t-border)] p-0.5 mb-2">
                                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                                </div>
                                {Number(c.balance_due) > 0 && (
                                    <div className="flex justify-between items-center text-[10px] font-black border-t border-[var(--t-border)] pt-2 mt-2">
                                        <span className="text-[var(--t-danger)] uppercase tracking-tighter">Remaining Balance</span>
                                        <span className="text-[var(--t-danger)]">{c.balance_due?.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[var(--t-border)] mb-3">
                                <button onClick={() => handleOpenPaymentModal(c)} className="col-span-1 py-2.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-green-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Pay
                                </button>
                                <button onClick={() => handleOpenHistoryModal(c)} className="col-span-1 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-blue-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    History
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleOpenModal(c)} className="py-2.5 bg-[var(--t-nav-active-bg)] text-[var(--t-nav-active-text)] rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    Edit Details
                                </button>
                                <button onClick={() => handleDelete(c.id)} className="py-2.5 bg-[var(--t-danger)]/10 text-[var(--t-danger)] rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
                {filteredContractors.length === 0 && (
                    <div className="py-10 text-center text-[var(--t-text3)] italic bg-[var(--t-surface)] rounded-2xl border-2 border-dashed border-[var(--t-border)]">
                        No contractors found matching your search.
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${editingItem ? 'Edit' : 'Add'} Contractor`}>
                <form onSubmit={handleSubmit} className="space-y-4 p-1">
                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Link System User Account (Optional)</label>
                        <select
                            value={formData.user || ''}
                            onChange={e => handleUserChange(e.target.value)}
                            className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none appearance-none bg-[var(--t-surface)]"
                        >
                            <option value="">-- No Linked Account --</option>
                            {systemUsers.filter(u => u.role?.code === 'CONTRACTOR' || !editingItem).map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.first_name} {u.last_name} ({u.email})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-[var(--t-text3)] mt-1 italic">Note: Linking an account will automatically sync Name, Email, and Phone.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">
                                Contractor Name {formData.user && <span className="text-[10px] text-blue-500 font-bold ml-1">(Synced from Account)</span>}
                            </label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className={`w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none ${formData.user ? 'bg-[var(--t-surface2)] text-[var(--t-text3)] cursor-not-allowed' : ''}`}
                                placeholder="e.g. Ramesh Mistri"
                                required
                                disabled={!!formData.user}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Role</label>
                            <select
                                value={formData.role || 'LABOUR'}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none appearance-none bg-[var(--t-surface)]"
                                required
                            >
                                <option value="THEKEDAAR">Thekedaar</option>
                                <option value="ENGINEER">Civil Engineer</option>
                                <option value="MISTRI">Mistri/Mason</option>
                                <option value="LABOUR">Labour/Helper</option>
                                <option value="ELECTRICIAN">Electrician</option>
                                <option value="PLUMBER">Plumber</option>
                                <option value="CARPENTER">Carpenter</option>
                                <option value="PAINTER">Painter</option>
                                <option value="TILE_MISTRI">Tile/Marble</option>
                                <option value="WELDER">Welder</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">
                                Phone Number {formData.user && <span className="text-[10px] text-blue-500 font-bold ml-1">(Synced)</span>}
                            </label>
                            <input
                                type="text"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className={`w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none ${formData.user ? 'bg-[var(--t-surface2)] text-[var(--t-text3)] cursor-not-allowed' : ''}`}
                                placeholder="+977"
                                required
                                disabled={!!formData.user}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">
                                Email Address {formData.user && <span className="text-[10px] text-blue-500 font-bold ml-1">(Synced)</span>}
                            </label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className={`w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none ${formData.user ? 'bg-[var(--t-surface2)] text-[var(--t-text3)] cursor-not-allowed' : ''}`}
                                placeholder="example@gmail.com"
                                disabled={!!formData.user}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Citizenship No.</label>
                            <input
                                type="text"
                                value={formData.citizenship_number || ''}
                                onChange={e => setFormData({ ...formData, citizenship_number: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Daily Rate (Optional)</label>
                            <input
                                type="number"
                                value={formData.rate || ''}
                                onChange={e => setFormData({ ...formData, rate: e.target.value })}
                                className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                placeholder="e.g. 1500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Contractor Photo</label>
                        <div className="flex items-center gap-4">
                            {(formData.photo || editingItem?.photo) && (
                                <img
                                    src={formData.photo instanceof File ? URL.createObjectURL(formData.photo) : getMediaUrl(formData.photo || editingItem?.photo)}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-[var(--t-border)]"
                                    alt="Preview"
                                />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => setFormData({ ...formData, photo: e.target.files[0] })}
                                className="text-xs text-[var(--t-text2)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--t-nav-active-bg)] file:text-[var(--t-nav-active-text)] hover:file:bg-[var(--t-nav-active-bg)]"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Skills (e.g. Masonry, Painting)</label>
                        <input
                            type="text"
                            value={formData.skills || ''}
                            onChange={e => setFormData({ ...formData, skills: e.target.value })}
                            className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 py-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active ?? true}
                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                            className="w-4 h-4 text-[var(--t-primary)] border-[var(--t-border2)] rounded focus:ring-[var(--t-primary)]"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-[var(--t-text2)] underline decoration-dotted">Active On Site</label>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-[var(--t-text2)] hover:text-[var(--t-text2)]">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-[var(--t-primary)] text-white rounded-xl font-bold shadow-lg shadow-[var(--t-primary)]/20 hover:bg-[var(--t-primary2)] disabled:opacity-50 transition-all">
                            {loading ? 'Saving...' : (editingItem ? 'Update Contractor' : 'Create Contractor')}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Pay Contractor: ${activeContractor?.name}`}>
                <div className="space-y-6">
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Paying Amount (Rs.)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={paymentFormData.amount}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                                    className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-green-500 p-3 border outline-none font-bold text-green-600"
                                    required
                                />
                                {activeContractor?.balance_due > 0 && (
                                    <p className="text-[10px] text-[var(--t-danger)] mt-1 font-bold">Unpaid Dues: {activeContractor?.balance_due?.toLocaleString()}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Date</label>
                                <input
                                    type="date"
                                    value={paymentFormData.date}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                                    className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="bg-[var(--t-surface2)] p-5 rounded-2xl border border-[var(--t-border)] mt-4">
                            <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] mb-3 ml-1">Funding Source (Where did money come from?)</label>
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
                                    className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none"
                                    placeholder="Txn ID / Check #"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--t-text2)] mb-1">Remarks / Notes</label>
                                <textarea
                                    value={paymentFormData.notes}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                                    className="w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none min-h-[80px]"
                                    placeholder="Optional payment remarks..."
                                />
                            </div>
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
                            <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-[var(--t-text2)] hover:text-[var(--t-text2)]">Cancel</button>
                            <button type="submit" disabled={loading} className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-50 transition-all flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {loading ? 'Processing...' : 'Make Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title={`Payment History: ${activeContractor?.name}`}>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {activeContractor && getContractorHistory(activeContractor.id).length > 0 ? (
                        getContractorHistory(activeContractor.id).map(txn => (
                            <div key={txn.id} className="flex justify-between items-center p-3 border-b border-[var(--t-border)] last:border-0 hover:bg-[var(--t-surface2)] rounded-lg transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${txn.type === 'BILL' ? 'bg-[var(--t-danger)]/10 text-[var(--t-danger)] border border-[var(--t-danger)]/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                                        {txn.type === 'BILL' ? '🧾' : '💸'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-[var(--t-text)]">{txn.title}</div>
                                        <div className="text-[10px] text-[var(--t-text2)] font-bold uppercase tracking-wider">
                                            {new Date(txn.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {txn.type === 'PAYMENT' && ` • ${txn.method?.replace('_', ' ')}`}
                                            {txn.type === 'BILL' && ` • ${txn.status}`}
                                        </div>
                                        {txn.notes && <div className="text-xs text-[var(--t-text2)] italic mt-0.5 max-w-[200px] truncate" title={txn.notes}>Txn Note: {txn.notes}</div>}
                                    </div>
                                </div>
                                <div className={`font-black tracking-tight text-right ${txn.type === 'BILL' ? 'text-[var(--t-danger)]' : 'text-green-600'}`}>
                                    <div className="text-sm">{txn.type === 'BILL' ? '+' : '-'}{Number(txn.amount).toLocaleString('en-IN')}</div>
                                    <div className="text-[8px] uppercase tracking-wider opacity-70">{txn.type}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-8 text-center text-[var(--t-text3)] italic text-sm">No transaction history found.</div>
                    )}
                </div>
                <div className="mt-6 pt-4 border-t border-[var(--t-border)]">
                    <div className="bg-[var(--t-surface2)] rounded-xl p-4 space-y-2">
                        <div className="flex justify-between items-center"><span className="text-[var(--t-text2)] font-bold text-[10px] uppercase tracking-wider">Total Billed:</span><span className="font-bold text-[var(--t-text)]">Rs. {Number(activeContractor?.total_amount || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between items-center"><span className="text-[var(--t-text2)] font-bold text-[10px] uppercase tracking-wider">Total Paid:</span><span className="font-bold text-green-600">Rs. {Number(activeContractor?.total_paid || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between items-center pt-2 border-t border-[var(--t-border)] mt-2"><span className="text-[var(--t-danger)] font-black text-xs uppercase tracking-widest">Balance Due:</span><span className="font-black text-[var(--t-danger)] text-lg">Rs. {Number(activeContractor?.balance_due || 0).toLocaleString()}</span></div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="px-6 py-2.5 bg-[var(--t-surface3)] text-[var(--t-text2)] rounded-xl font-bold hover:bg-gray-200 transition-colors">Close</button>
                    <button type="button" onClick={() => { setIsHistoryModalOpen(false); handleOpenPaymentModal(activeContractor); }} className="px-6 py-2.5 bg-[var(--t-primary)] text-white rounded-xl font-bold hover:bg-[var(--t-primary2)] transition-colors shadow-lg shadow-[var(--t-primary)]/20">Pay Now</button>
                </div>
            </Modal>

            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                onConfirm={confirmConfig.onConfirm}
                onCancel={closeConfirm}
                type={confirmConfig.type || 'warning'}
            />
        </div >
    );
};
export default ContractorsTab;
