/**
 * UnifiedPanel — साथी AI chat + Daily work update, all in one place.
 *
 * Tabs:
 *   🤖 साथी    — full AI conversation (Groq, voice, suggestions)
 *   📋 काम     — task progress note + slider
 *   📷 फोटो    — camera / file upload
 *   👷 हाजिरी  — bulk attendance marking
 *   💰 खर्च    — quick expense entry
 */
import React, {
    useState, useEffect, useRef, useCallback,
} from 'react';
import { constructionService } from '../../services/constructionService';
import { attendanceService }   from '../../services/attendanceService';
import { assistantService }    from '../../services/api';
import api                     from '../../services/client';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Shared helpers                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
const today  = () => new Date().toISOString().slice(0, 10);
const fmtRs  = (n) => Number(n || 0).toLocaleString('en-IN');
const lbl    = {
    display:'block', fontSize:10, fontWeight:800, color:'var(--t-text3)',
    textTransform:'uppercase', letterSpacing:'.08em',
    fontFamily:"'DM Mono',monospace", marginBottom:6,
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CSS                                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */
const CSS = `
  /* Panel shell */
  .up-panel {
    display:flex; flex-direction:column;
    background:var(--t-bg);
    border:1px solid var(--t-border); border-radius:18px;
    overflow:hidden;
    box-shadow:0 28px 70px rgba(0,0,0,.35), 0 0 0 1px var(--t-border);
  }

  /* Tab bar */
  .up-tab {
    flex:1; padding:9px 2px; border:none; cursor:pointer;
    font-size:9px; font-weight:800; letter-spacing:.04em;
    font-family:'DM Mono',monospace; text-transform:uppercase;
    background:transparent; color:var(--t-text3);
    border-bottom:2px solid transparent; transition:all .15s;
    display:flex; flex-direction:column; align-items:center; gap:2px;
  }
  .up-tab.active   { color:var(--t-primary); border-bottom-color:var(--t-primary); background:color-mix(in srgb,var(--t-primary) 6%,transparent); }
  .up-tab:hover:not(.active) { color:var(--t-text2); }
  .up-tab-icon     { font-size:16px; line-height:1; }

  /* Form fields */
  .up-select,.up-input,.up-textarea {
    width:100%; background:var(--t-surface);
    border:1px solid var(--t-border); border-radius:10px;
    color:var(--t-text); padding:10px 12px;
    font-size:13px; font-family:inherit; outline:none; transition:border-color .15s;
  }
  .up-select:focus,.up-input:focus,.up-textarea:focus { border-color:var(--t-primary); }
  .up-select option { background:var(--t-surface); }
  .up-textarea      { resize:none; line-height:1.55; }
  .up-slider        { width:100%; accent-color:var(--t-primary); height:6px; cursor:pointer; }

  /* Photo */
  .up-photo-drop {
    border:2px dashed var(--t-border); border-radius:12px;
    padding:20px; text-align:center; cursor:pointer; transition:all .15s;
    background:var(--t-surface);
  }
  .up-photo-drop:hover,.up-photo-drop.dragover {
    border-color:var(--t-primary);
    background:color-mix(in srgb,var(--t-primary) 6%,transparent);
  }
  .up-thumb {
    width:68px; height:68px; border-radius:10px;
    object-fit:cover; border:2px solid var(--t-border); flex-shrink:0;
  }

  /* Attendance worker chips */
  .up-worker { display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:12px; border:1.5px solid var(--t-border); cursor:pointer; transition:all .15s; background:var(--t-surface); }
  .up-worker.present { border-color:#10b981; background:rgba(16,185,129,.08); }
  .up-worker.half    { border-color:#f59e0b; background:rgba(245,158,11,.08); }
  .up-worker.absent  { border-color:#ef4444; background:rgba(239,68,68,.07); }

  /* Submit btn */
  .up-btn {
    width:100%; padding:12px; border:none; border-radius:12px;
    font-size:13px; font-weight:800; cursor:pointer;
    background:var(--t-primary); color:#fff; transition:all .15s;
  }
  .up-btn:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); box-shadow:0 6px 18px color-mix(in srgb,var(--t-primary) 35%,transparent); }
  .up-btn:disabled { opacity:.45; cursor:default; transform:none; }
  @keyframes up-ok { 0%{background:rgba(16,185,129,.25)}100%{background:var(--t-primary)} }
  .up-btn-ok { animation:up-ok 1.2s ease forwards; }

  /* ── AI Chat — advanced ── */
  .up-ai-input { background:transparent; color:var(--t-text); outline:none; width:100%; font-size:13.5px; resize:none; font-family:inherit; line-height:1.55; caret-color:var(--t-primary); border:none; }
  .up-ai-input::placeholder { color:var(--t-text3); }
  .up-ai-input:disabled { opacity:.5; }

  /* Message rows */
  .ai-row { display:flex; align-items:flex-start; gap:10px; padding:4px 0; }
  .ai-row-user { flex-direction:row-reverse; }

  /* Avatars */
  .ai-avatar {
    width:30px; height:30px; border-radius:10px; flex-shrink:0;
    background:linear-gradient(135deg,var(--t-primary),color-mix(in srgb,var(--t-primary) 60%,black));
    display:flex; align-items:center; justify-content:center;
    font-size:14px; box-shadow:0 2px 8px color-mix(in srgb,var(--t-primary) 30%,transparent);
  }

  /* Bubbles */
  .ai-bubble-ai {
    background:var(--t-surface);
    border:1px solid var(--t-border);
    border-radius:4px 14px 14px 14px;
    padding:10px 14px;
    color:var(--t-text);
    max-width:90%;
    word-break:break-word;
  }
  .ai-bubble-user {
    background:linear-gradient(135deg,var(--t-primary),color-mix(in srgb,var(--t-primary) 80%,black));
    border-radius:14px 4px 14px 14px;
    padding:10px 14px;
    color:#fff;
    max-width:82%;
    word-break:break-word;
    box-shadow:0 3px 12px color-mix(in srgb,var(--t-primary) 30%,transparent);
  }

  /* Typing dots */
  .ai-typing { display:flex; align-items:center; gap:5px; padding:12px 16px; width:fit-content; }
  .ai-dot { width:7px; height:7px; border-radius:50%; background:var(--t-text3); animation:ai-bounce 1.3s ease-in-out infinite; }
  .ai-dot:nth-child(2){animation-delay:.2s} .ai-dot:nth-child(3){animation-delay:.4s}
  @keyframes ai-bounce { 0%,60%,100%{transform:translateY(0);opacity:.35} 30%{transform:translateY(-5px);opacity:1} }

  /* Streaming cursor */
  .ai-cursor { display:inline-block; width:2px; height:1em; background:var(--t-primary); margin-left:2px; vertical-align:text-bottom; animation:ai-blink .75s step-end infinite; }
  @keyframes ai-blink { 0%,100%{opacity:1} 50%{opacity:0} }

  /* Meta rows */
  .ai-meta-left { display:flex; align-items:center; gap:6px; padding:3px 2px 6px; flex-wrap:wrap; }
  .ai-meta-right { display:flex; align-items:center; gap:6px; padding:3px 2px 6px; justify-content:flex-end; }
  .ai-time { font-size:9px; color:var(--t-text3); font-family:'DM Mono',monospace; flex-shrink:0; }
  .ai-src-badge { display:inline-flex; align-items:center; gap:4px; font-size:9px; font-weight:700; padding:2px 7px; border-radius:10px; border:1px solid; font-family:'DM Mono',monospace; letter-spacing:.04em; }
  .ai-done-badge { font-size:9px; font-weight:800; padding:2px 7px; border-radius:10px; background:rgba(16,185,129,.12); color:#10b981; border:1px solid rgba(16,185,129,.25); font-family:'DM Mono',monospace; }

  /* Action buttons (copy / speak / regen) */
  .ai-actions { display:flex; align-items:center; gap:3px; transition:opacity .18s; }
  .ai-action-btn {
    width:24px; height:24px; border-radius:7px; display:flex; align-items:center; justify-content:center;
    background:var(--t-surface2); border:1px solid var(--t-border);
    color:var(--t-text3); cursor:pointer; transition:all .15s;
  }
  .ai-action-btn:hover { color:var(--t-primary); border-color:var(--t-primary); background:color-mix(in srgb,var(--t-primary) 8%,transparent); }

  /* Suggestion chips */
  .ai-chips { display:flex; flex-wrap:wrap; gap:5px; padding-top:6px; }
  .ai-chip {
    display:inline-flex; align-items:center; gap:4px;
    padding:5px 12px; border-radius:20px; font-size:11.5px; font-weight:600;
    border:1px solid color-mix(in srgb,var(--t-primary) 28%,var(--t-border));
    background:color-mix(in srgb,var(--t-primary) 5%,transparent);
    color:var(--t-text2); cursor:pointer; white-space:nowrap;
    transition:all .15s; font-family:inherit;
    animation:ai-chip-in .2s ease both;
  }
  .ai-chip:hover { border-color:var(--t-primary); color:var(--t-primary); background:color-mix(in srgb,var(--t-primary) 10%,transparent); transform:translateY(-1px); box-shadow:0 3px 10px color-mix(in srgb,var(--t-primary) 20%,transparent); }
  @keyframes ai-chip-in { from{opacity:0;transform:translateY(8px) scale(.94)} to{opacity:1;transform:none} }

  /* Mic pulse */
  @keyframes up-mic-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.4)} 50%{box-shadow:0 0 0 8px transparent} }
  .up-mic-active { animation:up-mic-pulse 1.1s ease-in-out infinite; }

  /* Speaking waveform bars */
  @keyframes ai-wave-bar { 0%,100%{transform:scaleY(1);opacity:.7} 50%{transform:scaleY(2.2);opacity:1} }

  /* Quick action buttons */
  .qa-btn {
    display:flex; flex-direction:column; align-items:center; gap:3px;
    padding:7px 4px; border-radius:10px; border:1px solid var(--t-border);
    background:var(--t-surface); cursor:pointer; flex:1; min-width:0;
    transition:all .15s; font-family:inherit;
  }
  .qa-btn:hover { transform:translateY(-2px); border-color:var(--qa-color); background:color-mix(in srgb,var(--qa-color) 8%,transparent); box-shadow:0 4px 12px color-mix(in srgb,var(--qa-color) 18%,transparent); }
  .qa-btn-icon { font-size:16px; line-height:1; }
  .qa-btn-label { font-size:8.5px; font-weight:800; letter-spacing:.02em; text-transform:uppercase; font-family:'DM Mono',monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-align:center; }

  /* Action done card */
  @keyframes action-card-in { from{opacity:0;transform:translateY(10px) scale(.97)} to{opacity:1;transform:none} }
  .action-card {
    display:flex; align-items:flex-start; gap:10px;
    padding:10px 12px; border-radius:12px; margin:4px 0;
    animation:action-card-in .2s ease both;
  }

  /* ── Conversation mode ── */
  .conv-overlay {
    position:absolute; inset:0; z-index:30;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px;
    background:var(--t-bg);
  }
  @keyframes conv-orb-listen {
    0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--t-primary) 35%,transparent),0 0 0 16px color-mix(in srgb,var(--t-primary) 12%,transparent);}
    50%{box-shadow:0 0 0 14px color-mix(in srgb,var(--t-primary) 18%,transparent),0 0 0 28px color-mix(in srgb,var(--t-primary) 6%,transparent);}
  }
  @keyframes conv-orb-think {
    0%,100%{transform:scale(1);filter:hue-rotate(0deg);}
    50%{transform:scale(1.06);filter:hue-rotate(30deg);}
  }
  @keyframes conv-orb-speak {
    0%,100%{transform:scale(1) rotate(0deg);}
    25%{transform:scale(1.05) rotate(-2deg);}
    75%{transform:scale(1.05) rotate(2deg);}
  }
  .conv-orb-listen { animation:conv-orb-listen 1.6s ease-in-out infinite; }
  .conv-orb-think  { animation:conv-orb-think  1.1s ease-in-out infinite; }
  .conv-orb-speak  { animation:conv-orb-speak  0.5s ease-in-out infinite; }
  @keyframes conv-bar { 0%,100%{transform:scaleY(.35);opacity:.5} 50%{transform:scaleY(1);opacity:1} }
  .conv-bar { transform-origin:center bottom; }
  @keyframes conv-dot { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }
  .conv-thinking-dot { animation:conv-dot 1.2s ease-in-out infinite; }
  .conv-thinking-dot:nth-child(2){animation-delay:.2s} .conv-thinking-dot:nth-child(3){animation-delay:.4s}

  /* Scrollable content area */
  .up-scroll::-webkit-scrollbar { width:3px; }
  .up-scroll::-webkit-scrollbar-thumb { background:var(--t-border); border-radius:2px; }
`;

/* ─────────────────────────────────────────────────────────────────────────── */
/*  AI Chat — constants                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */
const SOURCE_CFG = {
    groq:     { label:'Llama 3',   color:'#8b5cf6', dot:'#8b5cf6' },
    gemini:   { label:'Gemini',    color:'#3b82f6', dot:'#3b82f6' },
    openai:   { label:'GPT-4o',    color:'#10b981', dot:'#10b981' },
    fallback: { label:'Offline',   color:'#6b7280', dot:'#6b7280' },
};
const getSourceCfg = (source) => SOURCE_CFG[source] || null;
const PROVIDERS = [
    { id:'auto',   label:'Auto',   icon:'⚡', color:'#6366f1' },
    { id:'groq',   label:'Groq',   icon:'🦙', color:'#f97316' },
    { id:'gemini', label:'Gemini', icon:'✦',  color:'#3b82f6' },
];
const STARTERS = [
    { icon:'💰', label:'बजेट स्थिति',     text:'हालको बजेट स्थिति के छ? कुनै श्रेणी बजेट नाघेको छ?' },
    { icon:'📋', label:'खुला कामहरू',     text:'सबै खुला कामहरू देखाउनुस् र अर्को के गर्ने?' },
    { icon:'⚠️', label:'जोखिम जाँच',     text:'अहिले यस परियोजनामा मुख्य जोखिमहरू के छन्?' },
    { icon:'📈', label:'लागत विश्लेषण',  text:'हालको खर्चको आधारमा बजेटभित्रै सकिन्छ?' },
    { icon:'👷', label:'कार्यबल स्थिति', text:'आज कति कामदार हाजिर छन् र काम कहाँ छ?' },
    { icon:'📦', label:'सामग्री स्टक',   text:'कुन सामग्री कम छ? तुरुन्त के अर्डर गर्ने?' },
];
const CHIP_RE = [
    [/बजेट|budget|खर्च|spend|rs\.|लागत/i,'💰'],
    [/काम|task|सम्पन्न|complete|done/i,  '✅'],
    [/phase|चरण|foundation/i,            '🏗️'],
    [/हाजिरी|attendance|worker/i,        '👷'],
    [/फोटो|photo|image/i,               '📷'],
    [/सामग्री|material|stock/i,          '📦'],
    [/जोखिम|risk|alert|over/i,           '⚠️'],
    [/थप्नुस्|add|create|नयाँ/i,         '➕'],
    [/देखाउनुस्|show|list|हेर्नुस्/i,    '📋'],
];
const chipEmoji = (t) => { for (const [r,e] of CHIP_RE) if (r.test(t)) return e+' '; return ''; };
const fmtTime   = (d) => d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

/* ─────────────────────────────────────────────────────────────────────────── */
/*  AiMessage bubble                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
function AiMessage({ msg, onSpeak, onChip, onRegenerate, streaming }) {
    const [copied, setCopied] = useState(false);
    const [hovered, setHovered] = useState(false);
    const isUser = msg.role === 'user';
    const src    = getSourceCfg(msg.source);
    const chips  = msg.suggestions || [];
    const text   = streaming != null ? streaming : msg.content;

    const copy = () => {
        navigator.clipboard?.writeText(msg.content).then(() => {
            setCopied(true); setTimeout(() => setCopied(false), 1800);
        });
    };

    if (isUser) return (
        <div className="ai-row ai-row-user" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <div className="ai-meta-right">
                {hovered && (
                    <button className="ai-action-btn" onClick={copy} title="Copy">
                        {copied
                            ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/></svg>
                            : <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="5" y="1" width="9" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="4" width="9" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>
                        }
                    </button>
                )}
                <span className="ai-time">{fmtTime(msg.ts || new Date())}</span>
            </div>
            <div className="ai-bubble-user">
                <p style={{fontSize:13.5,lineHeight:1.6,margin:0,whiteSpace:'pre-wrap'}}>{msg.content}</p>
            </div>
        </div>
    );

    return (
        <div className="ai-row" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            {/* Avatar */}
            <div className="ai-avatar">🤖</div>

            <div style={{flex:1,minWidth:0}}>
                {/* Bubble */}
                <div className="ai-bubble-ai" style={{position:'relative'}}>
                    <p style={{fontSize:13.5,lineHeight:1.7,margin:0,whiteSpace:'pre-wrap'}}>
                        {text}
                        {streaming != null && <span className="ai-cursor">▋</span>}
                    </p>
                </div>

                {/* Meta row */}
                <div className="ai-meta-left">
                    <span className="ai-time">{fmtTime(msg.ts || new Date())}</span>
                    {src && (
                        <span className="ai-src-badge" style={{background:`color-mix(in srgb,${src.color} 12%,transparent)`,color:src.color,borderColor:`color-mix(in srgb,${src.color} 25%,transparent)`}}>
                            <span style={{width:5,height:5,borderRadius:'50%',background:src.dot,flexShrink:0}}/>
                            {src.label}
                        </span>
                    )}
                    {msg.actionDone && (
                        <span className="ai-done-badge">✓ सम्पन्न</span>
                    )}
                    {/* Action buttons — visible on hover */}
                    <div className="ai-actions" style={{opacity: hovered ? 1 : 0}}>
                        <button className="ai-action-btn" onClick={copy} title="Copy">
                            {copied
                                ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/></svg>
                                : <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="5" y="1" width="9" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="4" width="9" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>
                            }
                        </button>
                        {onSpeak && (
                            <button className="ai-action-btn" onClick={() => onSpeak(msg.content)} title="Read aloud">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M5 4.5v7M2 6.5v3M11 4.5v7M14 6.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </button>
                        )}
                        {onRegenerate && (
                            <button className="ai-action-btn" onClick={onRegenerate} title="Regenerate">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 1 1 1.5 4M2 8V4M2 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Suggestion chips */}
                {chips.length > 0 && onChip && streaming == null && (
                    <div className="ai-chips">
                        {chips.map((c,i) => (
                            <button key={i} className="ai-chip" style={{animationDelay:`${i * 0.07}s`}} onClick={() => onChip(c)}>
                                {chipEmoji(c)}{c}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  AI Chat Tab                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────── */
/*  Quick Actions                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
    { icon:'📋', label:'काम थप्',    color:'#6366f1', cmd:'नयाँ काम थप्नुस् — title, phase र priority सोध्नुस्', tab: null },
    { icon:'✅', label:'काम सक्यो',  color:'#10b981', cmd:'कुन काम सम्पन्न भयो? task को नाम बताउनुस्', tab: null },
    { icon:'💰', label:'खर्च दर्ता', color:'#f59e0b', cmd:null, tab:'expense' },
    { icon:'📊', label:'बजेट हेर्',  color:'#3b82f6', cmd:'हालको बजेट स्थिति र खर्च विवरण देखाउनुस्', tab: null },
    { icon:'📦', label:'स्टक जाँच',  color:'#8b5cf6', cmd:'कुन सामग्री कम छ? स्टक स्थिति देखाउनुस्', tab: null },
    { icon:'👷', label:'हाजिरी',     color:'#ec4899', cmd:null, tab:'attendance' },
];

function AiTab({ projectId, onTabSwitch }) {
    const WELCOME = {
        id:0, role:'ai', source:null, actionDone:false, ts: new Date(),
        content:'नमस्ते! म **साथी** हुँ — तपाईंको AI निर्माण सहायक। 🏗️\n\nबजेट, काम, सामग्री, हाजिरी — जे पनि सोध्नुहोस्।',
        suggestions:['बजेट स्थिति हेर्नुस्','खुला कामहरू देखाउनुस्','जोखिम जाँच्नुस्'],
    };

    const [messages,    setMessages]    = useState([WELCOME]);
    const [input,       setInput]       = useState('');
    const [busy,        setBusy]        = useState(false);
    const [streamText,  setStreamText]  = useState(null);
    const [streamId,    setStreamId]    = useState(null);
    const [recState,    setRecState]    = useState('idle'); // idle|recording|transcribing
    const [waveLevels,  setWaveLevels]  = useState([0,0,0,0,0,0,0]);
    const [speaking,    setSpeaking]    = useState(false);
    const [tts,         setTts]         = useState(true);
    const [lang,        setLang]        = useState('ne');
    const [showStarter, setShowStarter] = useState(true);
    const [atBottom,    setAtBottom]    = useState(true);
    const [voiceMode,   setVoiceMode]   = useState(false);
    const [provider,    setProvider]    = useState(() => localStorage.getItem('sathi_provider') || 'auto');
    const [ttsMode,     setTtsMode]     = useState(() => localStorage.getItem('sathi_tts_mode') || 'api');
    const [voiceError,  setVoiceError]  = useState('');
    const [convMode,    setConvMode]    = useState(false); // full duplex conversation mode
    const [convPhase,   setConvPhase]   = useState('idle'); // idle|listening|thinking|speaking

    const bottomRef      = useRef(null);
    const scrollRef      = useRef(null);
    const inputRef       = useRef(null);
    const historyRef     = useRef([]);
    const busyRef        = useRef(false);
    const streamTimer    = useRef(null);
    const mediaRecRef    = useRef(null);
    const audioCtxRef    = useRef(null);
    const analyserRef    = useRef(null);
    const waveFrameRef   = useRef(null);
    const audioRef       = useRef(null);
    const voicesRef      = useRef([]);
    const voiceModeRef   = useRef(false);
    const convModeRef    = useRef(false);
    const silenceRef     = useRef(0);   // silence frame counter
    const hasSpeechRef   = useRef(false); // user has spoken this recording

    useEffect(() => { busyRef.current = busy; }, [busy]);
    useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
    useEffect(() => { convModeRef.current = convMode; }, [convMode]);

    /* Scroll tracking */
    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
    };
    const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior:'smooth' });
    useEffect(() => { if (atBottom) scrollToBottom(); }, [messages, streamText, waveLevels, atBottom]);

    /* Auto-resize textarea */
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }, [input]);

    /* Load browser TTS voices (fallback) */
    useEffect(() => {
        const load = () => { voicesRef.current = window.speechSynthesis?.getVoices() || []; };
        load();
        window.speechSynthesis?.addEventListener('voiceschanged', load);
        return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
    }, []);

    /* Cleanup on unmount */
    useEffect(() => () => {
        stopRecording();
        stopSpeaking();
        clearTimeout(streamTimer.current);
    }, []); // eslint-disable-line

    /* ── Live waveform from microphone ──────────────────────────────────────── */
    const startWaveform = (stream) => {
        try {
            const ctx      = new AudioContext();
            const source   = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            audioCtxRef.current  = ctx;
            analyserRef.current  = analyser;
            const data = new Uint8Array(analyser.frequencyBinCount);
            const tick = () => {
                analyser.getByteFrequencyData(data);
                const levels = [data[2],data[4],data[7],data[10],data[13],data[16],data[19]].map(v => v/255);
                setWaveLevels(levels);

                // Auto silence-stop for conversation mode
                if (convModeRef.current && mediaRecRef.current?.state === 'recording') {
                    const avg = levels.reduce((a,b) => a+b, 0) / levels.length;
                    if (avg > 0.07) {
                        hasSpeechRef.current = true;
                        silenceRef.current = 0;
                    } else if (hasSpeechRef.current) {
                        silenceRef.current++;
                        if (silenceRef.current > 45) { // ~750ms silence after speech
                            if (mediaRecRef.current?.state === 'recording') mediaRecRef.current.stop();
                        }
                    }
                }

                waveFrameRef.current = requestAnimationFrame(tick);
            };
            waveFrameRef.current = requestAnimationFrame(tick);
        } catch {}
    };
    const stopWaveform = () => {
        cancelAnimationFrame(waveFrameRef.current);
        audioCtxRef.current?.close().catch(()=>{});
        audioCtxRef.current = null; analyserRef.current = null;
        setWaveLevels([0,0,0,0,0,0,0]);
    };

    /* ── TTS — API first, browser fallback ──────────────────────────────────── */
    const stopSpeaking = () => {
        // Stop API audio
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src=''; audioRef.current=null; }
        // Stop browser TTS
        window.speechSynthesis?.cancel?.();
        setSpeaking(false);
    };

    const speakWithBrowser = useCallback((text, onEnd) => {
        if (!window.speechSynthesis) { onEnd?.(); return; }
        window.speechSynthesis.cancel();
        const clean = text.replace(/[✅⚠️🤖📊📋➕🏗️📈🔊✓*_#]/g,'').replace(/\n+/g,'। ').replace(/\s{2,}/g,' ').trim();
        if (!clean) { onEnd?.(); return; }
        const utter  = new SpeechSynthesisUtterance(clean);
        const hasNep = /[ऀ-ॿ]/.test(text);
        const voices = voicesRef.current;
        const voice  = hasNep
            ? (voices.find(v=>v.lang==='ne-NP') || voices.find(v=>v.lang==='hi-IN') || voices.find(v=>v.lang.startsWith('hi')))
            : (voices.find(v=>v.lang==='en-US') || voices.find(v=>v.lang.startsWith('en')));
        if (voice) { utter.voice=voice; utter.lang=voice.lang; }
        else utter.lang = hasNep ? 'hi-IN' : 'en-US';
        utter.rate = hasNep ? .88 : .93; utter.pitch = 1.04; utter.volume = 1;
        utter.onstart = () => setSpeaking(true);
        utter.onend   = () => { setSpeaking(false); onEnd?.(); };
        utter.onerror = () => { setSpeaking(false); onEnd?.(); };
        window.speechSynthesis.speak(utter);
    }, []);

    const speak = useCallback(async (text, onEnd) => {
        if (!tts) { onEnd?.(); return; }
        stopSpeaking();

        if (ttsMode === 'api') {
            try {
                const resp = await assistantService.tts(text, null, lang);
                const blob = new Blob([resp.data], { type:'audio/mpeg' });
                const url  = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audioRef.current = audio;
                audio.onplay  = () => setSpeaking(true);
                audio.onended = () => {
                    setSpeaking(false);
                    URL.revokeObjectURL(url);
                    audioRef.current = null;
                    onEnd?.();
                };
                audio.onerror = () => {
                    setSpeaking(false);
                    audioRef.current = null;
                    // fallback to browser TTS
                    speakWithBrowser(text, onEnd);
                };
                await audio.play();
                return;
            } catch {
                // API TTS failed → browser fallback
            }
        }
        speakWithBrowser(text, onEnd);
    }, [tts, ttsMode, speakWithBrowser]); // eslint-disable-line

    /* ── Word-by-word streaming ──────────────────────────────────────────────── */
    const streamResponse = useCallback((msgId, fullText, onDone) => {
        const words = fullText.split(' ');
        let i = 0;
        setStreamText(''); setStreamId(msgId);
        const speed = Math.max(16, Math.min(50, Math.round(2800 / words.length)));
        const step = () => {
            i++;
            setStreamText(words.slice(0, i).join(' '));
            if (i < words.length) {
                streamTimer.current = setTimeout(step, speed);
            } else {
                setStreamText(null); setStreamId(null);
                onDone?.();
            }
        };
        streamTimer.current = setTimeout(step, 50);
    }, []);

    /* ── Browser SpeechRecognition fallback ────────────────────────────────── */
    const startBrowserSTT = useCallback((onResult, onError) => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { onError('Browser STT not supported'); return null; }
        const sr = new SR();
        sr.lang = lang === 'ne' ? 'ne-NP' : 'en-US';
        sr.interimResults = false;
        sr.maxAlternatives = 1;
        sr.onresult = (e) => {
            const text = e.results[0]?.[0]?.transcript?.trim() || '';
            onResult(text);
        };
        sr.onerror = (e) => onError(e.error);
        sr.onend   = () => {};
        sr.start();
        return sr;
    }, [lang]);

    /* ── MediaRecorder → Groq Whisper STT (browser STT fallback) ───────────── */
    const startRecording = useCallback(async () => {
        if (busyRef.current || recState !== 'idle') return;
        setVoiceError('');
        silenceRef.current = 0;
        hasSpeechRef.current = false;
        if (convModeRef.current) setConvPhase('listening');

        // Check mic permission first
        if (!navigator.mediaDevices?.getUserMedia) {
            setVoiceError('Microphone not supported in this browser');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            startWaveform(stream);

            const chunks = [];
            const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg',''].find(m => !m || MediaRecorder.isTypeSupported(m)) || '';
            const rec = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
            rec.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                stopWaveform();
                setRecState('transcribing');
                const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });

                // Try Groq Whisper first
                try {
                    const { data } = await assistantService.transcribe(blob, lang);
                    const text = (data.transcript || '').trim();
                    setRecState('idle');
                    if (text) send(text);
                    return;
                } catch (groqErr) {
                    console.warn('[साथी] Groq STT failed, trying browser STT:', groqErr);
                }

                // Fallback: browser SpeechRecognition (re-listen since blob already recorded)
                setRecState('idle');
                setVoiceError('Groq offline — browser mic retry गर्नुस्');
                setTimeout(() => setVoiceError(''), 3000);
            };
            rec.start(250);
            mediaRecRef.current = rec;
            setRecState('recording');

        } catch (err) {
            stopWaveform();
            setRecState('idle');
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setVoiceError('Microphone permission denied — browser settings जाँच्नुस्');
            } else if (err.name === 'NotFoundError') {
                setVoiceError('No microphone found — device जोड्नुस्');
            } else {
                setVoiceError('Mic error: ' + (err.message || err.name));
            }
            setTimeout(() => setVoiceError(''), 4000);
        }
    }, [recState, lang]); // eslint-disable-line

    const stopRecording = () => {
        if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
            mediaRecRef.current.stop();
        }
        mediaRecRef.current = null;
    };

    const toggleRecording = () => {
        if (recState === 'recording') stopRecording();
        else startRecording();
    };

    /* ── Send message ────────────────────────────────────────────────────────── */
    const send = useCallback(async (text) => {
        const msg = (text || '').trim();
        if (!msg || busyRef.current) return;
        clearTimeout(streamTimer.current);
        setStreamText(null); setStreamId(null);
        setShowStarter(false); setInput('');

        const userMsg = { id:Date.now(), role:'user', content:msg, ts:new Date(), source:null, suggestions:[], actionDone:false };
        setMessages(m => [...m.map(x => ({...x, suggestions:[]})), userMsg]);
        historyRef.current = [...historyRef.current, {role:'user', content:msg}].slice(-20);
        setBusy(true);
        if (convModeRef.current) setConvPhase('thinking');

        try {
            const { data } = await assistantService.chat(msg, historyRef.current, projectId, 'ne', provider);
            const reply = data.message || 'No response.';
            const sugg  = Array.isArray(data.suggestions) ? data.suggestions : [];
            historyRef.current = [...historyRef.current, {role:'assistant', content:reply}].slice(-20);

            const aiId  = Date.now() + 1;
            const aiMsg = { id:aiId, role:'ai', content:reply, ts:new Date(), source:data.source||'fallback', intent:data.intent||null, actionDone:reply.includes('✅'), suggestions:sugg };
            setMessages(m => [...m, aiMsg]);
            setBusy(false);

            streamResponse(aiId, reply, () => {
                if (tts) {
                    if (convModeRef.current) setConvPhase('speaking');
                    speak(reply, () => {
                        if (voiceModeRef.current) startRecording();
                        else if (convModeRef.current) setConvPhase('idle');
                    });
                } else if (voiceModeRef.current) {
                    startRecording();
                } else if (convModeRef.current) {
                    setConvPhase('idle');
                }
            });
        } catch {
            setMessages(m => [...m, { id:Date.now()+1, role:'ai', content:'⚠️ जडान त्रुटि — Backend जाँच गर्नुस्।', ts:new Date(), source:'fallback', suggestions:[], actionDone:false }]);
            setBusy(false);
            if (convModeRef.current) setConvPhase('listening');
        }
        if (!convModeRef.current) setTimeout(() => inputRef.current?.focus(), 80);
    }, [projectId, speak, tts, provider, streamResponse]); // eslint-disable-line

    /* ── Full duplex conversation mode ─────────────────────────────────────── */
    const startConversation = () => {
        setConvMode(true);
        convModeRef.current = true;
        setVoiceMode(true);
        voiceModeRef.current = true;
        silenceRef.current = 0;
        hasSpeechRef.current = false;

        // AI speaks first — greet the user, then auto-listen
        setConvPhase('speaking');
        const greeting = lang === 'ne'
            ? 'नमस्ते! म साथी हुँ। के सहायता गर्न सक्छु?'
            : 'Hello! I am Sathi. How can I help you?';

        // Add greeting as AI message
        const greetMsg = { id: Date.now(), role:'ai', content: greeting, ts: new Date(), source: null, suggestions:[], actionDone: false };
        setMessages(m => [...m, greetMsg]);
        setShowStarter(false);

        speak(greeting, () => {
            // After greeting finishes → start listening
            if (convModeRef.current) startRecording();
        });
    };

    const endConversation = () => {
        setConvMode(false);
        convModeRef.current = false;
        setVoiceMode(false);
        voiceModeRef.current = false;
        setConvPhase('idle');
        stopRecording();
        stopSpeaking();
    };

    const toggleVoiceMode = () => {
        if (convMode) endConversation();
        else startConversation();
    };

    /* Regenerate */
    const regenerate = useCallback(() => {
        const lastUser = [...messages].reverse().find(m => m.role === 'user');
        if (lastUser) {
            setMessages(m => m.filter(x => x.id !== messages[messages.length-1].id));
            send(lastUser.content);
        }
    }, [messages, send]);

    /* Clear chat */
    const clearChat = () => {
        clearTimeout(streamTimer.current);
        setStreamText(null); setStreamId(null);
        stopSpeaking(); stopRecording();
        setVoiceMode(false); setRecState('idle');
        setMessages([WELCOME]); historyRef.current = [];
        setShowStarter(true); setInput('');
    };

    return (
        <div style={{display:'flex', flexDirection:'column', flex:1, minHeight:0, position:'relative'}}>

            {/* ── Toolbar ── */}
            <div style={{display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderBottom:'1px solid var(--t-border)', background:'var(--t-surface)', flexShrink:0, flexWrap:'wrap'}}>
                {PROVIDERS.map(p => (
                    <button key={p.id}
                        onClick={() => { setProvider(p.id); localStorage.setItem('sathi_provider', p.id); }}
                        style={{display:'flex', alignItems:'center', gap:3, fontSize:9.5, fontWeight:700, padding:'3px 7px', borderRadius:20, cursor:'pointer', fontFamily:"'DM Mono',monospace", letterSpacing:'.02em', transition:'all .15s',
                            background: provider===p.id ? `color-mix(in srgb,${p.color} 15%,transparent)` : 'transparent',
                            border: `1px solid ${provider===p.id ? p.color : 'var(--t-border)'}`,
                            color: provider===p.id ? p.color : 'var(--t-text3)',
                        }}>
                        <span>{p.icon}</span>{p.label}
                    </button>
                ))}

                <div style={{width:1, height:14, background:'var(--t-border)', flexShrink:0}}/>

                {/* Lang */}
                <button onClick={() => setLang(l => l==='ne'?'en':'ne')}
                    style={{fontSize:9, fontWeight:800, padding:'3px 7px', borderRadius:20, background:'transparent', border:'1px solid var(--t-border)', color:'var(--t-text3)', cursor:'pointer', fontFamily:"'DM Mono',monospace"}}>
                    {lang==='ne' ? 'NE' : 'EN'}
                </button>

                {/* TTS on/off */}
                <button onClick={() => { setTts(v => !v); stopSpeaking(); }}
                    title={tts ? 'आवाज बन्द गर्नुस्' : 'आवाज खोल्नुस्'}
                    style={{width:26, height:26, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center',
                        background: tts ? 'color-mix(in srgb,var(--t-primary) 10%,transparent)' : 'transparent',
                        border: `1px solid ${tts ? 'color-mix(in srgb,var(--t-primary) 30%,transparent)' : 'var(--t-border)'}`,
                        color: tts ? 'var(--t-primary)' : 'var(--t-text3)', cursor:'pointer', transition:'all .15s'}}>
                    {tts
                        ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 6H1v4h2l4 3V3L3 6zM11.5 8a3.5 3.5 0 0 0-2-3.15v6.3A3.5 3.5 0 0 0 11.5 8z" fill="currentColor"/></svg>
                        : <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 6H1v4h2l4 3V3L3 6z" fill="currentColor"/><path d="M13 5l-3 3m0 0l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    }
                </button>

                {/* TTS mode API/Browser */}
                <button onClick={() => { const m = ttsMode==='api'?'browser':'api'; setTtsMode(m); localStorage.setItem('sathi_tts_mode', m); }}
                    title={ttsMode==='api' ? 'API आवाज (ElevenLabs/OpenAI)' : 'Browser आवाज'}
                    style={{fontSize:8.5, fontWeight:800, padding:'3px 7px', borderRadius:20, cursor:'pointer', fontFamily:"'DM Mono',monospace",
                        background: ttsMode==='api' ? 'color-mix(in srgb,#10b981 10%,transparent)' : 'transparent',
                        border: `1px solid ${ttsMode==='api' ? '#10b981' : 'var(--t-border)'}`,
                        color: ttsMode==='api' ? '#10b981' : 'var(--t-text3)', transition:'all .15s'}}>
                    {ttsMode==='api' ? 'API' : 'BRW'}
                </button>

                {/* Stop speaking */}
                {speaking && (
                    <button onClick={stopSpeaking}
                        style={{display:'flex', alignItems:'center', gap:3, fontSize:9, padding:'3px 7px', borderRadius:20, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', color:'#ef4444', cursor:'pointer'}}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><rect width="8" height="8" rx="1.5"/></svg>
                        रोक्नुस्
                    </button>
                )}

                <span style={{flex:1}}/>

                {/* Clear */}
                <button onClick={clearChat} title="Clear chat"
                    style={{width:26, height:26, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'1px solid var(--t-border)', color:'var(--t-text3)', cursor:'pointer', transition:'color .15s'}}
                    onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color='var(--t-text3)'}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
            </div>

            {/* ── Quick Action Bar ── */}
            <div style={{display:'flex', gap:4, padding:'6px 10px', borderBottom:'1px solid var(--t-border)', background:'var(--t-bg)', flexShrink:0}}>
                {QUICK_ACTIONS.map(a => (
                    <button key={a.label}
                        className="qa-btn"
                        style={{'--qa-color': a.color, color: a.color}}
                        onClick={() => {
                            if (a.tab) { onTabSwitch?.(a.tab); }
                            else { send(a.cmd); }
                        }}
                    >
                        <span className="qa-btn-icon">{a.icon}</span>
                        <span className="qa-btn-label" style={{color:'var(--t-text3)'}}>{a.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Messages ── */}
            <div ref={scrollRef} onScroll={handleScroll} className="up-scroll"
                style={{flex:1, overflowY:'auto', padding:'14px 12px', display:'flex', flexDirection:'column', gap:2}}>

                {showStarter && (
                    <div style={{marginBottom:14}}>
                        <div style={{textAlign:'center', padding:'10px 0 14px'}}>
                            <div style={{width:46, height:46, borderRadius:13, background:'linear-gradient(135deg,var(--t-primary),color-mix(in srgb,var(--t-primary) 65%,black))', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:7, boxShadow:'0 5px 18px color-mix(in srgb,var(--t-primary) 28%,transparent)'}}>🤖</div>
                            <p style={{fontSize:14, fontWeight:800, color:'var(--t-text)', margin:0}}>साथी AI सहायक</p>
                            <p style={{fontSize:10, color:'var(--t-text3)', margin:'3px 0 0', fontFamily:"'DM Mono',monospace", letterSpacing:'.06em'}}>GROQ WHISPER · {ttsMode==='api'?'ELEVENLABS':'BROWSER'} TTS · नेपाली</p>
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:5}}>
                            {STARTERS.map(s => (
                                <button key={s.label} onClick={() => send(s.text)}
                                    style={{display:'flex', alignItems:'center', gap:7, padding:'9px 10px', borderRadius:11, background:'var(--t-surface)', border:'1px solid var(--t-border)', cursor:'pointer', textAlign:'left', transition:'all .15s'}}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor='var(--t-primary)'; e.currentTarget.style.background='color-mix(in srgb,var(--t-primary) 5%,transparent)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--t-border)'; e.currentTarget.style.background='var(--t-surface)'; }}>
                                    <span style={{fontSize:15, flexShrink:0}}>{s.icon}</span>
                                    <span style={{fontSize:11, fontWeight:700, color:'var(--t-text2)', lineHeight:1.35}}>{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, idx) => (
                    <AiMessage key={m.id} msg={m}
                        onSpeak={tts ? speak : null}
                        onChip={send}
                        onRegenerate={m.role==='ai' && idx===messages.length-1 && !busy ? regenerate : null}
                        streaming={streamId===m.id ? streamText : null}
                    />
                ))}

                {busy && (
                    <div className="ai-row" style={{marginTop:4}}>
                        <div className="ai-avatar">🤖</div>
                        <div className="ai-bubble-ai ai-typing">
                            <span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/>
                        </div>
                    </div>
                )}

                <div ref={bottomRef}/>
            </div>

            {!atBottom && (
                <button onClick={scrollToBottom}
                    style={{position:'absolute', bottom:76, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, padding:'5px 12px', borderRadius:20, background:'var(--t-surface)', border:'1px solid var(--t-border)', color:'var(--t-text2)', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,.14)', zIndex:10, whiteSpace:'nowrap'}}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    तल जानुस्
                </button>
            )}

            {/* ── Live waveform overlay (recording) ── */}
            {recState !== 'idle' && (
                <div style={{position:'absolute', bottom:70, left:12, right:12, background:'var(--t-surface)', border:'1px solid var(--t-border)', borderRadius:12, padding:'10px 14px', zIndex:11, display:'flex', alignItems:'center', gap:10, boxShadow:'0 4px 18px rgba(0,0,0,.18)'}}>
                    {recState === 'recording' ? (
                        <>
                            <div style={{display:'flex', alignItems:'flex-end', gap:2, height:28, flexShrink:0}}>
                                {waveLevels.map((lv, i) => (
                                    <div key={i} style={{width:3, borderRadius:3, background:'#ef4444', transition:'height .08s ease', height: Math.max(4, lv * 28)}}/>
                                ))}
                            </div>
                            <span style={{flex:1, fontSize:12, fontWeight:600, color:'var(--t-text2)'}}>सुनिरहेको… बोल्नुस्</span>
                            <div style={{width:8, height:8, borderRadius:'50%', background:'#ef4444', animation:'ai-blink .6s step-end infinite'}}/>
                        </>
                    ) : (
                        <>
                            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="var(--t-primary)" strokeWidth="2.5" strokeDasharray="28" strokeDashoffset="9"/></svg>
                            <span style={{fontSize:12, fontWeight:600, color:'var(--t-text2)'}}>Groq Whisper ले ट्रान्सक्राइब गर्दैछ…</span>
                        </>
                    )}
                </div>
            )}

            {/* ── Speaking indicator ── */}
            {speaking && (
                <div style={{position:'absolute', bottom:70, left:12, right:12, background:'color-mix(in srgb,var(--t-primary) 8%,var(--t-surface))', border:'1px solid color-mix(in srgb,var(--t-primary) 25%,transparent)', borderRadius:12, padding:'8px 14px', zIndex:11, display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 18px rgba(0,0,0,.12)'}}>
                    <div style={{display:'flex', alignItems:'center', gap:3}}>
                        {[4,8,6,10,5,9,4].map((h,i) => (
                            <div key={i} style={{width:3, borderRadius:3, background:'var(--t-primary)', animation:`ai-wave-bar .9s ease-in-out infinite`, animationDelay:`${i*.07}s`, height:h}}/>
                        ))}
                    </div>
                    <span style={{flex:1, fontSize:12, fontWeight:600, color:'var(--t-primary)'}}>साथी बोल्दैछ…</span>
                    <button onClick={stopSpeaking} style={{fontSize:10, padding:'2px 8px', borderRadius:8, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', color:'#ef4444', cursor:'pointer'}}>⏹ रोक्नुस्</button>
                </div>
            )}

            {/* ── Full Conversation Overlay ── */}
            {convMode && (() => {
                const isListening = convPhase === 'listening';
                const isThinking  = convPhase === 'thinking';
                const isSpeaking  = convPhase === 'speaking';

                const orbClass = isListening ? 'conv-orb-listen' : isThinking ? 'conv-orb-think' : isSpeaking ? 'conv-orb-speak' : '';
                const orbColor = isListening ? 'var(--t-primary)' : isThinking ? '#f59e0b' : isSpeaking ? '#10b981' : 'var(--t-text3)';

                const phaseLabel = isListening ? 'सुन्दैछु…' : isThinking ? 'सोच्दैछु…' : isSpeaking ? 'बोल्दैछु…' : 'तयार';
                const phaseIcon  = isListening ? '👂' : isThinking ? '🧠' : isSpeaking ? '🔊' : '🤖';

                // Last AI message for preview
                const lastAi = [...messages].reverse().find(m => m.role === 'ai');
                const lastUser = [...messages].reverse().find(m => m.role === 'user');

                return (
                    <div className="conv-overlay">
                        {/* Orb */}
                        <div className={orbClass} style={{
                            width:88, height:88, borderRadius:'50%',
                            background:`linear-gradient(135deg, ${orbColor}, color-mix(in srgb,${orbColor} 70%,black))`,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:36, flexShrink:0, cursor:'default',
                            transition:'background .4s',
                        }}>
                            {phaseIcon}
                        </div>

                        {/* Phase label */}
                        <p style={{fontSize:17, fontWeight:800, color:'var(--t-text)', letterSpacing:'.01em'}}>
                            {phaseLabel}
                        </p>

                        {/* Waveform / thinking dots */}
                        <div style={{height:40, display:'flex', alignItems:'center', gap:3}}>
                            {isThinking ? (
                                <>
                                    <span className="conv-thinking-dot" style={{width:10,height:10,borderRadius:'50%',background:'#f59e0b',display:'inline-block'}}/>
                                    <span className="conv-thinking-dot" style={{width:10,height:10,borderRadius:'50%',background:'#f59e0b',display:'inline-block'}}/>
                                    <span className="conv-thinking-dot" style={{width:10,height:10,borderRadius:'50%',background:'#f59e0b',display:'inline-block'}}/>
                                </>
                            ) : (
                                waveLevels.map((lv, i) => (
                                    <div key={i} className="conv-bar" style={{
                                        width:5, borderRadius:5,
                                        background: isSpeaking ? '#10b981' : isListening ? 'var(--t-primary)' : 'var(--t-border)',
                                        height: Math.max(5, lv * 40),
                                        transition:'height .08s ease',
                                        animation: isSpeaking ? `conv-bar ${.6 + i*.07}s ease-in-out infinite` : 'none',
                                        animationDelay: `${i * .06}s`,
                                    }}/>
                                ))
                            )}
                        </div>

                        {/* Conversation transcript preview */}
                        <div style={{width:'85%', background:'var(--t-surface)', borderRadius:14, border:`1px solid ${isListening ? 'color-mix(in srgb,var(--t-primary) 30%,var(--t-border))' : 'var(--t-border)'}`, padding:'10px 14px', minHeight:60, maxHeight:100, overflow:'hidden', transition:'border-color .3s'}}>
                            {isSpeaking && lastAi && (
                                <p style={{fontSize:12, color:'var(--t-text)', margin:0, lineHeight:1.6}}>
                                    <span style={{fontSize:8.5, fontWeight:800, color:'#10b981', textTransform:'uppercase', letterSpacing:'.06em', fontFamily:"'DM Mono',monospace"}}>🤖 साथी</span><br/>
                                    {(streamText || lastAi.content).slice(0, 100)}{lastAi.content.length > 100 ? '…' : ''}
                                </p>
                            )}
                            {isThinking && (
                                <p style={{fontSize:12, color:'var(--t-text2)', margin:0, lineHeight:1.6}}>
                                    <span style={{fontSize:8.5, fontWeight:800, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'.06em', fontFamily:"'DM Mono',monospace"}}>🧠 सोच्दैछु</span><br/>
                                    {lastUser ? `"${lastUser.content.slice(0, 70)}${lastUser.content.length > 70 ? '…' : ''}"` : ''}
                                </p>
                            )}
                            {isListening && (
                                <p style={{fontSize:12, color:'var(--t-text3)', margin:0, lineHeight:1.6, textAlign:'center', paddingTop:2}}>
                                    <span style={{fontSize:8.5, fontWeight:800, color:'var(--t-primary)', textTransform:'uppercase', letterSpacing:'.06em', fontFamily:"'DM Mono',monospace", display:'block', marginBottom:4}}>👂 सुन्दैछु</span>
                                    {lastAi ? lastAi.content.slice(lastAi.content.lastIndexOf('।') > 0 ? lastAi.content.lastIndexOf('।') + 1 : 0).trim().slice(0,80) : 'बोल्नुस्…'}
                                </p>
                            )}
                        </div>

                        {/* End call button */}
                        <button onClick={endConversation}
                            style={{display:'flex', alignItems:'center', gap:8, padding:'12px 28px', borderRadius:50,
                                background:'#ef4444', color:'#fff', border:'none', fontSize:13.5, fontWeight:800,
                                cursor:'pointer', boxShadow:'0 6px 20px rgba(239,68,68,.4)', transition:'transform .15s'}}
                            onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                            </svg>
                            बन्द गर्नुस्
                        </button>

                        {/* Hint */}
                        <p style={{fontSize:9, color:'var(--t-text3)', fontFamily:"'DM Mono',monospace", letterSpacing:'.06em'}}>
                            AUTO SILENCE DETECT · GROQ WHISPER · EDGE TTS
                        </p>
                    </div>
                );
            })()}

            {/* ── Input bar ── */}
            <div style={{padding:'8px 10px', borderTop:'1px solid var(--t-border)', background:'var(--t-surface)', flexShrink:0}}>
                <div style={{display:'flex', alignItems:'flex-end', gap:7, background:'var(--t-bg)', border:'1.5px solid var(--t-border)', borderRadius:13, padding:'7px 9px', transition:'border-color .15s'}}
                    onFocusCapture={e => e.currentTarget.style.borderColor='var(--t-primary)'}
                    onBlurCapture={e  => e.currentTarget.style.borderColor='var(--t-border)'}>

                    {/* Mic → Groq Whisper */}
                    <button
                        onClick={toggleRecording}
                        className={recState==='recording' ? 'up-mic-active' : ''}
                        title={recState==='idle' ? 'Groq Whisper मा रेकर्ड गर्नुस्' : 'रोक्नुस्'}
                        style={{width:32, height:32, borderRadius:9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                            background: recState==='recording' ? '#ef4444' : recState==='transcribing' ? 'color-mix(in srgb,var(--t-primary) 15%,transparent)' : 'var(--t-surface2)',
                            border: `1px solid ${recState==='recording' ? '#ef4444' : 'var(--t-border)'}`,
                            color: recState!=='idle' ? (recState==='recording' ? '#fff' : 'var(--t-primary)') : 'var(--t-text3)',
                            cursor:'pointer', transition:'all .15s'}}>
                        {recState === 'recording'
                            ? <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect width="12" height="12" rx="2"/></svg>
                            : recState === 'transcribing'
                                ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="28" strokeDashoffset="9"/></svg>
                                : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="5" y="1" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 8a6 6 0 0 0 12 0M8 14v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        }
                    </button>

                    {/* Text input */}
                    <textarea ref={inputRef}
                        className="up-ai-input"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                        placeholder={recState!=='idle' ? (recState==='recording' ? '🎤 रेकर्ड हुँदैछ…' : '⏳ ट्रान्सक्राइब…') : 'सोध्नुस्… (Enter)'}
                        rows={1}
                        style={{flex:1, maxHeight:110, overflowY:'auto', lineHeight:1.55, paddingTop:3}}
                        disabled={recState!=='idle'}
                    />

                    {input.length > 80 && (
                        <span style={{fontSize:9, color:'var(--t-text3)', fontFamily:"'DM Mono',monospace", flexShrink:0, paddingBottom:2}}>{input.length}</span>
                    )}

                    {/* Conversation mode button */}
                    <button onClick={toggleVoiceMode} title="Voice conversation mode — dual talking"
                        style={{width:32, height:32, borderRadius:9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                            background: convMode ? 'color-mix(in srgb,#10b981 15%,transparent)' : 'var(--t-surface2)',
                            border: `1.5px solid ${convMode ? '#10b981' : 'var(--t-border)'}`,
                            color: convMode ? '#10b981' : 'var(--t-text3)', cursor:'pointer', transition:'all .15s',
                            animation: convMode ? 'up-mic-pulse 1.4s ease-in-out infinite' : 'none'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" stroke="currentColor" strokeWidth="1.8"/>
                            <path d="M19 10a7 7 0 0 1-14 0M12 19v4M8 23h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                    </button>

                    {/* Send */}
                    <button onClick={() => send(input)} disabled={!input.trim() || busy}
                        style={{width:32, height:32, borderRadius:9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                            background: (input.trim() && !busy) ? 'var(--t-primary)' : 'var(--t-surface2)',
                            border: 'none',
                            color: (input.trim() && !busy) ? '#fff' : 'var(--t-text3)',
                            cursor: (input.trim() && !busy) ? 'pointer' : 'default',
                            transition:'all .18s', boxShadow: (input.trim() && !busy) ? '0 3px 10px color-mix(in srgb,var(--t-primary) 35%,transparent)' : 'none'}}>
                        {busy
                            ? <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="28" strokeDashoffset="9"/></svg>
                            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        }
                    </button>
                </div>

                {voiceError ? (
                    <p style={{fontSize:10, color:'#ef4444', textAlign:'center', marginTop:5, fontWeight:600, background:'rgba(239,68,68,.08)', padding:'4px 8px', borderRadius:8}}>
                        ⚠️ {voiceError}
                    </p>
                ) : (
                    <p style={{fontSize:8.5, color:'var(--t-text3)', textAlign:'center', marginTop:5, fontFamily:"'DM Mono',monospace", letterSpacing:'.04em'}}>
                        🎤 Groq Whisper STT · {ttsMode==='api'?'Edge Neural TTS':'Browser'} TTS · ▶ Voice loop
                    </p>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Task Tab                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
function TaskTab({ projectId }) {
    const [tasks,setTasks]=useState([]); const [taskId,setTaskId]=useState('');
    const [note,setNote]=useState(''); const [pct,setPct]=useState(50);
    const [saving,setSaving]=useState(false); const [done,setDone]=useState(false);
    useEffect(()=>{constructionService.getTasks().then(d=>{const a=(Array.isArray(d)?d:d.results||[]).filter(t=>t.status!=='COMPLETED');setTasks(a);if(a.length)setTaskId(String(a[0].id));}).catch(()=>{});}, []);
    const submit=async()=>{if(!taskId||!note.trim())return;setSaving(true);try{await api.post('/updates/',{task:Number(taskId),note:note.trim(),progress_percentage:pct});setNote('');setDone(true);setTimeout(()=>setDone(false),2000);}catch{alert('सेभ गर्न सकिएन।');}finally{setSaving(false);}};
    return (
        <div className="flex flex-col gap-4">
            <div><label style={lbl}>📋 कुन काम?</label>
                <select className="up-select" value={taskId} onChange={e=>setTaskId(e.target.value)}>
                    {!tasks.length&&<option>लोड हुँदैछ…</option>}
                    {tasks.map(t=><option key={t.id} value={t.id}>[{t.status}] {t.title}</option>)}
                </select>
            </div>
            <div><label style={lbl}>📝 आजको काम</label>
                <textarea className="up-textarea" rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="आज के काम भयो? जस्तै: Foundation को खुट्टा राखियो…"/>
            </div>
            <div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <label style={lbl}>📊 प्रगति</label>
                    <span style={{fontSize:13,fontWeight:800,color:'var(--t-primary)'}}>{pct}%</span>
                </div>
                <input type="range" min={0} max={100} step={5} value={pct} onChange={e=>setPct(Number(e.target.value))} className="up-slider"/>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'var(--t-text3)',marginTop:2}}>
                    <span>सुरु भएन</span><span>आधा</span><span>सकियो ✅</span>
                </div>
            </div>
            <button className={`up-btn${done?' up-btn-ok':''}`} onClick={submit} disabled={saving||!taskId||!note.trim()}>
                {done?'✅ सेभ भयो!':saving?'सेभ हुँदैछ…':'💾 अपडेट सेभ गर्नुस्'}
            </button>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Photo Tab                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function PhotoTab() {
    const [tasks,setTasks]=useState([]); const [taskId,setTaskId]=useState('');
    const [files,setFiles]=useState([]); const [drag,setDrag]=useState(false);
    const [uploading,setUploading]=useState(false);
    const ref=useRef();
    useEffect(()=>{constructionService.getTasks().then(d=>{const a=Array.isArray(d)?d:d.results||[];setTasks(a);if(a.length)setTaskId(String(a[0].id));}).catch(()=>{});}, []);
    const add=(raw)=>setFiles(p=>[...p,...Array.from(raw).filter(f=>f.type.startsWith('image/')||f.type.startsWith('video/')).map(f=>({file:f,preview:URL.createObjectURL(f),status:'pending'}))]);
    const remove=(i)=>setFiles(p=>{URL.revokeObjectURL(p[i].preview);return p.filter((_,j)=>j!==i);});
    const upload=async()=>{
        if(!files.length||!taskId)return;
        setUploading(true);
        for(const e of files.filter(f=>f.status==='pending')){
            setFiles(p=>p.map(x=>x.preview===e.preview?{...x,status:'uploading'}:x));
            const fd=new FormData();fd.append('task',taskId);fd.append('file',e.file);fd.append('media_type',e.file.type.startsWith('video/')?'VIDEO':'IMAGE');
            try{await constructionService.uploadTaskMedia(fd);setFiles(p=>p.map(x=>x.preview===e.preview?{...x,status:'done'}:x));}
            catch{setFiles(p=>p.map(x=>x.preview===e.preview?{...x,status:'error'}:x));}
        }
        setUploading(false);
        setTimeout(()=>setFiles(p=>p.filter(f=>f.status!=='done')),1500);
    };
    const pending=files.filter(f=>f.status==='pending').length;
    return (
        <div className="flex flex-col gap-4">
            <div><label style={lbl}>📋 कुन कामको फोटो?</label>
                <select className="up-select" value={taskId} onChange={e=>setTaskId(e.target.value)}>
                    {tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
            </div>
            <div className={`up-photo-drop${drag?' dragover':''}`}
                onClick={()=>ref.current?.click()}
                onDragOver={e=>{e.preventDefault();setDrag(true);}}
                onDragLeave={()=>setDrag(false)}
                onDrop={e=>{e.preventDefault();setDrag(false);add(e.dataTransfer.files);}}>
                <input ref={ref} type="file" hidden accept="image/*,video/*" multiple capture="environment" onChange={e=>add(e.target.files)}/>
                <div style={{fontSize:28,marginBottom:6}}>📷</div>
                <p style={{fontSize:13,fontWeight:700,color:'var(--t-text2)'}}>फोटो छान्नुस् वा क्यामेरा खोल्नुस्</p>
                <p style={{fontSize:11,color:'var(--t-text3)',marginTop:3}}>थिच्नुस् वा तान्नुस् (drag & drop)</p>
            </div>
            {files.length>0&&(
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {files.map((f,i)=>(
                        <div key={i} style={{position:'relative'}}>
                            <img src={f.preview} alt="" className="up-thumb" style={{opacity:f.status==='uploading'?.5:1,borderColor:f.status==='done'?'#10b981':f.status==='error'?'#ef4444':'var(--t-border)'}}/>
                            {f.status==='uploading'&&<div style={{position:'absolute',inset:0,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.4)',fontSize:16}}>⏳</div>}
                            {f.status==='done'   &&<div style={{position:'absolute',inset:0,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(16,185,129,.3)',fontSize:18}}>✅</div>}
                            {f.status==='error'  &&<div style={{position:'absolute',inset:0,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(239,68,68,.3)',fontSize:18}}>❌</div>}
                            {f.status==='pending'&&<button onClick={()=>remove(i)} style={{position:'absolute',top:-6,right:-6,width:18,height:18,borderRadius:'50%',background:'#ef4444',color:'#fff',border:'none',cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>}
                        </div>
                    ))}
                </div>
            )}
            <button className="up-btn" onClick={upload} disabled={uploading||pending===0||!taskId}>
                {uploading?'अपलोड हुँदैछ…':pending>0?`📤 ${pending} फोटो अपलोड गर्नुस्`:'फोटो छान्नुस्'}
            </button>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Attendance Tab                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
const CYCLE=['PRESENT','HALF_DAY','ABSENT'];
const STATUS_LABEL={PRESENT:'✅ हाजिर',HALF_DAY:'🌗 आधा',ABSENT:'❌ गैरहाजिर'};
const STATUS_CLS={PRESENT:'present',HALF_DAY:'half',ABSENT:'absent'};

function AttendanceTab({ projectId }) {
    const [workers,setWorkers]=useState([]); const [statuses,setStatuses]=useState({});
    const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [done,setDone]=useState(false);
    useEffect(()=>{attendanceService.getWorkers({is_active:true}).then(d=>{const l=Array.isArray(d)?d:d.results||[];setWorkers(l);const s={};l.forEach(w=>{s[w.id]='PRESENT';});setStatuses(s);setLoading(false);}).catch(()=>setLoading(false));}, []);
    const cycle=(id)=>setStatuses(p=>({...p,[id]:CYCLE[(CYCLE.indexOf(p[id]||'PRESENT')+1)%CYCLE.length]}));
    const markAll=(s)=>{const n={};workers.forEach(w=>{n[w.id]=s;});setStatuses(n);};
    const submit=async()=>{if(!workers.length)return;setSaving(true);try{await attendanceService.bulkMark({records:workers.map(w=>({worker:w.id,date:today(),status:statuses[w.id]||'PRESENT',...(projectId?{project:projectId}:{})}))});setDone(true);setTimeout(()=>setDone(false),2500);}catch{alert('हाजिरी सेभ गर्न सकिएन।');}finally{setSaving(false);}};
    if(loading)return <p style={{textAlign:'center',color:'var(--t-text3)',padding:24}}>लोड हुँदैछ…</p>;
    if(!workers.length)return <p style={{textAlign:'center',color:'var(--t-text3)',padding:24,fontSize:13}}>कोही कर्मचारी छैनन्।<br/><span style={{fontSize:11}}>Attendance &gt; Workers मा थप्नुस्।</span></p>;
    const presentN=Object.values(statuses).filter(s=>s==='PRESENT').length;
    return (
        <div className="flex flex-col gap-3">
            <div style={{display:'flex',gap:6}}>
                <button onClick={()=>markAll('PRESENT')} style={{flex:1,padding:'7px 8px',borderRadius:8,border:'1.5px solid #10b981',background:'rgba(16,185,129,.1)',color:'#10b981',fontSize:11,fontWeight:800,cursor:'pointer'}}>✅ सबै हाजिर</button>
                <button onClick={()=>markAll('ABSENT')}  style={{flex:1,padding:'7px 8px',borderRadius:8,border:'1.5px solid #ef4444',background:'rgba(239,68,68,.1)',color:'#ef4444',fontSize:11,fontWeight:800,cursor:'pointer'}}>❌ सबै गैरहाजिर</button>
            </div>
            <div className="up-scroll flex flex-col gap-2" style={{maxHeight:260,overflowY:'auto'}}>
                {workers.map(w=>(
                    <div key={w.id} className={`up-worker ${STATUS_CLS[statuses[w.id]||'PRESENT']}`} onClick={()=>cycle(w.id)}>
                        <div style={{width:34,height:34,borderRadius:9,background:'var(--t-surface2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>👷</div>
                        <div style={{flex:1,minWidth:0}}>
                            <p style={{fontWeight:700,fontSize:13,color:'var(--t-text)'}}>{w.name}</p>
                            <p style={{fontSize:10,color:'var(--t-text3)'}}>{w.trade||'Worker'} · Rs.{fmtRs(w.daily_rate)}/दिन</p>
                        </div>
                        <span style={{fontSize:11,fontWeight:700}}>{STATUS_LABEL[statuses[w.id]||'PRESENT']}</span>
                    </div>
                ))}
            </div>
            <p style={{fontSize:11,color:'var(--t-text3)',textAlign:'center'}}>{presentN}/{workers.length} हाजिर · थिचेर बदल्नुस्</p>
            <button className={`up-btn${done?' up-btn-ok':''}`} onClick={submit} disabled={saving}>
                {done?'✅ हाजिरी सेभ भयो!':saving?'सेभ हुँदैछ…':`💾 हाजिरी सेभ गर्नुस् (${today()})`}
            </button>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Expense Tab                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
const EXP_TYPES=[{v:'MATERIAL',l:'🧱 सामग्री'},{v:'LABOR',l:'👷 ज्याला'},{v:'FEES',l:'📄 दस्तुर'},{v:'GOVT',l:'🏛️ सरकारी'},{v:'OTHER',l:'💼 अन्य'}];

function ExpenseTab({ projectId }) {
    const [phases,setPhases]=useState([]); const [title,setTitle]=useState('');
    const [amount,setAmount]=useState(''); const [type,setType]=useState('OTHER');
    const [phaseId,setPhaseId]=useState(''); const [paidTo,setPaidTo]=useState('');
    const [saving,setSaving]=useState(false); const [done,setDone]=useState(false);
    useEffect(()=>{constructionService.getPhases().then(d=>{setPhases(Array.isArray(d)?d:d.results||[]);}).catch(()=>{});}, []);
    // TODO Phase 3: migrate to /fin/bills/ once Bill supports expense_type + phase FK
    const submit=async()=>{if(!title.trim()||!amount||Number(amount)<=0)return;setSaving(true);try{await api.post('/finance/expenses/',{title:title.trim(),amount:Number(amount),expense_type:type,date:today(),paid_to:paidTo.trim(),is_paid:true,...(phaseId?{phase:Number(phaseId)}:{}),...(projectId?{project:projectId}:{})});setTitle('');setAmount('');setPaidTo('');setDone(true);setTimeout(()=>setDone(false),2000);}catch{alert('खर्च सेभ गर्न सकिएन।');}finally{setSaving(false);}};
    return (
        <div className="flex flex-col gap-4">
            <div><label style={lbl}>📂 खर्चको किसिम</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                    {EXP_TYPES.map(t=><button key={t.v} onClick={()=>setType(t.v)} style={{padding:'5px 11px',borderRadius:20,border:`1.5px solid ${type===t.v?'var(--t-primary)':'var(--t-border)'}`,background:type===t.v?'color-mix(in srgb,var(--t-primary) 12%,transparent)':'var(--t-surface)',color:type===t.v?'var(--t-primary)':'var(--t-text2)',fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .15s'}}>{t.l}</button>)}
                </div>
            </div>
            <div><label style={lbl}>📝 खर्चको विवरण</label>
                <input className="up-input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="जस्तै: सिमेन्ट किनियो, ज्याला तिरियो…"/>
            </div>
            <div><label style={lbl}>💰 रकम (Rs.)</label>
                <input className="up-input" type="number" min="0" step="100" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" style={{fontSize:17,fontWeight:800}}/>
                {amount&&Number(amount)>0&&<p style={{fontSize:11,color:'var(--t-text3)',marginTop:3}}>Rs. {Number(amount).toLocaleString('en-IN')}</p>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div><label style={lbl}>🏗️ Phase</label>
                    <select className="up-select" value={phaseId} onChange={e=>setPhaseId(e.target.value)}>
                        <option value="">— छान्नुस् —</option>
                        {phases.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div><label style={lbl}>👤 कसलाई?</label>
                    <input className="up-input" value={paidTo} onChange={e=>setPaidTo(e.target.value)} placeholder="नाम…"/>
                </div>
            </div>
            <button className={`up-btn${done?' up-btn-ok':''}`} onClick={submit} disabled={saving||!title.trim()||!amount||Number(amount)<=0}>
                {done?'✅ खर्च सेभ भयो!':saving?'सेभ हुँदैछ…':'💾 खर्च दर्ता गर्नुस्'}
            </button>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Panel                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
const TABS = [
    { id:'ai',         icon:'🤖', label:'साथी'   },
    { id:'task',       icon:'📋', label:'काम'    },
    { id:'photo',      icon:'📷', label:'फोटो'   },
    { id:'attendance', icon:'👷', label:'हाजिरी' },
    { id:'expense',    icon:'💰', label:'खर्च'   },
];

/**
 * hideChrome=true  → skip own header + tab bar; use activeTab prop (controlled by parent).
 * hideChrome=false → standalone mode: renders its own header + tab bar.
 */
export default function UnifiedPanel({
    onClose     = null,
    projectId   = null,
    isDesktop   = true,
    initialTab  = 'ai',
    hideChrome  = false,
    activeTab   = null,
    onTabSwitch = null,   // callback(tabId) to switch tabs from parent
}) {
    // Internal tab state used only in standalone (non-hideChrome) mode
    const [internalTab, setInternalTab] = useState(initialTab);

    // Sync internal tab if initialTab changes externally (e.g., parent switches)
    useEffect(() => { setInternalTab(initialTab); }, [initialTab]);

    // Which tab is actually shown
    const tab = hideChrome && activeTab != null ? activeTab : internalTab;

    // Standalone panel gets its own sizing + border-radius
    const panelStyle = hideChrome
        ? { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }
        : isDesktop
            ? { width: 430, height: '88vh', maxHeight: 720 }
            : { width: '100%', height: '100%' };

    const wrapClass = hideChrome ? '' : 'up-panel';

    return (
        <>
            <style>{CSS}</style>
            <div className={wrapClass} style={panelStyle}>

                {/* Header — only in standalone mode */}
                {!hideChrome && (
                    <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderBottom:'1px solid var(--t-border)',background:'var(--t-surface)',flexShrink:0}}>
                        <div style={{width:34,height:34,borderRadius:10,flexShrink:0,background:'linear-gradient(135deg,var(--t-primary),color-mix(in srgb,var(--t-primary) 70%,black))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,boxShadow:'0 3px 10px color-mix(in srgb,var(--t-primary) 30%,transparent)'}}>
                            {TABS.find(t=>t.id===tab)?.icon||'🤖'}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                            <p style={{fontSize:14,fontWeight:900,color:'var(--t-text)',lineHeight:1}}>साथी · दैनिक अपडेट</p>
                            <p style={{fontSize:9,color:'var(--t-primary)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',fontFamily:"'DM Mono',monospace",marginTop:2}}>
                                {new Date().toLocaleDateString('ne-NP',{year:'numeric',month:'long',day:'numeric'})}
                            </p>
                        </div>
                        {onClose && (
                            <button onClick={onClose} style={{width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--t-surface2)',border:'1px solid var(--t-border)',color:'var(--t-text3)',cursor:'pointer',fontSize:13,transition:'all .15s'}}
                                onMouseEnter={e=>e.currentTarget.style.color='var(--t-danger)'}
                                onMouseLeave={e=>e.currentTarget.style.color='var(--t-text3)'}>✕</button>
                        )}
                    </div>
                )}

                {/* Tab bar — only in standalone mode */}
                {!hideChrome && (
                    <div style={{display:'flex',borderBottom:'1px solid var(--t-border)',flexShrink:0,background:'var(--t-surface)'}}>
                        {TABS.map(t=>(
                            <button key={t.id} className={`up-tab${tab===t.id?' active':''}`} onClick={()=>setInternalTab(t.id)}>
                                <span className="up-tab-icon">{t.icon}</span>{t.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content — AI tab uses flex layout, others scroll */}
                {tab === 'ai'
                    ? <AiTab projectId={projectId} onTabSwitch={onTabSwitch || setInternalTab} />
                    : (
                        <div className="up-scroll flex-1 overflow-y-auto" style={{padding:14}}>
                            {tab==='task'       && <TaskTab       projectId={projectId}/>}
                            {tab==='photo'      && <PhotoTab/>}
                            {tab==='attendance' && <AttendanceTab projectId={projectId}/>}
                            {tab==='expense'    && <ExpenseTab    projectId={projectId}/>}
                        </div>
                    )
                }
            </div>
        </>
    );
}
