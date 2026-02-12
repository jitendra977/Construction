import React, { useState, useEffect } from 'react';
import { X, Delete, RotateCcw, Calculator, ArrowRightLeft } from 'lucide-react';
import UnitConverter from './UnitConverter';

const StandardCalculator = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('CALC');
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');
    const [history, setHistory] = useState([]);

    useEffect(() => {
        if (activeTab !== 'CALC') return;
        const handleKeyDown = (e) => {
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleDigit(e.key);
            } else if (['+', '-', '*', '/'].includes(e.key)) {
                e.preventDefault();
                handleOperator(e.key);
            } else if (e.key === 'Enter' || e.key === '=') {
                e.preventDefault();
                calculate();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handleBackspace();
            } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
                e.preventDefault();
                handleClear();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [display, equation, activeTab]);

    const handleDigit = (digit) => {
        setDisplay(prev => prev === '0' ? digit : prev + digit);
    };

    const handleOperator = (op) => {
        setEquation(display + ' ' + op + ' ');
        setDisplay('0');
    };

    const handleClear = () => {
        setDisplay('0');
        setEquation('');
    };

    const handleBackspace = () => {
        setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    };

    const calculate = () => {
        try {
            const result = new Function(`return ${equation}${display}`)();
            const newEntry = `${equation}${display} = ${result}`;
            setHistory([newEntry, ...history].slice(0, 5));
            setDisplay(String(result));
            setEquation('');
        } catch (e) {
            setDisplay('Error');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden rounded-[24px] transition-all">
            {/* Header Tabs */}
            <div className="flex bg-gray-100/50 border-b border-gray-100 p-1.5 gap-1">
                <button
                    onClick={() => setActiveTab('CALC')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 ${activeTab === 'CALC'
                            ? 'bg-white text-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.15)] border border-emerald-100/50 font-black scale-[1.02]'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-white/50 font-bold'
                        }`}
                >
                    <Calculator size={14} className={activeTab === 'CALC' ? 'animate-pulse' : ''} />
                    <span className="text-[10px] uppercase tracking-widest">Calc</span>
                </button>
                <button
                    onClick={() => setActiveTab('CONVERT')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 ${activeTab === 'CONVERT'
                            ? 'bg-white text-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.15)] border border-emerald-100/50 font-black scale-[1.02]'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-white/50 font-bold'
                        }`}
                >
                    <ArrowRightLeft size={14} className={activeTab === 'CONVERT' ? 'animate-pulse' : ''} />
                    <span className="text-[10px] uppercase tracking-widest">Convert</span>
                </button>
                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all ml-1 active:scale-95"
                >
                    <X size={16} />
                </button>
            </div>

            {activeTab === 'CALC' ? (
                <>
                    {/* Display */}
                    <div className="px-6 py-5 bg-gradient-to-br from-gray-50 to-white flex flex-col items-end justify-center min-h-[110px] gap-1.5 border-b border-gray-100 font-mono relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                            <Calculator size={80} className="text-gray-900" />
                        </div>
                        <div className="text-[11px] font-black text-gray-400 h-4 tracking-tighter uppercase">{equation}</div>
                        <div className="text-4xl font-black text-gray-900 tracking-tighter truncate w-full text-right drop-shadow-sm">
                            {display}
                        </div>
                    </div>

                    {/* Keypad */}
                    <div className="flex-1 p-4 grid grid-cols-4 gap-2.5 bg-white">
                        <button onClick={handleClear} className="col-span-1 bg-red-50 text-red-600 font-black rounded-2xl p-3 text-[11px] hover:bg-red-100 active:scale-95 transition-all border border-red-100/50 shadow-sm uppercase">Clear</button>
                        <button onClick={handleBackspace} className="col-span-1 bg-gray-50 text-gray-600 font-bold rounded-2xl p-3 hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center border border-gray-100 shadow-sm">
                            <Delete size={18} />
                        </button>
                        <button onClick={() => handleOperator('/')} className="col-span-1 bg-emerald-50 text-emerald-600 font-black rounded-2xl p-3 text-lg hover:bg-emerald-100 active:scale-95 transition-all border border-emerald-100 shadow-sm">÷</button>
                        <button onClick={() => handleOperator('*')} className="col-span-1 bg-emerald-50 text-emerald-600 font-black rounded-2xl p-3 text-lg hover:bg-emerald-100 active:scale-95 transition-all border border-emerald-100 shadow-sm">×</button>

                        {[7, 8, 9].map(d => (
                            <button key={d} onClick={() => handleDigit(String(d))} className="bg-white border border-gray-100 text-gray-900 font-black text-xl rounded-2xl p-3 hover:border-emerald-500 hover:shadow-md active:scale-95 transition-all hover:-translate-y-0.5">{d}</button>
                        ))}
                        <button onClick={() => handleOperator('-')} className="bg-emerald-50 text-emerald-600 font-black rounded-2xl p-3 text-lg hover:bg-emerald-100 active:scale-95 transition-all border border-emerald-100 shadow-sm">−</button>

                        {[4, 5, 6].map(d => (
                            <button key={d} onClick={() => handleDigit(String(d))} className="bg-white border border-gray-100 text-gray-900 font-black text-xl rounded-2xl p-3 hover:border-emerald-500 hover:shadow-md active:scale-95 transition-all hover:-translate-y-0.5">{d}</button>
                        ))}
                        <button onClick={() => handleOperator('+')} className="bg-emerald-50 text-emerald-600 font-black rounded-2xl p-3 text-lg hover:bg-emerald-100 active:scale-95 transition-all border border-emerald-100 shadow-sm">+</button>

                        {[1, 2, 3].map(d => (
                            <button key={d} onClick={() => handleDigit(String(d))} className="bg-white border border-gray-100 text-gray-900 font-black text-xl rounded-2xl p-3 hover:border-emerald-500 hover:shadow-md active:scale-95 transition-all hover:-translate-y-0.5">{d}</button>
                        ))}
                        <button onClick={calculate} className="row-span-2 bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-2xl rounded-2xl p-3 hover:shadow-[0_10px_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all border-2 border-emerald-400/50 flex items-center justify-center">=</button>

                        <button onClick={() => handleDigit('0')} className="col-span-2 bg-white border border-gray-100 text-gray-900 font-black text-xl rounded-2xl p-3 hover:border-emerald-500 hover:shadow-md active:scale-95 transition-all hover:-translate-y-0.5">0</button>
                        <button onClick={() => handleDigit('.')} className="bg-white border border-gray-100 text-gray-900 font-black text-xl rounded-2xl p-3 hover:border-emerald-500 hover:shadow-md active:scale-95 transition-all hover:-translate-y-0.5">.</button>
                    </div>

                    {/* History Feed */}
                    {history.length > 0 && (
                        <div className="p-4 bg-gray-50/50 border-t border-gray-100 max-h-36 overflow-y-auto">
                            <div className="flex justify-between items-center mb-2.5">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Calculation Logs</span>
                                <RotateCcw size={10} className="text-gray-300" />
                            </div>
                            <div className="space-y-1.5">
                                {history.map((h, i) => (
                                    <div key={i} className="text-[10px] font-bold text-gray-500 bg-white/50 border border-gray-100 rounded-lg px-2.5 py-2 flex justify-between items-center animate-in slide-in-from-top-1">
                                        <span className="tracking-tight text-gray-400">{h.split('=')[0]}</span>
                                        <span className="text-emerald-700 font-black bg-emerald-50 px-1.5 py-0.5 rounded"> {h.split('=')[1]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <UnitConverter />
            )}
        </div>
    );
};

export default StandardCalculator;
