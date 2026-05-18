/**
 * DailySheetTab.jsx — Advanced attendance sheet
 * ─────────────────────────────────────────────────────────────────────────────
 * Features:
 *  • Day navigation  ← Yesterday │ Today │ Tomorrow →
 *  • Live count ring (Present / Absent / Unmarked)
 *  • Quick-tap status cycle: tap avatar → cycles P → H → A → L → P
 *  • Swipe-to-mark on mobile (swipe right = PRESENT, swipe left = ABSENT)
 *  • Auto-save with 3-second debounce (shows "Saving…" indicator)
 *  • Search workers by name
 *  • Filter by status (All / Present / Absent / Half / Leave)
 *  • Mark All / Copy Previous / Set Holiday
 *  • OT stepper (− 0.5 +) per worker
 *  • Notes inline per worker
 *  • Late arrival badge (from QR scan log)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import attendanceService from '../../services/attendanceService';
import workforceService from '../../services/workforceService';
import QRScannerTab from './QRScannerTab';
import ConfirmModal from '../../components/common/ConfirmModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: 'PRESENT',  label: 'Present',  short: 'P',  emoji: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
    { value: 'ABSENT',   label: 'Absent',   short: 'A',  emoji: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
    { value: 'HALF_DAY', label: 'Half',     short: 'H',  emoji: '🌓', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
    { value: 'LEAVE',    label: 'Leave',    short: 'L',  emoji: '🏖️', color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
    { value: 'HOLIDAY',  label: 'Holiday',  short: 'HO', emoji: '🎉', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
];
const STATUS_CYCLE = ['PRESENT', 'HALF_DAY', 'ABSENT', 'LEAVE'];
const sMeta = {
    ...Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s])),
    "": { value: "", label: "Unmarked", short: "—", emoji: "⚪", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" }
};

function todayStr() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function shiftDate(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const today = todayStr();
    const yest  = shiftDate(today, -1);
    const tom   = shiftDate(today, +1);
    if (dateStr === today) return { label: 'Today', sub: d.toLocaleDateString('en-NP', { weekday:'long', month:'short', day:'numeric' }) };
    if (dateStr === yest)  return { label: 'Yesterday', sub: d.toLocaleDateString('en-NP', { weekday:'long', month:'short', day:'numeric' }) };
    if (dateStr === tom)   return { label: 'Tomorrow', sub: d.toLocaleDateString('en-NP', { weekday:'long', month:'short', day:'numeric' }) };
    return { label: d.toLocaleDateString('en-NP', { weekday:'short', month:'short', day:'numeric' }), sub: d.getFullYear().toString() };
}

function useIsMobile() {
    const [m, setM] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const fn = () => setM(window.innerWidth < 768);
        window.addEventListener('resize', fn);
        return () => window.removeEventListener('resize', fn);
    }, []);
    return m;
}

/**
 * Derive attendance status from punch times + project settings:
 *
 *  No check_in                       → null         (don't touch manual status)
 *  check_in only, no check_out       → HALF_DAY     (on-site but incomplete)
 *  Both times, net worked ≥ half std → PRESENT
 *  Both times, net worked  < half std→ HALF_DAY     (left early)
 *
 * "Half the standard day" = (working_hours_per_day × 60) / 2  minus break.
 * Falls back to 4 h threshold when no settings are loaded.
 */
function autoStatusFromTimes(check_in, check_out, settings) {
    if (!check_in) return null;

    // Only check-in stamped → incomplete shift
    if (!check_out) return 'HALF_DAY';

    // Both times present → compare net worked hours to half-day threshold
    const [inH,  inM]  = check_in.split(':').map(Number);
    const [outH, outM] = check_out.split(':').map(Number);
    const grossMins    = (outH * 60 + outM) - (inH * 60 + inM);

    if (grossMins <= 0) return 'HALF_DAY'; // checkout before check-in

    const breakMins    = parseFloat(settings?.break_minutes    || 0);
    const stdMins      = parseFloat(settings?.working_hours_per_day || 8) * 60;
    const netMins      = grossMins - breakMins;
    const halfMins     = stdMins / 2;

    return netMins >= halfMins ? 'PRESENT' : 'HALF_DAY';
}

/**
 * Compute net worked hours and overtime portion from punch times.
 * Returns { total, regular, ot } in hours (2-decimal), or null when times missing.
 *   total   = gross - break
 *   regular = min(total, std)
 *   ot      = max(0, total - std)
 */
function calcHours(check_in, check_out, settings) {
    if (!check_in || !check_out) return null;
    const [inH,  inM]  = check_in.split(':').map(Number);
    const [outH, outM] = check_out.split(':').map(Number);
    const grossMins    = (outH * 60 + outM) - (inH * 60 + inM);
    if (grossMins <= 0) return null;
    const breakMins = parseFloat(settings?.break_minutes        || 0);
    const stdMins   = parseFloat(settings?.working_hours_per_day || 8) * 60;
    const netMins   = Math.max(0, grossMins - breakMins);
    const total     = parseFloat((netMins / 60).toFixed(2));
    const std       = parseFloat((stdMins  / 60).toFixed(2));
    const ot        = parseFloat(Math.max(0, total - std).toFixed(2));
    const regular   = parseFloat(Math.min(total, std).toFixed(2));
    return { total, regular, ot };
}

/**
 * Auto-calculate overtime from check-in / check-out times.
 * Returns the OT hours (rounded to nearest 0.5) or null if:
 *  - either time is missing
 *  - auto_overtime is disabled in settings
 *  - check-out is before check-in
 */
function calcAutoOT(check_in, check_out, settings) {
    if (!check_in || !check_out) return null;
    if (!settings?.auto_overtime) return null;
    const [inH,  inM]  = check_in.split(':').map(Number);
    const [outH, outM] = check_out.split(':').map(Number);
    const workedMins   = (outH * 60 + outM) - (inH * 60 + inM);
    if (workedMins <= 0) return null;
    const breakMins   = parseFloat(settings.break_minutes  || 0);
    const threshMins  = parseFloat(settings.working_hours_per_day || 8) * 60;
    const netMins     = workedMins - breakMins;
    const otMins      = Math.max(0, netMins - threshMins);
    // Round to nearest 0.5 h
    return Math.round(otMins / 30) * 0.5;
}

// ─── Live count ring ──────────────────────────────────────────────────────────

function CountRing({ counts, total }) {
    const present = (counts.PRESENT || 0) + (counts.HALF_DAY || 0) * 0.5;
    const absent  = counts.ABSENT  || 0;
    const leave   = (counts.LEAVE  || 0) + (counts.HOLIDAY || 0);
    const unmarked = Math.max(0, total - (counts.PRESENT||0) - (counts.ABSENT||0) - (counts.HALF_DAY||0) - (counts.LEAVE||0) - (counts.HOLIDAY||0));

    const pct = total > 0 ? Math.round(present / total * 100) : 0;
    const r = 36, cx = 44, cy = 44, stroke = 8;
    const circ = 2 * Math.PI * r;
    const presentArc = (present / total) * circ;
    const absentArc  = (absent  / total) * circ;
    const leaveArc   = (leave   / total) * circ;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Ring SVG */}
            <svg width={88} height={88} style={{ flexShrink: 0 }}>
                {/* Track */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
                {/* Present arc */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth={stroke}
                    strokeDasharray={`${presentArc} ${circ}`}
                    strokeDashoffset={circ * 0.25} strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`} />
                {/* Absent arc */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth={stroke}
                    strokeDasharray={`${absentArc} ${circ}`}
                    strokeDashoffset={-(presentArc - circ * 0.25)} strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`} />
                {/* Leave arc */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#6366f1" strokeWidth={stroke}
                    strokeDasharray={`${leaveArc} ${circ}`}
                    strokeDashoffset={-(presentArc + absentArc - circ * 0.25)} strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`} />
                {/* Center text */}
                <text x={cx} y={cy - 5} textAnchor="middle" fontSize={15} fontWeight={800} fill="#1f2937">{pct}%</text>
                <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9}  fill="#9ca3af">present</text>
            </svg>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                    { color:'#22c55e', label:'Present',  val: counts.PRESENT  || 0 },
                    { color:'#f59e0b', label:'Half Day', val: counts.HALF_DAY || 0 },
                    { color:'#ef4444', label:'Absent',   val: counts.ABSENT   || 0 },
                    { color:'#6366f1', label:'Leave',    val: (counts.LEAVE   || 0) + (counts.HOLIDAY || 0) },
                    { color:'#d1d5db', label:'Unmarked', val: unmarked },
                ].map(item => item.val > 0 && (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                        <span style={{ color: '#6b7280' }}>{item.label}</span>
                        <span style={{ fontWeight: 800, color: '#374151', marginLeft: 'auto', paddingLeft: 8 }}>{item.val}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Worker row (mobile compact swipeable card) ──────────────────────────────

function WorkerCard({ worker, rec, onChange, lateScans, projSettings }) {
    const sm = sMeta[rec.status] || sMeta[""];
    const [expanded, setExpanded] = useState(false);
    const touchX = useRef(null);

    // Swipe gesture
    const onTouchStart = e => { touchX.current = e.touches[0].clientX; };
    const onTouchEnd   = e => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx > 50)  onChange({ ...rec, status: 'PRESENT' });
        if (dx < -50) onChange({ ...rec, status: 'ABSENT'  });
    };

    const isLate = lateScans?.has(worker.id);

    return (
        <div
            style={{
                borderRadius: 14,
                border: `1.5px solid ${sm.color}30`,
                borderLeft: `6px solid ${sm.color}`,
                background: 'var(--t-surface)', overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                marginBottom: 8,
            }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* ── Compact Main Row ── */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 10 }}>
                
                {/* Info block */}
                <div 
                    style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer' }} 
                    onClick={() => setExpanded(e => !e)}
                >
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--t-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {worker.name}
                        {isLate && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: '#fef3c7', color: '#92400e' }}>LATE</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t-text3)', display: 'flex', gap: 6 }}>
                        <span>{worker.trade_display}</span>
                        {worker.worker_type === 'STAFF' && <span style={{ color: '#3b82f6', fontWeight: 600 }}>Staff</span>}
                    </div>
                </div>

                {/* Center Time Block */}
                {(rec.check_in || rec.check_out) && (
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 8, 
                        background: 'var(--t-bg)',
                        border: '1px solid var(--t-border)',
                        fontSize: 12, fontWeight: 900, fontFamily: 'monospace'
                    }}>
                        <span style={{ color: '#22c55e' }}>{rec.check_in ? rec.check_in.slice(0, 5) : '--:--'}</span>
                        <span style={{ color: 'var(--t-text3)', opacity: 0.5 }}>~</span>
                        <span style={{ color: '#ef4444' }}>{rec.check_out ? rec.check_out.slice(0, 5) : '--:--'}</span>
                    </div>
                )}

                {/* Quick Status Buttons (P / H / A / expand) */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {['PRESENT','HALF_DAY','ABSENT'].map(s => {
                        const isSel = rec.status === s;
                        const meta = sMeta[s];
                        return (
                            <button 
                                key={s} 
                                onClick={() => onChange({ ...rec, status: s })} 
                                style={{
                                    width: 32, height: 32, borderRadius: 8,
                                    background: isSel ? meta.color : 'var(--t-surface2)',
                                    color: isSel ? '#fff' : 'var(--t-text3)',
                                    border: isSel ? 'none' : '1px solid var(--t-border)',
                                    fontSize: 13, fontWeight: 900, cursor: 'pointer',
                                    boxShadow: isSel ? `0 2px 6px ${meta.color}50` : 'none',
                                    transition: 'all 0.1s',
                                }}
                            >{meta.short}</button>
                        );
                    })}
                    {/* Expand Button */}
                    <button 
                        onClick={() => setExpanded(e => !e)} 
                        style={{
                            width: 30, height: 30, borderRadius: 8, 
                            background: expanded ? 'rgba(0,0,0,0.05)' : 'transparent',
                            border: 'none', color: 'var(--t-text3)', fontSize: 16, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginLeft: 2,
                        }}
                    >
                        {expanded ? '▴' : '▾'}
                    </button>
                </div>
            </div>

            {/* ── Expanded Area (Times, OT, Notes) ── */}
            {expanded && (
                <div style={{ padding: '0 10px 10px', background: 'var(--t-surface2)', borderTop: '1px solid var(--t-border)' }}>
                    
                    {/* Time & OT Row */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--t-text3)', display: 'block', marginBottom: 2 }}>🟢 IN</label>
                            <input 
                                type="time" 
                                value={(rec.check_in || '').slice(0, 5)} 
                                onChange={e => onChange({ ...rec, check_in: e.target.value || '' })} 
                                style={{ width: '100%', padding: '6px', fontSize: 12, borderRadius: 6, border: `1px solid ${rec.check_in ? '#22c55e' : 'var(--t-border)'}`, boxSizing: 'border-box' }} 
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--t-text3)', display: 'block', marginBottom: 2 }}>🔴 OUT</label>
                            <input 
                                type="time" 
                                value={(rec.check_out || '').slice(0, 5)} 
                                onChange={e => onChange({ ...rec, check_out: e.target.value || '' })} 
                                style={{ width: '100%', padding: '6px', fontSize: 12, borderRadius: 6, border: `1px solid ${rec.check_out ? '#ef4444' : 'var(--t-border)'}`, boxSizing: 'border-box' }} 
                            />
                        </div>
                        <div style={{ width: 50 }}>
                            <label style={{ fontSize: 9, fontWeight: 700, color: '#8b5cf6', display: 'block', marginBottom: 2 }}>OT (h)</label>
                            <input 
                                type="number" step="0.5" min="0" max="24"
                                value={rec.overtime_hours} 
                                onChange={e => onChange({ ...rec, overtime_hours: e.target.value })} 
                                style={{ width: '100%', padding: '6px', fontSize: 12, borderRadius: 6, border: `1px solid ${parseFloat(rec.overtime_hours) > 0 ? '#8b5cf6' : 'var(--t-border)'}`, textAlign: 'center', boxSizing: 'border-box' }} 
                            />
                        </div>
                        
                        {/* Total hours indicator */}
                        {(() => {
                            const h = calcHours(rec.check_in, rec.check_out, projSettings);
                            if (!h) return null;
                            const std = parseFloat(projSettings?.working_hours_per_day || 8);
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                                    <span style={{ fontSize: 8, color: 'var(--t-text3)' }}>Total</span>
                                    <span style={{ fontSize: 12, fontWeight: 900, color: h.total >= std ? '#22c55e' : '#f59e0b' }}>
                                        {h.total.toFixed(1)}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Note Input */}
                    <div style={{ marginTop: 8 }}>
                        <input 
                            type="text" 
                            value={rec.notes} 
                            onChange={e => onChange({ ...rec, notes: e.target.value })} 
                            placeholder="Add a note (e.g. Leave reason)…" 
                            style={{ width: '100%', padding: '8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--t-border)', boxSizing: 'border-box' }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Mobile daily sheet ────────────────────────────────────────────────────────

function MobileDailySheet({ projectId, onAlertCount }) {
    const [date,       setDate]       = useState(todayStr());
    const [workers,    setWorkers]    = useState([]);
    const [sheet,      setSheet]      = useState({});   // workerId → { status, overtime_hours, notes }
    const [loading,    setLoading]    = useState(false);
    const [saving,     setSaving]     = useState(false);
    const [saved,      setSaved]      = useState(false);
    const [error,      setError]      = useState('');
    const [search,     setSearch]     = useState('');
    const [filterStatus, setFilter]   = useState('ALL');
    const [markAllOpen, setMarkAllOpen] = useState(false);
    const [lateScans,   setLateScans]   = useState(new Set());
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanToast,   setScanToast]   = useState(null); // { worker, action, time }
    const [dirty,       setDirty]       = useState(false); // true when unsaved changes exist
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [projSettings, setProjSettings] = useState(null); // ProjectAttendanceSettings
    const saveTimer  = useRef(null);
    const dirtyRef   = useRef(false); // ref copy for auto-save closure (avoids stale state)
    const toastTimer = useRef(null);
    const initialSheet = useRef({}); // tracks the original data from the server

    // Helper: mark dirty in both ref (for closure) and state (for UI)
    const markDirty   = () => { dirtyRef.current = true;  setDirty(true);  };
    const markClean   = () => { dirtyRef.current = false; setDirty(false); };

    // ── Load data ─────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true); setError('');
        try {
            // Auto-sync: create AttendanceWorker records for any workforce members
            // that don't have one yet — so ALL registered staff appear on this sheet.
            // We await this so newly-synced workers are included in the getWorkers call below.
            await workforceService.syncAllAttendance({ project: projectId }).catch(() => {});

            const [ws, recs, scanLogs, settingsData] = await Promise.all([
                attendanceService.getWorkers({ project: projectId, active: 'true' }),
                attendanceService.getRecords({ project: projectId, date }),
                // Fetch today's late QR scans
                date === todayStr()
                    ? attendanceService.getScanLogs({ project: projectId, date, scan_type: 'CHECK_IN', is_late: 'true' })
                    : Promise.resolve({ results: [] }),
                attendanceService.getSettings(projectId).catch(() => null),
            ]);
            if (settingsData) setProjSettings(settingsData);
            const list = Array.isArray(ws) ? ws : ws.results || [];
            setWorkers(list);

            const recMap = {};
            (Array.isArray(recs) ? recs : recs.results || []).forEach(r => {
                recMap[r.worker] = {
                    status:         r.status,
                    overtime_hours: r.overtime_hours || 0,
                    notes:          r.notes || '',
                    check_in:       r.check_in  || '',
                    check_out:      r.check_out || '',
                };
            });
            const init = {};
            list.forEach(w => {
                init[w.id] = recMap[w.id] || { status: '', overtime_hours: 0, notes: '', check_in: '', check_out: '' };
            });
            initialSheet.current = init;
            setSheet(init);
            markClean();

            // Build set of worker IDs who were late today
            const late = new Set();
            const logs = Array.isArray(scanLogs) ? scanLogs : scanLogs.results || [];
            logs.forEach(l => { if (l.is_late) late.add(l.worker); });
            setLateScans(late);

        } catch { setError('Failed to load.'); }
        finally   { setLoading(false); }
    }, [projectId, date]);

    useEffect(() => { load(); }, [load]);


    // ── QR scan success handler ───────────────────────────────────────────────
    const handleScanSuccess = useCallback((entry) => {
        setScannerOpen(false);
        // Show toast
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setScanToast(entry);
        toastTimer.current = setTimeout(() => setScanToast(null), 4000);

        // Update local sheet immediately if we're looking at today
        if (date === todayStr() && entry.workerId) {
            setSheet(prev => ({
                ...prev,
                [entry.workerId]: {
                    status:         entry.status || 'PRESENT',
                    overtime_hours: entry.overtimeH || 0,
                    notes:          prev[entry.workerId]?.notes || '',
                    check_in:       entry.checkIn  || '',
                    check_out:      entry.checkOut || '',
                }
            }));
            // Mark as clean since these changes are already in the DB
            markClean();
        } else {
            // If not today, or no workerId, full reload just in case
            setTimeout(() => load(), 600);
        }
    }, [date, load]);

    // Listen for external updates (e.g. NFC scans via MQTT)
    useEffect(() => {
        const handler = (e) => {
            const res = e.detail;
            if (!res.success || !res.attendance || !res.worker) return;
            if (res.attendance.date === date) {
                setSheet(prev => ({
                    ...prev,
                    [res.worker.id]: {
                        status:         res.attendance.status,
                        overtime_hours: res.attendance.overtime_hours,
                        notes:          prev[res.worker.id]?.notes || res.attendance.notes || '',
                        check_in:       res.attendance.check_in  || '',
                        check_out:      res.attendance.check_out || '',
                    }
                }));
                markClean();
            }
        };
        window.addEventListener('attendance-updated', handler);
        return () => window.removeEventListener('attendance-updated', handler);
    }, [date]);

    // ── Auto-save (debounced 3s after any change) ─────────────────────────────

    // ── Auto-save (debounced 3s after any change) ─────────────────────────────
    const scheduleAutoSave = useCallback((nextSheet, workerList) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            if (!dirtyRef.current) return;
            setSaving(true);
            try {
                const records = workerList.map(w => {
                    const current = nextSheet[w.id] || {};
                    const initial = initialSheet.current[w.id] || {};
                    const rec = {
                        worker:         w.id,
                        status:         current.status,
                        overtime_hours: parseFloat(current.overtime_hours || 0),
                        notes:          current.notes          || '',
                    };
                    if (current.check_in !== initial.check_in) rec.check_in = current.check_in;
                    if (current.check_out !== initial.check_out) rec.check_out = current.check_out;
                    return rec;
                });
                await attendanceService.bulkMark({ project: projectId, date, records });
                setSaved(true);
                markClean();
                setTimeout(() => setSaved(false), 2500);
            } catch { setError('Auto-save failed — tap Save to retry.'); }
            finally   { setSaving(false); }
        }, 2800);
    }, [projectId, date]);

    const changeRec = useCallback((workerId, rec) => {
        setSheet(prev => {
            const prevRec = prev[workerId] || {};
            let updatedRec = rec;
            const timeChanged = rec.check_in !== prevRec.check_in || rec.check_out !== prevRec.check_out;
            if (timeChanged) {
                // Auto-set status from punch times
                const autoSt = autoStatusFromTimes(rec.check_in, rec.check_out, projSettings);
                if (autoSt) updatedRec = { ...updatedRec, status: autoSt };
                // Auto-calc overtime
                const autoOT = calcAutoOT(rec.check_in, rec.check_out, projSettings);
                if (autoOT !== null) updatedRec = { ...updatedRec, overtime_hours: autoOT };
            }
            const next = { ...prev, [workerId]: updatedRec };
            markDirty();
            scheduleAutoSave(next, workers);
            return next;
        });
    }, [workers, scheduleAutoSave, projSettings]);

    // ── Manual save ───────────────────────────────────────────────────────────
    const save = async () => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        setSaving(true); setError('');
        try {
            const records = workers.map(w => {
                const current = sheet[w.id] || {};
                const initial = initialSheet.current[w.id] || {};
                const rec = {
                    worker:         w.id,
                    status:         current.status,
                    overtime_hours: parseFloat(current.overtime_hours || 0),
                    notes:          current.notes          || '',
                };
                if (current.check_in !== initial.check_in) rec.check_in = current.check_in;
                if (current.check_out !== initial.check_out) rec.check_out = current.check_out;
                return rec;
            });
            await attendanceService.bulkMark({ project: projectId, date, records });
            setSaved(true); markClean();
            setTimeout(() => setSaved(false), 2500);
        } catch { setError('Save failed.'); }
        finally   { setSaving(false); }
    };

    const markAll = (status) => {
        setSheet(prev => {
            const next = {};
            workers.forEach(w => { next[w.id] = { ...prev[w.id], status }; });
            markDirty();
            scheduleAutoSave(next, workers);
            return next;
        });
        setMarkAllOpen(false);
    };

    const copyPrevious = async () => {
        const prevDate = shiftDate(date, -1);
        try {
            const recs = await attendanceService.getRecords({ project: projectId, date: prevDate });
            const list = Array.isArray(recs) ? recs : recs.results || [];
            if (!list.length) { alert('No records found for ' + prevDate); return; }
            setSheet(prev => {
                const next = { ...prev };
                list.forEach(r => { if (next[r.worker]) next[r.worker] = { status: r.status, overtime_hours: r.overtime_hours || 0, notes: r.notes || '' }; });
                markDirty();
                scheduleAutoSave(next, workers);
                return next;
            });
        } catch { setError('Failed to copy from yesterday.'); }
        setMarkAllOpen(false);
    };

    const clearAll = () => {
        setShowClearConfirm(true);
    };

    const handleConfirmClear = () => {
        setSheet(prev => {
            const next = { ...prev };
            workers.forEach(w => {
                next[w.id] = { status: '', overtime_hours: 0, notes: '', check_in: '', check_out: '' };
            });
            markDirty();
            scheduleAutoSave(next, workers);
            return next;
        });
        setShowClearConfirm(false);
        setMarkAllOpen(false);
    };

    const setHoliday = async () => {
        const name = prompt('Enter holiday name:', 'Public Holiday');
        if (!name) return;
        if (!confirm(`Mark all as HOLIDAY on ${date}?`)) return;
        setSaving(true);
        try {
            await attendanceService.setHoliday?.({ project: projectId, date, name }) ||
                  await attendanceService.bulkMark({
                      project: projectId, date,
                      records: workers.map(w => ({ worker: w.id, status: 'HOLIDAY', overtime_hours: 0, notes: name })),
                  });
            load();
        } catch { setError('Failed to set holiday.'); }
        finally { setSaving(false); }
    };

    // ── Computed counts & filtered list ───────────────────────────────────────
    const counts = useMemo(() => {
        const c = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LEAVE: 0, HOLIDAY: 0 };
        Object.values(sheet).forEach(r => { if (r?.status) c[r.status] = (c[r.status] || 0) + 1; });
        return c;
    }, [sheet]);

    // Workers who checked in but never checked out — needs follow-up
    const incompleteWorkers = useMemo(() =>
        workers.filter(w => sheet[w.id]?.check_in && !sheet[w.id]?.check_out),
    [workers, sheet]);

    // Bubble alert count up to AttendanceHub for tab badge
    useEffect(() => { onAlertCount?.(incompleteWorkers.length); }, [incompleteWorkers.length, onAlertCount]);

    const displayWorkers = useMemo(() => workers.filter(w => {
        const matchSearch = !search.trim() || w.name.toLowerCase().includes(search.trim().toLowerCase());
        const matchStatus = filterStatus === 'ALL' || sheet[w.id]?.status === filterStatus;
        return matchSearch && matchStatus;
    }), [workers, search, filterStatus, sheet]);

    const dateInfo = fmtDate(date);
    const isToday  = date === todayStr();
    // Disable the forward arrow once we're AT today — can't mark future attendance
    const isFuture = date >= todayStr();

    if (!projectId) return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--t-text3)' }}>
            Select a project to mark attendance.
        </div>
    );

    // ── Action color map for scan toast ────────────────────────────────────────
    const TOAST_CFG = {
        CHECK_IN:  { bg: '#022c22', border: '#10b981', color: '#10b981', icon: '▶', label: 'CHECK IN'  },
        CHECK_OUT: { bg: '#030d1a', border: '#3b82f6', color: '#3b82f6', icon: '■', label: 'CHECK OUT' },
        IGNORED:   { bg: '#1c1400', border: '#f59e0b', color: '#f59e0b', icon: '⏳', label: 'TOO SOON' },
        BLOCKED:   { bg: '#1a0303', border: '#ef4444', color: '#ef4444', icon: '✕', label: 'BLOCKED'  },
        ERROR:     { bg: '#1a0303', border: '#ef4444', color: '#ef4444', icon: '✕', label: 'ERROR'    },
    };

    return (
        <div style={{ paddingBottom: 110 }}>

            {/* ── QR Scanner fullscreen overlay ── */}
            {scannerOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 300,
                    background: '#050508',
                }}>
                    <QRScannerTab
                        projectId={projectId}
                        onClose={() => setScannerOpen(false)}
                        onScanSuccess={handleScanSuccess}
                    />
                </div>
            )}

            {/* ── Scan result toast ── */}
            {scanToast && (() => {
                const tc = TOAST_CFG[scanToast.action] || TOAST_CFG.ERROR;
                return (
                    <div style={{
                        position: 'fixed', top: 70, left: 12, right: 12, zIndex: 290,
                        background: tc.bg, border: `1.5px solid ${tc.border}`,
                        borderRadius: 14, padding: '12px 16px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        boxShadow: `0 4px 24px ${tc.border}30`,
                        animation: 'slideDown 0.25s ease',
                    }}>
                        <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}`}</style>
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{tc.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 900, fontSize: 14, color: tc.color, letterSpacing: '0.05em' }}>
                                {tc.label}
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 700, marginTop: 2 }}>
                                {scanToast.worker}
                                {scanToast.checkIn  && <span style={{ marginLeft: 8, color: '#10b981', fontSize: 11 }}>🟢 {scanToast.checkIn}</span>}
                                {scanToast.checkOut && <span style={{ marginLeft: 8, color: '#3b82f6', fontSize: 11 }}>🔴 {scanToast.checkOut}</span>}
                            </div>
                        </div>
                        <button onClick={() => setScanToast(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer', padding: 0 }}>✕</button>
                    </div>
                );
            })()}

            {/* ── Date navigation bar ── */}
            <div style={{
                position: 'sticky', top: 60, zIndex: 40,
                background: 'var(--t-surface)', borderBottom: '1px solid var(--t-border)',
                padding: '10px 12px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        onClick={() => setDate(d => shiftDate(d, -1))}
                        style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text)', fontSize: 18, cursor: 'pointer' }}
                    >‹</button>

                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontWeight: 900, fontSize: 15, color: isToday ? '#f97316' : 'var(--t-text)' }}>
                            {dateInfo.label}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--t-text3)', marginTop: 1 }}>{dateInfo.sub}</div>
                    </div>

                    <button
                        onClick={() => setDate(d => shiftDate(d, +1))}
                        disabled={isFuture}
                        style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--t-border)', background: isFuture ? 'var(--t-border)' : 'var(--t-surface2)', color: isFuture ? 'var(--t-text3)' : 'var(--t-text)', fontSize: 18, cursor: isFuture ? 'not-allowed' : 'pointer' }}
                    >›</button>

                    {!isToday && (
                        <button
                            onClick={() => setDate(todayStr())}
                            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #f97316', background: 'rgba(249,115,22,0.1)', color: '#f97316', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                        >Today</button>
                    )}

                    {/* Date picker (hidden, triggered by icon) */}
                    <label style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--t-border)', background: 'var(--t-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>
                        📅
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                    </label>

                    {/* QR Scan button — opens camera overlay */}
                    <button
                        onClick={() => setScannerOpen(true)}
                        style={{
                            width: 38, height: 32, borderRadius: 9,
                            border: '1.5px solid #f97316',
                            background: 'rgba(249,115,22,0.12)',
                            color: '#f97316', fontSize: 16,
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontWeight: 900, flexShrink: 0,
                        }}
                        title="Open QR Scanner"
                    >📷</button>
                </div>

                {/* Auto-save indicator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6, fontSize: 11, color: saved ? '#22c55e' : saving ? '#f59e0b' : 'var(--t-text3)' }}>
                    {saving && <span>⏳ Auto-saving…</span>}
                    {saved  && <span>✅ Saved</span>}
                    {!saving && !saved && dirty && <span style={{ color: '#f59e0b' }}>● Unsaved changes</span>}
                </div>
            </div>

            {/* ── Live count ring + actions ── */}
            <div style={{ padding: '12px 12px 0' }}>
                <div style={{
                    background: 'var(--t-surface)', borderRadius: 16,
                    border: '1px solid var(--t-border)', padding: '14px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                    <CountRing counts={counts} total={workers.length} />

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button onClick={() => setMarkAllOpen(o => !o)} style={{
                            padding: '8px 12px', borderRadius: 9, border: '1px solid var(--t-border)',
                            background: markAllOpen ? '#f97316' : 'var(--t-surface2)',
                            color: markAllOpen ? '#fff' : 'var(--t-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}>⚡ Mark All</button>
                        <button onClick={save} disabled={saving || !dirty} style={{
                            padding: '8px 12px', borderRadius: 9, border: 'none',
                            background: saved ? '#22c55e' : dirty ? '#f97316' : 'var(--t-border)',
                            color: dirty ? '#fff' : 'var(--t-text3)',
                            fontSize: 12, fontWeight: 800,
                            cursor: dirty ? 'pointer' : 'not-allowed',
                            opacity: saving ? 0.7 : 1,
                            transition: 'all 0.2s',
                        }}>{saving ? '⏳' : saved ? '✅ Saved' : dirty ? '💾 Save' : '💾 Save'}</button>
                    </div>
                </div>

                {/* Mark All panel */}
                {markAllOpen && (
                    <div style={{ marginTop: 8, padding: '12px', borderRadius: 12, background: 'var(--t-surface)', border: '1px solid var(--t-border)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {STATUS_OPTIONS.map(s => (
                            <button key={s.value} onClick={() => markAll(s.value)} style={{
                                padding: '9px 14px', borderRadius: 9, fontSize: 13, fontWeight: 900,
                                border: `2px solid ${s.color}`,
                                background: s.color, color: '#fff',
                                cursor: 'pointer',
                                boxShadow: `0 2px 8px ${s.color}40`,
                            }}>{s.emoji} {s.label}</button>
                        ))}
                        <button onClick={copyPrevious} style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            border: '1px solid var(--t-border)', background: 'var(--t-surface2)', color: 'var(--t-text3)', cursor: 'pointer',
                        }}>📋 Copy Yesterday</button>
                        <button onClick={clearAll} style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer',
                        }}>🧹 Clear All</button>
                        <button onClick={setHoliday} style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                            border: '1px solid #94a3b8', background: 'rgba(148,163,184,0.12)', color: '#475569', cursor: 'pointer',
                        }}>🎉 Set Holiday</button>
                    </div>
                )}
            </div>

            {/* ── Search + filter ── */}
            <div style={{ padding: '10px 12px 0', display: 'flex', gap: 8 }}>
                <input
                    type="text" placeholder="🔍 Search worker…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{
                        flex: 1, padding: '9px 12px', borderRadius: 10, fontSize: 13,
                        border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)',
                    }}
                />
                <select
                    value={filterStatus} onChange={e => setFilter(e.target.value)}
                    style={{
                        padding: '9px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                        border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)',
                        cursor: 'pointer',
                    }}
                >
                    <option value="ALL">All ({workers.length})</option>
                    {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label} ({counts[s.value] || 0})</option>
                    ))}
                </select>
            </div>

            {/* Swipe hint */}
            <div style={{ padding: '4px 14px 0', fontSize: 10, color: 'var(--t-text3)', textAlign: 'center' }}>
                💡 Tap emoji to cycle · Swipe right = Present · Swipe left = Absent
            </div>

            {error && (
                <div style={{ margin: '8px 12px 0', padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 12 }}>{error}</div>
            )}

            {/* ── ⚠ Incomplete checkout alert ── */}
            {incompleteWorkers.length > 0 && (
                <div style={{ margin: '10px 12px 0', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #f59e0b' }}>
                    <div style={{
                        padding: '10px 14px',
                        background: 'rgba(245,158,11,0.12)',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span style={{ fontSize: 18 }}>⚠️</span>
                        <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 900, fontSize: 13, color: '#f59e0b' }}>
                                {incompleteWorkers.length} worker{incompleteWorkers.length > 1 ? 's' : ''} checked in — no check-out yet
                            </span>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--t-text3)' }}>
                                Status auto-set to Half Day. Add check-out time or correct manually.
                            </p>
                        </div>
                    </div>
                    <div style={{ background: 'var(--t-surface)', padding: '6px 14px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {incompleteWorkers.map(w => (
                            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: '#f59e0b', flexShrink: 0,
                                    boxShadow: '0 0 6px #f59e0b80',
                                }} />
                                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--t-text)' }}>{w.name}</span>
                                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>
                                    🟢 {sheet[w.id]?.check_in}
                                </span>
                                <span style={{ fontSize: 11, color: '#ef444480', fontWeight: 600 }}>
                                    🔴 —
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Worker cards ── */}
            {loading ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--t-text3)' }}>Loading…</div>
            ) : workers.length === 0 ? (
                <div style={{ margin: '16px 12px', padding: '32px 20px', textAlign: 'center', borderRadius: 14, background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text3)', fontSize: 13 }}>
                    No workers yet. Add workers in the People tab first.
                </div>
            ) : (
                <div style={{ padding: '10px 12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {displayWorkers.map(w => (
                        <WorkerCard
                            key={w.id}
                            worker={w}
                            rec={sheet[w.id] || { status: 'PRESENT', overtime_hours: 0, notes: '' }}
                            onChange={rec => changeRec(w.id, rec)}
                            lateScans={lateScans}
                            projSettings={projSettings}
                        />
                    ))}
                    {displayWorkers.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--t-text3)', fontSize: 13 }}>
                            No workers match your filter.
                        </div>
                    )}
                </div>
            )}
            <ConfirmModal 
                isOpen={showClearConfirm} 
                title="Clear All Attendance" 
                message={`Are you sure you want to clear all attendance data for ${date}? This will reset all statuses and times.`}
                onConfirm={handleConfirmClear} 
                onCancel={() => setShowClearConfirm(false)} 
                confirmText="Yes, Clear All"
                type="warning"
            />
        </div>
    );
}

// ─── Desktop layout (unchanged structure, upgraded internals) ─────────────────

function DesktopDailySheet({ projectId, onAlertCount }) {
    const [date,   setDate]   = useState(todayStr());
    const [workers, setWorkers] = useState([]);
    const [sheet,   setSheet]   = useState({});
    const [loading, setLoading] = useState(false);
    const [saving,      setSaving]      = useState(false);
    const [saved,       setSaved]       = useState(false);
    const [error,       setError]       = useState('');
    const [search,      setSearch]      = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanToast,   setScanToast]   = useState(null);
    const [dirty,       setDirty]       = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [projSettings, setProjSettings] = useState(null);
    const saveTimer  = useRef(null);
    const dirtyRef   = useRef(false);
    const toastTimer = useRef(null);
    const initialSheet = useRef({});

    const markDirty = () => { dirtyRef.current = true;  setDirty(true);  };
    const markClean = () => { dirtyRef.current = false; setDirty(false); };

    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true); setError('');
        try {
            const [ws, recs, settingsData] = await Promise.all([
                attendanceService.getWorkers({ project: projectId, active: 'true' }),
                attendanceService.getRecords({ project: projectId, date }),
                attendanceService.getSettings(projectId).catch(() => null),
            ]);
            if (settingsData) setProjSettings(settingsData);
            const list = Array.isArray(ws) ? ws : ws.results || [];
            setWorkers(list);
            const recMap = {};
            (Array.isArray(recs) ? recs : recs.results || []).forEach(r => {
                recMap[r.worker] = { status: r.status, overtime_hours: r.overtime_hours || 0, notes: r.notes || '', check_in: r.check_in || '', check_out: r.check_out || '' };
            });
            const init = {};
            list.forEach(w => { init[w.id] = recMap[w.id] || { status: '', overtime_hours: 0, notes: '', check_in: '', check_out: '' }; });
            initialSheet.current = init;
            setSheet(init);
            markClean();
        } catch { setError('Failed to load.'); }
        finally   { setLoading(false); }
    }, [projectId, date]);

    useEffect(() => { load(); }, [load]);


    const handleScanSuccess = useCallback((entry) => {
        setScannerOpen(false);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setScanToast(entry);
        toastTimer.current = setTimeout(() => setScanToast(null), 4000);

        // Update local sheet immediately if we're looking at today
        if (date === todayStr() && entry.workerId) {
            setSheet(prev => ({
                ...prev,
                [entry.workerId]: {
                    status:         entry.status || 'PRESENT',
                    overtime_hours: entry.overtimeH || 0,
                    notes:          prev[entry.workerId]?.notes || '',
                    check_in:       entry.checkIn  || '',
                    check_out:      entry.checkOut || '',
                }
            }));
            markClean();
        } else {
            setTimeout(() => load(), 600);
        }
    }, [date, load]);

    // Listen for external updates (e.g. NFC scans via MQTT)
    useEffect(() => {
        const handler = (e) => {
            const res = e.detail;
            if (!res.success || !res.attendance || !res.worker) return;
            if (res.attendance.date === date) {
                setSheet(prev => ({
                    ...prev,
                    [res.worker.id]: {
                        status:         res.attendance.status,
                        overtime_hours: res.attendance.overtime_hours,
                        notes:          prev[res.worker.id]?.notes || res.attendance.notes || '',
                        check_in:       res.attendance.check_in  || '',
                        check_out:      res.attendance.check_out || '',
                    }
                }));
                markClean();
            }
        };
        window.addEventListener('attendance-updated', handler);
        return () => window.removeEventListener('attendance-updated', handler);
    }, [date]);


    const scheduleAutoSave = (nextSheet, workerList) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            if (!dirtyRef.current) return;
            setSaving(true);
            try {
                const records = workerList.map(w => {
                    const current = nextSheet[w.id] || {};
                    const initial = initialSheet.current[w.id] || {};
                    const rec = {
                        worker:         w.id,
                        status:         current.status,
                        overtime_hours: parseFloat(current.overtime_hours || 0),
                        notes:          current.notes          || '',
                    };
                    if (current.check_in !== initial.check_in) rec.check_in = current.check_in;
                    if (current.check_out !== initial.check_out) rec.check_out = current.check_out;
                    return rec;
                });
                await attendanceService.bulkMark({ project: projectId, date, records });
                setSaved(true); markClean();
                setTimeout(() => setSaved(false), 2500);
            } catch { setError('Auto-save failed.'); }
            finally { setSaving(false); }
        }, 2800);
    };

    const changeRec = (wid, field, val) => {
        setSheet(prev => {
            let updated = { ...prev[wid], [field]: val };
            // Auto-set status + overtime when a time field changes
            if (field === 'check_in' || field === 'check_out') {
                const autoSt = autoStatusFromTimes(updated.check_in, updated.check_out, projSettings);
                if (autoSt) updated = { ...updated, status: autoSt };
                const autoOT = calcAutoOT(updated.check_in, updated.check_out, projSettings);
                if (autoOT !== null) updated = { ...updated, overtime_hours: autoOT };
            }
            const next = { ...prev, [wid]: updated };
            markDirty();
            scheduleAutoSave(next, workers);
            return next;
        });
    };

    const save = async () => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        setSaving(true); setError('');
        try {
            const records = workers.map(w => {
                const current = sheet[w.id] || {};
                const initial = initialSheet.current[w.id] || {};
                const rec = {
                    worker:         w.id,
                    status:         current.status,
                    overtime_hours: parseFloat(current.overtime_hours || 0),
                    notes:          current.notes          || '',
                };
                if (current.check_in !== initial.check_in) rec.check_in = current.check_in;
                if (current.check_out !== initial.check_out) rec.check_out = current.check_out;
                return rec;
            });
            await attendanceService.bulkMark({ project: projectId, date, records });
            setSaved(true); markClean();
            setTimeout(() => setSaved(false), 2500);
        } catch { setError('Save failed.'); }
        finally { setSaving(false); }
    };

    const markAll = (status) => {
        setSheet(prev => {
            const next = {};
            workers.forEach(w => { next[w.id] = { ...prev[w.id], status }; });
            markDirty();
            return next;
        });
    };

    const copyPrevious = async () => {
        const prevDate = shiftDate(date, -1);
        const recs = await attendanceService.getRecords({ project: projectId, date: prevDate });
        const list = Array.isArray(recs) ? recs : recs.results || [];
        if (!list.length) { alert('No records for ' + prevDate); return; }
        setSheet(prev => {
            const next = { ...prev };
            list.forEach(r => { if (next[r.worker]) next[r.worker] = { status: r.status, overtime_hours: r.overtime_hours || 0, notes: r.notes || '' }; });
            markDirty();
            return next;
        });
    };

    const clearAll = () => {
        setShowClearConfirm(true);
    };

    const handleConfirmClear = () => {
        setSheet(prev => {
            const next = { ...prev };
            workers.forEach(w => {
                next[w.id] = { status: '', overtime_hours: 0, notes: '', check_in: '', check_out: '' };
            });
            markDirty();
            scheduleAutoSave(next, workers);
            return next;
        });
        setShowClearConfirm(false);
    };

    const counts = useMemo(() => {
        const c = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LEAVE: 0, HOLIDAY: 0 };
        Object.values(sheet).forEach(r => { if (r?.status) c[r.status] = (c[r.status] || 0) + 1; });
        return c;
    }, [sheet]);

    // Workers who checked in but have no check-out yet
    const incompleteWorkers = useMemo(() =>
        workers.filter(w => sheet[w.id]?.check_in && !sheet[w.id]?.check_out),
    [workers, sheet]);

    // Bubble alert count up to AttendanceHub for tab badge
    useEffect(() => { onAlertCount?.(incompleteWorkers.length); }, [incompleteWorkers.length, onAlertCount]);

    const dateInfo = fmtDate(date);

    const displayWorkers = workers.filter(w =>
        !search.trim() || w.name.toLowerCase().includes(search.trim().toLowerCase())
    );

    if (!projectId) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>Select a project to mark attendance.</div>;

    const TOAST_CFG = {
        CHECK_IN:  { bg: '#022c22', border: '#10b981', color: '#10b981', icon: '▶', label: 'CHECK IN'  },
        CHECK_OUT: { bg: '#030d1a', border: '#3b82f6', color: '#3b82f6', icon: '■', label: 'CHECK OUT' },
        IGNORED:   { bg: '#1c1400', border: '#f59e0b', color: '#f59e0b', icon: '⏳', label: 'TOO SOON' },
        ERROR:     { bg: '#1a0303', border: '#ef4444', color: '#ef4444', icon: '✕', label: 'ERROR'    },
    };

    return (
        <div style={{ position: 'relative' }}>

            {/* ── QR Scanner fullscreen overlay (desktop) ── */}
            {scannerOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 300,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{ width: '100%', maxWidth: 520, height: '90vh', borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
                        <QRScannerTab
                            projectId={projectId}
                            onClose={() => setScannerOpen(false)}
                            onScanSuccess={handleScanSuccess}
                        />
                    </div>
                </div>
            )}

            {/* ── Scan toast (desktop) ── */}
            {scanToast && (() => {
                const tc = TOAST_CFG[scanToast.action] || TOAST_CFG.ERROR;
                return (
                    <div style={{
                        position: 'fixed', top: 20, right: 24, zIndex: 310,
                        background: tc.bg, border: `1.5px solid ${tc.border}`,
                        borderRadius: 12, padding: '12px 16px', minWidth: 260,
                        display: 'flex', alignItems: 'center', gap: 10,
                        boxShadow: `0 4px 24px ${tc.border}40`,
                        animation: 'slideDown 0.25s ease',
                    }}>
                        <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>
                        <span style={{ fontSize: 20 }}>{tc.icon}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 900, fontSize: 13, color: tc.color }}>{tc.label}</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2 }}>
                                {scanToast.worker}
                                {scanToast.checkIn  && <span style={{ marginLeft: 8, color: '#10b981' }}>🟢 {scanToast.checkIn}</span>}
                                {scanToast.checkOut && <span style={{ marginLeft: 8, color: '#3b82f6' }}>🔴 {scanToast.checkOut}</span>}
                            </div>
                        </div>
                        <button onClick={() => setScanToast(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer' }}>✕</button>
                    </div>
                );
            })()}

            {/* ── Controls row (Mobile Layout) ── */}
            <div style={{ padding: '0 16px 14px' }}>
                {/* 1. Date Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <button onClick={() => setDate(d => shiftDate(d, -1))} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', cursor: 'pointer', fontSize: 18 }}>‹</button>
                    <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: date === todayStr() ? '#f97316' : 'var(--t-text)' }}>{dateInfo.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--t-text3)', marginTop: 2 }}>{dateInfo.sub}</div>
                    </div>
                    <button onClick={() => setDate(d => shiftDate(d, +1))} disabled={date >= todayStr()} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--t-border)', background: date >= todayStr() ? 'var(--t-border)' : 'var(--t-surface)', color: 'var(--t-text)', cursor: date >= todayStr() ? 'not-allowed' : 'pointer', fontSize: 18 }}>›</button>
                </div>

                {/* 2. Actions (Scrollable horizontal list) */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 6 }}>
                    <button onClick={() => setScannerOpen(true)} style={{
                        padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap',
                        background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1.5px solid #f97316', flexShrink: 0,
                    }}>📷 Scan QR</button>
                    
                    {['PRESENT','ABSENT','HOLIDAY'].map(s => (
                        <button key={s} onClick={() => markAll(s)} style={{
                            padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
                            border: `2px solid ${sMeta[s].color}`, background: sMeta[s].color, color: '#fff', flexShrink: 0,
                            boxShadow: `0 2px 6px ${sMeta[s].color}40`,
                        }}>
                            {sMeta[s].emoji} All {sMeta[s].label}
                        </button>
                    ))}
                    
                    <button onClick={copyPrevious} style={{ padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', flexShrink: 0, whiteSpace: 'nowrap' }}>📋 Copy Yesterday</button>
                    <button onClick={clearAll} style={{ padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', flexShrink: 0, whiteSpace: 'nowrap' }}>🧹 Clear All</button>
                </div>

                {/* 3. Search and Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <input type="text" placeholder="🔍 Search worker…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: '9px 12px', borderRadius: 10, fontSize: 13, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)' }} />
                    <button onClick={save} disabled={saving || !dirty} style={{
                        padding: '9px 18px', borderRadius: 10, fontSize: 14, fontWeight: 800,
                        background: saved ? '#22c55e' : dirty ? '#f97316' : 'var(--t-border)',
                        color: dirty || saved ? '#fff' : 'var(--t-text3)',
                        border: 'none', cursor: (saving || !dirty) ? 'not-allowed' : 'pointer',
                    }}>{saving ? '⏳' : saved ? '✅ Saved' : '💾 Save'}</button>
                </div>
            </div>

            {/* Summary pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: incompleteWorkers.length ? 10 : 14, flexWrap: 'wrap', alignItems: 'center' }}>
                {STATUS_OPTIONS.map(s => (
                    <div key={s.value} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.color}40` }}>
                        {s.emoji} {s.label}: {counts[s.value] || 0}
                    </div>
                ))}
                <div style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'var(--t-surface)', color: 'var(--t-text3)', border: '1px solid var(--t-border)' }}>
                    Total: {workers.length}
                </div>
                {incompleteWorkers.length > 0 && (
                    <div style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                        background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                        border: '1.5px solid #f59e0b60',
                        display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                        ⚠️ {incompleteWorkers.length} missing check-out
                    </div>
                )}
            </div>

            {/* ── Incomplete checkout alert panel ── */}
            {incompleteWorkers.length > 0 && (
                <div style={{
                    marginBottom: 14, borderRadius: 12, overflow: 'hidden',
                    border: '1.5px solid #f59e0b',
                }}>
                    <div style={{
                        padding: '10px 16px', background: 'rgba(245,158,11,0.10)',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span style={{ fontSize: 18 }}>⚠️</span>
                        <span style={{ fontWeight: 900, fontSize: 13, color: '#f59e0b' }}>
                            {incompleteWorkers.length} worker{incompleteWorkers.length > 1 ? 's' : ''} checked in without check-out — status set to Half Day
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t-text3)' }}>
                            Enter check-out time below to auto-resolve
                        </span>
                    </div>
                    <div style={{ background: 'var(--t-surface)', padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {incompleteWorkers.map(w => (
                            <div key={w.id} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '4px 10px', borderRadius: 8,
                                background: 'rgba(245,158,11,0.08)', border: '1px solid #f59e0b40',
                            }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 5px #f59e0b' }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)' }}>{w.name}</span>
                                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>🟢 {sheet[w.id]?.check_in}</span>
                                <span style={{ fontSize: 11, color: '#ef444460' }}>🔴 —</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text3)' }}>Loading…</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: 'var(--t-surface)' }}>
                                {['#','Name','Trade','Status','🟢 In','🔴 Out','⏱ Total','OT (h)','Notes'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--t-text3)', borderBottom: '2px solid var(--t-border)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {displayWorkers.map((w, i) => {
                                const rec = sheet[w.id] || { status: '', overtime_hours: 0, notes: '' };
                                const sm  = sMeta[rec.status] || sMeta[""];
                                return (
                                    <tr key={w.id} style={{
                                        borderBottom: '1px solid var(--t-border)',
                                        borderLeft: `4px solid ${sm.color}`,
                                        background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                                    }}>
                                        <td style={{ padding: '8px 12px', color: 'var(--t-text3)', fontSize: 11 }}>{i + 1}</td>
                                        <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--t-text)' }}>
                                            {w.name}
                                            <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 5, background: w.worker_type === 'STAFF' ? 'rgba(59,130,246,0.1)' : 'rgba(249,115,22,0.1)', color: w.worker_type === 'STAFF' ? '#3b82f6' : '#f97316' }}>{w.worker_type}</span>
                                        </td>
                                        <td style={{ padding: '8px 12px', color: 'var(--t-text3)', fontSize: 12 }}>{w.trade_display}</td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {STATUS_OPTIONS.map(s => {
                                                    const isSel = rec.status === s.value;
                                                    return (
                                                        <button key={s.value} onClick={() => changeRec(w.id, 'status', s.value)} title={s.label} style={{
                                                            padding: '4px 8px', borderRadius: 7, fontSize: 12,
                                                            fontWeight: isSel ? 900 : 400,
                                                            border: isSel ? `2px solid ${s.color}` : '1.5px solid var(--t-border)',
                                                            background: isSel ? s.color : 'var(--t-surface)',
                                                            color: isSel ? '#fff' : '#94a3b8',
                                                            cursor: 'pointer',
                                                            boxShadow: isSel ? `0 1px 6px ${s.color}40` : 'none',
                                                            transition: 'all 0.12s',
                                                        }}>{s.emoji} <span style={{ fontSize: 10 }}>{isSel ? s.label : ''}</span></button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        {/* Check-in */}
                                        <td style={{ padding: '8px 12px' }}>
                                            <input type="time" value={(rec.check_in || '').slice(0, 5)}
                                                onChange={e => changeRec(w.id, 'check_in', e.target.value || '')}
                                                style={{
                                                    width: 90, padding: '4px 6px', borderRadius: 6, fontSize: 12,
                                                    border: `1px solid ${rec.check_in ? '#22c55e' : 'var(--t-border)'}`,
                                                    background: rec.check_in ? 'rgba(34,197,94,0.06)' : 'var(--t-bg)',
                                                    color: rec.check_in ? '#15803d' : 'var(--t-text3)',
                                                    fontWeight: rec.check_in ? 700 : 400,
                                                }} />
                                        </td>
                                        {/* Check-out */}
                                        <td style={{ padding: '8px 12px' }}>
                                            <input type="time" value={(rec.check_out || '').slice(0, 5)}
                                                onChange={e => changeRec(w.id, 'check_out', e.target.value || '')}
                                                style={{
                                                    width: 90, padding: '4px 6px', borderRadius: 6, fontSize: 12,
                                                    border: `1px solid ${rec.check_out ? '#ef4444' : 'var(--t-border)'}`,
                                                    background: rec.check_out ? 'rgba(239,68,68,0.06)' : 'var(--t-bg)',
                                                    color: rec.check_out ? '#b91c1c' : 'var(--t-text3)',
                                                    fontWeight: rec.check_out ? 700 : 400,
                                                }} />
                                        </td>
                                        {/* Total hours */}
                                        <td style={{ padding: '8px 12px', minWidth: 80 }}>
                                            {(() => {
                                                const h = calcHours(rec.check_in, rec.check_out, projSettings);
                                                if (!h) return <span style={{ color: 'var(--t-text3)', fontSize: 11 }}>—</span>;
                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                        <span style={{ fontWeight: 900, fontSize: 13, color: h.total >= parseFloat(projSettings?.working_hours_per_day || 8) ? '#22c55e' : '#f59e0b' }}>
                                                            {h.total.toFixed(1)}h
                                                        </span>
                                                        {h.ot > 0 && (
                                                            <span style={{ fontSize: 10, fontWeight: 800, color: '#8b5cf6' }}>
                                                                +{h.ot.toFixed(1)}h OT
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                <input type="number" min="0" max="24" step="0.5" value={rec.overtime_hours}
                                                    onChange={e => changeRec(w.id, 'overtime_hours', e.target.value)}
                                                    style={{ width: 60, padding: '4px 6px', borderRadius: 6, fontSize: 12, border: `1px solid ${parseFloat(rec.overtime_hours) > 0 ? '#8b5cf640' : 'var(--t-border)'}`, background: 'var(--t-bg)', color: parseFloat(rec.overtime_hours) > 0 ? '#8b5cf6' : 'var(--t-text)' }} />
                                                {rec.check_in && rec.check_out && (
                                                    <span style={{ fontSize: 9, fontWeight: 800, color: '#8b5cf6', opacity: 0.7, letterSpacing: '.04em' }}>⚡ auto</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <input type="text" value={rec.notes} onChange={e => changeRec(w.id, 'notes', e.target.value)}
                                                placeholder="note…"
                                                style={{ width: 110, padding: '4px 8px', borderRadius: 6, fontSize: 12, border: '1px solid var(--t-border)', background: 'var(--t-bg)', color: 'var(--t-text)' }} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <ConfirmModal 
                isOpen={showClearConfirm} 
                title="Clear All Attendance" 
                message={`Are you sure you want to clear all attendance data for ${date}? This will reset all statuses and times.`}
                onConfirm={handleConfirmClear} 
                onCancel={() => setShowClearConfirm(false)} 
                confirmText="Yes, Clear All"
                type="warning"
            />
        </div>
    );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function DailySheetTab({ projectId, onAlertCount }) {
    const isMobile = useIsMobile();
    return isMobile
        ? <MobileDailySheet  projectId={projectId} onAlertCount={onAlertCount} />
        : <DesktopDailySheet projectId={projectId} onAlertCount={onAlertCount} />;
}
