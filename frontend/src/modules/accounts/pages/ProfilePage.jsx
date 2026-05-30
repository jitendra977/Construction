/**
 * ProfilePage — fully functional profile management.
 * Tabs: Profile (personal info + avatar), Security (password + email), Activity (log)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useConstruction } from '../../../context/ConstructionContext';
import { useAccounts } from '../context/AccountsContext';
import { useSearchParams } from 'react-router-dom';
import accountsApi from '../services/accountsApi';
import { mediaUrl } from '../../../services/createApiClient';
import Avatar from '../components/shared/Avatar';
import Badge from '../components/shared/Badge';
import SignaturePad from '../../../components/common/SignaturePad';
import * as faceapi from '@vladmandic/face-api';

function beep(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    if (type === 'tick') {
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      o.start(); o.stop(ctx.currentTime + 0.1);
    } else if (type === 'success') {
      o.type = 'sine';
      o.frequency.setValueAtTime(523, ctx.currentTime);
      o.frequency.setValueAtTime(783, ctx.currentTime + 0.12);
      o.frequency.setValueAtTime(1046, ctx.currentTime + 0.24);
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      o.start(); o.stop(ctx.currentTime + 0.5);
    } else if (type === 'error') {
      o.type = 'sawtooth'; o.frequency.value = 120;
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      o.start(); o.stop(ctx.currentTime + 0.3);
    }
  } catch (_) {}
}

// ── Shared style constants ─────────────────────────────────────────────────────
const inputStyle = {
    width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 10,
    border: '1px solid var(--t-border)', background: 'var(--t-bg)',
    color: 'var(--t-text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
const labelStyle = {
    display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'var(--t-text3)', marginBottom: 4,
};
const cardStyle = {
    borderRadius: 14, border: '1px solid var(--t-border)',
    background: 'var(--t-surface)', padding: 24, marginBottom: 20,
};
const sectionTitle = {
    margin: '0 0 16px', fontSize: 13, fontWeight: 900, color: 'var(--t-text)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
};

const ROLE_COLORS = {
    SUPER_ADMIN: '#ef4444', HOME_OWNER: '#f97316',
    LEAD_ENGINEER: '#3b82f6', CONTRACTOR: '#8b5cf6', VIEWER: '#6b7280',
};

const ACTION_ICONS = {
    LOGIN: '🔐', LOGOUT: '🚪', CREATE: '✨', UPDATE: '✏️',
    DELETE: '🗑️', VIEW: '👁️', APPROVE: '✅', REJECT: '❌', PAY: '💰',
};
const ACTION_COLORS = {
    LOGIN: '#10b981', LOGOUT: '#6b7280', CREATE: '#6366f1', UPDATE: '#f59e0b',
    DELETE: '#ef4444', VIEW: '#3b82f6', APPROVE: '#10b981', REJECT: '#ef4444', PAY: '#f97316',
};

// ── Feedback banner ────────────────────────────────────────────────────────────
function Feedback({ msg }) {
    if (!msg) return null;
    const ok = msg.type === 'success';
    return (
        <div style={{
            padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600,
            background: ok ? '#10b98118' : '#ef444418',
            color: ok ? '#10b981' : '#ef4444',
            border: `1px solid ${ok ? '#10b98130' : '#ef444430'}`,
        }}>
            {ok ? '✅' : '❌'} {msg.text}
        </div>
    );
}

// ── Profile Tab ────────────────────────────────────────────────────────────────
function ProfileTab({ user, updateProfile, refreshStats, avatarFile, avatarPreview, setAvatarFile, setAvatarPreview }) {
    const [form, setForm] = useState({
        first_name: '', last_name: '', bio: '',
        phone_number: '', address: '',
        preferred_language: 'en', notifications_enabled: true,
        digital_signature: '',
    });
    const [msg,  setMsg]  = useState(null);
    const [busy, setBusy] = useState(false);
    const [showPad, setShowPad] = useState(false);

    useEffect(() => {
        if (user) {
            setForm({
                first_name:            user.first_name            || '',
                last_name:             user.last_name             || '',
                bio:                   user.bio                   || '',
                phone_number:          user.phone_number          || '',
                address:               user.address               || '',
                preferred_language:    user.preferred_language    || 'en',
                notifications_enabled: user.notifications_enabled ?? true,
                digital_signature:     user.digital_signature     || '',
            });
        }
    }, [user]);


    const handleSave = async (e) => {
        e.preventDefault();
        setBusy(true); setMsg(null);
        try {
            let payload;
            if (avatarFile) {
                payload = new FormData();
                Object.entries(form).forEach(([k, v]) => payload.append(k, v));
                payload.append('profile_image', avatarFile);
            } else {
                payload = { ...form };
            }
            await updateProfile(payload);
            refreshStats?.();
            setMsg({ type: 'success', text: 'Profile updated successfully!' });
            setAvatarFile(null);
            setAvatarPreview(null);
            setShowPad(false);
        } catch (err) {
            setMsg({ type: 'error', text: err?.response?.data?.detail || err?.response?.data?.error || 'Update failed.' });
        } finally {
            setBusy(false);
        }
    };

    const currentAvatarUrl = avatarPreview || (user?.profile_image ? mediaUrl(user.profile_image) : null);

    return (
        <form onSubmit={handleSave}>
            <Feedback msg={msg} />

            {/* Personal info */}
            <div style={cardStyle}>
                <p style={sectionTitle}>Personal Information</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                        <label style={labelStyle}>First Name</label>
                        <input style={inputStyle} value={form.first_name}
                            onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                            placeholder="First name" />
                    </div>
                    <div>
                        <label style={labelStyle}>Last Name</label>
                        <input style={inputStyle} value={form.last_name}
                            onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                            placeholder="Last name" />
                    </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Phone Number</label>
                    <input style={inputStyle} value={form.phone_number}
                        onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                        placeholder="+977-XXXXXXXXXX" />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Address</label>
                    <input style={inputStyle} value={form.address}
                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                        placeholder="City, District, Nepal" />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Bio</label>
                    <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                        value={form.bio}
                        onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                        placeholder="Short bio about yourself…" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                        <label style={labelStyle}>Preferred Language</label>
                        <select style={inputStyle} value={form.preferred_language}
                            onChange={e => setForm(f => ({ ...f, preferred_language: e.target.value }))}>
                            <option value="en">English</option>
                            <option value="ne">नेपाली</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
                        <input type="checkbox" id="notif" checked={form.notifications_enabled}
                            onChange={e => setForm(f => ({ ...f, notifications_enabled: e.target.checked }))}
                            style={{ width: 16, height: 16, cursor: 'pointer' }} />
                        <label htmlFor="notif" style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)', cursor: 'pointer' }}>
                            Enable Notifications
                        </label>
                    </div>
                </div>
            </div>

            {/* Digital Signature */}
            <div style={cardStyle}>
                <p style={sectionTitle}>🖋️ Digital Signature</p>
                <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--t-text3)' }}>
                    Your signature will be automatically applied to purchase orders, payment receipts, and reports.
                </p>
                
                {form.digital_signature && !showPad ? (
                    <div style={{ textAlign: 'center', padding: 20, border: '1px dashed var(--t-border)', borderRadius: 12, background: 'var(--t-bg)' }}>
                        <img src={form.digital_signature} alt="Saved Signature" style={{ maxHeight: 100, marginBottom: 16 }} />
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                            <button type="button" onClick={() => setShowPad(true)}
                                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #6366f1', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                                🔄 Update Signature
                            </button>
                            <button type="button" onClick={() => setForm(f => ({ ...f, digital_signature: '' }))}
                                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                                🗑️ Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        <SignaturePad 
                            label={showPad ? "Draw new signature below" : "Draw your signature below"}
                            initialValue={form.digital_signature}
                            onSave={data => {
                                setForm(f => ({ ...f, digital_signature: data }));
                                setShowPad(false);
                            }}
                            onClear={() => {
                                setForm(f => ({ ...f, digital_signature: '' }));
                                setShowPad(false);
                            }}
                        />
                        {showPad && (
                            <button type="button" onClick={() => setShowPad(false)}
                                style={{ position: 'absolute', top: 0, right: 0, padding: '4px 10px', fontSize: 11, color: 'var(--t-text3)', cursor: 'pointer', background: 'none', border: 'none' }}>
                                Cancel
                            </button>
                        )}
                    </div>
                )}
            </div>

            <button type="submit" disabled={busy}
                style={{ padding: '10px 28px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 900, fontSize: 13, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Saving…' : '💾 Save Profile'}
            </button>
        </form>
    );
}

// ── Security Tab ───────────────────────────────────────────────────────────────
function SecurityTab({ user, setUser }) {
    const [msg,  setMsg]  = useState(null);
    const [busy, setBusy] = useState(false);

    // Face ID states
    const [faceRegActive, setFaceRegActive] = useState(false);
    const [modelReady, setModelReady] = useState(false);
    const [modelLoading, setModelLoading] = useState(false);
    const [camError, setCamError] = useState(null);
    const [regCountdown, setRegCountdown] = useState(null);
    const [regStatus, setRegStatus] = useState('idle'); // idle | detecting | countdown | saving | done | error
    const [faceDetected, setFaceDetected] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const loopRef = useRef(null);
    const busyRef = useRef(false);
    const stableCount = useRef(0);
    const countdownTimer = useRef(null);
    const capturedDescRef = useRef(null);

    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

    const startFaceRegistration = async () => {
        setFaceRegActive(true);
        setRegStatus('idle');
        setCamError(null);
        busyRef.current = false;
        stableCount.current = 0;
        capturedDescRef.current = null;

        if (!modelReady) {
            setModelLoading(true);
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
                setModelReady(true);
            } catch (e) {
                setCamError('AI face models failed to load. Check your internet connection.');
                setModelLoading(false);
                return;
            } finally {
                setModelLoading(false);
            }
        }
        setTimeout(() => startCamera(), 300);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                loopRef.current = requestAnimationFrame(frameLoop);
            }
        } catch (e) {
            setCamError('Camera permission denied or camera unavailable.');
        }
    };

    const stopEverything = () => {
        if (loopRef.current) { cancelAnimationFrame(loopRef.current); loopRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
        busyRef.current = false;
        stableCount.current = 0;
        capturedDescRef.current = null;
        setFaceDetected(false);
        setRegCountdown(null);
    };

    const closeScanner = () => {
        stopEverything();
        setFaceRegActive(false);
    };

    const frameLoop = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || video.paused || video.ended || !canvas) {
            loopRef.current = requestAnimationFrame(frameLoop);
            return;
        }

        try {
            const det = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (det) {
                setFaceDetected(true);
                stableCount.current += 1;

                if (ctx) {
                    const dims = faceapi.matchDimensions(canvas, video, true);
                    const resized = faceapi.resizeResults(det, dims);
                    ctx.fillStyle = 'rgba(99,102,241,0.7)';
                    resized.landmarks.positions.forEach(p => {
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }

                capturedDescRef.current = det.descriptor;
                handleRegisterFrame();
            } else {
                setFaceDetected(false);
                stableCount.current = 0;
                capturedDescRef.current = null;
                if (countdownTimer.current) {
                    clearInterval(countdownTimer.current); countdownTimer.current = null;
                    setRegCountdown(null);
                    setRegStatus('detecting');
                }
            }
        } catch (_) {}

        loopRef.current = requestAnimationFrame(frameLoop);
    };

    const handleRegisterFrame = () => {
        if (busyRef.current) return;

        if (stableCount.current === 10 && !countdownTimer.current) {
            setRegStatus('countdown');
            setRegCountdown(3);
            beep('tick');

            let count = 3;
            countdownTimer.current = setInterval(() => {
                count -= 1;
                if (count > 0) {
                    setRegCountdown(count);
                    beep('tick');
                } else {
                    clearInterval(countdownTimer.current);
                    countdownTimer.current = null;
                    setRegCountdown(0);
                    if (capturedDescRef.current) {
                        submitRegistration(Array.from(capturedDescRef.current));
                    }
                }
            }, 1000);
        }

        if (stableCount.current < 10) {
            setRegStatus('detecting');
        }
    };

    const submitRegistration = async (encoding) => {
        busyRef.current = true;
        setRegStatus('saving');
        stopEverything();
        try {
            await accountsApi.trainFace(encoding);
            beep('success');
            setRegStatus('done');
            setUser({ ...user, has_face_id: true });
            setMsg({ type: 'success', text: 'Face ID registered successfully!' });
            setTimeout(() => setFaceRegActive(false), 2000);
        } catch (e) {
            beep('error');
            setRegStatus('error');
            const errMsg = e.response?.data?.error || 'Registration failed. Try again.';
            setMsg({ type: 'error', text: errMsg });
            busyRef.current = false;
        }
    };

    useEffect(() => {
        return () => stopEverything();
    }, []);

    // Password form
    const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const setPw = (k, v) => setPwForm(p => ({ ...p, [k]: v }));

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        if (pwForm.new_password !== pwForm.confirm_password) {
            setMsg({ type: 'error', text: 'New passwords do not match.' }); return;
        }
        if (pwForm.new_password.length < 8) {
            setMsg({ type: 'error', text: 'New password must be at least 8 characters.' }); return;
        }
        setBusy(true); setMsg(null);
        try {
            await accountsApi.changePassword({
                current_password: pwForm.current_password,
                new_password:     pwForm.new_password,
            });
            setPwForm({ current_password: '', new_password: '', confirm_password: '' });
            setMsg({ type: 'success', text: 'Password changed successfully!' });
        } catch (err) {
            setMsg({ type: 'error', text: err?.response?.data?.error || 'Password change failed.' });
        } finally {
            setBusy(false);
        }
    };

    // Email form
    const [emailForm, setEmailForm] = useState({ current_password: '', new_email: '' });
    const setEm = (k, v) => setEmailForm(p => ({ ...p, [k]: v }));

    const handleEmailSave = async (e) => {
        e.preventDefault();
        if (!emailForm.new_email.includes('@')) {
            setMsg({ type: 'error', text: 'Please enter a valid email address.' }); return;
        }
        setBusy(true); setMsg(null);
        try {
            const res = await accountsApi.changeEmail({
                current_password: emailForm.current_password,
                new_email:        emailForm.new_email,
            });
            const newEmail = res.data?.email || emailForm.new_email;
            setEmailForm({ current_password: '', new_email: '' });
            setMsg({ type: 'success', text: `Email updated to ${newEmail}` });
            // Reflect change in context user object immediately
            setUser?.(prev => prev ? { ...prev, email: newEmail } : prev);
        } catch (err) {
            setMsg({ type: 'error', text: err?.response?.data?.error || 'Email change failed.' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <Feedback msg={msg} />

            {/* Account info card */}
            <div style={cardStyle}>
                <p style={sectionTitle}>Account Information</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                        { label: 'Email',      value: user?.email    || '—' },
                        { label: 'Username',   value: user?.username || '—' },
                        { label: 'Status',     value: user?.is_active   ? 'Active'       : 'Inactive'      },
                        { label: 'Verified',   value: user?.is_verified ? '✅ Verified'  : '⚠️ Not verified' },
                        {
                            label: 'Joined',
                            value: user?.date_joined
                                ? new Date(user.date_joined).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: '2-digit' })
                                : '—',
                        },
                        {
                            label: 'Last Login',
                            value: user?.frontend_last_login
                                ? new Date(user.frontend_last_login).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                                : '—',
                        },
                    ].map(({ label, value }) => (
                        <div key={label} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
                            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-text3)', marginBottom: 2 }}>{label}</p>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--t-text)', wordBreak: 'break-all' }}>{value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* 📸 Face ID Biometric Card */}
            <div style={cardStyle}>
                <p style={sectionTitle}>👤 Face ID Biometrics</p>
                {faceRegActive ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                        <div style={{ position: 'relative', width: 200, height: 200 }}>
                            <svg width="200" height="200" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', zIndex: 10, pointerEvents: 'none' }}>
                                <circle cx="100" cy="100" r="92" fill="none" stroke="var(--t-border)" strokeWidth="4" />
                                <circle
                                    cx="100" cy="100" r="92" fill="none"
                                    stroke="#6366f1" strokeWidth="4"
                                    strokeDasharray={`${2 * Math.PI * 92}`}
                                    strokeDashoffset={(() => {
                                        const circ = 2 * Math.PI * 92;
                                        let progress = 0;
                                        if (regStatus === 'detecting') progress = Math.min((stableCount.current / 10) * 30, 30);
                                        else if (regStatus === 'countdown' && regCountdown !== null) progress = 30 + ((3 - regCountdown) / 3) * 60;
                                        else if (regStatus === 'saving') progress = 90;
                                        else if (regStatus === 'done') progress = 100;
                                        return circ - (circ * progress) / 100;
                                    })()}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                                />
                            </svg>
                            <div style={{
                                position: 'absolute', inset: 8,
                                borderRadius: '50%', overflow: 'hidden',
                                background: '#0a0a0a',
                                border: `2px solid ${faceDetected ? '#6366f1' : 'transparent'}`,
                                boxShadow: faceDetected ? '0 0 15px rgba(99,102,241,0.3)' : 'none',
                                transition: 'all 0.3s',
                            }}>
                                <video ref={videoRef} autoPlay muted playsInline width="640" height="480"
                                    style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) scaleX(-1)', height: '100%', width: 'auto', objectFit: 'cover' }}
                                />
                                <canvas ref={canvasRef} width="184" height="184"
                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none', transform: 'scaleX(-1)' }}
                                />
                                {regStatus === 'done' && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.15)', zIndex: 8 }}>
                                        <span style={{ fontSize: 48 }}>✅</span>
                                    </div>
                                )}
                            </div>
                            {regStatus === 'countdown' && regCountdown !== null && regCountdown > 0 && (
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    zIndex: 20, pointerEvents: 'none',
                                }}>
                                    <div style={{
                                        width: 50, height: 50, borderRadius: '50%',
                                        background: 'rgba(99,102,241,0.9)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 22, fontWeight: 900, color: '#fff',
                                        boxShadow: '0 0 15px rgba(99,102,241,0.5)',
                                    }}>
                                        {regCountdown}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--t-text)' }}>
                                {modelLoading ? 'Loading AI models...' : camError ? 'Camera Error' : regStatus === 'countdown' ? `Registering face in ${regCountdown}...` : regStatus === 'saving' ? 'Saving biometric Face ID...' : regStatus === 'done' ? 'Face ID Configured!' : faceDetected ? 'Hold still...' : 'Position your face in the circle'}
                            </p>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text3)' }}>
                                {camError ? camError : modelLoading ? 'Please wait a moment while models initialize' : 'Look directly at your camera'}
                            </p>
                        </div>
                        <button type="button" onClick={closeScanner}
                            style={{ padding: '8px 18px', borderRadius: 8, background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--t-text2)' }}>
                                {user.has_face_id ? '✅ Face ID is active' : '⚠️ Face ID not registered'}
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--t-text3)', lineHeight: 1.5 }}>
                                {user.has_face_id 
                                    ? 'Face ID is configured for your account. You can use biometric facial login to sign in instantly.' 
                                    : 'Enable secure passwordless login by registering your face signature using your device camera.'}
                            </p>
                        </div>
                        <button type="button" onClick={startFaceRegistration}
                            style={{ padding: '10px 20px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 900, fontSize: 13, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                            {user.has_face_id ? '📷 Re-register Face ID' : '📷 Set Up Face ID'}
                        </button>
                    </div>
                )}
            </div>

            {/* Change Password */}
            <form onSubmit={handlePasswordSave}>
                <div style={cardStyle}>
                    <p style={sectionTitle}>🔑 Change Password</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                            { key: 'current_password', label: 'Current Password',    placeholder: 'Enter your current password' },
                            { key: 'new_password',      label: 'New Password',         placeholder: 'Min. 8 characters'           },
                            { key: 'confirm_password',  label: 'Confirm New Password', placeholder: 'Repeat new password'          },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <label style={labelStyle}>{label}</label>
                                <input type="password" style={inputStyle} required
                                    value={pwForm[key]} onChange={e => setPw(key, e.target.value)}
                                    placeholder={placeholder} />
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 11, color: 'var(--t-text3)' }}>
                        💡 Password must be at least 8 characters. You'll stay logged in but use the new password next time.
                    </div>
                </div>
                <button type="submit" disabled={busy}
                    style={{ padding: '10px 28px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 900, fontSize: 13, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, marginBottom: 24 }}>
                    {busy ? 'Changing…' : '🔑 Change Password'}
                </button>
            </form>

            {/* Change Email */}
            <form onSubmit={handleEmailSave}>
                <div style={cardStyle}>
                    <p style={sectionTitle}>📧 Change Email</p>
                    <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--t-text3)' }}>
                        Your email is your login identifier. Confirm your password before changing it.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label style={labelStyle}>New Email Address</label>
                            <input type="email" style={inputStyle} required
                                value={emailForm.new_email}
                                onChange={e => setEm('new_email', e.target.value)}
                                placeholder="new@example.com" />
                        </div>
                        <div>
                            <label style={labelStyle}>Current Password (to confirm)</label>
                            <input type="password" style={inputStyle} required
                                value={emailForm.current_password}
                                onChange={e => setEm('current_password', e.target.value)}
                                placeholder="Enter current password to confirm" />
                        </div>
                    </div>
                </div>
                <button type="submit" disabled={busy}
                    style={{ padding: '10px 28px', borderRadius: 10, background: '#f97316', color: '#fff', fontWeight: 900, fontSize: 13, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                    {busy ? 'Updating…' : '📧 Update Email'}
                </button>
            </form>
        </div>
    );
}

// ── Activity Tab ───────────────────────────────────────────────────────────────
function ActivityTab({ user }) {
    const [logs,    setLogs]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);
    const [filter,  setFilter]  = useState('ALL');
    const [days,    setDays]    = useState('30');

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params = { days };
            if (filter !== 'ALL') params.action = filter;
            if (user?.id) params.user_id = user.id;
            const res = await accountsApi.getActivityLogs(params);
            setLogs(res.data?.results ?? res.data ?? []);
        } catch {
            setError('Failed to load activity logs.');
        } finally {
            setLoading(false);
        }
    }, [filter, days, user?.id]);

    useEffect(() => { load(); }, [load]);

    const ACTIONS = ['ALL', 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'APPROVE', 'PAY'];

    return (
        <div>
            {/* Filters */}
            <div style={{ ...cardStyle, padding: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                    {ACTIONS.map(a => (
                        <button key={a} onClick={() => setFilter(a)}
                            style={{ padding: '4px 12px', borderRadius: 99, cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                                background: filter === a ? (ACTION_COLORS[a] || '#6366f1') : 'transparent',
                                color:      filter === a ? '#fff' : 'var(--t-text3)',
                                border:     `1px solid ${filter === a ? 'transparent' : 'var(--t-border)'}`,
                            }}>
                            {a === 'ALL' ? 'All' : `${ACTION_ICONS[a] || ''} ${a}`}
                        </button>
                    ))}
                </div>
                <select value={days} onChange={e => setDays(e.target.value)}
                    style={{ ...inputStyle, width: 'auto', padding: '4px 10px', fontSize: 12 }}>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                </select>
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--t-text3)', fontSize: 13 }}>
                    Loading activity…
                </div>
            )}
            {error && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: '#ef444418', color: '#ef4444', fontSize: 13, fontWeight: 600, border: '1px solid #ef444430' }}>
                    ❌ {error}
                </div>
            )}
            {!loading && !error && logs.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--t-text3)', fontSize: 13 }}>
                    No activity found for this period.
                </div>
            )}
            {!loading && logs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {logs.map((log, i) => {
                        const clr = ACTION_COLORS[log.action] || '#6b7280';
                        const ico = ACTION_ICONS[log.action]  || '📋';
                        const ts  = new Date(log.timestamp);
                        return (
                            <div key={log.id || i} style={{ ...cardStyle, marginBottom: 0, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: clr + '18', border: `1px solid ${clr}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                                    {ico}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: clr, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{log.action}</span>
                                        <span style={{ fontSize: 11, color: 'var(--t-text3)' }}>·</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text2)' }}>{log.model_name}</span>
                                        {log.object_repr && (
                                            <>
                                                <span style={{ fontSize: 11, color: 'var(--t-text3)' }}>·</span>
                                                <span style={{ fontSize: 11, color: 'var(--t-text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{log.object_repr}</span>
                                            </>
                                        )}
                                        {log.success === false && (
                                            <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', background: '#ef444418', border: '1px solid #ef444430', borderRadius: 99, padding: '1px 7px' }}>FAILED</span>
                                        )}
                                    </div>
                                    {log.description && (
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--t-text3)' }}>{log.description}</p>
                                    )}
                                    {log.endpoint && (
                                        <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--t-text3)', fontFamily: 'monospace' }}>
                                            {log.method} {log.endpoint}
                                        </p>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--t-text2)' }}>
                                        {ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--t-text3)' }}>
                                        {ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                    </p>
                                    {log.ip_address && (
                                        <p style={{ margin: '1px 0 0', fontSize: 9, color: 'var(--t-text3)', fontFamily: 'monospace' }}>{log.ip_address}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Main ProfilePage ───────────────────────────────────────────────────────────
export default function ProfilePage({ forcedTab = null, hideTabBar = false }) {
    const { user, updateProfile, setUser } = useConstruction();
    const { refreshStats }                  = useAccounts();
    const [params]                          = useSearchParams();

    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile,    setAvatarFile]    = useState(null);
    const fileRef = useRef();

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            // We'll handle errors via a global msg or local feedback
            alert('Image must be under 5 MB.');
            return;
        }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const queryTab = params.get('tab') === 'security' ? 'security'
        : params.get('tab') === 'activity' ? 'activity'
        : 'profile';
    const [tab, setTab] = useState(queryTab);
    const activeTab = forcedTab || tab;

    if (!user) return null;

    const TABS = [
        { key: 'profile',  label: '👤 Profile'  },
        { key: 'security', label: '🔑 Security' },
        { key: 'activity', label: '📋 Activity' },
    ];

    return (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

            {/* ── User banner ──────────────────────────────────────────── */}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    {avatarPreview || user.profile_image ? (
                        <img src={avatarPreview || mediaUrl(user.profile_image)} alt="avatar"
                            style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #6366f1' }}
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <Avatar user={user} size="xl" />
                    )}
                    <button type="button" onClick={() => fileRef.current?.click()} title="Change photo"
                        style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: '#6366f1', color: '#fff', border: '2px solid var(--t-bg)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        📷
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--t-text)' }}>
                        {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username}
                    </p>
                    <p style={{ margin: '2px 0 6px', fontSize: 13, color: 'var(--t-text3)' }}>{user.email}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {user.role && <Badge label={user.role.name} color={ROLE_COLORS[user.role.code] || '#6b7280'} />}
                        <Badge label={user.is_active ? 'Active' : 'Inactive'} color={user.is_active ? '#10b981' : '#ef4444'} />
                        {user.is_system_admin && <Badge label="System Admin" color="#ef4444" />}
                        {user.is_verified && <Badge label="Verified" color="#10b981" />}
                    </div>
                    {user.bio && (
                        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--t-text3)', fontStyle: 'italic' }}>{user.bio}</p>
                    )}
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--t-text3)' }}>
                        Joined {user.date_joined
                            ? new Date(user.date_joined).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
                            : '—'}
                        {user.frontend_last_login
                            ? ` · Last login ${new Date(user.frontend_last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                            : ''}
                        {user.phone_number ? ` · 📞 ${user.phone_number}` : ''}
                    </p>
                </div>
            </div>

            {/* ── Tab bar ──────────────────────────────────────────────── */}
            {!hideTabBar && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: '4px', borderRadius: 12, background: 'var(--t-surface)', border: '1px solid var(--t-border)', width: 'fit-content' }}>
                {TABS.map(({ key, label }) => (
                    <button key={key} onClick={() => setTab(key)}
                        style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                            background: activeTab === key ? '#6366f1' : 'transparent',
                            color:      activeTab === key ? '#fff'    : 'var(--t-text3)',
                        }}>
                        {label}
                    </button>
                ))}
            </div>
            )}

            {/* ── Tab content ──────────────────────────────────────────── */}
            {activeTab === 'profile'  && (
                <ProfileTab 
                    user={user} 
                    updateProfile={updateProfile} 
                    refreshStats={refreshStats}
                    avatarFile={avatarFile}
                    avatarPreview={avatarPreview}
                    setAvatarFile={setAvatarFile}
                    setAvatarPreview={setAvatarPreview}
                />
            )}
            {activeTab === 'security' && <SecurityTab user={user} setUser={setUser} />}
            {activeTab === 'activity' && <ActivityTab user={user} />}
        </div>
    );
}
