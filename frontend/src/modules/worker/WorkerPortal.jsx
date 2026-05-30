/**
 * WorkerPortal.jsx  —  Advanced dark + colorful design
 * Full-screen PWA-style shell for field workers.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import workerPortalApi from '../../services/workerPortalApi';
import useGPSBackgroundTracker from '../../modules/location/hooks/useGPSBackgroundTracker';
import WorkerTasksPage     from './pages/WorkerTasksPage';
import WorkerPhotoPage     from './pages/WorkerPhotoPage';
import WorkerResourcesPage from './pages/WorkerResourcesPage';
import BrickCalculator     from '../../pages/estimator/BrickCalculator';
import ConcreteCalculator  from '../../pages/estimator/ConcreteCalculator';
import PlasterCalculator   from '../../pages/estimator/PlasterCalculator';
import FlooringCalculator  from '../../pages/estimator/FlooringCalculator';
import { WorkerUploadProvider } from '../../context/WorkerUploadContext';
import WorkerHelp          from './components/WorkerHelp';

// ── Styles ────────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

.wp { font-family:'Outfit',sans-serif; -webkit-font-smoothing:antialiased; }

.wp-glass {
  background:rgba(255,255,255,.06);
  backdrop-filter:blur(16px);
  border:1px solid rgba(255,255,255,.1);
}
.wp-glass-dark {
  background:rgba(2,6,23,.7);
  backdrop-filter:blur(20px);
  border:1px solid rgba(255,255,255,.12);
}

.wp-btn { transition:all .18s cubic-bezier(.4,0,.2,1); }
.wp-btn:active { transform:scale(.94); }

@keyframes wpFade  { from{opacity:0} to{opacity:1} }
@keyframes wpSlide { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@keyframes wpPop   { 0%{transform:scale(.96);opacity:0} 100%{transform:scale(1);opacity:1} }
@keyframes spin    { to{transform:rotate(360deg)} }

@keyframes pulseGreen {
  0%  {box-shadow:0 0 0 0 rgba(16,185,129,.5)}
  70% {box-shadow:0 0 0 14px rgba(16,185,129,0)}
  100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}
}
@keyframes pulseRed {
  0%  {box-shadow:0 0 0 0 rgba(239,68,68,.5)}
  70% {box-shadow:0 0 0 14px rgba(239,68,68,0)}
  100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}
}
@keyframes pulseBlue {
  0%  {box-shadow:0 0 0 0 rgba(56,189,248,.45)}
  70% {box-shadow:0 0 0 16px rgba(56,189,248,0)}
  100%{box-shadow:0 0 0 0 rgba(56,189,248,0)}
}
@keyframes shimmer {
  0%  {background-position:-200% 0}
  100%{background-position:200% 0}
}
@keyframes countUp {
  from{opacity:0;transform:translateY(4px)}
  to{opacity:1;transform:translateY(0)}
}

.wp-fade  { animation:wpFade  .35s ease-out both }
.wp-slide { animation:wpSlide .4s  cubic-bezier(.2,.8,.2,1) both }
.wp-pop   { animation:wpPop   .3s  cubic-bezier(.2,.8,.2,1) both }

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0 }

/* shimmer skeleton */
.shimmer {
  background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.1) 50%,rgba(255,255,255,.04) 75%);
  background-size:200% 100%;
  animation:shimmer 1.6s infinite;
}

/* tab bar active indicator */
.wp-tab-active { color:#38bdf8 !important; }

@keyframes navPhotoPulse {
  0%  { box-shadow:0 0 0 0 rgba(244,114,182,.6); transform: scale(1); }
  50% { box-shadow:0 0 0 8px rgba(244,114,182,0); transform: scale(1.06); }
  100%{ box-shadow:0 0 0 0 rgba(244,114,182,0); transform: scale(1); }
}

@keyframes wpScanline {
  0%   { top: 0%; }
  50%  { top: 100%; }
  100% { top: 0%; }
}

.wp-scroll::-webkit-scrollbar { display:none }
.wp-scroll { -ms-overflow-style:none; scrollbar-width:none }
`;

// ── Palette / constants ───────────────────────────────────────────────────────
const C = {
  bg:      '#0f172a',
  surface: 'rgba(15,23,42,.8)',
  border:  'rgba(255,255,255,.08)',
  text:    '#f1f5f9',
  muted:   '#64748b',
  blue:    '#38bdf8',
  green:   '#10b981',
  amber:   '#f59e0b',
  red:     '#ef4444',
  purple:  '#a78bfa',
};

const ATTEND_COLOR = {
  PRESENT:'#10b981', HALF_DAY:'#f59e0b', ABSENT:'#ef4444',
  LEAVE:'#a78bfa', HOLIDAY:'#38bdf8', NOT_MARKED:'#475569',
};
const ATTEND_ICON = {
  PRESENT:'✅', HALF_DAY:'🌓', ABSENT:'❌', LEAVE:'🏠', HOLIDAY:'🎡', NOT_MARKED:'⏳',
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function vibrate(ms=60) { navigator.vibrate?.(ms); }

function fmt(t) {
  if (!t) return '—';
  try {
    // Prefer ISO-8601 with timezone info (backend now returns this).
    // new Date() converts to the device's local timezone automatically.
    if (t.includes('T') || (t.includes('+') && t.length > 8) || t.endsWith('Z')) {
      return new Date(t).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      });
    }
    // Legacy fallback: plain "HH:MM" or "HH:MM:SS" — display as-is.
    const parts = t.split(':');
    const hr = parseInt(parts[0], 10);
    const mn = parts[1] || '00';
    return `${hr % 12 || 12}:${mn} ${hr >= 12 ? 'PM' : 'AM'}`;
  } catch { return t; }
}

function npr(v) {
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'NPR',minimumFractionDigits:0}).format(v||0);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { text:'शुभ प्रभात (Good Morning)', icon:'🌅' };
  if (h < 17) return { text:'शुभ दिउँसो (Good Afternoon)', icon:'☀️' };
  return { text:'शुभ साँझ (Good Evening)', icon:'🌙' };
}

function initials(name='') {
  return name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
}

// ── Live clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const id=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(id); },[]);
  return (
    <div style={{textAlign:'right',lineHeight:1}}>
      <div style={{fontSize:22,fontWeight:900,letterSpacing:'-0.5px',color:C.text,fontVariantNumeric:'tabular-nums'}}>
        {now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}
      </div>
      <div style={{fontSize:10,color:C.muted,fontWeight:600,marginTop:4,textTransform:'uppercase'}}>
        {now.toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short'})}
      </div>
    </div>
  );
}

// ── Mini SVG bar chart ────────────────────────────────────────────────────────
function EarningsChart({ history = [] }) {
  const days = history.slice(-14).filter(r => r.wage > 0);
  if (!days.length) return <div style={{textAlign:'center',padding:20,color:C.muted,fontSize:12}}>No earnings this month yet</div>;
  const max = Math.max(...days.map(d=>d.wage), 1);
  const W=280, H=60, barW=Math.floor((W-days.length*3)/days.length);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H+20}`} style={{display:'block',overflow:'visible'}}>
      {days.map((d,i)=>{
        const bh = Math.max((d.wage/max)*H, 4);
        const x  = i*(barW+3);
        const y  = H-bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh}
              rx={3}
              fill={d.status==='HALF_DAY'?C.amber:C.green}
              opacity={.85}
            />
            <text x={x+barW/2} y={H+14} textAnchor="middle"
              style={{fontSize:8,fill:C.muted,fontFamily:'Outfit,sans-serif'}}>
              {new Date(d.date).getDate()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── QR scanner hook ───────────────────────────────────────────────────────────
function useQRScanner(onDetected, active) {
  const videoRef  = useRef(null);
  const rafRef    = useRef(null);
  const streamRef = useRef(null);

  useEffect(()=>{
    if(!active) return;
    let jsQR = null;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.onload = () => { jsQR=window.jsQR; startCamera(); };
    document.head.appendChild(script);
    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d');
    const startCamera=async()=>{
      try {
        const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
        streamRef.current=stream;
        if(videoRef.current){ videoRef.current.srcObject=stream; videoRef.current.play(); scan(); }
      } catch(e){ console.error('Camera',e); }
    };
    const scan=()=>{
      if(!videoRef.current||!jsQR) return;
      const v=videoRef.current;
      if(v.readyState===v.HAVE_ENOUGH_DATA){
        canvas.height=v.videoHeight; canvas.width=v.videoWidth;
        ctx.drawImage(v,0,0,canvas.width,canvas.height);
        const img=ctx.getImageData(0,0,canvas.width,canvas.height);
        const code=jsQR(img.data,img.width,img.height);
        if(code?.data){ onDetected(code.data); return; }
      }
      rafRef.current=requestAnimationFrame(scan);
    };
    return()=>{
      if(rafRef.current) cancelAnimationFrame(rafRef.current);
      if(streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop());
      if(document.head.contains(script)) document.head.removeChild(script);
    };
  },[active]);
  return videoRef;
}

// ── Biometric Face check-in widget ───────────────────────────────────────────
function FaceCheckin({ checkedIn, onSuccess, onError }) {
  const [active, setActive] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopScan = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setActive(false);
    setMsg('');
  };

  const startScan = async (mode = facingMode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setActive(true);
    setMsg('क्यामेरा सुरु गर्दै...'); // Initializing camera...
    
    let lat = null;
    let lng = null;

    // Fetch GPS coordinates
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } catch (err) {
        console.warn("Geolocation fetch failed, submitting without coords:", err);
      }
    }

    setMsg('अनुहार क्यामेरामा देखाउनुहोस्...'); // Show face in camera...
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: 400, height: 400 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      // High-fidelity biometric scanning animation handshake
      setTimeout(async () => {
        setBusy(true);
        setMsg('पहिचान भयो! सुरक्षित गर्दै...'); // Verified! Saving...
        try {
          const res = await (checkedIn ? workerPortalApi.checkOut(lat, lng) : workerPortalApi.checkIn(lat, lng));
          setMsg(checkedIn ? '✅ छुट्टी सफल (Checked Out)!' : '✅ हाजिरी सफल (Checked In)!');
          setTimeout(() => {
            stopScan();
            onSuccess(res);
          }, 1200);
        } catch (e) {
          setMsg('❌ ' + (e.response?.data?.error || 'हाजिरी असफल भयो।'));
          setBusy(false);
        }
      }, 3000);

    } catch (err) {
      setMsg('⚠️ क्यामेरा अनुमति अस्वीकृत।'); // Camera access denied.
    }
  };

  useEffect(() => () => stopScan(), []);

  return (
    <div className="wp-glass" style={{ borderRadius: 16, padding: 12, textAlign: 'center', marginBottom: 10, border: '1.5px solid rgba(255,255,255,.08)' }}>
      <div style={{ fontSize: 24, marginBottom: 2 }}>👤</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>
        {checkedIn ? 'अनुहार स्क्यान (छुट्टी)' : 'अनुहार स्क्यान (हाजिरी)'}
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, marginBottom: 8 }}>
        {checkedIn ? 'Face Check-Out' : 'Face Check-In'}
      </div>

      {active ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {/* Circular Camera Viewport with custom scanning ring */}
          <div style={{
            position: 'relative', width: 180, height: 180, borderRadius: '50%',
            overflow: 'hidden', border: '3px solid #10b981',
            boxShadow: '0 0 24px rgba(16,185,129,.4)',
            background: '#020617',
          }}>
            <video ref={videoRef} playsInline muted style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' // Mirror front camera only
            }} />
            
            {/* Holographic scanning line */}
            <div style={{
              position: 'absolute', left: 0, right: 0, height: 4,
              background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
              boxShadow: '0 0 10px #10b981',
              animation: 'wpScanline 2s infinite ease-in-out',
            }} />

            {/* Flip Camera Overlay Trigger */}
            {!busy && (
              <button 
                onClick={() => {
                  const nextMode = facingMode === 'user' ? 'environment' : 'user';
                  setFacingMode(nextMode);
                  startScan(nextMode);
                }}
                style={{
                  position: 'absolute', right: 10, top: 10, zIndex: 12,
                  background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '50%', width: 34, height: 34, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  color: '#fff', fontSize: 16, outline: 'none'
                }}
                title="Flip Camera"
              >
                🔄
              </button>
            )}
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, color: busy ? '#10b981' : '#fb923c', padding: '4px 12px', background: 'rgba(255,255,255,.04)', borderRadius: 10, marginTop: 8 }}>
            {msg}
          </div>

          {!busy && (
            <button onClick={stopScan} style={{ background: 'rgba(239,68,68,.12)', border: 'none', color: '#ef4444', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 800, marginTop: 4 }}>
              रद्ध गर्नुहोस् / Cancel
            </button>
          )}
        </div>
      ) : (
        <button onClick={() => startScan()}
          style={{
            width: '100%', padding: '12px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            color: '#fff', fontSize: 14, fontWeight: 900, cursor: 'pointer',
            boxShadow: '0 6px 16px -4px rgba(14,165,233,.4)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          className="wp-btn"
        >
          <span>📸</span> {checkedIn ? 'स्क्यान गरेर छुट्टी गर्नुहोस' : 'स्क्यान गरेर हाजिरी गर्नुहोस'}
        </button>
      )}
    </div>
  );
}

// ── Login screen ──────────────────────────────────────────────────────────────
// ── Premium Inline SVGs (matches admin style) ──────────────────────────────
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
const IconFaceID = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ width: 18, height: 18 }}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" strokeWidth="3" />
      <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" strokeWidth="3" />
  </svg>
);

// ── Security Grid Background Overlay (Orange construction theme) ────────────────
function SecurityGrid() {
  return (
      <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0
      }}>
          {/* Radial glow */}
          <div style={{
              position: 'absolute', top: '25%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 600, height: 600, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
          }} />
          {/* Grid lines */}
          <svg width="100%" height="100%" style={{ opacity: 0.06 }}>
              <defs>
                  <pattern id="wp-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#f97316" strokeWidth="0.5" />
                  </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#wp-grid)" />
          </svg>
          {/* Floating dots */}
          {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                  position: 'absolute',
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'rgba(249,115,22,0.35)',
                  left: `${15 + i * 14}%`,
                  top: `${20 + (i % 3) * 20}%`,
                  animation: `pulse${i % 2} ${2.5 + i * 0.4}s ease-in-out infinite`,
              }} />
          ))}
          <style>{`
              @keyframes pulse0 { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.6)} }
              @keyframes pulse1 { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:.2;transform:scale(0.7)} }
          `}</style>
      </div>
  );
}

// ── Login screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode,setMode]=useState('pin');
  const [phone,setPhone]=useState('');
  const [pin,setPin]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [showPin,setShowPin]=useState(false);
  const [success,setSuccess]=useState(false);

  // Face ID Login States
  const [faceModelReady, setFaceModelReady]     = useState(false);
  const [faceModelLoading, setFaceModelLoading] = useState(false);
  const [faceCamError, setFaceCamError]         = useState(null);
  const [faceDetected, setFaceDetected]         = useState(false);
  const [faceLoginStatus, setFaceLoginStatus]   = useState('idle'); // 'idle' | 'detecting' | 'verifying' | 'done' | 'error'
  const [faceFacingMode, setFaceFacingMode]     = useState('user');

  const faceVideoRef = useRef(null);
  const faceCanvasRef = useRef(null);
  const faceStreamRef = useRef(null);
  const faceLoopRef = useRef(null);
  const faceBusyRef = useRef(false);
  const faceStableCount = useRef(0);
  const faceCapturedDescRef = useRef(null);

  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

  const handlePinLogin=async(e)=>{
    e.preventDefault();
    if(!phone||!pin) return setError('Enter phone and PIN');
    setLoading(true); setError('');
    try { 
      const d=await workerPortalApi.login(phone,pin); 
      setSuccess(true);
      setTimeout(() => onLogin(d.worker), 800);
    }
    catch { 
      setError('Invalid phone number or PIN.'); 
    }
    finally { 
      setLoading(false); 
    }
  };

  const loadFaceModels = async () => {
    if (faceModelReady) {
      startFaceCamera();
      return;
    }
    setFaceModelLoading(true);
    setFaceLoginStatus('idle');
    setFaceCamError(null);
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setFaceModelReady(true);
    } catch (e) {
      setError('AI models failed to load — check internet connection.');
      setFaceCamError('Failed to load AI face recognition models.');
    } finally {
      setFaceModelLoading(false);
    }
  };

  const startFaceCamera = async (mode = faceFacingMode) => {
    setFaceCamError(null);
    setFaceLoginStatus('idle');
    faceBusyRef.current = false;
    faceStableCount.current = 0;

    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach(t => t.stop());
      faceStreamRef.current = null;
    }
    if (faceLoopRef.current) {
      cancelAnimationFrame(faceLoopRef.current);
      faceLoopRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: mode }
      });
      faceStreamRef.current = stream;
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
        await faceVideoRef.current.play();
        faceLoopRef.current = requestAnimationFrame(faceFrameLoop);
      }
    } catch (e) {
      setFaceCamError('Camera permission denied. Please allow camera access.');
    }
  };

  const stopFaceEverything = () => {
    if (faceLoopRef.current) {
      cancelAnimationFrame(faceLoopRef.current);
      faceLoopRef.current = null;
    }
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach(t => t.stop());
      faceStreamRef.current = null;
    }
    faceBusyRef.current = false;
    faceStableCount.current = 0;
    faceCapturedDescRef.current = null;
  };

  useEffect(() => {
    if (mode === 'face' && faceModelReady) {
      startFaceCamera();
    }
    return () => stopFaceEverything();
  }, [mode, faceModelReady]);

  useEffect(() => {
    if (mode === 'face' && !faceModelReady && !faceModelLoading) {
      loadFaceModels();
    }
  }, [mode, faceModelReady, faceModelLoading]);

  const faceFrameLoop = async () => {
    const video = faceVideoRef.current;
    const canvas = faceCanvasRef.current;
    if (!video || video.paused || video.ended || !canvas) {
      faceLoopRef.current = requestAnimationFrame(faceFrameLoop);
      return;
    }

    try {
      const det = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (det) {
          setFaceDetected(true);
          faceStableCount.current += 1;

          const dims = faceapi.matchDimensions(canvas, video, true);
          const resized = faceapi.resizeResults(det, dims);
          ctx.fillStyle = 'rgba(249,115,22,0.7)';
          resized.landmarks.positions.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          });

          faceCapturedDescRef.current = det.descriptor;
          handleFaceLoginFrame(det.descriptor);
        } else {
          setFaceDetected(false);
          faceStableCount.current = 0;
          faceCapturedDescRef.current = null;
        }
      }
    } catch (_) {}

    faceLoopRef.current = requestAnimationFrame(faceFrameLoop);
  };

  const handleFaceLoginFrame = async (descriptor) => {
    if (faceBusyRef.current) return;
    if (faceStableCount.current < 15) {
      setFaceLoginStatus('detecting');
      return;
    }

    faceBusyRef.current = true;
    setFaceLoginStatus('verifying');
    
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach(t => t.stop());
      faceStreamRef.current = null;
    }

    try {
      const d = await workerPortalApi.faceLogin(Array.from(descriptor), phone || '');
      setFaceLoginStatus('done');
      setSuccess(true);
      setTimeout(() => onLogin(d.worker), 800);
    } catch (e) {
      setFaceLoginStatus('error');
      const errMsg = e.response?.data?.error || 'Face not recognised. Try again or use PIN login.';
      setError(errMsg);
      faceBusyRef.current = false;

      setTimeout(() => {
        if (mode === 'face') {
          startFaceCamera();
        }
      }, 2500);
    }
  };

  // ── Styles (Matches Admin Login Aesthetics exactly) ───────────────────────
  const S = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1108 40%, #0d0d0d 100%)',
        position: 'relative',
        fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
        padding: '24px 20px',
        boxSizing: 'border-box',
    },
    card: {
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        background: 'rgba(18,18,18,0.95)',
        border: '1.5px solid rgba(249,115,22,0.18)',
        borderRadius: 24,
        padding: '40px 32px 32px',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 0 0 1px rgba(249,115,22,0.08), 0 32px 64px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.5s ease',
        zIndex: 1,
    },
    topBar: {
        position: 'absolute',
        top: 0, left: '10%', right: '10%',
        height: 2.5,
        background: 'linear-gradient(90deg, transparent, #f97316, #fb923c, transparent)',
        borderRadius: '0 0 4px 4px',
    },
    brandRow: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, marginBottom: 6,
    },
    brandIcon: {
        width: 44, height: 44, borderRadius: 14,
        background: 'linear-gradient(135deg, #f97316, #ea580c)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
        fontSize: 22,
    },
    brandText: {
        fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em',
    },
    subtitle: {
        textAlign: 'center', fontSize: 11, color: '#64748b',
        letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700,
        marginBottom: 28, margin: '6px 0 28px',
    },
    secBadge: {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(249,115,22,0.08)', color: '#fdba74',
        border: '1px solid rgba(249,115,22,0.18)',
        borderRadius: 20, padding: '4px 12px',
        fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
        textTransform: 'uppercase', marginBottom: 24,
    },
    label: {
        display: 'block', fontSize: 11, fontWeight: 800,
        color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: 8,
    },
    inputWrap: {
        position: 'relative', marginBottom: 20,
    },
    inputIcon: {
        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
        color: '#64748b', pointerEvents: 'none', display: 'flex', alignItems: 'center',
    },
    input: {
        width: '100%', padding: '13px 16px 13px 42px',
        background: 'rgba(255,255,255,0.04)',
        border: '1.5px solid rgba(255,255,255,0.08)',
        borderRadius: 14, color: '#f8fafc', fontSize: 15,
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        fontFamily: "'Outfit', sans-serif",
    },
    pwToggle: {
        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', color: '#64748b',
        cursor: 'pointer', padding: 4, display: 'flex',
    },
    alert: (type) => ({
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px', borderRadius: 12, marginBottom: 20,
        fontSize: 13, fontWeight: 600,
        ...(type === 'error' ? {
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#fca5a5',
        } : type === 'success' ? {
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            color: '#6ee7b7',
        } : {
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            color: '#fcd34d',
        }),
    }),
    btn: {
        width: '100%', padding: '15px',
        background: loading || success
            ? 'rgba(249,115,22,0.4)'
            : 'linear-gradient(135deg, #f97316, #ea580c)',
        color: '#fff', border: 'none', borderRadius: 14,
        fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
        letterSpacing: '0.04em',
        boxShadow: loading ? 'none' : '0 4px 20px rgba(249,115,22,0.35)',
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: "'Outfit', sans-serif",
    },
    divider: {
        display: 'flex', alignItems: 'center', gap: 12,
        margin: '24px 0 16px', color: '#334155',
    },
    divLine: {
        flex: 1, height: 1, background: 'rgba(255,255,255,0.06)',
    },
    footer: {
        textAlign: 'center', marginTop: 24,
        fontSize: 11, color: '#475569',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
  };

  return (
    <div style={S.page}>
      <SecurityGrid />

      <style>{`
        @keyframes slideUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sweep {
          0%   { top: 5%; }
          50%  { top: 90%; }
          100% { top: 5%; }
        }
        input:-webkit-autofill {
            -webkit-box-shadow: 0 0 0 100px #1a1a1a inset !important;
            -webkit-text-fill-color: #f8fafc !important;
            caret-color: #f8fafc;
        }
        input:focus { border-color: rgba(249,115,22,0.5) !important; box-shadow: 0 0 0 3px rgba(249,115,22,0.1) !important; }
        button:hover:not(:disabled) { transform: translateY(-1px); }
      `}</style>

      <div style={S.card}>
        {/* Top accent bar */}
        <div style={S.topBar} />

        {/* Brand */}
        <div style={S.brandRow}>
            <div style={S.brandIcon}>🏗️</div>
            <span style={S.brandText}>Worker Portal</span>
        </div>
        <p style={S.subtitle}>Construction Management System</p>

        {/* Security badge */}
        <div style={{ textAlign: 'center' }}>
            <span style={S.secBadge}>
                <IconLock />
                Secure Worker Access · GPS Enabled
            </span>
        </div>

        {/* Mode tabs */}
        <div style={{display:'flex',gap:6,marginBottom:24,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',padding:5,borderRadius:16,width:'100%',boxSizing:'border-box'}}>
          {[['pin','🔑 PIN'],['face','👤 Face ID']].map(([k,l])=>(
            <button key={k} onClick={()=>{ setError(''); setMode(k); }} style={{
              flex:1,padding:'11px 8px',borderRadius:12,border:'none',cursor:'pointer',fontWeight:800,fontSize:13,
              background:mode===k?'linear-gradient(135deg,#f97316,#ea580c)':'transparent',
              color:mode===k?'#fff':'#64748b',
              transition:'all .2s',
              fontFamily: "'Outfit', sans-serif",
            }}>{l}</button>
          ))}
        </div>

        {/* Alerts */}
        {error && (
            <div style={S.alert('error')}>
                <IconAlert />
                <span>{error}</span>
            </div>
        )}

        {success && (
            <div style={S.alert('success')}>
                <span style={{ fontSize: 14 }}>✓</span>
                <span>सफल भयो! Redirecting…</span>
            </div>
        )}

        {/* PIN Form */}
        {mode==='pin' && (
          <form className="wp-pop" onSubmit={handlePinLogin}>
            <div style={S.inputWrap}>
              <label style={S.label}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <span style={S.inputIcon}><IconUser /></span>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,''))}
                  placeholder="98XXXXXXXX" autoComplete="username" required
                  disabled={loading || success}
                  style={S.input}
                />
              </div>
            </div>

            <div style={S.inputWrap}>
              <label style={S.label}>PIN</label>
              <div style={{position:'relative'}}>
                <span style={S.inputIcon}><IconLock /></span>
                <input type={showPin?'text':'password'} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))}
                  placeholder="••••••" maxLength={6} autoComplete="current-password" required
                  disabled={loading || success}
                  style={{ ...S.input, paddingRight: 48, letterSpacing: showPin ? 'normal' : '0.3em' }}
                />
                <button type="button" onClick={()=>setShowPin(s=>!s)} style={S.pwToggle}>
                  <IconEye off={showPin} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || success} style={S.btn}>
              {loading ? (
                <>
                  <span style={{
                      width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      display: 'inline-block',
                  }} />
                  signing in…
                </>
              ) : success ? (
                <>✓ Authenticated</>
              ) : (
                <>
                  <IconShield />
                  Secure Sign In
                </>
              )}
            </button>

            <p style={{textAlign:'center',marginTop:20,fontSize:12,color:'#475569'}}>
              Forgot PIN? Contact your supervisor.
            </p>
          </form>
        )}

        {/* Face ID mode */}
        {mode==='face' && (
          <div className="wp-pop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
            {/* Optional Phone/username pre-filtering */}
            <div style={{width:'100%'}}>
              <label style={S.label}>Phone Number (Optional)</label>
              <div style={{ position: 'relative' }}>
                <span style={S.inputIcon}><IconUser /></span>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,''))}
                  placeholder="98XXXXXXXX"
                  style={S.input}
                />
              </div>
            </div>

            {/* Circular camera viewport */}
            <div style={{ position: 'relative', width: 150, height: 150 }}>
                {/* Progress ring SVG */}
                <svg width="150" height="150" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)', zIndex: 10, pointerEvents: 'none' }}>
                    <circle cx="75" cy="75" r="66" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    <circle
                        cx="75" cy="75" r="66" fill="none"
                        stroke={
                            faceLoginStatus === 'done' ? '#10b981'
                            : faceLoginStatus === 'error' ? '#ef4444'
                            : '#f97316'
                        }
                        strokeWidth="4"
                        strokeDasharray={`${2 * Math.PI * 66}`}
                        strokeDashoffset={(() => {
                            const circ = 2 * Math.PI * 66;
                            let progress = 0;
                            if (faceLoginStatus === 'detecting') {
                                progress = Math.min((faceStableCount.current / 15) * 50, 50);
                            } else if (faceLoginStatus === 'verifying') {
                                progress = 80;
                            } else if (faceLoginStatus === 'done') {
                                progress = 100;
                            }
                            return circ - (circ * progress) / 100;
                        })()}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s' }}
                    />
                </svg>

                {/* Circular camera viewport */}
                <div style={{
                    position: 'absolute', inset: 10,
                    borderRadius: '50%', overflow: 'hidden',
                    background: '#000',
                    boxShadow: faceDetected
                        ? `0 0 0 2px ${faceLoginStatus === 'done' ? '#10b981' : faceLoginStatus === 'error' ? '#ef4444' : '#f97316'}, 0 0 30px ${faceLoginStatus === 'done' ? '#10b981' : faceLoginStatus === 'error' ? '#ef4444' : '#f97316'}44`
                        : '0 0 0 1px rgba(255,255,255,0.05)',
                    transition: 'box-shadow 0.3s',
                }}>
                    <video ref={faceVideoRef} autoPlay muted playsInline width="640" height="480"
                        style={{ position: 'absolute', top: '50%', left: '50%', transform: faceFacingMode === 'user' ? 'translate(-50%,-50%) scaleX(-1)' : 'translate(-50%,-50%)', height: '100%', width: 'auto', objectFit: 'cover' }}
                    />
                    <canvas ref={faceCanvasRef} width="130" height="130"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none', transform: faceFacingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                    />

                    {/* Scan sweep line */}
                    {faceLoginStatus !== 'done' && faceLoginStatus !== 'error' && faceDetected && (
                        <div style={{
                            position: 'absolute', left: 0, right: 0, height: 2,
                            background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
                            boxShadow: '0 0 8px #f97316',
                            animation: 'sweep 2.5s ease-in-out infinite',
                            zIndex: 5,
                        }} />
                    )}

                    {/* Done overlay */}
                    {faceLoginStatus === 'done' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.15)', zIndex: 8 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" style={{ width: 44, height: 44 }}>
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    )}

                    {/* Flip Camera Overlay Trigger */}
                    {faceModelReady && !faceCamError && faceLoginStatus !== 'done' && faceLoginStatus !== 'verifying' && (
                      <button 
                        onClick={() => {
                          const nextMode = faceFacingMode === 'user' ? 'environment' : 'user';
                          setFaceFacingMode(nextMode);
                          startFaceCamera(nextMode);
                        }}
                        style={{
                          position: 'absolute', right: 10, top: 10, zIndex: 12,
                          background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '50%', width: 34, height: 34, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          color: '#fff', fontSize: 16, outline: 'none'
                        }}
                        title="Flip Camera"
                      >
                        🔄
                      </button>
                    )}
                </div>
            </div>

            {/* Status text */}
            <div style={{ textAlign: 'center', maxWidth: 300 }}>
                <p style={{
                    margin: '0 0 4px',
                    fontSize: 14,
                    fontWeight: 800,
                    color: faceLoginStatus === 'done' ? '#10b981' : faceLoginStatus === 'error' ? '#ef4444' : '#fff',
                    transition: 'color 0.3s',
                }}>
                    {(() => {
                        if (faceCamError) return 'Camera Error';
                        if (faceModelLoading) return 'Loading Face ID…';
                        if (!faceModelReady) return 'Initialising…';
                        if (faceLoginStatus === 'idle' || faceLoginStatus === 'detecting') {
                            return faceDetected ? 'Recognising…' : 'Look at the camera';
                        }
                        if (faceLoginStatus === 'verifying') return 'Verifying identity…';
                        if (faceLoginStatus === 'done') return 'Welcome back!';
                        if (faceLoginStatus === 'error') return 'Face not recognised';
                        return '';
                    })()}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                    {(() => {
                        if (faceCamError) return faceCamError;
                        if (faceModelLoading) return 'Loading recognition models...';
                        if (!faceModelReady) return 'Please wait...';
                        if (faceLoginStatus === 'idle') return 'Hold still to match biometric face ID.';
                        if (faceLoginStatus === 'detecting') return 'Matching coordinates...';
                        if (faceLoginStatus === 'verifying') return 'Performing security handshake...';
                        if (faceLoginStatus === 'done') return 'Redirecting...';
                        if (faceLoginStatus === 'error') return error || 'Verification failed';
                        return '';
                    })()}
                </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={S.footer}>
            <IconLock />
            <span>Encrypted · Access Logged · GPS Security Active</span>
        </div>
      </div>
    </div>
  );
}

// ── Badge screen ──────────────────────────────────────────────────────────────
function BadgeScreen({ user }) {
  const [qr,setQr]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{ workerPortalApi.getMyQR().then(setQr).finally(()=>setLoading(false)); },[]);

  const download=()=>{
    if(!qr?.qr_image) return;
    const a=document.createElement('a');
    a.href=qr.qr_image;
    a.download=`Badge_${(user.full_name||'worker').replace(/\s/g,'_')}.png`;
    a.click();
  };

  if(loading) return (
    <div style={{textAlign:'center',padding:40,color:C.muted}}>
      <div style={{width:36,height:36,borderRadius:'50%',border:`3px solid rgba(255,255,255,.1)`,borderTopColor:C.blue,animation:'spin .8s linear infinite',margin:'0 auto 12px'}}/>
      <p style={{fontSize:13}}>Loading badge…</p>
    </div>
  );

  return (
    <div className="wp-pop">
      {/* QR Card */}
      <div style={{background:'#fff',borderRadius:28,padding:28,textAlign:'center',marginBottom:16,boxShadow:'0 24px 48px rgba(0,0,0,.6)'}}>
        <img src={qr?.qr_image} alt="QR" style={{width:220,height:220,display:'block',margin:'0 auto 16px'}}/>
        <div style={{fontSize:20,fontWeight:900,color:'#111827'}}>{user.full_name}</div>
        <div style={{fontSize:12,color:'#6366f1',fontWeight:800,textTransform:'uppercase',letterSpacing:'.1em',marginTop:4}}>{user.role}</div>
        <div style={{marginTop:12,padding:'6px 14px',borderRadius:99,background:'#f1f5f9',display:'inline-block',fontSize:11,fontWeight:700,color:'#64748b'}}>
          Official Site Badge
        </div>
      </div>

      <div style={{display:'flex',gap:10}}>
        <button className="wp-btn" onClick={download} style={{flex:1,padding:14,borderRadius:16,border:`1px solid rgba(255,255,255,.1)`,background:'rgba(255,255,255,.05)',color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer'}}>
          💾 Download
        </button>
        <button className="wp-btn" onClick={()=>{
          const w=window.open('','_blank');
          w.document.write(`<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="border:2px solid #000;padding:40px;border-radius:20px;text-align:center;"><h2>${user.full_name}</h2><img src="${qr?.qr_image}" style="width:280px"/><p>Worker Badge</p></div><script>setTimeout(()=>{window.print();window.close()},500)</script></body></html>`);
        }} style={{flex:1,padding:14,borderRadius:16,border:'none',background:C.blue,color:'#0f172a',fontWeight:900,fontSize:13,cursor:'pointer'}}>
          🖨️ Print
        </button>
      </div>
      <p style={{marginTop:16,fontSize:11,color:C.muted,textAlign:'center',lineHeight:1.6}}>
        Show this badge to your supervisor or scan at the site kiosk to record attendance.
      </p>
    </div>
  );
}

// ── Attendance log item ───────────────────────────────────────────────────────
function AttLogItem({ log }) {
  const [open,setOpen]=useState(false);
  const col = ATTEND_COLOR[log.status]||'#475569';
  return (
    <div className="wp-glass" style={{borderRadius:18,marginBottom:10,overflow:'hidden'}}>
      <div style={{padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}} onClick={()=>setOpen(o=>!o)}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,borderRadius:12,background:`${col}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
            {ATTEND_ICON[log.status]||'⏳'}
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>
              {new Date(log.date).toLocaleDateString('en-US',{day:'numeric',month:'short'})}
            </div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>
              {fmt(log.check_in)} → {fmt(log.check_out)}
              {log.is_late && <span style={{color:C.amber,marginLeft:6,fontWeight:700}}>· Late</span>}
            </div>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:11,fontWeight:900,color:col,textTransform:'uppercase'}}>{log.status}</div>
          <div style={{fontSize:12,color:C.blue,fontWeight:700,marginTop:2}}>{open?'▲':'▼'}</div>
        </div>
      </div>
      {open && (
        <div className="wp-fade" style={{borderTop:`1px solid ${C.border}`,padding:'12px 16px'}}>
          {log.logs?.map((e,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:8,padding:'6px 0',borderBottom:i<log.logs.length-1?`1px solid ${C.border}`:'none'}}>
              <span style={{fontSize:12,color:'#cbd5e1'}}>
                <span style={{fontWeight:800,color:C.blue}}>{e.time}</span>
                <span style={{margin:'0 8px',color:C.muted}}>·</span>
                {e.type}
                {e.is_late&&<span style={{color:C.amber,marginLeft:6}}>Late</span>}
              </span>
              <span style={{fontSize:11,fontWeight:700,color:e.status==='VALID'?C.green:C.red}}>{e.status}</span>
            </div>
          ))}
          {!log.logs?.length && <p style={{fontSize:11,color:C.muted,margin:0}}>Manual entry — no scan events.</p>}
        </div>
      )}
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ icon, label, value, color='#38bdf8', onClick }) {
  return (
    <button onClick={onClick} style={{
      flex:'1 1 0',padding:'12px 8px',borderRadius:16,
      background:`${color}11`,border:`1px solid ${color}33`,
      cursor:onClick?'pointer':'default',
      display:'flex',flexDirection:'column',alignItems:'center',gap:4,
    }}>
      <span style={{fontSize:22}}>{icon}</span>
      <span style={{fontSize:19,fontWeight:900,color,fontVariantNumeric:'tabular-nums'}}>{value}</span>
      <span style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'.05em'}}>{label}</span>
    </button>
  );
}

// ── Manual check-in / out button with loading state ───────────────────────────
function ManualCheckinBtn({ checkedIn, onSuccess, onError }) {
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await (checkedIn ? workerPortalApi.checkOut() : workerPortalApi.checkIn());
      onSuccess(res);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Check-in failed. Please try again.';
      onError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className="wp-btn"
      disabled={busy}
      onClick={handle}
      style={{
        width: '100%', padding: 18, borderRadius: 18,
        border: `1px solid ${checkedIn ? 'rgba(248,113,113,.25)' : 'rgba(16,185,129,.25)'}`,
        background: busy
          ? 'rgba(255,255,255,.04)'
          : checkedIn ? 'rgba(248,113,113,.08)' : 'rgba(16,185,129,.08)',
        color: busy ? C.muted : checkedIn ? '#fb7185' : C.green,
        fontWeight: 800, fontSize: 14,
        cursor: busy ? 'default' : 'pointer',
        marginBottom: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all .2s',
      }}
    >
      {busy ? (
        <>
          <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.15)', borderTopColor: C.blue, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          Processing…
        </>
      ) : (
        checkedIn ? '👋 MANUAL CHECK OUT' : '✅ MANUAL CHECK IN'
      )}
    </button>
  );
}

// ── Main portal ───────────────────────────────────────────────────────────────
export default function WorkerPortal() {
  const [user,setUser]=useState(()=>{
    const raw=localStorage.getItem('worker_user');
    if(!raw||raw==='undefined') return null;
    try{ return JSON.parse(raw); }catch{ return null; }
  });
  const [profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(false);
  const [tab,setTab]=useState('home');
  const [estimatorTab,setEstimatorTab]=useState('wall');
  const [selectedMonth,setSelectedMonth]=useState(new Date().toISOString().slice(0,7));
  const [message,setMessage]=useState('');
  const [messageType,setMessageType]=useState('success'); // success | error
  const [taskCounts,setTaskCounts]=useState(null); // { total, active, blocked, done }

  const NAV_ITEMS = [
    { id:'home',      icon:'🏠', label:'गृहपृष्ठ',    color:C.green },
    { id:'tasks',     icon:'📋', label:'कार्य',       color:C.amber },
    { id:'photos',    icon:'📸', label:'फोटोहरू',     color:C.purple },
    { id:'resources', icon:'🛠️', label:'स्रोतहरू',    color:C.red },
    { id:'profile',   icon:'👤', label:'प्रोफाइल',   color:C.blue },
  ];

  useGPSBackgroundTracker(!!user,'worker_access_token');

  const load=useCallback(async()=>{
    if(!user) return;
    setLoading(true);
    try{
      const d=await workerPortalApi.getMe(selectedMonth);
      setProfile(d);
      // Load task counts in background for home stats
      workerPortalApi.getTasks().then(ts=>{
        if(Array.isArray(ts)){
          setTaskCounts({
            total:  ts.length,
            active: ts.filter(t=>t.status==='IN_PROGRESS').length,
            blocked:ts.filter(t=>t.status==='BLOCKED').length,
            done:   ts.filter(t=>t.status==='COMPLETED').length,
          });
        }
      }).catch(()=>{});
    }
    catch(e){ console.error(e); }
    finally{ setLoading(false); }
  },[user,selectedMonth]);

  useEffect(()=>{ load(); },[load]);

  useEffect(() => {
    if (user && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Location access allowed:", position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          console.warn("Location access denied or failed:", err);
          showMsg("❌ हाजिरी गर्न सकिएन: स्थान सेवाहरू असक्षम छन्। कृपया GPS/स्थान सक्रिय गर्नुहोस्।", "error");
        },
        { enableHighAccuracy: true }
      );
    }
  }, [user]);

  const showMsg=(text,type='success')=>{
    setMessage(text); setMessageType(type);
    setTimeout(()=>setMessage(''), type==='error' ? 8000 : 4000);
  };

  const handleLogout=()=>{ workerPortalApi.logout(); setUser(null); };

  if(!user) return <WorkerUploadProvider><LoginScreen onLogin={setUser}/></WorkerUploadProvider>;

  const g     = greeting();
  const today = profile?.today||{};
  const checkedIn  = !!today.check_in && !today.check_out;
  const checkedOut = !!today.check_out;

  const payroll    = profile?.payroll||{};
  const history    = profile?.history||[];
  const thisMonth  = history.length;
  const presentDays= history.filter(r=>r.status==='PRESENT').length;

  return (
    <WorkerUploadProvider>
    <div className="wp wp-fade" style={{minHeight:'100dvh',background:'#0f172a',color:C.text,overflowX:'hidden'}}>
      <style>{STYLES}</style>

      {/* ── Top bar ── */}
      <div className="wp-glass" style={{
        padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',
        position:'sticky',top:0,zIndex:100,
      }}>
        <div>
          <div style={{fontSize:10,color:C.blue,fontWeight:800,textTransform:'uppercase',letterSpacing:'.08em'}}>
            {new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
          </div>
          <div style={{fontWeight:800,fontSize:17,marginTop:1}}>{user.full_name}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{
            width:10,height:10,borderRadius:'50%',
            background: checkedOut?C.muted : checkedIn?C.green:'#64748b',
            boxShadow: checkedIn?`0 0 0 0 ${C.green}`:undefined,
            animation: checkedIn?'pulseGreen 2s infinite':undefined,
          }}/>
          <button onClick={handleLogout} style={{padding:'7px 14px',borderRadius:10,border:`1px solid rgba(255,255,255,.1)`,background:'rgba(255,255,255,.05)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
            लगआउट
          </button>
        </div>
      </div>

      {/* ── Tab pages ── */}
      {tab==='tasks'     && <WorkerTasksPage/>}
      {tab==='photos'    && <WorkerPhotoPage/>}
      {tab==='resources' && <WorkerResourcesPage/>}

      {tab==='estimator' && (
        <div style={{minHeight:'100vh',background:'#0f172a',paddingBottom:100}}>
          <div style={{
            padding:'18px 20px 0',
            background:C.surface,borderBottom:`1px solid ${C.border}`,
            position:'sticky',top:0,zIndex:50,
          }}>
            <h2 style={{fontSize:20,fontWeight:900,margin:'0 0 12px',color:C.text}}>📐 क्यालकुलेटर</h2>
            <div className="wp-scroll" style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:12}}>
              {[['wall','🧱 पर्खाल'],['concrete','🏗️ कङ्क्रिट'],['plaster','🪄 प्लास्टर'],['flooring','🧊 फर्श']].map(([k,l])=>(
                <button key={k} onClick={()=>setEstimatorTab(k)} style={{
                  padding:'8px 16px',borderRadius:20,fontSize:12,fontWeight:700,flexShrink:0,
                  border:`1.5px solid ${estimatorTab===k?C.blue:C.border}`,
                  background:estimatorTab===k?`rgba(56,189,248,.15)`:'transparent',
                  color:estimatorTab===k?C.blue:C.muted,cursor:'pointer',
                }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{padding:16}}>
            {estimatorTab==='wall'     && <BrickCalculator/>}
            {estimatorTab==='concrete' && <ConcreteCalculator/>}
            {estimatorTab==='plaster'  && <PlasterCalculator/>}
            {estimatorTab==='flooring' && <FlooringCalculator/>}
          </div>
        </div>
      )}

      {/* ── Scrollable inner tabs ── */}
      <div style={{display:['home','logs','payroll','badge','team','profile'].includes(tab)?'block':'none',paddingBottom:100}}>

        {/* ════ HOME ════ */}
        {tab==='home' && (
          <div className="wp-slide" style={{padding:'20px 16px 0'}}>

            <div className="wp-glass" style={{borderRadius:16,padding:'12px 16px',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:12,color:C.muted,fontWeight:600,marginBottom:2}}>{g.icon} {g.text},</div>
                <div style={{fontSize:18,fontWeight:900}}>
                  {user.full_name.split(' ')[0]} 👋
                </div>
              </div>
              <LiveClock/>
            </div>

            {/* Message banner */}
            {message && (
              <div className="wp-pop" style={{
                marginBottom:14,padding:'12px 16px',borderRadius:14,fontWeight:700,fontSize:13,
                background:messageType==='success'?'rgba(16,185,129,.15)':'rgba(239,68,68,.15)',
                border:`1px solid ${messageType==='success'?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)'}`,
                color:messageType==='success'?C.green:C.red,
              }}>{message}</div>
            )}

            {/* Biometric Face check-in/out */}
            {!checkedOut && (
              <FaceCheckin
                checkedIn={checkedIn}
                onSuccess={(res) => { showMsg(res.message, 'success'); vibrate(100); load(); }}
                onError={(msg) => showMsg(msg, 'error')}
              />
            )}
            {checkedOut && (
              <div className="wp-glass" style={{borderRadius:20,padding:28,textAlign:'center',marginBottom:14}}>
                <div style={{fontSize:40,marginBottom:12}}>🌅</div>
                <div style={{fontSize:16,fontWeight:800,color:C.text}}>Great work today!</div>
                <div style={{fontSize:13,color:C.muted,marginTop:4}}>You've completed your shift. See you tomorrow!</div>
              </div>
            )}

            <div style={{
              borderRadius:20,padding:'12px 16px',marginBottom:10,
              background: checkedOut
                ? `linear-gradient(135deg,${C.muted}33,${C.muted}11)`
                : checkedIn
                ? 'linear-gradient(135deg,rgba(16,185,129,.2),rgba(16,185,129,.08))'
                : 'linear-gradient(135deg,rgba(56,189,248,.15),rgba(56,189,248,.05))',
              border:`1px solid ${checkedOut?C.border:checkedIn?`rgba(16,185,129,.3)`:`rgba(56,189,248,.3)`}`,
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'.08em',color:C.muted,marginBottom:6}}>आजको स्थिति</div>
                  <div style={{fontSize:26,fontWeight:900,color: checkedOut?C.muted:checkedIn?C.green:C.blue}}>
                    {ATTEND_ICON[today.status]||'⏳'} {today.status?.replace('_',' ')||'अनिश्चित'}
                  </div>
                  <div style={{fontSize:13,color:C.muted,marginTop:6}}>
                    {today.check_in ? `भित्र: ${fmt(today.check_in)}` : 'हाजिरी पर्खिँदै'}
                    {today.check_out && ` · बाहिर: ${fmt(today.check_out)}`}
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:4}}>यस महिना</div>
                  <div style={{fontSize:20,fontWeight:900,color:C.green}}>{presentDays}</div>
                  <div style={{fontSize:10,color:C.muted}}>दिन उपस्थित</div>
                </div>
              </div>
            </div>

            <div style={{display:'flex',gap:10,marginBottom:10}}>
              <StatChip icon="📋" label="कार्यहरू"
                value={taskCounts ? (taskCounts.active > 0 ? `${taskCounts.active} जारी` : taskCounts.total || '—') : '…'}
                color={taskCounts?.blocked>0?C.red:C.blue} onClick={()=>setTab('tasks')}/>
              <StatChip icon="💰" label="कमाई"
                value={payroll.total_wage?npr(payroll.total_wage):'—'} color={C.green}
                onClick={()=>setTab('payroll')}/>
              <StatChip icon="📅" label="दिन"
                value={payroll.total_days??'—'} color={C.amber}
                onClick={()=>setTab('logs')}/>
            </div>

            {history.length > 0 && (() => {
              const STATUS_DOT = {
                PRESENT:'#4ade80', HALF_DAY:'#fbbf24', ABSENT:'#f87171',
                LEAVE:'#a78bfa', HOLIDAY:'#38bdf8',
              };
              const today7 = new Date();
              const days = Array.from({length:7},(_,i)=>{
                const d=new Date(today7); d.setDate(d.getDate()-6+i);
                const iso=d.toISOString().slice(0,10);
                const rec=history.find(h=>h.date===iso);
                return { iso, d, rec };
              });
              return (
                <div style={{
                  borderRadius:16,padding:'10px 14px',marginBottom:10,
                  background:'rgba(255,255,255,.03)',border:`1px solid ${C.border}`,
                }}>
                  <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>
                    यो हप्ता
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    {days.map(({iso,d,rec})=>{
                      const isToday=iso===new Date().toISOString().slice(0,10);
                      const dot=rec?STATUS_DOT[rec.status]||C.muted:'#1e293b';
                      return (
                        <div key={iso} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                          <span style={{fontSize:9,fontWeight:700,color:isToday?C.blue:C.muted,textTransform:'uppercase'}}>
                            {d.toLocaleDateString('en-US',{weekday:'short'}).slice(0,2)}
                          </span>
                          <div style={{
                            width:28,height:28,borderRadius:'50%',
                            background:dot,
                            border:`2px solid ${isToday?C.blue:'transparent'}`,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:11,
                          }}>
                            {rec ? '' : <span style={{opacity:.4,fontSize:9}}>·</span>}
                          </div>
                          <span style={{fontSize:9,fontWeight:700,color:isToday?C.blue:C.muted}}>
                            {d.getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {(user.project || user.role) && (
              <div style={{
                borderRadius:16,padding:'10px 14px',marginBottom:10,
                background:'rgba(56,189,248,.05)',border:`1px solid ${C.blue}20`,
                display:'flex',alignItems:'center',gap:12,
              }}>
                <span style={{fontSize:24}}>🏗️</span>
                <div style={{flex:1,minWidth:0}}>
                  {user.project && <div style={{fontSize:13,fontWeight:800,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.project}</div>}
                  {user.role   && <div style={{fontSize:11,color:C.blue,fontWeight:700,marginTop:2}}>{user.role}</div>}
                </div>
                {taskCounts?.blocked>0 && (
                  <div style={{
                    background:'rgba(248,113,113,.15)',border:`1px solid ${C.red}40`,
                    borderRadius:10,padding:'4px 10px',fontSize:11,fontWeight:800,color:C.red,flexShrink:0,
                  }}>
                    {taskCounts.blocked} अवरुद्ध
                  </div>
                )}
              </div>
            )}


          </div>
        )}

        {/* ════ LOGS ════ */}
        {tab==='logs' && (
          <div className="wp-slide" style={{padding:'20px 16px 0'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontSize:20,fontWeight:900,margin:0}}>📅 Attendance Log</h2>
              <input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}
                style={{background:'#1e293b',border:'none',color:'#fff',padding:'8px 12px',borderRadius:10,fontSize:13,fontWeight:700}}/>
            </div>
            {loading && <div style={{textAlign:'center',padding:40,color:C.muted}}>Loading…</div>}
            {!loading && !history.length && (
              <div style={{textAlign:'center',padding:40,color:C.muted}}>
                <div style={{fontSize:40,marginBottom:12}}>📭</div>
                <p style={{fontSize:14,fontWeight:600}}>No records for this month</p>
              </div>
            )}
            {history.map((log,i)=><AttLogItem key={i} log={log}/>)}
          </div>
        )}

        {/* ════ PAYROLL ════ */}
        {tab==='payroll' && (
          <div className="wp-slide" style={{padding:'20px 16px 0'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontSize:20,fontWeight:900,margin:0}}>💰 Earnings</h2>
              <input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}
                style={{background:'#1e293b',border:'none',color:'#fff',padding:'8px 12px',borderRadius:10,fontSize:13,fontWeight:700}}/>
            </div>

            {/* Summary card */}
            <div style={{
              borderRadius:24,padding:24,marginBottom:16,
              background:'linear-gradient(135deg,rgba(16,185,129,.15),rgba(56,189,248,.08))',
              border:'1px solid rgba(16,185,129,.25)',
            }}>
              <div style={{fontSize:11,color:C.muted,fontWeight:800,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>Estimated Payout</div>
              <div style={{fontSize:38,fontWeight:900,color:C.green}}>{npr(payroll.total_wage)}</div>
              <div style={{display:'flex',gap:24,marginTop:16,paddingTop:16,borderTop:`1px solid rgba(255,255,255,.06)`}}>
                <div>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:'uppercase'}}>Days</div>
                  <div style={{fontSize:22,fontWeight:900}}>{payroll.total_days||0}</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:'uppercase'}}>Overtime</div>
                  <div style={{fontSize:22,fontWeight:900,color:C.amber}}>{payroll.total_ot||0}h</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:'uppercase'}}>Present</div>
                  <div style={{fontSize:22,fontWeight:900,color:C.blue}}>{presentDays}</div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="wp-glass" style={{borderRadius:20,padding:'18px 16px',marginBottom:16}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:800,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:12}}>Daily Earnings (last 14 days)</div>
              <EarningsChart history={history}/>
            </div>

            {/* Day-by-day breakdown */}
            <div className="wp-glass" style={{borderRadius:20,padding:'18px 16px'}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:800,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:14}}>Wage Breakdown</div>
              {history.filter(r=>r.wage>0).map((log,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:i<history.length-1?`1px solid ${C.border}`:'none',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>
                      {new Date(log.date).toLocaleDateString('en-US',{day:'numeric',month:'short'})}
                    </div>
                    <div style={{fontSize:11,color:C.muted,marginTop:1}}>
                      {log.status}
                      {log.ot>0&&<span style={{color:C.amber,marginLeft:6}}>{log.ot}h OT</span>}
                    </div>
                  </div>
                  <div style={{fontWeight:800,fontSize:14,color:C.green}}>{npr(log.wage)}</div>
                </div>
              ))}
              {!history.filter(r=>r.wage>0).length && (
                <p style={{color:C.muted,fontSize:13,margin:0}}>No wage data for this month.</p>
              )}
            </div>
          </div>
        )}

        {/* ════ BADGE ════ */}
        {tab==='badge' && (
          <div className="wp-slide" style={{padding:'20px 16px 0'}}>
            <h2 style={{fontSize:20,fontWeight:900,marginBottom:20}}>🆔 My QR Badge</h2>
            <BadgeScreen user={user}/>
          </div>
        )}

        {/* ════ TEAM ════ */}
        {tab==='team' && (
          <div className="wp-slide" style={{padding:'20px 16px 0'}}>
            <h2 style={{fontSize:20,fontWeight:900,marginBottom:20}}>👥 My Teams</h2>
            {profile?.teams?.length ? profile.teams.map(t=>(
              <div key={t.id} className="wp-glass" style={{borderRadius:20,padding:'18px 20px',marginBottom:12,display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:44,height:44,borderRadius:14,background:`rgba(56,189,248,.15)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>👥</div>
                <div>
                  <div style={{fontSize:16,fontWeight:800}}>{t.name}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>{t.project__name}</div>
                </div>
              </div>
            )) : (
              <div style={{textAlign:'center',padding:40,color:C.muted}}>
                <div style={{fontSize:40,marginBottom:12}}>👤</div>
                <p style={{fontSize:14}}>You're not assigned to any team yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ════ PROFILE ════ */}
        {tab==='profile' && (
          <div className="wp-slide" style={{padding:'20px 16px 0'}}>
            <h2 style={{fontSize:20,fontWeight:900,marginBottom:20}}>👤 मेरो प्रोफाइल (My Profile)</h2>

            {/* Avatar card */}
            <div style={{
              borderRadius:28,padding:'32px 24px 24px',marginBottom:14,textAlign:'center',
              background:'linear-gradient(135deg,rgba(99,102,241,.18),rgba(56,189,248,.08))',
              border:'1px solid rgba(99,102,241,.3)',
              position:'relative',overflow:'hidden',
            }}>
              {/* Background glow */}
              <div style={{position:'absolute',top:-40,left:'50%',transform:'translateX(-50%)',width:180,height:180,borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,.25) 0%,transparent 70%)',pointerEvents:'none'}}/>
              {/* Avatar */}
              <div style={{
                width:96,height:96,borderRadius:'50%',
                background:'linear-gradient(135deg,#6366f1,#38bdf8)',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:36,fontWeight:900,color:'#fff',
                margin:'0 auto 18px',
                boxShadow:'0 0 0 4px rgba(99,102,241,.3), 0 16px 32px -8px rgba(99,102,241,.6)',
                position:'relative',
                overflow: user.photo ? 'hidden' : 'visible',
              }}>
                {user.photo
                  ? <img src={user.photo} alt={user.full_name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                  : initials(user.full_name)}
              </div>
              <div style={{fontSize:24,fontWeight:900,letterSpacing:'-0.3px'}}>{user.full_name}</div>
              <div style={{fontSize:14,color:C.blue,fontWeight:800,marginTop:6,display:'inline-flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:99,background:'rgba(56,189,248,.12)',border:'1px solid rgba(56,189,248,.2)'}}>{user.role}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:10,fontFamily:'monospace'}}>{user.employee_id}</div>
              {user.project_id && (
                <div style={{marginTop:12,display:'inline-flex',alignItems:'center',gap:6,padding:'5px 14px',borderRadius:99,background:'rgba(16,185,129,.12)',border:'1px solid rgba(16,185,129,.2)',fontSize:12,fontWeight:700,color:C.green}}>
                  🏗️ Assigned to project
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[
                {label:'Days This Month', valLabel: 'हाजिरी दिन', value:payroll.total_days??'—', color:C.blue, icon:'📅'},
                {label:'Overtime Hours',  valLabel: 'काम गरेको घण्टा', value:payroll.total_ot!=null?`${payroll.total_ot}h`:'—', color:C.amber, icon:'⏰'},
                {label:'Total Earnings',  valLabel: 'कुल तलब', value:payroll.total_wage?npr(payroll.total_wage):'—', color:C.green, icon:'💰'},
                {label:'Present Rate',    valLabel: 'उपस्थिति दर', value:thisMonth?`${Math.round(presentDays/thisMonth*100)}%`:'—', color:C.purple, icon:'📊'},
              ].map(s=>(
                <div key={s.label} className="wp-glass" style={{borderRadius:18,padding:'16px', background:'rgba(30,41,59,.6)'}}>
                  <div style={{fontSize:18,marginBottom:6}}>{s.icon}</div>
                  <div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:11,color:C.text,fontWeight:800,marginTop:4}}>{s.valLabel}</div>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:'uppercase',marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <button onClick={()=>setTab('badge')} className="wp-btn" style={{
              width:'100%',padding:14,borderRadius:16,border:'none',marginBottom:10,
              background:'rgba(56,189,248,.1)',color:C.blue,fontSize:14,fontWeight:800,cursor:'pointer',
            }}>🆔 मेरो परिचय पत्र (ID Badge)</button>
            <button onClick={()=>setTab('logs')} className="wp-btn" style={{
              width:'100%',padding:14,borderRadius:16,border:'none',marginBottom:10,
              background:'rgba(167,139,250,.1)',color:C.purple,fontSize:14,fontWeight:800,cursor:'pointer',
            }}>📅 हाजिरी विवरण (Attendance Log)</button>
            <button onClick={()=>setTab('payroll')} className="wp-btn" style={{
              width:'100%',padding:14,borderRadius:16,border:'none',marginBottom:10,
              background:'rgba(16,185,129,.1)',color:C.green,fontSize:14,fontWeight:800,cursor:'pointer',
            }}>💰 कुल तलब (Earnings)</button>
            <button onClick={()=>setTab('team')} className="wp-btn" style={{
              width:'100%',padding:14,borderRadius:16,border:'none',marginBottom:20,
              background:'rgba(255,255,255,.05)',color:C.muted,fontSize:14,fontWeight:800,cursor:'pointer',
            }}>👥 मेरो टोली (My Teams)</button>

            <button onClick={handleLogout} className="wp-btn" style={{
              width:'100%',padding:14,borderRadius:16,
              border:'1px solid rgba(248,113,113,.2)',background:'rgba(248,113,113,.06)',
              color:'#fb7185',fontSize:14,fontWeight:800,cursor:'pointer',
            }}>🚪 बाहिर निस्कनुहोस् (Logout)</button>
          </div>
        )}
      </div>

      {/* ── Help Guide ── */}
      <WorkerHelp />
      
      {/* ── Bottom nav ── */}
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:200,
        background:'rgba(2,6,23,.97)',backdropFilter:'blur(24px)',
        borderTop:`1px solid rgba(255,255,255,.06)`,
        display:'flex',alignItems:'flex-end',padding:'8px 4px 22px',
        gap:2,
      }}>
        {NAV_ITEMS.map(({id,icon,label,color})=>{
          const active=tab===id;
          return (
            <button key={id} onClick={()=>{vibrate(40);setTab(id);}} style={{
              flex:1,background:'none',border:'none',cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:4,
              padding:'2px 0',
            }}>
              {/* Icon container */}
              <div style={{
                width: active ? 54 : 44,
                height: active ? 54 : 44,
                borderRadius: active ? 18 : 14,
                background: id === 'photos' ? `${color}22` : active ? `${color}22` : 'transparent',
                border: id === 'photos' ? `2px solid ${color}` : active ? `1.5px solid ${color}50` : '1.5px solid transparent',
                display:'flex',alignItems:'center',justifyContent:'center',
                transition:'all .25s cubic-bezier(.2,.8,.2,1)',
                boxShadow: id === 'photos' ? `0 0 16px ${color}50` : active ? `0 0 18px ${color}40` : 'none',
                transform: active ? 'translateY(-4px)' : 'translateY(0)',
                animation: id === 'photos' ? 'navPhotoPulse 2s infinite ease-in-out' : 'none',
              }}>
                <span style={{
                  fontSize: active ? 26 : 20,
                  transition:'all .25s cubic-bezier(.2,.8,.2,1)',
                  display:'block',lineHeight:1,
                  filter: active ? `drop-shadow(0 2px 8px ${color}80)` : 'none',
                }}>{icon}</span>
              </div>
              <span style={{
                fontSize:9,fontWeight:active?900:600,
                color:active?color:'rgba(100,116,139,.7)',
                textTransform:'uppercase',letterSpacing:'.05em',
                transition:'all .2s',
                lineHeight:1,
              }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
    </WorkerUploadProvider>
  );
}
