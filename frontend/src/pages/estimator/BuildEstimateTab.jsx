import React, { useState } from 'react';
import { estimateService } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';
import {
    RefreshCcw, AlertCircle, TrendingUp, ChevronRight,
    Plus, Minus, Layers, CheckCircle2
} from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(n);
const fmtNum = (n) => Number(n).toLocaleString('en-NP');

const QUALITY_OPTS = [
    { id: 'ECONOMY',  label: 'Economy',  desc: 'Basic materials',  color: 'bg-slate-100 text-slate-700', active: 'bg-slate-700 text-white' },
    { id: 'STANDARD', label: 'Standard', desc: 'Good quality',     color: 'bg-blue-50 text-blue-700',   active: 'bg-blue-600 text-white' },
    { id: 'PREMIUM',  label: 'Premium',  desc: 'High quality',     color: 'bg-purple-50 text-purple-700', active: 'bg-purple-600 text-white' },
    { id: 'LUXURY',   label: 'Luxury',   desc: 'Best of the best', color: 'bg-amber-50 text-amber-700', active: 'bg-amber-500 text-white' },
];

const SectionCard = ({ section }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-black text-sm">
                        {section.order}
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-slate-900 text-sm">{section.name}</p>
                        <p className="text-xs text-slate-400">{section.items?.length ?? 0} line items</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400">Material + Labor</p>
                        <p className="font-black text-slate-900 text-sm">
                            {fmt(section.material_subtotal + section.labor_subtotal)}
                        </p>
                    </div>
                    <ChevronRight size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
                </div>
            </button>

            {open && section.items && section.items.length > 0 && (
                <div className="border-t border-slate-50">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="px-6 py-2 text-left font-black text-slate-400 uppercase tracking-widest">Item</th>
                                <th className="px-4 py-2 text-right font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Qty × Rate</th>
                                <th className="px-6 py-2 text-right font-black text-slate-400 uppercase tracking-widest">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {section.items.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-3">
                                        <span className="font-medium text-slate-700">{item.label}</span>
                                        <span className={`ml-2 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${item.category === 'MATERIAL' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">
                                        {fmtNum(item.quantity)} {item.unit} × Rs.{fmtNum(item.unit_rate)}
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold text-slate-900">
                                        Rs. {fmtNum(item.total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const BuildEstimateTab = () => {
    const { dashboardData } = useConstruction();
    const projectId = dashboardData?.project?.id;

    const [form, setForm] = useState({
        name: '',
        total_area_sqft: '',
        floors: 1,
        bedrooms: 3,
        bathrooms: 2,
        quality_tier: 'STANDARD',
        include_mep: true,
        include_finishing: true,
        contingency_pct: 5,
    });
    const [estimate, setEstimate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
    const inc = (k, min = 0) => set(k, Math.max(min, (parseInt(form[k]) || 0) + 1));
    const dec = (k, min = 0) => set(k, Math.max(min, (parseInt(form[k]) || 0) - 1));

    const Counter = ({ label, field, min = 0 }) => (
        <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-xl p-1 w-fit">
                <button type="button" onClick={() => dec(field, min)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-all">
                    <Minus size={14} />
                </button>
                <span className="w-8 text-center font-black text-slate-900">{form[field]}</span>
                <button type="button" onClick={() => inc(field)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800 text-white hover:bg-slate-700 transition-all">
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );

    const Toggle = ({ label, field, emoji }) => (
        <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-11 h-6 rounded-full p-0.5 transition-all ${form[field] ? 'bg-emerald-500' : 'bg-slate-200'}`}
                onClick={() => set(field, !form[field])}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form[field] ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{emoji} {label}</span>
        </label>
    );

    const handleBuild = async (e) => {
        e.preventDefault();
        if (!form.total_area_sqft || parseFloat(form.total_area_sqft) <= 0) {
            setError('Please enter total floor area.');
            return;
        }
        setLoading(true); setError(null); setEstimate(null);
        try {
            const payload = {
                ...form,
                name: form.name || `${form.quality_tier} – ${form.floors} floor${form.floors > 1 ? 's' : ''}, ${form.total_area_sqft} sqft`,
                total_area_sqft: parseFloat(form.total_area_sqft),
                floors: parseInt(form.floors),
                bedrooms: parseInt(form.bedrooms),
                bathrooms: parseInt(form.bathrooms),
                contingency_pct: parseFloat(form.contingency_pct) || 5,
            };
            if (projectId) payload.project = projectId;
            const res = await estimateService.quickEstimate(payload);
            setEstimate(res.data);
        } catch (err) {
            const detail = err?.response?.data;
            setError(typeof detail === 'string' ? detail : JSON.stringify(detail) ?? 'Build failed — check inputs.');
        } finally { setLoading(false); }
    };

    return (
        <div className="space-y-8">
            {/* Input form */}
            <form onSubmit={handleBuild} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estimate Name (optional)</label>
                        <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                            placeholder="e.g. My House Estimate 2025"
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-800 text-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Floor Area *</label>
                        <div className="relative">
                            <input type="number" step="any" value={form.total_area_sqft} onChange={e => set('total_area_sqft', e.target.value)}
                                placeholder="e.g. 1500"
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 pr-16 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-800 text-sm"
                                required />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">SQ.FT</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-8">
                    <Counter label="Floors" field="floors" min={1} />
                    <Counter label="Bedrooms" field="bedrooms" />
                    <Counter label="Bathrooms" field="bathrooms" />
                </div>

                {/* Quality tier */}
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quality Tier</label>
                    <div className="flex flex-wrap gap-3">
                        {QUALITY_OPTS.map(q => (
                            <button key={q.id} type="button" onClick={() => set('quality_tier', q.id)}
                                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${form.quality_tier === q.id ? q.active + ' shadow-md' : q.color}`}>
                                <span className="block">{q.label}</span>
                                <span className="block font-normal normal-case tracking-normal text-[10px] opacity-70 mt-0.5">{q.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Options row */}
                <div className="flex flex-wrap gap-6 p-5 bg-slate-50 rounded-2xl">
                    <Toggle label="Include MEP (Plumbing & Electrical)" field="include_mep" emoji="🚿" />
                    <Toggle label="Include Finishing (Doors & Windows)" field="include_finishing" emoji="🎨" />
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-bold text-slate-700">⚠️ Contingency</label>
                        <div className="relative">
                            <input type="number" step="0.5" min="0" max="30" value={form.contingency_pct}
                                onChange={e => set('contingency_pct', e.target.value)}
                                className="w-20 bg-white border-2 border-slate-200 rounded-xl px-3 py-2 pr-8 focus:border-emerald-500 outline-none transition-all font-bold text-slate-800 text-sm text-center" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <button type="submit" disabled={loading}
                    className="w-full py-4 bg-slate-900 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3">
                    {loading ? <><RefreshCcw size={16} className="animate-spin" /> Building estimate…</>
                        : <><TrendingUp size={16} /> Build Full Estimate</>}
                </button>
            </form>

            {/* Results */}
            {estimate && (
                <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
                    {/* Header totals */}
                    <div className="bg-slate-900 rounded-3xl p-8 text-white">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Full Estimate</p>
                                <h3 className="text-2xl font-black tracking-tight">{estimate.name}</h3>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-xl">
                                <CheckCircle2 size={16} className="text-emerald-400" />
                                <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">{estimate.status}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: 'Material', value: estimate.material_total, color: 'text-blue-300' },
                                { label: 'Labor',    value: estimate.labor_total,    color: 'text-amber-300' },
                                { label: 'Contingency', value: estimate.contingency_amount, color: 'text-red-300' },
                                { label: 'Grand Total', value: estimate.grand_total, color: 'text-emerald-300' },
                            ].map(item => (
                                <div key={item.label} className="bg-white/5 rounded-2xl p-4">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{item.label}</p>
                                    <p className={`text-lg font-black ${item.color}`}>{fmt(item.value)}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-4">
                            {[
                                { label: 'Area', val: `${fmtNum(estimate.total_area_sqft)} sqft` },
                                { label: 'Floors', val: estimate.floors },
                                { label: 'Bedrooms', val: estimate.bedrooms },
                                { label: 'Bathrooms', val: estimate.bathrooms },
                                { label: 'Quality', val: estimate.quality_tier },
                            ].map(i => (
                                <span key={i.label} className="text-xs font-bold text-slate-400">
                                    {i.label}: <span className="text-slate-200">{i.val}</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Sections */}
                    {estimate.sections && estimate.sections.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Layers size={18} className="text-emerald-600" />
                                <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider">Breakdown by Section</h4>
                            </div>
                            {estimate.sections.map(sec => (
                                <SectionCard key={sec.id} section={sec} />
                            ))}
                        </div>
                    )}

                    <div className="p-5 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4">
                        <span className="text-xl mt-0.5">⚠️</span>
                        <p className="text-xs text-amber-800 font-bold leading-relaxed">
                            This estimate uses current market rates from your database. For final contracts, verify quantities
                            and prices with your Site Engineer and local suppliers.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuildEstimateTab;
