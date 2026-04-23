import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { boqService } from '../../services/api';

/**
 * BoQ Auto-Generator wizard. Collects a handful of top-level inputs
 * (sqft, storeys, bedrooms, …) and asks the backend to materialise a
 * priced BoQ. The result is shown in a table with an "Apply to Budget"
 * action that pushes totals into BudgetCategory rows.
 */
const BoQWizard = ({ projectId }) => {
    const [form, setForm] = useState({
        total_sqft: 1000,
        storeys: 2,
        bedrooms: 3,
        bathrooms: 2,
        kitchens: 1,
        wall_height: 10,
        quality_tier: 'STANDARD',
    });
    const [boq, setBoq] = useState(null);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState(null);
    const [applied, setApplied] = useState(false);

    const setField = (k) => (e) =>
        setForm((f) => ({
            ...f,
            [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value,
        }));

    const seedIfEmpty = async () => {
        try { await boqService.seedDefaults(); } catch { /* ignore */ }
    };

    useEffect(() => { seedIfEmpty(); }, []);

    const generate = async () => {
        if (!projectId) {
            setError('Select a project first.');
            return;
        }
        setLoading(true);
        setError(null);
        setApplied(false);
        try {
            const { data } = await boqService.generateBoQ({
                project_id: projectId,
                inputs: form,
            });
            setBoq(data);
        } catch (e) {
            setError(e?.response?.data?.error || 'Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    const apply = async () => {
        if (!boq) return;
        setApplying(true);
        try {
            await boqService.applyToBudget(boq.id);
            setApplied(true);
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold inline-flex items-center gap-2 mb-3">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" /> BoQ Wizard
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <Field label="Total sq. ft.">
                        <input type="number" className={inputCls} value={form.total_sqft}
                            onChange={setField('total_sqft')} />
                    </Field>
                    <Field label="Storeys">
                        <input type="number" className={inputCls} value={form.storeys}
                            onChange={setField('storeys')} />
                    </Field>
                    <Field label="Bedrooms">
                        <input type="number" className={inputCls} value={form.bedrooms}
                            onChange={setField('bedrooms')} />
                    </Field>
                    <Field label="Bathrooms">
                        <input type="number" className={inputCls} value={form.bathrooms}
                            onChange={setField('bathrooms')} />
                    </Field>
                    <Field label="Wall height (ft)">
                        <input type="number" className={inputCls} value={form.wall_height}
                            onChange={setField('wall_height')} />
                    </Field>
                    <Field label="Quality tier">
                        <select className={inputCls} value={form.quality_tier}
                            onChange={setField('quality_tier')}>
                            <option value="BUDGET">Budget</option>
                            <option value="STANDARD">Standard</option>
                            <option value="PREMIUM">Premium</option>
                        </select>
                    </Field>
                </div>

                <button
                    onClick={generate}
                    disabled={loading}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? 'Generating…' : 'Generate BoQ'}
                </button>
                {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
            </div>

            {boq && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="font-semibold">Generated BoQ #{boq.id}</h3>
                            <div className="text-xs text-gray-500">
                                Template: {boq.template_name || '—'} · {boq.items?.length || 0} items
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Grand Total</div>
                            <div className="text-xl font-bold">Rs. {fmt(boq.grand_total)}</div>
                        </div>
                    </div>

                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 text-xs border-b">
                                <th className="py-1">Phase</th>
                                <th className="py-1">Item</th>
                                <th className="py-1 text-right">Qty</th>
                                <th className="py-1">Unit</th>
                                <th className="py-1 text-right">Rate</th>
                                <th className="py-1 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {boq.items?.map((it) => (
                                <tr key={it.id} className="border-b last:border-0">
                                    <td className="py-1 text-gray-600 capitalize">{it.phase_key}</td>
                                    <td className="py-1">{it.label}</td>
                                    <td className="py-1 text-right">{fmt(it.quantity)}</td>
                                    <td className="py-1 text-gray-500">{it.unit}</td>
                                    <td className="py-1 text-right">Rs. {fmt(it.unit_rate)}</td>
                                    <td className="py-1 text-right font-semibold">Rs. {fmt(it.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-4 flex items-center gap-3">
                        <button
                            onClick={apply}
                            disabled={applying || applied}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60 text-sm"
                        >
                            {applied ? <CheckCircle2 className="w-4 h-4" /> : null}
                            {applied ? 'Applied to Budget' : applying ? 'Applying…' : 'Apply to Budget Categories'}
                        </button>
                        <div className="text-xs text-gray-500">
                            Materials: Rs. {fmt(boq.material_total)} · Labor: Rs. {fmt(boq.labor_total)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const inputCls = 'w-full border rounded-md px-2 py-1';

const Field = ({ label, children }) => (
    <label className="block">
        <span className="block text-xs text-gray-500 mb-0.5">{label}</span>
        {children}
    </label>
);

function fmt(n) {
    return (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default BoQWizard;
