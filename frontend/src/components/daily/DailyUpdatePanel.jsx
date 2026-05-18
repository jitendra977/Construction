/**
 * DailyUpdatePanel — Quick daily work log.
 *
 * Four tabs, all tap-friendly for fieldworkers on mobile:
 *   📋 काम    — pick task → add note → set progress %
 *   📷 फोटो   — camera / file → instant preview → upload
 *   👷 हाजिरी  — tap workers present/absent → bulk submit
 *   💰 खर्च   — title + amount + phase → log expense
 *
 * APIs used:
 *   GET  /api/v1/tasks/             → active tasks
 *   POST /api/v1/updates/           → task progress note
 *   POST /api/v1/task-media/        → photo upload (multipart)
 *   GET  /api/v1/attendance/workers/
 *   POST /api/v1/attendance/records/bulk/
 *   GET  /api/v1/phases/            → phase list for expense
 *   POST /api/v1/finance/expenses/  → quick expense (DEPRECATED — Phase 3: migrate to /fin/bills/)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { constructionService } from '../../services/constructionService';
import { attendanceService }   from '../../services/attendanceService';
import api                     from '../../services/client';

/* ── helpers ─────────────────────────────────────────────────────────────── */
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

/* ── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
  .dup-panel {
    display: flex; flex-direction: column;
    background: var(--t-bg);
    border: 1px solid var(--t-border);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 28px 70px rgba(0,0,0,.35);
  }
  .dup-tab-btn {
    flex: 1; padding: 10px 4px; border: none; cursor: pointer;
    font-size: 10px; font-weight: 800; letter-spacing:.04em;
    font-family:'DM Mono',monospace; text-transform:uppercase;
    background: transparent; color: var(--t-text3);
    border-bottom: 2px solid transparent;
    transition: all .15s;
  }
  .dup-tab-btn.active {
    color: var(--t-primary);
    border-bottom-color: var(--t-primary);
    background: color-mix(in srgb, var(--t-primary) 6%, transparent);
  }
  .dup-tab-btn:hover:not(.active) { color: var(--t-text2); }

  /* Fields */
  .dup-select, .dup-input, .dup-textarea {
    width: 100%; background: var(--t-surface);
    border: 1px solid var(--t-border); border-radius: 10px;
    color: var(--t-text); padding: 10px 12px;
    font-size: 13px; font-family: inherit; outline: none;
    transition: border-color .15s;
  }
  .dup-select:focus, .dup-input:focus, .dup-textarea:focus {
    border-color: var(--t-primary);
  }
  .dup-select option { background: var(--t-surface); }
  .dup-textarea { resize: none; line-height: 1.55; }

  /* Progress slider */
  .dup-slider {
    width: 100%; accent-color: var(--t-primary);
    height: 6px; cursor: pointer;
  }

  /* Photo thumbnails */
  .dup-thumb {
    width: 72px; height: 72px; border-radius: 10px;
    object-fit: cover; border: 2px solid var(--t-border);
    flex-shrink: 0;
  }
  .dup-photo-drop {
    border: 2px dashed var(--t-border); border-radius: 12px;
    padding: 24px; text-align: center; cursor: pointer;
    transition: all .15s;
    background: var(--t-surface);
  }
  .dup-photo-drop:hover, .dup-photo-drop.dragover {
    border-color: var(--t-primary);
    background: color-mix(in srgb, var(--t-primary) 6%, transparent);
  }

  /* Worker chips */
  .dup-worker-chip {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px; border-radius: 12px;
    border: 1.5px solid var(--t-border);
    cursor: pointer; transition: all .15s;
    background: var(--t-surface);
  }
  .dup-worker-chip.present {
    border-color: #10b981;
    background: rgba(16,185,129,.08);
  }
  .dup-worker-chip.absent {
    border-color: #ef4444;
    background: rgba(239,68,68,.07);
  }
  .dup-worker-chip.half {
    border-color: #f59e0b;
    background: rgba(245,158,11,.08);
  }

  /* Submit button */
  .dup-submit {
    width: 100%; padding: 13px; border: none; border-radius: 12px;
    font-size: 14px; font-weight: 800; cursor: pointer;
    background: var(--t-primary); color: #fff;
    transition: all .15s; letter-spacing:.02em;
  }
  .dup-submit:hover:not(:disabled) {
    filter: brightness(1.08);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px color-mix(in srgb, var(--t-primary) 35%, transparent);
  }
  .dup-submit:disabled { opacity:.5; cursor:default; transform:none; }

  /* Success flash */
  @keyframes dup-success {
    0%   { background: rgba(16,185,129,.2); }
    100% { background: transparent; }
  }
  .dup-success-flash { animation: dup-success 1s ease forwards; }

  /* Scroll area */
  .dup-scroll::-webkit-scrollbar { width: 3px; }
  .dup-scroll::-webkit-scrollbar-thumb { background: var(--t-border); border-radius: 2px; }
`;

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Tab 1 — काम (Task Progress)                                               */
/* ══════════════════════════════════════════════════════════════════════════ */
function TaskTab({ projectId }) {
    const [tasks,    setTasks]    = useState([]);
    const [taskId,   setTaskId]   = useState('');
    const [note,     setNote]     = useState('');
    const [progress, setProgress] = useState(50);
    const [saving,   setSaving]   = useState(false);
    const [done,     setDone]     = useState(false);

    useEffect(() => {
        constructionService.getTasks()
            .then(data => {
                const active = (Array.isArray(data) ? data : data.results || [])
                    .filter(t => t.status !== 'COMPLETED');
                setTasks(active);
                if (active.length) setTaskId(String(active[0].id));
            })
            .catch(() => {});
    }, []);

    const submit = async () => {
        if (!taskId || !note.trim()) return;
        setSaving(true);
        try {
            await api.post('/updates/', {
                task: Number(taskId),
                note: note.trim(),
                progress_percentage: progress,
            });
            setNote(''); setDone(true);
            setTimeout(() => setDone(false), 2000);
        } catch (e) {
            alert('सेभ गर्न सकिएन। फेरि प्रयास गर्नुस्।');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Task picker */}
            <div>
                <label style={lbl}>📋 कुन काम?</label>
                <select className="dup-select" value={taskId} onChange={e => setTaskId(e.target.value)}>
                    {tasks.length === 0 && <option value="">लोड हुँदैछ…</option>}
                    {tasks.map(t => (
                        <option key={t.id} value={t.id}>
                            [{t.status}] {t.title}
                        </option>
                    ))}
                </select>
            </div>

            {/* Note */}
            <div>
                <label style={lbl}>📝 आजको काम (नोट)</label>
                <textarea
                    className="dup-textarea"
                    rows={3}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="आज के काम भयो? जस्तै: Foundation को खुट्टा राखियो, ३ जना मजदुर काममा थिए…"
                />
            </div>

            {/* Progress */}
            <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <label style={lbl}>📊 प्रगति</label>
                    <span style={{ fontSize:13, fontWeight:800, color:'var(--t-primary)' }}>{progress}%</span>
                </div>
                <input
                    type="range" min={0} max={100} step={5}
                    value={progress} onChange={e => setProgress(Number(e.target.value))}
                    className="dup-slider"
                />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'var(--t-text3)', marginTop:3 }}>
                    <span>सुरु भएको छैन</span><span>आधा</span><span>सकियो ✅</span>
                </div>
            </div>

            <button
                className={`dup-submit${done?' dup-success-flash':''}`}
                onClick={submit} disabled={saving || !taskId || !note.trim()}
            >
                {done ? '✅ सेभ भयो!' : saving ? 'सेभ हुँदैछ…' : '💾 अपडेट सेभ गर्नुस्'}
            </button>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Tab 2 — फोटो (Photo Upload)                                               */
/* ══════════════════════════════════════════════════════════════════════════ */
function PhotoTab({ projectId }) {
    const [tasks,    setTasks]    = useState([]);
    const [taskId,   setTaskId]   = useState('');
    const [files,    setFiles]    = useState([]);   // {file, preview, desc, status}
    const [dragOver, setDragOver] = useState(false);
    const [uploading,setUploading]= useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        constructionService.getTasks()
            .then(d => {
                const all = Array.isArray(d) ? d : d.results || [];
                setTasks(all);
                if (all.length) setTaskId(String(all[0].id));
            }).catch(() => {});
    }, []);

    const addFiles = (rawFiles) => {
        const newEntries = Array.from(rawFiles)
            .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
            .map(f => ({
                file: f,
                preview: URL.createObjectURL(f),
                desc: '',
                status: 'pending',   // pending | uploading | done | error
            }));
        setFiles(prev => [...prev, ...newEntries]);
    };

    const removeFile = (i) => {
        setFiles(prev => {
            URL.revokeObjectURL(prev[i].preview);
            return prev.filter((_, idx) => idx !== i);
        });
    };

    const upload = async () => {
        if (!files.length || !taskId) return;
        setUploading(true);
        const pending = files.filter(f => f.status === 'pending');
        let success = 0;

        for (let i = 0; i < pending.length; i++) {
            const entry = pending[i];
            setFiles(prev => prev.map(f => f.preview === entry.preview ? { ...f, status:'uploading' } : f));

            const fd = new FormData();
            fd.append('task', taskId);
            fd.append('file', entry.file);
            fd.append('media_type', entry.file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE');
            fd.append('description', entry.desc || '');

            try {
                await constructionService.uploadTaskMedia(fd);
                setFiles(prev => prev.map(f => f.preview === entry.preview ? { ...f, status:'done' } : f));
                success++;
            } catch {
                setFiles(prev => prev.map(f => f.preview === entry.preview ? { ...f, status:'error' } : f));
            }
        }

        setUploading(false);
        if (success > 0) {
            setTimeout(() => setFiles(prev => prev.filter(f => f.status !== 'done')), 1500);
        }
    };

    const pendingCount = files.filter(f => f.status === 'pending').length;

    return (
        <div className="flex flex-col gap-4">
            {/* Task selector */}
            <div>
                <label style={lbl}>📋 कुन कामको फोटो?</label>
                <select className="dup-select" value={taskId} onChange={e => setTaskId(e.target.value)}>
                    {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
            </div>

            {/* Drop zone */}
            <div
                className={`dup-photo-drop${dragOver?' dragover':''}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            >
                <input
                    ref={inputRef} type="file" hidden
                    accept="image/*,video/*" multiple capture="environment"
                    onChange={e => addFiles(e.target.files)}
                />
                <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--t-text2)' }}>
                    फोटो छान्नुस् वा क्यामेरा खोल्नुस्
                </p>
                <p style={{ fontSize:11, color:'var(--t-text3)', marginTop:4 }}>
                    थिच्नुस् वा तान्नुस् (drag & drop)
                </p>
            </div>

            {/* Thumbnails */}
            {files.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {files.map((f, i) => (
                        <div key={i} style={{ position:'relative' }}>
                            <img src={f.preview} alt="" className="dup-thumb"
                                style={{
                                    opacity: f.status === 'uploading' ? 0.5 : 1,
                                    borderColor: f.status === 'done' ? '#10b981' : f.status === 'error' ? '#ef4444' : 'var(--t-border)',
                                }}
                            />
                            {/* Status overlay */}
                            {f.status === 'uploading' && (
                                <div style={{
                                    position:'absolute', inset:0, borderRadius:10,
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    background:'rgba(0,0,0,.4)', fontSize:18,
                                }}>⏳</div>
                            )}
                            {f.status === 'done' && (
                                <div style={{
                                    position:'absolute', inset:0, borderRadius:10,
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    background:'rgba(16,185,129,.3)', fontSize:20,
                                }}>✅</div>
                            )}
                            {f.status === 'error' && (
                                <div style={{
                                    position:'absolute', inset:0, borderRadius:10,
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    background:'rgba(239,68,68,.3)', fontSize:20,
                                }}>❌</div>
                            )}
                            {/* Remove button */}
                            {f.status === 'pending' && (
                                <button
                                    onClick={() => removeFile(i)}
                                    style={{
                                        position:'absolute', top:-6, right:-6,
                                        width:18, height:18, borderRadius:'50%',
                                        background:'#ef4444', color:'#fff',
                                        border:'none', cursor:'pointer', fontSize:10,
                                        display:'flex', alignItems:'center', justifyContent:'center',
                                    }}
                                >✕</button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <button
                className="dup-submit"
                onClick={upload}
                disabled={uploading || pendingCount === 0 || !taskId}
            >
                {uploading
                    ? 'अपलोड हुँदैछ…'
                    : pendingCount > 0
                        ? `📤 ${pendingCount} फोटो अपलोड गर्नुस्`
                        : 'फोटो छान्नुस्'}
            </button>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Tab 3 — हाजिरी (Attendance)                                               */
/* ══════════════════════════════════════════════════════════════════════════ */
const STATUS_CYCLE = ['PRESENT', 'HALF_DAY', 'ABSENT'];
const STATUS_LABEL = { PRESENT:'✅ हाजिर', HALF_DAY:'🌗 आधा', ABSENT:'❌ गैरहाजिर' };
const STATUS_CLASS = { PRESENT:'present', HALF_DAY:'half', ABSENT:'absent' };

function AttendanceTab({ projectId }) {
    const [workers,  setWorkers]  = useState([]);
    const [statuses, setStatuses] = useState({});  // { workerId: 'PRESENT'|... }
    const [loading,  setLoading]  = useState(true);
    const [saving,   setSaving]   = useState(false);
    const [done,     setDone]     = useState(false);

    useEffect(() => {
        attendanceService.getWorkers({ is_active: true })
            .then(data => {
                const list = Array.isArray(data) ? data : data.results || [];
                setWorkers(list);
                // Default all to PRESENT
                const init = {};
                list.forEach(w => { init[w.id] = 'PRESENT'; });
                setStatuses(init);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const cycle = (id) => {
        setStatuses(prev => {
            const cur = prev[id] || 'PRESENT';
            const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
            return { ...prev, [id]: next };
        });
    };

    const markAll = (status) => {
        const s = {};
        workers.forEach(w => { s[w.id] = status; });
        setStatuses(s);
    };

    const submit = async () => {
        if (!workers.length) return;
        setSaving(true);
        try {
            const records = workers.map(w => ({
                worker: w.id,
                date: today(),
                status: statuses[w.id] || 'PRESENT',
                ...(projectId ? { project: projectId } : {}),
            }));
            await attendanceService.bulkMark({ records });
            setDone(true);
            setTimeout(() => setDone(false), 2500);
        } catch (e) {
            alert('हाजिरी सेभ गर्न सकिएन। फेरि प्रयास गर्नुस्।');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p style={{ textAlign:'center', color:'var(--t-text3)', padding:24 }}>लोड हुँदैछ…</p>;
    if (!workers.length) return (
        <p style={{ textAlign:'center', color:'var(--t-text3)', padding:24 }}>
            कोही कर्मचारी छैनन्।<br/>
            <span style={{ fontSize:11 }}>पहिले Attendance &gt; Workers मा थप्नुस्।</span>
        </p>
    );

    const presentCount = Object.values(statuses).filter(s => s === 'PRESENT').length;

    return (
        <div className="flex flex-col gap-3">
            {/* Quick mark all */}
            <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => markAll('PRESENT')} style={quickBtn('#10b981')}>✅ सबै हाजिर</button>
                <button onClick={() => markAll('ABSENT')}  style={quickBtn('#ef4444')}>❌ सबै गैरहाजिर</button>
            </div>

            {/* Worker list */}
            <div className="flex flex-col gap-2" style={{ maxHeight:280, overflowY:'auto' }}>
                {workers.map(w => (
                    <div
                        key={w.id}
                        className={`dup-worker-chip ${STATUS_CLASS[statuses[w.id]||'PRESENT']}`}
                        onClick={() => cycle(w.id)}
                    >
                        <div style={{
                            width:36, height:36, borderRadius:10, flexShrink:0,
                            background:'var(--t-surface2)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:18,
                        }}>👷</div>
                        <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontWeight:700, fontSize:13, color:'var(--t-text)' }}>{w.name}</p>
                            <p style={{ fontSize:10, color:'var(--t-text3)' }}>{w.trade || 'Worker'} · Rs.{fmt(w.daily_rate)}/दिन</p>
                        </div>
                        <span style={{ fontSize:11, fontWeight:700 }}>
                            {STATUS_LABEL[statuses[w.id] || 'PRESENT']}
                        </span>
                    </div>
                ))}
            </div>

            <p style={{ fontSize:11, color:'var(--t-text3)', textAlign:'center' }}>
                {presentCount}/{workers.length} हाजिर · थिचेर बदल्नुस् (हाजिर → आधा → गैरहाजिर)
            </p>

            <button
                className={`dup-submit${done?' dup-success-flash':''}`}
                onClick={submit} disabled={saving}
            >
                {done ? '✅ हाजिरी सेभ भयो!' : saving ? 'सेभ हुँदैछ…' : `💾 हाजिरी सेभ गर्नुस् (${today()})`}
            </button>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Tab 4 — खर्च (Quick Expense)                                              */
/* ══════════════════════════════════════════════════════════════════════════ */
const EXPENSE_TYPES = [
    { value:'MATERIAL', label:'🧱 सामग्री' },
    { value:'LABOR',    label:'👷 ज्याला' },
    { value:'FEES',     label:'📄 दस्तुर' },
    { value:'GOVT',     label:'🏛️ सरकारी' },
    { value:'OTHER',    label:'💼 अन्य' },
];

function ExpenseTab({ projectId }) {
    const [phases,  setPhases]  = useState([]);
    const [title,   setTitle]   = useState('');
    const [amount,  setAmount]  = useState('');
    const [type,    setType]    = useState('OTHER');
    const [phaseId, setPhaseId] = useState('');
    const [paidTo,  setPaidTo]  = useState('');
    const [saving,  setSaving]  = useState(false);
    const [done,    setDone]    = useState(false);

    useEffect(() => {
        constructionService.getPhases()
            .then(d => {
                const list = Array.isArray(d) ? d : d.results || [];
                setPhases(list);
            }).catch(() => {});
    }, []);

    const submit = async () => {
        if (!title.trim() || !amount || Number(amount) <= 0) return;
        setSaving(true);
        try {
            // TODO Phase 3: migrate to /fin/bills/ once Bill model supports
            // quick-expense semantics (expense_type, paid_to, phase FK).
            await api.post('/finance/expenses/', {
                title: title.trim(),
                amount: Number(amount),
                expense_type: type,
                date: today(),
                paid_to: paidTo.trim(),
                is_paid: true,
                ...(phaseId ? { phase: Number(phaseId) } : {}),
                ...(projectId ? { project: projectId } : {}),
            });
            setTitle(''); setAmount(''); setPaidTo('');
            setDone(true);
            setTimeout(() => setDone(false), 2000);
        } catch {
            alert('खर्च सेभ गर्न सकिएन। फेरि प्रयास गर्नुस्।');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Type quick-select */}
            <div>
                <label style={lbl}>📂 खर्चको किसिम</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {EXPENSE_TYPES.map(t => (
                        <button
                            key={t.value}
                            onClick={() => setType(t.value)}
                            style={{
                                padding:'6px 12px', borderRadius:20,
                                border:`1.5px solid ${type===t.value?'var(--t-primary)':'var(--t-border)'}`,
                                background: type===t.value
                                    ? 'color-mix(in srgb,var(--t-primary) 12%,transparent)'
                                    : 'var(--t-surface)',
                                color: type===t.value ? 'var(--t-primary)' : 'var(--t-text2)',
                                fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s',
                            }}
                        >{t.label}</button>
                    ))}
                </div>
            </div>

            {/* Title */}
            <div>
                <label style={lbl}>📝 खर्चको विवरण</label>
                <input
                    className="dup-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="जस्तै: सिमेन्ट किनियो, ज्याला तिरियो…"
                />
            </div>

            {/* Amount */}
            <div>
                <label style={lbl}>💰 रकम (Rs.)</label>
                <input
                    className="dup-input"
                    type="number" min="0" step="100"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    style={{ fontSize:18, fontWeight:800 }}
                />
                {amount && Number(amount) > 0 && (
                    <p style={{ fontSize:11, color:'var(--t-text3)', marginTop:4 }}>
                        Rs. {Number(amount).toLocaleString('en-IN')}
                    </p>
                )}
            </div>

            {/* Phase + Paid to — row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                    <label style={lbl}>🏗️ Phase</label>
                    <select className="dup-select" value={phaseId} onChange={e => setPhaseId(e.target.value)}>
                        <option value="">— छान्नुस् —</option>
                        {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label style={lbl}>👤 कसलाई तिरियो?</label>
                    <input
                        className="dup-input"
                        value={paidTo}
                        onChange={e => setPaidTo(e.target.value)}
                        placeholder="नाम…"
                    />
                </div>
            </div>

            <button
                className={`dup-submit${done?' dup-success-flash':''}`}
                onClick={submit}
                disabled={saving || !title.trim() || !amount || Number(amount) <= 0}
            >
                {done ? '✅ खर्च सेभ भयो!' : saving ? 'सेभ हुँदैछ…' : '💾 खर्च दर्ता गर्नुस्'}
            </button>
        </div>
    );
}

/* ── Shared style helpers ─────────────────────────────────────────────────── */
const lbl = {
    display:'block', fontSize:10, fontWeight:800, color:'var(--t-text3)',
    textTransform:'uppercase', letterSpacing:'.08em',
    fontFamily:"'DM Mono',monospace", marginBottom:6,
};
const quickBtn = (color) => ({
    flex:1, padding:'7px 10px', borderRadius:8, border:`1.5px solid ${color}`,
    background:`${color}18`, color, fontSize:11, fontWeight:800, cursor:'pointer',
    fontFamily:"'DM Mono',monospace", transition:'all .15s',
});

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Main Panel                                                                */
/* ══════════════════════════════════════════════════════════════════════════ */
const TABS = [
    { id:'task',       icon:'📋', label:'काम'    },
    { id:'photo',      icon:'📷', label:'फोटो'   },
    { id:'attendance', icon:'👷', label:'हाजिरी' },
    { id:'expense',    icon:'💰', label:'खर्च'   },
];

export default function DailyUpdatePanel({ onClose, projectId = null, isDesktop = true }) {
    const [activeTab, setActiveTab] = useState('task');

    const panelStyle = isDesktop
        ? { width: 400, height: '88vh', maxHeight: 700 }
        : { width: '100%', height: '100%' };

    return (
        <>
            <style>{CSS}</style>
            <div className="dup-panel" style={panelStyle}>

                {/* ── Header ── */}
                <div style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'12px 14px',
                    borderBottom:'1px solid var(--t-border)',
                    background:'var(--t-surface)',
                    flexShrink:0,
                }}>
                    <div style={{
                        width:34, height:34, borderRadius:10, flexShrink:0,
                        background:'linear-gradient(135deg,#10b981,#059669)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:17,
                        boxShadow:'0 3px 10px rgba(16,185,129,.3)',
                    }}>📅</div>
                    <div style={{ flex:1 }}>
                        <p style={{ fontSize:14, fontWeight:900, color:'var(--t-text)', lineHeight:1 }}>
                            दैनिक अपडेट
                        </p>
                        <p style={{
                            fontSize:9, color:'#10b981', fontWeight:700,
                            textTransform:'uppercase', letterSpacing:'.1em',
                            fontFamily:"'DM Mono',monospace", marginTop:2,
                        }}>
                            {new Date().toLocaleDateString('ne-NP', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                        </p>
                    </div>
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

                {/* ── Tab bar ── */}
                <div style={{
                    display:'flex', borderBottom:'1px solid var(--t-border)',
                    flexShrink:0, background:'var(--t-surface)',
                }}>
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            className={`dup-tab-btn${activeTab===t.id?' active':''}`}
                            onClick={() => setActiveTab(t.id)}
                        >
                            <span style={{ fontSize:16, display:'block', marginBottom:2 }}>{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Tab content ── */}
                <div className="dup-scroll flex-1 overflow-y-auto" style={{ padding:16 }}>
                    {activeTab === 'task'       && <TaskTab       projectId={projectId} />}
                    {activeTab === 'photo'      && <PhotoTab      projectId={projectId} />}
                    {activeTab === 'attendance' && <AttendanceTab projectId={projectId} />}
                    {activeTab === 'expense'    && <ExpenseTab    projectId={projectId} />}
                </div>
            </div>
        </>
    );
}
