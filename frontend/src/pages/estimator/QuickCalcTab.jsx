import React, { useState } from 'react';
import { estimateService } from '../../services/api';
import { RefreshCcw, AlertCircle } from 'lucide-react';

// ─── Calculator config ────────────────────────────────────────────────────────
const CALCULATORS = [
    {
        id: 'wall', label: 'Wall & Brickwork', icon: '🧱', color: 'red',
        desc: 'Bricks, cement & sand for masonry walls',
        fields: [
            { name: 'length_ft',      label: 'Wall Length',       type: 'number', unit: 'ft',  default: '' },
            { name: 'height_ft',      label: 'Wall Height',       type: 'number', unit: 'ft',  default: '' },
            { name: 'thickness',      label: 'Thickness',         type: 'select', default: '9_INCH',
              options: [{ value: '9_INCH', label: '9 inch — External' }, { value: '4_INCH', label: '4.5 inch — Partition' }] },
            { name: 'ratio',          label: 'Cement:Sand Ratio', type: 'select', default: '1:6',
              options: [{ value: '1:6', label: '1:6 (Standard)' }, { value: '1:5', label: '1:5 (Medium)' }, { value: '1:4', label: '1:4 (Strong)' }] },
            { name: 'openings_sqft',  label: 'Openings (doors/windows)', type: 'number', unit: 'sqft', default: '0' },
            { name: 'include_labor',  label: 'Include Labor',     type: 'toggle', default: true },
        ],
    },
    {
        id: 'concrete', label: 'Concrete (Dhalan)', icon: '🏗️', color: 'slate',
        desc: 'RCC concrete for slabs, beams, columns',
        fields: [
            { name: 'length_ft',        label: 'Length',        type: 'number', unit: 'ft',  default: '' },
            { name: 'width_ft',         label: 'Width',         type: 'number', unit: 'ft',  default: '' },
            { name: 'depth_in',         label: 'Depth',         type: 'number', unit: 'inch',default: '5' },
            { name: 'grade',            label: 'Concrete Grade', type: 'select', default: 'M20',
              options: [{ value: 'M10', label: 'M10' }, { value: 'M15', label: 'M15' }, { value: 'M20', label: 'M20 (Standard)' }, { value: 'M25', label: 'M25 (Strong)' }] },
            { name: 'structure',        label: 'Structure Type', type: 'select', default: 'SLAB',
              options: [{ value: 'SLAB', label: 'Slab' }, { value: 'BEAM', label: 'Beam' }, { value: 'COLUMN', label: 'Column' }, { value: 'FOOTING', label: 'Footing' }, { value: 'RAFT', label: 'Raft' }] },
            { name: 'include_rebar',    label: 'Include Rebar',    type: 'toggle', default: true },
            { name: 'include_formwork', label: 'Include Formwork', type: 'toggle', default: true },
            { name: 'include_labor',    label: 'Include Labor',    type: 'toggle', default: true },
        ],
    },
    {
        id: 'plaster', label: 'Plastering', icon: '🪄', color: 'amber',
        desc: 'Cement plaster for walls & ceilings',
        fields: [
            { name: 'area_sqft',     label: 'Plaster Area',  type: 'number', unit: 'sqft', default: '' },
            { name: 'thickness_mm',  label: 'Thickness',     type: 'number', unit: 'mm',   default: '12' },
            { name: 'ratio',         label: 'Mix Ratio',     type: 'select', default: '1:4',
              options: [{ value: '1:3', label: '1:3 (Strong)' }, { value: '1:4', label: '1:4 (Standard)' }, { value: '1:5', label: '1:5 (Economy)' }, { value: '1:6', label: '1:6' }] },
            { name: 'coats',         label: 'Coats',         type: 'select', default: '1',
              options: [{ value: '1', label: '1 coat' }, { value: '2', label: '2 coats' }] },
            { name: 'include_labor', label: 'Include Labor', type: 'toggle', default: true },
        ],
    },
    {
        id: 'pcc_flooring', label: 'PCC Flooring', icon: '⬜', color: 'stone',
        desc: 'Plain cement concrete bed (1:3:6)',
        fields: [
            { name: 'area_sqft',     label: 'Floor Area',    type: 'number', unit: 'sqft',  default: '' },
            { name: 'thickness_in',  label: 'Thickness',     type: 'number', unit: 'inch',  default: '2' },
            { name: 'include_labor', label: 'Include Labor', type: 'toggle', default: true },
        ],
    },
    {
        id: 'tile_flooring', label: 'Tile Flooring', icon: '🧊', color: 'blue',
        desc: 'Tiles, adhesive & grout for any floor',
        fields: [
            { name: 'area_sqft',     label: 'Floor Area',    type: 'number', unit: 'sqft', default: '' },
            { name: 'tile_type',     label: 'Tile Quality',  type: 'select', default: 'BASIC',
              options: [{ value: 'BASIC', label: 'Basic (Standard)' }, { value: 'PREMIUM', label: 'Premium (Imported)' }] },
            { name: 'wastage_pct',   label: 'Wastage %',     type: 'number', unit: '%',    default: '10' },
            { name: 'include_labor', label: 'Include Labor', type: 'toggle', default: true },
        ],
    },
    {
        id: 'paint', label: 'Painting', icon: '🎨', color: 'pink',
        desc: 'Interior & exterior paint quantity',
        fields: [
            { name: 'area_sqft',     label: 'Paint Area',    type: 'number', unit: 'sqft', default: '' },
            { name: 'paint_type',    label: 'Paint Type',    type: 'select', default: 'INTERNAL',
              options: [{ value: 'INTERNAL', label: 'Internal Emulsion' }, { value: 'EXTERNAL', label: 'External Weather Shield' }] },
            { name: 'coats',         label: 'Coats',         type: 'select', default: '2',
              options: [{ value: '1', label: '1 coat (primer)' }, { value: '2', label: '2 coats (standard)' }, { value: '3', label: '3 coats (premium)' }] },
            { name: 'include_labor', label: 'Include Labor', type: 'toggle', default: true },
        ],
    },
    {
        id: 'roofing', label: 'Roofing', icon: '🏠', color: 'emerald',
        desc: 'RCC flat roof slab + waterproofing',
        fields: [
            { name: 'area_sqft',              label: 'Roof Area',          type: 'number', unit: 'sqft', default: '' },
            { name: 'slab_depth_in',           label: 'Slab Depth',         type: 'number', unit: 'inch', default: '5' },
            { name: 'include_waterproofing',   label: 'Include Waterproofing', type: 'toggle', default: true },
            { name: 'include_labor',           label: 'Include Labor',      type: 'toggle', default: true },
        ],
    },
    {
        id: 'excavation', label: 'Excavation', icon: '⛏️', color: 'yellow',
        desc: 'Earth cutting for foundation',
        fields: [
            { name: 'length_ft',   label: 'Length',     type: 'number', unit: 'ft', default: '' },
            { name: 'width_ft',    label: 'Width',      type: 'number', unit: 'ft', default: '' },
            { name: 'depth_ft',    label: 'Depth',      type: 'number', unit: 'ft', default: '' },
            { name: 'soil_type',   label: 'Soil Type',  type: 'select', default: 'NORMAL',
              options: [{ value: 'SOFT', label: 'Soft' }, { value: 'NORMAL', label: 'Normal' }, { value: 'HARD', label: 'Hard' }, { value: 'ROCK', label: 'Rock' }] },
        ],
    },
    {
        id: 'staircase', label: 'Staircase', icon: '🪜', color: 'purple',
        desc: 'RCC staircase with optional tiling',
        fields: [
            { name: 'flights',           label: 'Flights',          type: 'number', unit: '',     default: '1' },
            { name: 'steps_per_flight',  label: 'Steps per Flight', type: 'number', unit: 'steps',default: '14' },
            { name: 'width_ft',          label: 'Width',            type: 'number', unit: 'ft',   default: '4' },
            { name: 'include_tiles',     label: 'Include Tiles',    type: 'toggle', default: true },
            { name: 'include_labor',     label: 'Include Labor',    type: 'toggle', default: true },
        ],
    },
];

const COLOR_MAP = {
    red:     { bg: 'bg-red-100',     icon: 'text-red-600',     btn: 'bg-red-600 hover:bg-red-700 shadow-red-200',     border: 'border-red-100',  accent: 'text-red-600' },
    slate:   { bg: 'bg-slate-100',   icon: 'text-slate-700',   btn: 'bg-slate-800 hover:bg-slate-900 shadow-slate-200', border: 'border-slate-100', accent: 'text-slate-800' },
    amber:   { bg: 'bg-amber-100',   icon: 'text-amber-600',   btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200', border: 'border-amber-100', accent: 'text-amber-600' },
    stone:   { bg: 'bg-stone-100',   icon: 'text-stone-600',   btn: 'bg-stone-600 hover:bg-stone-700 shadow-stone-200', border: 'border-stone-100', accent: 'text-stone-600' },
    blue:    { bg: 'bg-blue-100',    icon: 'text-blue-600',    btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',   border: 'border-blue-100',  accent: 'text-blue-600' },
    pink:    { bg: 'bg-pink-100',    icon: 'text-pink-600',    btn: 'bg-pink-600 hover:bg-pink-700 shadow-pink-200',   border: 'border-pink-100',  accent: 'text-pink-600' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200', border: 'border-emerald-100', accent: 'text-emerald-600' },
    yellow:  { bg: 'bg-yellow-100',  icon: 'text-yellow-700',  btn: 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200', border: 'border-yellow-100', accent: 'text-yellow-700' },
    purple:  { bg: 'bg-purple-100',  icon: 'text-purple-600',  btn: 'bg-purple-600 hover:bg-purple-700 shadow-purple-200', border: 'border-purple-100', accent: 'text-purple-600' },
};

const fmt = (n) => Number(n).toLocaleString('en-NP');

const ResultsPanel = ({ result, color }) => {
    const c = COLOR_MAP[color];
    const { materials, labor, summary } = result;
    const hasMaterials = Object.keys(materials).length > 0;
    const hasLabor = Object.keys(labor).length > 0;

    return (
        <div className={`mt-8 border-2 ${c.border} rounded-3xl overflow-hidden`}>
            {/* Summary row */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50">
                <div className="px-6 py-5 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Material Cost</p>
                    <p className={`text-xl font-black ${c.accent}`}>Rs. {fmt(summary.material_total)}</p>
                </div>
                <div className="px-6 py-5 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Labor Cost</p>
                    <p className="text-xl font-black text-slate-900">Rs. {fmt(summary.labor_total)}</p>
                </div>
                <div className="px-6 py-5 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Total</p>
                    <p className="text-xl font-black text-emerald-600">Rs. {fmt(summary.grand_total)}</p>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Materials */}
                {hasMaterials && (
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">📦 Materials</p>
                        <div className="space-y-2">
                            {Object.entries(materials).map(([key, item]) => (
                                <div key={key} className="flex items-center justify-between py-2 px-4 bg-slate-50 rounded-xl">
                                    <span className="text-xs font-bold text-slate-600">{key.replace(/_/g, ' ')}</span>
                                    <span className="text-xs font-black text-slate-900">
                                        {fmt(item.qty)} {item.unit}
                                        <span className="text-slate-400 font-medium ml-2">= Rs.{fmt(item.total)}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Labor */}
                {hasLabor && (
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">👷 Labor</p>
                        <div className="space-y-2">
                            {Object.entries(labor).map(([key, item]) => (
                                <div key={key} className="flex items-center justify-between py-2 px-4 bg-amber-50 rounded-xl">
                                    <span className="text-xs font-bold text-amber-700">{key.replace(/_/g, ' ')}</span>
                                    <span className="text-xs font-black text-amber-900">
                                        {fmt(item.qty)} days
                                        <span className="text-amber-500 font-medium ml-2">= Rs.{fmt(item.total)}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Extra summary fields */}
            {Object.entries(summary).filter(([k]) => !['material_total','labor_total','grand_total'].includes(k)).length > 0 && (
                <div className="px-6 pb-5 flex flex-wrap gap-4">
                    {Object.entries(summary)
                        .filter(([k]) => !['material_total','labor_total','grand_total'].includes(k))
                        .map(([k, v]) => (
                            <span key={k} className="text-[10px] font-bold text-slate-400">
                                {k.replace(/_/g, ' ')}: <span className="text-slate-600">{typeof v === 'number' ? fmt(v) : v}</span>
                            </span>
                        ))}
                </div>
            )}
        </div>
    );
};

const CalcCard = ({ calc }) => {
    const c = COLOR_MAP[calc.color];
    const initVals = {};
    calc.fields.forEach(f => { initVals[f.name] = f.default; });
    const [vals, setVals] = useState(initVals);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const set = (name, val) => setVals(prev => ({ ...prev, [name]: val }));

    const handleCalc = async (e) => {
        e.preventDefault();
        setLoading(true); setError(null); setResult(null);
        try {
            // Convert numeric strings to numbers, keep booleans
            const params = {};
            calc.fields.forEach(f => {
                if (f.type === 'toggle') params[f.name] = vals[f.name];
                else if (f.type === 'number') params[f.name] = parseFloat(vals[f.name]) || 0;
                else params[f.name] = vals[f.name];
            });
            const res = await estimateService.calculate(calc.id, params);
            setResult(res.data);
        } catch (err) {
            setError(err?.response?.data?.detail ?? 'Calculation failed — check your inputs.');
        } finally { setLoading(false); }
    };

    return (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 ${c.bg} rounded-2xl flex items-center justify-center text-2xl`}>
                    {calc.icon}
                </div>
                <div>
                    <h3 className="font-black text-slate-900 text-lg tracking-tight">{calc.label}</h3>
                    <p className="text-xs text-slate-400 font-medium">{calc.desc}</p>
                </div>
            </div>

            <form onSubmit={handleCalc} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {calc.fields.filter(f => f.type !== 'toggle').map(field => (
                        <div key={field.name}>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                {field.label} {field.unit && <span className="normal-case font-medium">({field.unit})</span>}
                            </label>
                            {field.type === 'select' ? (
                                <select value={vals[field.name]} onChange={e => set(field.name, e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-800 text-sm appearance-none">
                                    {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            ) : (
                                <div className="relative">
                                    <input type="number" step="any" value={vals[field.name]} onChange={e => set(field.name, e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-800 text-sm"
                                        required={field.default === ''} />
                                    {field.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{field.unit}</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Toggle fields */}
                {calc.fields.filter(f => f.type === 'toggle').length > 0 && (
                    <div className="flex flex-wrap gap-4 pt-1">
                        {calc.fields.filter(f => f.type === 'toggle').map(field => (
                            <label key={field.name} className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-10 h-6 rounded-full p-0.5 transition-all ${vals[field.name] ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                    onClick={() => set(field.name, !vals[field.name])}>
                                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${vals[field.name] ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{field.label}</span>
                            </label>
                        ))}
                    </div>
                )}

                <button type="submit" disabled={loading}
                    className={`w-full py-3.5 ${c.btn} text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2`}>
                    {loading ? <><RefreshCcw size={14} className="animate-spin" /> Calculating…</> : `Calculate ${calc.label}`}
                </button>
            </form>

            {error && (
                <div className="mt-4 flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {result && <ResultsPanel result={result} color={calc.color} />}
        </div>
    );
};

const QuickCalcTab = () => {
    const [active, setActive] = useState('wall');
    const calc = CALCULATORS.find(c => c.id === active);

    return (
        <div className="space-y-6">
            {/* Calculator selector */}
            <div className="flex flex-wrap gap-2">
                {CALCULATORS.map(c => {
                    const cl = COLOR_MAP[c.color];
                    return (
                        <button key={c.id} onClick={() => setActive(c.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                active === c.id
                                    ? `${cl.bg} ${cl.icon} shadow-sm scale-105`
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                            }`}>
                            <span>{c.icon}</span> {c.label}
                        </button>
                    );
                })}
            </div>

            {/* Active calculator */}
            {calc && <CalcCard key={active} calc={calc} />}

            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4">
                <span className="text-2xl">👷‍♂️</span>
                <p className="text-xs text-emerald-800 font-bold">
                    All calculations include standard Nepali wastage (5–10%). Rates are pulled live from your Market Rates configuration.
                    Share results with your Project Engineer for final verification.
                </p>
            </div>
        </div>
    );
};

export default QuickCalcTab;
