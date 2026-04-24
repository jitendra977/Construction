import React, { useState, useEffect } from 'react';
import { accountingService } from '../../../../services/api';
import { useConstruction } from '../../../../context/ConstructionContext';
import BillFormModal from './BillFormModal';
import BillPaymentModal from './BillPaymentModal';

const fmt = (n) => `Rs. ${parseFloat(n || 0).toLocaleString('en-IN')}`;

const STATUS_CONFIG = {
    PAID: {
        label: 'Fully Paid ✅',
        badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25',
        bar: 'bg-emerald-500',
        tip: 'This bill is completely settled.',
    },
    PARTIAL: {
        label: 'Partially Paid ⏳',
        badge: 'bg-amber-500/10 text-amber-700 border-amber-500/25',
        bar: 'bg-amber-400',
        tip: 'Some amount has been paid, but a balance is still outstanding.',
    },
    UNPAID: {
        label: 'Unpaid 🔴',
        badge: 'bg-rose-500/10 text-rose-700 border-rose-500/25',
        bar: 'bg-rose-400',
        tip: 'Nothing has been paid yet. This is an open liability.',
    },
};

/* ── Single Bill Card ── */
const BillCard = ({ bill, onPayClick }) => {
    const cfg = STATUS_CONFIG[bill.status] || STATUS_CONFIG.UNPAID;
    const total = parseFloat(bill.total_amount || 0);
    const paid = parseFloat(bill.amount_paid || 0);
    const remaining = total - paid;
    const paidPct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
    const isOverdue = new Date(bill.due_date) < new Date() && bill.status !== 'PAID';
    const vendor = bill.supplier_name || bill.contractor_name || 'Unknown Vendor';

    return (
        <div className={`bg-[var(--t-surface)] rounded-2xl border ${isOverdue ? 'border-rose-400/50' : 'border-[var(--t-border)]'} overflow-hidden hover:shadow-md transition-all`}>
            {isOverdue && (
                <div className="px-5 py-2 bg-rose-500/10 border-b border-rose-400/30 text-rose-700 text-[11px] font-bold flex items-center gap-2">
                    ⚠️ This bill is <strong>overdue</strong> — payment was due on {bill.due_date}
                </div>
            )}

            <div className="p-5 flex flex-col md:flex-row gap-5 items-start md:items-center">
                {/* Left: Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                        {bill.bill_number && (
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[var(--t-surface2)] rounded-md tracking-wider text-[var(--t-text3)]">
                                #{bill.bill_number}
                            </span>
                        )}
                        <span className={`text-[10px] font-black tracking-wide uppercase px-2.5 py-0.5 rounded-full border ${cfg.badge}`}>
                            {cfg.label}
                        </span>
                    </div>

                    <h3 className="font-black text-lg text-[var(--t-text)] truncate">🏢 {vendor}</h3>
                    <p className="text-sm text-[var(--t-text2)] mt-1 leading-relaxed line-clamp-2">
                        {bill.notes || 'No description provided.'}
                    </p>

                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-[var(--t-text3)]">
                        <span>📅 Issued: <strong className="text-[var(--t-text)]">{bill.date_issued}</strong></span>
                        <span>
                            🗓️ Due:{' '}
                            <strong className={isOverdue ? 'text-rose-600' : 'text-[var(--t-text)]'}>
                                {bill.due_date} {isOverdue ? '(Overdue!)' : ''}
                            </strong>
                        </span>
                    </div>

                    {/* Bill items summary */}
                    {bill.items && bill.items.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {bill.items.slice(0, 4).map(item => (
                                <span key={item.id} className="text-[10px] font-medium px-2 py-0.5 bg-[var(--t-surface2)] rounded-md text-[var(--t-text2)] border border-[var(--t-border)]">
                                    {item.description}
                                </span>
                            ))}
                            {bill.items.length > 4 && (
                                <span className="text-[10px] font-medium px-2 py-0.5 bg-[var(--t-surface2)] rounded-md text-[var(--t-text3)]">
                                    +{bill.items.length - 4} more
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Payment status */}
                <div className="shrink-0 w-full md:w-[220px] bg-[var(--t-surface2)]/40 rounded-xl border border-[var(--t-border)] p-4">
                    {/* Total */}
                    <div className="mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)] mb-0.5">Total Bill Amount</p>
                        <p className="text-2xl font-black font-mono text-[var(--t-text)]">{fmt(total)}</p>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 w-full bg-[var(--t-bg)] rounded-full overflow-hidden border border-[var(--t-border)] mb-2">
                        <div className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`} style={{ width: `${paidPct}%` }} />
                    </div>

                    <div className="flex justify-between text-[11px] font-mono mb-3">
                        <span className="text-emerald-600 font-bold">Paid: {fmt(paid)}</span>
                        <span className="text-rose-600 font-bold">Due: {fmt(remaining)}</span>
                    </div>

                    {/* Tooltip */}
                    <p className="text-[10px] text-[var(--t-text3)] mb-3 leading-relaxed">{cfg.tip}</p>

                    {/* Pay button */}
                    {bill.status !== 'PAID' && (
                        <button
                            onClick={() => onPayClick(bill)}
                            className="w-full py-2 px-4 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                            💸 Record Payment
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── BillsTab ── */
const BillsTab = ({ searchQuery }) => {
    const { dashboardData } = useConstruction();
    const [bills, setBills] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');

    const fetchBills = async () => {
        try {
            const [billsRes, accountsRes] = await Promise.all([
                accountingService.getBills(),
                accountingService.getAccounts()
            ]);
            setBills(billsRes.data);
            setAccounts(accountsRes.data);
        } catch (err) {
            console.error('Error fetching bills', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBills(); }, []);

    const filtered = bills
        .filter(b =>
            (b.bill_number?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (b.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (b.contractor_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (b.notes?.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .filter(b => filterStatus === 'ALL' || b.status === filterStatus);

    /* Summary totals */
    const totalBilled = bills.reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);
    const totalPaid = bills.reduce((s, b) => s + parseFloat(b.amount_paid || 0), 0);
    const totalOutstanding = totalBilled - totalPaid;
    const overdueCount = bills.filter(b => new Date(b.due_date) < new Date() && b.status !== 'PAID').length;

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-[var(--t-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--t-text3)]">Loading bills…</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-[var(--t-text)] flex items-center gap-2">
                        🧾 Bills & Accounts Payable
                    </h2>
                    <p className="text-sm text-[var(--t-text2)] mt-1 opacity-80">
                        Record money owed to suppliers and contractors. A bill is created first, then paid separately — so you always see what's outstanding.
                    </p>
                </div>
                <button
                    onClick={() => setIsBillModalOpen(true)}
                    className="px-4 py-2 bg-[var(--t-primary)] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shrink-0"
                >
                    + Record New Bill
                </button>
            </div>

            {/* ── Summary cards ── */}
            {bills.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-[var(--t-surface)] rounded-2xl border border-[var(--t-border)] p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)] mb-1">Total Billed</p>
                        <p className="text-xl font-black text-[var(--t-text)] font-mono">{fmt(totalBilled)}</p>
                    </div>
                    <div className="bg-[var(--t-surface)] rounded-2xl border border-emerald-500/20 p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)] mb-1">Total Paid</p>
                        <p className="text-xl font-black text-emerald-600 font-mono">{fmt(totalPaid)}</p>
                    </div>
                    <div className="bg-[var(--t-surface)] rounded-2xl border border-rose-500/20 p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)] mb-1">Outstanding</p>
                        <p className="text-xl font-black text-rose-600 font-mono">{fmt(totalOutstanding)}</p>
                    </div>
                    <div className={`bg-[var(--t-surface)] rounded-2xl border p-4 text-center ${overdueCount > 0 ? 'border-rose-500/40 bg-rose-500/5' : 'border-[var(--t-border)]'}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)] mb-1">Overdue Bills</p>
                        <p className={`text-xl font-black font-mono ${overdueCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {overdueCount === 0 ? 'None ✅' : `${overdueCount} ⚠️`}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Status filter tabs ── */}
            <div className="flex gap-2 flex-wrap">
                {['ALL', 'UNPAID', 'PARTIAL', 'PAID'].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            filterStatus === s
                                ? 'bg-[var(--t-primary)] text-white border-[var(--t-primary)]'
                                : 'bg-[var(--t-surface)] text-[var(--t-text2)] border-[var(--t-border)] hover:border-[var(--t-primary)]/40'
                        }`}
                    >
                        {s === 'ALL' ? `All Bills (${bills.length})` : `${STATUS_CONFIG[s]?.label} (${bills.filter(b => b.status === s).length})`}
                    </button>
                ))}
            </div>

            {/* ── Bill cards ── */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-[var(--t-surface2)]/30 border-2 border-dashed border-[var(--t-border)] rounded-2xl">
                    <div className="text-5xl mb-4 opacity-20">🧾</div>
                    <h3 className="font-black text-[var(--t-text2)] text-lg">No Bills Found</h3>
                    <p className="text-sm text-[var(--t-text3)] mt-1">
                        {searchQuery || filterStatus !== 'ALL'
                            ? 'Try clearing your filters.'
                            : 'Click "+ Record New Bill" to add your first vendor bill.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(bill => (
                        <BillCard key={bill.id} bill={bill} onPayClick={setSelectedBill} />
                    ))}
                </div>
            )}

            <BillFormModal
                isOpen={isBillModalOpen}
                onClose={() => { setIsBillModalOpen(false); fetchBills(); }}
                suppliers={dashboardData?.suppliers || []}
                contractors={dashboardData?.contractors || []}
            />
            <BillPaymentModal
                isOpen={!!selectedBill}
                onClose={() => { setSelectedBill(null); fetchBills(); }}
                bill={selectedBill}
                accounts={accounts}
            />
        </div>
    );
};

export default BillsTab;
