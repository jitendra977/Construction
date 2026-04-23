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

/* ── Room Detail Panel — Design Inspector ────────────────────────────────── */
const RoomDetailPanel = ({ room, floorName, floorColor: fc, onClose, onEdit, onDelete }) => {
    const st = STATUS[room?.status] || STATUS.NOT_STARTED;

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!room) return null;

    const nameParts = room.name.split('/');
    const nameEn    = nameParts[0]?.trim() || room.name;
    const nameNe    = nameParts[1]?.trim() || '';
    const W  = room.width_cm  || 0;
    const D  = room.depth_cm  || 0;
    const px = room.pos_x     || 0;
    const py = room.pos_y     || 0;
    const areaSqft = Number(room.area_sqft || (W && D ? W * D / 929.03 : 0));
    const areaM2   = W && D ? (W * D / 10000) : 0;
    const budget   = Number(room.budget_allocation || 0);

    // Mini SVG room preview dimensions
    const PRV = 200, PRV_PAD = 28;
    const scale   = Math.min((PRV - PRV_PAD * 2) / (W || 1), (PRV - PRV_PAD * 2) / (D || 1));
    const rW      = W * scale, rH = D * scale;
    const rX      = (PRV - rW) / 2,  rY = (PRV - rH) / 2;
    const dimFont = 9;

    // Property row helper
    const Prop = ({ label, value, mono = false, accent = false }) => (
        <div className="flex items-center justify-between py-2 border-b border-[var(--t-border)] last:border-0">
            <span className="text-[10px] font-semibold text-[var(--t-text3)]">{label}</span>
            <span className={`text-[11px] font-black ${mono ? 'font-mono' : ''} ${accent ? '' : 'text-[var(--t-text)]'}`}
                  style={accent ? { color: fc } : {}}>
                {value}
            </span>
        </div>
    );

    // Section header helper
    const Section = ({ label, children }) => (
        <div className="px-4 pb-1">
            <div className="flex items-center gap-2 py-2.5">
                <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--t-text3)]">{label}</span>
                <div className="flex-1 h-px bg-[var(--t-border)]" />
            </div>
            {children}
        </div>
    );

    return (
        /* Panel sits over the page without blurring it */
        <div
            className="fixed right-0 top-0 h-full z-50 flex"
            style={{ width: 296 }}
        >
            {/* thin click-away strip */}
            <div className="absolute inset-0 -left-[100vw]" onClick={onClose} />

            <div
                className="relative flex flex-col h-full w-full shadow-[−4px_0_32px_rgba(0,0,0,0.18)]"
                style={{
                    background: 'var(--t-surface)',
                    borderLeft: '1px solid var(--t-border)',
                }}
            >
                {/* ── Top accent bar ── */}
                <div className="h-[3px] w-full shrink-0" style={{ background: fc }} />

                {/* ── Panel header ── */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--t-border)] shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
                             style={{ background: `color-mix(in srgb, ${fc} 14%, var(--t-surface2))` }}>
                            {roomIcon(room.name)}
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-[var(--t-text)] leading-tight truncate max-w-[160px]">{nameEn}</p>
                            {nameNe
                                ? <p className="text-[9px] text-[var(--t-text3)] leading-tight">{nameNe}</p>
                                : <p className="text-[9px] text-[var(--t-text3)] leading-tight">{floorName?.split('/')[0]?.trim()}</p>
                            }
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--t-text3)] hover:bg-[var(--t-surface2)] hover:text-[var(--t-text)] text-xs transition-colors shrink-0"
                    >✕</button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

                    {/* ── Mini room preview SVG ── */}
                    {W > 0 && D > 0 && (
                        <div className="px-4 py-4 border-b border-[var(--t-border)]">
                            <svg width={PRV} height={PRV} style={{ display: 'block', margin: '0 auto', background: '#f8f7f4', borderRadius: 10, border: '1px solid var(--t-border)' }}>
                                {/* grid dots */}
                                <pattern id="rdot" width="12" height="12" patternUnits="userSpaceOnUse">
                                    <circle cx="0" cy="0" r="0.7" fill="#d1d5db"/>
                                </pattern>
                                <rect width={PRV} height={PRV} fill="url(#rdot)" rx="10"/>

                                {/* room fill */}
                                <rect x={rX} y={rY} width={rW} height={rH}
                                      fill={`color-mix(in srgb, ${fc} 16%, #fff)`}
                                      stroke={fc} strokeWidth="2" rx="3"/>

                                {/* hatch lines inside */}
                                <clipPath id="rclip">
                                    <rect x={rX} y={rY} width={rW} height={rH} rx="3"/>
                                </clipPath>
                                <g clipPath="url(#rclip)" opacity="0.25">
                                    {Array.from({ length: 16 }, (_, i) => (
                                        <line key={i} x1={rX + i * 14 - 40} y1={rY} x2={rX + i * 14 - 40 + rH + 40} y2={rY + rH}
                                              stroke={fc} strokeWidth="4"/>
                                    ))}
                                </g>

                                {/* corner marks */}
                                {[[rX, rY],[rX+rW, rY],[rX, rY+rH],[rX+rW, rY+rH]].map(([cx,cy],i) => (
                                    <rect key={i} x={cx-3} y={cy-3} width={6} height={6} fill={fc} rx="1"/>
                                ))}

                                {/* room icon + name */}
                                <text x={PRV/2} y={rY+rH/2-8} textAnchor="middle" dominantBaseline="central" fontSize="22" style={{userSelect:'none'}}>{roomIcon(room.name)}</text>
                                <text x={PRV/2} y={rY+rH/2+14} textAnchor="middle" fontSize="9" fontWeight="700" fill={fc} fontFamily="'Inter',system-ui" style={{userSelect:'none'}}>
                                    {nameEn.split(' ').slice(0,2).join(' ')}
                                </text>

                                {/* width dimension arrow (top) */}
                                <line x1={rX} y1={rY-11} x2={rX+rW} y2={rY-11} stroke="#64748b" strokeWidth="1"/>
                                <line x1={rX} y1={rY-15} x2={rX} y2={rY-7} stroke="#64748b" strokeWidth="1"/>
                                <line x1={rX+rW} y1={rY-15} x2={rX+rW} y2={rY-7} stroke="#64748b" strokeWidth="1"/>
                                <text x={rX+rW/2} y={rY-16} textAnchor="middle" fontSize={dimFont} fontWeight="700" fill="#475569" fontFamily="monospace">
                                    {(W/100).toFixed(2)}m
                                </text>

                                {/* depth dimension arrow (right) */}
                                <line x1={rX+rW+11} y1={rY} x2={rX+rW+11} y2={rY+rH} stroke="#64748b" strokeWidth="1"/>
                                <line x1={rX+rW+7} y1={rY} x2={rX+rW+15} y2={rY} stroke="#64748b" strokeWidth="1"/>
                                <line x1={rX+rW+7} y1={rY+rH} x2={rX+rW+15} y2={rY+rH} stroke="#64748b" strokeWidth="1"/>
                                <text x={rX+rW+20} y={rY+rH/2} textAnchor="middle" fontSize={dimFont} fontWeight="700" fill="#475569" fontFamily="monospace"
                                      transform={`rotate(90,${rX+rW+20},${rY+rH/2})`}>
                                    {(D/100).toFixed(2)}m
                                </text>

                                {/* area badge */}
                                <rect x={PRV/2-28} y={rY+rH-20} width={56} height={16} fill="white" fillOpacity="0.85" rx="4"/>
                                <text x={PRV/2} y={rY+rH-12} textAnchor="middle" fontSize="8" fontWeight="800" fill={fc} fontFamily="monospace">
                                    {areaSqft.toFixed(1)} ft²
                                </text>
                            </svg>
                        </div>
                    )}

                    {/* ── GEOMETRY section ── */}
                    <Section label="Geometry">
                        <div className="space-y-0">
                            <Prop label="Width (W)" value={`${(W/100).toFixed(2)} m  ·  ${(W/30.48).toFixed(1)}'`} mono accent />
                            <Prop label="Depth (D)" value={`${(D/100).toFixed(2)} m  ·  ${(D/30.48).toFixed(1)}'`} mono accent />
                            <Prop label="Raw (cm)" value={`${W} × ${D}`} mono />
                        </div>
                    </Section>

                    {/* ── AREA section ── */}
                    <Section label="Area">
                        <div className="flex gap-2 pb-2">
                            <div className="flex-1 rounded-lg border border-[var(--t-border)] px-3 py-2.5 text-center" style={{ background: `color-mix(in srgb, ${fc} 6%, var(--t-surface2))` }}>
                                <p className="text-lg font-black leading-none" style={{ color: fc }}>{areaSqft.toFixed(1)}</p>
                                <p className="text-[8px] font-bold text-[var(--t-text3)] mt-0.5 uppercase tracking-wide">sqft</p>
                            </div>
                            <div className="flex-1 rounded-lg border border-[var(--t-border)] px-3 py-2.5 text-center" style={{ background: 'var(--t-surface2)' }}>
                                <p className="text-lg font-black text-[var(--t-text)] leading-none">{areaM2.toFixed(2)}</p>
                                <p className="text-[8px] font-bold text-[var(--t-text3)] mt-0.5 uppercase tracking-wide">m²</p>
                            </div>
                        </div>
                        {/* Proportion bar */}
                        {W > 0 && D > 0 && (() => {
                            const ratio = W / D;
                            const barW  = Math.min(Math.max(ratio / (ratio + 1), 0.2), 0.8);
                            return (
                                <div className="pb-2">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className="h-5 rounded-sm border"
                                             style={{ width: `${barW * 100}%`, background: `color-mix(in srgb, ${fc} 20%, var(--t-surface3))`, borderColor: `color-mix(in srgb, ${fc} 40%, transparent)` }} />
                                    </div>
                                    <p className="text-[8px] text-[var(--t-text3)] font-mono">Ratio {W}:{D} cm</p>
                                </div>
                            );
                        })()}
                    </Section>

                    {/* ── POSITION section ── */}
                    {(room.pos_x != null && room.pos_y != null) && (
                        <Section label="Position">
                            <div className="grid grid-cols-2 gap-2 pb-2">
                                {[
                                    { lbl: 'X (→ from left)', val: (px/100).toFixed(2)+'m' },
                                    { lbl: 'Y (↓ from top)',  val: (py/100).toFixed(2)+'m' },
                                ].map(({ lbl, val }) => (
                                    <div key={lbl} className="rounded-lg border border-[var(--t-border)] bg-[var(--t-surface2)] px-2.5 py-2">
                                        <p className="text-[8px] font-semibold text-[var(--t-text3)] mb-0.5">{lbl}</p>
                                        <p className="text-[11px] font-black font-mono text-[var(--t-text)]">{val}</p>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* ── STATUS + BUDGET section ── */}
                    <Section label="Properties">
                        <div className="space-y-0">
                            <div className="flex items-center justify-between py-2 border-b border-[var(--t-border)]">
                                <span className="text-[10px] font-semibold text-[var(--t-text3)]">Status</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide"
                                      style={{ background: st.fill, color: st.stroke, border: `1px solid ${st.stroke}33` }}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.stroke }} />
                                    {st.label}
                                </span>
                            </div>
                            <Prop label="Floor" value={floorName?.split('/')[0]?.trim() || '—'} />
                            {budget > 0 && (
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-[10px] font-semibold text-[var(--t-text3)]">Budget</span>
                                    <span className="text-[11px] font-black" style={{ color: fc }}>
                                        NPR {budget.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Section>

                    <div className="h-4" />
                </div>

                {/* ── Footer actions ── */}
                <div className="shrink-0 border-t border-[var(--t-border)] p-3 flex gap-2" style={{ background: 'var(--t-surface)' }}>
                    <button
                        onClick={() => { onEdit(room); onClose(); }}
                        className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-90 text-white shadow-sm"
                        style={{ background: fc }}
                    >
                        ✏️ Edit
                    </button>
                    <button
                        onClick={() => { onDelete(room.id); onClose(); }}
                        className="px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                        🗑️
                    </button>
                </div>
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
const FloorPlanCanvas = ({ floor, floorColor: fc, onRoomClick }) => {
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

    const containerRef = useRef(null);
    // interaction state machine (ref for perf — no re-render)
    const ia = useRef({ mode: 'idle' }); // mode: idle | pan | move | resize
    // always-fresh refs for event handlers
    const panRef    = useRef(pan);
    const zoomRef   = useRef(zoom);
    const snapRef   = useRef(snapOn);
    useEffect(() => { panRef.current  = pan;    }, [pan]);
    useEffect(() => { zoomRef.current = zoom;   }, [zoom]);
    useEffect(() => { snapRef.current = snapOn; }, [snapOn]);

    const rooms     = floor?.rooms || [];
    const W         = floor?.plan_width_cm  || 1000;
    const H         = floor?.plan_depth_cm  || 700;
    const PAD       = PAD_SVG;
    const svgW      = W + PAD * 2;
    const svgH      = H + PAD * 2 + 45;
    const hasLayout = rooms.some(r => r.width_cm && r.depth_cm);

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

    // ── mouse: room mousedown (starts move or resize) ──────────────────────
    const onRoomDown = (e, room) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        const cm     = toCm(e.clientX, e.clientY);
        const handle = getHandle(cm.x, cm.y, room);
        ia.current   = { mode: handle ? 'resize' : 'move', roomId: room.id,
                          handle, startCm: cm, startRoom: { ...room }, moved: false };
        setIsEditing(true);
        setHoveredId(room.id);
        setTooltip(null);
        setCursor(handle ? (HANDLE_CURSORS[handle] || 'move') : 'move');
    };

    // ── mouse: container mousedown (starts pan) ────────────────────────────
    const onContainerDown = (e) => {
        if (e.button !== 0) return;
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

        // ── move / resize ──
        if (state.mode === 'move' || state.mode === 'resize') {
            const cm = toCm(e.clientX, e.clientY);
            const dx = cm.x - state.startCm.x, dy = cm.y - state.startCm.y;
            if (Math.abs(dx) > 2 / zoomRef.current || Math.abs(dy) > 2 / zoomRef.current) state.moved = true;
            if (!state.moved) return;

            const sr = state.startRoom;
            let upd = {};

            if (state.mode === 'move') {
                upd = {
                    pos_x: snp(Math.max(0, Math.min(W - sr.width_cm,  sr.pos_x + dx))),
                    pos_y: snp(Math.max(0, Math.min(H - sr.depth_cm, sr.pos_y + dy))),
                };
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
        setCursor('grab');

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
            await dashboardService.updateRoom(roomId, {
                pos_x:     updated.pos_x,
                pos_y:     updated.pos_y,
                width_cm:  updated.width_cm,
                depth_cm:  updated.depth_cm,
                area_sqft: +(updated.width_cm * updated.depth_cm / 929.03).toFixed(2),
            });
        } catch {
            // revert on error
            setLocalRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...startRoom } : r));
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
            style={{ height: 530, background: '#f4f2ec', cursor }}
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
                <span className="text-[9px] font-semibold text-gray-400 bg-white/70 backdrop-blur px-2.5 py-1 rounded-full border border-gray-200">
                    Drag room to move · Drag wall/corner to resize · Click to open
                </span>
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
                        const rx   = PAD + (room.pos_x || 0), ry = PAD + (room.pos_y || 0);
                        const rw   = room.width_cm, rd = room.depth_cm;
                        const st   = STATUS[room.status] || STATUS.NOT_STARTED;
                        const isH  = hoveredId === room.id;
                        const isSv = savingId === room.id;
                        const sqft = (rw * rd / 929.03).toFixed(1);
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
                        const lcx     = rx + rw / 2, lcy = ry + rd / 2;
                        const hasLines = rd > 85 && big;

                        return (
                            <g key={room.id} style={{ cursor: 'inherit' }}
                                onMouseDown={e => onRoomDown(e, room)}
                                onMouseEnter={e => {
                                    if (ia.current.mode !== 'idle') return;
                                    setHoveredId(room.id);
                                    const cRect = containerRef.current?.getBoundingClientRect();
                                    setTooltip({ room, x: e.clientX - (cRect?.left || 0), y: e.clientY - (cRect?.top || 0) });
                                }}
                                onMouseLeave={() => {
                                    if (ia.current.mode !== 'idle') return;
                                    setHoveredId(null);
                                    setTooltip(null);
                                }}
                            >
                                {/* Fill */}
                                <rect x={rx} y={ry} width={rw} height={rd}
                                    fill={st.fill} fillOpacity={isH ? 0.95 : 0.85}
                                    stroke={isH ? st.stroke : '#94a3b8'}
                                    strokeWidth={isH ? IW * 2 : IW}
                                    filter={isSv ? 'url(#saving-glow)' : isH ? `url(#glow-${floor?.id})` : undefined}
                                />
                                {isH && <rect x={rx} y={ry} width={rw} height={rd} fill={st.stroke} fillOpacity="0.06" />}

                                {/* Interior label */}
                                {big && (
                                    <g style={{ pointerEvents: 'none' }}>
                                        <text x={lcx} y={hasLines ? lcy - iconSz * 0.85 : lcy - iconSz * 0.3}
                                            textAnchor="middle" dominantBaseline="central" fontSize={iconSz} style={{ userSelect: 'none' }}>{icon}</text>
                                        {hasLines && (
                                            <>
                                                <text x={lcx} y={lcy + nameSz * 0.6} textAnchor="middle" dominantBaseline="central"
                                                    fontSize={nameSz} fontWeight="700" fill={isH ? st.stroke : '#1e293b'} fontFamily="'Inter',system-ui" style={{ userSelect: 'none' }}>{line1}</text>
                                                {line2 && <text x={lcx} y={lcy + nameSz * 2} textAnchor="middle" dominantBaseline="central"
                                                    fontSize={nameSz} fontWeight="700" fill={isH ? st.stroke : '#1e293b'} fontFamily="'Inter',system-ui" style={{ userSelect: 'none' }}>{line2}</text>}
                                            </>
                                        )}
                                        {!hasLines && <text x={lcx} y={lcy + iconSz * 0.7} textAnchor="middle" dominantBaseline="central"
                                            fontSize={Math.min(nameSz, 12)} fontWeight="700" fill={isH ? st.stroke : '#1e293b'} fontFamily="'Inter',system-ui" style={{ userSelect: 'none' }}>{words.slice(0, 2).join(' ')}</text>}
                                        {rd > 110 && <text x={lcx} y={ry + rd - dimSz * 1.6} textAnchor="middle" fontSize={dimSz} fontWeight="600" fill="#64748b" fontFamily="monospace" style={{ userSelect: 'none' }}>{m(rw)} × {m(rd)}</text>}
                                        {rd > 140 && <text x={lcx} y={ry + rd - dimSz * 0.3} textAnchor="middle" fontSize={dimSz - 1} fill="#94a3b8" fontFamily="monospace" style={{ userSelect: 'none' }}>{sqft} ft²</text>}
                                    </g>
                                )}
                                {!big && minSide > 28 && (
                                    <text x={lcx} y={lcy} textAnchor="middle" dominantBaseline="central"
                                        fontSize={Math.min(minSide * 0.38, 22)} style={{ userSelect: 'none', pointerEvents: 'none' }}>{icon}</text>
                                )}

                                {/* Per-room width tick */}
                                {rw > 150 && (
                                    <g style={{ pointerEvents: 'none' }}>
                                        <line x1={rx+4} y1={ry-8} x2={rx+rw-4} y2={ry-8} stroke="#94a3b8" strokeWidth="0.7"/>
                                        <line x1={rx+4} y1={ry-11} x2={rx+4} y2={ry-5} stroke="#94a3b8" strokeWidth="0.7"/>
                                        <line x1={rx+rw-4} y1={ry-11} x2={rx+rw-4} y2={ry-5} stroke="#94a3b8" strokeWidth="0.7"/>
                                        <text x={rx+rw/2} y={ry-11} textAnchor="middle" fontSize={dimSz-1} fill="#94a3b8" fontFamily="monospace" style={{ userSelect: 'none' }}>{m(rw)}</text>
                                    </g>
                                )}

                                {/* Resize handles — visible only on hovered room */}
                                {isH && handlePos(room).map(({ x, y, h }) => (
                                    <rect key={h}
                                        x={x - handleSzCm / 2} y={y - handleSzCm / 2}
                                        width={handleSzCm} height={handleSzCm}
                                        fill="white" stroke={fc} strokeWidth={handleSzCm * 0.18}
                                        rx={handleSzCm * 0.2}
                                        style={{ cursor: HANDLE_CURSORS[h] || 'move', pointerEvents: 'all' }}
                                    />
                                ))}

                                {/* Saving pulse ring */}
                                {isSv && <rect x={rx-3} y={ry-3} width={rw+6} height={rd+6} fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="12 6" rx="4" opacity="0.7"/>}
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
    const [selectedRoom, setSelectedRoom]     = useState(null);
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

    const inp = 'w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] text-[var(--t-text)] focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30 transition-all';
    const lbl = 'block text-[10px] font-black text-[var(--t-text3)] uppercase tracking-widest mb-1.5';

    return (
        <div className="space-y-5">
            {/* ── Global stat bar ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Floors / तल्लाहरू',    value: floors.length,         sub: 'levels',              accent: '#ea580c' },
                    { label: 'Rooms / कोठाहरू',       value: totalRooms,            sub: 'spaces',              accent: '#3b82f6' },
                    { label: 'Total Area / क्षेत्र',  value: totalSqft.toFixed(0),  sub: 'sqft',                accent: '#8b5cf6' },
                    { label: 'Complete / सकियो',       value: `${globalPct}%`,       sub: `${totalDone}/${totalRooms} rooms`, accent: '#10b981' },
                ].map(({ label, value, sub, accent }) => (
                    <div key={label} className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl p-4 shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-wider text-[var(--t-text3)] mb-1">{label}</p>
                        <p className="text-2xl font-black" style={{ color: accent }}>{value}</p>
                        <p className="text-[9px] text-[var(--t-text3)] mt-0.5">{sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Main layout ─────────────────────────────────────────── */}
            <div className="flex gap-5 items-start">

                {/* Left: Building elevation */}
                <div className="w-52 shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text3)]">Building</p>
                        <button onClick={() => handleOpenModal()}
                            className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-dashed border-[var(--t-primary)]/50 text-[var(--t-primary)] hover:bg-[var(--t-primary)]/5 transition-colors">
                            + Floor
                        </button>
                    </div>
                    {filteredFloors.length > 0
                        ? <BuildingElevation floors={filteredFloors} activeLevel={activeLevel} onSelect={setActiveLevel} />
                        : <div className="p-6 text-center text-[var(--t-text3)] text-xs border-2 border-dashed border-[var(--t-border)] rounded-xl">No floors yet</div>
                    }
                </div>

                {/* Right: Floor detail */}
                <div className="flex-1 min-w-0">
                    {activeFloor ? (
                        <div className="space-y-4">
                            {/* Floor header */}
                            <div className="rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                style={{
                                    borderColor: fc,
                                    background: `linear-gradient(135deg, color-mix(in srgb, ${fc} 6%, var(--t-surface)), var(--t-surface))`,
                                }}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                                            style={{ background: `color-mix(in srgb, ${fc} 15%, transparent)`, color: fc }}>
                                            Level {activeFloor.level}
                                        </span>
                                        <span className="text-[9px] text-[var(--t-text3)]">
                                            {activeFloor.rooms?.length || 0} rooms · {floorTotalSqft.toFixed(0)} sqft
                                            {activeFloor.plan_width_cm && (
                                                <span className="ml-2 font-mono">
                                                    · {(activeFloor.plan_width_cm/100).toFixed(2)}m × {(activeFloor.plan_depth_cm/100).toFixed(2)}m
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <h2 className="text-lg font-black text-[var(--t-text)]">{activeFloor.name}</h2>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                    {/* View toggle */}
                                    <div className="flex items-center bg-[var(--t-surface2)] rounded-xl p-0.5 border border-[var(--t-border)]">
                                        {[
                                            { key: 'grid', icon: '⊞', label: 'Grid' },
                                            { key: 'plan', icon: '📐', label: 'Plan' },
                                        ].map(({ key, icon, label }) => (
                                            <button key={key} onClick={() => setViewMode(key)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                                    viewMode === key
                                                        ? 'text-white shadow-sm'
                                                        : 'text-[var(--t-text3)] hover:text-[var(--t-text)]'
                                                }`}
                                                style={{ background: viewMode === key ? fc : 'transparent' }}>
                                                {icon} {label}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => handleOpenRoomModal(null, activeFloor.id)}
                                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-90 shadow-md"
                                        style={{ background: fc }}>
                                        + Add Room
                                    </button>
                                    <button onClick={() => handleOpenModal(activeFloor)}
                                        className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-[var(--t-border)] text-[var(--t-text2)] hover:text-[var(--t-text)] transition-colors">
                                        Edit
                                    </button>
                                    <button onClick={() => handleDelete(activeFloor.id)}
                                        className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                                        Del
                                    </button>
                                </div>
                            </div>

                            {/* Room status summary strip */}
                            {activeFloor.rooms?.length > 0 && (
                                <div className="flex gap-4 px-1">
                                    {['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].map(s => {
                                        const count = (activeFloor.rooms || []).filter(r => r.status === s).length;
                                        if (!count) return null;
                                        return (
                                            <div key={s} className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full" style={{ background: STATUS[s].dot }} />
                                                <span className="text-[10px] font-bold text-[var(--t-text3)]">{count} {STATUS[s].label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* ── Plan View ── */}
                            {viewMode === 'plan' && (
                                <FloorPlanCanvas
                                    floor={activeFloor}
                                    floorColor={fc}
                                    onRoomClick={(r) => setSelectedRoom(r)}
                                />
                            )}

                            {/* ── Grid View ── */}
                            {viewMode === 'grid' && (
                                visibleRooms.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                        {visibleRooms.map(room => (
                                            <RoomCard key={room.id} room={room} floorColor={fc}
                                                floorTotalSqft={floorTotalSqft}
                                                onEdit={(r) => handleOpenRoomModal(r, activeFloor.id)}
                                                onDelete={handleDeleteRoom}
                                                onSelect={(r) => setSelectedRoom(r)} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 border-2 border-dashed border-[var(--t-border)] rounded-2xl text-center">
                                        <p className="text-3xl mb-2">🏗️</p>
                                        <p className="text-sm font-bold text-[var(--t-text3)]">No rooms on this floor yet</p>
                                        <button onClick={() => handleOpenRoomModal(null, activeFloor.id)}
                                            className="mt-3 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white"
                                            style={{ background: fc }}>
                                            + Add First Room
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                    ) : (
                        <div className="p-16 text-center border-2 border-dashed border-[var(--t-border)] rounded-2xl">
                            <p className="text-4xl mb-3">🏢</p>
                            <p className="text-sm font-bold text-[var(--t-text3)]">No floors found</p>
                            <button onClick={() => handleOpenModal()}
                                className="mt-4 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-[var(--t-primary)] text-white">
                                + Add First Floor
                            </button>
                        </div>
                    )}
                </div>
            </div>

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

            {/* ── Room Detail Panel ────────────────────────────────────── */}
            {selectedRoom && (
                <RoomDetailPanel
                    room={selectedRoom}
                    floorName={activeFloor?.name}
                    floorColor={fc}
                    onClose={() => setSelectedRoom(null)}
                    onEdit={(r) => { handleOpenRoomModal(r, activeFloor.id); }}
                    onDelete={(id) => { handleDeleteRoom(id); }}
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
        </div>
    );
};

export default FloorsTab;
