/**
 * BiometricsPortalPage
 * 
 * Ultra-simple Face ID — just like iPhone:
 *  REGISTER: Look at camera → hold 3 seconds → automatically saved
 *  LOGIN:    Look at camera → automatically verified → access granted
 * 
 * No poses. No steps. No buttons needed.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import api from '../../services/client';
import { toast } from 'sonner';
import { ShieldCheck, Camera, Sparkles, RefreshCw, CheckCircle, AlertCircle, Loader } from 'lucide-react';

// ─── Tiny sound beeps via Web Audio ──────────────────────────────────────────
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BiometricsPortalPage() {
  const [profile, setProfile]       = useState(null);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [camError, setCamError]     = useState(null);
  const [mode, setMode]             = useState('login'); // 'login' | 'register'
  
  // Registration: countdown 3→2→1→capturing
  const [regCountdown, setRegCountdown] = useState(null); // null | 3 | 2 | 1 | 0
  const [regStatus, setRegStatus]       = useState('idle'); // idle | detecting | countdown | saving | done | error
  
  // Login: immediate
  const [loginStatus, setLoginStatus] = useState('idle'); // idle | detecting | verifying | done | error
  const [loginUser, setLoginUser]     = useState(null);
  
  // Shared
  const [faceDetected, setFaceDetected] = useState(false);

  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const loopRef     = useRef(null);
  const busyRef     = useRef(false);        // prevent concurrent submissions
  const stableCount = useRef(0);            // how many frames face has been stable
  const countdownTimer = useRef(null);
  const capturedDescRef = useRef(null);     // descriptor captured at peak stability

  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

  // ── Load models ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setModelLoading(true);
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelReady(true);
      } catch (e) {
        toast.error('AI models failed to load — check internet connection.');
      } finally {
        setModelLoading(false);
      }
    };
    load();
    return () => stopEverything();
  }, []);

  // ── Fetch user profile ───────────────────────────────────────────────────────
  useEffect(() => {
    api.get('auth/profile/').then(r => {
      setProfile(r.data);
      // If already registered, default to login mode
      setMode(r.data?.has_face_id ? 'login' : 'register');
    }).catch(() => {});
  }, []);

  // ── Start camera after models ready ─────────────────────────────────────────
  useEffect(() => {
    if (modelReady) startCamera();
    return () => stopEverything();
  }, [modelReady]);

  // ── Restart when mode changes ────────────────────────────────────────────────
  useEffect(() => {
    resetState();
    if (modelReady) {
      stopEverything();
      setTimeout(() => startCamera(), 300);
    }
  }, [mode]);

  // ── Camera ────────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCamError(null);
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
      setCamError('Camera permission denied. Please allow camera access and refresh.');
    }
  };

  const stopCamera = () => {
    if (loopRef.current) { cancelAnimationFrame(loopRef.current); loopRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const stopEverything = () => {
    stopCamera();
    if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
  };

  const resetState = () => {
    busyRef.current = false;
    stableCount.current = 0;
    capturedDescRef.current = null;
    setFaceDetected(false);
    setRegCountdown(null);
    setRegStatus('idle');
    setLoginStatus('idle');
    setLoginUser(null);
    if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
  };

  // ── Frame loop ────────────────────────────────────────────────────────────────
  const frameLoop = useCallback(async () => {
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

      // Draw canvas overlay
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (det) {
        setFaceDetected(true);
        stableCount.current += 1;

        // Draw subtle green dots on landmarks
        const dims = faceapi.matchDimensions(canvas, video, true);
        const resized = faceapi.resizeResults(det, dims);
        ctx.fillStyle = 'rgba(16,185,129,0.7)';
        resized.landmarks.positions.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // Keep updating the captured descriptor
        capturedDescRef.current = det.descriptor;

        // Drive the flows
        if (mode === 'register') handleRegisterFrame();
        else handleLoginFrame(det.descriptor);

      } else {
        setFaceDetected(false);
        stableCount.current = 0;
        capturedDescRef.current = null;
        // If countdown was running, cancel it
        if (countdownTimer.current) {
          clearInterval(countdownTimer.current); countdownTimer.current = null;
          setRegCountdown(null);
          setRegStatus('detecting');
        }
      }
    } catch (_) {}

    loopRef.current = requestAnimationFrame(frameLoop);
  }, [mode]);

  // ── Register flow ─────────────────────────────────────────────────────────────
  const handleRegisterFrame = () => {
    if (busyRef.current) return;

    // Start countdown once face is stable for 10 frames
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
          // Capture!
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
    stopCamera();
    try {
      await api.post('/biometrics/train/', { encoding });
      beep('success');
      setRegStatus('done');
      // Refresh profile
      const r = await api.get('auth/profile/');
      setProfile(r.data);
      toast.success('Face ID registered! You can now sign in with your face.');
    } catch (e) {
      beep('error');
      setRegStatus('error');
      toast.error(e.response?.data?.error || 'Registration failed. Please try again.');
      busyRef.current = false;
    }
  };

  // ── Login flow ────────────────────────────────────────────────────────────────
  const handleLoginFrame = async (descriptor) => {
    if (busyRef.current) return;
    if (stableCount.current < 15) {
      setLoginStatus('detecting');
      return;
    }
    // Auto-verify after 15 stable frames (~0.5s)
    busyRef.current = true;
    setLoginStatus('verifying');
    stopCamera();
    try {
      const res = await api.post('/biometrics/login/', {
        encoding: Array.from(descriptor),
        username: profile?.username || ''
      });
      beep('success');
      setLoginStatus('done');
      setLoginUser(res.data.user);
      // Store tokens
      if (res.data.access)  localStorage.setItem('access_token',  res.data.access);
      if (res.data.refresh) localStorage.setItem('refresh_token', res.data.refresh);
      if (res.data.user)    localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success(`Welcome back, ${res.data.user.first_name || res.data.user.username}!`);
      window.dispatchEvent(new Event('auth-changed'));
    } catch (e) {
      beep('error');
      setLoginStatus('error');
      toast.error(e.response?.data?.error || 'Face not recognised. Try again or use password login.');
      busyRef.current = false;
      // Retry after 2s
      setTimeout(() => {
        resetState();
        startCamera();
      }, 2000);
    }
  };

  // ── Retry / Switch mode ──────────────────────────────────────────────────────
  const retry = () => {
    resetState();
    stopEverything();
    setTimeout(() => startCamera(), 300);
  };

  // ─── Derived UI state ──────────────────────────────────────────────────────
  const isRegister = mode === 'register';

  // Progress ring — 0-100
  let ringProgress = 0;
  if (isRegister) {
    if (regStatus === 'detecting') ringProgress = Math.min((stableCount.current / 10) * 30, 30);
    else if (regStatus === 'countdown' && regCountdown !== null) ringProgress = 30 + ((3 - regCountdown) / 3) * 60;
    else if (regStatus === 'saving') ringProgress = 90;
    else if (regStatus === 'done') ringProgress = 100;
  } else {
    if (loginStatus === 'detecting') ringProgress = Math.min((stableCount.current / 15) * 50, 50);
    else if (loginStatus === 'verifying') ringProgress = 80;
    else if (loginStatus === 'done') ringProgress = 100;
  }

  const ringColor = (regStatus === 'done' || loginStatus === 'done') ? '#10b981'
    : (regStatus === 'error' || loginStatus === 'error') ? '#ef4444'
    : '#10b981';

  const CIRC = 2 * Math.PI * 148; // r=148
  const ringDash = CIRC - (CIRC * ringProgress) / 100;

  // Status message
  let statusMsg = '';
  let statusSub = '';
  let statusIcon = null;
  if (camError) {
    statusMsg = 'Camera Error';
    statusSub = camError;
    statusIcon = <AlertCircle size={20} color="#ef4444" />;
  } else if (modelLoading) {
    statusMsg = 'Loading AI Models…';
    statusSub = 'Downloading face detection models (one-time)';
    statusIcon = <Loader size={20} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} />;
  } else if (!modelReady) {
    statusMsg = 'Initialising…';
    statusSub = '';
  } else if (isRegister) {
    if (regStatus === 'idle' || regStatus === 'detecting') {
      if (!faceDetected) { statusMsg = 'Position your face in the circle'; statusSub = 'Move closer if not detected'; }
      else { statusMsg = 'Hold still…'; statusSub = 'Keep your face centred'; }
    } else if (regStatus === 'countdown') {
      statusMsg = regCountdown > 0 ? `Capturing in ${regCountdown}…` : 'Capturing…';
      statusSub = 'Stay still';
    } else if (regStatus === 'saving') {
      statusMsg = 'Saving Face ID…';
      statusSub = 'Almost done';
    } else if (regStatus === 'done') {
      statusMsg = 'Face ID Registered! ✓';
      statusSub = 'You can now sign in with your face';
    } else if (regStatus === 'error') {
      statusMsg = 'Registration failed';
      statusSub = 'Tap Retry to try again';
    }
  } else {
    // login
    if (loginStatus === 'idle' || loginStatus === 'detecting') {
      if (!faceDetected) { statusMsg = 'Look at the camera'; statusSub = 'Face recognition will start automatically'; }
      else { statusMsg = 'Recognising…'; statusSub = 'Keep your face centred'; }
    } else if (loginStatus === 'verifying') {
      statusMsg = 'Verifying identity…';
      statusSub = 'Checking face signature';
    } else if (loginStatus === 'done') {
      statusMsg = `Welcome back${loginUser ? ', ' + (loginUser.first_name || loginUser.username) : ''}! ✓`;
      statusSub = 'Identity confirmed';
    } else if (loginStatus === 'error') {
      statusMsg = 'Face not recognised';
      statusSub = 'Retrying automatically…';
    }
  }

  const isDone  = regStatus === 'done' || loginStatus === 'done';
  const isError = regStatus === 'error' || loginStatus === 'error';
  const isBusy  = regStatus === 'saving' || loginStatus === 'verifying';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--t-bg)', minHeight: '100%', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: 'var(--t-surface)', borderBottom: '1px solid var(--t-border)', padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} color="#10b981" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--t-text)' }}>Face ID</h1>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--t-text3)' }}>Secure biometric authentication</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 20, background: modelReady ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${modelReady ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`, fontSize: 11, fontWeight: 700, color: modelReady ? '#10b981' : '#f59e0b' }}>
          <Sparkles size={12} />
          {modelReady ? 'AI Ready' : modelLoading ? 'Loading AI…' : 'Starting…'}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>

        {/* Mode Switcher */}
        <div style={{ display: 'flex', background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 12, padding: 4, gap: 4 }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '9px 28px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: 13,
              background: mode === m ? '#10b981' : 'transparent',
              color: mode === m ? '#fff' : 'var(--t-text3)',
              transition: 'all 0.18s',
            }}>
              {m === 'login' ? '🔓 Sign In' : '📷 Register Face'}
            </button>
          ))}
        </div>

        {/* Camera + Ring */}
        <div style={{ position: 'relative', width: 320, height: 320 }}>

          {/* Progress ring SVG */}
          <svg width="320" height="320" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', zIndex: 10, pointerEvents: 'none' }}>
            <circle cx="160" cy="160" r="148" fill="none" stroke="var(--t-border)" strokeWidth="5" />
            <circle
              cx="160" cy="160" r="148" fill="none"
              stroke={ringColor} strokeWidth="5"
              strokeDasharray={`${CIRC}`}
              strokeDashoffset={ringDash}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s' }}
            />
          </svg>

          {/* Circular camera viewport */}
          <div style={{
            position: 'absolute', inset: 12,
            borderRadius: '50%', overflow: 'hidden',
            background: '#0a0a0a',
            boxShadow: faceDetected
              ? `0 0 0 2px ${ringColor}, 0 0 30px ${ringColor}44`
              : '0 0 0 1px rgba(255,255,255,0.05)',
            transition: 'box-shadow 0.3s',
          }}>
            <video ref={videoRef} autoPlay muted playsInline width="640" height="480"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) scaleX(-1)', height: '100%', width: 'auto', objectFit: 'cover' }}
            />
            <canvas ref={canvasRef} width="296" height="296"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none', transform: 'scaleX(-1)' }}
            />

            {/* Scan sweep line */}
            {!isDone && !isError && faceDetected && (
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
                boxShadow: '0 0 8px #10b981',
                animation: 'sweep 2.5s ease-in-out infinite',
                zIndex: 5,
              }} />
            )}

            {/* Done overlay */}
            {isDone && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.15)', zIndex: 8 }}>
                <CheckCircle size={64} color="#10b981" strokeWidth={1.5} />
              </div>
            )}
          </div>

          {/* Countdown number floating in ring */}
          {regStatus === 'countdown' && regCountdown !== null && regCountdown > 0 && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 20, pointerEvents: 'none',
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(16,185,129,0.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 900, color: '#fff',
                boxShadow: '0 0 20px rgba(16,185,129,0.5)',
                animation: 'popIn 0.3s ease',
              }}>
                {regCountdown}
              </div>
            </div>
          )}
        </div>

        {/* Status text */}
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <p style={{
            margin: '0 0 6px',
            fontSize: 18,
            fontWeight: 800,
            color: isDone ? '#10b981' : isError ? '#ef4444' : 'var(--t-text)',
            transition: 'color 0.3s',
          }}>
            {statusMsg}
          </p>
          {statusSub && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--t-text3)', lineHeight: 1.5 }}>
              {statusSub}
            </p>
          )}
        </div>

        {/* Action buttons — only show when relevant */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {(isDone || isError || camError) && (
            <button onClick={retry} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 24px', borderRadius: 10, border: 'none',
              background: '#10b981', color: '#fff',
              fontWeight: 800, fontSize: 14, cursor: 'pointer',
            }}>
              <RefreshCw size={15} />
              {isDone ? 'Scan Again' : 'Retry'}
            </button>
          )}
          {isDone && isRegister && (
            <button onClick={() => setMode('login')} style={{
              padding: '11px 24px', borderRadius: 10, border: '1px solid var(--t-border)',
              background: 'var(--t-surface)', color: 'var(--t-text)',
              fontWeight: 800, fontSize: 14, cursor: 'pointer',
            }}>
              Try Face Login →
            </button>
          )}
        </div>

        {/* User profile info card */}
        {profile && (
          <div style={{
            width: '100%', maxWidth: 420,
            background: 'var(--t-surface)', border: '1px solid var(--t-border)',
            borderRadius: 14, padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--t-text)' }}>
                {profile.first_name} {profile.last_name}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--t-text3)' }}>
                @{profile.username}
              </p>
            </div>
            {profile.has_face_id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle size={13} color="#10b981" />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981' }}>Face ID Active</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Camera size={13} color="#f59e0b" />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b' }}>Not Registered</span>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'var(--t-surface)', border: '1px solid var(--t-border)',
          borderRadius: 14, padding: '16px 20px',
        }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 900, color: 'var(--t-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            How it works
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(isRegister ? [
              { n: '1', text: 'Position your face inside the circle.' },
              { n: '2', text: 'Hold still — a 3 second countdown begins automatically.' },
              { n: '3', text: 'Your Face ID is saved. Done!' },
            ] : [
              { n: '1', text: 'Look at the camera.' },
              { n: '2', text: 'The system recognises you automatically.' },
              { n: '3', text: 'Access granted!' },
            ]).map(({ n, text }) => (
              <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#10b981', flexShrink: 0 }}>
                  {n}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--t-text2)', lineHeight: 1.5 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes sweep {
          0%   { top: 5%; }
          50%  { top: 90%; }
          100% { top: 5%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes popIn {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
