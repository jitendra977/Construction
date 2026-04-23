import React, { useState, useRef, useCallback, useEffect } from 'react';
import { dashboardService } from '../../../services/api';
import Modal from '../../common/Modal';
import { useConstruction } from '../../../context/ConstructionContext';
import ConfirmModal from '../../common/ConfirmModal';

/* ── Room type icon resolver ─────────────────────────────────────────────── */
const roomIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('master') || n.includes('bed') || n.includes('कोठा')) return '🛏️';
    if (n.includes('kitchen') || n.includes('dining') || n.includes('भन्सा')) return '🍳';
    if (n.includes('toilet') || n.includes('bath') || n.includes('t/b') || n.includes('शौचालय')) return '🚿';
    if (n.includes('living') || n.includes('बैठक')) return '🛋️';
    if (n.includes('office') || n.includes('अफिस')) return '💼';
    if (n.includes('puja') || n.includes('पूजा')) return '🪔';
    if (n.includes('terrace') || n.includes('छत')) return '🌿';
    if (n.includes('store') || n.includes('भण्डार')) return '📦';
    if (n.includes('stair') || n.includes('सिढी')) return '🪜';
    if (n.includes('laundry') || n.includes('धुलाई')) return '👕';
    if (n.includes('garage')) return '🚗';
    if (n.includes('double') || n.includes('hall') || n.includes('हल')) return '🏛️';
    return '🏠';
};

/* ── Status helpers ──────────────────────────────────────────────────────── */
const STATUS = {
    NOT_STARTED: { label: 'Not Started', np: 'सुरु भएन', color: 'text-[var(--t-text3)]', bg: 'bg-[var(--t-surface3)]', dot: '#94a3b8', fill: '#f1f5f9', stroke: '#94a3b8' },
    IN_PROGRESS:  { label: 'In Progress', np: 'काम जारी', color: 'text-blue-600',          bg: 'bg-blue-50',             dot: '#3b82f6', fill: '#dbeafe', stroke: '#3b82f6' },
    COMPLETED:    { label: 'Completed',   np: 'सकियो',   color: 'text-emerald-600',        bg: 'bg-emerald-50',          dot: '#10b981', fill: '#d1fae5', stroke: '#10b981' },
};

const StatusBadge = ({ status }) => {
    const s = STATUS[status] || STATUS.NOT_STARTED;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${s.bg} ${s.color}`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
            {s.label}
        </span>
    );
};

/* ── Floor accent colours (by level) ────────────────────────────────────── */
const FLOOR_COLORS = ['#ea580c', '#3b82f6', '#8b5cf6', '#10b981'];
const floorColor = (level) => FLOOR_COLORS[level % FLOOR_COLORS.length];

/* ── shared polygon helpers ──────────────────────────────────────────────── */
const polyArea = (pts) => {
    if (!pts || pts.length < 3) return 0;
    let a = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
        a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    return Math.abs(a) / 2;
};
const polyCentroid = (pts) => {
    if (!pts || !pts.length) return { x: 0, y: 0 };
    return { x: pts.reduce((s,p)=>s+p.x,0)/pts.length, y: pts.reduce((s,p)=>s+p.y,0)/pts.length };
};
const rectToPoly = (room) => {
    const x=room.pos_x||0, y=room.pos_y||0, w=room.width_cm||200, h=room.depth_cm||200;
    return [{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
};
const SHAPE_PRESETS = {
    L: (r) => { const x=r.pos_x||0,y=r.pos_y||0,w=r.width_cm||300,h=r.depth_cm||300;
        return [{x,y},{x:x+w,y},{x:x+w,y:y+Math.round(h*.45)},{x:x+Math.round(w*.55),y:y+Math.round(h*.45)},{x:x+Math.round(w*.55),y:y+h},{x,y:y+h}]; },
    U: (r) => { const x=r.pos_x||0,y=r.pos_y||0,w=r.width_cm||400,h=r.depth_cm||300,t=Math.round(w*.28),mid=Math.round(h*.55);
        return [{x,y},{x:x+w,y},{x:x+w,y:y+h},{x:x+w-t,y:y+h},{x:x+w-t,y:y+mid},{x:x+t,y:y+mid},{x:x+t,y:y+h},{x,y:y+h}]; },
    T: (r) => { const x=r.pos_x||0,y=r.pos_y||0,w=r.width_cm||400,h=r.depth_cm||300,arm=Math.round(w*.3),top=Math.round(h*.38);
        return [{x,y},{x:x+w,y},{x:x+w,y:y+top},{x:x+Math.round(w/2)+arm,y:y+top},{x:x+Math.round(w/2)+arm,y:y+h},{x:x+Math.round(w/2)-arm,y:y+h},{x:x+Math.round(w/2)-arm,y:y+top},{x,y:y+top}]; },
};

/* ── Room Inspector Panel — always-editable ──────────────────────────────── */
const RoomDetailPanel = ({ room, floorName, floorColor: fc, onClose, onDelete, onRoomSaved }) => {
    // ── local editable form ────────────────────────────────────────────────
    const [form, setForm] = useState({
        name:              room.name || '',
        status:            room.status || 'NOT_STARTED',
        width_cm:          room.width_cm  || '',
        depth_cm:          room.depth_cm  || '',
        pos_x:             room.pos_x  ?? 0,
        pos_y:             room.pos_y  ?? 0,
        budget_allocation: room.budget_allocation || '',
        polygon_points:    room.polygon_points || null,
    });
    const [saving, setSaving]     = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const timerRef = useRef(null);

    // sync position/shape updates coming from canvas drag
    useEffect(() => {
        setForm(f => ({
            ...f,
            width_cm:       room.width_cm  ?? f.width_cm,
            depth_cm:       room.depth_cm  ?? f.depth_cm,
            pos_x:          room.pos_x     ?? f.pos_x,
            pos_y:          room.pos_y     ?? f.pos_y,
            polygon_points: room.polygon_points !== undefined ? room.polygon_points : f.polygon_points,
        }));
    }, [room.width_cm, room.depth_cm, room.pos_x, room.pos_y, room.polygon_points]);

    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [onClose]);

    // ── debounced save ────────────────────────────────────────────────────
    const save = useCallback((data) => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            setSaving(true);
            try {
                const w = +data.width_cm || 0, d = +data.depth_cm || 0;
                const payload = {
                    ...data,
                    width_cm:  w || null,
                    depth_cm:  d || null,
                    pos_x:     +data.pos_x || 0,
                    pos_y:     +data.pos_y || 0,
                    area_sqft: data.polygon_points
                        ? +(polyArea(data.polygon_points) / 929.03).toFixed(2)
                        : (w && d ? +(w * d / 929.03).toFixed(2) : null),
                    budget_allocation: +data.budget_allocation || 0,
                };
                await dashboardService.updateRoom(room.id, payload);
                onRoomSaved?.({ ...room, ...payload });
                setSavedFlash(true);
                setTimeout(() => setSavedFlash(false), 1200);
            } catch(e) { console.error('Save failed', e); }
            finally { setSaving(false); }
        }, 550);
    }, [room, onRoomSaved]);

    const change = (field, value) => {
        const next = { ...form, [field]: value };
        setForm(next);
        save(next);
    };

    // ── apply shape preset ────────────────────────────────────────────────
    const applyShape = (key) => {
        let pts = null;
        if (key === 'rect') {
            pts = null;
        } else {
            const fn = SHAPE_PRESETS[key];
            pts = fn ? fn({ pos_x: +form.pos_x||0, pos_y: +form.pos_y||0, width_cm: +form.width_cm||300, depth_cm: +form.depth_cm||300 }) : null;
        }
        change('polygon_points', pts);
    };

    // ── derived display values ────────────────────────────────────────────
    const pts = form.polygon_points;
    const isPoly = pts && pts.length >= 3;
    const W = +form.width_cm || 0, D = +form.depth_cm || 0;
    const areaCm2 = isPoly ? polyArea(pts) : (W * D);
    const areaSqft = (areaCm2 / 929.03).toFixed(1);
    const areaM2   = (areaCm2 / 10000).toFixed(2);
    const nameParts = form.name.split('/');
    const nameEn = nameParts[0]?.trim() || form.name;
    const nameNe = nameParts[1]?.trim() || '';

    // ── mini preview SVG ──────────────────────────────────────────────────
    const PRV = 212, PAD_P = 26;
    const usePts = isPoly ? pts : (W && D ? rectToPoly({ pos_x:0, pos_y:0, width_cm:W, depth_cm:D }) : null);
    let previewPts = null;
    if (usePts) {
        const xs = usePts.map(p=>p.x), ys = usePts.map(p=>p.y);
        const minX=Math.min(...xs), minY=Math.min(...ys), maxX=Math.max(...xs), maxY=Math.max(...ys);
        const bw=maxX-minX||1, bh=maxY-minY||1;
        const sc = Math.min((PRV-PAD_P*2)/bw, (PRV-PAD_P*2)/bh);
        const ox = (PRV-(bw*sc))/2 - minX*sc, oy = (PRV-(bh*sc))/2 - minY*sc;
        previewPts = usePts.map(p=>({ x: ox+p.x*sc, y: oy+p.y*sc }));
    }
    const svgPolyStr = previewPts ? previewPts.map(p=>`${p.x},${p.y}`).join(' ') : '';
    const center = previewPts ? polyCentroid(previewPts) : { x: PRV/2, y: PRV/2 };

    // ── input style helpers ───────────────────────────────────────────────
    const iBase = {
        background: 'transparent', border: '1px solid transparent', borderRadius: 6,
        fontSize: 11, fontWeight: 700, color: 'var(--t-text)',
        padding: '3px 6px', width: '100%', outline: 'none', fontFamily: 'monospace',
        transition: 'border-color 0.15s, background 0.15s',
    };
    const iStyle = { ...iBase };

    const Row = ({ label, unit, children }) => (
        <div className="flex items-center h-9 border-b border-[var(--t-border)]">
            <span className="pl-4 text-[10px] font-medium text-[var(--t-text3)] shrink-0" style={{width:90}}>{label}</span>
            <div className="flex-1 flex items-center gap-1 pr-3">{children}</div>
            {unit && <span className="text-[9px] text-[var(--t-text3)] pr-3 shrink-0">{unit}</span>}
        </div>
    );
    const SecHead = ({ label, right }) => (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--t-text3)]">{label}</span>
            <div className="flex-1 h-px bg-[var(--t-border)]"/>
            {right}
        </div>
    );

    const currentShape = isPoly
        ? (pts.length === 6 ? 'L' : pts.length === 8 && pts[4] ? 'U/T' : `${pts.length}pt`)
        : 'rect';

    return (
        <div className="fixed right-0 top-0 h-full z-50 flex flex-col"
             style={{ width: 288, background: 'var(--t-surface)', borderLeft: '1px solid var(--t-border)', boxShadow: '-6px 0 24px rgba(0,0,0,0.12)' }}>

            {/* accent bar */}
            <div className="h-[3px] shrink-0" style={{ background: fc }} />

            {/* header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--t-border)] shrink-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0"
                     style={{ background: `color-mix(in srgb, ${fc} 14%, var(--t-surface2))` }}>
                    {roomIcon(form.name)}
                </div>
                {/* editable name inline */}
                <input
                    value={form.name}
                    onChange={e => change('name', e.target.value)}
                    className="flex-1 text-[11px] font-black bg-transparent border-b border-transparent focus:border-current focus:outline-none truncate"
                    style={{ color: 'var(--t-text)', minWidth: 0 }}
                    title="Room name"
                />
                {/* save indicator */}
                <span className="text-[8px] font-bold shrink-0 w-10 text-right transition-all"
                      style={{ color: savedFlash ? '#10b981' : saving ? fc : 'transparent' }}>
                    {savedFlash ? '✓ saved' : saving ? '…' : ''}
                </span>
                <button onClick={onClose}
                        className="w-6 h-6 flex items-center justify-center rounded text-[var(--t-text3)] hover:bg-[var(--t-surface2)] text-xs transition-colors shrink-0">✕</button>
            </div>

            {/* scrollable body */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

                {/* ── PREVIEW ── */}
                {previewPts && (
                    <div className="px-4 pt-4 pb-3 border-b border-[var(--t-border)]">
                        <svg width={PRV} height={PRV}
                             style={{ display:'block', margin:'0 auto', background:'#f8f7f4', borderRadius:10, border:'1px solid var(--t-border)' }}>
                            <defs>
                                <pattern id="pdot" width="10" height="10" patternUnits="userSpaceOnUse">
                                    <circle cx="0" cy="0" r="0.6" fill="#d1d5db"/>
                                </pattern>
                                <clipPath id="pclip">
                                    <polygon points={svgPolyStr}/>
                                </clipPath>
                            </defs>
                            <rect width={PRV} height={PRV} fill="url(#pdot)" rx="10"/>
                            <polygon points={svgPolyStr}
                                     fill={`color-mix(in srgb, ${fc} 18%, #fff)`}
                                     stroke={fc} strokeWidth="2"/>
                            {/* diagonal hatch */}
                            <g clipPath="url(#pclip)" opacity="0.18">
                                {Array.from({length:20},(_,i)=>(
                                    <line key={i} x1={i*14-40} y1={0} x2={i*14-40+PRV+40} y2={PRV} stroke={fc} strokeWidth="5"/>
                                ))}
                            </g>
                            {/* vertex dots */}
                            {previewPts.map((p,i)=>(
                                <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={fc}/>
                            ))}
                            {/* icon + area */}
                            <text x={center.x} y={center.y-6} textAnchor="middle" dominantBaseline="central" fontSize="20" style={{userSelect:'none'}}>{roomIcon(form.name)}</text>
                            <text x={center.x} y={center.y+16} textAnchor="middle" fontSize="8.5" fontWeight="800" fill={fc} fontFamily="monospace" style={{userSelect:'none'}}>{areaSqft} ft²</text>
                            {/* shape label */}
                            <rect x={PRV-42} y={PRV-20} width={38} height={14} fill={`color-mix(in srgb, ${fc} 15%, white)`} rx="4"/>
                            <text x={PRV-23} y={PRV-13} textAnchor="middle" fontSize="7.5" fontWeight="800" fill={fc} fontFamily="monospace" style={{userSelect:'none'}}>{currentShape}</text>
                        </svg>
                    </div>
                )}

                {/* ── SHAPE presets ── */}
                <SecHead label="Shape" />
                <div className="px-4 pb-3 grid grid-cols-4 gap-1.5">
                    {[
                        { key:'rect', svg: <rect x="4" y="4" width="22" height="22" fill="currentColor" rx="2"/> },
                        { key:'L',    svg: <><rect x="4" y="4" width="14" height="22" fill="currentColor" rx="1"/><rect x="4" y="4" width="22" height="12" fill="currentColor" rx="1"/></> },
                        { key:'U',    svg: <><rect x="4" y="4" width="8"  height="22" fill="currentColor" rx="1"/><rect x="18" y="4" width="8"  height="22" fill="currentColor" rx="1"/><rect x="4" y="4" width="22" height="10" fill="currentColor" rx="1"/></> },
                        { key:'T',    svg: <><rect x="4" y="4" width="22" height="10" fill="currentColor" rx="1"/><rect x="11" y="4" width="8"  height="22" fill="currentColor" rx="1"/></> },
                    ].map(({key, svg}) => {
                        const active = key === 'rect' ? !isPoly : (currentShape === key);
                        return (
                            <button key={key} onClick={() => applyShape(key)}
                                className="flex flex-col items-center gap-1 py-2 rounded-lg border transition-all"
                                style={{ borderColor: active ? fc : 'var(--t-border)', background: active ? `color-mix(in srgb, ${fc} 10%, var(--t-surface2))` : 'var(--t-surface2)', color: active ? fc : 'var(--t-text3)' }}>
                                <svg width="30" height="30" viewBox="0 0 30 30">{svg}</svg>
                                <span className="text-[8px] font-black uppercase">{key}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── GEOMETRY ── */}
                <SecHead label="Geometry"
                    right={<span className="text-[8px] font-mono text-[var(--t-text3)]">{isPoly ? `${pts.length} pts` : 'rect'}</span>}
                />
                <Row label="Width" unit="cm">
                    <input type="number" value={form.width_cm} min={10} step={5}
                        onChange={e => change('width_cm', e.target.value)}
                        style={iStyle}
                        onFocus={e=>e.target.style.borderColor=fc}
                        onBlur={e=>e.target.style.borderColor='transparent'}
                    />
                    <span className="text-[9px] text-[var(--t-text3)] shrink-0 font-mono w-12 text-right">{W ? `${(W/100).toFixed(2)}m` : ''}</span>
                </Row>
                <Row label="Depth" unit="cm">
                    <input type="number" value={form.depth_cm} min={10} step={5}
                        onChange={e => change('depth_cm', e.target.value)}
                        style={iStyle}
                        onFocus={e=>e.target.style.borderColor=fc}
                        onBlur={e=>e.target.style.borderColor='transparent'}
                    />
                    <span className="text-[9px] text-[var(--t-text3)] shrink-0 font-mono w-12 text-right">{D ? `${(D/100).toFixed(2)}m` : ''}</span>
                </Row>
                {isPoly && (
                    <div className="px-4 py-2 border-b border-[var(--t-border)]">
                        <p className="text-[8px] text-[var(--t-text3)] mb-1.5 font-semibold">Vertices — drag in canvas to reshape</p>
                        <div className="grid grid-cols-2 gap-1">
                            {pts.map((p,i)=>(
                                <div key={i} className="flex items-center gap-1 rounded px-2 py-1 text-[9px] font-mono"
                                     style={{background:'var(--t-surface2)', border:'1px solid var(--t-border)'}}>
                                    <span className="text-[var(--t-text3)] w-4 shrink-0">P{i+1}</span>
                                    <span style={{color:fc}}>{Math.round(p.x)}</span>
                                    <span className="text-[var(--t-text3)]">,</span>
                                    <span style={{color:fc}}>{Math.round(p.y)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── AREA ── */}
                <SecHead label="Area" />
                <div className="px-4 pb-3 flex gap-2">
                    <div className="flex-1 rounded-lg px-3 py-2.5 text-center border border-[var(--t-border)]"
                         style={{ background: `color-mix(in srgb, ${fc} 7%, var(--t-surface2))` }}>
                        <p className="text-lg font-black leading-none" style={{color:fc}}>{areaSqft}</p>
                        <p className="text-[8px] font-bold text-[var(--t-text3)] mt-0.5 uppercase">sqft</p>
                    </div>
                    <div className="flex-1 rounded-lg px-3 py-2.5 text-center border border-[var(--t-border)]"
                         style={{ background: 'var(--t-surface2)' }}>
                        <p className="text-lg font-black leading-none text-[var(--t-text)]">{areaM2}</p>
                        <p className="text-[8px] font-bold text-[var(--t-text3)] mt-0.5 uppercase">m²</p>
                    </div>
                </div>

                {/* ── POSITION ── */}
                <SecHead label="Position" />
                <Row label="X (→ left)" unit="cm">
                    <input type="number" value={form.pos_x} min={0} step={25}
                        onChange={e => change('pos_x', e.target.value)}
                        style={iStyle}
                        onFocus={e=>e.target.style.borderColor=fc}
                        onBlur={e=>e.target.style.borderColor='transparent'}
                    />
                    <span className="text-[9px] text-[var(--t-text3)] shrink-0 font-mono w-12 text-right">{(+form.pos_x/100).toFixed(2)}m</span>
                </Row>
                <Row label="Y (↓ top)" unit="cm">
                    <input type="number" value={form.pos_y} min={0} step={25}
                        onChange={e => change('pos_y', e.target.value)}
                        style={iStyle}
                        onFocus={e=>e.target.style.borderColor=fc}
                        onBlur={e=>e.target.style.borderColor='transparent'}
                    />
                    <span className="text-[9px] text-[var(--t-text3)] shrink-0 font-mono w-12 text-right">{(+form.pos_y/100).toFixed(2)}m</span>
                </Row>

                {/* ── PROPERTIES ── */}
                <SecHead label="Properties" />
                {/* Status buttons */}
                <div className="px-4 pb-2 pt-1">
                    <p className="text-[9px] text-[var(--t-text3)] mb-1.5 font-semibold">Status</p>
                    <div className="flex gap-1">
                        {Object.entries(STATUS).map(([k,v])=>(
                            <button key={k} onClick={()=>change('status',k)}
                                className="flex-1 py-1.5 rounded-md text-[8px] font-black uppercase tracking-wide border transition-all"
                                style={{
                                    background: form.status===k ? v.fill : 'transparent',
                                    borderColor: form.status===k ? v.stroke : 'var(--t-border)',
                                    color: form.status===k ? v.stroke : 'var(--t-text3)',
                                }}>
                                {v.label.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                </div>
                <Row label="Floor" unit="">
                    <span className="text-[11px] font-semibold text-[var(--t-text)]">{floorName?.split('/')[0]?.trim()}</span>
                </Row>
                <Row label="Budget" unit="NPR">
                    <input type="number" value={form.budget_allocation} min={0} step={1000}
                        onChange={e => change('budget_allocation', e.target.value)}
                        style={iStyle}
                        placeholder="0"
                        onFocus={e=>e.target.style.borderColor=fc}
                        onBlur={e=>e.target.style.borderColor='transparent'}
                    />
                </Row>

                <div className="h-4"/>
            </div>

            {/* footer */}
            <div className="shrink-0 border-t border-[var(--t-border)] px-3 py-2.5 flex items-center gap-2"
                 style={{background:'var(--t-surface)'}}>
                <div className="flex-1 text-[9px] text-[var(--t-text3)]">
                    {isPoly
                        ? <span style={{color:fc}}>◆ {pts.length}-point polygon · drag vertices in canvas</span>
                        : <span>⬜ Rectangle · drag walls/corners to resize</span>
                    }
                </div>
                <button onClick={()=>{onDelete(room.id);onClose();}}
                    className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0">
                    🗑️ Delete
                </button>
            </div>
        </div>
    );
};

/* ── Building Elevation visual ───────────────────────────────────────────── */
const BuildingElevation = ({ floors, activeLevel, onSelect }) => {
    const sorted = [...floors].sort((a, b) => b.level - a.level);
    return (
        <div className="flex flex-col gap-1.5 w-full">
            {sorted.map((f) => {
                const color  = floorColor(f.level);
                const active = f.level === activeLevel;
                const total  = (f.rooms || []).reduce((s, r) => s + Number(r.area_sqft || 0), 0);
                const done   = (f.rooms || []).filter(r => r.status === 'COMPLETED').length;
                const pct    = f.rooms?.length ? Math.round((done / f.rooms.length) * 100) : 0;
                return (
                    <button
                        key={f.id}
                        onClick={() => onSelect(f.level)}
                        className={`w-full text-left rounded-xl border transition-all duration-200 overflow-hidden ${
                            active ? 'shadow-lg scale-[1.01]' : 'opacity-70 hover:opacity-100 hover:-translate-y-0.5'
                        }`}
                        style={{
                            borderColor: active ? color : 'var(--t-border)',
                            background: active
                                ? `linear-gradient(135deg, color-mix(in srgb, ${color} 10%, var(--t-surface)), var(--t-surface))`
                                : 'var(--t-surface)',
                            boxShadow: active ? `0 4px 20px color-mix(in srgb, ${color} 25%, transparent)` : undefined,
                        }}
                    >
                        <div className="h-1 w-full" style={{ background: color }} />
                        <div className="px-3 py-2.5">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                                        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
                                        L{f.level}
                                    </span>
                                    <span className="text-[11px] font-bold text-[var(--t-text)] leading-tight truncate max-w-[100px]">
                                        {f.name.split('/')[0].trim()}
                                    </span>
                                </div>
                                <span className="text-[9px] font-bold text-[var(--t-text3)]">{f.rooms?.length || 0} rooms</span>
                            </div>
                            <div className="h-1 rounded-full bg-[var(--t-surface3)] overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, background: color }} />
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-[8px] text-[var(--t-text3)]">{total.toFixed(0)} sqft</span>
                                <span className="text-[8px] font-bold" style={{ color }}>{pct}%</span>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

/* ── 2D Floor Plan Canvas — drag-to-move + drag-wall-to-resize ──────────── */
const FloorPlanCanvas = ({ floor, floorColor: fc, onRoomClick, onRoomSaved, onCreateRoom, height = 530 }) => {
    // ── constants ──────────────────────────────────────────────────────────
    const SNAP    = 25;   // cm grid for snapping
    const MIN_DIM = 50;   // minimum room dimension in cm
    const PAD_SVG = 70;   // SVG padding for dimension labels

    // ── state ──────────────────────────────────────────────────────────────
    const [zoom, setZoom]               = useState(1);
    const [pan, setPan]                 = useState({ x: 0, y: 0 });
    const [localRooms, setLocalRooms]   = useState([]);
    const [hoveredId, setHoveredId]     = useState(null);
    const [cursor, setCursor]           = useState('grab');
    const [dragDisplay, setDragDisplay] = useState(null); // live dim overlay
    const [savingId, setSavingId]       = useState(null);
    const [isEditing, setIsEditing]     = useState(false); // show snap grid
    const [snapOn, setSnapOn]           = useState(true);
    const [tooltip, setTooltip]         = useState(null);
    const [drawMode, setDrawMode]       = useState(false);  // draw-room mode
    const [drawGhost, setDrawGhost]     = useState(null);   // {x,y,w,h} in cm

    const containerRef = useRef(null);
    // interaction state machine (ref for perf — no re-render)
    const ia = useRef({ mode: 'idle' }); // mode: idle | pan | move | resize | vertex | draw
    // always-fresh refs for event handlers
    const panRef      = useRef(pan);
    const zoomRef     = useRef(zoom);
    const snapRef     = useRef(snapOn);
    const drawModeRef = useRef(false);
    const drawGhostRef= useRef(null);
    useEffect(() => { panRef.current    = pan;      }, [pan]);
    useEffect(() => { zoomRef.current   = zoom;     }, [zoom]);
    useEffect(() => { snapRef.current   = snapOn;   }, [snapOn]);
    useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);

    const rooms     = floor?.rooms || [];
    const W         = floor?.plan_width_cm  || 1000;
    const H         = floor?.plan_depth_cm  || 700;
    const PAD       = PAD_SVG;
    const svgW      = W + PAD * 2;
    const svgH      = H + PAD * 2 + 45;
    const hasLayout = (floor?.plan_width_cm && floor?.plan_depth_cm) ||
                      rooms.some(r => r.width_cm && r.depth_cm);

    // ── sync local rooms whenever floor changes ─────────────────────────────
    useEffect(() => {
        setLocalRooms(rooms.map(r => ({ ...r })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [floor?.id]);

    // ── helpers ────────────────────────────────────────────────────────────
    const m   = (cm) => `${(cm / 100).toFixed(2)}m`;
    const ft  = (cm) => `${(cm / 30.48).toFixed(1)}'`;
    const snp = (v)  => snapRef.current ? Math.round(v / SNAP) * SNAP : Math.round(v);
    const scaleBar = W > 800 ? 200 : 100;

    // Convert screen px → building cm
    const toCm = (sx, sy) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: (sx - rect.left - panRef.current.x) / zoomRef.current - PAD,
            y: (sy - rect.top  - panRef.current.y) / zoomRef.current - PAD,
        };
    };

    // Detect which resize handle the cursor is near (or null)
    const HANDLE_CURSORS = { n:'ns-resize', s:'ns-resize', e:'ew-resize', w:'ew-resize', ne:'nesw-resize', sw:'nesw-resize', nw:'nwse-resize', se:'nwse-resize' };
    const getHandle = (cmX, cmY, room) => {
        const t  = 14 / zoomRef.current; // threshold in cm
        const rx = room.pos_x || 0, ry = room.pos_y || 0;
        const rw = room.width_cm,   rd = room.depth_cm;
        const nL = Math.abs(cmX - rx) < t,       nR = Math.abs(cmX - (rx + rw)) < t;
        const nT = Math.abs(cmY - ry) < t,       nB = Math.abs(cmY - (ry + rd)) < t;
        const iY = cmY > ry - t && cmY < ry + rd + t;
        const iX = cmX > rx - t && cmX < rx + rw + t;
        if (nL && nT) return 'nw'; if (nR && nT) return 'ne';
        if (nL && nB) return 'sw'; if (nR && nB) return 'se';
        if (nL && iY) return 'w';  if (nR && iY) return 'e';
        if (nT && iX) return 'n';  if (nB && iX) return 's';
        return null;
    };

    // Resize handle SVG positions (around a room)
    const handlePos = (room) => {
        const rx = PAD + (room.pos_x || 0), ry = PAD + (room.pos_y || 0);
        const rw = room.width_cm, rd = room.depth_cm;
        return [
            { x: rx,       y: ry,       h: 'nw' }, { x: rx+rw/2, y: ry,       h: 'n'  }, { x: rx+rw, y: ry,       h: 'ne' },
            { x: rx,       y: ry+rd/2,  h: 'w'  },                                         { x: rx+rw, y: ry+rd/2,  h: 'e'  },
            { x: rx,       y: ry+rd,    h: 'sw' }, { x: rx+rw/2, y: ry+rd,    h: 's'  }, { x: rx+rw, y: ry+rd,    h: 'se' },
        ];
    };

    // ── auto-fit ───────────────────────────────────────────────────────────
    const fitToScreen = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const s = Math.min((el.clientWidth - 24) / svgW, (el.clientHeight - 24) / svgH, 1.4);
        setZoom(s); zoomRef.current = s;
        const px = (el.clientWidth  - svgW * s) / 2;
        const py = (el.clientHeight - svgH * s) / 2;
        setPan({ x: px, y: py }); panRef.current = { x: px, y: py };
    }, [svgW, svgH]);
    useEffect(() => { fitToScreen(); }, [fitToScreen]);

    // ── wheel zoom ─────────────────────────────────────────────────────────
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handler = (e) => {
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
            const factor = e.deltaY < 0 ? 1.13 : 1 / 1.13;
            setZoom(z => {
                const nz = Math.max(0.15, Math.min(5, z * factor));
                zoomRef.current = nz;
                setPan(p => {
                    const np = { x: cx - (cx - p.x) * (nz / z), y: cy - (cy - p.y) * (nz / z) };
                    panRef.current = np; return np;
                });
                return nz;
            });
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, []);

    // ── polygon helpers ────────────────────────────────────────────────────
    const getVertex = (cmX, cmY, room) => {
        const pts = room.polygon_points;
        if (!pts) return null;
        const t = 15 / zoomRef.current;
        for (let i = 0; i < pts.length; i++) {
            if (Math.abs(cmX - pts[i].x) < t && Math.abs(cmY - pts[i].y) < t) return i;
        }
        return null;
    };
    const getEdgeMid = (cmX, cmY, room) => {
        const pts = room.polygon_points;
        if (!pts || pts.length < 3) return null;
        const t = 11 / zoomRef.current;
        for (let i = 0; i < pts.length; i++) {
            const a = pts[i], b = pts[(i+1) % pts.length];
            const mx = (a.x+b.x)/2, my = (a.y+b.y)/2;
            if (Math.abs(cmX - mx) < t && Math.abs(cmY - my) < t) return i;
        }
        return null;
    };
    const polyBBox = (pts) => {
        const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y);
        const minX=Math.min(...xs), minY=Math.min(...ys);
        return { pos_x:minX, pos_y:minY, width_cm:Math.max(...xs)-minX, depth_cm:Math.max(...ys)-minY };
    };

    // ── mouse: room mousedown (starts move / resize / vertex drag) ─────────
    const onRoomDown = (e, room) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        const cm = toCm(e.clientX, e.clientY);

        if (room.polygon_points) {
            // check vertex handle first
            const vIdx = getVertex(cm.x, cm.y, room);
            if (vIdx !== null) {
                ia.current = { mode: 'vertex', roomId: room.id, vertexIdx: vIdx,
                               startCm: cm, startPts: room.polygon_points.map(p=>({...p})), moved: false };
                setIsEditing(true); setHoveredId(room.id); setTooltip(null); setCursor('move');
                return;
            }
            // check edge midpoint (insert new vertex)
            const eIdx = getEdgeMid(cm.x, cm.y, room);
            if (eIdx !== null) {
                const newPts = [...room.polygon_points];
                const a = newPts[eIdx], b = newPts[(eIdx+1) % newPts.length];
                newPts.splice(eIdx+1, 0, { x: snp((a.x+b.x)/2), y: snp((a.y+b.y)/2) });
                setLocalRooms(prev => prev.map(r => r.id === room.id ? {...r, polygon_points: newPts} : r));
                ia.current = { mode: 'vertex', roomId: room.id, vertexIdx: eIdx+1,
                               startCm: cm, startPts: newPts, moved: false };
                setIsEditing(true); setHoveredId(room.id); setTooltip(null); setCursor('crosshair');
                return;
            }
            // move whole polygon
            ia.current = { mode: 'move', roomId: room.id, startCm: cm, startRoom: {...room}, moved: false };
        } else {
            const handle = getHandle(cm.x, cm.y, room);
            ia.current = { mode: handle ? 'resize' : 'move', roomId: room.id,
                           handle, startCm: cm, startRoom: {...room}, moved: false };
            setCursor(handle ? (HANDLE_CURSORS[handle] || 'move') : 'move');
        }
        setIsEditing(true); setHoveredId(room.id); setTooltip(null);
        if (!room.polygon_points) setCursor(ia.current.mode === 'resize' ? (HANDLE_CURSORS[ia.current.handle]||'move') : 'move');
        else setCursor('move');
    };

    // ── mouse: container mousedown (draw room OR pan) ─────────────────────
    const onContainerDown = (e) => {
        if (e.button !== 0) return;
        if (drawModeRef.current) {
            const cm = toCm(e.clientX, e.clientY);
            const cx = Math.max(0, Math.min(W, cm.x));
            const cy = Math.max(0, Math.min(H, cm.y));
            ia.current = { mode: 'draw', startCm: { x: cx, y: cy }, moved: false };
            setCursor('crosshair');
            return;
        }
        ia.current = { mode: 'pan', startSx: e.clientX, startSy: e.clientY,
                        startPan: { ...panRef.current }, moved: false };
    };

    // ── mouse: move (all modes) ────────────────────────────────────────────
    const onMouseMove = (e) => {
        const state = ia.current;

        // ── pan ──
        if (state.mode === 'pan') {
            const dx = e.clientX - state.startSx, dy = e.clientY - state.startSy;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                state.moved = true;
                const np = { x: state.startPan.x + dx, y: state.startPan.y + dy };
                setPan(np); panRef.current = np;
            }
            return;
        }

        // ── draw (ghost rect for new room) ──
        if (state.mode === 'draw') {
            const cm = toCm(e.clientX, e.clientY);
            const cx = Math.max(0, Math.min(W, cm.x));
            const cy = Math.max(0, Math.min(H, cm.y));
            const gx = snp(Math.min(state.startCm.x, cx));
            const gy = snp(Math.min(state.startCm.y, cy));
            const gw = snp(Math.abs(cx - state.startCm.x));
            const gh = snp(Math.abs(cy - state.startCm.y));
            if (gw > 5 || gh > 5) state.moved = true;
            const ghost = { x: gx, y: gy, w: gw, h: gh };
            drawGhostRef.current = ghost;
            setDrawGhost(ghost);
            return;
        }

        // ── vertex drag (polygon point) ──
        if (state.mode === 'vertex') {
            const cm = toCm(e.clientX, e.clientY);
            const dx = cm.x - state.startCm.x, dy = cm.y - state.startCm.y;
            if (Math.abs(dx) > 1/zoomRef.current || Math.abs(dy) > 1/zoomRef.current) state.moved = true;
            if (!state.moved) return;
            const newPts = state.startPts.map((p,i) =>
                i === state.vertexIdx ? { x: snp(p.x+dx), y: snp(p.y+dy) } : p
            );
            const bb = polyBBox(newPts);
            setLocalRooms(prev => prev.map(r => r.id === state.roomId ? {...r, polygon_points: newPts, ...bb} : r));
            const cRect = containerRef.current?.getBoundingClientRect();
            const dr = localRooms.find(r => r.id === state.roomId);
            setDragDisplay({
                x: Math.min(e.clientX-(cRect?.left||0)+18, (cRect?.width||600)-175),
                y: Math.max(e.clientY-(cRect?.top||0)-80, 8),
                room: dr ? {...dr, polygon_points: newPts, ...bb} : null,
            });
            return;
        }

        // ── move / resize ──
        if (state.mode === 'move' || state.mode === 'resize') {
            const cm = toCm(e.clientX, e.clientY);
            const dx = cm.x - state.startCm.x, dy = cm.y - state.startCm.y;
            if (Math.abs(dx) > 2 / zoomRef.current || Math.abs(dy) > 2 / zoomRef.current) state.moved = true;
            if (!state.moved) return;

            const sr = state.startRoom;
            let upd = {};

            if (state.mode === 'move') {
                if (sr.polygon_points) {
                    // move all polygon vertices
                    const newPts = sr.polygon_points.map(p => ({ x: snp(p.x+dx), y: snp(p.y+dy) }));
                    const bb = polyBBox(newPts);
                    upd = { polygon_points: newPts, ...bb };
                } else {
                    upd = {
                        pos_x: snp(Math.max(0, Math.min(W - sr.width_cm,  sr.pos_x + dx))),
                        pos_y: snp(Math.max(0, Math.min(H - sr.depth_cm, sr.pos_y + dy))),
                    };
                }
            } else {
                let rx = sr.pos_x || 0, ry = sr.pos_y || 0, rw = sr.width_cm, rd = sr.depth_cm;
                const h = state.handle;
                if (h.includes('e')) rw = Math.max(MIN_DIM, snp(sr.width_cm + dx));
                if (h.includes('s')) rd = Math.max(MIN_DIM, snp(sr.depth_cm + dy));
                if (h.includes('w')) { const nw = Math.max(MIN_DIM, snp(sr.width_cm - dx)); rx = snp(sr.pos_x + sr.width_cm - nw); rw = nw; }
                if (h.includes('n')) { const nh = Math.max(MIN_DIM, snp(sr.depth_cm - dy)); ry = snp(sr.pos_y + sr.depth_cm - nh); rd = nh; }
                upd = { pos_x: rx, pos_y: ry, width_cm: rw, depth_cm: rd };
            }

            setLocalRooms(prev => prev.map(r => r.id === state.roomId ? { ...r, ...upd } : r));
            const cRect = containerRef.current?.getBoundingClientRect();
            const dr    = localRooms.find(r => r.id === state.roomId) || sr;
            setDragDisplay({
                x: Math.min(e.clientX - (cRect?.left || 0) + 18, (cRect?.width || 600) - 175),
                y: Math.max(e.clientY - (cRect?.top  || 0) - 80, 8),
                room: { ...dr, ...upd },
            });
            return;
        }

        // ── idle: update cursor + tooltip position based on proximity ──
        if (drawModeRef.current) { setCursor('crosshair'); return; }
        const cm = toCm(e.clientX, e.clientY);
        const cRect = containerRef.current?.getBoundingClientRect();
        let cur = 'grab';
        for (const room of localRooms) {
            if (!room.width_cm) continue;
            const rx = room.pos_x || 0, ry = room.pos_y || 0;
            const t  = 16 / zoomRef.current;
            if (cm.x >= rx - t && cm.x <= rx + room.width_cm + t && cm.y >= ry - t && cm.y <= ry + room.depth_cm + t) {
                const h = getHandle(cm.x, cm.y, room);
                cur = h ? (HANDLE_CURSORS[h] || 'move') : 'move';
                // keep tooltip position in sync with mouse
                setTooltip(prev => prev?.room?.id === room.id
                    ? { ...prev, x: e.clientX - (cRect?.left || 0), y: e.clientY - (cRect?.top || 0) }
                    : prev
                );
                break;
            }
        }
        setCursor(cur);
    };

    // ── mouse: up (finalize + save) ────────────────────────────────────────
    const onMouseUp = async () => {
        const state = { ...ia.current };
        ia.current  = { mode: 'idle' };
        setIsEditing(false);
        setDragDisplay(null);
        setCursor(drawModeRef.current ? 'crosshair' : 'grab');

        // ── draw: create new room from ghost rect ──
        if (state.mode === 'draw') {
            const ghost = drawGhostRef.current;
            drawGhostRef.current = null;
            setDrawGhost(null);
            if (!ghost || ghost.w < MIN_DIM || ghost.h < MIN_DIM) return;
            const roomData = {
                pos_x:     ghost.x,
                pos_y:     ghost.y,
                width_cm:  Math.max(MIN_DIM, ghost.w),
                depth_cm:  Math.max(MIN_DIM, ghost.h),
                area_sqft: +(ghost.w * ghost.h / 929.03).toFixed(2),
                name:      'New Room',
                status:    'NOT_STARTED',
            };
            const newRoom = await onCreateRoom?.(roomData);
            if (newRoom) {
                setLocalRooms(prev => [...prev, { ...newRoom }]);
                onRoomClick?.(newRoom);
            }
            return;
        }

        if (state.mode === 'pan') return;

        const { roomId, moved, startRoom } = state;
        if (!moved) {
            // was a click → open detail
            const room = localRooms.find(r => r.id === roomId);
            setHoveredId(null);
            setTooltip(null);
            if (room) onRoomClick?.(room);
            return;
        }

        // save changes to API
        const updated = localRooms.find(r => r.id === roomId);
        if (!updated) return;
        setSavingId(roomId);
        try {
            const payload = updated.polygon_points ? {
                polygon_points: updated.polygon_points,
                pos_x:     updated.pos_x,
                pos_y:     updated.pos_y,
                width_cm:  updated.width_cm,
                depth_cm:  updated.depth_cm,
                area_sqft: +(polyArea(updated.polygon_points) / 929.03).toFixed(2),
            } : {
                pos_x:     updated.pos_x,
                pos_y:     updated.pos_y,
                width_cm:  updated.width_cm,
                depth_cm:  updated.depth_cm,
                area_sqft: +(updated.width_cm * updated.depth_cm / 929.03).toFixed(2),
            };
            await dashboardService.updateRoom(roomId, payload);
            onRoomSaved?.({ ...updated, ...payload });
        } catch {
            // revert on error
            const revertRoom = state.startPts
                ? { polygon_points: state.startPts, ...polyBBox(state.startPts) }
                : startRoom;
            setLocalRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...revertRoom } : r));
        } finally {
            setSavingId(null);
        }
    };

    if (!hasLayout) return (
        <div className="flex flex-col items-center justify-center h-72 border-2 border-dashed border-[var(--t-border)] rounded-2xl gap-3">
            <span className="text-4xl">📐</span>
            <p className="text-sm font-bold text-[var(--t-text3)]">No plan dimensions — add width_cm / depth_cm to rooms</p>
        </div>
    );

    const handleSzCm = 13 / zoom; // handle square appears ~13px on screen
    const OW = 14, IW = 5; // outer/inner wall stroke widths

    return (
        <div
            ref={containerRef}
            className="relative rounded-2xl border border-[var(--t-border)] overflow-hidden select-none"
            style={{ height, background: '#f4f2ec', cursor }}
            onMouseDown={onContainerDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
        >
            {/* ── Toolbar ────────────────────────────────────────────────── */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5" onMouseDown={e => e.stopPropagation()}>
                <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur rounded-xl p-0.5 border border-gray-200 shadow-sm">
                    <button onClick={() => { const nz = Math.min(5, +(zoom*1.2).toFixed(3)); setZoom(nz); zoomRef.current = nz; }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-black text-base">+</button>
                    <span className="px-1.5 text-[10px] font-black font-mono text-gray-500 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => { const nz = Math.max(0.15, +(zoom/1.2).toFixed(3)); setZoom(nz); zoomRef.current = nz; }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-black text-base">−</button>
                </div>
                <button onClick={fitToScreen}
                        className="h-8 px-3 bg-white/95 backdrop-blur rounded-xl border border-gray-200 shadow-sm text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-gray-800 transition-colors">
                    ⊡ Fit
                </button>
                <button
                    onClick={() => setSnapOn(s => !s)}
                    className={`h-8 px-3 rounded-xl border shadow-sm text-[10px] font-black uppercase tracking-wider transition-colors ${snapOn ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white/95 border-gray-200 text-gray-400'}`}
                    title="Toggle snap-to-grid (25cm)"
                >
                    ⊞ Snap{snapOn ? ` ${SNAP}cm` : ' Off'}
                </button>

                {/* ── Draw Room toggle ── */}
                <button
                    onClick={() => {
                        const next = !drawMode;
                        setDrawMode(next);
                        drawModeRef.current = next;
                        setCursor(next ? 'crosshair' : 'grab');
                    }}
                    className={`h-8 px-3 rounded-xl border shadow-sm text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5
                        ${drawMode
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200 shadow-md'
                            : 'bg-white/95 border-gray-200 text-gray-500 hover:text-gray-800 hover:border-emerald-400'}`}
                    title="Draw a new room by clicking and dragging on the canvas"
                >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ display:'inline' }}>
                        <rect x="1" y="1" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.8" strokeDasharray={drawMode ? 'none' : '2.5 1.5'} fill={drawMode ? 'currentColor' : 'none'} fillOpacity="0.15"/>
                        <line x1="1" y1="5.5" x2="10" y2="5.5" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5"/>
                        <line x1="5.5" y1="1" x2="5.5" y2="10" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5"/>
                    </svg>
                    {drawMode ? '✓ Drawing' : 'Draw Room'}
                </button>
            </div>

            {/* ── Legend ─────────────────────────────────────────────────── */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 bg-white/95 backdrop-blur rounded-xl p-2.5 border border-gray-200 shadow-sm" onMouseDown={e => e.stopPropagation()}>
                <p className="text-[7px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Status</p>
                {Object.entries(STATUS).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm border" style={{ background: v.fill, borderColor: v.stroke }} />
                        <span className="text-[9px] text-gray-500 font-semibold">{v.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Hint ───────────────────────────────────────────────────── */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                {drawMode ? (
                    <span className="text-[9px] font-bold text-white bg-emerald-500/90 backdrop-blur px-3 py-1.5 rounded-full border border-emerald-400 shadow-sm">
                        ✏ Draw mode — click & drag to create a room · press Draw Room again to exit
                    </span>
                ) : (
                    <span className="text-[9px] font-semibold text-gray-400 bg-white/70 backdrop-blur px-2.5 py-1 rounded-full border border-gray-200">
                        Move: drag room · Resize: drag edge/corner · Draw new room: click Draw Room button
                    </span>
                )}
            </div>

            {/* ── SVG canvas (CSS-transformed for zoom/pan) ──────────────── */}
            <div style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', willChange: 'transform', position: 'absolute', top: 0, left: 0 }}>
                <svg width={svgW} height={svgH} style={{ display: 'block', shapeRendering: 'geometricPrecision' }}>
                    <defs>
                        <pattern id={`g100-${floor?.id}`} width="100" height="100" patternUnits="userSpaceOnUse" patternTransform={`translate(${PAD},${PAD})`}>
                            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#ccc9bc" strokeWidth="0.7" />
                        </pattern>
                        <pattern id={`g500-${floor?.id}`} width="500" height="500" patternUnits="userSpaceOnUse" patternTransform={`translate(${PAD},${PAD})`}>
                            <path d="M 500 0 L 0 0 0 500" fill="none" stroke="#b5b09f" strokeWidth="1.4" />
                        </pattern>
                        <filter id={`glow-${floor?.id}`} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b"/>
                            <feFlood floodColor={fc} floodOpacity="0.55" result="c"/>
                            <feComposite in="c" in2="b" operator="in" result="s"/>
                            <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <filter id={`saving-glow`} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b"/>
                            <feFlood floodColor="#f59e0b" floodOpacity="0.7" result="c"/>
                            <feComposite in="c" in2="b" operator="in" result="s"/>
                            <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                    </defs>

                    {/* Paper background */}
                    <rect x={0} y={0} width={svgW} height={svgH} fill="#f4f2ec" />

                    {/* Blueprint grid */}
                    <rect x={PAD} y={PAD} width={W} height={H} fill={`url(#g100-${floor?.id})`} />
                    <rect x={PAD} y={PAD} width={W} height={H} fill={`url(#g500-${floor?.id})`} />
                    <rect x={PAD} y={PAD} width={W} height={H} fill="white" fillOpacity="0.76" />

                    {/* ── Snap grid overlay (visible while dragging) ── */}
                    {isEditing && snapOn && (
                        <g opacity="0.45">
                            {Array.from({ length: Math.floor(W / SNAP) + 1 }, (_, i) => (
                                <line key={`vs${i}`} x1={PAD + i * SNAP} y1={PAD} x2={PAD + i * SNAP} y2={PAD + H} stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 5" />
                            ))}
                            {Array.from({ length: Math.floor(H / SNAP) + 1 }, (_, i) => (
                                <line key={`hs${i}`} x1={PAD} y1={PAD + i * SNAP} x2={PAD + W} y2={PAD + i * SNAP} stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 5" />
                            ))}
                        </g>
                    )}

                    {/* ── Building dimension annotations ── */}
                    {/* Top */}
                    <line x1={PAD} y1={PAD-22} x2={PAD+W} y2={PAD-22} stroke="#64748b" strokeWidth="1.2"/>
                    <line x1={PAD}   y1={PAD-28} x2={PAD}   y2={PAD-16} stroke="#64748b" strokeWidth="1.2"/>
                    <line x1={PAD+W} y1={PAD-28} x2={PAD+W} y2={PAD-16} stroke="#64748b" strokeWidth="1.2"/>
                    <text x={PAD+W/2} y={PAD-28} textAnchor="middle" fontSize="13" fontWeight="800" fill="#475569" fontFamily="'Inter',system-ui">{m(W)}</text>
                    <text x={PAD+W/2} y={PAD-13} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace">({ft(W)})</text>
                    {/* Left */}
                    <line x1={PAD-22} y1={PAD} x2={PAD-22} y2={PAD+H} stroke="#64748b" strokeWidth="1.2"/>
                    <line x1={PAD-28} y1={PAD}   x2={PAD-16} y2={PAD}   stroke="#64748b" strokeWidth="1.2"/>
                    <line x1={PAD-28} y1={PAD+H} x2={PAD-16} y2={PAD+H} stroke="#64748b" strokeWidth="1.2"/>
                    <text x={PAD-36} y={PAD+H/2} textAnchor="middle" fontSize="13" fontWeight="800" fill="#475569" fontFamily="'Inter',system-ui" transform={`rotate(-90,${PAD-36},${PAD+H/2})`}>{m(H)}</text>
                    <text x={PAD-50} y={PAD+H/2} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="monospace" transform={`rotate(-90,${PAD-50},${PAD+H/2})`}>({ft(H)})</text>

                    {/* ── Rooms ── */}
                    {localRooms.map(room => {
                        if (!room.width_cm || !room.depth_cm) return null;
                        const isPoly = room.polygon_points && room.polygon_points.length >= 3;
                        const pts    = isPoly ? room.polygon_points : null;
                        const rx     = PAD + (room.pos_x || 0), ry = PAD + (room.pos_y || 0);
                        const rw     = room.width_cm, rd = room.depth_cm;
                        const st     = STATUS[room.status] || STATUS.NOT_STARTED;
                        const isH    = hoveredId === room.id;
                        const isSv   = savingId === room.id;
                        const nameEn = room.name.split('/')[0].trim();
                        const words  = nameEn.split(' ');
                        const icon   = roomIcon(room.name);
                        const minSide = Math.min(rw, rd);
                        const iconSz  = Math.min(Math.max(minSide * 0.15, 13), 30);
                        const nameSz  = Math.min(Math.max(minSide * 0.08, 9), 17);
                        const dimSz   = Math.min(Math.max(minSide * 0.055, 7.5), 11);
                        const big     = rw > 90 && rd > 75;
                        const mid2    = Math.ceil(words.length / 2);
                        const line1   = words.slice(0, mid2).join(' ');
                        const line2   = words.slice(mid2).join(' ');
                        const hasLines = rd > 85 && big;

                        // centroid for labels
                        const labelCx = isPoly ? PAD + polyCentroid(pts).x : rx + rw/2;
                        const labelCy = isPoly ? PAD + polyCentroid(pts).y : ry + rd/2;

                        // polygon SVG string
                        const svgPts = isPoly ? pts.map(p=>`${PAD+p.x},${PAD+p.y}`).join(' ') : '';

                        // filter id per room
                        const glowId = `glow-${floor?.id}`;

                        const sharedEvents = {
                            onMouseDown: e => onRoomDown(e, room),
                            onMouseEnter: e => {
                                if (ia.current.mode !== 'idle') return;
                                setHoveredId(room.id);
                                const cRect = containerRef.current?.getBoundingClientRect();
                                setTooltip({ room, x: e.clientX-(cRect?.left||0), y: e.clientY-(cRect?.top||0) });
                            },
                            onMouseLeave: () => {
                                if (ia.current.mode !== 'idle') return;
                                setHoveredId(null); setTooltip(null);
                            },
                        };

                        return (
                            <g key={room.id} style={{ cursor: 'inherit' }} {...sharedEvents}>
                                {/* ── POLYGON room ── */}
                                {isPoly && (
                                    <>
                                        <polygon points={svgPts}
                                            fill={st.fill} fillOpacity={isH ? 0.95 : 0.85}
                                            stroke={isH ? st.stroke : '#94a3b8'}
                                            strokeWidth={isH ? IW*2 : IW}
                                            strokeLinejoin="round"
                                            filter={isSv ? 'url(#saving-glow)' : isH ? `url(#${glowId})` : undefined}
                                        />
                                        {isH && <polygon points={svgPts} fill={st.stroke} fillOpacity="0.06"/>}

                                        {/* vertex handles — drag to reshape */}
                                        {isH && pts.map((p,i) => {
                                            const vx = PAD+p.x, vy = PAD+p.y;
                                            return (
                                                <circle key={`v${i}`} cx={vx} cy={vy} r={handleSzCm * 0.7}
                                                    fill="white" stroke={fc} strokeWidth={handleSzCm*0.22}
                                                    style={{ cursor:'move', pointerEvents:'all' }}/>
                                            );
                                        })}

                                        {/* edge midpoint handles — drag to add vertex */}
                                        {isH && pts.map((p,i) => {
                                            const q = pts[(i+1)%pts.length];
                                            const mx = PAD+(p.x+q.x)/2, my = PAD+(p.y+q.y)/2;
                                            const s  = handleSzCm * 0.52;
                                            return (
                                                <rect key={`m${i}`}
                                                    x={mx-s} y={my-s} width={s*2} height={s*2}
                                                    fill={`color-mix(in srgb, ${fc} 30%, white)`}
                                                    stroke={fc} strokeWidth={handleSzCm*0.16}
                                                    transform={`rotate(45,${mx},${my})`}
                                                    style={{ cursor:'crosshair', pointerEvents:'all' }}/>
                                            );
                                        })}

                                        {/* saving pulse */}
                                        {isSv && <polygon points={svgPts} fill="none" stroke="#f59e0b" strokeWidth="5" strokeDasharray="14 6" opacity="0.7"/>}
                                    </>
                                )}

                                {/* ── RECTANGLE room ── */}
                                {!isPoly && (
                                    <>
                                        <rect x={rx} y={ry} width={rw} height={rd}
                                            fill={st.fill} fillOpacity={isH ? 0.95 : 0.85}
                                            stroke={isH ? st.stroke : '#94a3b8'}
                                            strokeWidth={isH ? IW*2 : IW}
                                            filter={isSv ? 'url(#saving-glow)' : isH ? `url(#${glowId})` : undefined}
                                        />
                                        {isH && <rect x={rx} y={ry} width={rw} height={rd} fill={st.stroke} fillOpacity="0.06"/>}

                                        {/* resize handles */}
                                        {isH && handlePos(room).map(({x,y,h}) => (
                                            <rect key={h}
                                                x={x-handleSzCm/2} y={y-handleSzCm/2}
                                                width={handleSzCm} height={handleSzCm}
                                                fill="white" stroke={fc} strokeWidth={handleSzCm*0.18}
                                                rx={handleSzCm*0.2}
                                                style={{ cursor: HANDLE_CURSORS[h]||'move', pointerEvents:'all' }}/>
                                        ))}

                                        {/* width tick */}
                                        {rw > 150 && (
                                            <g style={{pointerEvents:'none'}}>
                                                <line x1={rx+4} y1={ry-8} x2={rx+rw-4} y2={ry-8} stroke="#94a3b8" strokeWidth="0.7"/>
                                                <line x1={rx+4} y1={ry-11} x2={rx+4} y2={ry-5} stroke="#94a3b8" strokeWidth="0.7"/>
                                                <line x1={rx+rw-4} y1={ry-11} x2={rx+rw-4} y2={ry-5} stroke="#94a3b8" strokeWidth="0.7"/>
                                                <text x={rx+rw/2} y={ry-11} textAnchor="middle" fontSize={dimSz-1} fill="#94a3b8" fontFamily="monospace" style={{userSelect:'none'}}>{m(rw)}</text>
                                            </g>
                                        )}
                                        {/* saving pulse */}
                                        {isSv && <rect x={rx-3} y={ry-3} width={rw+6} height={rd+6} fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="12 6" rx="4" opacity="0.7"/>}
                                    </>
                                )}

                                {/* ── labels (shared for both shapes) ── */}
                                {big && (
                                    <g style={{ pointerEvents: 'none' }}>
                                        <text x={labelCx} y={hasLines ? labelCy - iconSz*0.85 : labelCy - iconSz*0.3}
                                            textAnchor="middle" dominantBaseline="central" fontSize={iconSz} style={{userSelect:'none'}}>{icon}</text>
                                        {hasLines && (
                                            <>
                                                <text x={labelCx} y={labelCy + nameSz*0.6} textAnchor="middle" dominantBaseline="central"
                                                    fontSize={nameSz} fontWeight="700" fill={isH ? st.stroke : '#1e293b'} fontFamily="'Inter',system-ui" style={{userSelect:'none'}}>{line1}</text>
                                                {line2 && <text x={labelCx} y={labelCy + nameSz*2} textAnchor="middle" dominantBaseline="central"
                                                    fontSize={nameSz} fontWeight="700" fill={isH ? st.stroke : '#1e293b'} fontFamily="'Inter',system-ui" style={{userSelect:'none'}}>{line2}</text>}
                                            </>
                                        )}
                                        {!hasLines && <text x={labelCx} y={labelCy + iconSz*0.7} textAnchor="middle" dominantBaseline="central"
                                            fontSize={Math.min(nameSz,12)} fontWeight="700" fill={isH ? st.stroke : '#1e293b'} fontFamily="'Inter',system-ui" style={{userSelect:'none'}}>{words.slice(0,2).join(' ')}</text>}
                                        {rd > 110 && <text x={labelCx} y={ry + rd - dimSz*1.6} textAnchor="middle" fontSize={dimSz} fontWeight="600" fill="#64748b" fontFamily="monospace" style={{userSelect:'none'}}>{m(rw)} × {m(rd)}</text>}
                                    </g>
                                )}
                                {!big && minSide > 28 && (
                                    <text x={labelCx} y={labelCy} textAnchor="middle" dominantBaseline="central"
                                        fontSize={Math.min(minSide*0.38, 22)} style={{userSelect:'none', pointerEvents:'none'}}>{icon}</text>
                                )}
                            </g>
                        );
                    })}

                    {/* ── Building outer wall ── */}
                    <rect x={PAD} y={PAD} width={W} height={H} fill="none" stroke="#1e293b" strokeWidth={OW} strokeLinejoin="miter"/>
                    {[[PAD,PAD],[PAD+W,PAD],[PAD,PAD+H],[PAD+W,PAD+H]].map(([cx,cy],i) => (
                        <rect key={i} x={cx-4} y={cy-4} width={8} height={8} fill="#1e293b"/>
                    ))}

                    {/* ── Scale bar ── */}
                    {(() => {
                        const bx = PAD + 16, by = PAD + H + 20;
                        return (
                            <g>
                                <text x={bx} y={by-2} fontSize="8" fill="#64748b" fontFamily="monospace">0</text>
                                <rect x={bx} y={by} width={scaleBar/2} height={7} fill="#64748b"/>
                                <rect x={bx+scaleBar/2} y={by} width={scaleBar/2} height={7} fill="none" stroke="#64748b" strokeWidth="1.5"/>
                                <text x={bx+scaleBar/2} y={by-2} textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="monospace">{m(scaleBar/2)}</text>
                                <text x={bx+scaleBar} y={by-2} textAnchor="end" fontSize="8" fill="#64748b" fontFamily="monospace">{m(scaleBar)}</text>
                                <text x={bx} y={by+17} fontSize="9" fill="#94a3b8" fontFamily="'Inter',system-ui">Scale 1:{Math.round(100/zoom)} approx.</text>
                            </g>
                        );
                    })()}

                    {/* ── North compass ── */}
                    {(() => {
                        const cx = PAD + W - 26, cy = PAD + H + 26;
                        return (
                            <g>
                                <circle cx={cx} cy={cy} r={22} fill="white" stroke="#cbd5e1" strokeWidth="1.5"/>
                                <polygon points={`${cx},${cy-17} ${cx-7},${cy+6} ${cx},${cy-2} ${cx+7},${cy+6}`} fill={fc}/>
                                <polygon points={`${cx},${cy+17} ${cx-7},${cy-6} ${cx},${cy-2} ${cx+7},${cy-6}`} fill="#e2e8f0"/>
                                <text x={cx} y={cy-20} textAnchor="middle" fontSize="10" fontWeight="900" fill={fc} fontFamily="'Inter',system-ui">N</text>
                            </g>
                        );
                    })()}

                    {/* ── Draw ghost rectangle (new room preview) ─────────── */}
                    {drawGhost && drawGhost.w >= MIN_DIM && drawGhost.h >= MIN_DIM && (
                        <g style={{ pointerEvents: 'none' }}>
                            {/* shadow */}
                            <rect
                                x={PAD + drawGhost.x + 4} y={PAD + drawGhost.y + 4}
                                width={drawGhost.w} height={drawGhost.h}
                                fill="#000" fillOpacity="0.08" rx={3}
                            />
                            {/* fill */}
                            <rect
                                x={PAD + drawGhost.x} y={PAD + drawGhost.y}
                                width={drawGhost.w} height={drawGhost.h}
                                fill="#10b981" fillOpacity="0.12"
                                stroke="#10b981" strokeWidth={2.5 / zoom}
                                strokeDasharray={`${10/zoom} ${5/zoom}`}
                                rx={3}
                            />
                            {/* corner dots */}
                            {[[0,0],[drawGhost.w,0],[0,drawGhost.h],[drawGhost.w,drawGhost.h]].map(([dx,dy],i) => (
                                <circle key={i}
                                    cx={PAD + drawGhost.x + dx} cy={PAD + drawGhost.y + dy}
                                    r={4 / zoom} fill="#10b981"/>
                            ))}
                            {/* dimension label */}
                            <rect
                                x={PAD + drawGhost.x + drawGhost.w/2 - 42/zoom}
                                y={PAD + drawGhost.y + drawGhost.h/2 - 11/zoom}
                                width={84/zoom} height={22/zoom}
                                fill="white" rx={4/zoom} fillOpacity="0.92"
                                stroke="#10b981" strokeWidth={1/zoom}
                            />
                            <text
                                x={PAD + drawGhost.x + drawGhost.w/2}
                                y={PAD + drawGhost.y + drawGhost.h/2 + 1/zoom}
                                textAnchor="middle" dominantBaseline="middle"
                                fontSize={11/zoom} fontWeight="900" fill="#059669"
                                fontFamily="'Inter', system-ui">
                                {m(drawGhost.w)} × {m(drawGhost.h)}
                            </text>
                            {/* area sub-label */}
                            <text
                                x={PAD + drawGhost.x + drawGhost.w/2}
                                y={PAD + drawGhost.y + drawGhost.h/2 + 16/zoom}
                                textAnchor="middle" dominantBaseline="middle"
                                fontSize={8.5/zoom} fontWeight="600" fill="#6ee7b7"
                                fontFamily="'Inter', system-ui">
                                {(drawGhost.w * drawGhost.h / 929.03).toFixed(1)} ft²
                            </text>
                        </g>
                    )}
                </svg>
            </div>

            {/* ── Live drag dimension overlay ─────────────────────────────── */}
            {dragDisplay && dragDisplay.room && (
                <div className="absolute z-30 pointer-events-none rounded-xl bg-white/98 border border-indigo-300 shadow-2xl p-3"
                     style={{ left: dragDisplay.x, top: dragDisplay.y, minWidth: 160 }}>
                    <p className="text-[10px] font-black text-gray-700 mb-1">{dragDisplay.room.name?.split('/')[0]}</p>
                    <p className="text-base font-black font-mono" style={{ color: fc }}>
                        {m(dragDisplay.room.width_cm)} × {m(dragDisplay.room.depth_cm)}
                    </p>
                    <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                        {ft(dragDisplay.room.width_cm)} × {ft(dragDisplay.room.depth_cm)}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-1">
                        {(dragDisplay.room.width_cm * dragDisplay.room.depth_cm / 929.03).toFixed(1)} ft²
                        &nbsp;·&nbsp;{((dragDisplay.room.width_cm * dragDisplay.room.depth_cm) / 10000).toFixed(2)} m²
                    </p>
                    {snapOn && <p className="text-[8px] text-indigo-500 font-bold mt-1">⊞ Snap {SNAP}cm</p>}
                </div>
            )}

            {/* ── Hover tooltip (only when not dragging) ─────────────────── */}
            {tooltip && tooltip.room && !isEditing && (() => {
                const r  = tooltip.room;
                const st = STATUS[r.status] || STATUS.NOT_STARTED;
                const tx = Math.min(tooltip.x + 16, (containerRef.current?.clientWidth || 600) - 160);
                const ty = Math.max(tooltip.y - 105, 8);
                return (
                    <div className="absolute z-30 pointer-events-none" style={{ left: tx, top: ty }}>
                        <div className="rounded-xl shadow-xl border p-3 bg-white" style={{ borderColor: st.stroke, minWidth: 148 }}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">{roomIcon(r.name)}</span>
                                <div>
                                    <p className="text-xs font-black text-gray-800 leading-tight">{r.name.split('/')[0].trim()}</p>
                                    {r.name.includes('/') && <p className="text-[9px] text-gray-400">{r.name.split('/')[1]?.trim()}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-gray-600 mb-2">
                                <span>W: {r.width_cm ? m(r.width_cm) : '—'}</span>
                                <span>D: {r.depth_cm ? m(r.depth_cm) : '—'}</span>
                                <span>{Number(r.area_sqft || 0).toFixed(1)} ft²</span>
                                <span>{r.width_cm && r.depth_cm ? ((r.width_cm*r.depth_cm)/10000).toFixed(2)+' m²' : '—'}</span>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                                  style={{ background: st.fill, color: st.stroke, border: `1px solid ${st.stroke}` }}>{st.label}</span>
                            <p className="text-[8px] text-gray-400 mt-1.5">Drag to move · drag edge to resize</p>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

/* ── Room Card ───────────────────────────────────────────────────────────── */
const RoomCard = ({ room, floorColor: fc, floorTotalSqft, onEdit, onDelete, onSelect }) => {
    const pct = floorTotalSqft > 0 ? Math.round((Number(room.area_sqft || 0) / floorTotalSqft) * 100) : 0;
    return (
        <div
            className="group relative bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            onClick={() => onSelect && onSelect(room)}
        >
            <div className="h-0.5 w-full" style={{ background: fc }} />
            <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: `color-mix(in srgb, ${fc} 12%, var(--t-surface2))` }}>
                        {roomIcon(room.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--t-text)] leading-snug truncate">
                            {room.name.split('/')[0].trim()}
                        </p>
                        {room.name.includes('/') && (
                            <p className="text-[10px] text-[var(--t-text3)] mt-0.5 truncate">
                                {room.name.split('/')[1]?.trim()}
                            </p>
                        )}
                    </div>
                </div>

                {/* Dimension tags */}
                {(room.width_cm || room.depth_cm) && (
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-md bg-[var(--t-surface2)] text-[var(--t-text3)]">
                            {room.width_cm ? `${(room.width_cm/100).toFixed(2)}m` : '?'} × {room.depth_cm ? `${(room.depth_cm/100).toFixed(2)}m` : '?'}
                        </span>
                    </div>
                )}

                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-[var(--t-text)]">
                            {Number(room.area_sqft || 0).toFixed(1)}
                            <span className="text-[9px] font-bold text-[var(--t-text3)] ml-1">sqft</span>
                        </span>
                        <span className="text-[9px] font-bold" style={{ color: fc }}>{pct}% of floor</span>
                    </div>
                    <div className="h-1 rounded-full bg-[var(--t-surface3)] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: fc }} />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <StatusBadge status={room.status} />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); onEdit(room); }}
                            className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-[var(--t-border)] text-[var(--t-text2)] hover:text-[var(--t-text)] transition-colors">
                            Edit
                        </button>
                        <button onClick={e => { e.stopPropagation(); onDelete(room.id); }}
                            className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                            Del
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Main Tab ────────────────────────────────────────────────────────────── */
const FloorsTab = ({ searchQuery = '' }) => {
    const { dashboardData, refreshData } = useConstruction();
    const [activeLevel, setActiveLevel]       = useState(0);
    const [viewMode, setViewMode]             = useState('grid'); // 'grid' | 'plan'
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    // live panel room — kept in sync when canvas drag saves or panel edits save
    const [panelRoom, setPanelRoom]           = useState(null);
    const [isModalOpen, setIsModalOpen]       = useState(false);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [editingItem, setEditingItem]       = useState(null);
    const [editingRoom, setEditingRoom]       = useState(null);
    const [selectedFloorId, setSelectedFloorId] = useState(null);
    const [formData, setFormData]             = useState({});
    const [roomFormData, setRoomFormData]     = useState({});
    const [loading, setLoading]               = useState(false);
    const [confirmConfig, setConfirmConfig]   = useState({ isOpen: false });

    const showConfirm = (cfg) => setConfirmConfig({ ...cfg, isOpen: true });
    const closeConfirm = () => setConfirmConfig(c => ({ ...c, isOpen: false }));

    const floors = dashboardData.floors || [];

    const filteredFloors = floors.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.rooms?.some(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const activeFloor = filteredFloors.find(f => f.level === activeLevel) || filteredFloors[0];
    const fc = activeFloor ? floorColor(activeFloor.level) : '#ea580c';
    const floorTotalSqft = (activeFloor?.rooms || []).reduce((s, r) => s + Number(r.area_sqft || 0), 0);

    const visibleRooms = searchQuery
        ? (activeFloor?.rooms || []).filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : (activeFloor?.rooms || []);

    const totalRooms = floors.reduce((s, f) => s + (f.rooms?.length || 0), 0);
    const totalSqft  = floors.reduce((s, f) => s + (f.rooms || []).reduce((rs, r) => rs + Number(r.area_sqft || 0), 0), 0);
    const totalDone  = floors.reduce((s, f) => s + (f.rooms || []).filter(r => r.status === 'COMPLETED').length, 0);
    const globalPct  = totalRooms > 0 ? Math.round((totalDone / totalRooms) * 100) : 0;

    /* handlers */
    const handleOpenModal = (floor = null) => {
        setEditingItem(floor);
        setFormData(floor ? { ...floor } : { level: floors.length });
        setIsModalOpen(true);
    };
    const handleOpenRoomModal = (room = null, floorId) => {
        setEditingRoom(room);
        setSelectedFloorId(floorId);
        setRoomFormData(room ? { ...room } : { floor: floorId, status: 'NOT_STARTED' });
        setIsRoomModalOpen(true);
    };
    const handleDelete = (id) => {
        showConfirm({
            title: 'Delete Floor?',
            message: 'This will remove the floor and all its rooms permanently. This cannot be undone.',
            confirmText: 'Yes, Delete Floor', type: 'danger',
            onConfirm: async () => {
                await dashboardService.deleteFloor(id).catch(() => alert('Delete failed.'));
                refreshData(); closeConfirm();
            },
        });
    };
    const handleDeleteRoom = (id) => {
        showConfirm({
            title: 'Delete Room?', message: 'Remove this room permanently from the floor structure?',
            confirmText: 'Yes, Delete Room', type: 'danger',
            onConfirm: async () => {
                await dashboardService.deleteRoom(id).catch(() => alert('Delete failed.'));
                refreshData(); closeConfirm();
            },
        });
    };
    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            if (editingItem) await dashboardService.updateFloor(editingItem.id, formData);
            else await dashboardService.createFloor(formData);
            setIsModalOpen(false); refreshData();
        } catch { alert('Save failed.'); } finally { setLoading(false); }
    };
    const handleRoomSubmit = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            if (editingRoom) await dashboardService.updateRoom(editingRoom.id, roomFormData);
            else await dashboardService.createRoom(roomFormData);
            setIsRoomModalOpen(false); refreshData();
        } catch { alert('Save failed.'); } finally { setLoading(false); }
    };

    // Called by both canvas drag-save and inspector panel auto-save
    const handleRoomSaved = useCallback((updatedRoom) => {
        setPanelRoom(prev => prev?.id === updatedRoom.id ? { ...prev, ...updatedRoom } : prev);
        refreshData();
    }, [refreshData]);

    // Called when user draws a new room rect on the canvas
    const handleCreateRoom = useCallback(async (roomData) => {
        if (!activeFloor) return null;
        try {
            const res = await dashboardService.createRoom({ ...roomData, floor: activeFloor.id });
            const newRoom = res.data;
            refreshData();
            // open inspector immediately
            setSelectedRoomId(newRoom.id);
            setPanelRoom(newRoom);
            return newRoom;
        } catch {
            alert('Failed to create room. Please try again.');
            return null;
        }
    }, [activeFloor, refreshData]);

    const inp = 'w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] text-[var(--t-text)] focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30 transition-all';
    const lbl = 'block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5';

    /* ── shared modals + panel (rendered in both layout modes) ── */
    const Modals = (
        <>
            {/* ── Floor Modal ──────────────────────────────────────────── */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                title={`${editingItem ? 'Edit' : 'Add New'} Floor`} maxWidth="max-w-md">
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className={lbl}>Floor Name <span className="opacity-50 font-normal">(English / Nepali)</span></label>
                        <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className={inp} placeholder="e.g. Ground Floor / भुई तल्ला" required />
                    </div>
                    <div>
                        <label className={lbl}>Level Number <span className="opacity-50 font-normal">(0 = Ground)</span></label>
                        <input type="number" value={formData.level ?? 0} onChange={e => setFormData({ ...formData, level: Number(e.target.value) })}
                            className={inp} min="0" required />
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-[var(--t-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-xs font-black text-[var(--t-text3)] uppercase tracking-widest hover:text-[var(--t-text)]">Cancel</button>
                        <button type="submit" disabled={loading}
                            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-[var(--t-primary)] hover:opacity-90 disabled:opacity-50">
                            {loading ? 'Saving…' : editingItem ? 'Update Floor' : 'Create Floor'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ── Room Modal ───────────────────────────────────────────── */}
            <Modal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)}
                title={`${editingRoom ? 'Edit' : 'Add New'} Room`} maxWidth="max-w-lg">
                <form onSubmit={handleRoomSubmit} className="p-5 space-y-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--t-surface2)] border border-[var(--t-border)]">
                        <span className="text-lg">{roomIcon(roomFormData.name || '')}</span>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text3)]">Assigning to</p>
                            <p className="text-sm font-bold text-[var(--t-text)]">
                                {floors.find(f => f.id === selectedFloorId)?.name || '—'}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className={lbl}>Room Name <span className="opacity-50 font-normal">(English / नेपाली)</span></label>
                        <input type="text" value={roomFormData.name || ''} onChange={e => setRoomFormData({ ...roomFormData, name: e.target.value })}
                            className={inp} placeholder="e.g. Master Bed Room / मास्टर कोठा" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Area (sqft)</label>
                            <div className="relative">
                                <input type="number" step="0.1" value={roomFormData.area_sqft || ''}
                                    onChange={e => setRoomFormData({ ...roomFormData, area_sqft: e.target.value })}
                                    className={inp + ' pr-12'} placeholder="0.0" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-[var(--t-text3)]">ft²</span>
                            </div>
                        </div>
                        <div>
                            <label className={lbl}>Status</label>
                            <select value={roomFormData.status || 'NOT_STARTED'}
                                onChange={e => setRoomFormData({ ...roomFormData, status: e.target.value })}
                                className={inp + ' cursor-pointer'}>
                                <option value="NOT_STARTED">⚪ Not Started</option>
                                <option value="IN_PROGRESS">🔵 In Progress</option>
                                <option value="COMPLETED">🟢 Completed</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Width (cm) — for Plan View</label>
                            <input type="number" value={roomFormData.width_cm || ''}
                                onChange={e => setRoomFormData({ ...roomFormData, width_cm: e.target.value })}
                                className={inp} placeholder="e.g. 400" />
                        </div>
                        <div>
                            <label className={lbl}>Depth (cm) — for Plan View</label>
                            <input type="number" value={roomFormData.depth_cm || ''}
                                onChange={e => setRoomFormData({ ...roomFormData, depth_cm: e.target.value })}
                                className={inp} placeholder="e.g. 320" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Position X (cm from left)</label>
                            <input type="number" value={roomFormData.pos_x || ''}
                                onChange={e => setRoomFormData({ ...roomFormData, pos_x: e.target.value })}
                                className={inp} placeholder="e.g. 0" />
                        </div>
                        <div>
                            <label className={lbl}>Position Y (cm from top)</label>
                            <input type="number" value={roomFormData.pos_y || ''}
                                onChange={e => setRoomFormData({ ...roomFormData, pos_y: e.target.value })}
                                className={inp} placeholder="e.g. 0" />
                        </div>
                    </div>

                    <div>
                        <label className={lbl}>Budget Allocation (NPR)</label>
                        <input type="number" step="1" value={roomFormData.budget_allocation || ''}
                            onChange={e => setRoomFormData({ ...roomFormData, budget_allocation: e.target.value })}
                            className={inp} placeholder="0" />
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-[var(--t-border)]">
                        <button type="button" onClick={() => setIsRoomModalOpen(false)}
                            className="px-4 py-2 text-xs font-black text-[var(--t-text3)] uppercase tracking-widest hover:text-[var(--t-text)]">Cancel</button>
                        <button type="submit" disabled={loading}
                            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-[var(--t-primary)] hover:opacity-90 disabled:opacity-50">
                            {loading ? 'Saving…' : editingRoom ? 'Update Room' : 'Add Room'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ── Room Detail Panel — always-editable inspector ─────────── */}
            {selectedRoomId && panelRoom && (
                <RoomDetailPanel
                    room={panelRoom}
                    floorName={activeFloor?.name}
                    floorColor={fc}
                    onClose={() => { setSelectedRoomId(null); setPanelRoom(null); }}
                    onDelete={(id) => { handleDeleteRoom(id); setSelectedRoomId(null); setPanelRoom(null); }}
                    onRoomSaved={handleRoomSaved}
                />
            )}

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText={confirmConfig.confirmText}
                onConfirm={confirmConfig.onConfirm}
                onCancel={closeConfirm}
                type={confirmConfig.type || 'warning'}
            />
        </>
    );

    /* ════════════════════════════════════════════════════════════════════════
       MAIN LAYOUT — sidebar (floors list) + content area
       ════════════════════════════════════════════════════════════════════════ */

    /* derived per-floor stats for sidebar */
    const floorDone = (f) => (f.rooms || []).filter(r => r.status === 'COMPLETED').length;
    const floorPct  = (f) => (f.rooms?.length || 0) > 0
        ? Math.round(floorDone(f) / f.rooms.length * 100) : 0;
    const floorSqft = (f) => (f.rooms || []).reduce((s,r) => s + Number(r.area_sqft || 0), 0);

    return (
        <div className="flex" style={{ height: 'calc(100vh - 112px)', overflow: 'hidden' }}>

            {/* ╔══════════════════════════════════╗
                ║  LEFT SIDEBAR — Floors List      ║
                ╚══════════════════════════════════╝ */}
            <aside style={{ width: 256, flexShrink: 0 }}
                className="flex flex-col bg-[var(--t-surface)] border-r border-[var(--t-border)]">

                {/* Sidebar header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--t-border)] shrink-0">
                    <div>
                        <p className="text-xs font-black text-[var(--t-text)] uppercase tracking-widest">Floors</p>
                        <p className="text-[9px] text-[var(--t-text3)] mt-0.5">{filteredFloors.length} total · {totalRooms} rooms</p>
                    </div>
                    <button onClick={() => handleOpenModal()}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white text-base font-bold transition-all hover:opacity-80"
                        style={{ background: '#ea580c' }} title="Add new floor">
                        +
                    </button>
                </div>

                {/* Floor list */}
                <div className="flex-1 overflow-y-auto">
                    {filteredFloors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <span className="text-3xl mb-2">🏗️</span>
                            <p className="text-xs font-bold text-[var(--t-text2)]">No floors yet</p>
                            <p className="text-[10px] text-[var(--t-text3)] mt-1">Click + to add your first floor</p>
                        </div>
                    ) : (
                        filteredFloors.map(floor => {
                            const fCol  = floorColor(floor.level);
                            const isAct = floor.level === activeLevel;
                            const pct   = floorPct(floor);
                            const sqft  = floorSqft(floor);
                            return (
                                <button key={floor.id}
                                    onClick={() => setActiveLevel(floor.level)}
                                    className="relative w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all border-b border-[var(--t-border)] group"
                                    style={{ background: isAct ? `color-mix(in srgb, ${fCol} 8%, var(--t-surface2))` : undefined }}>

                                    {/* Active accent bar */}
                                    {isAct && (
                                        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                                            style={{ background: fCol }} />
                                    )}

                                    {/* Level badge */}
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0 mt-0.5"
                                        style={{ background: isAct ? fCol : `color-mix(in srgb, ${fCol} 60%, #94a3b8)` }}>
                                        {floor.level === 0 ? 'G' : `F${floor.level}`}
                                    </div>

                                    {/* Floor info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-bold text-[var(--t-text)] truncate leading-tight"
                                            style={{ color: isAct ? fCol : undefined }}>
                                            {floor.name.split('/')[0].trim()}
                                        </p>
                                        {floor.name.includes('/') && (
                                            <p className="text-[9px] text-[var(--t-text3)] truncate mt-0.5">
                                                {floor.name.split('/')[1]?.trim()}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[9px] font-semibold text-[var(--t-text3)]">
                                                {floor.rooms?.length || 0} rooms
                                            </span>
                                            {sqft > 0 && (
                                                <span className="text-[9px] text-[var(--t-text3)]">· {sqft.toFixed(0)} ft²</span>
                                            )}
                                        </div>

                                        {/* Mini progress bar */}
                                        {(floor.rooms?.length || 0) > 0 && (
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <div className="flex-1 h-1 rounded-full bg-[var(--t-border)] overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%`, background: fCol }} />
                                                </div>
                                                <span className="text-[8px] font-black shrink-0"
                                                    style={{ color: isAct ? fCol : 'var(--t-text3)' }}>{pct}%</span>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Sidebar footer — global summary */}
                <div className="px-4 py-3 border-t border-[var(--t-border)] shrink-0 bg-[var(--t-surface2)]">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                            [totalRooms,           'Rooms'],
                            [totalSqft.toFixed(0), 'Sqft'],
                            [`${globalPct}%`,       'Done'],
                        ].map(([val, lbl]) => (
                            <div key={lbl}>
                                <p className="text-sm font-black text-[var(--t-text)]">{val}</p>
                                <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--t-text3)]">{lbl}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* ╔═══════════════════════════════════════════════════════════╗
                ║  RIGHT CONTENT — Floor Detail                             ║
                ╚═══════════════════════════════════════════════════════════╝ */}
            <main className="flex-1 flex flex-col min-w-0 bg-[var(--t-surface2)]">

                {activeFloor ? (<>
                    {/* ── Floor header bar ─────────────────────────────────── */}
                    <div className="flex items-center gap-3 px-5 py-3 bg-[var(--t-surface)] border-b border-[var(--t-border)] shrink-0">

                        {/* Floor identity */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                                style={{ background: fc }}>
                                {activeFloor.level === 0 ? 'G' : `F${activeFloor.level}`}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-black text-[var(--t-text)] truncate leading-tight">
                                    {activeFloor.name.split('/')[0].trim()}
                                </h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-[var(--t-text3)]">Level {activeFloor.level}</span>
                                    <span className="text-[var(--t-border)]">·</span>
                                    <span className="text-[10px] text-[var(--t-text3)]">{visibleRooms.length} rooms</span>
                                    {floorTotalSqft > 0 && <>
                                        <span className="text-[var(--t-border)]">·</span>
                                        <span className="text-[10px] text-[var(--t-text3)]">{floorTotalSqft.toFixed(1)} ft²</span>
                                    </>}
                                    {/* completion badge */}
                                    {visibleRooms.length > 0 && (() => {
                                        const done = visibleRooms.filter(r => r.status === 'COMPLETED').length;
                                        const pct = Math.round(done / visibleRooms.length * 100);
                                        return (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
                                                style={{ background: `color-mix(in srgb, ${fc} 15%, transparent)`, color: fc }}>
                                                {pct}% done
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* View toggle */}
                        <div className="flex rounded-xl overflow-hidden border border-[var(--t-border)] shrink-0" style={{ padding: 2, gap: 2 }}>
                            {[['grid', '⊞ Grid'], ['plan', '📐 Plan']].map(([mode, label]) => (
                                <button key={mode} onClick={() => setViewMode(mode)}
                                    className="px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                    style={viewMode === mode
                                        ? { background: fc, color: '#fff' }
                                        : { color: 'var(--t-text3)' }}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => handleOpenRoomModal(null, activeFloor.id)}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-white transition-all hover:opacity-85"
                                style={{ background: fc }}>
                                + Add Room
                            </button>
                            <button onClick={() => handleOpenModal(activeFloor)}
                                className="px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border border-[var(--t-border)] text-[var(--t-text2)] hover:text-[var(--t-text)] hover:bg-[var(--t-surface2)] transition-all">
                                Edit
                            </button>
                            <button onClick={() => handleDelete(activeFloor.id)}
                                className="px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-red-400 hover:bg-red-50 transition-all">
                                Del
                            </button>
                        </div>
                    </div>

                    {/* ── Plan canvas / Room grid ───────────────────────────── */}
                    {viewMode === 'plan' ? (
                        /* Full-height plan canvas */
                        <FloorPlanCanvas
                            floor={activeFloor}
                            floorColor={fc}
                            onRoomClick={r => { setSelectedRoomId(r.id); setPanelRoom(r); }}
                            onRoomSaved={handleRoomSaved}
                            onCreateRoom={handleCreateRoom}
                            height="calc(100vh - 164px)"
                        />
                    ) : (
                        /* Room cards grid */
                        <div className="flex-1 overflow-y-auto p-5">
                            {visibleRooms.length > 0 ? (
                                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
                                    {visibleRooms.map(room => (
                                        <RoomCard
                                            key={room.id}
                                            room={room}
                                            floorColor={fc}
                                            floorTotalSqft={floorTotalSqft}
                                            onEdit={r => handleOpenRoomModal(r, activeFloor.id)}
                                            onDelete={handleDeleteRoom}
                                            onSelect={r => { setSelectedRoomId(r.id); setPanelRoom(r); }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-5"
                                        style={{ background: `color-mix(in srgb, ${fc} 10%, var(--t-surface))` }}>
                                        🏠
                                    </div>
                                    <p className="text-base font-black text-[var(--t-text2)]">No rooms yet</p>
                                    <p className="text-sm text-[var(--t-text3)] mt-1 mb-5">
                                        Add rooms to start planning this floor
                                    </p>
                                    <button onClick={() => handleOpenRoomModal(null, activeFloor.id)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-85"
                                        style={{ background: fc }}>
                                        + Add First Room
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>) : (
                    /* No floor selected */
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                        <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-6"
                            style={{ background: 'color-mix(in srgb, #ea580c 8%, var(--t-surface))' }}>
                            🏗️
                        </div>
                        <p className="text-lg font-black text-[var(--t-text2)]">Select a Floor</p>
                        <p className="text-sm text-[var(--t-text3)] mt-2 max-w-xs leading-relaxed">
                            Click any floor from the sidebar to view and manage its rooms and layout
                        </p>
                    </div>
                )}
            </main>

            {Modals}
        </div>
    );
};

export default FloorsTab;
