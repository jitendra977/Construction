import React, { useState, useEffect } from 'react';
import { calculatorService } from '../../services/api';
import {
    Database,
    Save,
    TrendingUp,
    RefreshCcw,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    HardHat,
    Package,
    Settings
} from 'lucide-react';

const DataTab = () => {
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [editValues, setEditValues] = useState({});

    useEffect(() => {
        fetchRates();
    }, []);

    const fetchRates = async () => {
        setLoading(true);
        try {
            const response = await calculatorService.getRates();
            setRates(response.data);

            // Initialize edit values
            const initialEditValues = {};
            response.data.forEach(rate => {
                initialEditValues[rate.id] = rate.value;
            });
            setEditValues(initialEditValues);
        } catch (err) {
            setError("Failed to load market rates.");
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (id, newValue) => {
        setEditValues({
            ...editValues,
            [id]: newValue
        });
        // Clear success message when user starts editing
        if (success) setSuccess(null);
    };

    const handleSave = async (id) => {
        setSaving(id);
        setError(null);
        try {
            await calculatorService.updateRate(id, { value: editValues[id] });
            setSuccess(`Updated successfully!`);
            // Refresh local rates to ensure UI is in sync
            fetchRates();
        } catch (err) {
            setError("Failed to save rate. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const getIcon = (category) => {
        switch (category) {
            case 'MATERIAL': return <Package className="w-5 h-5 text-emerald-600" />;
            case 'LABOR': return <HardHat className="w-5 h-5 text-amber-600" />;
            default: return <Settings className="w-5 h-5 text-blue-600" />;
        }
    };

    if (loading && rates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Accessing Market Database...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20 border-2 border-blue-400 text-white">
                        <Database size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Market Rates Configuration</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Manage Material & Labor Prices (NPR)</p>
                    </div>
                </div>
                <button
                    onClick={fetchRates}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                    <RefreshCcw size={16} /> Sync Latest
                </button>
            </div>

            {/* Notification Area */}
            {error && (
                <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-shake">
                    <AlertCircle size={20} /> {error}
                </div>
            )}
            {success && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm font-bold animate-in slide-in-from-top-2">
                    <CheckCircle2 size={20} /> {success}
                </div>
            )}

            {/* Rates Table / Grid */}
            <div className="bg-white border-2 border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Item / Description</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Market Rate (NPR)</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {rates.map((rate) => (
                            <tr key={rate.id} className="group hover:bg-blue-50/30 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 group-hover:bg-white group-hover:border-blue-200 transition-all">
                                            {getIcon(rate.category)}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 tracking-tight">{rate.label}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">per {rate.unit}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="relative w-48">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Rs.</span>
                                        <input
                                            type="number"
                                            value={editValues[rate.id] || ''}
                                            onChange={(e) => handleValueChange(rate.id, e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all font-black text-gray-800"
                                        />
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <button
                                        onClick={() => handleSave(rate.id)}
                                        disabled={saving === rate.id || editValues[rate.id] === rate.value}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${saving === rate.id
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : editValues[rate.id] === rate.value
                                                    ? 'bg-transparent text-gray-300 cursor-default'
                                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100 scale-105 active:scale-95'
                                            }`}
                                    >
                                        {saving === rate.id ? (
                                            <RefreshCcw size={14} className="animate-spin" />
                                        ) : (
                                            <Save size={14} />
                                        )}
                                        Update
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 border-2 border-blue-100 p-8 rounded-[32px] flex flex-col md:flex-row items-center gap-6">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                    <TrendingUp className="text-blue-600" size={24} />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-blue-800/70 leading-relaxed font-bold">
                        <span className="text-blue-600 font-black uppercase mr-2 tracking-widest">Dynamic Engine Status:</span>
                        Any changes made here will be applied **instantly** to all "Full Budget" simulations.
                        Historical data remains unchanged. Ensure rates are verified with local suppliers
                        (e.g., in Tulsipur or Kathmandu) before finalizing contracts.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DataTab;
