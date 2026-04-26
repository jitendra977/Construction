/**
 * FloorPlanCanvas
 * ─────────────────────────────────────────────────────────────────────────────
 * SVG interactive 2-D floor plan editor.
 *
 * Fixes vs v1:
 *  - rectToPoly: first point was { x } (missing y) → NaN polygon → rooms invisible
 *  - Event listeners: used stable ref pattern so mouseup is never missed during drag
 *  - Drag: position tracked in a ref during move, committed to state only on mouseup
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import structureApi from '../../services/structureApi';
import { useStructure } from '../../context/StructureContext';

/* ── Geometry helpers ────────────────────────────────────────────────────── */
const SNAP = 10;
const snap = (v) => Math.round(v / SNAP) * SNAP;

const polyArea = (pts) => {
    if (!pts || pts.length < 3) return 0;
    let a = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
        a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    return Math.abs(a) / 2;
};

const polyCentroid = (pts) => {
    if (!pts || !pts.length) return { x: 0, y: 0 };
    return {
        x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
        y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
};

// BUG FIX: first point was `{ x }` (y missing → NaN). Must be `{ x, y }`.
const rectToPoly = (room) => {
    const x = room.pos_x ?? 0, y = room.pos_y ?? 0,
        w = room.width_cm  || 200, h = room.depth_cm || 200;
    return [
        { x,     y     },   // top-left
        { x: x + w, y  },   // top-right
        { x: x + w, y: y + h }, // bottom-right
        { x,     y: y + h }, // bottom-left
    ];
};

const SHAPE_PRESETS = {
    L: (r) => {
        const x = r.pos_x ?? 0, y = r.pos_y ?? 0,
              w = r.width_cm || 300, h = r.depth_cm || 300;
        return [
            { x, y }, { x: x + w, y },
            { x: x + w, y: y + Math.round(h * .45) },
            { x: x + Math.round(w * .55), y: y + Math.round(h * .45) },
            { x: x + Math.round(w * .55), y: y + h },
            { x, y: y + h },
        ];
    },
    U: (r) => {
        const x = r.pos_x ?? 0, y = r.pos_y ?? 0,
              w = r.width_cm || 400, h = r.depth_cm || 300,
              t = Math.round(w * .28), mid = Math.round(h * .55);
        return [
            { x, y }, { x: x + w, y }, { x: x + w, y: y + h },
            { x: x + w - t, y: y + h }, { x: x + w - t, y: y + mid },
            { x: x + t, y: y + mid }, { x: x + t, y: y + h },
            { x, y: y + h },
        ];
    },
    T: (r) => {
        const x = r.pos_x ?? 0, y = r.pos_y ?? 0,
              w = r.width_cm || 400, h = r.depth_cm || 300,
              arm = Math.round(w * .3), top = Math.round(h * .38),
              cx = Math.round(w / 2);
        return [
            { x, y }, { x: x + w, y }, { x: x + w, y: y + top },
            { x: x + cx + arm, y: y + top }, { x: x + cx + arm, y: y + h },
            { x: x + cx - arm, y: y + h }, { x: x + cx - arm, y: y + top },
            { x, y: y + top },
        ];
    },
};

const STATUS_STYLE = {
    NOT_STARTED: { fill: 'rgba(241,245,249,0.9)', stroke: '#94a3b8' },
    IN_PROGRESS:  { fill: 'rgba(219,234,254,0.9)', stroke: '#3b82f6' },
    COMPLETED:    { fill: 'rgba(209,250,229,0.9)', stroke: '#10b981' },
};

const roomIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('bed') || n.includes('master') || n.includes('कोठा')) return '🛏️';
    if (n.includes('kitchen') || n.includes('भान्सा') || n.includes('भन्सा') || n.includes('dining')) return '🍳';
    if (n.includes('toilet') || n.includes('bath') || n.includes('t/b') || n.includes('शौचालय')) return '🚿';
    if (n.includes('living') || n.includes('बैठक')) return '🛋️';
    if (n.includes('puja') || n.includes('पूजा')) return '🪔';
    if (n.includes('terrace') || n.includes('छत')) return '🌿';
    if (n.includes('store') || n.includes('भण्डार')) return '📦';
    if (n.includes('stair') || n.includes('सिँढी')) return '🪜';
    if (n.includes('garage')) return '🚗';
    if (n.includes('laundry') || n.includes('धुलाई')) return '👕';
    if (n.includes('hall') || n.includes('हल')) return '🏛️';
    if (n.includes('office') || n.includes('अफिस')) return '💼';
    return '🏠';
};

const getPts = (room) =>
    room.polygon_points && room.polygon_points.length >= 3
        ? room.polygon_points
        : rectToPoly(room);

const ROOM_TYPE_OPTS = [
    ['BEDROOM','🛏️ Bedroom'],['KITCHEN','🍳 Kitchen'],['BATHROOM','🚿 Bathroom'],
    ['LIVING','🛋️ Living'],['DINING','🍽️ Dining'],['OFFICE','💼 Office'],
    ['STORE','📦 Store'],['STAIRCASE','🪜 Staircase'],['TERRACE','🌿 Terrace'],
    ['BALCONY','🌸 Balcony'],['PUJA','🪔 Puja Room'],['GARAGE','🚗 Garage'],
    ['LAUNDRY','👕 Laundry'],['HALL','🏛️ Hall'],['OTHER','🏠 Other'],
];
const FLOOR_FINISH_OPTS = [['','—'],['TILE','Tile'],['MARBLE','Marble'],['GRANITE','Granite'],['WOOD','Wood'],['CEMENT','Cement'],['STONE','Stone'],['OTHER','Other']];
const WALL_FINISH_OPTS  = [['','—'],['PAINT','Paint'],['PLASTER','Plaster'],['TILE','Tile'],['STONE','Stone'],['OTHER','Other']];

/* ── Room Inspector Panel ────────────────────────────────────────────────── */
function RoomInspector({ room, floorColor, onClose, onDelete, onRoomSaved }) {
    const [form, setForm] = useState({
        name:              room.name || '',
        room_type:         room.room_type || 'OTHER',
        status:            room.status || 'NOT_STARTED',
        width_cm:          room.width_cm  || '',
        depth_cm:          room.depth_cm  || '',
        ceiling_height_cm: room.ceiling_height_cm || 315,
        pos_x:             room.pos_x  ?? 0,
        pos_y:             room.pos_y  ?? 0,
        floor_finish:      room.floor_finish || '',
        wall_finish:       room.wall_finish  || '',
        color_scheme:      room.color_scheme || '',
        window_count:      room.window_count ?? 0,
        door_count:        room.door_count   ?? 1,
        budget_allocation: room.budget_allocation || '',
        notes:             room.notes || '',
        polygon_points:    room.polygon_points || null,
        // MEP
        electrical_points: room.electrical_points ?? 0,
        light_points:      room.light_points      ?? 0,
        fan_points:        room.fan_points         ?? 0,
        ac_provision:      room.ac_provision       ?? false,
        plumbing_points:   room.plumbing_points    ?? 0,
        // Schedule
        priority:          room.priority          || 'MEDIUM',
        completion_date:   room.completion_date   || '',
    });
    const [saving, setSaving]   = useState(false);
    const [flash, setFlash]     = useState(false);
    const [deleting, setDel]    = useState(false);
    const [tab, setTab]         = useState('dims'); // 'dims' | 'finish' | 'mep' | 'schedule' | 'notes'
    const timerRef = useRef(null);

    // sync position when dragged on canvas
    useEffect(() => {
        setForm(f => ({
            ...f,
            pos_x:          room.pos_x     ?? f.pos_x,
            pos_y:          room.pos_y     ?? f.pos_y,
            width_cm:       room.width_cm  ?? f.width_cm,
            depth_cm:       room.depth_cm  ?? f.depth_cm,
            polygon_points: room.polygon_points !== undefined ? room.polygon_points : f.polygon_points,
        }));
    }, [room.pos_x, room.pos_y, room.width_cm, room.depth_cm, room.polygon_points]);

    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [onClose]);

    const save = useCallback((data) => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            setSaving(true);
            try {
                const w = +data.width_cm || 0, d = +data.depth_cm || 0;
                const payload = {
                    ...data,
                    width_cm:          w || null,
                    depth_cm:          d || null,
                    ceiling_height_cm: +data.ceiling_height_cm || null,
                    pos_x:             +data.pos_x || 0,
                    pos_y:             +data.pos_y || 0,
                    area_sqft:         data.polygon_points
                        ? +(polyArea(data.polygon_points) / 929.03).toFixed(2)
                        : (w && d ? +(w * d / 929.03).toFixed(2) : null),
                    budget_allocation: +data.budget_allocation || 0,
                    window_count:      +data.window_count || 0,
                    door_count:        +data.door_count || 1,
                    // MEP
                    electrical_points: +data.electrical_points || 0,
                    light_points:      +data.light_points      || 0,
                    fan_points:        +data.fan_points         || 0,
                    ac_provision:      !!data.ac_provision,
                    plumbing_points:   +data.plumbing_points   || 0,
                    // Schedule
                    priority:          data.priority || 'MEDIUM',
                    completion_date:   data.completion_date || null,
                    color_scheme:      data.color_scheme || '',
                };
                await structureApi.updateRoom(room.id, payload);
                onRoomSaved?.({ ...room, ...payload });
                setFlash(true);
                setTimeout(() => setFlash(false), 1200);
            } catch (e) { console.error('Save failed', e); }
            finally { setSaving(false); }
        }, 600);
    }, [room, onRoomSaved]);

    const change = (k, v) => {
        const next = { ...form, [k]: v };
        setForm(next);
        save(next);
    };

    const applyShape = (key) => {
        const pts = key === 'rect'
            ? null
            : SHAPE_PRESETS[key]?.({
                pos_x: +form.pos_x || 0, pos_y: +form.pos_y || 0,
                width_cm: +form.width_cm || 300, depth_cm: +form.depth_cm || 300,
              }) ?? null;
        change('polygon_points', pts);
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete room "${room.name}"?`)) return;
        setDel(true);
        try { await structureApi.deleteRoom(room.id); onDelete(room.id); }
        catch (e) { console.error(e); setDel(false); }
    };

    const pts      = form.polygon_points;
    const isPoly   = pts && pts.length >= 3;
    const W = +form.width_cm || 0, D = +form.depth_cm || 0;
    const areaCm2  = isPoly ? polyArea(pts) : W * D;
    const areaSqft = (areaCm2 / 929.03).toFixed(1);
    const areaM2   = (areaCm2 / 10000).toFixed(2);

    // mini preview
    const PRV = 160, PAD = 20;
    const usePts = isPoly ? pts : (W && D ? rectToPoly({ pos_x: 0, pos_y: 0, width_cm: W, depth_cm: D }) : null);
    let previewPts = null;
    if (usePts) {
        const xs = usePts.map(p => p.x), ys = usePts.map(p => p.y);
        const minX = Math.min(...xs), minY = Math.min(...ys),
              bw = Math.max(...xs) - minX || 1, bh = Math.max(...ys) - minY || 1;
        const sc = Math.min((PRV - PAD * 2) / bw, (PRV - PAD * 2) / bh);
        const ox = (PRV - bw * sc) / 2 - minX * sc, oy = (PRV - bh * sc) / 2 - minY * sc;
        previewPts = usePts.map(p => ({ x: ox + p.x * sc, y: oy + p.y * sc }));
    }
    const pvStr  = previewPts ? previewPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') : '';
    const pvCtr  = previewPts ? polyCentroid(previewPts) : { x: PRV / 2, y: PRV / 2 };

    const iStyle = {
        background: 'transparent', border: '1px solid var(--t-border)', borderRadius: 6,
        fontSize: 11, fontWeight: 600, color: 'var(--t-text)',
        padding: '3px 8px', width: '100%', outline: 'none',
    };

    const Lbl = ({ children }) => (
        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--t-text3)' }}>
            {children}
        </p>
    );

    return (
        <div className="flex flex-col overflow-y-auto shrink-0"
            style={{ width: 280, background: 'var(--t-surface)', borderLeft: '1px solid var(--t-border)' }}>

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 shrink-0"
                style={{ borderBottom: '1px solid var(--t-border)', borderLeft: `3px solid ${floorColor}` }}>
                <span className="text-xl">
                    {ROOM_TYPE_OPTS.find(([v]) => v === form.room_type)?.[1]?.split(' ')[0] || roomIcon(form.name)}
                </span>
                <input value={form.name} onChange={e => change('name', e.target.value)}
                    className="flex-1 font-bold text-sm bg-transparent outline-none"
                    style={{ color: 'var(--t-text)' }} placeholder="Room name…" />
                <button onClick={onClose} className="text-lg leading-none opacity-40 hover:opacity-80">×</button>
            </div>

            {/* Room type + status */}
            <div className="px-4 py-2 space-y-2 shrink-0" style={{ borderBottom: '1px solid var(--t-border)' }}>
                <div>
                    <Lbl>Type</Lbl>
                    <select value={form.room_type} onChange={e => change('room_type', e.target.value)} style={iStyle}>
                        {ROOM_TYPE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>
                <div>
                    <Lbl>Status</Lbl>
                    <select value={form.status} onChange={e => change('status', e.target.value)} style={iStyle}>
                        <option value="NOT_STARTED">⬜ Not Started</option>
                        <option value="IN_PROGRESS">🔵 In Progress</option>
                        <option value="COMPLETED">✅ Completed</option>
                    </select>
                </div>
            </div>

            {/* Mini preview + area */}
            {previewPts && (
                <div className="px-4 py-2 shrink-0 flex items-center gap-3"
                    style={{ borderBottom: '1px solid var(--t-border)' }}>
                    <svg width={PRV} height={PRV} style={{ borderRadius: 6, background: '#f8fafc', flexShrink: 0 }}>
                        <polygon points={pvStr}
                            fill={STATUS_STYLE[form.status]?.fill || '#f1f5f9'}
                            stroke={floorColor} strokeWidth={2} />
                        <text x={pvCtr.x} y={pvCtr.y} textAnchor="middle"
                            dominantBaseline="middle" fontSize={10} fill="#374151" fontWeight={600}>
                            {+areaSqft > 0 ? `${areaSqft} ft²` : ''}
                        </text>
                    </svg>
                    <div className="text-xs space-y-1">
                        {+areaSqft > 0 && <>
                            <p className="font-bold" style={{ color: '#f97316' }}>{areaSqft} ft²</p>
                            <p style={{ color: 'var(--t-text3)' }}>{areaM2} m²</p>
                        </>}
                        {form.ceiling_height_cm && (
                            <p style={{ color: 'var(--t-text3)' }}>H: {form.ceiling_height_cm} cm</p>
                        )}
                        <p style={{ color: 'var(--t-text3)' }}>🚪{form.door_count} 🪟{form.window_count}</p>
                    </div>
                </div>
            )}

            {/* Sub-tabs */}
            <div className="flex shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid var(--t-border)' }}>
                {[['dims','📐'],['finish','🎨'],['mep','⚡'],['schedule','📅'],['notes','💬']].map(([id, lbl]) => (
                    <button key={id} onClick={() => setTab(id)}
                        className="flex-1 py-2 text-[10px] font-bold transition-colors whitespace-nowrap"
                        style={{
                            color: tab === id ? '#f97316' : 'var(--t-text3)',
                            borderBottom: tab === id ? '2px solid #f97316' : '2px solid transparent',
                            background: 'transparent',
                            minWidth: 40,
                        }}>
                        {lbl}
                    </button>
                ))}
            </div>

            {/* Tab: Dimensions */}
            {tab === 'dims' && (
                <div className="px-4 py-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        {[['W','width_cm'],['D','depth_cm'],['X','pos_x'],['Y','pos_y']].map(([lbl, k]) => (
                            <label key={k} className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black w-4 shrink-0" style={{ color: '#f97316' }}>{lbl}</span>
                                <input type="number" value={form[k]}
                                    onChange={e => change(k, e.target.value)} style={iStyle} />
                            </label>
                        ))}
                    </div>
                    <label className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black shrink-0" style={{ color: '#f97316', width: 48 }}>Ceiling</span>
                        <input type="number" value={form.ceiling_height_cm}
                            onChange={e => change('ceiling_height_cm', e.target.value)} style={iStyle} placeholder="315" />
                        <span className="text-[9px] shrink-0" style={{ color: 'var(--t-text3)' }}>cm</span>
                    </label>

                    {/* Shape presets */}
                    <div>
                        <Lbl>Shape</Lbl>
                        <div className="flex gap-1.5">
                            {['rect', 'L', 'U', 'T'].map(k => (
                                <button key={k} onClick={() => applyShape(k)}
                                    className="flex-1 py-1.5 rounded text-xs font-bold border transition-colors"
                                    style={{
                                        borderColor: (!isPoly && k === 'rect') ? '#f97316' : 'var(--t-border)',
                                        color: (!isPoly && k === 'rect') ? '#f97316' : 'var(--t-text)',
                                        background: 'var(--t-surface)',
                                    }}>
                                    {k === 'rect' ? '▭' : k}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Budget */}
                    <div>
                        <Lbl>Budget (NPR)</Lbl>
                        <input type="number" value={form.budget_allocation}
                            onChange={e => change('budget_allocation', e.target.value)}
                            style={iStyle} placeholder="0" />
                    </div>
                </div>
            )}

            {/* Tab: Finishes */}
            {tab === 'finish' && (
                <div className="px-4 py-3 space-y-3">
                    <div>
                        <Lbl>🪵 Floor Finish</Lbl>
                        <select value={form.floor_finish} onChange={e => change('floor_finish', e.target.value)} style={iStyle}>
                            {FLOOR_FINISH_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <Lbl>🎨 Wall Finish</Lbl>
                        <select value={form.wall_finish} onChange={e => change('wall_finish', e.target.value)} style={iStyle}>
                            {WALL_FINISH_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <Lbl>🖌 Color Scheme</Lbl>
                        <div className="flex items-center gap-2">
                            <input value={form.color_scheme} onChange={e => change('color_scheme', e.target.value)}
                                style={{ ...iStyle, flex: 1 }} placeholder="e.g. #F5F5DC or Cream White" />
                            {/^#[0-9a-fA-F]{3,6}$/.test((form.color_scheme || '').trim()) && (
                                <span style={{
                                    width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                                    background: form.color_scheme.trim(),
                                    border: '1px solid var(--t-border)',
                                }} />
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Lbl>🚪 Doors</Lbl>
                            <input type="number" min="0" value={form.door_count}
                                onChange={e => change('door_count', e.target.value)} style={iStyle} />
                        </div>
                        <div>
                            <Lbl>🪟 Windows</Lbl>
                            <input type="number" min="0" value={form.window_count}
                                onChange={e => change('window_count', e.target.value)} style={iStyle} />
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: MEP */}
            {tab === 'mep' && (
                <div className="px-4 py-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Lbl>⚡ Electrical Pts</Lbl>
                            <input type="number" min="0" value={form.electrical_points}
                                onChange={e => change('electrical_points', e.target.value)} style={iStyle} />
                        </div>
                        <div>
                            <Lbl>💡 Light Pts</Lbl>
                            <input type="number" min="0" value={form.light_points}
                                onChange={e => change('light_points', e.target.value)} style={iStyle} />
                        </div>
                        <div>
                            <Lbl>🌀 Fan Pts</Lbl>
                            <input type="number" min="0" value={form.fan_points}
                                onChange={e => change('fan_points', e.target.value)} style={iStyle} />
                        </div>
                        <div>
                            <Lbl>🔧 Plumbing Pts</Lbl>
                            <input type="number" min="0" value={form.plumbing_points}
                                onChange={e => change('plumbing_points', e.target.value)} style={iStyle} />
                        </div>
                    </div>

                    {/* AC Provision toggle */}
                    <button
                        onClick={() => change('ac_provision', !form.ac_provision)}
                        className="w-full py-2 rounded-lg text-xs font-bold transition-colors"
                        style={{
                            background: form.ac_provision ? 'rgba(59,130,246,0.15)' : 'var(--t-bg)',
                            color:      form.ac_provision ? '#3b82f6' : 'var(--t-text3)',
                            border:     `1px solid ${form.ac_provision ? '#3b82f6' : 'var(--t-border)'}`,
                        }}>
                        ❄️ AC Provision — {form.ac_provision ? 'Yes (Enabled)' : 'No (Disabled)'}
                    </button>

                    {/* Summary card */}
                    {(form.electrical_points > 0 || form.light_points > 0 || form.fan_points > 0
                        || form.ac_provision || form.plumbing_points > 0) && (
                        <div className="rounded-lg p-2.5 space-y-1.5"
                            style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--t-text3)' }}>
                                MEP Summary
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {form.electrical_points > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                        style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                                        ⚡ {form.electrical_points} pts
                                    </span>
                                )}
                                {form.light_points > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                        style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                                        💡 {form.light_points} pts
                                    </span>
                                )}
                                {form.fan_points > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                        style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                                        🌀 {form.fan_points} pts
                                    </span>
                                )}
                                {form.ac_provision && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                        style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
                                        ❄️ AC
                                    </span>
                                )}
                                {form.plumbing_points > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                        style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
                                        🔧 {form.plumbing_points} pts
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Schedule */}
            {tab === 'schedule' && (
                <div className="px-4 py-3 space-y-3">
                    <div>
                        <Lbl>Priority / प्राथमिकता</Lbl>
                        <div className="flex gap-1.5">
                            {[['HIGH','🔴 High','#ef4444'],['MEDIUM','🟡 Med','#f59e0b'],['LOW','🟢 Low','#10b981']].map(([val, lbl, clr]) => (
                                <button key={val} onClick={() => change('priority', val)}
                                    className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
                                    style={{
                                        background: form.priority === val ? `${clr}20` : 'var(--t-bg)',
                                        color:      form.priority === val ? clr : 'var(--t-text3)',
                                        border:     `1px solid ${form.priority === val ? clr : 'var(--t-border)'}`,
                                    }}>
                                    {lbl}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <Lbl>📅 Target Completion</Lbl>
                        <input type="date" value={form.completion_date}
                            onChange={e => change('completion_date', e.target.value)} style={iStyle} />
                    </div>
                    {form.completion_date && (() => {
                        const diff = Math.ceil((new Date(form.completion_date) - new Date()) / 86400000);
                        const color = diff < 0 ? '#ef4444' : diff <= 7 ? '#f59e0b' : '#10b981';
                        const label = diff < 0 ? `${Math.abs(diff)} days overdue` : diff === 0 ? 'Due today' : `${diff} days left`;
                        return (
                            <div className="rounded-lg px-3 py-2 text-xs font-semibold text-center"
                                style={{ background: `${color}15`, color, border: `1px solid ${color}40` }}>
                                📅 {label}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Tab: Notes */}
            {tab === 'notes' && (
                <div className="px-4 py-3">
                    <Lbl>Notes / टिप्पणी</Lbl>
                    <textarea
                        value={form.notes}
                        onChange={e => change('notes', e.target.value)}
                        rows={6}
                        placeholder="Remarks about this room…"
                        style={{
                            ...iStyle, resize: 'vertical', padding: '6px 8px',
                            lineHeight: 1.5, fontWeight: 400,
                        }}
                    />
                </div>
            )}

            {/* Footer */}
            <div className="px-4 py-3 flex gap-2 mt-auto shrink-0" style={{ borderTop: '1px solid var(--t-border)' }}>
                <button onClick={handleDelete} disabled={deleting}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                    {deleting ? 'Deleting…' : '🗑 Delete'}
                </button>
                <div className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition-all"
                    style={{
                        background: flash ? '#10b981' : (saving ? '#f97316' : 'rgba(249,115,22,0.1)'),
                        color: flash || saving ? '#fff' : '#f97316',
                    }}>
                    {flash ? '✓ Saved' : saving ? 'Saving…' : 'Auto-save on'}
                </div>
            </div>
        </div>
    );
}

/* ── FloorPlanCanvas ─────────────────────────────────────────────────────── */
const FLOOR_COLORS = ['#ea580c', '#3b82f6', '#8b5cf6', '#10b981'];

export default function FloorPlanCanvas({ floor }) {
    const { updateRoomLocal, removeRoomLocal, addRoomLocal } = useStructure();

    const svgRef       = useRef(null);
    const [scale, setScale]         = useState(0.5);
    const [pan, setPan]             = useState({ x: 40, y: 40 });
    const [selectedId, setSelectedId] = useState(null);
    const [rooms, setRooms]         = useState([]);

    // sync rooms when floor changes
    useEffect(() => {
        setRooms(floor?.rooms || []);
        setSelectedId(null);
    }, [floor?.id]);

    // also sync when context updates rooms (e.g. after save)
    useEffect(() => {
        setRooms(prev => {
            const next = floor?.rooms || [];
            // merge: preserve local pos during drag, update everything else
            return next.map(r => {
                const local = prev.find(p => p.id === r.id);
                return local ? { ...r, pos_x: local.pos_x, pos_y: local.pos_y, polygon_points: local.polygon_points } : r;
            });
        });
    }, [floor?.rooms]);

    const accent = FLOOR_COLORS[(floor?.level || 0) % FLOOR_COLORS.length];
    const BW     = floor?.plan_width_cm  || 1500;
    const BD     = floor?.plan_depth_cm  || 1000;
    const selectedRoom = rooms.find(r => r.id === selectedId) || null;

    // ── Drag via refs (stable — no event listener churn) ──────────────────
    const dragRef   = useRef(null);
    const panRef    = useRef(null);
    const scaleRef  = useRef(scale);
    const panValRef = useRef(pan);
    useEffect(() => { scaleRef.current = scale; }, [scale]);
    useEffect(() => { panValRef.current = pan; }, [pan]);

    const svgPoint = (e) => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - panValRef.current.x) / scaleRef.current,
            y: (e.clientY - rect.top  - panValRef.current.y) / scaleRef.current,
        };
    };

    const onRoomMouseDown = (e, room) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setSelectedId(room.id);
        const pt = svgPoint(e);
        dragRef.current = {
            roomId:  room.id,
            startX:  pt.x,
            startY:  pt.y,
            origX:   room.pos_x ?? 0,
            origY:   room.pos_y ?? 0,
            origPts: room.polygon_points ? JSON.parse(JSON.stringify(room.polygon_points)) : null,
        };
    };

    const onSvgMouseDown = (e) => {
        // Middle button or Alt+Left for pan
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            e.preventDefault();
            panRef.current = { startX: e.clientX - panValRef.current.x, startY: e.clientY - panValRef.current.y };
        }
    };

    // Stable global handlers (registered once, read from refs)
    useEffect(() => {
        const onMove = (e) => {
            if (panRef.current) {
                setPan({ x: e.clientX - panRef.current.startX, y: e.clientY - panRef.current.startY });
                return;
            }
            if (!dragRef.current) return;

            // Capture NOW — before setRooms updater runs (dragRef may be null by then)
            const drag = dragRef.current;
            const pt   = svgPoint(e);
            const dx   = snap(pt.x - drag.startX);
            const dy   = snap(pt.y - drag.startY);
            const newX = snap(drag.origX + dx);
            const newY = snap(drag.origY + dy);

            setRooms(prev => prev.map(r => {
                if (r.id !== drag.roomId) return r;
                const newPts = drag.origPts
                    ? drag.origPts.map(p => ({
                        x: p.x + (newX - drag.origX),
                        y: p.y + (newY - drag.origY),
                    }))
                    : null;
                return { ...r, pos_x: newX, pos_y: newY, polygon_points: newPts };
            }));
        };

        const onUp = async () => {
            panRef.current = null;
            if (!dragRef.current) return;
            const { roomId } = dragRef.current;
            dragRef.current = null;
            // read latest position from state via functional updater
            setRooms(prev => {
                const room = prev.find(r => r.id === roomId);
                if (room) {
                    structureApi.updateRoom(roomId, {
                        pos_x: room.pos_x,
                        pos_y: room.pos_y,
                        polygon_points: room.polygon_points,
                    }).then(() => {
                        updateRoomLocal(roomId, {
                            pos_x: room.pos_x,
                            pos_y: room.pos_y,
                            polygon_points: room.polygon_points,
                        });
                    }).catch(console.error);
                }
                return prev;
            });
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []); // ← empty deps: registered once, uses refs for scale/pan

    const onWheel = (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.88;
        setScale(s => Math.min(2.5, Math.max(0.15, s * factor)));
    };

    // ── Add room ──────────────────────────────────────────────────────────
    const addRoom = async () => {
        if (!floor) return;
        const name = prompt('Room name (e.g. "Living Room / बैठककोठा"):');
        if (!name?.trim()) return;
        try {
            const res = await structureApi.createRoom({
                name: name.trim(), floor: floor.id,
                pos_x: 50, pos_y: 50,
                width_cm: 300, depth_cm: 250,
                status: 'NOT_STARTED', budget_allocation: 0,
            });
            setRooms(prev => [...prev, res.data]);
            addRoomLocal(res.data);
            setSelectedId(res.data.id);
        } catch (e) { console.error(e); }
    };

    const handleDelete = (roomId) => {
        setRooms(prev => prev.filter(r => r.id !== roomId));
        removeRoomLocal(roomId);
        setSelectedId(null);
    };

    const handleRoomSaved = (updated) => {
        setRooms(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
        updateRoomLocal(updated.id, updated);
    };

    // ── Coordinate helpers ────────────────────────────────────────────────
    const polyStr = (room) =>
        getPts(room).map(p => `${(p.x * scale).toFixed(1)},${(p.y * scale).toFixed(1)}`).join(' ');

    const center = (room) => {
        const c = polyCentroid(getPts(room));
        return { x: c.x * scale, y: c.y * scale };
    };

    const areaSqft = (room) => {
        const pts = getPts(room);
        return +(polyArea(pts) / 929.03).toFixed(1);
    };

    if (!floor) return (
        <div className="flex items-center justify-center h-64" style={{ color: 'var(--t-text3)' }}>
            No floor selected.
        </div>
    );

    return (
        <div className="flex h-full" style={{ minHeight: 540 }}>
            {/* ── Canvas ── */}
            <div
                className="flex-1 relative overflow-hidden rounded-xl"
                style={{ background: '#0d1117', border: '1px solid #1f2937', cursor: 'crosshair' }}
                onWheel={onWheel}
            >
                {/* Toolbar */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-2 flex-wrap">
                    <button onClick={addRoom}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow"
                        style={{ background: '#ea580c' }}>
                        + Add Room
                    </button>
                    <span className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-white/50"
                        style={{ background: 'rgba(0,0,0,0.5)' }}>
                        {Math.round(scale * 100)}% · {rooms.length} rooms
                    </span>
                    <button onClick={() => setScale(s => Math.min(2.5, s * 1.15))}
                        className="w-7 h-7 rounded text-white/60 hover:text-white text-base"
                        style={{ background: 'rgba(0,0,0,0.4)' }}>+</button>
                    <button onClick={() => setScale(s => Math.max(0.15, s * 0.85))}
                        className="w-7 h-7 rounded text-white/60 hover:text-white text-base"
                        style={{ background: 'rgba(0,0,0,0.4)' }}>−</button>
                    <button onClick={() => { setScale(0.5); setPan({ x: 40, y: 40 }); }}
                        className="px-2 h-7 rounded text-white/60 hover:text-white text-xs"
                        style={{ background: 'rgba(0,0,0,0.4)' }}>⌂ Reset</button>
                </div>

                <svg
                    ref={svgRef}
                    width="100%" height="100%"
                    style={{ display: 'block', minHeight: 540 }}
                    onMouseDown={onSvgMouseDown}
                    onClick={() => setSelectedId(null)}
                >
                    <defs>
                        <pattern id="sg10" width={10 * scale} height={10 * scale} patternUnits="userSpaceOnUse">
                            <path d={`M ${10 * scale} 0 L 0 0 0 ${10 * scale}`}
                                fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                        </pattern>
                        <pattern id="sg100" width={100 * scale} height={100 * scale} patternUnits="userSpaceOnUse">
                            <rect width={100 * scale} height={100 * scale} fill="url(#sg10)" />
                            <path d={`M ${100 * scale} 0 L 0 0 0 ${100 * scale}`}
                                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                        </pattern>
                    </defs>

                    <g transform={`translate(${pan.x},${pan.y})`}>
                        {/* Grid */}
                        <rect x={-pan.x / scale * scale} y={-pan.y / scale * scale}
                            width="100%" height="100%"
                            fill="url(#sg100)" style={{ pointerEvents: 'none' }} />

                        {/* Building outline */}
                        <rect x={0} y={0}
                            width={BW * scale} height={BD * scale}
                            fill="rgba(255,255,255,0.02)"
                            stroke={accent} strokeWidth={2} strokeDasharray="10,5" />
                        <text x={4} y={-8} fontSize={10} fill={accent} fontWeight={700} opacity={0.8}>
                            {floor.name}  —  {(BW / 100).toFixed(1)}m × {(BD / 100).toFixed(1)}m
                        </text>

                        {/* Rooms */}
                        {rooms.map(room => {
                            const cs       = STATUS_STYLE[room.status] || STATUS_STYLE.NOT_STARTED;
                            const poly     = polyStr(room);
                            const c        = center(room);
                            const area     = areaSqft(room);
                            const label    = room.name.split('/')[0].trim();
                            const isActive = room.id === selectedId;
                            const fontSize = Math.max(7, Math.min(13, (room.width_cm || 200) * scale / 22));

                            return (
                                <g key={room.id}
                                    style={{ cursor: 'grab' }}
                                    onMouseDown={e => onRoomMouseDown(e, room)}
                                    onClick={e => { e.stopPropagation(); setSelectedId(room.id); }}>
                                    <polygon
                                        points={poly}
                                        fill={cs.fill}
                                        stroke={isActive ? accent : cs.stroke}
                                        strokeWidth={isActive ? 2.5 : 1.5}
                                    />
                                    <text x={c.x} y={c.y - 6}
                                        textAnchor="middle" fontSize={fontSize}
                                        fill={isActive ? accent : '#1e293b'} fontWeight={600}
                                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                        {label.length > 14 ? label.slice(0, 13) + '…' : label}
                                    </text>
                                    {area > 0 && (
                                        <text x={c.x} y={c.y + 7}
                                            textAnchor="middle" fontSize={Math.max(6, fontSize - 2)}
                                            fill="#64748b"
                                            style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                            {area} ft²
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                </svg>

                {/* Hint */}
                <div className="absolute bottom-2 right-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Drag to move  ·  Scroll to zoom  ·  Alt+drag to pan  ·  Click to inspect
                </div>
            </div>

            {/* ── Inspector ── */}
            {selectedRoom && (
                <RoomInspector
                    key={selectedRoom.id}
                    room={rooms.find(r => r.id === selectedRoom.id) || selectedRoom}
                    floorColor={accent}
                    onClose={() => setSelectedId(null)}
                    onDelete={handleDelete}
                    onRoomSaved={handleRoomSaved}
                />
            )}
        </div>
    );
}
