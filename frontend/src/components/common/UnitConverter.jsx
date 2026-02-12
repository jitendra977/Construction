import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Ruler, Square, Weight, Box } from 'lucide-react';

const UnitConverter = () => {
    const [category, setCategory] = useState('LENGTH');
    const [fromVal, setFromVal] = useState('1');
    const [toVal, setToVal] = useState('');
    const [fromUnit, setFromUnit] = useState('FEET');
    const [toUnit, setToUnit] = useState('METER');

    const conversionData = {
        LENGTH: {
            units: ['FEET', 'METER', 'INCH', 'GAJ', 'HAATH'],
            rates: {
                FEET: 1,
                METER: 3.28084,
                INCH: 0.0833333,
                GAJ: 3, // 1 Gaj = 3 Feet
                HAATH: 1.5 // 1 Haath = 1.5 Feet approx
            },
            icon: <Ruler size={14} />
        },
        AREA: {
            units: ['SQFT', 'SQMT', 'ROANI', 'AANA', 'PAISA', 'DAAM', 'BIGHA', 'KATTHA', 'DHUR'],
            rates: {
                SQFT: 1,
                SQMT: 10.7639,
                AANA: 342.25,
                ROANI: 5476, // 16 Aana
                PAISA: 85.56, // 1/4 Aana
                DAAM: 21.39, // 1/4 Paisa
                BIGHA: 72900,
                KATTHA: 3645,
                DHUR: 182.25
            },
            icon: <Square size={14} />
        },
        WEIGHT: {
            units: ['KG', 'QUINTAL', 'TON', 'POUND'],
            rates: {
                KG: 1,
                QUINTAL: 100,
                TON: 1000,
                POUND: 0.453592
            },
            icon: <Weight size={14} />
        },
        VOLUME: {
            units: ['CFT', 'M3', 'LITER'],
            rates: {
                CFT: 1,
                M3: 35.3147,
                LITER: 0.0353147
            },
            icon: <Box size={14} />
        }
    };

    useEffect(() => {
        convert(fromVal, fromUnit, toUnit);
    }, [fromVal, fromUnit, toUnit, category]);

    const convert = (val, fUnit, tUnit) => {
        if (!val || isNaN(val)) {
            setToVal('');
            return;
        }
        const rates = conversionData[category].rates;
        const result = (val * rates[fUnit]) / rates[tUnit];
        setToVal(result.toFixed(4).replace(/\.?0+$/, ""));
    };

    const swapUnits = () => {
        const temp = fromUnit;
        setFromUnit(toUnit);
        setToUnit(temp);
    };

    return (
        <div className="flex flex-col h-full bg-white p-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Category Selector */}
            <div className="grid grid-cols-4 gap-2.5">
                {Object.keys(conversionData).map(cat => (
                    <button
                        key={cat}
                        onClick={() => {
                            setCategory(cat);
                            setFromUnit(conversionData[cat].units[0]);
                            setToUnit(conversionData[cat].units[1]);
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all duration-300 ${category === cat
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-400 text-white shadow-[0_10px_20px_rgba(16,185,129,0.2)] scale-[1.05] z-10'
                            : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50/30'
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${category === cat ? 'bg-white/20' : 'bg-gray-50'}`}>
                            {conversionData[cat].icon}
                        </div>
                        <span className="text-[9px] font-black uppercase mt-1.5 tracking-tighter">{cat}</span>
                    </button>
                ))}
            </div>

            {/* Conversion Interface */}
            <div className="space-y-5 flex-1 mt-2">
                {/* From Area */}
                <div className="space-y-2.5 relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Input Value</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={fromVal}
                            onChange={(e) => setFromVal(e.target.value)}
                            className="flex-1 h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl p-3.5 font-black text-gray-900 focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-sm"
                            placeholder="0.00"
                        />
                        <select
                            value={fromUnit}
                            onChange={(e) => setFromUnit(e.target.value)}
                            className="w-[100px] h-14 shrink-0 bg-white border-2 border-gray-100 rounded-2xl px-3 font-bold text-gray-700 text-[11px] focus:border-emerald-500 outline-none shadow-sm cursor-pointer hover:border-gray-300 transition-all appearance-none"
                        >
                            {conversionData[category].units.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Swap Divider */}
                <div className="flex justify-center -my-3 relative z-10">
                    <button
                        onClick={swapUnits}
                        className="group w-10 h-10 bg-white border-2 border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:scale-110 hover:shadow-lg hover:border-emerald-500 active:scale-95 transition-all"
                    >
                        <ArrowRightLeft size={16} className="rotate-90 group-hover:rotate-[270deg] transition-all duration-500" />
                    </button>
                </div>

                {/* To Area */}
                <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Converted Result</label>
                    <div className="flex gap-2">
                        <div className="flex-1 h-14 bg-emerald-50 border-2 border-emerald-100/50 rounded-2xl p-3.5 font-black text-emerald-800 flex items-center shadow-inner overflow-hidden">
                            <span className="truncate">{toVal || '0'}</span>
                        </div>
                        <select
                            value={toUnit}
                            onChange={(e) => setToUnit(e.target.value)}
                            className="w-[100px] h-14 shrink-0 bg-white border-2 border-gray-100 rounded-2xl px-3 font-bold text-gray-700 text-[11px] focus:border-emerald-500 outline-none shadow-sm cursor-pointer hover:border-gray-300 transition-all appearance-none"
                        >
                            {conversionData[category].units.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Quick Reference Notes */}
            <div className="mt-auto p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-100/50 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
                    <Box size={80} className="text-amber-900" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[10px] text-amber-900 font-black uppercase tracking-widest">Local Standards</span>
                    </div>
                    <p className="text-[10px] text-amber-800/80 font-bold leading-relaxed">
                        1 Ropani = 16 Aana = 5476 Sq.Ft<br />
                        1 Bigha = 20 Kattha = 72900 Sq.Ft
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UnitConverter;
