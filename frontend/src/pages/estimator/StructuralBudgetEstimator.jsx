import React, { useState, useEffect } from 'react';
import { calculatorService } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';
import {
    Calculator,
    Home,
    Layers,
    Info,
    AlertCircle,
    TrendingUp,
    Download,
    Share2,
    Package,
    HardHat,
    Plus,
    Trash2,
    Minus,
    ChevronRight,
    Bath,
    Box,
    Wind,
    RefreshCcw,
    Square,
    DoorOpen
} from 'lucide-react';

const StructuralBudgetEstimator = () => {
    const [floorDetails, setFloorDetails] = useState([
        { id: 1, area: 1000, rooms: 3, bathrooms: 1, toilets: 0, balconies: 1, doors: 4, windows: 5 }
    ]);
    const [inputs, setInputs] = useState({
        finish_quality: 'STANDARD',
        include_mep: true,
        include_finishing: true
    });
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { isCalculatorOpen, toggleCalculator } = useConstruction();

    const handleAddFloor = () => {
        const nextId = floorDetails.length + 1;
        setFloorDetails([...floorDetails, {
            id: nextId,
            area: floorDetails[floorDetails.length - 1].area, // Carry over area
            rooms: 3,
            bathrooms: 1,
            toilets: 0,
            balconies: 1,
            doors: 4,
            windows: 5
        }]);
    };

    const handleRemoveFloor = (id) => {
        if (floorDetails.length === 1) return;
        setFloorDetails(floorDetails.filter(f => f.id !== id));
    };

    const updateFloor = (id, field, value) => {
        setFloorDetails(floorDetails.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const handleCalculate = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await calculatorService.calculateBudget({
                floor_details: floorDetails,
                finish_quality: inputs.finish_quality,
                include_mep: inputs.include_mep,
                include_finishing: inputs.include_finishing
            });
            setResults(response.data);
        } catch (err) {
            console.error('Calculation error:', err);
            setError('Failed to calculate. Please check inputs.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-NP', {
            style: 'currency',
            currency: 'NPR',
            maximumFractionDigits: 0
        }).format(val);
    };

    const materialIcons = {
        cement: <Package className="w-5 h-5 text-emerald-500" />,
        sand: <div className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center text-[10px] text-amber-600 font-bold">S</div>,
        agg: <div className="w-5 h-5 rounded-full bg-slate-400/20 flex items-center justify-center text-[10px] text-slate-600 font-bold">A</div>,
        bricks: <div className="w-5 h-5 text-orange-600 text-lg">🧱</div>,
        rod: <div className="w-5 h-5 text-blue-600">🦾</div>,
        labor: <HardHat className="w-5 h-5 text-yellow-600" />
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Intro */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-2 px-2">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-2xl shadow-md border-b-4 border-slate-700 text-white">💰</div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Full Project Budget</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em]">Advanced Construction Simulation</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={toggleCalculator}
                        className={`flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all group ${isCalculatorOpen
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-600 shadow-sm'
                            }`}
                    >
                        <Calculator size={16} className={`${isCalculatorOpen ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`} />
                        {isCalculatorOpen ? 'Close Calculator' : 'Standard Calculator'}
                    </button>
                </div>
            </div>

            {/* Input Section */}
            <div className="space-y-6">
                {/* Floor Configuration Cards */}
                <div className="grid grid-cols-1 gap-8">
                    {floorDetails.map((floor, index) => (
                        <div key={floor.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 transition-all duration-300 hover:shadow-md group relative overflow-hidden animate-in slide-in-from-right-8">
                            <div className="absolute top-4 right-6 opacity-[0.05] pointer-events-none">
                                <span className="text-8xl font-black text-slate-900 select-none">{index + 1}</span>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 relative z-10">
                                <div className="flex-1 space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                            {index === 0 ? 'G' : index}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg tracking-tight">
                                                {index === 0 ? 'Ground Floor' : `${index}${index === 1 ? 'st' : index === 2 ? 'nd' : index === 3 ? 'rd' : 'th'} Floor Elevation`}
                                            </h4>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Configuration Details</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                        {/* Area Input */}
                                        <div className="col-span-2 md:col-span-1 space-y-1.5">
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1 font-medium">Area (Sq.Ft)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={floor.area}
                                                    onChange={(e) => updateFloor(floor.id, 'area', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-900"
                                                    placeholder="0"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400">SQFT</div>
                                            </div>
                                        </div>
                                        {/* Rooms */}
                                        <div className="space-y-1.5">
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">Rooms</label>
                                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                                                <button onClick={() => updateFloor(floor.id, 'rooms', Math.max(0, floor.rooms - 1))} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-red-500"><Minus size={12} /></button>
                                                <span className="flex-1 text-center font-bold text-slate-900 text-base">{floor.rooms}</span>
                                                <button onClick={() => updateFloor(floor.id, 'rooms', floor.rooms + 1)} className="p-2 bg-slate-900 rounded-lg text-white shadow-sm hover:bg-slate-800 transition-all"><Plus size={12} /></button>
                                            </div>
                                        </div>
                                        {/* Doors */}
                                        <div className="space-y-1.5">
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">Doors</label>
                                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                                                <button onClick={() => updateFloor(floor.id, 'doors', Math.max(0, floor.doors - 1))} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400"><Minus size={12} /></button>
                                                <span className="flex-1 text-center font-bold text-slate-900">{floor.doors}</span>
                                                <button onClick={() => updateFloor(floor.id, 'doors', floor.doors + 1)} className="p-2 hover:bg-white rounded-lg text-slate-500"><Plus size={12} /></button>
                                            </div>
                                        </div>
                                        {/* Windows */}
                                        <div className="space-y-1.5">
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">Windows</label>
                                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                                                <button onClick={() => updateFloor(floor.id, 'windows', Math.max(0, floor.windows - 1))} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400"><Minus size={12} /></button>
                                                <span className="flex-1 text-center font-bold text-slate-900">{floor.windows}</span>
                                                <button onClick={() => updateFloor(floor.id, 'windows', floor.windows + 1)} className="p-2 hover:bg-white rounded-lg text-slate-500"><Plus size={12} /></button>
                                            </div>
                                        </div>
                                        {/* Bathrooms */}
                                        <div className="space-y-1.5">
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">Bath/WC</label>
                                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                                                <button onClick={() => updateFloor(floor.id, 'bathrooms', Math.max(0, floor.bathrooms - 1))} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400"><Minus size={12} /></button>
                                                <span className="flex-1 text-center font-bold text-slate-900">{floor.bathrooms}</span>
                                                <button onClick={() => updateFloor(floor.id, 'bathrooms', floor.bathrooms + 1)} className="p-2 bg-emerald-600 rounded-lg text-white shadow-sm hover:bg-emerald-700 transition-all"><Plus size={12} /></button>
                                            </div>
                                        </div>
                                        {/* Toilets */}
                                        <div className="space-y-1.5">
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">Toilets</label>
                                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                                                <button onClick={() => updateFloor(floor.id, 'toilets', Math.max(0, floor.toilets - 1))} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400"><Minus size={12} /></button>
                                                <span className="flex-1 text-center font-bold text-slate-900">{floor.toilets}</span>
                                                <button onClick={() => updateFloor(floor.id, 'toilets', floor.toilets + 1)} className="p-2 hover:bg-white rounded-lg text-slate-500 shadow-sm"><Plus size={12} /></button>
                                            </div>
                                        </div>
                                        {/* Balcony */}
                                        <div className="space-y-1.5">
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">Balcony</label>
                                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                                                <button onClick={() => updateFloor(floor.id, 'balconies', Math.max(0, floor.balconies - 1))} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400"><Minus size={12} /></button>
                                                <span className="flex-1 text-center font-bold text-slate-900">{floor.balconies}</span>
                                                <button onClick={() => updateFloor(floor.id, 'balconies', floor.balconies + 1)} className="p-2 hover:bg-white rounded-lg text-slate-500 shadow-sm"><Plus size={12} /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {floorDetails.length > 1 && (
                                    <button
                                        onClick={() => handleRemoveFloor(floor.id)}
                                        className="p-5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-[24px] transition-all self-start md:self-center mt-4 md:mt-0 hover:rotate-12"
                                        title="Remove floor elevation"
                                    >
                                        <Trash2 size={24} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleAddFloor}
                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all flex items-center justify-center gap-3 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="font-bold uppercase tracking-wider text-[10px]">Add Floor Elevation</span>
                    </button>
                </div>

                {/* Global Settings Card */}
                <div className="bg-gray-900 rounded-[32px] p-8 shadow-xl text-white">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Material & Finish Quality</label>
                                <div className="flex bg-white/10 p-1 rounded-xl border border-white/10">
                                    {['ECONOMY', 'STANDARD', 'LUXURY'].map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => setInputs({ ...inputs, finish_quality: q })}
                                            className={`flex-1 py-2.5 text-[9px] font-bold rounded-lg transition-all ${inputs.finish_quality === q ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <div className={`w-12 h-7 rounded-full p-1 transition-all ${inputs.include_mep ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${inputs.include_mep ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                    <input type="checkbox" className="hidden" checked={inputs.include_mep} onChange={(e) => setInputs({ ...inputs, include_mep: e.target.checked })} />
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-100 opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">MEP 🚿</span>
                                </label>
                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <div className={`w-12 h-7 rounded-full p-1 transition-all ${inputs.include_finishing ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${inputs.include_finishing ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                    <input type="checkbox" className="hidden" checked={inputs.include_finishing} onChange={(e) => setInputs({ ...inputs, include_finishing: e.target.checked })} />
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-100 opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">Finish 🎨</span>
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={handleCalculate}
                            disabled={loading}
                            className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center gap-2 hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-md"
                        >
                            {loading ? (
                                <RefreshCcw size={14} className="animate-spin" />
                            ) : (
                                <TrendingUp size={14} />
                            )}
                            Initialize Estimation
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-6 bg-red-50 border-2 border-red-100 rounded-[28px] flex items-center gap-4 text-red-600 font-bold animate-shake">
                    <AlertCircle size={24} /> {error}
                </div>
            )}

            {/* Results Section */}
            {results && (
                <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <TrendingUp className="text-white w-20 h-20" />
                            </div>
                            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mb-1.5">Total Project Estimate</p>
                            <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(results.totals.all)}</p>
                        </div>

                        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mb-1.5">Civil & Structure</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-xl font-bold text-slate-900 tracking-tight">{results.summary.rooms}</p>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bedrooms</span>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mb-1.5">Estimated Duration</p>
                            <p className="text-xl font-bold text-emerald-600 tracking-tight">{results.summary.duration_months} <span className="text-xs font-medium text-slate-400">Months</span></p>
                        </div>
                        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mb-1.5">Project Standards</p>
                            <p className="text-xl font-bold text-slate-900 tracking-tight">{results.summary.quality}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Cost Distribution */}
                        <div className="lg:col-span-1 bg-gray-50 rounded-[40px] border-2 border-gray-100 p-10 flex flex-col justify-between">
                            <h4 className="text-xs font-black text-gray-400 mb-8 uppercase tracking-[0.3em] flex items-center justify-between border-b border-gray-200 pb-4">
                                Cost Distribution
                                <TrendingUp size={16} className="text-emerald-600" />
                            </h4>
                            <div className="space-y-8">
                                {[
                                    { label: 'Civil/Structural', value: results.totals.structure, color: 'bg-emerald-500', icon: '🏗️' },
                                    { label: 'MEP (Utility)', value: results.totals.mep, color: 'bg-blue-500', icon: '🚰' },
                                    { label: 'Interior/Finish', value: results.totals.finishing, color: 'bg-teal-500', icon: '🎨' }
                                ].map((cat, i) => (
                                    <div key={i} className="group cursor-default">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl transform group-hover:scale-125 transition-transform">{cat.icon}</span>
                                                <span className="text-gray-600 font-black text-[10px] uppercase tracking-tight">{cat.label}</span>
                                            </div>
                                            <span className="text-gray-900 font-black text-xs tracking-tight">{formatCurrency(cat.value)}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                                            <div
                                                className={`${cat.color} h-full rounded-full transition-all duration-1000`}
                                                style={{ width: `${(cat.value / results.totals.all) * 100}%` }}
                                            />
                                        </div>
                                        <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase tracking-widest">{Math.round((cat.value / results.totals.all) * 100)}% Contribution</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Material Quantities */}
                        <div className="lg:col-span-2 bg-white rounded-[40px] p-10 shadow-lg border border-gray-100 relative overflow-hidden group">
                            <h4 className="text-xs font-black text-gray-900 mb-10 flex items-center gap-4 uppercase tracking-[0.3em]">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <Layers className="text-emerald-600" size={20} />
                                </div>
                                Essential Materials
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[
                                    { label: 'Cement', qty: results.quantities.cement_bags, unit: 'Bags', icon: materialIcons.cement },
                                    { label: 'Steel Rod', qty: results.quantities.rod_kg, unit: 'Kg', icon: materialIcons.rod },
                                    { label: 'Sand', qty: results.quantities.sand_cft, unit: 'Cft', icon: materialIcons.sand },
                                    { label: 'Aggregate', qty: results.quantities.agg_cft, unit: 'Cft', icon: materialIcons.agg },
                                    { label: 'Bricks', qty: results.quantities.bricks, unit: 'Pcs', icon: materialIcons.bricks },
                                    { label: 'Doors', qty: results.summary.doors, unit: 'Pcs', icon: <DoorOpen className="w-5 h-5 text-slate-500" /> },
                                    { label: 'Windows', qty: results.summary.windows, unit: 'Pcs', icon: <Square className="w-5 h-5 text-slate-500" /> },
                                    { label: 'Built Area', qty: results.summary.total_area_sqft, unit: 'Sq.Ft', icon: <Home className="w-5 h-5 text-emerald-600" /> }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-6 p-6 border border-gray-50 rounded-3xl hover:bg-emerald-50/50 hover:border-emerald-100 transition-all group/item">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center shadow-inner border border-white">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{item.label}</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-black text-gray-900 tracking-tighter">{item.qty?.toLocaleString()}</span>
                                                <span className="text-gray-400 text-xs font-black uppercase tracking-tighter">{item.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Simulation Note & Actions */}
                    <div className="flex flex-col xl:flex-row gap-8">
                        <div className="bg-amber-50 border-2 border-amber-100 p-8 rounded-[40px] flex-1 flex gap-6 items-center">
                            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                                <Info className="text-amber-600" size={28} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-amber-800/70 leading-relaxed font-bold tracking-tight">
                                    <span className="text-amber-600 font-black uppercase mr-2 tracking-widest">Enhanced Simulation Engine:</span>
                                    This estimate integrates per-floor configurations for rooms, bathrooms, and balconies.
                                    Costs for MEP (Mechanical, Electrical, Plumbing) and Finishing are dynamically adjusted
                                    based on these counts. Total Rooms: {results.summary.rooms}, Doors: {results.summary.doors}, Windows: {results.summary.windows}.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 shrink-0 h-28">
                            <button className="flex-1 xl:w-48 bg-gray-900 hover:bg-emerald-600 text-white rounded-[32px] flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-xl">
                                <Download size={22} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Download PDF</span>
                            </button>
                            <button className="flex-1 xl:w-48 bg-white border-2 border-gray-100 text-gray-600 rounded-[32px] flex flex-col items-center justify-center gap-2 transition-all active:scale-95">
                                <Share2 size={22} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Share Report</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StructuralBudgetEstimator;
