import React, { useState, useEffect } from 'react';
import { estimateService } from '../../services/api';
import {
    Database, RefreshCcw, Save, TrendingUp, HardHat, Package,
    AlertCircle, CheckCircle2, Sparkles
} from 'lucide-react';

const CATEGORY_LABELS = {
    CEMENT: 'Cement & Concrete', AGGREGATE: 'Aggregate', STEEL: 'Steel',
    BRICK: 'Brick & Masonry', TILE: 'Tile & Flooring', PAINT: 'Paint',
    WATERPROOFING: 'Waterproofing', DOOR: 'Doors', WINDOW: 'Windows',
    PLUMBING: 'Plumbing', ELECTRICAL: 'Electrical', FORMWORK: 'Formwork', OTHER: 'Other',
};

const TRADE_LABELS = {
    MASON: 'Mason (Rajmistri)', HELPER: 'Helper (Mazdoor)', CARPENTER: 'Carpenter (Mistry)',
    ELECTRICIAN: 'Electrician', PLUMBER: 'Plumber', PAINTER: 'Painter',
    STEEL_FIXER: 'Steel Fixer', SUPERVISOR: 'Supervisor', TILE_SETTER: 'Tile Setter',
    EXCAVATOR: 'Excavator', WATERPROOF: 'Waterproofing Applicator',
};

const MaterialRates = () => {
    const [rates, setRates] = useState([]);
    const [edits, setEdits] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [seeding, setSeeding] = useState(false);
    const [msg, setMsg] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await estimateService.getMaterialRates();
            const list = res.data.results ?? res.data;
            setRates(list);
            const init = {};
            list.forEach(r => { init[r.id] = r.rate; });
            setEdits(init);
        } catch {
            setMsg({ type: 'error', text: 'Failed to load material rates.' });
        } finally { setLoading(false); }
    };

    const handleSeed = async () => {
        setSeeding(true);
        try {
            await estimateService.seedMaterialRates();
            setMsg({ type: 'ok', text: 'Default rates seeded successfully.' });
            load();
        } catch {
            setMsg({ type: 'error', text: 'Seed failed.' });
        } finally { setSeeding(false); }
    };

    const handleSave = async (id) => {
        setSaving(id);
        setMsg(null);
        try {
            await estimateService.updateMaterialRate(id, { rate: parseFloat(edits[id]) });
            setMsg({ type: 'ok', text: 'Rate updated.' });
            load();
        } catch {
            setMsg({ type: 'error', text: 'Update failed.' });
        } finally { setSaving(null); }
    };

    useEffect(() => { load(); }, []);

    // Group by category
    const grouped = rates.reduce((acc, r) => {
        const cat = r.category || 'OTHER';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(r);
        return acc;
    }, {});

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading rates…</p>
        </div>
    );

    if (rates.length === 0) return (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-4xl">💰</div>
            <div className="text-center">
                <p className="font-black text-slate-900 text-lg mb-1">No rates configured yet</p>
                <p className="text-slate-400 text-sm mb-6">Seed the database with default Nepali market rates to get started.</p>
                <button onClick={handleSeed} disabled={seeding}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all mx-auto disabled:opacity-50">
                    <Sparkles size={14} /> {seeding ? 'Seeding…' : 'Seed Default Rates'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <Database size={22} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900">Material Rates</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">NPR — current market prices</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                        <RefreshCcw size={14} /> Refresh
                    </button>
                    <button onClick={handleSeed} disabled={seeding} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50">
                        <Sparkles size={14} /> {seeding ? 'Seeding…' : 'Seed Defaults'}
                    </button>
                </div>
            </div>

            {msg && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-bold border-2 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                    {msg.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {msg.text}
                </div>
            )}

            {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Package size={14} className="text-emerald-600" />
                            {CATEGORY_LABELS[cat] ?? cat}
                        </p>
                    </div>
                    <table className="w-full">
                        <tbody className="divide-y divide-slate-50">
                            {items.map(rate => (
                                <tr key={rate.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 w-1/2">
                                        <p className="font-bold text-slate-900 text-sm">{rate.name}</p>
                                        <p className="text-xs text-slate-400 font-medium">per {rate.unit ?? '—'} · key: {rate.key}</p>
                                    </td>
                                    <td className="px-6 py-4 w-1/3">
                                        <div className="relative w-40">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rs.</span>
                                            <input type="number" value={edits[rate.id] ?? ''}
                                                onChange={e => setEdits({ ...edits, [rate.id]: e.target.value })}
                                                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-900 text-sm" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleSave(rate.id)}
                                            disabled={saving === rate.id || parseFloat(edits[rate.id]) === parseFloat(rate.rate)}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                                saving === rate.id ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : parseFloat(edits[rate.id]) === parseFloat(rate.rate)
                                                        ? 'text-slate-300 cursor-default'
                                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                            }`}>
                                            {saving === rate.id ? <RefreshCcw size={12} className="animate-spin" /> : <Save size={12} />}
                                            Save
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};

const LaborRates = () => {
    const [rates, setRates] = useState([]);
    const [edits, setEdits] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [seeding, setSeeding] = useState(false);
    const [msg, setMsg] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await estimateService.getLaborRates();
            const list = res.data.results ?? res.data;
            setRates(list);
            const init = {};
            list.forEach(r => { init[r.id] = r.daily_rate; });
            setEdits(init);
        } catch {
            setMsg({ type: 'error', text: 'Failed to load labor rates.' });
        } finally { setLoading(false); }
    };

    const handleSeed = async () => {
        setSeeding(true);
        try {
            await estimateService.seedLaborRates();
            setMsg({ type: 'ok', text: 'Labor rates seeded.' });
            load();
        } catch {
            setMsg({ type: 'error', text: 'Seed failed.' });
        } finally { setSeeding(false); }
    };

    const handleSave = async (id) => {
        setSaving(id);
        setMsg(null);
        try {
            await estimateService.updateLaborRate(id, { daily_rate: parseFloat(edits[id]) });
            setMsg({ type: 'ok', text: 'Labor rate updated.' });
            load();
        } catch {
            setMsg({ type: 'error', text: 'Update failed.' });
        } finally { setSaving(null); }
    };

    useEffect(() => { load(); }, []);

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
    );

    if (rates.length === 0) return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-slate-400 text-sm font-bold">No labor rates found.</p>
            <button onClick={handleSeed} disabled={seeding}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50">
                <Sparkles size={14} /> Seed Labor Rates
            </button>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white">
                        <HardHat size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900">Labor Rates</h3>
                        <p className="text-xs text-slate-400 font-bold">Daily rate in NPR / person-day</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                        <RefreshCcw size={14} />
                    </button>
                    <button onClick={handleSeed} disabled={seeding} className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50">
                        <Sparkles size={14} /> Seed
                    </button>
                </div>
            </div>

            {msg && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-bold border-2 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                    {msg.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {msg.text}
                </div>
            )}

            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Trade</th>
                            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Daily Rate (NPR)</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {rates.map(rate => (
                            <tr key={rate.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-slate-900 text-sm">{TRADE_LABELS[rate.trade] ?? rate.trade}</p>
                                    <p className="text-xs text-slate-400">{rate.region || 'Nepal'}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="relative w-40">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rs.</span>
                                        <input type="number" value={edits[rate.id] ?? ''}
                                            onChange={e => setEdits({ ...edits, [rate.id]: e.target.value })}
                                            className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-amber-500 focus:bg-white outline-none transition-all font-bold text-slate-900 text-sm" />
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <button onClick={() => handleSave(rate.id)}
                                        disabled={saving === rate.id || parseFloat(edits[rate.id]) === parseFloat(rate.daily_rate)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            saving === rate.id ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : parseFloat(edits[rate.id]) === parseFloat(rate.daily_rate)
                                                    ? 'text-slate-300 cursor-default'
                                                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                                        }`}>
                                        {saving === rate.id ? <RefreshCcw size={12} className="animate-spin" /> : <Save size={12} />}
                                        Save
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const MarketRatesTab = () => {
    const [sub, setSub] = useState('material');
    return (
        <div className="space-y-6">
            <div className="flex bg-slate-100 p-1 rounded-2xl w-fit gap-1">
                {[{ id: 'material', label: '📦 Material Rates' }, { id: 'labor', label: '👷 Labor Rates' }].map(t => (
                    <button key={t.id} onClick={() => setSub(t.id)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${sub === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {t.label}
                    </button>
                ))}
            </div>
            {sub === 'material' ? <MaterialRates /> : <LaborRates />}
            <div className="flex items-center gap-4 p-6 bg-blue-50 border border-blue-100 rounded-3xl">
                <TrendingUp size={20} className="text-blue-600 shrink-0" />
                <p className="text-xs text-blue-700 font-bold">
                    All calculators and estimate builders automatically use these rates. Changes apply immediately to new calculations.
                </p>
            </div>
        </div>
    );
};

export default MarketRatesTab;
