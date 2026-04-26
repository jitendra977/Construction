import React, { useState } from 'react';
import structureApi from '../../services/structureApi';
import { useStructure } from '../../context/StructureContext';

const FIELD = 'w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors';
const STYLE = { background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text)' };

const ROOM_TYPES = [
    ['BEDROOM','🛏️ Bedroom / सुत्ने कोठा'], ['KITCHEN','🍳 Kitchen / भान्सा'],
    ['BATHROOM','🚿 Bathroom / शौचालय'],    ['LIVING','🛋️ Living Room / बैठककोठा'],
    ['DINING','🍽️ Dining / खाने कोठा'],     ['OFFICE','💼 Office / कार्यालय'],
    ['STORE','📦 Store / भण्डार'],           ['STAIRCASE','🪜 Staircase / सिँढी'],
    ['TERRACE','🌿 Terrace / छत'],           ['BALCONY','🌸 Balcony / बरन्डा'],
    ['PUJA','🪔 Puja Room / पूजाकोठा'],      ['GARAGE','🚗 Garage / गाडी राख्ने'],
    ['LAUNDRY','👕 Laundry / धुलाईकोठा'],    ['HALL','🏛️ Hall / हल'],
    ['OTHER','🏠 Other / अन्य'],
];

const FLOOR_FINISHES = [
    ['','— Not set —'],['TILE','Tile / टाइल'],['MARBLE','Marble / मार्बल'],
    ['GRANITE','Granite / ग्रेनाइट'],['WOOD','Wood / काठ'],
    ['CEMENT','Cement / सिमेन्ट'],['STONE','Stone / ढुङ्गा'],['OTHER','Other / अन्य'],
];

const WALL_FINISHES = [
    ['','— Not set —'],['PAINT','Paint / रङ'],['PLASTER','Plaster / लिपाइ'],
    ['TILE','Tile / टाइल'],['STONE','Stone / ढुङ्गा'],['OTHER','Other / अन्य'],
];

const Label = ({ children }) => (
    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--t-text3)' }}>{children}</label>
);
const Sec = ({ children }) => (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--t-text3)' }}>{children}</span>
        <div className="flex-1 h-px" style={{ background: 'var(--t-border)' }} />
    </div>
);

const TABS = [
    { id: 'basic',    label: '📋 Basic' },
    { id: 'dims',     label: '📐 Dimensions' },
    { id: 'finish',   label: '🎨 Finishes' },
    { id: 'mep',      label: '⚡ MEP' },
    { id: 'schedule', label: '📅 Schedule' },
];

export default function RoomForm({ onClose, editRoom = null, defaultFloorId = null }) {
    const { floors, addRoomLocal, updateRoomLocal } = useStructure();
    const isEdit = !!editRoom;
    const [tab, setTab] = useState('basic');

    const [form, setForm] = useState({
        // basic
        name:              editRoom?.name              || '',
        floor:             editRoom?.floor             || defaultFloorId || '',
        room_type:         editRoom?.room_type         || 'OTHER',
        status:            editRoom?.status            || 'NOT_STARTED',
        // dimensions
        width_cm:          editRoom?.width_cm          || '',
        depth_cm:          editRoom?.depth_cm          || '',
        ceiling_height_cm: editRoom?.ceiling_height_cm ?? 315,
        pos_x:             editRoom?.pos_x             ?? 0,
        pos_y:             editRoom?.pos_y             ?? 0,
        // finishes
        floor_finish:      editRoom?.floor_finish      || '',
        wall_finish:       editRoom?.wall_finish       || '',
        color_scheme:      editRoom?.color_scheme      || '',
        // openings
        window_count:      editRoom?.window_count      ?? 1,
        door_count:        editRoom?.door_count        ?? 1,
        // MEP
        electrical_points: editRoom?.electrical_points ?? 0,
        light_points:      editRoom?.light_points      ?? 0,
        fan_points:        editRoom?.fan_points        ?? 0,
        ac_provision:      editRoom?.ac_provision      ?? false,
        plumbing_points:   editRoom?.plumbing_points   ?? 0,
        // schedule
        priority:          editRoom?.priority          || 'MEDIUM',
        completion_date:   editRoom?.completion_date   || '',
        budget_allocation: editRoom?.budget_allocation || '',
        // notes
        notes:             editRoom?.notes             || '',
    });

    const [saving, setSaving] = useState(false);
    const [err, setErr]       = useState('');

    const c = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setErr('Room name is required.'); return; }
        if (!form.floor)       { setErr('Please select a floor.'); return; }
        setSaving(true); setErr('');
        try {
            const w = +form.width_cm || 0, d = +form.depth_cm || 0;
            const payload = {
                name:              form.name.trim(),
                floor:             form.floor,
                room_type:         form.room_type,
                status:            form.status,
                width_cm:          w || null,
                depth_cm:          d || null,
                ceiling_height_cm: +form.ceiling_height_cm || null,
                pos_x:             +form.pos_x || 0,
                pos_y:             +form.pos_y || 0,
                area_sqft:         w && d ? +(w * d / 929.03).toFixed(2) : null,
                floor_finish:      form.floor_finish  || '',
                wall_finish:       form.wall_finish   || '',
                color_scheme:      form.color_scheme  || '',
                window_count:      +form.window_count  || 0,
                door_count:        +form.door_count    || 1,
                electrical_points: +form.electrical_points || 0,
                light_points:      +form.light_points  || 0,
                fan_points:        +form.fan_points    || 0,
                ac_provision:      !!form.ac_provision,
                plumbing_points:   +form.plumbing_points || 0,
                priority:          form.priority || 'MEDIUM',
                completion_date:   form.completion_date || null,
                budget_allocation: +form.budget_allocation || 0,
                notes:             form.notes.trim(),
            };
            if (isEdit) {
                const res = await structureApi.updateRoom(editRoom.id, payload);
                updateRoomLocal(editRoom.id, res.data);
            } else {
                const res = await structureApi.createRoom(payload);
                addRoomLocal(res.data);
            }
            onClose();
        } catch (ex) {
            console.error(ex);
            setErr('Save failed. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const w = +form.width_cm, d = +form.depth_cm;
    const areaSqft = w && d ? +(w * d / 929.03).toFixed(1) : null;

    return (
        <form onSubmit={submit} style={{ minWidth: 520, maxWidth: 600 }}>

            {/* Tab bar */}
            <div className="flex border-b" style={{ borderColor: 'var(--t-border)', background: 'var(--t-bg)' }}>
                {TABS.map(t => (
                    <button key={t.id} type="button" onClick={() => setTab(t.id)}
                        className="flex-1 py-2.5 text-[11px] font-bold transition-colors whitespace-nowrap"
                        style={{
                            color: tab === t.id ? '#f97316' : 'var(--t-text3)',
                            borderBottom: tab === t.id ? '2px solid #f97316' : '2px solid transparent',
                            background: 'transparent',
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {err && (
                <div className="mx-5 mt-4 px-3 py-2 rounded-lg text-sm text-red-600 bg-red-50 border border-red-200">{err}</div>
            )}

            {/* ── Tab: Basic ── */}
            {tab === 'basic' && (
                <div className="p-5 space-y-3">
                    <div>
                        <Label>Room Name *</Label>
                        <input className={FIELD} style={STYLE}
                            value={form.name} onChange={e => c('name', e.target.value)}
                            placeholder="e.g. Master Bedroom / ठूलो सुत्ने कोठा" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Floor *</Label>
                            <select className={FIELD} style={STYLE}
                                value={form.floor} onChange={e => c('floor', e.target.value)}>
                                <option value="">— Select Floor —</option>
                                {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label>Room Type</Label>
                            <select className={FIELD} style={STYLE}
                                value={form.room_type} onChange={e => c('room_type', e.target.value)}>
                                {ROOM_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <Label>Status</Label>
                        <select className={FIELD} style={STYLE}
                            value={form.status} onChange={e => c('status', e.target.value)}>
                            <option value="NOT_STARTED">⬜ Not Started / सुरु भएन</option>
                            <option value="IN_PROGRESS">🔵 In Progress / काम जारी</option>
                            <option value="COMPLETED">✅ Completed / सकियो</option>
                        </select>
                    </div>
                    <div>
                        <Label>Budget Allocation (NPR)</Label>
                        <input type="number" className={FIELD} style={STYLE}
                            value={form.budget_allocation}
                            onChange={e => c('budget_allocation', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                        <Label>Notes / टिप्पणी</Label>
                        <textarea className={FIELD} style={{ ...STYLE, resize: 'vertical' }} rows={3}
                            value={form.notes} onChange={e => c('notes', e.target.value)}
                            placeholder="Additional remarks…" />
                    </div>
                </div>
            )}

            {/* ── Tab: Dimensions ── */}
            {tab === 'dims' && (
                <div className="p-5 space-y-4">
                    <Sec>Size</Sec>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label>Width (cm)</Label>
                            <input type="number" className={FIELD} style={STYLE}
                                value={form.width_cm} onChange={e => c('width_cm', e.target.value)} placeholder="400" />
                        </div>
                        <div>
                            <Label>Depth (cm)</Label>
                            <input type="number" className={FIELD} style={STYLE}
                                value={form.depth_cm} onChange={e => c('depth_cm', e.target.value)} placeholder="300" />
                        </div>
                        <div>
                            <Label>Ceiling (cm)</Label>
                            <input type="number" className={FIELD} style={STYLE}
                                value={form.ceiling_height_cm}
                                onChange={e => c('ceiling_height_cm', e.target.value)} placeholder="315" />
                        </div>
                    </div>

                    {areaSqft && (
                        <div className="rounded-lg p-3 text-center"
                            style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.2)' }}>
                            <p className="text-lg font-black" style={{ color: '#ea580c' }}>{areaSqft} ft²</p>
                            <p className="text-xs" style={{ color: 'var(--t-text3)' }}>
                                {(w * d / 10000).toFixed(2)} m²  ·  {w} × {d} cm
                                {form.ceiling_height_cm ? `  ·  H: ${form.ceiling_height_cm} cm` : ''}
                            </p>
                        </div>
                    )}

                    <Sec>Position on floor plan</Sec>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Pos X (cm from left)</Label>
                            <input type="number" className={FIELD} style={STYLE}
                                value={form.pos_x} onChange={e => c('pos_x', e.target.value)} placeholder="0" />
                        </div>
                        <div>
                            <Label>Pos Y (cm from top)</Label>
                            <input type="number" className={FIELD} style={STYLE}
                                value={form.pos_y} onChange={e => c('pos_y', e.target.value)} placeholder="0" />
                        </div>
                    </div>

                    <Sec>Openings</Sec>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>🚪 Door Count</Label>
                            <input type="number" min="0" className={FIELD} style={STYLE}
                                value={form.door_count} onChange={e => c('door_count', e.target.value)} />
                        </div>
                        <div>
                            <Label>🪟 Window Count</Label>
                            <input type="number" min="0" className={FIELD} style={STYLE}
                                value={form.window_count} onChange={e => c('window_count', e.target.value)} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab: Finishes ── */}
            {tab === 'finish' && (
                <div className="p-5 space-y-4">
                    <Sec>Floor & Wall</Sec>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>🪵 Floor Finish</Label>
                            <select className={FIELD} style={STYLE}
                                value={form.floor_finish} onChange={e => c('floor_finish', e.target.value)}>
                                {FLOOR_FINISHES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label>🧱 Wall Finish</Label>
                            <select className={FIELD} style={STYLE}
                                value={form.wall_finish} onChange={e => c('wall_finish', e.target.value)}>
                                {WALL_FINISHES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                    </div>

                    <Sec>Paint Color</Sec>
                    <div>
                        <Label>🎨 Color Scheme</Label>
                        <input className={FIELD} style={STYLE}
                            value={form.color_scheme} onChange={e => c('color_scheme', e.target.value)}
                            placeholder="e.g. Off-White, Cream Yellow, #F5F0E8" />
                        {form.color_scheme && (
                            <div className="flex items-center gap-2 mt-2">
                                {/^#[0-9A-Fa-f]{3,6}$/.test(form.color_scheme.trim()) && (
                                    <div className="w-8 h-8 rounded-lg border"
                                        style={{
                                            background: form.color_scheme.trim(),
                                            borderColor: 'var(--t-border)'
                                        }} />
                                )}
                                <p className="text-xs" style={{ color: 'var(--t-text3)' }}>{form.color_scheme}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab: MEP ── */}
            {tab === 'mep' && (
                <div className="p-5 space-y-4">
                    <Sec>Electrical Points</Sec>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label>⚡ Switch/Socket</Label>
                            <input type="number" min="0" className={FIELD} style={STYLE}
                                value={form.electrical_points}
                                onChange={e => c('electrical_points', e.target.value)} />
                        </div>
                        <div>
                            <Label>💡 Light Points</Label>
                            <input type="number" min="0" className={FIELD} style={STYLE}
                                value={form.light_points}
                                onChange={e => c('light_points', e.target.value)} />
                        </div>
                        <div>
                            <Label>🌀 Fan Points</Label>
                            <input type="number" min="0" className={FIELD} style={STYLE}
                                value={form.fan_points}
                                onChange={e => c('fan_points', e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <Label>❄️ AC Provision</Label>
                        <div className="flex items-center gap-3 mt-1">
                            <button type="button"
                                onClick={() => c('ac_provision', !form.ac_provision)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
                                style={{
                                    background: form.ac_provision ? 'rgba(59,130,246,0.1)' : 'var(--t-surface)',
                                    borderColor: form.ac_provision ? '#3b82f6' : 'var(--t-border)',
                                    color: form.ac_provision ? '#3b82f6' : 'var(--t-text3)',
                                }}>
                                {form.ac_provision ? '✅ AC Provision Included' : '☐ No AC Provision'}
                            </button>
                        </div>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--t-text3)' }}>
                            Conduit sleeve + outdoor bracket for split AC unit
                        </p>
                    </div>

                    <Sec>Plumbing</Sec>
                    <div>
                        <Label>🚿 Plumbing Points (supply + drain)</Label>
                        <input type="number" min="0" className={FIELD} style={STYLE}
                            value={form.plumbing_points}
                            onChange={e => c('plumbing_points', e.target.value)} />
                        <p className="text-[10px] mt-1" style={{ color: 'var(--t-text3)' }}>
                            Count each water inlet or drain outlet point separately
                        </p>
                    </div>

                    {/* MEP summary */}
                    {(+form.electrical_points + +form.light_points + +form.fan_points + +form.plumbing_points > 0 || form.ac_provision) && (
                        <div className="rounded-lg p-3 space-y-1"
                            style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--t-text3)' }}>
                                MEP Summary
                            </p>
                            {[
                                ['⚡', 'Switch/Socket', form.electrical_points],
                                ['💡', 'Light',         form.light_points],
                                ['🌀', 'Fan',           form.fan_points],
                                ['🚿', 'Plumbing',      form.plumbing_points],
                            ].filter(([, , n]) => +n > 0).map(([icon, label, n]) => (
                                <div key={label} className="flex justify-between text-xs">
                                    <span style={{ color: 'var(--t-text3)' }}>{icon} {label}</span>
                                    <span className="font-bold" style={{ color: 'var(--t-text)' }}>{n} pts</span>
                                </div>
                            ))}
                            {form.ac_provision && (
                                <div className="flex justify-between text-xs">
                                    <span style={{ color: 'var(--t-text3)' }}>❄️ AC</span>
                                    <span className="font-bold text-blue-500">Yes</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Schedule ── */}
            {tab === 'schedule' && (
                <div className="p-5 space-y-4">
                    <Sec>Priority & Timeline</Sec>
                    <div>
                        <Label>Priority / प्राथमिकता</Label>
                        <div className="flex gap-2 mt-1">
                            {[['HIGH','🔴 High'],['MEDIUM','🟡 Medium'],['LOW','🟢 Low']].map(([v, l]) => (
                                <button key={v} type="button"
                                    onClick={() => c('priority', v)}
                                    className="flex-1 py-2 rounded-lg text-xs font-bold border transition-all"
                                    style={{
                                        background: form.priority === v
                                            ? v === 'HIGH' ? 'rgba(239,68,68,0.1)'
                                            : v === 'MEDIUM' ? 'rgba(234,179,8,0.1)'
                                            : 'rgba(34,197,94,0.1)' : 'var(--t-surface)',
                                        borderColor: form.priority === v
                                            ? v === 'HIGH' ? '#ef4444'
                                            : v === 'MEDIUM' ? '#eab308'
                                            : '#22c55e' : 'var(--t-border)',
                                        color: form.priority === v
                                            ? v === 'HIGH' ? '#ef4444'
                                            : v === 'MEDIUM' ? '#ca8a04'
                                            : '#16a34a' : 'var(--t-text3)',
                                    }}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label>🗓️ Target Completion Date</Label>
                        <input type="date" className={FIELD} style={STYLE}
                            value={form.completion_date}
                            onChange={e => c('completion_date', e.target.value)} />
                    </div>

                    <Sec>Cost</Sec>
                    <div>
                        <Label>💰 Budget Allocation (NPR)</Label>
                        <input type="number" className={FIELD} style={STYLE}
                            value={form.budget_allocation}
                            onChange={e => c('budget_allocation', e.target.value)} placeholder="0" />
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--t-border)' }}>
                <button type="button" onClick={onClose}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                    style={{ color: 'var(--t-text3)', borderColor: 'var(--t-border)' }}>
                    Cancel
                </button>
                <button type="submit" disabled={saving}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ background: saving ? '#9ca3af' : '#ea580c' }}>
                    {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Room'}
                </button>
            </div>
        </form>
    );
}
