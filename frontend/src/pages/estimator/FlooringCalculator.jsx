import React, { useState } from 'react';
import { estimateService } from '../../services/estimateService';

const FlooringCalculator = () => {
    const [formData, setFormData] = useState({
        area_sqft:    '',
        thickness_in: '2'
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCalculate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await estimateService.calculate('pcc_flooring', {
                area_sqft:    Number(formData.area_sqft),
                thickness_in: Number(formData.thickness_in),
            });
            setResult(response.data);
        } catch (_err) {
            setError("Failed to calculate. Please check inputs.");
        } finally {
            setLoading(false);
        }
    };

    const mats      = result?.materials ?? {};
    const cementBags = mats.CEMENT?.qty    ?? 0;
    const sandCft    = mats.SAND?.qty      ?? 0;
    const aggCft     = mats.AGGREGATE?.qty ?? 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">🧊</div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Flooring & PCC</h3>
                    <p className="text-sm text-gray-500 font-medium">Base Layer (Chhipa) & PCC Calculation</p>
                </div>
            </div>

            <form onSubmit={handleCalculate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Flooring Area</label>
                    <div className="relative">
                        <input
                            type="number"
                            name="area_sqft"
                            value={formData.area_sqft}
                            onChange={handleChange}
                            placeholder="Room/Slab Area"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-800"
                            required
                        />
                        <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-bold">SQFT</span>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Thickness</label>
                    <div className="relative">
                        <input
                            type="number"
                            name="thickness_in"
                            value={formData.thickness_in}
                            onChange={handleChange}
                            placeholder="Inches"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-800"
                            required
                        />
                        <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-bold">INCH</span>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-200 active:scale-[0.98] disabled:bg-gray-300 disabled:shadow-none"
                    >
                        {loading ? 'Calculating...' : 'Generate Estimate'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold">
                    ⚠️ {error}
                </div>
            )}

            {result && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white border-2 border-blue-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
                        <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Cement</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-gray-900">{cementBags}</span>
                            <span className="text-sm font-bold text-gray-400">Bags</span>
                        </div>
                    </div>

                    <div className="bg-white border-2 border-amber-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-colors">
                        <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Sand</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-gray-900">{sandCft}</span>
                            <span className="text-sm font-bold text-gray-400">Cft</span>
                        </div>
                    </div>

                    <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-slate-200 transition-colors">
                        <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-1">Gitti (Aggregate)</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-gray-900">{aggCft}</span>
                            <span className="text-sm font-bold text-gray-400">Cft</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlooringCalculator;
