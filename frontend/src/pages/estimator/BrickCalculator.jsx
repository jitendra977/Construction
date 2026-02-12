import React, { useState } from 'react';
import { calculatorService } from '../../services/api';

const BrickCalculator = () => {
    const [formData, setFormData] = useState({
        length: '',
        height: '',
        thickness: '9_INCH',
        ratio: '1:6'
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
            const response = await calculatorService.calculateWall(formData);
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
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl">🧱</div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Wall & Brickwork</h3>
                    <p className="text-sm text-gray-500 font-medium">Calculate bricks, cement, and sand for masonry (Garo)</p>
                </div>
            </div>

            <form onSubmit={handleCalculate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Wall Length</label>
                        <div className="relative">
                            <input
                                type="number"
                                name="length"
                                value={formData.length}
                                onChange={handleChange}
                                placeholder="Total Length"
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-gray-800"
                                required
                            />
                            <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-bold">FT</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Wall Height</label>
                        <div className="relative">
                            <input
                                type="number"
                                name="height"
                                value={formData.height}
                                onChange={handleChange}
                                placeholder="Total Height"
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-gray-800"
                                required
                            />
                            <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-bold">FT</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Wall Thickness</label>
                        <select
                            name="thickness"
                            value={formData.thickness}
                            onChange={handleChange}
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-gray-800 appearance-none"
                        >
                            <option value="9_INCH">9 inch (External Wall)</option>
                            <option value="4_INCH">4.5 inch (Partition Wall)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Cement:Sand Ratio</label>
                        <select
                            name="ratio"
                            value={formData.ratio}
                            onChange={handleChange}
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-gray-800 appearance-none"
                        >
                            <option value="1:6">1:6 (Standard)</option>
                            <option value="1:5">1:5 (Medium)</option>
                            <option value="1:4">1:4 (Strong)</option>
                        </select>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] disabled:bg-gray-300 disabled:shadow-none"
                >
                    {loading ? 'Processing...' : 'Calculate Materials'}
                </button>
            </form>

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold animate-shake">
                    ⚠️ {error}
                </div>
            )}

            {result && (
                <div className="mt-10 p-8 border-2 border-emerald-500/20 rounded-[32px] bg-emerald-50/10 animate-in slide-in-from-bottom-6 duration-700">
                    <h4 className="text-sm font-black text-emerald-900 uppercase tracking-[0.2em] mb-6 text-center">Estimation Result</h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center group hover:border-red-200 transition-colors">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Bricks (Eeta)</p>
                            <p className="text-3xl font-black text-red-600 tracking-tighter">{result.bricks.toLocaleString()}</p>
                            <p className="text-xs font-bold text-gray-400 mt-1">Pieces</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center group hover:border-emerald-200 transition-colors">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cement (Jhula)</p>
                            <p className="text-3xl font-black text-gray-900 tracking-tighter">{result.cement_bags}</p>
                            <p className="text-xs font-bold text-gray-400 mt-1">Bags (50kg)</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center group hover:border-amber-200 transition-colors">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sand (Baluwa)</p>
                            <p className="text-3xl font-black text-amber-600 tracking-tighter">{result.sand_cft}</p>
                            <p className="text-xs font-bold text-gray-400 mt-1">Cubic Feet (Cft)</p>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between px-4">
                        <p className="text-[10px] font-bold text-gray-400">Wall Area: {result.wall_area_sqft} sq.ft</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Standards: NS 2.30m x 1.10m Brick</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrickCalculator;
