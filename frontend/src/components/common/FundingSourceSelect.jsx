import React, { useState, useEffect } from 'react';
import { accountingService } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';

/**
 * FundingSourceSelect
 *
 * A unified "Select Account / Funding Source" dropdown that combines:
 *  - 🏦 Treasury / Bank Accounts  (value prefix: "BANK::<id>")
 *  - 💰 Funding Sources           (value prefix: "FUND::<id>")
 *  - 📊 Other GL Accounts (ASSET) (value prefix: "ACCOUNT::<id>")
 *
 * `onChange` receives:
 *  { raw, type: "BANK"|"FUND"|"ACCOUNT", id, name, balance }
 */
const FundingSourceSelect = ({
    value = '',
    onChange,
    projectId = null,
    payAmount = 0,
    required = false,
    className = '',
    filterBanks = true,
    filterFunding = true,
    filterGL = true,
}) => {
    const { dashboardData } = useConstruction();
    const [accounts, setAccounts] = useState([]);

    useEffect(() => {
        accountingService.getAccounts(projectId)
            .then(res => setAccounts(Array.isArray(res.data) ? res.data : []))
            .catch(() => setAccounts([]));
    }, [projectId]);

    const amount = parseFloat(payAmount || 0);

    // 1. Funding Sources (Legacy)
    const fundingSources = (dashboardData.funding || []).map(f => ({
        raw: `FUND::${f.id}`,
        id: f.id,
        type: 'FUND',
        name: f.name,
        balance: parseFloat(f.current_balance || 0),
        icon: f.source_type === 'LOAN' ? '🏦' : '💰',
        label: f.source_type === 'LOAN' ? 'Karja' : 'Bachat',
    }));

    // 2. Bank Accounts (Assets with bank details)
    const bankAccounts = accounts
        .filter(a => a.account_type === 'ASSET' && (a.bank_name || a.account_number))
        .map(b => ({
            raw: `BANK::${b.id}`,
            id: b.id,
            type: 'BANK',
            name: b.name,
            balance: parseFloat(b.balance || 0),
            icon: '🏦',
            label: 'Direct Bank',
        }));

    // 3. Other GL Accounts (Non-bank Assets)
    const glAccounts = accounts
        .filter(a => a.account_type === 'ASSET' && !(a.bank_name || a.account_number))
        .map(a => ({
            raw: `ACCOUNT::${a.id}`,
            id: a.id,
            type: 'ACCOUNT',
            name: `${a.code} — ${a.name}`,
            balance: parseFloat(a.balance || 0),
            icon: '📊',
            label: 'GL Account',
        }));

    const handleChange = (e) => {
        const raw = e.target.value;
        if (!raw) {
            onChange && onChange({ raw: '', type: null, id: null, name: '', balance: null });
            return;
        }
        const [prefix, id] = raw.split('::');
        let item = null;
        if (prefix === 'FUND') item = fundingSources.find(f => f.id.toString() === id);
        else if (prefix === 'BANK') item = bankAccounts.find(b => b.id.toString() === id);
        else if (prefix === 'ACCOUNT') item = glAccounts.find(a => a.id.toString() === id);
        
        if (item) {
            onChange && onChange({ ...item });
        }
    };

    const baseClass = `w-full rounded-xl border-[var(--t-border)] shadow-sm focus:ring-2 focus:ring-[var(--t-primary)] p-3 border outline-none appearance-none bg-[var(--t-surface)] font-black text-[var(--t-text)] ${className}`;
    const insufficientBalance = (item) => amount > 0 && item.balance !== null && item.balance < amount;

    return (
        <select value={value} onChange={handleChange} className={baseClass} required={required}>
            <option value="">Select Account / Funding Source</option>

            {filterBanks && bankAccounts.length > 0 && (
                <optgroup label="🏦 Treasury — Direct Bank Accounts">
                    {bankAccounts.map(b => (
                        <option key={b.raw} value={b.raw} disabled={insufficientBalance(b)}>
                            {b.icon} {b.label}: {b.name}
                            {b.balance !== null ? ` (Avl: NPR ${b.balance.toLocaleString()})` : ''}
                            {insufficientBalance(b) ? ' — Insufficient' : ''}
                        </option>
                    ))}
                </optgroup>
            )}

            {filterFunding && fundingSources.length > 0 && (
                <optgroup label="💰 Funding Sources">
                    {fundingSources.map(f => (
                        <option key={f.raw} value={f.raw} disabled={insufficientBalance(f)}>
                            {f.icon} {f.label}: {f.name}
                            {f.balance !== null ? ` (Avl: NPR ${f.balance.toLocaleString()})` : ''}
                            {insufficientBalance(f) ? ' — Insufficient' : ''}
                        </option>
                    ))}
                </optgroup>
            )}

            {filterGL && glAccounts.length > 0 && (
                <optgroup label="📊 Other GL Accounts">
                    {glAccounts.map(a => (
                        <option key={a.raw} value={a.raw} disabled={insufficientBalance(a)}>
                            {a.icon} {a.name}
                            {a.balance !== null ? ` (Bal: NPR ${a.balance.toLocaleString()})` : ''}
                            {insufficientBalance(a) ? ' — Insufficient' : ''}
                        </option>
                    ))}
                </optgroup>
            )}
        </select>
    );
};

export default FundingSourceSelect;
