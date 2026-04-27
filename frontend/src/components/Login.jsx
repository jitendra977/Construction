import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';
import { useConstruction } from '../context/ConstructionContext';

// ── Rate-limit: max 5 attempts per 15 min window (client-side gate) ──────────
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS   = 5;

function getRateState() {
    try {
        const raw = sessionStorage.getItem('_lra');
        if (!raw) return { count: 0, first: Date.now() };
        return JSON.parse(raw);
    } catch { return { count: 0, first: Date.now() }; }
}

function setRateState(s) {
    sessionStorage.setItem('_lra', JSON.stringify(s));
}

function recordAttempt() {
    let s = getRateState();
    if (Date.now() - s.first > RATE_WINDOW_MS) s = { count: 0, first: Date.now() };
    s.count += 1;
    setRateState(s);
    return s;
}

function isRateLimited() {
    const s = getRateState();
    if (Date.now() - s.first > RATE_WINDOW_MS) return false;
    return s.count >= MAX_ATTEMPTS;
}

function remainingLockSec() {
    const s = getRateState();
    const elapsed = Date.now() - s.first;
    return Math.ceil((RATE_WINDOW_MS - elapsed) / 1000);
}

// ── Tiny icon components (inline SVG, no deps) ───────────────────────────────
const IconShield = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        style={{ width: 22, height: 22 }}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
const IconEye = ({ off }) => off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        style={{ width: 18, height: 18 }}>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" strokeLinecap="round" />
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" strokeLinecap="round" />
        <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
    </svg>
) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        style={{ width: 18, height: 18 }}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
const IconLock = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        style={{ width: 16, height: 16 }}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
    </svg>
);
const IconUser = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        style={{ width: 16, height: 16 }}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);
const IconAlert = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
        <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
    </svg>
);

// ── Animated background grid ──────────────────────────────────────────────────
function SecurityGrid() {
    return (
        <div style={{
            position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
        }}>
            {/* Radial glow */}
            <div style={{
                position: 'absolute', top: '20%', left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 700, height: 700, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
            }} />
            {/* Grid lines */}
            <svg width="100%" height="100%" style={{ opacity: 0.07 }}>
                <defs>
                    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#f97316" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            {/* Floating dots */}
            {[...Array(6)].map((_, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    width: 4, height: 4, borderRadius: '50%',
                    background: 'rgba(249,115,22,0.4)',
                    left: `${15 + i * 14}%`,
                    top: `${20 + (i % 3) * 20}%`,
                    animation: `pulse${i % 2} ${2 + i * 0.4}s ease-in-out infinite`,
                }} />
            ))}
            <style>{`
                @keyframes pulse0 { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.6)} }
                @keyframes pulse1 { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:.2;transform:scale(0.7)} }
            `}</style>
        </div>
    );
}

// ── Password strength meter ───────────────────────────────────────────────────
function strengthOf(pw) {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8)  s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s; // 0-4
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

// ── Main component ────────────────────────────────────────────────────────────
export default function Login() {
    const [username, setUsername]     = useState('');
    const [password, setPassword]     = useState('');
    const [showPass,  setShowPass]    = useState(false);
    const [error,     setError]       = useState('');
    const [loading,   setLoading]     = useState(false);
    const [expired,   setExpired]     = useState(false);
    const [locked,    setLocked]      = useState(false);
    const [lockSec,   setLockSec]     = useState(0);
    const [shake,     setShake]       = useState(false);
    const [success,   setSuccess]     = useState(false);
    const [capsLock,  setCapsLock]    = useState(false);

    const pwStrength = strengthOf(password);
    const lockTimer  = useRef(null);
    const navigate   = useNavigate();
    const location   = useLocation();
    const { login }  = useConstruction();

    // Session-expired banner
    useEffect(() => {
        const p = new URLSearchParams(location.search);
        if (p.get('expired') === 'true') setExpired(true);
    }, [location]);

    // Rate-limit countdown
    useEffect(() => {
        if (locked) {
            lockTimer.current = setInterval(() => {
                const s = remainingLockSec();
                if (s <= 0) { setLocked(false); clearInterval(lockTimer.current); }
                else setLockSec(s);
            }, 1000);
        }
        return () => clearInterval(lockTimer.current);
    }, [locked]);

    // Caps-lock detection
    const handleKey = useCallback((e) => {
        setCapsLock(e.getModifierState?.('CapsLock') ?? false);
    }, []);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 600);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setExpired(false);

        if (isRateLimited()) {
            setLocked(true);
            setLockSec(remainingLockSec());
            triggerShake();
            return;
        }

        setLoading(true);
        const result = await login(username, password);
        recordAttempt();

        if (result.success) {
            setSuccess(true);
            setTimeout(() => navigate('/dashboard'), 800);
        } else {
            triggerShake();
            setError(result.error || 'Invalid credentials. Please try again.');
            if (isRateLimited()) {
                setLocked(true);
                setLockSec(remainingLockSec());
            }
        }

        setLoading(false);
    };

    // ── Styles ────────────────────────────────────────────────────────────────
    const S = {
        page: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1108 40%, #0d0d0d 100%)',
            position: 'relative',
            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            padding: '20px',
        },
        card: {
            position: 'relative',
            width: '100%',
            maxWidth: 440,
            background: 'rgba(18,18,18,0.95)',
            border: '1px solid rgba(249,115,22,0.18)',
            borderRadius: 20,
            padding: '40px 40px 36px',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 0 0 1px rgba(249,115,22,0.08), 0 32px 64px rgba(0,0,0,0.6)',
            animation: shake ? 'shakeX 0.5s ease' : success ? 'fadeUp 0.4s ease' : 'slideUp 0.5s ease',
            transition: 'box-shadow 0.3s',
        },
        topBar: {
            position: 'absolute',
            top: 0, left: '10%', right: '10%',
            height: 2,
            background: 'linear-gradient(90deg, transparent, #f97316, #fb923c, transparent)',
            borderRadius: '0 0 4px 4px',
        },
        brandRow: {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, marginBottom: 6,
        },
        brandIcon: {
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
        },
        brandText: {
            fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em',
        },
        subtitle: {
            textAlign: 'center', fontSize: 12, color: '#6b7280',
            letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600,
            marginBottom: 32,
        },
        secBadge: {
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(16,185,129,0.1)', color: '#10b981',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 20, padding: '3px 10px',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: 28,
        },
        label: {
            display: 'block', fontSize: 11, fontWeight: 700,
            color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: 8,
        },
        inputWrap: {
            position: 'relative', marginBottom: 20,
        },
        inputIcon: {
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: '#6b7280', pointerEvents: 'none',
        },
        input: {
            width: '100%', padding: '13px 16px 13px 42px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, color: '#f9fafb', fontSize: 14,
            outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.2s, box-shadow 0.2s',
        },
        pwToggle: {
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: '#6b7280',
            cursor: 'pointer', padding: 4, display: 'flex',
        },
        strengthBar: {
            display: 'flex', gap: 4, marginTop: 8,
        },
        strengthSeg: (i, strength) => ({
            flex: 1, height: 3, borderRadius: 2,
            background: i < strength ? STRENGTH_COLOR[strength] : 'rgba(255,255,255,0.08)',
            transition: 'background 0.3s',
        }),
        alert: (type) => ({
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '11px 14px', borderRadius: 10, marginBottom: 20,
            fontSize: 13, fontWeight: 500,
            ...(type === 'error' ? {
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#fca5a5',
            } : type === 'warning' ? {
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
                color: '#fcd34d',
            } : {
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                color: '#6ee7b7',
            }),
        }),
        btn: {
            width: '100%', padding: '14px',
            background: loading || locked || success
                ? 'rgba(249,115,22,0.4)'
                : 'linear-gradient(135deg, #f97316, #ea580c)',
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: loading || locked ? 'not-allowed' : 'pointer',
            letterSpacing: '0.04em',
            boxShadow: loading || locked ? 'none' : '0 4px 20px rgba(249,115,22,0.35)',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        },
        divider: {
            display: 'flex', alignItems: 'center', gap: 12,
            margin: '24px 0 16px', color: '#374151',
        },
        divLine: {
            flex: 1, height: 1, background: 'rgba(255,255,255,0.06)',
        },
        footer: {
            textAlign: 'center', marginTop: 28,
            fontSize: 11, color: '#374151',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        },
    };

    const attempts = getRateState().count;
    const attemptsLeft = MAX_ATTEMPTS - attempts;

    return (
        <div style={S.page}>
            <SecurityGrid />

            <style>{`
                @keyframes slideUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
                @keyframes fadeUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
                @keyframes shakeX   {
                    0%,100%{transform:translateX(0)}
                    15%{transform:translateX(-8px)}
                    30%{transform:translateX(8px)}
                    45%{transform:translateX(-6px)}
                    60%{transform:translateX(6px)}
                    75%{transform:translateX(-3px)}
                    90%{transform:translateX(3px)}
                }
                @keyframes spin { to{transform:rotate(360deg)} }
                input:-webkit-autofill {
                    -webkit-box-shadow: 0 0 0 100px #1a1a1a inset !important;
                    -webkit-text-fill-color: #f9fafb !important;
                    caret-color: #f9fafb;
                }
                input:focus { border-color: rgba(249,115,22,0.5) !important; box-shadow: 0 0 0 3px rgba(249,115,22,0.1) !important; }
                button[type=submit]:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(249,115,22,0.45) !important; }
            `}</style>

            <div style={S.card}>
                {/* Top accent bar */}
                <div style={S.topBar} />

                {/* Brand */}
                <div style={S.brandRow}>
                    <div style={S.brandIcon}><IconShield /></div>
                    <span style={S.brandText}>ConstructPro</span>
                </div>
                <p style={S.subtitle}>Project Management Platform</p>

                {/* Security badge */}
                <div style={{ textAlign: 'center' }}>
                    <span style={S.secBadge}>
                        <IconLock />
                        256-bit TLS · JWT Auth · Rate Limited
                    </span>
                </div>

                {/* Alerts */}
                {expired && (
                    <div style={S.alert('warning')}>
                        <IconAlert />
                        <span>Your session expired. Please sign in again to continue.</span>
                    </div>
                )}

                {locked && (
                    <div style={S.alert('error')}>
                        <IconAlert />
                        <span>
                            Account temporarily locked after {MAX_ATTEMPTS} failed attempts.
                            Try again in <strong>{Math.floor(lockSec / 60)}:{String(lockSec % 60).padStart(2, '0')}</strong>.
                        </span>
                    </div>
                )}

                {!locked && error && (
                    <div style={S.alert('error')}>
                        <IconAlert />
                        <div>
                            <div>{error}</div>
                            {attemptsLeft > 0 && attemptsLeft < MAX_ATTEMPTS && (
                                <div style={{ marginTop: 4, fontSize: 11, opacity: 0.8 }}>
                                    {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining before lockout.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {success && (
                    <div style={S.alert('success')}>
                        <span style={{ fontSize: 14 }}>✓</span>
                        <span>Authentication successful. Redirecting…</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} autoComplete="on" noValidate>
                    {/* Email */}
                    <div style={S.inputWrap}>
                        <label style={S.label}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <span style={S.inputIcon}><IconUser /></span>
                            <input
                                type="email"
                                id="username"
                                autoComplete="email"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                disabled={loading || locked || success}
                                placeholder="you@company.com"
                                style={S.input}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div style={S.inputWrap}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <label style={{ ...S.label, marginBottom: 0 }}>Password</label>
                            {capsLock && (
                                <span style={{ fontSize: 10, color: '#fcd34d', fontWeight: 700 }}>
                                    ⚠ Caps Lock is on
                                </span>
                            )}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <span style={S.inputIcon}><IconLock /></span>
                            <input
                                type={showPass ? 'text' : 'password'}
                                id="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onKeyUp={handleKey}
                                required
                                disabled={loading || locked || success}
                                placeholder="Enter your password"
                                style={{ ...S.input, paddingRight: 44 }}
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPass(v => !v)}
                                style={S.pwToggle}
                                aria-label={showPass ? 'Hide password' : 'Show password'}
                            >
                                <IconEye off={showPass} />
                            </button>
                        </div>
                        {/* Strength meter — shown while typing */}
                        {password.length > 0 && (
                            <div>
                                <div style={S.strengthBar}>
                                    {[0,1,2,3].map(i => (
                                        <div key={i} style={S.strengthSeg(i, pwStrength)} />
                                    ))}
                                </div>
                                <div style={{ marginTop: 5, fontSize: 10, color: STRENGTH_COLOR[pwStrength], fontWeight: 700, letterSpacing: '0.05em' }}>
                                    {STRENGTH_LABEL[pwStrength]}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div style={S.divider}>
                        <div style={S.divLine} />
                        <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                            Secure Sign-In
                        </span>
                        <div style={S.divLine} />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || locked || success}
                        style={S.btn}
                    >
                        {loading ? (
                            <>
                                <span style={{
                                    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: '#fff', borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                    display: 'inline-block',
                                }} />
                                Authenticating…
                            </>
                        ) : locked ? (
                            <>🔒 Locked — {Math.floor(lockSec / 60)}:{String(lockSec % 60).padStart(2, '0')}</>
                        ) : success ? (
                            <>✓ Authenticated</>
                        ) : (
                            <>
                                <IconShield />
                                Sign In Securely
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div style={S.footer}>
                    <IconLock />
                    <span>Encrypted · Access logged · Session expires on idle</span>
                </div>
            </div>
        </div>
    );
}
