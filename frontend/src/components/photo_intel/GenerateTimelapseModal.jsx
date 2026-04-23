import React, { useEffect, useState } from 'react';
import { X, Loader2, Plus, RefreshCw } from 'lucide-react';
import { photoIntelService } from '../../services/api';
import { useConstruction } from '../../context/ConstructionContext';

/**
 * Modal: pick scope + date range, POST /photo-intel/timelapses/generate/.
 * Blocking UX — generation is synchronous on the backend for now.
 */
const GenerateTimelapseModal = ({ onClose, onGenerated }) => {
    const [scope, setScope] = useState('PROJECT');
    const { activeProjectId, dashboardData } = useConstruction();
    const [rooms, setRooms] = useState([]);
    const [floors, setFloors] = useState([]);
    const [phases, setPhases] = useState([]);
    const [form, setForm] = useState({
        room: '',
        floor: '',
        phase: '',
        title: '',
        period_start: defaultStart(),
        period_end: todayStr(),
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setRooms(normalize(dashboardData.rooms));
        setFloors(normalize(dashboardData.floors));
        setPhases(normalize(dashboardData.phases));
    }, [dashboardData]);

    const onField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            const payload = {
                scope,
                project: Number(activeProjectId),
                period_start: form.period_start,
                period_end: form.period_end,
                title: form.title || undefined,
                room: scope === 'ROOM' ? Number(form.room) : undefined,
                floor: scope === 'FLOOR' ? Number(form.floor) : undefined,
                phase: scope === 'PHASE' ? Number(form.phase) : undefined,
            };
            await photoIntelService.generateTimelapse(payload);
            onGenerated?.();
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Generation failed');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0d1117]/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            
            <form
                onSubmit={submit}
                className="relative bg-[var(--t-surface)] rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-500 border border-[var(--t-border)]"
            >
                {/* ── Modal Header ── */}
                <div className="px-8 py-8 border-b border-[var(--t-border)] bg-gradient-to-r from-blue-600/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-[var(--t-text)] tracking-tight">Generate New Sequence</h3>
                            <p className="text-[var(--t-text3)] text-sm font-medium">Create a custom timelapse from your site data.</p>
                        </div>
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-[var(--t-surface2)] border border-[var(--t-border)] flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-none">
                    {/* ── Scope Selection ── */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t-text3)]">Project Scope</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { id: 'PROJECT', label: 'Global', icon: '🏗️' },
                                { id: 'PHASE', label: 'Phase', icon: '📅' },
                                { id: 'FLOOR', label: 'Floor', icon: '🏢' },
                                { id: 'ROOM', label: 'Room', icon: '🚪' },
                            ].map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setScope(s.id)}
                                    className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border transition-all ${
                                        scope === s.id
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105'
                                            : 'bg-[var(--t-surface2)] border-[var(--t-border)] text-[var(--t-text3)] hover:border-blue-400'
                                    }`}
                                >
                                    <span className="text-2xl">{s.icon}</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider">{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Specific Selectors ── */}
                    <div className="space-y-6">
                        {scope === 'ROOM' && (
                            <Picker label="Select Specific Room" value={form.room} onChange={onField('room')} options={rooms} />
                        )}
                        {scope === 'FLOOR' && (
                            <Picker label="Select Specific Floor" value={form.floor} onChange={onField('floor')} options={floors} />
                        )}
                        {scope === 'PHASE' && (
                            <Picker label="Select Construction Phase" value={form.phase} onChange={onField('phase')} options={phases} />
                        )}

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t-text3)]">From Date</label>
                                <input
                                    type="date"
                                    value={form.period_start}
                                    onChange={onField('period_start')}
                                    className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t-text3)]">To Date</label>
                                <input
                                    type="date"
                                    value={form.period_end}
                                    onChange={onField('period_end')}
                                    className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t-text3)]">Sequence Title (Optional)</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={onField('title')}
                                placeholder="e.g. Ground Floor Foundation Recap"
                                className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
                            <Loader2 className="w-4 h-4" />
                            <p className="text-[11px] font-bold uppercase tracking-wider">{error}</p>
                        </div>
                    )}
                </div>

                {/* ── Modal Footer ── */}
                <div className="p-8 border-t border-[var(--t-border)] flex gap-4 bg-[var(--t-surface2)]/30">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)] hover:text-[var(--t-text)] transition-colors"
                    >
                        Dismiss
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/25 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {busy ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                Generate Sequence
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

const Picker = ({ label, value, onChange, options }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t-text3)]">{label}</label>
        <select 
            value={value} 
            onChange={onChange} 
            className="w-full bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer"
        >
            <option value="">— Choose Item —</option>
            {options.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
            ))}
        </select>
    </div>
);

function todayStr() { return new Date().toISOString().slice(0, 10); }
function defaultStart() {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
}
function normalize(data) {
    if (Array.isArray(data)) return data;
    return data?.results || [];
}

export default GenerateTimelapseModal;
