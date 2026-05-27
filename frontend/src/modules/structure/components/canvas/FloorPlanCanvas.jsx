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
import { CM2_PER_SQFT } from '../../utils/area';

/* ── Geometry helpers ────────────────────────────────────────────────────── */
const SNAP = 10;
const STICKY_GAP = 20;
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
    CORRIDOR: (r) => {
        const x = r.pos_x ?? 0, y = r.pos_y ?? 0,
              w = r.width_cm || 650, h = r.depth_cm || 140;
        return [
            { x, y }, { x: x + w, y },
            { x: x + w, y: y + h },
            { x, y: y + h },
        ];
    },
    BALCONY: (r) => {
        const x = r.pos_x ?? 0, y = r.pos_y ?? 0,
              w = r.width_cm || 420, h = r.depth_cm || 140,
              inset = Math.round(Math.min(w, h) * .18);
        return [
            { x: x + inset, y }, { x: x + w - inset, y },
            { x: x + w, y: y + h },
            { x, y: y + h },
        ];
    },
    STAIR: (r) => {
        const x = r.pos_x ?? 0, y = r.pos_y ?? 0,
              w = r.width_cm || 280, h = r.depth_cm || 360,
              notch = Math.round(Math.min(w, h) * .28);
        return [
            { x, y }, { x: x + w, y },
            { x: x + w, y: y + h },
            { x: x + notch, y: y + h },
            { x: x + notch, y: y + notch },
            { x, y: y + notch },
        ];
    },
    COURTYARD: (r) => {
        const x = r.pos_x ?? 0, y = r.pos_y ?? 0,
              w = r.width_cm || 500, h = r.depth_cm || 420,
              t = Math.round(Math.min(w, h) * .24);
        return [
            { x, y }, { x: x + w, y }, { x: x + w, y: y + h },
            { x, y: y + h }, { x, y },
            { x: x + t, y: y + t }, { x: x + t, y: y + h - t },
            { x: x + w - t, y: y + h - t }, { x: x + w - t, y: y + t },
            { x: x + t, y: y + t },
        ];
    },
};

const SHAPE_BUTTONS = [
    ['rect', '▭', 'Rectangle'],
    ['L', 'L', 'L room'],
    ['U', 'U', 'U room'],
    ['T', 'T', 'T room'],
    ['CORRIDOR', '━', 'Corridor'],
    ['BALCONY', '▱', 'Balcony'],
    ['STAIR', '▟', 'Stair'],
];

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

const hasCustomShape = (room) => Boolean(room.polygon_points && room.polygon_points.length >= 3);
const polyPath = (pts, scaleValue = 1) => {
    if (!pts || !pts.length) return '';
    const [first, ...rest] = pts;
    return [
        `M ${(first.x * scaleValue).toFixed(1)} ${(first.y * scaleValue).toFixed(1)}`,
        ...rest.map(p => `L ${(p.x * scaleValue).toFixed(1)} ${(p.y * scaleValue).toFixed(1)}`),
        'Z',
    ].join(' ');
};

const boundsOf = (pts) => {
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
    };
};

const translatePoints = (pts, dx, dy) => pts.map(p => ({ x: p.x + dx, y: p.y + dy }));

const boxesOverlap = (a, b) =>
    a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;

const rangesOverlap = (a1, a2, b1, b2) => a1 < b2 && a2 > b1;

const orient = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const pointOnSegment = (p, a, b) => {
    const eps = 0.0001;
    return Math.abs(orient(a, b, p)) < eps
        && p.x >= Math.min(a.x, b.x) - eps
        && p.x <= Math.max(a.x, b.x) + eps
        && p.y >= Math.min(a.y, b.y) - eps
        && p.y <= Math.max(a.y, b.y) + eps;
};

const segmentsCross = (a, b, c, d) => {
    const eps = 0.0001;
    const o1 = orient(a, b, c);
    const o2 = orient(a, b, d);
    const o3 = orient(c, d, a);
    const o4 = orient(c, d, b);
    return ((o1 > eps && o2 < -eps) || (o1 < -eps && o2 > eps))
        && ((o3 > eps && o4 < -eps) || (o3 < -eps && o4 > eps));
};

const pointInPolygonStrict = (point, poly) => {
    if (!poly || poly.length < 3) return false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        if (pointOnSegment(point, poly[j], poly[i])) return false;
    }
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const pi = poly[i], pj = poly[j];
        const crosses = (pi.y > point.y) !== (pj.y > point.y);
        if (crosses) {
            const xAtY = (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x;
            if (point.x < xAtY) inside = !inside;
        }
    }
    return inside;
};

const polygonsOverlap = (aPts, bPts) => {
    if (!aPts?.length || !bPts?.length) return false;
    if (!boxesOverlap(boundsOf(aPts), boundsOf(bPts))) return false;

    for (let i = 0; i < aPts.length; i++) {
        const a1 = aPts[i];
        const a2 = aPts[(i + 1) % aPts.length];
        for (let j = 0; j < bPts.length; j++) {
            const b1 = bPts[j];
            const b2 = bPts[(j + 1) % bPts.length];
            if (segmentsCross(a1, a2, b1, b2)) return true;
        }
    }

    return aPts.some(p => pointInPolygonStrict(p, bPts))
        || bPts.some(p => pointInPolygonStrict(p, aPts));
};

const roomPolygonOverlaps = (roomId, pts, rooms) =>
    rooms.some(other => other.id !== roomId && polygonsOverlap(pts, getPts(other)));

const clampPointsToBounds = (pts, width, depth) => {
    const b = boundsOf(pts);
    let dx = 0;
    let dy = 0;
    if (b.minX < 0) dx = -b.minX;
    if (b.maxX > width) dx = width - b.maxX;
    if (b.minY < 0) dy = -b.minY;
    if (b.maxY > depth) dy = depth - b.maxY;
    return dx || dy ? translatePoints(pts, dx, dy) : pts;
};

const dragStickyEdges = (point, bounds) => {
    const xDistances = [
        ['left', Math.abs(point.x - bounds.minX)],
        ['right', Math.abs(point.x - bounds.maxX)],
    ].sort((a, b) => a[1] - b[1]);
    const yDistances = [
        ['top', Math.abs(point.y - bounds.minY)],
        ['bottom', Math.abs(point.y - bounds.maxY)],
    ].sort((a, b) => a[1] - b[1]);
    const xRatio = bounds.width ? xDistances[0][1] / bounds.width : 1;
    const yRatio = bounds.height ? yDistances[0][1] / bounds.height : 1;
    return {
        x: xRatio <= 0.35 ? xDistances[0][0] : null,
        y: yRatio <= 0.35 ? yDistances[0][0] : null,
    };
};

const stickyRoomPoints = (roomId, pts, rooms, planWidth, planDepth, stickyEdges = {}) => {
    let nextPts = clampPointsToBounds(pts, planWidth, planDepth);
    let b = boundsOf(nextPts);

    for (const other of rooms) {
        if (other.id === roomId) continue;
        const ob = boundsOf(getPts(other));
        let dx = 0;
        let dy = 0;

        if (stickyEdges.x && rangesOverlap(b.minY, b.maxY, ob.minY, ob.maxY)) {
            const stickLeft = ob.minX - b.maxX;
            const stickRight = ob.maxX - b.minX;
            if (stickyEdges.x === 'right' && Math.abs(stickLeft) <= STICKY_GAP) dx = stickLeft;
            else if (stickyEdges.x === 'left' && Math.abs(stickRight) <= STICKY_GAP) dx = stickRight;
        }
        if (stickyEdges.y && rangesOverlap(b.minX, b.maxX, ob.minX, ob.maxX)) {
            const stickTop = ob.minY - b.maxY;
            const stickBottom = ob.maxY - b.minY;
            if (stickyEdges.y === 'bottom' && Math.abs(stickTop) <= STICKY_GAP) dy = stickTop;
            else if (stickyEdges.y === 'top' && Math.abs(stickBottom) <= STICKY_GAP) dy = stickBottom;
        }

        if (dx || dy) {
            nextPts = clampPointsToBounds(translatePoints(nextPts, dx, dy), planWidth, planDepth);
            b = boundsOf(nextPts);
        }
    }

    return nextPts.map(p => ({ x: snap(p.x), y: snap(p.y) }));
};

const rotatePoints = (pts, degrees, origin = polyCentroid(pts)) => {
    const rad = degrees * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return pts.map(p => ({
        x: snap(origin.x + (p.x - origin.x) * cos - (p.y - origin.y) * sin),
        y: snap(origin.y + (p.x - origin.x) * sin + (p.y - origin.y) * cos),
    }));
};

const angleBetween = (center, point) => Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI;

const scalePointsToBounds = (pts, fromBounds, toBounds) => {
    const sx = toBounds.width / Math.max(fromBounds.width, 1);
    const sy = toBounds.height / Math.max(fromBounds.height, 1);
    return pts.map(p => ({
        x: snap(toBounds.minX + (p.x - fromBounds.minX) * sx),
        y: snap(toBounds.minY + (p.y - fromBounds.minY) * sy),
    }));
};

const makeShapePoints = (shape, room) => {
    if (shape === 'rect') return null;
    return SHAPE_PRESETS[shape]?.(room) || null;
};

const ROOM_TYPE_OPTS = [
    ['BEDROOM','🛏️ Bedroom'],['KITCHEN','🍳 Kitchen'],['BATHROOM','🚿 Bathroom'],
    ['LIVING','🛋️ Living'],['DINING','🍽️ Dining'],['OFFICE','💼 Office'],
    ['STORE','📦 Store'],['STAIRCASE','🪜 Staircase'],['TERRACE','🌿 Terrace'],
    ['BALCONY','🌸 Balcony'],['PUJA','🪔 Puja Room'],['GARAGE','🚗 Garage'],
    ['LAUNDRY','👕 Laundry'],['HALL','🏛️ Hall'],['OTHER','🏠 Other'],
];
const FLOOR_FINISH_OPTS = [['','—'],['TILE','Tile'],['MARBLE','Marble'],['GRANITE','Granite'],['WOOD','Wood'],['CEMENT','Cement'],['STONE','Stone'],['OTHER','Other']];
const WALL_FINISH_OPTS  = [['','—'],['PAINT','Paint'],['PLASTER','Plaster'],['TILE','Tile'],['STONE','Stone'],['OTHER','Other']];
const BUDGET_PRESETS = [
    ['Basic', 1200],
    ['Standard', 1800],
    ['Premium', 2600],
];
const fmtFeet = (cm) => `${(+cm / 30.48).toFixed(1)} ft`;
const fmtCm = (cm) => `${Math.round(+cm || 0)} cm`;
const fmtSqft = (cm2) => `${(+cm2 / CM2_PER_SQFT).toFixed(1)} ft²`;
const money = (value) => new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
}).format(+value || 0);

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
    const [tab, setTab]         = useState('layout');
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
                        ? +(polyArea(data.polygon_points) / CM2_PER_SQFT).toFixed(2)
                        : (w && d ? +(w * d / CM2_PER_SQFT).toFixed(2) : null),
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
        const pts = makeShapePoints(key, {
            pos_x: +form.pos_x || 0,
            pos_y: +form.pos_y || 0,
            width_cm: +form.width_cm || 300,
            depth_cm: +form.depth_cm || 300,
        });
        const next = { ...form, polygon_points: pts };
        const shapedPts = pts || rectToPoly(next);
        const b = boundsOf(shapedPts);
        next.pos_x = snap(b.minX);
        next.pos_y = snap(b.minY);
        next.width_cm = Math.max(SNAP, snap(b.width));
        next.depth_cm = Math.max(SNAP, snap(b.height));
        setForm(next);
        save(next);
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
    const areaSqft = (areaCm2 / CM2_PER_SQFT).toFixed(1);
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
    const pvPath = previewPts ? polyPath(previewPts) : '';
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

            {/* Room type */}
            <div className="px-4 py-2 space-y-2 shrink-0" style={{ borderBottom: '1px solid var(--t-border)' }}>
                <div>
                    <Lbl>Type</Lbl>
                    <select value={form.room_type} onChange={e => change('room_type', e.target.value)} style={iStyle}>
                        {ROOM_TYPE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>
            </div>

            {/* Mini preview + area */}
            {previewPts && (
                <div className="px-4 py-2 shrink-0 flex items-center gap-3"
                    style={{ borderBottom: '1px solid var(--t-border)' }}>
                    <svg width={PRV} height={PRV} style={{ borderRadius: 6, background: '#f8fafc', flexShrink: 0 }}>
                        <path d={pvPath}
                            fill={`${floorColor}18`}
                            stroke={floorColor} strokeWidth={2}
                            fillRule="nonzero" />
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
                        <p style={{ color: 'var(--t-text3)' }}>Doors {form.door_count} · Windows {form.window_count}</p>
                    </div>
                </div>
            )}

            {/* Sub-tabs */}
            <div className="flex shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid var(--t-border)' }}>
                {[['layout','Layout'],['finish','Finish'],['openings','Openings'],['budget','Budget'],['notes','Notes']].map(([id, lbl]) => (
                    <button key={id} onClick={() => setTab(id)}
                        className="flex-1 py-2 text-[10px] font-bold transition-colors whitespace-nowrap"
                        style={{
                            color: tab === id ? '#f97316' : 'var(--t-text3)',
                            borderBottom: tab === id ? '2px solid #f97316' : '2px solid transparent',
                            background: 'transparent',
                            minWidth: 58,
                        }}>
                        {lbl}
                    </button>
                ))}
            </div>

            {/* Tab: Layout */}
            {tab === 'layout' && (
                <div className="px-4 py-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        {[['Width','width_cm'],['Depth','depth_cm'],['X','pos_x'],['Y','pos_y']].map(([lbl, k]) => (
                            <label key={k} className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black w-9 shrink-0" style={{ color: '#f97316' }}>{lbl}</span>
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
                        <div className="grid grid-cols-4 gap-1.5">
                            {SHAPE_BUTTONS.map(([k, icon, title]) => (
                                <button key={k} onClick={() => applyShape(k)} title={title}
                                    className="flex-1 py-1.5 rounded text-xs font-bold border transition-colors"
                                    style={{
                                        borderColor: (!isPoly && k === 'rect') ? '#f97316' : 'var(--t-border)',
                                        color: (!isPoly && k === 'rect') ? '#f97316' : 'var(--t-text)',
                                        background: 'var(--t-surface)',
                                    }}>
                                    {icon}
                                </button>
                            ))}
                        </div>
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
                </div>
            )}

            {/* Tab: Openings */}
            {tab === 'openings' && (
                <div className="px-4 py-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Lbl>Doors</Lbl>
                            <input type="number" min="0" value={form.door_count}
                                onChange={e => change('door_count', e.target.value)} style={iStyle} />
                        </div>
                        <div>
                            <Lbl>Windows</Lbl>
                            <input type="number" min="0" value={form.window_count}
                                onChange={e => change('window_count', e.target.value)} style={iStyle} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg p-2" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--t-text3)' }}>Total</p>
                            <p className="text-xs font-black mt-1" style={{ color: '#f97316' }}>
                                {(+form.door_count || 0) + (+form.window_count || 0)}
                            </p>
                        </div>
                        <div className="rounded-lg p-2" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--t-text3)' }}>Ratio</p>
                            <p className="text-xs font-black mt-1" style={{ color: 'var(--t-text)' }}>
                                {+areaSqft > 0 ? (((+form.door_count || 0) + (+form.window_count || 0)) / +areaSqft).toFixed(2) : '0.00'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Budget */}
            {tab === 'budget' && (
                <div className="px-4 py-3 space-y-3">
                    <div>
                        <Lbl>Room Budget</Lbl>
                        <input type="number" value={form.budget_allocation}
                            onChange={e => change('budget_allocation', e.target.value)}
                            style={iStyle} placeholder="0" />
                    </div>
                    <div>
                        <Lbl>Budget Presets</Lbl>
                        <div className="grid grid-cols-3 gap-1.5">
                            {BUDGET_PRESETS.map(([label, rate]) => (
                                <button key={label} type="button"
                                    onClick={() => change('budget_allocation', Math.round((+areaSqft || 0) * rate))}
                                    className="py-2 rounded text-[10px] font-black border"
                                    style={{
                                        borderColor: 'var(--t-border)',
                                        color: 'var(--t-text)',
                                        background: 'var(--t-bg)',
                                    }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg p-2" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--t-text3)' }}>Total</p>
                            <p className="text-xs font-black mt-1" style={{ color: '#f97316' }}>{money(form.budget_allocation)}</p>
                        </div>
                        <div className="rounded-lg p-2" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--t-text3)' }}>Per ft²</p>
                            <p className="text-xs font-black mt-1" style={{ color: 'var(--t-text)' }}>
                                {+areaSqft > 0 ? money((+form.budget_allocation || 0) / +areaSqft) : money(0)}
                            </p>
                        </div>
                    </div>
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

function AddRoomPanel({ floor, floorColor, onClose, onCreate }) {
    const [form, setForm] = useState({
        name: '',
        room_type: 'BEDROOM',
        shape: 'rect',
        width_cm: 300,
        depth_cm: 250,
        pos_x: 50,
        pos_y: 50,
        rotation: 0,
        status: 'NOT_STARTED',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
    const width = +form.width_cm || 0;
    const depth = +form.depth_cm || 0;
    const draft = {
        pos_x: +form.pos_x || 0,
        pos_y: +form.pos_y || 0,
        width_cm: width || 300,
        depth_cm: depth || 250,
        polygon_points: makeShapePoints(form.shape, {
            pos_x: +form.pos_x || 0,
            pos_y: +form.pos_y || 0,
            width_cm: width || 300,
            depth_cm: depth || 250,
        }),
    };
    const basePreviewPts = getPts(draft);
    const previewPts = +form.rotation ? rotatePoints(basePreviewPts, +form.rotation) : basePreviewPts;
    const previewBounds = boundsOf(previewPts);
    const previewScale = Math.min(180 / Math.max(previewBounds.width, 1), 120 / Math.max(previewBounds.height, 1));
    const preview = previewPts.map(p => ({
        x: 18 + (p.x - previewBounds.minX) * previewScale,
        y: 18 + (p.y - previewBounds.minY) * previewScale,
    }));
    const previewPath = polyPath(preview);
    const areaCm2 = polyArea(previewPts);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setError('Room name is required.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await onCreate({
                name: form.name.trim(),
                floor: floor.id,
                room_type: form.room_type,
                status: form.status,
                pos_x: snap(previewBounds.minX),
                pos_y: snap(previewBounds.minY),
                width_cm: Math.max(SNAP, snap(previewBounds.width)) || null,
                depth_cm: Math.max(SNAP, snap(previewBounds.height)) || null,
                polygon_points: form.shape !== 'rect' || +form.rotation ? previewPts : null,
                area_sqft: +(areaCm2 / CM2_PER_SQFT).toFixed(2),
                budget_allocation: 0,
            });
        } catch (err) {
            console.error(err);
            setError('Could not create room.');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '7px 9px',
        borderRadius: 8,
        border: '1px solid var(--t-border)',
        background: 'var(--t-bg)',
        color: 'var(--t-text)',
        fontSize: 12,
        outline: 'none',
    };

    return (
        <form onSubmit={submit} className="flex flex-col overflow-y-auto shrink-0"
            style={{ width: 300, background: 'var(--t-surface)', borderLeft: '1px solid var(--t-border)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--t-border)', borderLeft: `3px solid ${floorColor}` }}>
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-black" style={{ color: 'var(--t-text)' }}>Add Room</h3>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--t-text3)' }}>{floor.name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-lg leading-none opacity-40 hover:opacity-80">×</button>
                </div>
            </div>

            <div className="px-4 py-3 space-y-3">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--t-text3)' }}>Name</p>
                    <input autoFocus value={form.name} onChange={e => set('name', e.target.value)}
                        style={inputStyle} placeholder="Master Bedroom" />
                </div>

                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--t-text3)' }}>Type</p>
                    <select value={form.room_type} onChange={e => set('room_type', e.target.value)} style={inputStyle}>
                        {ROOM_TYPE_OPTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </div>

                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--t-text3)' }}>Shape</p>
                    <div className="grid grid-cols-4 gap-1.5">
                        {SHAPE_BUTTONS.map(([key, icon, title]) => (
                            <button key={key} type="button" title={title} onClick={() => set('shape', key)}
                                className="py-2 rounded text-xs font-black border"
                                style={{
                                    borderColor: form.shape === key ? floorColor : 'var(--t-border)',
                                    color: form.shape === key ? floorColor : 'var(--t-text)',
                                    background: form.shape === key ? `${floorColor}12` : 'var(--t-bg)',
                                }}>
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--t-text3)' }}>Rotation</p>
                    <div className="grid grid-cols-4 gap-1.5">
                        {[0, 90, 180, 270].map(deg => (
                            <button key={deg} type="button" onClick={() => set('rotation', deg)}
                                className="py-1.5 rounded text-[11px] font-black border"
                                style={{
                                    borderColor: Number(form.rotation) === deg ? floorColor : 'var(--t-border)',
                                    color: Number(form.rotation) === deg ? floorColor : 'var(--t-text)',
                                    background: Number(form.rotation) === deg ? `${floorColor}12` : 'var(--t-bg)',
                                }}>
                                {deg}°
                            </button>
                        ))}
                    </div>
                </div>

                <svg width="100%" height="150" style={{ borderRadius: 10, background: '#f8fafc', border: '1px solid var(--t-border)' }}>
                    <path d={previewPath}
                        fill="rgba(219,234,254,0.9)"
                        stroke={floorColor}
                        strokeWidth={2}
                        fillRule="nonzero" />
                    <text x="50%" y="134" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="700">
                        {(areaCm2 / CM2_PER_SQFT).toFixed(1)} ft²
                    </text>
                </svg>

                <div className="grid grid-cols-2 gap-2">
                    <label>
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--t-text3)' }}>Width cm</p>
                        <input type="number" value={form.width_cm} onChange={e => set('width_cm', e.target.value)} style={inputStyle} />
                    </label>
                    <label>
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--t-text3)' }}>Depth cm</p>
                        <input type="number" value={form.depth_cm} onChange={e => set('depth_cm', e.target.value)} style={inputStyle} />
                    </label>
                    <label>
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--t-text3)' }}>X</p>
                        <input type="number" value={form.pos_x} onChange={e => set('pos_x', e.target.value)} style={inputStyle} />
                    </label>
                    <label>
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--t-text3)' }}>Y</p>
                        <input type="number" value={form.pos_y} onChange={e => set('pos_y', e.target.value)} style={inputStyle} />
                    </label>
                </div>

                {error && <div className="text-xs font-bold text-red-500">{error}</div>}
            </div>

            <div className="mt-auto px-4 py-3 flex gap-2" style={{ borderTop: '1px solid var(--t-border)' }}>
                <button type="button" onClick={onClose}
                    className="flex-1 py-2 rounded-lg text-xs font-bold border"
                    style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)', background: 'transparent' }}>
                    Cancel
                </button>
                <button type="submit" disabled={saving}
                    className="flex-1 py-2 rounded-lg text-xs font-black text-white"
                    style={{ background: saving ? '#94a3b8' : floorColor }}>
                    {saving ? 'Adding...' : 'Add Room'}
                </button>
            </div>
        </form>
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
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [editShapeMode, setEditShapeMode] = useState(false);

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
    const floorAreaCm2 = BW * BD;
    const measureColor = '#facc15';

    // ── Drag via refs (stable — no event listener churn) ──────────────────
    const dragRef   = useRef(null);
    const vertexDragRef = useRef(null);
    const resizeDragRef = useRef(null);
    const rotateDragRef = useRef(null);
    const edgeDragRef = useRef(null);
    const panRef    = useRef(null);
    const scaleRef  = useRef(scale);
    const panValRef = useRef(pan);
    const roomsRef  = useRef(rooms);
    const planRef   = useRef({ width: BW, depth: BD });
    useEffect(() => { scaleRef.current = scale; }, [scale]);
    useEffect(() => { panValRef.current = pan; }, [pan]);
    useEffect(() => { roomsRef.current = rooms; }, [rooms]);
    useEffect(() => { planRef.current = { width: BW, depth: BD }; }, [BW, BD]);

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
        if (editShapeMode && room.id === selectedId) return;
        e.stopPropagation();
        setSelectedId(room.id);
        const pt = svgPoint(e);
        const pts = getPts(room);
        const b = boundsOf(pts);
        dragRef.current = {
            roomId:  room.id,
            startX:  pt.x,
            startY:  pt.y,
            origX:   room.pos_x ?? 0,
            origY:   room.pos_y ?? 0,
            origPts: room.polygon_points ? JSON.parse(JSON.stringify(room.polygon_points)) : null,
            stickyEdges: dragStickyEdges(pt, b),
        };
    };

    const onVertexMouseDown = (e, room, index) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setSelectedId(room.id);
        const pts = getPts(room).map(p => ({ ...p }));
        vertexDragRef.current = { roomId: room.id, index, origPts: pts };
    };

    const onEdgeMouseDown = (e, room, index) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setSelectedId(room.id);
        const pts = getPts(room).map(p => ({ ...p }));
        const nextIndex = (index + 1) % pts.length;
        const a = pts[index];
        const b = pts[nextIndex];
        const pt = svgPoint(e);
        const orientation = Math.abs(a.x - b.x) < Math.abs(a.y - b.y)
            ? 'vertical'
            : Math.abs(a.y - b.y) < Math.abs(a.x - b.x)
                ? 'horizontal'
                : 'free';
        edgeDragRef.current = {
            roomId: room.id,
            index,
            nextIndex,
            orientation,
            startX: pt.x,
            startY: pt.y,
            origPts: pts,
        };
    };

    const onResizeMouseDown = (e, room, handle) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setSelectedId(room.id);
        const pts = getPts(room).map(p => ({ ...p }));
        resizeDragRef.current = {
            roomId: room.id,
            handle,
            origPts: pts,
            origBounds: boundsOf(pts),
            wasPolygon: Boolean(room.polygon_points && room.polygon_points.length >= 3),
        };
    };

    const onRotateMouseDown = (e, room) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setSelectedId(room.id);
        const pts = getPts(room).map(p => ({ ...p }));
        const origin = polyCentroid(pts);
        rotateDragRef.current = {
            roomId: room.id,
            origin,
            origPts: pts,
            startAngle: angleBetween(origin, svgPoint(e)),
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
            if (vertexDragRef.current) {
                const vertex = vertexDragRef.current;
                const pt = svgPoint(e);
                const x = snap(pt.x);
                const y = snap(pt.y);
                setRooms(prev => prev.map(r => {
                    if (r.id !== vertex.roomId) return r;
                    const { width, depth } = planRef.current;
                    const nextPts = clampPointsToBounds(
                        vertex.origPts.map((p, idx) => idx === vertex.index ? { x, y } : p),
                        width,
                        depth,
                    );
                    const b = boundsOf(nextPts);
                    const overlaps = roomPolygonOverlaps(vertex.roomId, nextPts, roomsRef.current);
                    if (overlaps) return r;
                    return {
                        ...r,
                        pos_x: snap(b.minX),
                        pos_y: snap(b.minY),
                        width_cm: Math.max(SNAP, snap(b.width)),
                        depth_cm: Math.max(SNAP, snap(b.height)),
                        polygon_points: nextPts,
                    };
                }));
                return;
            }
            if (edgeDragRef.current) {
                const edge = edgeDragRef.current;
                const pt = svgPoint(e);
                const dx = snap(pt.x - edge.startX);
                const dy = snap(pt.y - edge.startY);
                setRooms(prev => prev.map(r => {
                    if (r.id !== edge.roomId) return r;
                    const { width, depth } = planRef.current;
                    const nextPts = clampPointsToBounds(edge.origPts.map((p, idx) => {
                        if (idx !== edge.index && idx !== edge.nextIndex) return p;
                        if (edge.orientation === 'vertical') return { x: p.x + dx, y: p.y };
                        if (edge.orientation === 'horizontal') return { x: p.x, y: p.y + dy };
                        return { x: p.x + dx, y: p.y + dy };
                    }), width, depth);
                    const b = boundsOf(nextPts);
                    const overlaps = roomPolygonOverlaps(edge.roomId, nextPts, roomsRef.current);
                    if (overlaps || b.width < SNAP || b.height < SNAP) return r;
                    return {
                        ...r,
                        pos_x: snap(b.minX),
                        pos_y: snap(b.minY),
                        width_cm: Math.max(SNAP, snap(b.width)),
                        depth_cm: Math.max(SNAP, snap(b.height)),
                        polygon_points: nextPts,
                    };
                }));
                return;
            }
            if (resizeDragRef.current) {
                const resize = resizeDragRef.current;
                const pt = svgPoint(e);
                const x = snap(pt.x);
                const y = snap(pt.y);
                const b = resize.origBounds;
                let nextBounds = { ...b };

                if (resize.handle.includes('w')) nextBounds.minX = Math.min(x, b.maxX - SNAP);
                if (resize.handle.includes('e')) nextBounds.maxX = Math.max(x, b.minX + SNAP);
                if (resize.handle.includes('n')) nextBounds.minY = Math.min(y, b.maxY - SNAP);
                if (resize.handle.includes('s')) nextBounds.maxY = Math.max(y, b.minY + SNAP);
                nextBounds = {
                    ...nextBounds,
                    width: nextBounds.maxX - nextBounds.minX,
                    height: nextBounds.maxY - nextBounds.minY,
                };

                setRooms(prev => prev.map(r => {
                    if (r.id !== resize.roomId) return r;
                    const { width, depth } = planRef.current;
                    const nextPts = clampPointsToBounds(scalePointsToBounds(resize.origPts, b, nextBounds), width, depth);
                    const nextB = boundsOf(nextPts);
                    const overlaps = roomPolygonOverlaps(resize.roomId, nextPts, roomsRef.current);
                    if (overlaps) return r;
                    return {
                        ...r,
                        pos_x: snap(nextB.minX),
                        pos_y: snap(nextB.minY),
                        width_cm: Math.max(SNAP, snap(nextB.width)),
                        depth_cm: Math.max(SNAP, snap(nextB.height)),
                        polygon_points: resize.wasPolygon ? nextPts : null,
                    };
                }));
                return;
            }
            if (rotateDragRef.current) {
                const rotate = rotateDragRef.current;
                const pt = svgPoint(e);
                const delta = snap(angleBetween(rotate.origin, pt) - rotate.startAngle);
                setRooms(prev => prev.map(r => {
                    if (r.id !== rotate.roomId) return r;
                    const { width, depth } = planRef.current;
                    const nextPts = clampPointsToBounds(rotatePoints(rotate.origPts, delta, rotate.origin), width, depth);
                    const b = boundsOf(nextPts);
                    const overlaps = roomPolygonOverlaps(rotate.roomId, nextPts, roomsRef.current);
                    if (overlaps) return r;
                    return {
                        ...r,
                        pos_x: snap(b.minX),
                        pos_y: snap(b.minY),
                        width_cm: Math.max(SNAP, snap(b.width)),
                        depth_cm: Math.max(SNAP, snap(b.height)),
                        polygon_points: nextPts,
                    };
                }));
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
                const basePts = drag.origPts || rectToPoly(r);
                const newPts = stickyRoomPoints(
                    drag.roomId,
                    basePts.map(p => ({
                        x: p.x + (newX - drag.origX),
                        y: p.y + (newY - drag.origY),
                    })),
                    roomsRef.current,
                    planRef.current.width,
                    planRef.current.depth,
                    drag.stickyEdges,
                );
                const b = boundsOf(newPts);
                const overlaps = roomPolygonOverlaps(drag.roomId, newPts, roomsRef.current);
                if (overlaps) return r;
                return {
                    ...r,
                    pos_x: snap(b.minX),
                    pos_y: snap(b.minY),
                    polygon_points: drag.origPts ? newPts : null,
                };
            }));
        };

        const onUp = async () => {
            panRef.current = null;
            if (vertexDragRef.current) {
                const { roomId } = vertexDragRef.current;
                vertexDragRef.current = null;
                setRooms(prev => {
                    const room = prev.find(r => r.id === roomId);
                    if (room) {
                        const area_sqft = +(polyArea(getPts(room)) / CM2_PER_SQFT).toFixed(2);
                        structureApi.updateRoom(roomId, {
                            pos_x: room.pos_x,
                            pos_y: room.pos_y,
                            width_cm: room.width_cm,
                            depth_cm: room.depth_cm,
                            polygon_points: room.polygon_points,
                            area_sqft,
                        }).then(() => {
                            updateRoomLocal(roomId, {
                                pos_x: room.pos_x,
                                pos_y: room.pos_y,
                                width_cm: room.width_cm,
                                depth_cm: room.depth_cm,
                                polygon_points: room.polygon_points,
                                area_sqft,
                            });
                        }).catch(console.error);
                    }
                    return prev;
                });
                return;
            }
            if (edgeDragRef.current) {
                const { roomId } = edgeDragRef.current;
                edgeDragRef.current = null;
                setRooms(prev => {
                    const room = prev.find(r => r.id === roomId);
                    if (room) {
                        const area_sqft = +(polyArea(getPts(room)) / CM2_PER_SQFT).toFixed(2);
                        structureApi.updateRoom(roomId, {
                            pos_x: room.pos_x,
                            pos_y: room.pos_y,
                            width_cm: room.width_cm,
                            depth_cm: room.depth_cm,
                            polygon_points: room.polygon_points,
                            area_sqft,
                        }).then(() => {
                            updateRoomLocal(roomId, {
                                pos_x: room.pos_x,
                                pos_y: room.pos_y,
                                width_cm: room.width_cm,
                                depth_cm: room.depth_cm,
                                polygon_points: room.polygon_points,
                                area_sqft,
                            });
                        }).catch(console.error);
                    }
                    return prev;
                });
                return;
            }
            if (resizeDragRef.current) {
                const { roomId } = resizeDragRef.current;
                resizeDragRef.current = null;
                setRooms(prev => {
                    const room = prev.find(r => r.id === roomId);
                    if (room) {
                        const area_sqft = +(polyArea(getPts(room)) / CM2_PER_SQFT).toFixed(2);
                        structureApi.updateRoom(roomId, {
                            pos_x: room.pos_x,
                            pos_y: room.pos_y,
                            width_cm: room.width_cm,
                            depth_cm: room.depth_cm,
                            polygon_points: room.polygon_points,
                            area_sqft,
                        }).then(() => {
                            updateRoomLocal(roomId, {
                                pos_x: room.pos_x,
                                pos_y: room.pos_y,
                                width_cm: room.width_cm,
                                depth_cm: room.depth_cm,
                                polygon_points: room.polygon_points,
                                area_sqft,
                            });
                        }).catch(console.error);
                    }
                    return prev;
                });
                return;
            }
            if (rotateDragRef.current) {
                const { roomId } = rotateDragRef.current;
                rotateDragRef.current = null;
                setRooms(prev => {
                    const room = prev.find(r => r.id === roomId);
                    if (room) {
                        const area_sqft = +(polyArea(getPts(room)) / CM2_PER_SQFT).toFixed(2);
                        structureApi.updateRoom(roomId, {
                            pos_x: room.pos_x,
                            pos_y: room.pos_y,
                            width_cm: room.width_cm,
                            depth_cm: room.depth_cm,
                            polygon_points: room.polygon_points,
                            area_sqft,
                        }).then(() => {
                            updateRoomLocal(roomId, {
                                pos_x: room.pos_x,
                                pos_y: room.pos_y,
                                width_cm: room.width_cm,
                                depth_cm: room.depth_cm,
                                polygon_points: room.polygon_points,
                                area_sqft,
                            });
                        }).catch(console.error);
                    }
                    return prev;
                });
                return;
            }
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
    const createRoom = async (payload) => {
        if (!floor) return;
        const res = await structureApi.createRoom(payload);
        setRooms(prev => [...prev, res.data]);
        addRoomLocal(res.data);
        setSelectedId(res.data.id);
        setShowAddPanel(false);
    };

    const persistRoomPatch = (roomId, patch) => {
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...patch } : r));
        structureApi.updateRoom(roomId, patch)
            .then(() => updateRoomLocal(roomId, patch))
            .catch(console.error);
    };

    const duplicateSelected = async () => {
        if (!selectedRoom || !floor) return;
        const pts = getPts(selectedRoom);
        const newPts = selectedRoom.polygon_points ? translatePoints(pts, 40, 40) : null;
        const res = await structureApi.createRoom({
            floor: floor.id,
            name: `${selectedRoom.name} Copy`,
            room_type: selectedRoom.room_type || 'OTHER',
            status: selectedRoom.status || 'NOT_STARTED',
            width_cm: selectedRoom.width_cm,
            depth_cm: selectedRoom.depth_cm,
            ceiling_height_cm: selectedRoom.ceiling_height_cm,
            pos_x: (selectedRoom.pos_x ?? 0) + 40,
            pos_y: (selectedRoom.pos_y ?? 0) + 40,
            polygon_points: newPts,
            floor_finish: selectedRoom.floor_finish || '',
            wall_finish: selectedRoom.wall_finish || '',
            color_scheme: selectedRoom.color_scheme || '',
            window_count: selectedRoom.window_count || 0,
            door_count: selectedRoom.door_count || 1,
            electrical_points: selectedRoom.electrical_points || 0,
            light_points: selectedRoom.light_points || 0,
            fan_points: selectedRoom.fan_points || 0,
            ac_provision: !!selectedRoom.ac_provision,
            plumbing_points: selectedRoom.plumbing_points || 0,
            priority: selectedRoom.priority || 'MEDIUM',
            completion_date: selectedRoom.completion_date || null,
            budget_allocation: selectedRoom.budget_allocation || 0,
            notes: selectedRoom.notes || '',
            area_sqft: +(polyArea(newPts || translatePoints(pts, 40, 40)) / CM2_PER_SQFT).toFixed(2),
        });
        setRooms(prev => [...prev, res.data]);
        addRoomLocal(res.data);
        setSelectedId(res.data.id);
    };

    const alignSelected = (edge) => {
        if (!selectedRoom) return;
        const pts = getPts(selectedRoom);
        const b = boundsOf(pts);
        let dx = 0, dy = 0;
        if (edge === 'left') dx = -b.minX;
        if (edge === 'top') dy = -b.minY;
        if (edge === 'right') dx = BW - b.maxX;
        if (edge === 'bottom') dy = BD - b.maxY;
        const nextPts = selectedRoom.polygon_points ? translatePoints(pts, dx, dy) : null;
        persistRoomPatch(selectedRoom.id, {
            pos_x: snap((selectedRoom.pos_x ?? 0) + dx),
            pos_y: snap((selectedRoom.pos_y ?? 0) + dy),
            polygon_points: nextPts,
        });
    };

    const rotateSelected = (degrees) => {
        if (!selectedRoom) return;
        const pts = getPts(selectedRoom);
        const nextPts = rotatePoints(pts, degrees);
        const b = boundsOf(nextPts);
        persistRoomPatch(selectedRoom.id, {
            pos_x: snap(b.minX),
            pos_y: snap(b.minY),
            width_cm: Math.max(SNAP, snap(b.width)),
            depth_cm: Math.max(SNAP, snap(b.height)),
            polygon_points: nextPts,
            area_sqft: +(polyArea(nextPts) / CM2_PER_SQFT).toFixed(2),
        });
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
    const roomPath = (room) => polyPath(getPts(room), scale);

    const center = (room) => {
        const c = polyCentroid(getPts(room));
        return { x: c.x * scale, y: c.y * scale };
    };

    const areaSqft = (room) => {
        const pts = getPts(room);
        return +(polyArea(pts) / CM2_PER_SQFT).toFixed(1);
    };

    const resizeHandlesFor = (room) => {
        const b = boundsOf(getPts(room));
        return [
            ['nw', b.minX, b.minY],
            ['ne', b.maxX, b.minY],
            ['se', b.maxX, b.maxY],
            ['sw', b.minX, b.maxY],
        ];
    };

    const edgeHandlesFor = (room) => {
        const pts = getPts(room);
        return pts.map((p, index) => {
            const n = pts[(index + 1) % pts.length];
            const orientation = Math.abs(p.x - n.x) < Math.abs(p.y - n.y)
                ? 'vertical'
                : Math.abs(p.y - n.y) < Math.abs(p.x - n.x)
                    ? 'horizontal'
                    : 'free';
            return {
                index,
                x: (p.x + n.x) / 2,
                y: (p.y + n.y) / 2,
                orientation,
            };
        });
    };

    const edgeCursor = (orientation) => {
        if (orientation === 'vertical') return 'ew-resize';
        if (orientation === 'horizontal') return 'ns-resize';
        return 'move';
    };

    const rotateHandleFor = (room) => {
        const pts = getPts(room);
        const b = boundsOf(pts);
        const c = polyCentroid(pts);
        return {
            cx: c.x,
            cy: c.y,
            x: c.x,
            y: b.minY - Math.max(50, Math.min(90, b.height * 0.25)),
        };
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
                    <button onClick={() => { setShowAddPanel(true); setEditShapeMode(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow"
                        style={{ background: '#ea580c' }}>
                        + Add Room
                    </button>
                    {selectedRoom && (
                        <>
                            <button onClick={duplicateSelected}
                                className="px-2.5 h-7 rounded text-white/70 hover:text-white text-xs font-bold"
                                style={{ background: 'rgba(0,0,0,0.45)' }}>
                                Duplicate
                            </button>
                            <button onClick={() => setEditShapeMode(v => !v)}
                                className="px-2.5 h-7 rounded text-xs font-bold"
                                style={{
                                    background: editShapeMode ? `${accent}dd` : 'rgba(0,0,0,0.45)',
                                    color: '#fff',
                                }}>
                                {editShapeMode ? 'Done Points' : 'Edit Points'}
                            </button>
                            <button onClick={() => rotateSelected(-15)}
                                className="w-7 h-7 rounded text-white/60 hover:text-white text-xs font-bold"
                                title="Rotate left 15 degrees"
                                style={{ background: 'rgba(0,0,0,0.4)' }}>
                                ↶
                            </button>
                            <button onClick={() => rotateSelected(15)}
                                className="w-7 h-7 rounded text-white/60 hover:text-white text-xs font-bold"
                                title="Rotate right 15 degrees"
                                style={{ background: 'rgba(0,0,0,0.4)' }}>
                                ↷
                            </button>
                            <button onClick={() => rotateSelected(90)}
                                className="px-2 h-7 rounded text-white/60 hover:text-white text-xs font-bold"
                                title="Rotate 90 degrees"
                                style={{ background: 'rgba(0,0,0,0.4)' }}>
                                90°
                            </button>
                            {['left', 'top', 'right', 'bottom'].map(edge => (
                                <button key={edge} onClick={() => alignSelected(edge)}
                                    className="w-7 h-7 rounded text-white/60 hover:text-white text-xs font-bold"
                                    title={`Align ${edge}`}
                                    style={{ background: 'rgba(0,0,0,0.4)' }}>
                                    {edge === 'left' ? '⟸' : edge === 'right' ? '⟹' : edge === 'top' ? '⟰' : '⟱'}
                                </button>
                            ))}
                        </>
                    )}
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
                    onClick={() => { setSelectedId(null); setEditShapeMode(false); }}
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
                        <g style={{ pointerEvents: 'none' }}>
                            <line
                                x1={0}
                                y1={BD * scale + 34}
                                x2={BW * scale}
                                y2={BD * scale + 34}
                                stroke={measureColor}
                                strokeWidth={1.5}
                                strokeDasharray="5,5"
                            />
                            <line x1={0} y1={BD * scale + 26} x2={0} y2={BD * scale + 42}
                                stroke={measureColor} strokeWidth={1.5} strokeDasharray="3,3" />
                            <line x1={BW * scale} y1={BD * scale + 26} x2={BW * scale} y2={BD * scale + 42}
                                stroke={measureColor} strokeWidth={1.5} strokeDasharray="3,3" />
                            <text
                                x={(BW * scale) / 2}
                                y={BD * scale + 30}
                                textAnchor="middle"
                                fontSize={11}
                                fill={measureColor}
                                fontWeight={900}>
                                --- {fmtFeet(BW)} / {fmtCm(BW)} ---
                            </text>

                            <line
                                x1={BW * scale + 34}
                                y1={0}
                                x2={BW * scale + 34}
                                y2={BD * scale}
                                stroke={measureColor}
                                strokeWidth={1.5}
                                strokeDasharray="5,5"
                            />
                            <line x1={BW * scale + 26} y1={0} x2={BW * scale + 42} y2={0}
                                stroke={measureColor} strokeWidth={1.5} strokeDasharray="3,3" />
                            <line x1={BW * scale + 26} y1={BD * scale} x2={BW * scale + 42} y2={BD * scale}
                                stroke={measureColor} strokeWidth={1.5} strokeDasharray="3,3" />
                            <text
                                x={BW * scale + 43}
                                y={(BD * scale) / 2}
                                textAnchor="middle"
                                fontSize={11}
                                fill={measureColor}
                                fontWeight={900}
                                transform={`rotate(90 ${BW * scale + 43} ${(BD * scale) / 2})`}>
                                --- {fmtFeet(BD)} / {fmtCm(BD)} ---
                            </text>

                            <rect
                                x={BW * scale + 52}
                                y={8}
                                width={124}
                                height={32}
                                rx={6}
                                fill="rgba(0,0,0,0.45)"
                                stroke={measureColor}
                                strokeWidth={1}
                                strokeDasharray="4,4"
                            />
                            <text
                                x={BW * scale + 114}
                                y={21}
                                textAnchor="middle"
                                fontSize={9}
                                fill={measureColor}
                                fontWeight={900}>
                                FULL AREA
                            </text>
                            <text
                                x={BW * scale + 114}
                                y={34}
                                textAnchor="middle"
                                fontSize={11}
                                fill={measureColor}
                                fontWeight={900}>
                                {fmtSqft(floorAreaCm2)}
                            </text>
                        </g>
                        <text x={4} y={-8} fontSize={10} fill={accent} fontWeight={700} opacity={0.8}>
                            {floor.name}  —  {fmtFeet(BW)} × {fmtFeet(BD)} ({fmtCm(BW)} × {fmtCm(BD)})
                        </text>

                        {/* Rooms */}
                        {rooms.map(room => {
                            const cs       = STATUS_STYLE[room.status] || STATUS_STYLE.NOT_STARTED;
                            const path     = roomPath(room);
                            const c        = center(room);
                            const area     = areaSqft(room);
                            const label    = room.name.split('/')[0].trim();
                            const isActive = room.id === selectedId;
                            const isCustom = hasCustomShape(room);
                            const fontSize = Math.max(7, Math.min(13, (room.width_cm || 200) * scale / 22));

                            return (
                                <g key={room.id}
                                    style={{ cursor: 'grab' }}
                                    onMouseDown={e => onRoomMouseDown(e, room)}
                                    onClick={e => { e.stopPropagation(); setSelectedId(room.id); }}>
                                    <path
                                        d={path}
                                        fill={cs.fill}
                                        stroke={isActive ? accent : cs.stroke}
                                        strokeWidth={isActive ? 2.5 : 1.5}
                                        fillRule="nonzero"
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
                                    {isActive && (editShapeMode || isCustom) && getPts(room).map((p, idx) => (
                                        <circle key={`${room.id}-pt-${idx}`}
                                            cx={p.x * scale} cy={p.y * scale} r={editShapeMode ? 6 : 4}
                                            fill="#fff" stroke={accent} strokeWidth={2}
                                            opacity={editShapeMode ? 1 : 0.85}
                                            style={{ cursor: editShapeMode ? 'move' : 'default', pointerEvents: editShapeMode ? 'auto' : 'none' }}
                                            onMouseDown={editShapeMode ? (e => onVertexMouseDown(e, room, idx)) : undefined}
                                        />
                                    ))}
                                    {isActive && editShapeMode && edgeHandlesFor(room).map(handle => (
                                        <rect key={`${room.id}-edge-${handle.index}`}
                                            x={handle.x * scale - 5} y={handle.y * scale - 5}
                                            width={10} height={10} rx={5}
                                            fill={accent}
                                            stroke="#fff" strokeWidth={2}
                                            style={{ cursor: edgeCursor(handle.orientation) }}
                                            onMouseDown={e => onEdgeMouseDown(e, room, handle.index)}
                                        />
                                    ))}
                                    {isActive && (!isCustom || !editShapeMode) && resizeHandlesFor(room).map(([handle, x, y]) => (
                                        <rect key={`${room.id}-resize-${handle}`}
                                            x={x * scale - 5} y={y * scale - 5}
                                            width={10} height={10} rx={2}
                                            fill={editShapeMode ? '#111827' : '#fff'}
                                            stroke={accent} strokeWidth={2}
                                            style={{ cursor: `${handle}-resize` }}
                                            onMouseDown={e => onResizeMouseDown(e, room, handle)}
                                        />
                                    ))}
                                    {isActive && (() => {
                                        const handle = rotateHandleFor(room);
                                        return (
                                            <>
                                                <line
                                                    x1={handle.cx * scale}
                                                    y1={handle.cy * scale}
                                                    x2={handle.x * scale}
                                                    y2={handle.y * scale}
                                                    stroke={accent}
                                                    strokeWidth={1.5}
                                                    strokeDasharray="4,4"
                                                    style={{ pointerEvents: 'none' }}
                                                />
                                                <circle
                                                    cx={handle.x * scale}
                                                    cy={handle.y * scale}
                                                    r={8}
                                                    fill="#fff"
                                                    stroke={accent}
                                                    strokeWidth={2}
                                                    style={{ cursor: 'grab' }}
                                                    onMouseDown={e => onRotateMouseDown(e, room)}
                                                />
                                                <text
                                                    x={handle.x * scale}
                                                    y={handle.y * scale + 3}
                                                    textAnchor="middle"
                                                    fontSize={10}
                                                    fill={accent}
                                                    fontWeight={900}
                                                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                                    ↻
                                                </text>
                                            </>
                                        );
                                    })()}
                                </g>
                            );
                        })}
                    </g>
                </svg>

                {/* Hint */}
                <div className="absolute bottom-2 right-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Drag from a side to snap that side  ·  Edit Points: drag corners or edge handles  ·  Drag circle handle to rotate
                </div>
            </div>

            {/* ── Inspector ── */}
            {showAddPanel && (
                <AddRoomPanel
                    floor={floor}
                    floorColor={accent}
                    onClose={() => setShowAddPanel(false)}
                    onCreate={createRoom}
                />
            )}

            {!showAddPanel && selectedRoom && (
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
