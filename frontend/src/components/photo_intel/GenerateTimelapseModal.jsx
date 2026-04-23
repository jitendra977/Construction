import React, { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { photoIntelService, dashboardService } from '../../services/api';

/**
 * Modal: pick scope + date range, POST /photo-intel/timelapses/generate/.
 * Blocking UX — generation is synchronous on the backend for now.
 */
const GenerateTimelapseModal = ({ onClose, onGenerated }) => {
    const [scope, setScope] = useState('PROJECT');
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
        (async () => {
            try {
                const [r, f, p] = await Promise.all([
                    dashboardService.getRooms(),
                    dashboardService.getFloors(),
                    dashboardService.getPhases(),
                ]);
                setRooms(normalize(r.data));
                setFloors(normalize(f.data));
                setPhases(normalize(p.data));
            } catch (e) {
                console.error(e);
            }
        })();
    }, []);

    const onField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            const payload = {
                scope,
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <form
                onSubmit={submit}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3"
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Generate Timelapse</h3>
                    <button type="button" onClick={onClose}>
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <label className="block text-sm">
                    <span className="font-medium">Scope</span>
                    <select
                        value={scope}
                        onChange={(e) => setScope(e.target.value)}
                        className="mt-1 w-full border rounded px-2 py-1.5"
                    >
                        <option value="PROJECT">Whole Project</option>
                        <option value="FLOOR">Floor</option>
                        <option value="ROOM">Room</option>
                        <option value="PHASE">Phase</option>
                    </select>
                </label>

                {scope === 'ROOM' && (
                    <Picker label="Room" value={form.room} onChange={onField('room')} options={rooms} />
                )}
                {scope === 'FLOOR' && (
                    <Picker label="Floor" value={form.floor} onChange={onField('floor')} options={floors} />
                )}
                {scope === 'PHASE' && (
                    <Picker label="Phase" value={form.phase} onChange={onField('phase')} options={phases} />
                )}

                <div className="grid grid-cols-2 gap-2">
                    <label className="text-sm">
                        <span className="font-medium">From</span>
                        <input
                            type="date"
                            value={form.period_start}
                            onChange={onField('period_start')}
                            className="mt-1 w-full border rounded px-2 py-1.5"
                        />
                    </label>
                    <label className="text-sm">
                        <span className="font-medium">To</span>
                        <input
                            type="date"
                            value={form.period_end}
                            onChange={onField('period_end')}
                            className="mt-1 w-full border rounded px-2 py-1.5"
                        />
                    </label>
                </div>

                <label className="block text-sm">
                    <span className="font-medium">Title (optional)</span>
                    <input
                        type="text"
                        value={form.title}
                        onChange={onField('title')}
                        placeholder="e.g. First floor — April recap"
                        className="mt-1 w-full border rounded px-2 py-1.5"
                    />
                </label>

                {error && <div className="text-xs text-red-600">{error}</div>}

                <div className="flex gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2 border rounded-lg hover:bg-gray-50 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm inline-flex items-center justify-center gap-1 disabled:opacity-60"
                    >
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        Generate
                    </button>
                </div>
            </form>
        </div>
    );
};

const Picker = ({ label, value, onChange, options }) => (
    <label className="block text-sm">
        <span className="font-medium">{label}</span>
        <select value={value} onChange={onChange} className="mt-1 w-full border rounded px-2 py-1.5">
            <option value="">— Select —</option>
            {options.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
            ))}
        </select>
    </label>
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
