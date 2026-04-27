import React, { useState, useEffect } from 'react';
import { estimateService } from '../../services/api';
import {
    RefreshCcw, Trash2, Copy, ChevronRight, TrendingUp,
    AlertCircle, CheckCircle2, PlusCircle, Layers
} from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(n);
const fmtNum = (n) => Number(n).toLocaleString('en-NP');

const STATUS_STYLES = {
    DRAFT:    'bg-slate-100 text-slate-600',
    FINAL:    'bg-blue-100 text-blue-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    ARCHIVED: 'bg-amber-100 text-amber-700',
};

const QUALITY_ICONS = { ECONOMY: '🏠', STANDARD: '🏡', PREMIUM: '🏘️', LUXURY: '🏰' };

const SectionAccordion = ({ section }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 font-black text-[10px]">
                        {section.order}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">{section.name}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="font-black text-slate-900 text-sm hidden sm:block">{fmt(section.subtotal)}</span>
                    <ChevronRight size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
                </div>
            </button>
            {open && section.items?.length > 0 && (
                <div className="border-t border-slate-50">
                    <table className="w-full text-xs">
                        <tbody className="divide-y divide-slate-50">
                            {section.items.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50">
                                    <td className="px-5 py-2.5">
                                        <span className="font-medium text-slate-700">{item.label}</span>
                                        <span className={`ml-2 text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${item.category === 'MATERIAL' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-500 hidden sm:table-cell">
                                        {fmtNum(item.quantity)} {item.unit} × Rs.{fmtNum(item.unit_rate)}
                                    </td>
                                    <td className="px-5 py-2.5 text-right font-bold text-slate-900">Rs. {fmtNum(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const EstimateDetail = ({ estimate, onBack, onDelete, onDuplicate }) => (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-colors text-sm font-bold">
                ← Back to list
            </button>
            <div className="flex gap-3">
                <button onClick={() => onDuplicate(estimate.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                    <Copy size={13} /> Duplicate
                </button>
                <button onClick={() => onDelete(estimate.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                    <Trash2 size={13} /> Delete
                </button>
            </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-8 text-white">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest ${STATUS_STYLES[estimate.status]} inline-block mb-2`}>
                        {estimate.status}
                    </span>
                    <h2 className="text-2xl font-black tracking-tight">{estimate.name}</h2>
                    <p className="text-slate-400 text-sm mt-1">{QUALITY_ICONS[estimate.quality_tier]} {estimate.quality_tier}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Material', value: estimate.material_total, color: 'text-blue-300' },
                    { label: 'Labor', value: estimate.labor_total, color: 'text-amber-300' },
                    { label: 'Contingency', value: estimate.contingency_amount, color: 'text-red-300' },
                    { label: 'Grand Total', value: estimate.grand_total, color: 'text-emerald-300' },
                ].map(item => (
                    <div key={item.label} className="bg-white/5 rounded-2xl p-4">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{item.label}</p>
                        <p className={`text-lg font-black ${item.color}`}>{fmt(item.value)}</p>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-white/10">
                {[
                    { label: 'Area',      val: `${fmtNum(estimate.total_area_sqft)} sqft` },
                    { label: 'Floors',    val: estimate.floors },
                    { label: 'Beds',      val: estimate.bedrooms },
                    { label: 'Baths',     val: estimate.bathrooms },
                    { label: 'MEP',       val: estimate.include_mep ? 'Yes' : 'No' },
                    { label: 'Finishing', val: estimate.include_finishing ? 'Yes' : 'No' },
                    { label: 'Contingency', val: `${estimate.contingency_pct}%` },
                ].map(i => (
                    <span key={i.label} className="text-xs font-bold text-slate-400">
                        {i.label}: <span className="text-slate-200">{i.val}</span>
                    </span>
                ))}
            </div>
        </div>

        {estimate.sections?.length > 0 && (
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Layers size={16} className="text-emerald-600" />
                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider">Section Breakdown</h4>
                </div>
                {estimate.sections.map(sec => <SectionAccordion key={sec.id} section={sec} />)}
            </div>
        )}
    </div>
);

const SavedEstimatesTab = () => {
    const [estimates, setEstimates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);  // full estimate detail
    const [msg, setMsg] = useState(null);
    const [regen, setRegen] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await estimateService.listEstimates();
            setEstimates(res.data.results ?? res.data);
        } catch {
            setMsg({ type: 'error', text: 'Failed to load estimates.' });
        } finally { setLoading(false); }
    };

    const loadDetail = async (id) => {
        try {
            const res = await estimateService.getEstimate(id);
            setSelected(res.data);
        } catch {
            setMsg({ type: 'error', text: 'Failed to load estimate details.' });
        }
    };

    const handleRegenerate = async (id) => {
        setRegen(id);
        try {
            await estimateService.generateEstimate(id);
            setMsg({ type: 'ok', text: 'Estimate regenerated.' });
            if (selected?.id === id) await loadDetail(id);
            load();
        } catch {
            setMsg({ type: 'error', text: 'Regeneration failed.' });
        } finally { setRegen(null); }
    };

    const handleDuplicate = async (id) => {
        try {
            const res = await estimateService.duplicateEstimate(id);
            setMsg({ type: 'ok', text: 'Estimate duplicated.' });
            load();
            loadDetail(res.data.id);
        } catch {
            setMsg({ type: 'error', text: 'Duplicate failed.' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this estimate? This cannot be undone.')) return;
        try {
            await estimateService.deleteEstimate(id);
            setMsg({ type: 'ok', text: 'Estimate deleted.' });
            setSelected(null);
            load();
        } catch {
            setMsg({ type: 'error', text: 'Delete failed.' });
        }
    };

    useEffect(() => { load(); }, []);

    if (selected) {
        return (
            <div className="space-y-4">
                {msg && (
                    <div className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-bold border ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                        {msg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {msg.text}
                    </div>
                )}
                <EstimateDetail
                    estimate={selected}
                    onBack={() => { setSelected(null); setMsg(null); }}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-900">Saved Estimates</h3>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">{estimates.length} estimate{estimates.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                    <RefreshCcw size={14} /> Refresh
                </button>
            </div>

            {msg && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-bold border ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                    {msg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {msg.text}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                </div>
            ) : estimates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-4xl">📋</div>
                    <div className="text-center">
                        <p className="font-black text-slate-900 text-lg">No saved estimates yet</p>
                        <p className="text-slate-400 text-sm mt-1">Use the "Build Estimate" tab to create your first full project estimate.</p>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold mt-2">
                        <PlusCircle size={16} /> Switch to "Build Estimate" to get started
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {estimates.map(est => (
                        <div key={est.id}
                            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => loadDetail(est.id)}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shrink-0 border border-slate-100">
                                        {QUALITY_ICONS[est.quality_tier] ?? '🏠'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-black text-slate-900 truncate">{est.name}</p>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest shrink-0 ${STATUS_STYLES[est.status]}`}>
                                                {est.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {est.floors} floor{est.floors > 1 ? 's' : ''} · {fmtNum(est.total_area_sqft)} sqft · {est.quality_tier}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 shrink-0">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] text-slate-400 font-bold">Grand Total</p>
                                        <p className="font-black text-emerald-600">{fmt(est.grand_total)}</p>
                                    </div>

                                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleRegenerate(est.id)} disabled={regen === est.id}
                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                            title="Regenerate estimate">
                                            {regen === est.id ? <RefreshCcw size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                                        </button>
                                        <button onClick={() => handleDuplicate(est.id)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            title="Duplicate">
                                            <Copy size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(est.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SavedEstimatesTab;
