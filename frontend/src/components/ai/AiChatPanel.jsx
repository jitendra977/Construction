/**
 * AiChatPanel — साथी AI chat panel with full voice conversation.
 *
 * Voice features:
 *  - TTS: AI replies spoken aloud via Web Speech API (ne-NP / en-US)
 *  - Voice Mode: auto-listen after AI finishes speaking (hands-free)
 *  - Interim transcript: live preview of what you're saying
 *  - Language toggle: Nepali ⇄ English voice
 *  - Speaking waveform animation while AI speaks
 *  - Push-to-talk mic in normal mode
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { assistantService } from '../../services/api';

/* ── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
  .sathi-panel {
    display: flex;
    flex-direction: column;
    background: var(--t-bg);
    border: 1px solid var(--t-border);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 24px 60px rgba(0,0,0,0.3), 0 0 0 1px var(--t-border);
  }

  .sathi-messages::-webkit-scrollbar { width: 4px; }
  .sathi-messages::-webkit-scrollbar-track { background: transparent; }
  .sathi-messages::-webkit-scrollbar-thumb {
    background: var(--t-border); border-radius: 2px;
  }

  .sathi-bubble-ai {
    background: var(--t-surface);
    border: 1px solid var(--t-border);
    color: var(--t-text);
    border-radius: 4px 14px 14px 14px;
  }
  .sathi-bubble-user {
    background: var(--t-primary);
    color: #fff;
    border-radius: 14px 4px 14px 14px;
    margin-left: auto;
  }

  /* Typing dots */
  .sathi-dot { width:6px; height:6px; border-radius:50%; background:var(--t-text3); animation:sathi-bounce 1.2s infinite; }
  .sathi-dot:nth-child(2) { animation-delay:.2s; }
  .sathi-dot:nth-child(3) { animation-delay:.4s; }
  @keyframes sathi-bounce {
    0%,60%,100% { transform:translateY(0); opacity:.4; }
    30%          { transform:translateY(-4px); opacity:1; }
  }

  /* Speaking waveform bars */
  .sathi-wave-bar {
    width: 3px;
    border-radius: 3px;
    background: var(--t-primary);
    animation: sathi-wave 1s ease-in-out infinite;
  }
  .sathi-wave-bar:nth-child(1) { animation-delay: 0s;    height: 8px; }
  .sathi-wave-bar:nth-child(2) { animation-delay: 0.1s;  height: 16px; }
  .sathi-wave-bar:nth-child(3) { animation-delay: 0.2s;  height: 12px; }
  .sathi-wave-bar:nth-child(4) { animation-delay: 0.15s; height: 20px; }
  .sathi-wave-bar:nth-child(5) { animation-delay: 0.05s; height: 10px; }
  @keyframes sathi-wave {
    0%,100% { transform: scaleY(0.4); opacity: 0.5; }
    50%      { transform: scaleY(1);   opacity: 1;   }
  }

  /* Mic pulse (listening) */
  @keyframes sathi-mic-pulse {
    0%,100% { box-shadow: 0 0 0 0   color-mix(in srgb,#ef4444 35%,transparent); }
    50%      { box-shadow: 0 0 0 10px transparent; }
  }
  .sathi-mic-active { animation: sathi-mic-pulse 1.2s ease-in-out infinite; }

  /* Voice mode outer ring */
  @keyframes sathi-voice-ring {
    0%,100% { box-shadow: 0 0 0 0   color-mix(in srgb,var(--t-primary) 40%,transparent); }
    50%      { box-shadow: 0 0 0 14px transparent; }
  }
  .sathi-voice-ring { animation: sathi-voice-ring 1.6s ease-in-out infinite; }

  .sathi-input {
    background: transparent;
    color: var(--t-text);
    outline: none;
    width: 100%;
    font-size: 13px;
    resize: none;
    font-family: inherit;
    line-height: 1.5;
    caret-color: var(--t-primary);
  }
  .sathi-input::placeholder { color: var(--t-text3); }

  .sathi-quick-btn {
    background: var(--t-surface);
    border: 1px solid var(--t-border);
    color: var(--t-text2);
    border-radius: 20px;
    padding: 5px 12px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all .15s;
  }
  .sathi-quick-btn:hover {
    border-color: var(--t-primary);
    color: var(--t-primary);
    background: color-mix(in srgb, var(--t-primary) 8%, transparent);
  }

  /* Contextual suggestion chips — shown after each AI reply */
  .sathi-suggest-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    border-radius: 20px;
    border: 1px solid color-mix(in srgb, var(--t-primary) 30%, var(--t-border));
    background: color-mix(in srgb, var(--t-primary) 6%, transparent);
    color: var(--t-text2);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all .15s;
    font-family: inherit;
  }
  .sathi-suggest-chip:hover {
    border-color: var(--t-primary);
    color: var(--t-primary);
    background: color-mix(in srgb, var(--t-primary) 12%, transparent);
    transform: translateY(-1px);
    box-shadow: 0 3px 8px color-mix(in srgb, var(--t-primary) 20%, transparent);
  }
  .sathi-suggest-chip:active {
    transform: translateY(0);
  }
  @keyframes sathi-chip-in {
    from { opacity:0; transform: translateY(6px) scale(0.95); }
    to   { opacity:1; transform: translateY(0)   scale(1); }
  }
  .sathi-chip-appear {
    animation: sathi-chip-in 0.18s ease forwards;
  }

  /* Voice mode banner */
  .sathi-voice-banner {
    background: color-mix(in srgb, var(--t-primary) 10%, transparent);
    border-top: 1px solid color-mix(in srgb, var(--t-primary) 25%, transparent);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
`;

/* ── Starter prompts (shown only on first load, before any message) ──────── */
const STARTER_PROMPTS = [
    { label: '📊 बजेट स्थिति',      text: 'हालको बजेट स्थिति के छ? कुनै श्रेणी बजेट नाघेको छ?' },
    { label: '📋 खुला कामहरू',      text: 'सबै खुला कामहरू देखाउनुस् र अर्को के गर्ने?' },
    { label: '➕ काम थप्नुस्',       text: 'Foundation phase मा "Site inspection" नामक नयाँ काम थप्नुस्' },
    { label: '🏗️ Phase थप्नुस्',   text: '"Roofing" नामको नयाँ phase थप्नुस्, बजेट Rs. 200000' },
    { label: '⚠️ जोखिम जाँच',      text: 'अहिले यस परियोजनामा मुख्य जोखिमहरू के छन्?' },
    { label: '📈 लागत पूर्वानुमान', text: 'हालको खर्चको आधारमा बजेटभित्रै सकिन्छ?' },
];

/* ── Emoji prefix map for suggestion chips (Nepali + English keywords) ──── */
const SUGGESTION_EMOJI = [
    [/बजेट|budget|खर्च|spend|rs\.|लागत|cost|आवंटन/i,            '💰'],
    [/काम|task|सम्पन्न|complete|done|mark|पूरा/i,                '✅'],
    [/phase|चरण|foundation|pillar|stage/i,                        '🏗️'],
    [/खर्च.*थप|expense|paid|payment|भुक्तान/i,                   '💸'],
    [/कर्मचारी|worker|staff|team|श्रमिक|labour/i,                '👷'],
    [/सामग्री|material|stock|cement|sand|rod|स्टक/i,             '📦'],
    [/जोखिम|risk|warning|alert|नाघेको|over|सतर्क/i,             '⚠️'],
    [/पूर्वानुमान|forecast|progress|status|रिपोर्ट|report/i,     '📊'],
    [/थप्नुस्|थप्न|add|create|new|नयाँ/i,                        '➕'],
    [/देखाउनुस्|हेर्नुस्|show|list|view|जाँच/i,                  '📋'],
];

function suggestionEmoji(text) {
    for (const [re, emoji] of SUGGESTION_EMOJI) {
        if (re.test(text)) return emoji + ' ';
    }
    return '💬 ';
}

/* ── Badge configs ────────────────────────────────────────────────────────── */
const SOURCE_CONFIG = {
    groq:     { label: 'Groq · Llama 3', color: '#8b5cf6' },
    gemini:   { label: 'Gemini',         color: '#3b82f6' },
    openai:   { label: 'GPT-4o',         color: '#10b981' },
    fallback: { label: 'Rule-based',     color: '#6b7280' },
};
const INTENT_COLORS = {
    BUDGET_CHECK:  { bg:'rgba(249,115,22,.12)', text:'#f97316', label:'Budget'  },
    STOCK_CHECK:   { bg:'rgba(59,130,246,.12)', text:'#3b82f6', label:'Stock'   },
    TASK_ADD:      { bg:'rgba(16,185,129,.12)', text:'#10b981', label:'Task'    },
    TASK_COMPLETE: { bg:'rgba(16,185,129,.12)', text:'#10b981', label:'Done'    },
    EXPENSE_ADD:   { bg:'rgba(245,158,11,.12)', text:'#f59e0b', label:'Expense' },
    NEXT_STEP:     { bg:'rgba(99,102,241,.12)', text:'#6366f1', label:'Next'    },
    HELP:          { bg:'rgba(107,114,128,.1)', text:'#9ca3af', label:'Help'    },
};

/* ── Typing indicator ─────────────────────────────────────────────────────── */
function TypingIndicator() {
    return (
        <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-sm"
                style={{ background: 'linear-gradient(135deg,var(--t-primary),color-mix(in srgb,var(--t-primary) 70%,black))' }}>
                🤖
            </div>
            <div className="sathi-bubble-ai px-3 py-2.5 flex items-center gap-1.5">
                <span className="sathi-dot" /><span className="sathi-dot" /><span className="sathi-dot" />
            </div>
        </div>
    );
}

/* ── Speaking wave (shown in header / avatar area) ────────────────────────── */
function WaveIndicator() {
    return (
        <div style={{ display:'flex', alignItems:'center', gap:2, height:24 }}>
            {[0,1,2,3,4].map(i => <div key={i} className="sathi-wave-bar" />)}
        </div>
    );
}

/* ── Single message ────────────────────────────────────────────────────────── */
function Message({ msg, onSpeak, onSuggest }) {
    const isUser = msg.role === 'user';
    const src    = SOURCE_CONFIG[msg.source] || null;
    const intent = msg.intent ? INTENT_COLORS[msg.intent] : null;
    const chips  = msg.suggestions || [];

    if (isUser) {
        return (
            <div className="flex justify-end">
                <div className="sathi-bubble-user px-3 py-2 max-w-[82%]">
                    <p style={{ fontSize:13, lineHeight:1.55 }}>{msg.content}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-sm"
                style={{ background:'linear-gradient(135deg,var(--t-primary),color-mix(in srgb,var(--t-primary) 70%,black))' }}>
                🤖
            </div>
            <div className="flex flex-col gap-1.5 max-w-[88%]">
                <div className="sathi-bubble-ai px-3 py-2.5">
                    <p style={{ fontSize:13, lineHeight:1.65, whiteSpace:'pre-wrap' }}>{msg.content}</p>
                </div>

                {/* Meta badges row */}
                {(msg.actionDone || intent || src || onSpeak) && (
                    <div className="flex items-center gap-1.5 flex-wrap px-1">
                        {msg.actionDone && (
                            <span style={{
                                fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:4,
                                background:'rgba(16,185,129,.15)', color:'#10b981',
                                border:'1px solid rgba(16,185,129,.3)',
                                fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'.06em',
                            }}>✓ Done</span>
                        )}
                        {intent && (
                            <span style={{
                                fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:4,
                                background:intent.bg, color:intent.text,
                                fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'.06em',
                            }}>{intent.label}</span>
                        )}
                        {src && (
                            <span style={{
                                fontSize:9, fontWeight:600, padding:'2px 6px', borderRadius:4,
                                background:`color-mix(in srgb,${src.color} 12%,transparent)`,
                                color:src.color, fontFamily:"'DM Mono',monospace",
                            }}>{src.label}</span>
                        )}
                        {onSpeak && (
                            <button
                                onClick={() => onSpeak(msg.content)}
                                title="Read aloud"
                                style={{
                                    fontSize:10, padding:'2px 6px', borderRadius:4, cursor:'pointer',
                                    background:'transparent', border:'1px solid var(--t-border)',
                                    color:'var(--t-text3)', fontFamily:"'DM Mono',monospace",
                                    transition:'all .15s',
                                }}
                                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--t-primary)';e.currentTarget.style.color='var(--t-primary)';}}
                                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--t-border)';e.currentTarget.style.color='var(--t-text3)';}}
                            >🔊</button>
                        )}
                    </div>
                )}

                {/* ── Contextual suggestion chips ── */}
                {chips.length > 0 && onSuggest && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6, paddingLeft:2, paddingTop:2 }}>
                        {chips.map((chip, i) => (
                            <button
                                key={i}
                                className="sathi-suggest-chip sathi-chip-appear"
                                style={{ animationDelay: `${i * 0.06}s` }}
                                onClick={() => onSuggest(chip)}
                                title={chip}
                            >
                                {suggestionEmoji(chip)}{chip}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Main Panel                                                                */
/* ══════════════════════════════════════════════════════════════════════════ */
const AiChatPanel = ({ onClose, projectId = null, isDesktop = true }) => {
    const [messages,    setMessages]    = useState([{
        id:0, role:'ai', source:null, intent:null, actionDone:false,
        content:'नमस्ते! म साथी हुँ — तपाईंको AI निर्माण सहायक। 🏗️\n\nबजेट, काम, सामग्री, कर्मचारी — जे पनि सोध्नुहोस्, म नेपालीमा जवाफ दिन्छु।',
        suggestions: ['बजेट स्थिति हेर्नुस्', 'खुला कामहरू देखाउनुस्', 'परियोजना जोखिम जाँच्नुस्'],
    }]);
    const [input,          setInput]          = useState('');
    const [busy,           setBusy]           = useState(false);
    const [listening,      setListening]      = useState(false);
    const [speaking,       setSpeaking]       = useState(false);
    const [voiceMode,      setVoiceMode]      = useState(false);
    const [interim,        setInterim]        = useState('');
    const [lang,           setLang]           = useState('ne');
    const [ttsEnabled,     setTtsEnabled]     = useState(true);
    const [showStarter,    setShowStarter]    = useState(true);  // starter prompts before first send

    const bottomRef       = useRef(null);
    const inputRef        = useRef(null);
    const recognRef       = useRef(null);
    const historyRef      = useRef([]);
    const voiceModeRef    = useRef(false);
    const busyRef         = useRef(false);
    const voicesRef       = useRef([]);   // pre-loaded TTS voices
    const sendMessageRef  = useRef(null); // forward ref so startListening can call sendMessage

    // keep refs in sync
    useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
    useEffect(() => { busyRef.current = busy; }, [busy]);

    const supportsSpeech = typeof window !== 'undefined' &&
        !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const supportsTTS = typeof window !== 'undefined' && !!window.speechSynthesis;

    /* ── Pre-load voices (async on first load) ── */
    useEffect(() => {
        if (!supportsTTS) return;
        const load = () => {
            const v = window.speechSynthesis.getVoices();
            voicesRef.current = v;
            if (v.length) {
                const ne = v.filter(x => x.lang.startsWith('ne') || x.lang.startsWith('hi'));
                console.log('[साथी TTS] Available voices:', v.length,
                    '| Nepali/Hindi:', ne.map(x => `${x.name} (${x.lang})`).join(', ') || 'none');
            }
        };
        load();
        window.speechSynthesis.addEventListener('voiceschanged', load);
        return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
    }, [supportsTTS]);

    /* ── Scroll to bottom ── */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior:'smooth' });
    }, [messages, busy, interim]);

    /* ── Cleanup on unmount ── */
    useEffect(() => () => {
        recognRef.current?.stop?.();
        window.speechSynthesis?.cancel?.();
    }, []);

    /* ── Pick best available voice for Nepali / Hindi / English ── */
    const pickVoice = useCallback((wantDevanagari) => {
        const voices = voicesRef.current;
        if (!voices.length) return null;

        if (wantDevanagari) {
            // Priority: ne-NP → ne → hi-IN → hi → any Hindi/Nepali name → en-IN → first voice
            const v =
                voices.find(v => v.lang === 'ne-NP') ||
                voices.find(v => v.lang === 'ne') ||
                voices.find(v => v.lang === 'hi-IN') ||
                voices.find(v => v.lang.startsWith('hi')) ||
                voices.find(v => /hindi|nepali|lekha/i.test(v.name)) ||
                voices.find(v => v.lang === 'en-IN') ||   // Indian English reads Devanagari better
                voices.find(v => v.lang.startsWith('en')) ||
                voices[0];
            console.log('[साथी TTS] Picked voice:', v?.name, v?.lang);
            return v;
        }

        // English
        return (
            voices.find(v => v.lang === 'en-IN') ||
            voices.find(v => v.lang === 'en-US') ||
            voices.find(v => v.lang.startsWith('en')) ||
            voices[0]
        );
    }, []);

    /* ── TTS ───────────────────────────────────────────────────────────────── */
    const speakText = useCallback((text, onEnd) => {
        if (!supportsTTS || !ttsEnabled) { onEnd?.(); return; }
        window.speechSynthesis.cancel();

        // Strip emojis / symbols that don't read well
        const clean = text
            .replace(/[✅⚠️🤖📊📋➕🏗️📈🔊✓]/g, '')
            .replace(/\n+/g, '। ')
            .replace(/\s{2,}/g, ' ')
            .trim();
        if (!clean) { onEnd?.(); return; }

        const utter = new SpeechSynthesisUtterance(clean);
        // Detect Devanagari script in text
        const hasDevanagari = /[ऀ-ॿ]/.test(text);
        const wantDevanagari = hasDevanagari && lang === 'ne';

        const voice = pickVoice(wantDevanagari);
        if (voice) {
            utter.voice = voice;
            utter.lang  = voice.lang;
        } else {
            utter.lang = wantDevanagari ? 'hi-IN' : 'en-US';
        }
        console.log('[साथी TTS] Speaking | lang:', utter.lang, '| voice:', utter.voice?.name || 'default');

        utter.rate   = wantDevanagari ? 0.85 : 0.92;  // slightly slower for Nepali clarity
        utter.pitch  = 1.05;
        utter.volume = 1.0;

        utter.onstart = () => setSpeaking(true);
        utter.onend   = () => { setSpeaking(false); onEnd?.(); };
        utter.onerror = (e) => {
            console.warn('TTS error:', e.error);
            setSpeaking(false);
            onEnd?.();
        };

        window.speechSynthesis.speak(utter);
    }, [supportsTTS, ttsEnabled, lang, pickVoice]);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis?.cancel?.();
        setSpeaking(false);
    }, []);

    /* ── Start listening (STT) ─────────────────────────────────────────────── */
    const startListening = useCallback(() => {
        if (!supportsSpeech || busyRef.current) return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.lang            = lang === 'ne' ? 'ne-NP' : 'en-US';
        rec.continuous      = false;
        rec.interimResults  = true;

        rec.onstart  = () => setListening(true);
        rec.onend    = () => { setListening(false); setInterim(''); };
        rec.onerror  = () => { setListening(false); setInterim(''); };

        rec.onresult = (e) => {
            let finalText = '';
            let interimText = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) finalText += t;
                else interimText += t;
            }
            setInterim(interimText);
            if (finalText.trim()) {
                setInterim('');
                sendMessageRef.current?.(finalText.trim());
            }
        };

        rec.start();
        recognRef.current = rec;
    }, [supportsSpeech, lang]); // eslint-disable-line

    const stopListening = useCallback(() => {
        recognRef.current?.stop?.();
        setListening(false);
        setInterim('');
    }, []);

    const toggleMic = useCallback(() => {
        if (listening) stopListening();
        else startListening();
    }, [listening, startListening, stopListening]);

    /* ── Toggle voice conversation mode ───────────────────────────────────── */
    const toggleVoiceMode = useCallback(() => {
        const entering = !voiceMode;
        setVoiceMode(entering);
        if (!entering) {
            stopListening();
            stopSpeaking();
        }
    }, [voiceMode, stopListening, stopSpeaking]);

    /* ── Send message ─────────────────────────────────────────────────────── */
    const sendMessage = useCallback(async (text) => {
        const msg = (text || '').trim();
        if (!msg || busyRef.current) return;

        setShowStarter(false);
        setInput('');
        stopListening();

        const userMsg = { id:Date.now(), role:'user', content:msg, source:null, intent:null, actionDone:false, suggestions:[] };
        // Clear suggestions from all previous messages when user sends
        setMessages(m => [...m.map(x => ({ ...x, suggestions: [] })), userMsg]);
        historyRef.current = [...historyRef.current, { role:'user', content:msg }].slice(-20);

        setBusy(true);
        try {
            const { data } = await assistantService.chat(msg, historyRef.current, projectId);
            const reply      = data.message || 'No response received.';
            const actionDone = reply.includes('✅');
            const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
            historyRef.current = [...historyRef.current, { role:'assistant', content:reply }].slice(-20);

            setMessages(m => [...m, {
                id: Date.now()+1, role:'ai',
                content:reply, source:data.source||'fallback',
                intent:data.intent||null, actionDone,
                suggestions,
            }]);
            setBusy(false);

            // TTS + optional auto-listen
            if (ttsEnabled || voiceModeRef.current) {
                speakText(reply, () => {
                    if (voiceModeRef.current) {
                        setTimeout(() => startListening(), 600);
                    }
                });
            }
        } catch {
            setMessages(m => [...m, {
                id:Date.now()+1, role:'ai', source:'fallback', intent:null, actionDone:false,
                content:'⚠️ Connection error. Please check the backend is running and try again.',
            }]);
            setBusy(false);
        }

        setTimeout(() => inputRef.current?.focus(), 80);
    }, [projectId, speakText, startListening, stopListening, ttsEnabled]);

    // Keep the forward ref up-to-date so startListening can call sendMessage
    // (must be in useEffect — refs cannot be assigned during render)
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
    };

    /* ── Panel size ───────────────────────────────────────────────────────── */
    const panelStyle = isDesktop
        ? { width:420, height:'85vh', maxHeight:720 }
        : { width:'100%', height:'100%' };

    /* ══════════════════════════════════════════════════════════════════════ */
    return (
        <>
            <style>{CSS}</style>
            <div className="sathi-panel" style={panelStyle}>

                {/* ── Header ─────────────────────────────────────────────────── */}
                <div style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'12px 14px',
                    borderBottom:'1px solid var(--t-border)',
                    background:'var(--t-surface)',
                    flexShrink:0,
                }}>
                    {/* Avatar / speaking wave */}
                    <div style={{
                        width:36, height:36, borderRadius:10, flexShrink:0,
                        background:'linear-gradient(135deg,var(--t-primary),color-mix(in srgb,var(--t-primary) 70%,black))',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:17,
                        boxShadow:'0 3px 10px color-mix(in srgb,var(--t-primary) 30%,transparent)',
                    }}>
                        {speaking ? <WaveIndicator /> : '🤖'}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <p style={{ fontSize:14, fontWeight:900, color:'var(--t-text)', lineHeight:1 }}>साथी AI</p>
                            {speaking && (
                                <span style={{
                                    fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4,
                                    background:'color-mix(in srgb,var(--t-primary) 15%,transparent)',
                                    color:'var(--t-primary)', fontFamily:"'DM Mono',monospace",
                                    textTransform:'uppercase', letterSpacing:'.06em',
                                }}>Speaking…</span>
                            )}
                            {listening && !speaking && (
                                <span style={{
                                    fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4,
                                    background:'rgba(239,68,68,.12)', color:'#ef4444',
                                    fontFamily:"'DM Mono',monospace",
                                    textTransform:'uppercase', letterSpacing:'.06em',
                                }}>Listening…</span>
                            )}
                        </div>
                        <p style={{
                            fontSize:9, color:'var(--t-primary)', fontWeight:700,
                            textTransform:'uppercase', letterSpacing:'.1em',
                            fontFamily:"'DM Mono',monospace", marginTop:2,
                        }}>Construction Assistant</p>
                    </div>

                    {/* Controls row */}
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>

                        {/* Language toggle */}
                        {supportsSpeech && (
                            <button
                                onClick={() => setLang(l => l === 'ne' ? 'en' : 'ne')}
                                title={`Switch to ${lang === 'ne' ? 'English' : 'Nepali'} voice`}
                                style={{
                                    fontSize:9, fontWeight:800, padding:'3px 7px', borderRadius:6,
                                    background:'var(--t-surface2)', border:'1px solid var(--t-border)',
                                    color:'var(--t-text2)', cursor:'pointer',
                                    fontFamily:"'DM Mono',monospace", letterSpacing:'.04em',
                                    transition:'all .15s',
                                }}
                            >{lang === 'ne' ? 'NE' : 'EN'}</button>
                        )}

                        {/* TTS toggle */}
                        {supportsTTS && (
                            <button
                                onClick={() => { setTtsEnabled(v => !v); stopSpeaking(); }}
                                title={ttsEnabled ? 'Mute AI voice' : 'Unmute AI voice'}
                                style={{
                                    width:28, height:28, borderRadius:7, flexShrink:0,
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    background: ttsEnabled
                                        ? 'color-mix(in srgb,var(--t-primary) 12%,transparent)'
                                        : 'var(--t-surface2)',
                                    border:`1px solid ${ttsEnabled ? 'color-mix(in srgb,var(--t-primary) 30%,transparent)' : 'var(--t-border)'}`,
                                    color: ttsEnabled ? 'var(--t-primary)' : 'var(--t-text3)',
                                    cursor:'pointer', fontSize:13,
                                    transition:'all .15s',
                                }}
                            >{ttsEnabled ? '🔊' : '🔇'}</button>
                        )}

                        {/* Voice mode toggle */}
                        {supportsSpeech && (
                            <button
                                onClick={toggleVoiceMode}
                                title={voiceMode ? 'Exit voice conversation' : 'Start voice conversation'}
                                className={voiceMode && !speaking && !listening ? 'sathi-voice-ring' : ''}
                                style={{
                                    width:28, height:28, borderRadius:7, flexShrink:0,
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    background: voiceMode
                                        ? 'color-mix(in srgb,var(--t-primary) 18%,transparent)'
                                        : 'var(--t-surface2)',
                                    border:`1px solid ${voiceMode ? 'var(--t-primary)' : 'var(--t-border)'}`,
                                    color: voiceMode ? 'var(--t-primary)' : 'var(--t-text3)',
                                    cursor:'pointer', fontSize:14,
                                    transition:'all .15s',
                                }}
                            >🎙️</button>
                        )}

                        {/* Online dot */}
                        <span style={{
                            width:7, height:7, borderRadius:'50%', background:'#10b981',
                            boxShadow:'0 0 0 2px rgba(16,185,129,.25)',
                        }} />

                        {/* Close */}
                        {onClose && (
                            <button
                                onClick={onClose}
                                style={{
                                    width:28, height:28, borderRadius:8,
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    background:'var(--t-surface2)', border:'1px solid var(--t-border)',
                                    color:'var(--t-text3)', cursor:'pointer', fontSize:13,
                                    transition:'all .15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.color='var(--t-danger)'}
                                onMouseLeave={e => e.currentTarget.style.color='var(--t-text3)'}
                            >✕</button>
                        )}
                    </div>
                </div>

                {/* ── Messages ────────────────────────────────────────────────── */}
                <div className="sathi-messages flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    {messages.map(msg => (
                        <Message
                            key={msg.id}
                            msg={msg}
                            onSpeak={supportsTTS ? speakText : null}
                            onSuggest={sendMessage}
                        />
                    ))}
                    {busy && <TypingIndicator />}

                    {/* Interim transcript */}
                    {interim && (
                        <div className="flex justify-end">
                            <div style={{
                                background:'color-mix(in srgb,var(--t-primary) 10%,transparent)',
                                border:'1px dashed color-mix(in srgb,var(--t-primary) 30%,transparent)',
                                borderRadius:'14px 4px 14px 14px',
                                padding:'6px 12px', maxWidth:'80%',
                                color:'var(--t-text2)', fontSize:13, fontStyle:'italic',
                            }}>
                                {interim}…
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* ── Starter prompts (only before first send) ─────────────────── */}
                {showStarter && !busy && !voiceMode && (
                    <div style={{
                        padding:'0 12px 10px',
                        borderTop:'1px solid var(--t-border)',
                        flexShrink:0,
                    }}>
                        <p style={{
                            fontSize:9, color:'var(--t-text3)', fontWeight:700,
                            textTransform:'uppercase', letterSpacing:'.1em',
                            padding:'8px 2px 6px', fontFamily:"'DM Mono',monospace",
                        }}>Quick Start</p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                            {STARTER_PROMPTS.map(q => (
                                <button key={q.label} className="sathi-quick-btn" onClick={() => sendMessage(q.text)}>
                                    {q.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Voice conversation mode UI ───────────────────────────────── */}
                {voiceMode && (
                    <div className="sathi-voice-banner" style={{ flexShrink:0 }}>
                        {/* Status label */}
                        <p style={{
                            fontSize:10, fontWeight:800, letterSpacing:'.1em',
                            textTransform:'uppercase', fontFamily:"'DM Mono',monospace",
                            color: listening ? '#ef4444' : speaking ? 'var(--t-primary)' : 'var(--t-text3)',
                        }}>
                            {listening ? '🎤 Listening…' : speaking ? '🔊 Speaking…' : busy ? '⏳ Thinking…' : '💬 Voice Mode — tap mic or speak'}
                        </p>

                        {/* Big mic button */}
                        <button
                            onClick={listening ? stopListening : startListening}
                            disabled={busy || speaking}
                            className={listening ? 'sathi-mic-active' : ''}
                            style={{
                                width:64, height:64, borderRadius:'50%',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:26,
                                background: listening
                                    ? '#ef4444'
                                    : speaking
                                        ? 'color-mix(in srgb,var(--t-primary) 20%,transparent)'
                                        : 'var(--t-surface)',
                                border: `2px solid ${listening ? '#ef4444' : 'color-mix(in srgb,var(--t-primary) 30%,transparent)'}`,
                                cursor: (busy || speaking) ? 'default' : 'pointer',
                                opacity: (busy || speaking) ? 0.5 : 1,
                                transition:'all .2s',
                            }}
                        >
                            {listening ? '⏹' : speaking ? <WaveIndicator /> : '🎤'}
                        </button>

                        {/* Exit voice mode */}
                        <button
                            onClick={toggleVoiceMode}
                            style={{
                                fontSize:10, fontWeight:700, padding:'4px 12px', borderRadius:8,
                                background:'transparent', border:'1px solid var(--t-border)',
                                color:'var(--t-text3)', cursor:'pointer',
                                fontFamily:"'DM Mono',monospace", letterSpacing:'.04em',
                            }}
                        >Exit Voice Mode</button>
                    </div>
                )}

                {/* ── Text input bar (hidden in voice mode) ───────────────────── */}
                {!voiceMode && (
                    <div style={{
                        padding:'10px 12px',
                        borderTop:'1px solid var(--t-border)',
                        background:'var(--t-surface)',
                        flexShrink:0,
                    }}>
                        <div style={{
                            display:'flex', alignItems:'flex-end', gap:8,
                            background:'var(--t-bg)',
                            border:'1px solid var(--t-border)',
                            borderRadius:12, padding:'8px 10px',
                        }}>
                            <textarea
                                ref={inputRef}
                                className="sathi-input"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKey}
                                placeholder="बजेट, काम, सामग्री बारे सोध्नुस्… (Enter थिच्नुस्)"
                                rows={1}
                                style={{ maxHeight:100, overflowY:'auto' }}
                            />

                            {/* Mic button */}
                            {supportsSpeech && (
                                <button
                                    onClick={toggleMic}
                                    title={listening ? 'Stop' : `Speak in ${lang === 'ne' ? 'Nepali' : 'English'}`}
                                    className={listening ? 'sathi-mic-active' : ''}
                                    style={{
                                        width:32, height:32, borderRadius:8, flexShrink:0,
                                        display:'flex', alignItems:'center', justifyContent:'center',
                                        background: listening ? '#ef4444' : 'var(--t-surface2)',
                                        border:'1px solid var(--t-border)',
                                        color: listening ? '#fff' : 'var(--t-text3)',
                                        cursor:'pointer', fontSize:14, transition:'all .15s',
                                    }}
                                >{listening ? '⏹' : '🎤'}</button>
                            )}

                            {/* Stop speaking */}
                            {speaking && (
                                <button
                                    onClick={stopSpeaking}
                                    title="Stop speaking"
                                    style={{
                                        width:32, height:32, borderRadius:8, flexShrink:0,
                                        display:'flex', alignItems:'center', justifyContent:'center',
                                        background:'color-mix(in srgb,var(--t-primary) 12%,transparent)',
                                        border:'1px solid color-mix(in srgb,var(--t-primary) 30%,transparent)',
                                        color:'var(--t-primary)',
                                        cursor:'pointer', fontSize:13, transition:'all .15s',
                                    }}
                                >🔇</button>
                            )}

                            {/* Send */}
                            <button
                                onClick={() => sendMessage(input)}
                                disabled={!input.trim() || busy}
                                style={{
                                    width:32, height:32, borderRadius:8, flexShrink:0,
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    background:(input.trim()&&!busy) ? 'var(--t-primary)' : 'var(--t-surface2)',
                                    border:'none',
                                    color:(input.trim()&&!busy) ? '#fff' : 'var(--t-text3)',
                                    cursor:(input.trim()&&!busy) ? 'pointer' : 'default',
                                    transition:'all .15s',
                                }}
                            >
                                {busy ? (
                                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/>
                                    </svg>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                            </button>
                        </div>

                        <p style={{
                            fontSize:9, color:'var(--t-text3)', textAlign:'center',
                            marginTop:6, fontFamily:"'DM Mono',monospace",
                        }}>
                            {supportsSpeech ? `🎤 ${lang==='ne'?'नेपाली':'अंग्रेजी'} आवाज · ` : ''}
                            Groq द्वारा संचालित (निःशुल्क)
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};

export default AiChatPanel;
