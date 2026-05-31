import React, { useState } from 'react';
import { estimateService } from '../../services/estimateService';

const ConcreteCalculator = () => {
    const [formData, setFormData] = useState({
        length_ft: '',
        width_ft: '',
        depth_in: '',
        grade: 'M20',
        structure: 'SLAB',
        include_rebar: true
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleCalculate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await estimateService.calculate('concrete', {
                length_ft:    Number(formData.length_ft),
                width_ft:     Number(formData.width_ft),
                depth_in:     Number(formData.depth_in),
                grade:        formData.grade,
                structure:    formData.structure,
                include_rebar: formData.include_rebar,
            });
            setResult(response.data);
        } catch (_err) {
            setError("Failed to calculate. Please check inputs.");
        } finally {
            setLoading(false);
        }
    };

    const structureIcons = {
        'SLAB': '🏢',
        'BEAM': '📏',
        'COLUMN': '🏛️',
        'FOOTING': '🧱'
    };

    const mats      = result?.materials ?? {};
    const cementBags = mats.CEMENT?.qty    ?? 0;
    const sandCft    = mats.SAND?.qty      ?? 0;
    const aggCft     = mats.AGGREGATE?.qty ?? 0;
    const rebarKg    = mats.REBAR?.qty     ?? 0;
    const volumeM3   = result?.summary?.volume_m3 ?? 0;
    const areaSqft   = result?.summary?.area_sqft  ?? 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">🏗️</div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Concrete & Rebar</h3>
                    <p className="text-sm text-gray-500 font-medium">Calculate Dhalan materials for Slabs, Beams, and Columns</p>
                </div>
            </div>

            <form onSubmit={handleCalculate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Length</label>
                        <div className="relative">
                            <input
                                type="number"
                                name="length_ft"
                                value={formData.length_ft}
                                onChange={handleChange}
                                placeholder="Feet"
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-gray-800"
                                required
                            />
                            <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-bold">FT</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Width</label>
                        <div className="relative">
                            <input
                                type="number"
                                name="width_ft"
                                value={formData.width_ft}
                                onChange={handleChange}
                                placeholder="Feet"
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-gray-800"
                                required
                            />
                            <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-bold">FT</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Depth</label>
                        <div className="relative">
                            <input
                                type="number"
                                name="depth_in"
                                value={formData.depth_in}
                                onChange={handleChange}
                                placeholder="Inches"
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-gray-800"
                                required
                            />
                            <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-bold">IN</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Structure Type</label>
                        <select
                            name="structure"
                            value={formData.structure}
                            onChange={handleChange}
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-gray-800 appearance-none"
                        >
                            <option value="SLAB">Slab (Dhalan)</option>
                            <option value="BEAM">Beam (Beam)</option>
                            <option value="COLUMN">Column (Khamba)</option>
                            <option value="FOOTING">Footing (Foundations)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Concrete Grade</label>
                        <select
                            name="grade"
                            value={formData.grade}
                            onChange={handleChange}
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-gray-800 appearance-none"
                        >
                            <option value="M20">M20 (1:1.5:3) - Standard House</option>
                            <option value="M15">M15 (1:2:4) - Base PCC</option>
                            <option value="M25">M25 (1:1:2) - Heavy Structure</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <input
                        type="checkbox"
                        name="include_rebar"
                        checked={formData.include_rebar}
                        onChange={handleChange}
                        className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <div>
                        <label className="text-sm font-black text-emerald-900 uppercase tracking-wider">Include Rebar (Rod) Estimation</label>
                        <p className="text-[10px] text-emerald-600 font-bold">Automatically calculates approximate KG based on standard reinforcement ratios.</p>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] disabled:bg-gray-300 disabled:shadow-none"
                >
                    {loading ? 'Processing Physics...' : 'Calculate Concrete & Steel'}
                </button>
            </form>

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold">
                    ⚠️ {error}
                </div>
            )}

            {result && (
                <div className="mt-10 p-8 border-2 border-blue-500/20 rounded-[32px] bg-blue-50/10 animate-in slide-in-from-bottom-6 duration-700">
                    <div className="flex justify-between items-center mb-8">
                        <h4 className="text-sm font-black text-blue-900 uppercase tracking-[0.2em]">Material Breakdown</h4>
                        <div className="px-4 py-1.5 bg-white rounded-full border border-blue-100 shadow-sm text-[10px] font-black text-blue-600 uppercase tracking-widest">
                            {formData.structure} | {volumeM3} m³
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Cement</span>
                            <span className="text-2xl font-black text-gray-900">{cementBags}</span>
                            <span className="text-[10px] font-bold text-gray-400">Bags</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-amber-600">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Sand</span>
                            <span className="text-2xl font-black">{sandCft}</span>
                            <span className="text-[10px] font-bold text-gray-400">Cft</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-slate-700">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Gitti</span>
                            <span className="text-2xl font-black">{aggCft}</span>
                            <span className="text-[10px] font-bold text-gray-400">Cft</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-500/30 flex flex-col items-center text-blue-700 scale-105 shadow-md">
                            <span className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Steel Rod</span>
                            <span className="text-2xl font-black">{rebarKg}</span>
                            <span className="text-[10px] font-bold text-blue-400">KG</span>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between px-4">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-100 shadow-sm">{structureIcons[formData.structure]}</span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Area: {areaSqft} sq.ft</p>
                        </div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-blue-100">Mix: {formData.grade}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConcreteCalculator;
