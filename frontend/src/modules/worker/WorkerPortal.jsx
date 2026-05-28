/**
 * WorkerPortal.jsx  —  Advanced dark + colorful design
 * Full-screen PWA-style shell for field workers.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
.wp-tab-active span.wp-tab-icon { transform:translateY(-3px) scale(1.15); }

.wp-scroll::-webkit-scrollbar { display:none }
.wp-scroll { -ms-overflow-style:none; scrollbar-width:none }
`;

// ── Palette / constants ───────────────────────────────────────────────────────
const C = {
  bg:      '#020617',
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
  if (h < 12) return { text:'Good Morning', icon:'🌅' };
  if (h < 17) return { text:'Good Afternoon', icon:'☀️' };
  return { text:'Good Evening', icon:'🌙' };
}

function initials(name='') {
  return name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
}

// ── Live clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const id=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(id); },[]);
  return (
    <div style={{textAlign:'center',lineHeight:1}}>
      <div style={{fontSize:42,fontWeight:900,letterSpacing:'-1px',color:C.text,fontVariantNumeric:'tabular-nums'}}>
        {now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}
      </div>
      <div style={{fontSize:12,color:C.muted,fontWeight:600,marginTop:4}}>
        {now.toLocaleDateString('en-US',{weekday:'long',day:'numeric',month:'long'})}
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

// ── QR check-in widget ────────────────────────────────────────────────────────
function QRScanCheckin({ onSuccess }) {
  const [scanning,setScanning]=useState(false);
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);
  const videoRef=useRef(null);
  const streamRef=useRef(null);
  const rafRef=useRef(null);
  const canvasRef=useRef(null); // reusable canvas for QR frame decoding

  const stopScan=()=>{
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    if(streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop());
    streamRef.current=null;
    setScanning(false); setMsg('');
  };

  const startScan=async()=>{
    setScanning(true); setMsg('Point camera at YOUR QR badge');
    if(!window.jsQR) await new Promise(r=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      s.onload=r; document.head.appendChild(s);
    });
    try {
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
      streamRef.current=stream;
      if(videoRef.current){ videoRef.current.srcObject=stream; videoRef.current.play(); loop(); }
    } catch { setMsg('⚠️ Camera access denied.'); }
  };

  const loop=()=>{
    const v=videoRef.current;
    if(!v||!window.jsQR||busy) return;
    if(v.readyState===v.HAVE_ENOUGH_DATA){
      if(!canvasRef.current) canvasRef.current=document.createElement('canvas');
      const c=canvasRef.current;
      c.width=v.videoWidth; c.height=v.videoHeight;
      c.getContext('2d').drawImage(v,0,0,c.width,c.height);
      const img=c.getContext('2d').getImageData(0,0,c.width,c.height);
      const code=window.jsQR(img.data,img.width,img.height);
      if(code?.data){ onQR(code.data); return; }
    }
    rafRef.current=requestAnimationFrame(loop);
  };

  const onQR=async(qrData)=>{
    if(busy) return;
    setBusy(true); vibrate(); setMsg('QR detected! Verifying…');
    try {
      const res=await workerPortalApi.qrCheckin(qrData);
      setMsg('✅ '+res.message);
      setTimeout(()=>{ stopScan(); onSuccess(res); },900);
    } catch(e) {
      setMsg('❌ '+(e?.response?.data?.error||'Scan failed.'));
      setTimeout(()=>{ setBusy(false); if(videoRef.current){ setMsg('Point camera at YOUR QR badge'); loop(); } },3000);
    }
  };

  useEffect(()=>()=>stopScan(),[]);

  return (
    <div style={{marginBottom:16}}>
      {!scanning ? (
        <button className="wp-btn" onClick={startScan} style={{
          width:'100%',padding:'22px',borderRadius:22,border:'none',cursor:'pointer',
          background:'linear-gradient(135deg,#0ea5e9 0%,#3b82f6 100%)',
          color:'#fff',fontWeight:900,fontSize:16,letterSpacing:.3,
          animation:'pulseBlue 2.5s infinite',
          boxShadow:'0 12px 28px -8px rgba(59,130,246,.55)',
        }}>
          📷 &nbsp;SCAN QR TO CHECK IN / OUT
        </button>
      ) : (
        <div className="wp-pop">
          <div style={{position:'relative',borderRadius:20,overflow:'hidden',background:'#000',aspectRatio:'1',boxShadow:`0 0 0 2px ${C.blue}`}}>
            <video ref={videoRef} style={{width:'100%',height:'100%',objectFit:'cover'}} playsInline muted />
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
              <div style={{width:'64%',height:'64%',border:`2px solid rgba(56,189,248,.4)`,borderRadius:20,position:'relative'}}>
                <div style={{position:'absolute',inset:0,border:`2px solid ${C.blue}`,borderRadius:20,animation:'pulseBlue 2s infinite'}}/>
                {/* corner marks */}
                {[[0,0],[0,1],[1,0],[1,1]].map(([r,c],i)=>(
                  <div key={i} style={{
                    position:'absolute',
                    top:r?'auto':0, bottom:r?0:'auto',
                    left:c?'auto':0, right:c?0:'auto',
                    width:16,height:16,
                    borderTop:   r?'none':`3px solid ${C.blue}`,
                    borderBottom:r?`3px solid ${C.blue}`:'none',
                    borderLeft:  c?'none':`3px solid ${C.blue}`,
                    borderRight: c?`3px solid ${C.blue}`:'none',
                  }}/>
                ))}
              </div>
            </div>
            {busy && (
              <div style={{position:'absolute',inset:0,background:'rgba(56,189,248,.15)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{color:'#fff',fontWeight:900,fontSize:14,letterSpacing:.5}}>VERIFYING…</div>
              </div>
            )}
          </div>
          <div className="wp-glass" style={{marginTop:10,borderRadius:14,padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:12,fontWeight:700,color:'#fff'}}>{msg}</span>
            <button className="wp-btn" onClick={stopScan} style={{background:'transparent',border:'none',color:'#fb7185',fontWeight:800,fontSize:12,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}
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
  const [qrMsg,setQrMsg]=useState('Scan your QR Badge');
  const [showPin,setShowPin]=useState(false);

  const handlePinLogin=async(e)=>{
    e.preventDefault();
    if(!phone||!pin) return setError('Enter phone and PIN');
    setLoading(true); setError('');
    try { const d=await workerPortalApi.login(phone,pin); onLogin(d.worker); }
    catch { setError('Invalid phone number or PIN.'); }
    finally { setLoading(false); }
  };

  const handleQRLogin=async(qrData)=>{
    if(loading) return;
    setLoading(true); vibrate(); setQrMsg('Authenticating…');
    try { const d=await workerPortalApi.qrLogin(qrData); onLogin(d.worker); }
    catch(e){
      setQrMsg('❌ '+(e?.response?.data?.error||'Invalid QR Code'));
      setLoading(false);
      setTimeout(()=>setQrMsg('Scan your QR Badge'),2500);
    }
  };

  const videoRef=useQRScanner(handleQRLogin, mode==='qr'&&!loading);

  return (
    <div className="wp wp-fade" style={{minHeight:'100dvh',background:C.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 20px'}}>
      <style>{STYLES}</style>

      {/* Logo area */}
      <div style={{textAlign:'center',marginBottom:36}}>
        <div style={{
          width:80,height:80,borderRadius:24,
          background:'linear-gradient(135deg,#0ea5e9,#6366f1)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:38,margin:'0 auto 18px',
          boxShadow:'0 20px 40px -10px rgba(99,102,241,.5)',
        }}>🏗️</div>
        <h1 style={{color:'#fff',fontSize:28,fontWeight:900,margin:0,letterSpacing:'-0.5px'}}>Worker Portal</h1>
        <p style={{color:C.muted,margin:'6px 0 0',fontSize:13,fontWeight:500}}>Construction Management System</p>
      </div>

      {/* Mode tabs */}
      <div style={{display:'flex',gap:6,marginBottom:24,background:'rgba(255,255,255,.05)',padding:5,borderRadius:16,width:'100%',maxWidth:380}}>
        {[['pin','🔑 PIN Login'],['qr','📷 QR Badge']].map(([k,l])=>(
          <button key={k} onClick={()=>setMode(k)} style={{
            flex:1,padding:'11px',borderRadius:12,border:'none',cursor:'pointer',fontWeight:800,fontSize:13,
            background:mode===k?'linear-gradient(135deg,#0ea5e9,#3b82f6)':'transparent',
            color:mode===k?'#fff':C.muted,
            transition:'all .2s',
          }}>{l}</button>
        ))}
      </div>

      {/* PIN form */}
      {mode==='pin' && (
        <form className="wp-pop" onSubmit={handlePinLogin} style={{width:'100%',maxWidth:380}}>
          <div className="wp-glass-dark" style={{borderRadius:24,padding:'28px 24px'}}>
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:11,fontWeight:800,color:C.muted,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Phone Number</label>
              <input type="tel" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,''))}
                placeholder="98XXXXXXXX" autoComplete="username"
                style={{width:'100%',padding:'14px 16px',borderRadius:14,border:`1.5px solid ${phone?C.blue:'rgba(255,255,255,.1)'}`,background:'rgba(0,0,0,.3)',color:'#fff',fontSize:16,outline:'none',boxSizing:'border-box',fontFamily:'Outfit,sans-serif',transition:'border .2s'}}
              />
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:11,fontWeight:800,color:C.muted,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>PIN</label>
              <div style={{position:'relative'}}>
                <input type={showPin?'text':'password'} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))}
                  placeholder="••••••" maxLength={6} autoComplete="current-password"
                  style={{width:'100%',padding:'14px 48px 14px 16px',borderRadius:14,border:`1.5px solid ${pin?C.blue:'rgba(255,255,255,.1)'}`,background:'rgba(0,0,0,.3)',color:'#fff',fontSize:18,letterSpacing:'0.3em',outline:'none',boxSizing:'border-box',fontFamily:'Outfit,sans-serif',transition:'border .2s'}}
                />
                <button type="button" onClick={()=>setShowPin(s=>!s)} style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:16}}>
                  {showPin?'🙈':'👁️'}
                </button>
              </div>
            </div>
            {error && (
              <div style={{marginBottom:16,padding:'10px 14px',borderRadius:10,background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.25)',color:'#fc8181',fontSize:13,fontWeight:600}}>
                ⚠️ {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="wp-btn" style={{
              width:'100%',padding:'15px',borderRadius:16,border:'none',cursor:'pointer',
              background:loading?'rgba(255,255,255,.1)':'linear-gradient(135deg,#0ea5e9,#3b82f6)',
              color:'#fff',fontWeight:900,fontSize:15,
              boxShadow:loading?'none':'0 10px 24px -6px rgba(59,130,246,.5)',
              transition:'all .2s',
            }}>
              {loading ? '⏳ Signing in…' : 'Sign In →'}
            </button>
          </div>
          <p style={{textAlign:'center',marginTop:16,fontSize:12,color:C.muted}}>
            Contact your supervisor if you forgot your PIN.
          </p>
        </form>
      )}

      {/* QR mode */}
      {mode==='qr' && (
        <div className="wp-pop" style={{width:'100%',maxWidth:380}}>
          <div className="wp-glass-dark" style={{borderRadius:24,padding:24}}>
            <div style={{position:'relative',borderRadius:20,overflow:'hidden',background:'#000',aspectRatio:'1',marginBottom:14,boxShadow:`0 0 0 2px ${C.blue}`}}>
              <video ref={videoRef} style={{width:'100%',height:'100%',objectFit:'cover'}} playsInline muted />
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                <div style={{width:'64%',height:'64%',border:`2px solid rgba(56,189,248,.35)`,borderRadius:20,position:'relative'}}>
                  <div style={{position:'absolute',inset:0,border:`2px solid ${C.blue}`,borderRadius:20,animation:'pulseBlue 2s infinite'}}/>
                </div>
              </div>
            </div>
            <p style={{textAlign:'center',color:'#fff',fontWeight:700,fontSize:14,margin:0}}>{qrMsg}</p>
            {loading && <p style={{textAlign:'center',color:C.blue,fontSize:12,marginTop:8}}>Verifying credentials…</p>}
          </div>
        </div>
      )}
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

  const showMsg=(text,type='success')=>{
    setMessage(text); setMessageType(type);
    // Errors stay longer so workers can read them
    setTimeout(()=>setMessage(''), type==='error' ? 8000 : 4000);
  };

  const handleLogout=()=>{ workerPortalApi.logout(); setUser(null); };

  if(!user) return <WorkerUploadProvider><LoginScreen onLogin={setUser}/></WorkerUploadProvider>;

  const g     = greeting();
  const today = profile?.today||{};
  const checkedIn  = !!today.check_in && !today.check_out;
  const checkedOut = !!today.check_out;

  // stats
  const payroll    = profile?.payroll||{};
  const history    = profile?.history||[];
  const thisMonth  = history.length;
  const presentDays= history.filter(r=>r.status==='PRESENT').length;

  const NAV_ITEMS=[
    {id:'home',  icon:'🏠', label:'Home'},
    {id:'tasks', icon:'📋', label:'Tasks'},
    {id:'photos',icon:'📸', label:'Photos'},
    {id:'resources',icon:'🧱',label:'Stock'},
    {id:'estimator',icon:'📐',label:'Calc'},
    {id:'profile',icon:'👤',label:'Profile'},
  ];

  return (
    <WorkerUploadProvider>
    <div className="wp wp-fade" style={{minHeight:'100dvh',background:C.bg,color:C.text,overflowX:'hidden'}}>
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
          {/* Attendance dot */}
          <div style={{
            width:10,height:10,borderRadius:'50%',
            background: checkedOut?C.muted : checkedIn?C.green:'#64748b',
            boxShadow: checkedIn?`0 0 0 0 ${C.green}`:undefined,
            animation: checkedIn?'pulseGreen 2s infinite':undefined,
          }}/>
          <button onClick={handleLogout} style={{padding:'7px 14px',borderRadius:10,border:`1px solid rgba(255,255,255,.1)`,background:'rgba(255,255,255,.05)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
            Logout
          </button>
        </div>
      </div>

      {/* ── Tab pages ── */}
      {tab==='tasks'     && <WorkerTasksPage/>}
      {tab==='photos'    && <WorkerPhotoPage/>}
      {tab==='resources' && <WorkerResourcesPage/>}

      {tab==='estimator' && (
        <div style={{minHeight:'100vh',background:C.bg,paddingBottom:100}}>
          <div style={{
            padding:'18px 20px 0',
            background:C.surface,borderBottom:`1px solid ${C.border}`,
            position:'sticky',top:0,zIndex:50,
          }}>
            <h2 style={{fontSize:20,fontWeight:900,margin:'0 0 12px',color:C.text}}>📐 Field Calculator</h2>
            <div className="wp-scroll" style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:12}}>
              {[['wall','🧱 Wall'],['concrete','🏗️ Concrete'],['plaster','🪄 Plaster'],['flooring','🧊 Flooring']].map(([k,l])=>(
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

            {/* Greeting + clock */}
            <div className="wp-glass" style={{borderRadius:24,padding:'20px 20px 24px',marginBottom:14,textAlign:'center'}}>
              <div style={{fontSize:28,marginBottom:8}}>{g.icon}</div>
              <div style={{fontSize:13,color:C.muted,fontWeight:600,marginBottom:4}}>{g.text},</div>
              <div style={{fontSize:22,fontWeight:900,marginBottom:16}}>
                {user.full_name.split(' ')[0]} 👋
              </div>
              <LiveClock/>
            </div>

            {/* Today status card */}
            <div style={{
              borderRadius:24,padding:'20px',marginBottom:14,
              background: checkedOut
                ? `linear-gradient(135deg,${C.muted}33,${C.muted}11)`
                : checkedIn
                ? 'linear-gradient(135deg,rgba(16,185,129,.2),rgba(16,185,129,.08))'
                : 'linear-gradient(135deg,rgba(56,189,248,.15),rgba(56,189,248,.05))',
              border:`1px solid ${checkedOut?C.border:checkedIn?`rgba(16,185,129,.3)`:`rgba(56,189,248,.3)`}`,
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'.08em',color:C.muted,marginBottom:6}}>Today's Status</div>
                  <div style={{fontSize:26,fontWeight:900,color: checkedOut?C.muted:checkedIn?C.green:C.blue}}>
                    {ATTEND_ICON[today.status]||'⏳'} {today.status?.replace('_',' ')||'NOT MARKED'}
                  </div>
                  <div style={{fontSize:13,color:C.muted,marginTop:6}}>
                    {today.check_in ? `In: ${fmt(today.check_in)}` : 'Awaiting check-in'}
                    {today.check_out && ` · Out: ${fmt(today.check_out)}`}
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:4}}>This month</div>
                  <div style={{fontSize:20,fontWeight:900,color:C.green}}>{presentDays}</div>
                  <div style={{fontSize:10,color:C.muted}}>days present</div>
                </div>
              </div>
            </div>

            {/* Quick stat chips */}
            <div style={{display:'flex',gap:10,marginBottom:14}}>
              <StatChip icon="📋" label="Tasks"
                value={taskCounts ? (taskCounts.active > 0 ? `${taskCounts.active} active` : taskCounts.total || '—') : '…'}
                color={taskCounts?.blocked>0?C.red:C.blue} onClick={()=>setTab('tasks')}/>
              <StatChip icon="💰" label="Earnings"
                value={payroll.total_wage?npr(payroll.total_wage):'—'} color={C.green}
                onClick={()=>setTab('payroll')}/>
              <StatChip icon="📅" label="Days"
                value={payroll.total_days??'—'} color={C.amber}
                onClick={()=>setTab('logs')}/>
            </div>

            {/* 7-day attendance mini-calendar */}
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
                  borderRadius:20,padding:'14px 16px',marginBottom:14,
                  background:'rgba(255,255,255,.03)',border:`1px solid ${C.border}`,
                }}>
                  <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>
                    This Week
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
                  <div style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap'}}>
                    {Object.entries(STATUS_DOT).map(([k,v])=>(
                      <div key={k} style={{display:'flex',alignItems:'center',gap:4}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:v}}/>
                        <span style={{fontSize:9,color:C.muted,fontWeight:700}}>{k}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Project + role info */}
            {(user.project || user.role) && (
              <div style={{
                borderRadius:18,padding:'14px 16px',marginBottom:14,
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
                    {taskCounts.blocked} blocked
                  </div>
                )}
              </div>
            )}

            {/* Message banner */}
            {message && (
              <div className="wp-pop" style={{
                marginBottom:14,padding:'12px 16px',borderRadius:14,fontWeight:700,fontSize:13,
                background:messageType==='success'?'rgba(16,185,129,.15)':'rgba(239,68,68,.15)',
                border:`1px solid ${messageType==='success'?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)'}`,
                color:messageType==='success'?C.green:C.red,
              }}>{message}</div>
            )}

            {/* QR Scan check-in */}
            {!checkedOut && <QRScanCheckin onSuccess={res=>{ showMsg(res.message); load(); }}/>}

            {/* Manual check-in / out */}
            {!checkedOut && (
              <ManualCheckinBtn
                checkedIn={checkedIn}
                onSuccess={(res) => { showMsg(res.message, 'success'); vibrate(100); load(); }}
                onError={(msg) => showMsg(msg, 'error')}
              />
            )}
            {checkedOut && (
              <div className="wp-glass" style={{borderRadius:20,padding:28,textAlign:'center',marginBottom:8}}>
                <div style={{fontSize:40,marginBottom:12}}>🌅</div>
                <div style={{fontSize:16,fontWeight:800,color:C.text}}>Great work today!</div>
                <div style={{fontSize:13,color:C.muted,marginTop:4}}>You've completed your shift. See you tomorrow!</div>
              </div>
            )}

            {/* Quick nav tiles */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:8}}>
              {[
                {icon:'📋',label:'Tasks',     t:'tasks'},
                {icon:'📸',label:'Photos',    t:'photos'},
                {icon:'🧱',label:'Resources', t:'resources'},
                {icon:'📐',label:'Calc',      t:'estimator'},
              ].map(q=>(
                <button key={q.t} onClick={()=>setTab(q.t)} className="wp-btn" style={{
                  background:'rgba(255,255,255,.04)',border:`1px solid ${C.border}`,
                  borderRadius:18,padding:'14px 0',cursor:'pointer',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:5,
                }}>
                  <span style={{fontSize:22}}>{q.icon}</span>
                  <span style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:'uppercase'}}>{q.label}</span>
                </button>
              ))}
            </div>
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
            <h2 style={{fontSize:20,fontWeight:900,marginBottom:20}}>👤 My Profile</h2>

            {/* Avatar card */}
            <div style={{
              borderRadius:24,padding:'28px 24px',marginBottom:14,textAlign:'center',
              background:'linear-gradient(135deg,rgba(99,102,241,.2),rgba(56,189,248,.1))',
              border:'1px solid rgba(99,102,241,.25)',
            }}>
              <div style={{
                width:72,height:72,borderRadius:22,
                background:'linear-gradient(135deg,#6366f1,#38bdf8)',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:28,fontWeight:900,color:'#fff',
                margin:'0 auto 16px',
                boxShadow:'0 12px 24px -6px rgba(99,102,241,.5)',
              }}>
                {initials(user.full_name)}
              </div>
              <div style={{fontSize:22,fontWeight:900}}>{user.full_name}</div>
              <div style={{fontSize:13,color:C.blue,fontWeight:700,marginTop:4}}>{user.role}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:4}}>{user.employee_id}</div>
              {user.project_id && (
                <div style={{marginTop:12,display:'inline-flex',alignItems:'center',gap:6,padding:'4px 14px',borderRadius:99,background:'rgba(16,185,129,.12)',border:'1px solid rgba(16,185,129,.2)',fontSize:12,fontWeight:700,color:C.green}}>
                  🏗️ Assigned to project
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[
                {label:'Days This Month', value:payroll.total_days??'—', color:C.blue, icon:'📅'},
                {label:'Overtime Hours',  value:payroll.total_ot!=null?`${payroll.total_ot}h`:'—', color:C.amber, icon:'⏰'},
                {label:'Total Earnings',  value:payroll.total_wage?npr(payroll.total_wage):'—', color:C.green, icon:'💰'},
                {label:'Present Rate',    value:thisMonth?`${Math.round(presentDays/thisMonth*100)}%`:'—', color:C.purple, icon:'📊'},
              ].map(s=>(
                <div key={s.label} className="wp-glass" style={{borderRadius:18,padding:'16px'}}>
                  <div style={{fontSize:18,marginBottom:6}}>{s.icon}</div>
                  <div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:'uppercase',marginTop:4}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <button onClick={()=>setTab('badge')} className="wp-btn" style={{
              width:'100%',padding:14,borderRadius:16,border:'none',marginBottom:10,
              background:'rgba(56,189,248,.1)',color:C.blue,fontSize:13,fontWeight:800,cursor:'pointer',
            }}>🆔 View My QR Badge</button>
            <button onClick={()=>setTab('logs')} className="wp-btn" style={{
              width:'100%',padding:14,borderRadius:16,border:'none',marginBottom:10,
              background:'rgba(167,139,250,.1)',color:C.purple,fontSize:13,fontWeight:800,cursor:'pointer',
            }}>📅 Attendance Log</button>
            <button onClick={()=>setTab('payroll')} className="wp-btn" style={{
              width:'100%',padding:14,borderRadius:16,border:'none',marginBottom:10,
              background:'rgba(16,185,129,.1)',color:C.green,fontSize:13,fontWeight:800,cursor:'pointer',
            }}>💰 Earnings & Payroll</button>
            <button onClick={()=>setTab('team')} className="wp-btn" style={{
              width:'100%',padding:14,borderRadius:16,border:'none',marginBottom:20,
              background:'rgba(255,255,255,.05)',color:C.muted,fontSize:13,fontWeight:800,cursor:'pointer',
            }}>👥 My Teams</button>

            <button onClick={handleLogout} className="wp-btn" style={{
              width:'100%',padding:14,borderRadius:16,
              border:'1px solid rgba(248,113,113,.2)',background:'rgba(248,113,113,.06)',
              color:'#fb7185',fontSize:13,fontWeight:800,cursor:'pointer',
            }}>🚪 Logout</button>
          </div>
        )}
      </div>

      {/* ── Bottom nav ── */}
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:200,
        background:'rgba(2,6,23,.96)',backdropFilter:'blur(20px)',
        borderTop:`1px solid ${C.border}`,
        display:'flex',padding:'6px 0 20px',
      }}>
        {NAV_ITEMS.map(({id,icon,label})=>{
          const active=tab===id;
          return (
            <button key={id} onClick={()=>setTab(id)} style={{
              flex:1,background:'none',border:'none',cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'4px 0',
            }}>
              <span className="wp-tab-icon" style={{
                fontSize: active?23:19,
                transition:'all .2s cubic-bezier(.2,.8,.2,1)',
                transform: active?'translateY(-3px) scale(1.15)':'translateY(0) scale(1)',
                display:'block',
              }}>{icon}</span>
              <span style={{
                fontSize:9,fontWeight:active?800:600,
                color:active?C.blue:C.muted,
                textTransform:'uppercase',letterSpacing:'.04em',
                transition:'color .2s',
              }}>{label}</span>
              {active && (
                <div style={{width:18,height:2,borderRadius:2,background:C.blue,marginTop:1}}/>
              )}
            </button>
          );
        })}
      </div>
    </div>
    </WorkerUploadProvider>
  );
}
