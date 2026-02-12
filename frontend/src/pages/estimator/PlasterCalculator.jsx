import React, { useState } from 'react';
import { calculatorService } from '../../services/api';

const PlasterCalculator = () => {
    const [formData, setFormData] = useState({
        area: '',
        thickness: '12',
        ratio: '1:4'
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
            const response = await calculatorService.calculatePlaster(formData);
            setResult(response.data);
        } catch (err) {
            setError("Failed to calculate. Please check inputs.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">🪄</div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Plaster Estimation</h3>
                    <p className="text-sm text-gray-500 font-medium">Internal & External Wall Plaster (Baluwa-Cement Mix)</p>
                </div>
            </div>

            <form onSubmit={handleCalculate} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Wall/Ceiling Area</label>
                    <div className="relative">
                        <input
                            type="number"
                            name="area"
                            value={formData.area}
                            onChange={handleChange}
                            placeholder="Total Sq.Ft"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-gray-800"
                            required
                        />
                        <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-bold">SQFT</span>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Thickness</label>
                    <select
                        name="thickness"
                        value={formData.thickness}
                        onChange={handleChange}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-gray-800 appearance-none"
                    >
                        <option value="12">12 mm (Internal Wall)</option>
                        <option value="15">15 mm (Ceiling)</option>
                        <option value="20">20 mm (External Wall)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">C:S Ratio</label>
                    <select
                        name="ratio"
                        value={formData.ratio}
                        onChange={handleChange}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-gray-800 appearance-none"
                    >
                        <option value="1:4">1:4 (Standard)</option>
                        <option value="1:3">1:3 (Rich Mix)</option>
                        <option value="1:6">1:6 (Partition)</option>
                    </select>
                </div>

                <div className="md:col-span-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] disabled:bg-gray-300 disabled:shadow-none"
                    >
                        {loading ? 'Calculating...' : 'Generate Estimate'}
                    </button>
                </div>
            </form>

            {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white border-2 border-emerald-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors">
                        <div className="absolute top-0 right-0 p-4 text-emerald-50 opacity-20 group-hover:opacity-40 transition-opacity">
                            <span className="text-6xl font-black">C</span>
                        </div>
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Cement Required</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-gray-900">{result.cement_bags}</span>
                            <span className="text-lg font-bold text-gray-400">Bags</span>
                        </div>
                    </div>

                    <div className="bg-white border-2 border-amber-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-colors">
                        <div className="absolute top-0 right-0 p-4 text-amber-50 opacity-20 group-hover:opacity-40 transition-opacity">
                            <span className="text-6xl font-black">S</span>
                        </div>
                        <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Sand (Baluwa)</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-gray-900">{result.sand_cft}</span>
                            <span className="text-lg font-bold text-gray-400">Cft</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlasterCalculator;
