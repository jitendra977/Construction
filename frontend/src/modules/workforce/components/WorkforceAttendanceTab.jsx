/**
 * WorkforceAttendanceTab.jsx
 * ──────────────────────────
 * Daily attendance sheet for ALL workforce members.
 *
 * Features:
 *  - Date picker (default today)
 *  - One row per member showing: name, role, type, link status, today's attendance
 *  - Quick mark buttons: Present · Half · Absent · Leave
 *  - Auto-creates AttendanceWorker if a member isn't linked yet (auto_sync=true)
 *  - "Sync All" bulk-creates AttendanceWorkers for every unlinked member
 *  - Summary bar: Present / Absent / Half Day / Not Marked
 *  - Filter by worker type and status
 *  - Shows check-in / check-out times when available
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import workforceService from '../../../services/workforceService';
import attendanceService from '../../../services/attendanceService';

// ── Status config ─────────────────────────────────────────────────────────────
const ATT_STATUS = {
    PRESENT:    { label: 'Present',  color: '#fff', bg: '#22c55e', short: 'P' },
    HALF_DAY:   { label: 'Half Day', color: '#fff', bg: '#f59e0b', short: 'H' },
    ABSENT:     { label: 'Absent',   color: '#fff', bg: '#ef4444', short: 'A' },
    LEAVE:      { label: 'Leave',    color: '#fff', bg: '#6366f1', short: 'L' },
    HOLIDAY:    { label: 'Holiday',  color: '#fff', bg: '#06b6d4', short: '🎉' },
    NOT_MARKED: { label: '—',        color: '#9ca3af', bg: '#f3f4f6', short: '—' },
};

const TYPE_COLORS = {
    LABOUR:        { bg: '#dbeafe', color: '#1e40af' },
    STAFF:         { bg: '#ede9fe', color: '#5b21b6' },
    SUBCONTRACTOR: { bg: '#fef3c7', color: '#92400e' },
    FREELANCE:     { bg: '#d1fae5', color: '#065f46' },
};

// Quick-mark buttons
const MARK_BUTTONS = [
    { status: 'PRESENT',  label: '✅ Present',  bg: '#22c55e' },
    { status: 'HALF_DAY', label: '½ Half',      bg: '#f59e0b' },
    { status: 'ABSENT',   label: '❌ Absent',   bg: '#ef4444' },
    { status: 'LEAVE',    label: '🏖 Leave',    bg: '#6366f1' },
];

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

// ── Summary bar ───────────────────────────────────────────────────────────────
function SummaryBar({ members }) {
    const counts = useMemo(() => {
        const c = { PRESENT: 0, HALF_DAY: 0, ABSENT: 0, LEAVE: 0, HOLIDAY: 0, NOT_MARKED: 0 };
        for (const m of members) c[m.today_status || 'NOT_MARKED']++;
        return c;
    }, [members]);

    const cards = [
        { key: 'PRESENT',    label: 'Present',    icon: '✅', color: '#22c55e' },
        { key: 'ABSENT',     label: 'Absent',     icon: '❌', color: '#ef4444' },
        { key: 'HALF_DAY',   label: 'Half Day',   icon: '½',  color: '#f59e0b' },
        { key: 'LEAVE',      label: 'Leave',      icon: '🏖', color: '#6366f1' },
        { key: 'NOT_MARKED', label: 'Unmarked',   icon: '—',  color: '#9ca3af' },
    ];

    return (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            {cards.map(c => (
                <div key={c.key} style={{
                    flex: '1 1 80px', minWidth: 80,
                    background: 'var(--t-surface)', border: '1px solid var(--t-border)',
                    borderRadius: 12, padding: '10px 14px',
                }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: c.color }}>{counts[c.key]}</div>
                    <div style={{ fontSize: 11, color: 'var(--t-text3)', marginTop: 1 }}>{c.icon} {c.label}</div>
                </div>
            ))}
        </div>
    );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status, checkIn, checkOut }) {
    const s = ATT_STATUS[status] || ATT_STATUS.NOT_MARKED;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                background: s.bg, color: s.color,
            }}>{s.label}</span>
            {(checkIn || checkOut) && (
                <span style={{ fontSize: 10, color: 'var(--t-text3)' }}>
                    {checkIn && `In: ${checkIn}`}{checkOut && ` · Out: ${checkOut}`}
                </span>
            )}
        </div>
    );
}

// ── Link status badge ─────────────────────────────────────────────────────────
function LinkBadge({ hasAttendance, hasAccount }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                background: hasAttendance ? '#d1fae5' : '#fee2e2',
                color: hasAttendance ? '#065f46' : '#991b1b',
            }}>
                {hasAttendance ? '⏱ Attendance' : '⚠ No Record'}
            </span>
            <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                background: hasAccount ? '#ede9fe' : '#f3f4f6',
                color: hasAccount ? '#5b21b6' : '#6b7280',
            }}>
                {hasAccount ? '👤 Account' : '— No Login'}
            </span>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WorkforceAttendanceTab({ projectId }) {
    const [members, setMembers]       = useState([]);
    const [loading, setLoading]       = useState(true);
    const [date, setDate]             = useState(todayStr());
    const [marking, setMarking]       = useState({}); // { memberId: true }
    const [syncing, setSyncing]       = useState(false);
    const [error, setError]           = useState('');
    const [toast, setToast]           = useState('');
    const [search, setSearch]         = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');

    // Load members list (with today's attendance status embedded)
    const load = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError('');
        try {
            const res = await workforceService.getMembers({
                current_project: projectId,
                page_size: 500,
            });
            const list = Array.isArray(res) ? res : (res.results || []);
            setMembers(list);
        } catch {
            setError('Failed to load workforce members.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // When date changes to a non-today date, fetch attendance records separately
    const [attendanceMap, setAttendanceMap] = useState({}); // { attendanceWorkerId: record }
    const isToday = date === todayStr();

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!projectId || isToday) {
            setAttendanceMap({});
            return;
        }
        // Fetch records for the selected date
        attendanceService.getRecords({ project: projectId, date }).then(res => {
            const list = Array.isArray(res) ? res : (res.results || []);
            const map = {};
            for (const r of list) map[r.worker] = r;
            setAttendanceMap(map);
        }).catch(() => {});
    }, [date, projectId, isToday]);

    // Resolve status for a member on the selected date
    const getStatus = (member) => {
        if (isToday) {
            return {
                status: member.today_status || 'NOT_MARKED',
                checkIn: member.today_check_in,
                checkOut: member.today_check_out,
            };
        }
        const awId = member.attendance_worker_id;
        if (awId && attendanceMap[awId]) {
            const r = attendanceMap[awId];
            return { status: r.status, checkIn: r.check_in, checkOut: r.check_out };
        }
        return { status: 'NOT_MARKED', checkIn: null, checkOut: null };
    };

    // Mark attendance for a single member
    const markMember = async (member, markStatus) => {
        setMarking(p => ({ ...p, [member.id]: markStatus }));
        setError('');
        try {
            await workforceService.markToday(member.id, {
                status: markStatus,
                date,
                auto_sync: true,
            });
            showToast(`${member.full_name || member.name} → ${ATT_STATUS[markStatus]?.label}`);
            // Refresh the list to get updated today_status
            await load();
        } catch (e) {
            const msg = e?.response?.data?.error || 'Failed to mark attendance.';
            setError(`${member.full_name || member.name}: ${msg}`);
        } finally {
            setMarking(p => { const n = { ...p }; delete n[member.id]; return n; });
        }
    };

    // Bulk sync: create AttendanceWorkers for all unlinked members
    const syncAll = async () => {
        setSyncing(true);
        setError('');
        try {
            const res = await workforceService.syncAllAttendance({ project: projectId });
            showToast(`✅ Synced ${res.total_synced} members (${res.created} new records created)`);
            await load();
        } catch {
            setError('Sync failed. Please try again.');
        } finally {
            setSyncing(false);
        }
    };

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    // Mark ALL visible members as a status at once
    const markAll = async (markStatus) => {
        setSyncing(true);
        setError('');
        let done = 0;
        for (const m of filtered) {
            try {
                await workforceService.markToday(m.id, { status: markStatus, date, auto_sync: true });
                done++;
            } catch { /* continue */ }
        }
        showToast(`✅ Marked ${done} members as ${ATT_STATUS[markStatus]?.label}`);
        await load();
        setSyncing(false);
    };

    // Filter helpers
    const filtered = useMemo(() => {
        return members.filter(m => {
            if (typeFilter !== 'ALL' && m.worker_type !== typeFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                const name = (m.full_name || m.name || '').toLowerCase();
                const role = (m.role_name || '').toLowerCase();
                if (!name.includes(q) && !role.includes(q)) return false;
            }
            return true;
        });
    }, [members, typeFilter, search]);

    const unlinkedCount = members.filter(m => !m.has_attendance_link && !m.attendance_worker_id).length;

    return (
        <div>
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0, fontWeight: 900, fontSize: 20 }}>Daily Attendance</h2>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--t-text3)' }}>
                        {members.length} members · {filtered.length} shown
                        {unlinkedCount > 0 && (
                            <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 700 }}>
                                ⚠ {unlinkedCount} not linked to attendance records
                            </span>
                        )}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Date picker */}
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13, cursor: 'pointer' }}
                    />
                    {/* Sync all button */}
                    {unlinkedCount > 0 && (
                        <button
                            onClick={syncAll}
                            disabled={syncing}
                            style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontWeight: 700, fontSize: 12, cursor: syncing ? 'not-allowed' : 'pointer' }}
                        >
                            {syncing ? '⏳ Syncing…' : `⚡ Sync All (${unlinkedCount})`}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Summary ── */}
            {!loading && <SummaryBar members={filtered.map(m => ({ today_status: getStatus(m).status }))} />}

            {/* ── Filters row ── */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search name or role…"
                    style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--t-border)', background: 'var(--t-surface)', color: 'var(--t-text)', fontSize: 13, flex: '1 1 160px', minWidth: 140 }}
                />
                {['ALL', 'LABOUR', 'STAFF', 'SUBCONTRACTOR', 'FREELANCE'].map(t => (
                    <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        style={{
                            padding: '6px 14px', borderRadius: 20, border: '1px solid var(--t-border)',
                            fontWeight: 700, fontSize: 11, cursor: 'pointer',
                            background: typeFilter === t ? '#000' : 'var(--t-surface)',
                            color: typeFilter === t ? '#fff' : 'var(--t-text)',
                        }}
                    >{t === 'ALL' ? 'All Types' : t.charAt(0) + t.slice(1).toLowerCase()}</button>
                ))}

                {/* Mark all dropdown trigger */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--t-text3)', alignSelf: 'center', fontWeight: 600 }}>Mark all:</span>
                    {MARK_BUTTONS.map(b => (
                        <button
                            key={b.status}
                            onClick={() => markAll(b.status)}
                            disabled={syncing}
                            style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: b.bg, color: '#fff', fontWeight: 700, fontSize: 11, cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1 }}
                        >{ATT_STATUS[b.status]?.short}</button>
                    ))}
                </div>
            </div>

            {/* ── Error / Toast ── */}
            {error && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', borderRadius: 10, color: '#dc2626', fontSize: 12, marginBottom: 12, fontWeight: 600 }}>
                    ⚠️ {error}
                </div>
            )}

            {/* ── Members table ── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--t-text3)' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                    Loading members…
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, background: 'var(--t-surface)', borderRadius: 16, border: '1px dashed var(--t-border)' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>👷</div>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>No members found</div>
                    <div style={{ fontSize: 12, color: 'var(--t-text3)' }}>Add staff in the Members tab first.</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--t-bg)', border: '1px solid var(--t-border)', borderRadius: 14, overflow: 'hidden' }}>
                    {/* Table header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.2fr 1fr 1.4fr 1.6fr',
                        padding: '10px 18px', background: 'var(--t-surface)',
                        borderBottom: '2px solid var(--t-border)',
                        fontSize: 10, fontWeight: 800, color: 'var(--t-text3)', textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                        <div>Member</div>
                        <div>Role</div>
                        <div>Links</div>
                        <div>Status</div>
                        <div>Mark</div>
                    </div>

                    {filtered.map((m, idx) => {
                        const { status: attStatus, checkIn, checkOut } = getStatus(m);
                        const isMarking = !!marking[m.id];
                        const typeStyle = TYPE_COLORS[m.worker_type] || {};
                        const hasAttendanceWorker = !!(m.has_attendance_link || m.attendance_worker_id);
                        const hasAccount = !!m.account;

                        return (
                            <div
                                key={m.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1.2fr 1fr 1.4fr 1.6fr',
                                    padding: '12px 18px',
                                    borderBottom: idx < filtered.length - 1 ? '1px solid var(--t-border)' : 'none',
                                    background: isMarking ? 'rgba(99,102,241,0.04)' : 'transparent',
                                    alignItems: 'center',
                                    gap: 8,
                                    transition: 'background 0.15s',
                                }}
                            >
                                {/* Member name */}
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
                                        {m.full_name || `${m.first_name} ${m.last_name}`.trim()}
                                    </div>
                                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10, ...typeStyle }}>
                                            {m.worker_type}
                                        </span>
                                        <span style={{ fontSize: 10, color: 'var(--t-text3)' }}>{m.employee_id}</span>
                                    </div>
                                </div>

                                {/* Role */}
                                <div style={{ fontSize: 12, color: 'var(--t-text3)' }}>
                                    {m.role_name || '—'}
                                </div>

                                {/* Link status */}
                                <LinkBadge hasAttendance={hasAttendanceWorker} hasAccount={hasAccount} />

                                {/* Current status */}
                                <StatusPill status={attStatus} checkIn={checkIn} checkOut={checkOut} />

                                {/* Mark buttons */}
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {MARK_BUTTONS.map(b => {
                                        const isCurrent = attStatus === b.status;
                                        return (
                                            <button
                                                key={b.status}
                                                onClick={() => markMember(m, b.status)}
                                                disabled={isMarking}
                                                title={`Mark ${b.label}`}
                                                style={{
                                                    padding: '4px 8px', borderRadius: 7,
                                                    background: isCurrent ? b.bg : 'var(--t-surface)',
                                                    color: isCurrent ? '#fff' : 'var(--t-text3)',
                                                    fontWeight: 800, fontSize: 11,
                                                    cursor: isMarking ? 'wait' : 'pointer',
                                                    border: `1px solid ${isCurrent ? b.bg : 'var(--t-border)'}`,
                                                    opacity: isMarking ? 0.5 : 1,
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {ATT_STATUS[b.status]?.short}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Toast notification ── */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
                    padding: '12px 20px', borderRadius: 12,
                    background: '#111', color: '#fff',
                    fontWeight: 700, fontSize: 13,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                    animation: 'slideUp 0.2s ease',
                }}>
                    {toast}
                    <style>{`@keyframes slideUp { from { transform: translateY(10px); opacity:0; } to { transform: translateY(0); opacity:1; } }`}</style>
                </div>
            )}
        </div>
    );
}
