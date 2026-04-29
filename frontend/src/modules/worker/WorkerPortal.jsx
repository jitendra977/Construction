/**
 * WorkerPortal.jsx
 * ─────────────────
 * Mobile-first portal for field workers.
 * Route: /worker
 *
 * States:
 *   login  → phone + PIN form
 *   home   → greeting, today's attendance status, check-in / check-out button
 *   team   → team leader view (my-team)
 */
import React, { useState, useEffect } from 'react';
import workerPortalApi from '../../services/workerPortalApi';

// ── Helpers ───────────────────────────────────────────────────────────────────
const ATTEND_COLOR = {
    PRESENT:    '#22c55e',
    HALF_DAY:   '#f59e0b',
    ABSENT:     '#ef4444',
    LEAVE:      '#6366f1',
    HOLIDAY:    '#06b6d4',
    NOT_MARKED: '#9ca3af',
};

function fmt(timeStr) {
    if (!timeStr) return '—';
    return timeStr.slice(0, 5);
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
    const [phone, setPhone]     = useState('');
    const [pin, setPin]         = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!phone || !pin) return setError('Enter your phone number and PIN.');
        setLoading(true); setError('');
        try {
            const data = await workerPortalApi.login(phone.trim(), pin.trim());
            onLogin(data.worker);
        } catch (err) {
            setError(err?.response?.data?.error || 'Invalid phone or PIN.');
        } finally { setLoading(false); }
    };

    return (
        <div style={{
            minHeight: '100dvh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: 24,
        }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ fontSize: 52, marginBottom: 8 }}>🏗️</div>
                <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 24, margin: 0 }}>Worker Portal</h1>
                <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0' }}>Sign in with your phone & PIN</p>
            </div>

            <form onSubmit={handleSubmit} style={{
                width: '100%', maxWidth: 360,
                background: '#1e293b', borderRadius: 20, padding: 28,
                border: '1px solid #334155',
            }}>
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Phone Number</label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="98XXXXXXXX"
                        autoComplete="username"
                        style={inputStyle}
                    />
                </div>
                <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>PIN</label>
                    <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={pin}
                        onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        autoComplete="current-password"
                        style={{ ...inputStyle, letterSpacing: '0.3em', fontSize: 20 }}
                    />
                </div>
                {error && (
                    <div style={{ color: '#fca5a5', fontSize: 12, marginBottom: 14, textAlign: 'center' }}>{error}</div>
                )}
                <button type="submit" disabled={loading} style={{
                    width: '100%', padding: 14, borderRadius: 12, border: 'none',
                    background: loading ? '#475569' : '#f97316',
                    color: '#fff', fontWeight: 900, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                }}>
                    {loading ? 'Signing in…' : 'Sign In'}
                </button>
            </form>
        </div>
    );
}

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 };
const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1px solid #334155', background: '#0f172a',
    color: '#f1f5f9', fontSize: 15, outline: 'none', boxSizing: 'border-box',
};

// ── Home Screen ───────────────────────────────────────────────────────────────
function HomeScreen({ worker, onLogout }) {
    const [profile, setProfile]   = useState(null);
    const [loading, setLoading]   = useState(true);
    const [checking, setChecking] = useState(false);
    const [message, setMessage]   = useState('');
    const [tab, setTab]           = useState('home'); // 'home' | 'history' | 'team'

    const load = async () => {
        setLoading(true);
        try {
            const data = await workerPortalApi.getMe();
            setProfile(data);
        } catch (e) {
            setMessage('Failed to load profile.');
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const doCheckin = async (type) => {
        setChecking(true); setMessage('');
        try {
            const res = await (type === 'CHECK_IN' ? workerPortalApi.checkIn() : workerPortalApi.checkOut());
            setMessage(`${type === 'CHECK_IN' ? '✅ Checked in' : '👋 Checked out'} at ${fmt(res.time)}`);
            load();
        } catch (e) {
            setMessage(e?.response?.data?.error || `${type} failed.`);
        } finally { setChecking(false); }
    };

    const today    = profile?.today || {};
    const attended = today.status === 'PRESENT' || today.status === 'HALF_DAY';
    const checkedIn  = !!today.check_in && !today.check_out;
    const checkedOut = !!today.check_out;

    const bg = '#0f172a';
    const surface = '#1e293b';
    const border = '#334155';
    const text = '#f1f5f9';
    const muted = '#94a3b8';

    return (
        <div style={{ minHeight: '100dvh', background: bg, color: text, fontFamily: 'system-ui, sans-serif' }}>

            {/* Header */}
            <div style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {new Date().toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })}
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>
                        {worker?.full_name || profile?.full_name || 'Worker'}
                    </div>
                    <div style={{ fontSize: 12, color: muted }}>{worker?.employee_id || profile?.employee_id}</div>
                </div>
                <button onClick={onLogout} style={{
                    padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`,
                    background: 'transparent', color: muted, fontSize: 12, cursor: 'pointer',
                }}>Logout</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${border}`, background: surface }}>
                {[
                    { id: 'home', label: '🏠 Home' },
                    { id: 'history', label: '📅 History' },
                    ...(profile?.teams?.length ? [{ id: 'team', label: '👥 My Team' }] : []),
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        flex: 1, padding: '12px 4px', border: 'none', background: 'transparent',
                        color: tab === t.id ? '#f97316' : muted, fontSize: 13, fontWeight: tab === t.id ? 800 : 500,
                        borderBottom: tab === t.id ? '2px solid #f97316' : '2px solid transparent',
                        cursor: 'pointer',
                    }}>{t.label}</button>
                ))}
            </div>

            <div style={{ padding: 20 }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: muted }}>Loading…</div>
                ) : tab === 'home' ? (
                    <>
                        {/* Today Status */}
                        <div style={{
                            background: surface, borderRadius: 16, padding: 20,
                            border: `1px solid ${border}`, marginBottom: 20,
                            borderTop: `4px solid ${ATTEND_COLOR[today.status] || ATTEND_COLOR.NOT_MARKED}`,
                        }}>
                            <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase', marginBottom: 8 }}>Today's Status</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 900, fontSize: 22 }}>{today.status?.replace('_', ' ') || 'NOT MARKED'}</div>
                                    {today.check_in && (
                                        <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                                            In: <strong style={{ color: '#22c55e' }}>{fmt(today.check_in)}</strong>
                                            {today.check_out && <> &nbsp;Out: <strong style={{ color: '#ef4444' }}>{fmt(today.check_out)}</strong></>}
                                        </div>
                                    )}
                                </div>
                                <div style={{
                                    width: 52, height: 52, borderRadius: '50%',
                                    background: `${ATTEND_COLOR[today.status] || ATTEND_COLOR.NOT_MARKED}22`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                                }}>
                                    {today.status === 'PRESENT' ? '✅' : today.status === 'ABSENT' ? '❌' : today.status === 'LEAVE' ? '🏖️' : '⏱️'}
                                </div>
                            </div>
                        </div>

                        {/* Check In / Out Button */}
                        {!checkedOut && (
                            <button
                                onClick={() => doCheckin(checkedIn ? 'CHECK_OUT' : 'CHECK_IN')}
                                disabled={checking}
                                style={{
                                    width: '100%', padding: 18, borderRadius: 16, border: 'none',
                                    background: checking ? '#475569' : (checkedIn ? '#ef4444' : '#22c55e'),
                                    color: '#fff', fontWeight: 900, fontSize: 18, cursor: checking ? 'not-allowed' : 'pointer',
                                    boxShadow: checking ? 'none' : `0 8px 24px ${checkedIn ? '#ef444440' : '#22c55e40'}`,
                                    transition: 'all 0.2s',
                                    marginBottom: 20,
                                }}
                            >
                                {checking ? '⏳ Processing…' : checkedIn ? '👋 Check Out' : '✅ Check In'}
                            </button>
                        )}
                        {checkedOut && (
                            <div style={{ textAlign: 'center', padding: 18, color: muted, fontSize: 14, marginBottom: 20 }}>
                                Day complete — see you tomorrow 🌅
                            </div>
                        )}

                        {message && (
                            <div style={{ background: '#0f2926', border: '1px solid #22c55e', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#86efac', marginBottom: 16 }}>
                                {message}
                            </div>
                        )}

                        {/* Week Summary */}
                        {profile?.week_summary && (
                            <div style={{ background: surface, borderRadius: 14, padding: 16, border: `1px solid ${border}` }}>
                                <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase', marginBottom: 12 }}>This Week</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                                    {[
                                        { label: 'Days Present', value: profile.week_summary.present ?? 0, color: '#22c55e' },
                                        { label: 'Days Absent',  value: profile.week_summary.absent  ?? 0, color: '#ef4444' },
                                        { label: 'On Leave',     value: profile.week_summary.leave   ?? 0, color: '#6366f1' },
                                    ].map(s => (
                                        <div key={s.label} style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                                            <div style={{ fontSize: 10, color: muted }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : tab === 'history' ? (
                    <div>
                        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: muted, textTransform: 'uppercase' }}>Attendance History</h3>
                        {profile?.attendance_history?.length ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {profile.attendance_history.map((a, i) => (
                                    <div key={i} style={{
                                        background: surface, borderRadius: 10, padding: '10px 14px',
                                        border: `1px solid ${border}`,
                                        borderLeft: `4px solid ${ATTEND_COLOR[a.status] || ATTEND_COLOR.NOT_MARKED}`,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13 }}>{a.date}</div>
                                            <div style={{ fontSize: 11, color: muted }}>
                                                {a.check_in ? `In: ${fmt(a.check_in)}` : ''}
                                                {a.check_out ? ` · Out: ${fmt(a.check_out)}` : ''}
                                            </div>
                                        </div>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                                            background: `${ATTEND_COLOR[a.status] || ATTEND_COLOR.NOT_MARKED}22`,
                                            color: ATTEND_COLOR[a.status] || ATTEND_COLOR.NOT_MARKED,
                                        }}>{a.status?.replace('_', ' ') || '—'}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40, color: muted }}>No history available.</div>
                        )}
                    </div>
                ) : tab === 'team' ? (
                    <TeamView teams={profile?.teams || []} muted={muted} surface={surface} border={border} />
                ) : null}
            </div>
        </div>
    );
}

function TeamView({ teams, muted, surface, border }) {
    const [data, setData]   = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        workerPortalApi.getMyTeam()
            .then(d => setData(d))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ textAlign:'center', padding:40, color: muted }}>Loading team…</div>;
    if (!data)   return <div style={{ textAlign:'center', padding:40, color: muted }}>Team data unavailable.</div>;

    const teamList = Array.isArray(data) ? data : (data.teams || []);

    return (
        <div>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: muted, textTransform: 'uppercase' }}>My Team Today</h3>
            {teamList.map(team => (
                <div key={team.id} style={{ background: surface, borderRadius: 14, padding: 16, border: `1px solid ${border}`, marginBottom: 14 }}>
                    <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 12 }}>{team.name}</div>
                    {(team.members || []).map(m => (
                        <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${border}` }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.full_name || m.name}</div>
                                <div style={{ fontSize: 11, color: muted }}>{m.effective_trade || m.worker_type}</div>
                            </div>
                            <span style={{
                                padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                                background: `${ATTEND_COLOR[m.today_status] || ATTEND_COLOR.NOT_MARKED}22`,
                                color: ATTEND_COLOR[m.today_status] || ATTEND_COLOR.NOT_MARKED,
                            }}>
                                {m.today_status?.replace('_', ' ') || '—'}
                            </span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function WorkerPortal() {
    const [worker, setWorker] = useState(() => workerPortalApi.getCurrentWorker());

    const handleLogin = (w) => setWorker(w);
    const handleLogout = () => { workerPortalApi.logout(); setWorker(null); };

    if (!worker) return <LoginScreen onLogin={handleLogin} />;
    return <HomeScreen worker={worker} onLogout={handleLogout} />;
}
