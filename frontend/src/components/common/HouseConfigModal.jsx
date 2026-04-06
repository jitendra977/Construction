import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { dashboardService } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';

const HouseConfigModal = ({ isOpen, onClose }) => {
    const { dashboardData, refreshData, budgetStats, formatCurrency } = useConstruction();
    const project = dashboardData?.project;

    const [formData, setFormData] = useState({
        name: '',
        owner_name: '',
        address: '',
        total_budget: '',
        start_date: '',
        expected_completion_date: '',
        area_sqft: '',
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeSection, setActiveSection] = useState('config'); // 'config' | 'budget'

    useEffect(() => {
        if (project && isOpen) {
            setFormData({
                name: project.name || '',
                owner_name: project.owner_name || '',
                address: project.address || '',
                total_budget: project.total_budget || '',
                start_date: project.start_date || '',
                expected_completion_date: project.expected_completion_date || '',
                area_sqft: project.area_sqft || '',
            });
            setSaved(false);
        }
    }, [project, isOpen]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!project?.id) return;
        setSaving(true);
        try {
            await dashboardService.updateProject(project.id, formData);
            refreshData();
            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                onClose();
            }, 1000);
        } catch (error) {
            console.error("Failed to update project:", error);
            alert("Failed to update project configuration.");
        } finally {
            setSaving(false);
        }
    };

    if (!project) return null;

    // --- Time Calculations ---
    const daysLeft = project.expected_completion_date
        ? Math.max(0, Math.ceil((new Date(project.expected_completion_date) - new Date()) / (1000 * 60 * 60 * 24)))
        : null;

    const daysSinceStart = project.start_date
        ? Math.ceil((new Date() - new Date(project.start_date)) / (1000 * 60 * 60 * 24))
        : null;

    // --- Budget Calculations (live from context) ---
    const masterBudget = budgetStats.totalBudget || 0;
    const totalSpent = budgetStats.totalSpent || 0;
    const remainingBudget = budgetStats.remainingBudget || 0;
    const budgetPercent = budgetStats.budgetPercent || 0;
    const totalFunded = budgetStats.totalFunded || 0;
    const fundingCoverage = budgetStats.fundingCoverage || 0;
    const categories = budgetStats.categories || [];
    const projectHealth = budgetStats.projectHealth || { status: 'UNKNOWN', issues: [] };

    // Preview the budget change in real-time if user edits total_budget field
    const previewBudget = Number(formData.total_budget) || masterBudget;
    const previewPercent = previewBudget > 0 ? Math.min((totalSpent / previewBudget) * 100, 100) : 0;
    const budgetChanged = Number(formData.total_budget) !== masterBudget;

    const healthColors = {
        HEALTHY: { bg: 'var(--t-primary2)', text: '#fff', label: '✓ Healthy' },
        WARNING: { bg: '#f59e0b', text: '#fff', label: '⚠ Warning' },
        OVER_ALLOCATED: { bg: '#ef4444', text: '#fff', label: '🔴 Over-Allocated' },
        OVER_SPENT: { bg: '#dc2626', text: '#fff', label: '🔴 Over-Spent' },
        UNKNOWN: { bg: 'var(--t-text3)', text: '#fff', label: '— Unknown' },
    };
    const health = healthColors[projectHealth.status] || healthColors.UNKNOWN;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="House Project Configuration" maxWidth="max-w-3xl">
            <div className="space-y-5">

                {/* ── Tab Switch ── */}
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--t-surface2)' }}>
                    {[
                        { id: 'config', label: '🏠 Project Config' },
                        { id: 'budget', label: '💰 Budget Overview' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveSection(tab.id)}
                            className="flex-1 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all"
                            style={{
                                background: activeSection === tab.id ? 'var(--t-primary)' : 'transparent',
                                color: activeSection === tab.id ? '#fff' : 'var(--t-text3)',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ══════════════════════════ CONFIG SECTION ══════════════════════════ */}
                {activeSection === 'config' && (
                    <>
                        {/* Live Stats Banner */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-[var(--t-primary)]/8 border border-[var(--t-primary)]/20 rounded-xl p-3 text-center">
                                <div className="text-[8px] font-black text-[var(--t-primary)] uppercase tracking-[.2em] mb-1" style={{ fontFamily: 'var(--f-mono)' }}>Day</div>
                                <div className="text-2xl font-black text-[var(--t-primary)]" style={{ fontFamily: 'var(--f-disp)' }}>{daysSinceStart ?? '—'}</div>
                                <div className="text-[8px] text-[var(--t-text3)] uppercase tracking-wider mt-0.5">Since Start</div>
                            </div>
                            <div className="bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-xl p-3 text-center">
                                <div className="text-[8px] font-black text-[var(--t-text2)] uppercase tracking-[.2em] mb-1" style={{ fontFamily: 'var(--f-mono)' }}>Area</div>
                                <div className="text-2xl font-black text-[var(--t-text)]" style={{ fontFamily: 'var(--f-disp)' }}>{Number(project.area_sqft || 0).toLocaleString()}</div>
                                <div className="text-[8px] text-[var(--t-text3)] uppercase tracking-wider mt-0.5">Sq Ft</div>
                            </div>
                            <div className={`border rounded-xl p-3 text-center ${daysLeft !== null && daysLeft < 30 ? 'bg-[var(--t-danger)]/8 border-[var(--t-danger)]/20' : 'bg-[var(--t-primary2)]/8 border-[var(--t-primary2)]/20'}`}>
                                <div className={`text-[8px] font-black uppercase tracking-[.2em] mb-1 ${daysLeft !== null && daysLeft < 30 ? 'text-[var(--t-danger)]' : 'text-[var(--t-primary2)]'}`} style={{ fontFamily: 'var(--f-mono)' }}>Days Left</div>
                                <div className={`text-2xl font-black ${daysLeft !== null && daysLeft < 30 ? 'text-[var(--t-danger)]' : 'text-[var(--t-primary2)]'}`} style={{ fontFamily: 'var(--f-disp)' }}>{daysLeft ?? '—'}</div>
                                <div className="text-[8px] text-[var(--t-text3)] uppercase tracking-wider mt-0.5">To Target</div>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Project Identity */}
                            <div className="bg-[var(--t-surface2)]/50 rounded-xl border border-[var(--t-border)] p-4 space-y-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">🏠</span>
                                    <h4 className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-[.2em]" style={{ fontFamily: 'var(--f-mono)' }}>Project Identity</h4>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5 ml-1">Project Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-3 rounded-lg text-sm font-bold text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                                        placeholder="e.g. Mero Ghar Construction"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5 ml-1">Owner Name</label>
                                        <input
                                            type="text"
                                            value={formData.owner_name}
                                            onChange={(e) => handleChange('owner_name', e.target.value)}
                                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-3 rounded-lg text-sm font-bold text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                                            placeholder="Owner name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5 ml-1">Build Area (SQFT)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.area_sqft}
                                                onChange={(e) => handleChange('area_sqft', e.target.value)}
                                                className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-3 rounded-lg text-sm font-bold text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all pr-12"
                                                placeholder="0"
                                                required
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-[var(--t-text3)]">FT²</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5 ml-1">Site Address</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        rows={2}
                                        className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-3 rounded-lg text-sm text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all resize-none"
                                        placeholder="Full address of construction site"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Financial & Timeline */}
                            <div className="bg-[var(--t-surface2)]/50 rounded-xl border border-[var(--t-border)] p-4 space-y-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">💰</span>
                                    <h4 className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-[.2em]" style={{ fontFamily: 'var(--f-mono)' }}>Budget & Timeline</h4>
                                </div>

                                {/* Master Budget Input with live preview */}
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5 ml-1">
                                        Master Budget (Rs.)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-[var(--t-primary)]">Rs.</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.total_budget}
                                            onChange={(e) => handleChange('total_budget', e.target.value)}
                                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-3 pl-10 rounded-lg text-lg font-black text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>

                                    {/* Live Budget Progress Preview */}
                                    <div className="mt-3 space-y-2">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="font-bold text-[var(--t-text3)] uppercase tracking-widest">
                                                {budgetChanged ? 'Preview: Spent vs New Budget' : 'Current Utilization'}
                                            </span>
                                            <span className={`font-black ${previewPercent > 90 ? 'text-[var(--t-danger)]' : previewPercent > 75 ? 'text-amber-500' : 'text-[var(--t-primary2)]'}`}>
                                                {previewPercent.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--t-surface2)' }}>
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${previewPercent}%`,
                                                    background: previewPercent > 90
                                                        ? 'var(--t-danger)'
                                                        : previewPercent > 75
                                                            ? '#f59e0b'
                                                            : 'var(--t-primary)',
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-[var(--t-text3)]">
                                            <span>Spent: <span className="font-black text-[var(--t-text)]">{formatCurrency(totalSpent)}</span></span>
                                            <span>Remaining: <span className={`font-black ${previewBudget - totalSpent < 0 ? 'text-[var(--t-danger)]' : 'text-[var(--t-primary2)]'}`}>{formatCurrency(Math.max(0, previewBudget - totalSpent))}</span></span>
                                        </div>
                                        {budgetChanged && (
                                            <div className="flex items-center gap-1.5 pt-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                                                    Budget change from {formatCurrency(masterBudget)} → {formatCurrency(previewBudget)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5 ml-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => handleChange('start_date', e.target.value)}
                                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-3 rounded-lg text-sm font-bold text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5 ml-1">Target Completion</label>
                                        <input
                                            type="date"
                                            value={formData.expected_completion_date}
                                            onChange={(e) => handleChange('expected_completion_date', e.target.value)}
                                            className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] p-3 rounded-lg text-sm font-bold text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between gap-4 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[.2em] border border-[var(--t-border)] rounded-lg hover:bg-[var(--t-surface2)] transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`flex-[2] py-3 font-black uppercase tracking-[.2em] text-[10px] rounded-lg shadow-lg transition-all disabled:opacity-50 ${saved
                                        ? 'bg-[var(--t-primary2)] text-[var(--t-bg)]'
                                        : 'bg-[var(--t-primary)] text-[var(--t-bg)] hover:translate-y-[-1px] active:translate-y-[1px]'
                                    }`}
                                >
                                    {saving ? 'Saving...' : saved ? '✓ Saved Successfully' : 'Update Configuration'}
                                </button>
                            </div>
                        </form>
                    </>
                )}

                {/* ══════════════════════════ BUDGET SECTION ══════════════════════════ */}
                {activeSection === 'budget' && (
                    <div className="space-y-5">

                        {/* Budget Health Badge */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-[var(--t-text)] uppercase tracking-widest">Live Budget Status</h3>
                                <p className="text-[10px] text-[var(--t-text3)] mt-0.5">Real-time utilization vs master budget</p>
                            </div>
                            <span
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                style={{ background: health.bg, color: health.text }}
                            >
                                {health.label}
                            </span>
                        </div>

                        {/* Main Budget Meter */}
                        <div className="rounded-2xl p-5 border space-y-4"
                            style={{ background: 'var(--t-surface2)', borderColor: 'var(--t-border)' }}>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Master Budget', value: formatCurrency(masterBudget), icon: '🏦', highlight: true },
                                    { label: 'Total Spent', value: formatCurrency(totalSpent), icon: '💸', danger: totalSpent > masterBudget },
                                    { label: 'Remaining', value: formatCurrency(remainingBudget), icon: '💼', good: remainingBudget > 0 },
                                ].map((item, i) => (
                                    <div key={i}
                                        className="rounded-xl p-3.5 border text-center"
                                        style={{
                                            background: item.highlight
                                                ? 'color-mix(in srgb, var(--t-primary) 8%, transparent)'
                                                : item.danger
                                                    ? 'color-mix(in srgb, var(--t-danger) 8%, transparent)'
                                                    : 'var(--t-surface)',
                                            borderColor: item.highlight
                                                ? 'color-mix(in srgb, var(--t-primary) 25%, transparent)'
                                                : item.danger
                                                    ? 'color-mix(in srgb, var(--t-danger) 25%, transparent)'
                                                    : 'var(--t-border)',
                                        }}
                                    >
                                        <div className="text-xl mb-1">{item.icon}</div>
                                        <div className="text-xs font-black"
                                            style={{
                                                color: item.highlight
                                                    ? 'var(--t-primary)'
                                                    : item.danger
                                                        ? 'var(--t-danger)'
                                                        : item.good
                                                            ? 'var(--t-primary2)'
                                                            : 'var(--t-text)',
                                            }}>
                                            {item.value}
                                        </div>
                                        <div className="text-[8px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--t-text3)' }}>
                                            {item.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Master Budget Progress */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px]">
                                    <span className="font-black text-[var(--t-text3)] uppercase tracking-widest">Budget Utilization</span>
                                    <span className={`font-black ${budgetPercent > 90 ? 'text-[var(--t-danger)]' : budgetPercent > 75 ? 'text-amber-500' : 'text-[var(--t-primary2)]'}`}>
                                        {budgetPercent.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--t-surface)' }}>
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 relative"
                                        style={{
                                            width: `${Math.min(budgetPercent, 100)}%`,
                                            background: budgetPercent > 90
                                                ? 'var(--t-danger)'
                                                : budgetPercent > 75
                                                    ? '#f59e0b'
                                                    : 'linear-gradient(90deg, var(--t-primary), var(--t-primary2))',
                                        }}
                                    >
                                        {budgetPercent > 90 && (
                                            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Funding Coverage */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl p-3 border" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                                    <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--t-text3)' }}>Funding Secured</div>
                                    <div className="text-sm font-black" style={{ color: 'var(--t-text)' }}>{formatCurrency(totalFunded)}</div>
                                    <div className="text-[9px] font-bold mt-0.5"
                                        style={{ color: fundingCoverage >= 100 ? 'var(--t-primary2)' : 'var(--t-danger)' }}>
                                        {fundingCoverage.toFixed(1)}% of master budget
                                    </div>
                                </div>
                                <div className="rounded-xl p-3 border" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                                    <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--t-text3)' }}>Available Cash</div>
                                    <div className="text-sm font-black"
                                        style={{ color: budgetStats.availableCash > 0 ? 'var(--t-primary2)' : 'var(--t-danger)' }}>
                                        {formatCurrency(budgetStats.availableCash || 0)}
                                    </div>
                                    <div className="text-[9px] font-bold text-[var(--t-text3)] mt-0.5">Liquid Balance</div>
                                </div>
                            </div>
                        </div>

                        {/* Health Issues */}
                        {projectHealth?.issues?.length > 0 && (
                            <div className="rounded-xl border-l-4 border-[var(--t-danger)] p-4"
                                style={{ background: 'color-mix(in srgb, var(--t-danger) 6%, var(--t-surface))' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">🚨</span>
                                    <h4 className="text-[10px] font-black text-[var(--t-danger)] uppercase tracking-widest">Budget Risks</h4>
                                </div>
                                <ul className="space-y-2">
                                    {projectHealth.issues.map((issue, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-[11px]">
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${issue.type.includes('SPENT') ? 'bg-[var(--t-danger)] animate-pulse' : 'bg-amber-400'}`} />
                                            <span className="font-bold" style={{ color: 'var(--t-text)' }}>{issue.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Category Allocation Breakdown */}
                        {categories.length > 0 && (
                            <div className="rounded-2xl border p-4 space-y-3"
                                style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                                <h4 className="text-[10px] font-black text-[var(--t-text)] uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--t-primary)' }} />
                                    Category Allocations
                                </h4>
                                <div className="space-y-3">
                                    {categories.slice(0, 6).map((cat, idx) => {
                                        const catPercent = cat.allocation > 0 ? Math.min((cat.spent / cat.allocation) * 100, 100) : 0;
                                        const isOver = cat.spent > cat.allocation;
                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex justify-between items-end text-[10px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isOver ? 'bg-[var(--t-danger)] animate-pulse' : 'bg-[var(--t-primary2)]'}`} />
                                                        <span className="font-bold" style={{ color: 'var(--t-text)' }}>{cat.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span style={{ color: 'var(--t-text3)' }}>
                                                            {formatCurrency(cat.spent)} / {formatCurrency(cat.allocation)}
                                                        </span>
                                                        <span className={`font-black ${isOver ? 'text-[var(--t-danger)]' : 'text-[var(--t-primary2)]'}`}>
                                                            {catPercent.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--t-surface2)' }}>
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700"
                                                        style={{
                                                            width: `${catPercent}%`,
                                                            background: isOver ? 'var(--t-danger)' : 'var(--t-primary)',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {categories.length > 6 && (
                                        <p className="text-[9px] font-bold text-center pt-1" style={{ color: 'var(--t-text3)' }}>
                                            +{categories.length - 6} more categories — view in Budget page
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Quick link to update budget */}
                        <div className="flex items-center justify-between pt-1">
                            <p className="text-[10px] text-[var(--t-text3)]">
                                To change the master budget, switch to <strong>Project Config</strong> tab.
                            </p>
                            <button
                                type="button"
                                onClick={() => setActiveSection('config')}
                                className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                style={{ background: 'var(--t-primary)', color: '#fff' }}
                            >
                                Edit Budget →
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </Modal>
    );
};

export default HouseConfigModal;
