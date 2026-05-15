import React, { useState, useRef, useCallback, useEffect } from 'react';
import { dataTransferService } from '../services/api.js';
import { useConstruction } from '../context/ConstructionContext';

// ── Inline SVG icon factory ───────────────────────────────────────────────────
const Ico = ({ d, size = 18, cls = '', fill = 'none', multi }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
        stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
        strokeLinejoin="round" className={cls}>
        {multi ? multi.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
);

const icons = {
    download:  'd="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"',
    upload:    'd="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"',
    terminal:  'd="M4 17l6-6-6-6M12 19h8"',
    check:     'd="M20 6L9 17l-5-5"',
    x:         'd="M18 6L6 18M6 6l12 12"',
    spin:      'd="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"',
    shield:    'd="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"',
    file:      'd="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"',
    chevron:   'd="M6 9l6 6 6-6"',
    db:        'd="M12 2a9 3 0 1 0 0 6 9 3 0 0 0 0-6zM3 5v4c0 1.657 4.03 3 9 3s9-1.343 9-3V5M3 13v4c0 1.657 4.03 3 9 3s9-1.343 9-3v-4"',
    warn:      'd="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"',
    play:      'd="M5 3l14 9-14 9V3z"',
    table:     'd="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 1-2-2V9m0 0h18"',
    copy:      'd="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2M16 8h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-2"',
    plus:      'd="M12 5v14M5 12h14"',
    layers:    'd="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"',
};

const I = ({ name, size = 18, cls = '' }) => {
    const raw = icons[name] || '';
    const d = raw.replace(/^d="/, '').replace(/"$/, '');
    return <Ico d={d} size={size} cls={cls} />;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = iso =>
    iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtSize = bytes => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
};

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

const isAdmin = u => u?.is_superuser || u?.is_staff || u?.is_system_admin;

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ children, color = 'slate' }) {
    const map = {
        slate:  'bg-slate-100 text-slate-600',
        blue:   'bg-blue-50 text-blue-700',
        green:  'bg-emerald-50 text-emerald-700',
        amber:  'bg-amber-50 text-amber-700',
        violet: 'bg-violet-50 text-violet-700',
        red:    'bg-red-50 text-red-600',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${map[color]}`}>
            {children}
        </span>
    );
}

// ── Alert strip ───────────────────────────────────────────────────────────────
function Alert({ type = 'info', children }) {
    const map = {
        info:    { bg: 'bg-blue-50 border-blue-100',   text: 'text-blue-700',   icon: 'shield' },
        warn:    { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700',  icon: 'warn' },
        success: { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', icon: 'check' },
        error:   { bg: 'bg-red-50 border-red-100',    text: 'text-red-600',    icon: 'x' },
    };
    const s = map[type];
    return (
        <div className={`flex items-start gap-2.5 px-3.5 py-3 rounded-lg border text-[12px] leading-relaxed ${s.bg} ${s.text}`}>
            <I name={s.icon} size={14} cls="shrink-0 mt-0.5" />
            <div>{children}</div>
        </div>
    );
}

// ── Spinner button ────────────────────────────────────────────────────────────
function Btn({ onClick, disabled, loading, variant = 'primary', children, full = true }) {
    const base = `${full ? 'w-full' : ''} inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed`;
    const variants = {
        primary:   'bg-slate-800 text-white hover:bg-slate-900 active:scale-[0.98]',
        secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98]',
        ghost:     'text-slate-600 hover:bg-slate-100 active:scale-[0.98]',
        danger:    'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]',
    };
    return (
        <button onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]}`}>
            {loading && <I name="spin" size={14} cls="animate-spin" />}
            {children}
        </button>
    );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function Tabs({ tabs, active, onChange }) {
    return (
        <div className="flex items-center gap-1 border-b border-slate-100 mb-6">
            {tabs.map(t => (
                <button
                    key={t.id}
                    onClick={() => onChange(t.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
                        active === t.id
                            ? 'border-slate-800 text-slate-800'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <I name={t.icon} size={14} />
                    {t.label}
                    {t.badge && (
                        <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-bold">
                            {t.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

// ── Section label ─────────────────────────────────────────────────────────────
function Label({ children }) {
    return (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            {children}
        </p>
    );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Div() {
    return <div className="border-t border-slate-100 my-5" />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT TAB
// ═══════════════════════════════════════════════════════════════════════════════
function ExportTab({ user }) {
    const [projects, setProjects]     = useState([]);
    const [loadingP, setLoadingP]     = useState(true);
    const [selected, setSelected]     = useState(null);
    const [stats, setStats]           = useState(null);
    const [statsLoading, setStatsL]   = useState(false);
    const [exporting, setExporting]   = useState(false);
    const [feedback, setFeedback]     = useState(null);
    const [open, setOpen]             = useState(false);

    useEffect(() => {
        dataTransferService.listProjects()
            .then(r => setProjects(r.data.projects ?? r.data))
            .catch(() => {})
            .finally(() => setLoadingP(false));
    }, []);

    const handleSelect = async proj => {
        setSelected(proj); setStats(null); setFeedback(null); setStatsL(true); setOpen(true);
        try {
            const r = await dataTransferService.getExportStats(proj.id);
            setStats(r.data);
        } catch { /* ignore */ }
        finally { setStatsL(false); }
    };

    const handleExport = async () => {
        if (!selected || exporting) return;
        setExporting(true); setFeedback(null);
        try {
            const r = await dataTransferService.exportProject(selected.id);
            const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            const name = `project_${selected.id}_${selected.name.replace(/\s+/g, '_').toLowerCase()}_${ts}.sql`;
            downloadBlob(r.data, name);
            setFeedback({ type: 'success', msg: `Downloaded ${name}`, detail: `${stats?.total_rows?.toLocaleString() ?? '—'} rows` });
        } catch (e) {
            setFeedback({ type: 'error', msg: e.response?.data?.error || 'Export failed.' });
        } finally { setExporting(false); }
    };

    const handleFullBackup = async () => {
        if (exporting) return;
        setExporting(true); setFeedback(null);
        try {
            const r = await dataTransferService.exportFullSystem();
            downloadBlob(r.data, `full_system_backup_${new Date().toISOString().slice(0, 10)}.sql`);
            setFeedback({ type: 'success', msg: 'Full system backup downloaded.' });
        } catch {
            setFeedback({ type: 'error', msg: 'Full system export failed.' });
        } finally { setExporting(false); }
    };

    return (
        <div className="space-y-5">
            {/* Project list */}
            <div>
                <Label>{loadingP ? 'Loading projects…' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}</Label>
                {loadingP ? (
                    <div className="flex items-center gap-2 py-8 text-slate-400 text-[13px]">
                        <I name="spin" size={15} cls="animate-spin" /> Loading…
                    </div>
                ) : projects.length === 0 ? (
                    <p className="text-slate-400 text-[13px] py-8 text-center">No projects found.</p>
                ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                        {projects.map(p => {
                            const sel = selected?.id === p.id;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelect(p)}
                                    className={`w-full text-left px-3.5 py-3 rounded-lg border transition-all ${
                                        sel
                                            ? 'border-slate-800 bg-slate-800 text-white shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className={`font-semibold text-[13px] truncate ${sel ? 'text-white' : 'text-slate-800'}`}>
                                                {p.name}
                                            </p>
                                            <p className={`text-[11px] mt-0.5 truncate ${sel ? 'text-slate-300' : 'text-slate-400'}`}>
                                                {p.owner} · {fmtDate(p.start_date)}
                                            </p>
                                        </div>
                                        {sel && <I name="check" size={15} cls="shrink-0 text-emerald-400" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Stats accordion */}
            {selected && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setOpen(o => !o)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
                            <I name="db" size={13} />
                            Export preview
                            {statsLoading && <I name="spin" size={12} cls="animate-spin text-slate-400" />}
                            {stats && (
                                <span className="flex gap-1.5 ml-1">
                                    <Badge color="blue">{stats.tables?.filter(t => t.rows > 0).length} tables</Badge>
                                    <Badge color="green">{stats.total_rows?.toLocaleString()} rows</Badge>
                                </span>
                            )}
                        </div>
                        <I name="chevron" size={13} cls={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                        <div className="max-h-44 overflow-y-auto divide-y divide-slate-100">
                            {stats ? (
                                stats.tables?.filter(t => t.rows > 0).map((t, i) => (
                                    <div key={i} className="flex items-center justify-between px-3.5 py-2 text-[12px]">
                                        <span className="text-slate-600 font-medium">{t.model}</span>
                                        <span className="text-slate-800 font-bold tabular-nums">{t.rows.toLocaleString()}</span>
                                    </div>
                                ))
                            ) : !statsLoading ? (
                                <p className="text-slate-400 text-[12px] px-3.5 py-3">No preview available.</p>
                            ) : null}
                        </div>
                    )}
                </div>
            )}

            {/* Feedback */}
            {feedback && (
                <Alert type={feedback.type}>
                    <strong>{feedback.msg}</strong>
                    {feedback.detail && <span className="opacity-75"> · {feedback.detail}</span>}
                </Alert>
            )}

            {/* Actions */}
            <div className="space-y-2">
                <Btn onClick={handleExport} disabled={!selected} loading={exporting}>
                    <I name="download" size={14} />
                    {exporting ? 'Generating SQL…' : 'Export selected project'}
                </Btn>

                {isAdmin(user) && (
                    <>
                        <Div />
                        <Label>System administration</Label>
                        <Btn onClick={handleFullBackup} disabled={exporting} loading={exporting} variant="secondary">
                            <I name="layers" size={14} />
                            Full system backup — all projects
                        </Btn>
                        <p className="text-[11px] text-slate-400 text-center">
                            Exports every project as a single SQL file.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT TAB
// ═══════════════════════════════════════════════════════════════════════════════
function ImportTab({ user }) {
    const fileRef     = useRef(null);
    const [drag, setDrag]         = useState(false);
    const [file, setFile]         = useState(null);
    const [preview, setPreview]   = useState([]);
    const [loading, setLoading]   = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult]     = useState(null);
    const [error, setError]       = useState(null);
    const [showPrev, setShowPrev] = useState(true);

    const canImport = isAdmin(user);

    const handleFile = useCallback(f => {
        if (!f) return;
        if (!f.name.toLowerCase().endsWith('.sql')) {
            setError('Only .sql files are accepted.');
            return;
        }
        setError(null); setResult(null); setFile(f);
        const reader = new FileReader();
        reader.onload = e => setPreview(e.target.result.split('\n').slice(0, 40));
        reader.readAsText(f);
    }, []);

    const clearFile = e => {
        e?.stopPropagation();
        setFile(null); setPreview([]); setResult(null); setError(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleImport = async () => {
        if (!file || !canImport) return;
        setLoading(true); setError(null); setResult(null); setProgress(0);
        try {
            const r = await dataTransferService.importSql(file, e => {
                if (e.total) setProgress(Math.round(e.loaded / e.total * 100));
            });
            setResult(r.data);
        } catch (e) {
            setError(e.response?.data?.error || e.response?.data?.message || 'Import failed.');
        } finally { setLoading(false); setProgress(0); }
    };

    if (!canImport) {
        return (
            <div className="py-12 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                    <I name="shield" size={26} cls="text-slate-300" />
                </div>
                <div>
                    <p className="font-semibold text-slate-700 text-[14px]">Admin access required</p>
                    <p className="text-slate-400 text-[12px] mt-1 max-w-xs leading-relaxed">
                        SQL import executes directly against the database.<br />
                        Staff, System Admins, and Super Admins can import.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Drop zone */}
            <div
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => !file && fileRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                    drag        ? 'border-slate-500 bg-slate-50'
                    : file      ? 'border-emerald-400 bg-emerald-50/40 cursor-default'
                    : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                }`}
            >
                <input ref={fileRef} type="file" accept=".sql" className="hidden"
                    onChange={e => handleFile(e.target.files[0])} />

                <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                    file ? 'bg-emerald-100' : 'bg-slate-100'
                }`}>
                    <I name={file ? 'check' : 'upload'} size={20} cls={file ? 'text-emerald-600' : 'text-slate-400'} />
                </div>

                {file ? (
                    <div className="text-center">
                        <p className="font-semibold text-slate-800 text-[13px]">{file.name}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{fmtSize(file.size)}</p>
                        <div className="flex items-center justify-center gap-3 mt-2">
                            <button onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                                className="text-[11px] text-slate-500 hover:text-slate-700 font-semibold">
                                Change
                            </button>
                            <span className="text-slate-200">|</span>
                            <button onClick={clearFile}
                                className="text-[11px] text-red-400 hover:text-red-600 font-semibold">
                                Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="font-semibold text-slate-600 text-[13px]">Drop .sql file here</p>
                        <p className="text-slate-400 text-[11px] mt-1">or click to browse</p>
                    </div>
                )}
            </div>

            {/* SQL preview */}
            {preview.length > 0 && (
                <div className="rounded-lg overflow-hidden border border-slate-200">
                    <button
                        onClick={() => setShowPrev(s => !s)}
                        className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
                            <I name="file" size={11} cls="text-slate-400" />
                            Preview — first {Math.min(preview.length, 40)} lines
                        </div>
                        <I name="chevron" size={12} cls={`text-slate-400 transition-transform ${showPrev ? 'rotate-180' : ''}`} />
                    </button>
                    {showPrev && (
                        <pre className="text-[10px] font-mono bg-slate-900 px-4 py-3 max-h-40 overflow-y-auto leading-relaxed">
                            {preview.map((l, i) => (
                                <span key={i} className={`block ${
                                    l.startsWith('--') ? 'text-slate-500'
                                    : /^(INSERT|SELECT|UPDATE)/i.test(l) ? 'text-emerald-400'
                                    : 'text-slate-300'
                                }`}>{l || ' '}</span>
                            ))}
                        </pre>
                    )}
                </div>
            )}

            {/* Upload progress */}
            {loading && progress > 0 && (
                <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Uploading…</span><span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-slate-800 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}

            {/* Success result */}
            {result?.success && (
                <div className="border border-emerald-200 rounded-lg overflow-hidden">
                    <div className="bg-emerald-50 px-3.5 py-2.5 flex items-center gap-2">
                        <I name="check" size={14} cls="text-emerald-600" />
                        <p className="font-semibold text-emerald-700 text-[12px]">{result.message}</p>
                    </div>
                    <div className="px-3.5 py-2.5 flex flex-wrap gap-2">
                        <Badge color="green">Imported: {result.statements_executed}</Badge>
                        <Badge color="slate">Total: {result.total_statements}</Badge>
                        {result.statements_skipped > 0 && (
                            <Badge color="amber">Skipped: {result.statements_skipped}</Badge>
                        )}
                    </div>
                    {result.statements_skipped > 0 && (
                        <div className="border-t border-emerald-100 px-3.5 py-2.5">
                            <Alert type="warn">
                                {result.statements_skipped} row(s) skipped — old integer IDs with no matching record in the current schema. All compatible data was imported.
                            </Alert>
                        </div>
                    )}
                    {result.skipped?.length > 0 && (
                        <div className="border-t border-slate-100 px-3.5 py-2.5 max-h-28 overflow-y-auto space-y-1">
                            {result.skipped.slice(0, 10).map((s, i) => (
                                <div key={i} className="text-[10px] font-mono text-slate-500">
                                    <span className="text-slate-400">#{s.index}</span>{' '}
                                    <span className="text-red-400">{s.reason}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Error */}
            {(error || (result && !result.success)) && (
                <Alert type="error">
                    <strong>{error || result?.message}</strong>
                    {result?.errors?.slice(0, 3).map((e, i) => (
                        <div key={i} className="font-mono text-[10px] mt-1 opacity-80">#{e.index}: {e.error}</div>
                    ))}
                </Alert>
            )}

            {/* Import button */}
            <Btn onClick={handleImport} disabled={!file} loading={loading}>
                <I name="upload" size={14} />
                {loading ? 'Importing…' : 'Execute SQL import'}
            </Btn>

            <Alert type="info">
                Statements run with per-row savepoints — FK violations are skipped automatically.
                <strong> DROP TABLE</strong>, <strong>TRUNCATE</strong>, and bare <strong>DELETE</strong> are always blocked.
            </Alert>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SQL TERMINAL TAB
// ═══════════════════════════════════════════════════════════════════════════════
const SAMPLE_QUERIES = [
    { label: 'Projects',       sql: 'SELECT id, name, address, start_date FROM core_houseproject ORDER BY created_at DESC LIMIT 20' },
    { label: 'Project members',sql: 'SELECT pm.id, pm.role, u.email FROM core_projectmember pm JOIN accounts_user u ON u.id = pm.user_id LIMIT 50' },
    { label: 'Tasks',          sql: 'SELECT id, title, status, priority, due_date FROM tasks_task ORDER BY created_at DESC LIMIT 30' },
    { label: 'Bills',          sql: 'SELECT id, title, amount, status, due_date FROM finance_bill ORDER BY created_at DESC LIMIT 30' },
    { label: 'Workforce',      sql: 'SELECT id, name, role, phone, daily_rate FROM workforce_workforcemember ORDER BY name LIMIT 50' },
    { label: 'Materials',      sql: 'SELECT id, name, unit, unit_price FROM resource_material ORDER BY name LIMIT 50' },
];

function SqlTerminalTab({ user }) {
    const [sql, setSql]             = useState('SELECT id, name, address FROM core_houseproject ORDER BY created_at DESC LIMIT 20');
    const [running, setRunning]     = useState(false);
    const [result, setResult]       = useState(null);
    const [error, setError]         = useState(null);
    const [copied, setCopied]       = useState(false);
    const textareaRef               = useRef(null);

    const canUse = isAdmin(user);

    const runQuery = async () => {
        if (!sql.trim() || running) return;
        setRunning(true); setResult(null); setError(null);
        try {
            const r = await dataTransferService.runSql(sql.trim());
            setResult(r.data);
        } catch (e) {
            setError(e.response?.data?.error || 'Query failed.');
        } finally { setRunning(false); }
    };

    const handleKeyDown = e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            runQuery();
        }
    };

    const copyResult = () => {
        if (!result) return;
        const header = result.columns.join('\t');
        const rows = result.rows.map(r => r.join('\t')).join('\n');
        navigator.clipboard.writeText(`${header}\n${rows}`).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    if (!canUse) {
        return (
            <div className="py-12 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                    <I name="terminal" size={26} cls="text-slate-300" />
                </div>
                <div>
                    <p className="font-semibold text-slate-700 text-[14px]">Admin access required</p>
                    <p className="text-slate-400 text-[12px] mt-1">SQL terminal is restricted to admins only.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Sample query chips */}
            <div>
                <Label>Quick queries</Label>
                <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_QUERIES.map(q => (
                        <button
                            key={q.label}
                            onClick={() => { setSql(q.sql); setResult(null); setError(null); }}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            {q.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div className="rounded-xl overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-800">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <I name="terminal" size={12} cls="text-slate-400" />
                        SQL — SELECT only · Ctrl+Enter to run
                    </div>
                    <Btn
                        onClick={runQuery}
                        loading={running}
                        disabled={!sql.trim()}
                        variant="ghost"
                        full={false}
                    >
                        <I name="play" size={13} cls="text-slate-300" />
                        <span className="text-slate-300 text-[12px]">{running ? 'Running…' : 'Run'}</span>
                    </Btn>
                </div>
                <textarea
                    ref={textareaRef}
                    value={sql}
                    onChange={e => setSql(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={6}
                    spellCheck={false}
                    className="w-full bg-slate-900 text-emerald-300 font-mono text-[12px] px-4 py-3 resize-none focus:outline-none leading-relaxed"
                    placeholder="SELECT * FROM core_houseproject LIMIT 10"
                />
            </div>

            {/* Error */}
            {error && <Alert type="error">{error}</Alert>}

            {/* Results table */}
            {result?.success && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                            <I name="table" size={13} cls="text-slate-400" />
                            <span className="text-[12px] font-semibold text-slate-700">
                                {result.row_count.toLocaleString()} row{result.row_count !== 1 ? 's' : ''}
                            </span>
                            <Badge color="slate">{result.execution_ms}ms</Badge>
                            {result.truncated && (
                                <Badge color="amber">Truncated at {result.truncated_at}</Badge>
                            )}
                        </div>
                        <button
                            onClick={copyResult}
                            className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-700 font-semibold transition-colors"
                        >
                            <I name={copied ? 'check' : 'copy'} size={12} />
                            {copied ? 'Copied!' : 'Copy TSV'}
                        </button>
                    </div>

                    {result.row_count === 0 ? (
                        <p className="text-center text-slate-400 text-[12px] py-8">Query returned 0 rows.</p>
                    ) : (
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-[11px]">
                                <thead className="sticky top-0 bg-slate-100">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 w-8 tabular-nums">#</th>
                                        {result.columns.map(c => (
                                            <th key={c} className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                                {c}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {result.rows.map((row, ri) => (
                                        <tr key={ri} className="hover:bg-slate-50">
                                            <td className="px-3 py-1.5 text-slate-300 tabular-nums">{ri + 1}</td>
                                            {row.map((cell, ci) => (
                                                <td key={ci} className={`px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate ${
                                                    cell === null ? 'text-slate-300 italic' : 'text-slate-700'
                                                }`} title={cell ?? ''}>
                                                    {cell === null ? 'null' : String(cell)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <Alert type="warn">
                Only <strong>SELECT</strong> statements are allowed. Results are capped at 500 rows. Queries run against the live production database.
            </Alert>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function DataTransferPage() {
    const { user } = useConstruction();
    const [tab, setTab] = useState('export');
    const admin = isAdmin(user);

    const tabs = [
        { id: 'export',   label: 'Export',       icon: 'download' },
        { id: 'import',   label: 'Import',        icon: 'upload',   badge: admin ? null : 'Admin' },
        { id: 'terminal', label: 'SQL Terminal',  icon: 'terminal', badge: admin ? null : 'Admin' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-20">
            <div className="max-w-3xl mx-auto">

                {/* Page header */}
                <div className="mb-7 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-slate-800 leading-tight">Data Transfer</h1>
                        <p className="text-[13px] text-slate-400 mt-0.5">Export, import, and inspect your project database</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {admin ? (
                            <Badge color="violet">
                                <I name="shield" size={10} />
                                Admin
                            </Badge>
                        ) : (
                            <Badge color="slate">
                                <I name="shield" size={10} />
                                Member
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Non-admin notice */}
                {!admin && (
                    <div className="mb-5">
                        <Alert type="warn">
                            You have <strong>export-only</strong> access. Import and SQL Terminal require admin privileges.
                        </Alert>
                    </div>
                )}

                {/* Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <Tabs tabs={tabs} active={tab} onChange={setTab} />

                    {tab === 'export'   && <ExportTab   user={user} />}
                    {tab === 'import'   && <ImportTab   user={user} />}
                    {tab === 'terminal' && <SqlTerminalTab user={user} />}
                </div>

                {/* Footer note */}
                <p className="text-center text-[11px] text-slate-300 mt-6">
                    Exports use <code>ON CONFLICT DO NOTHING</code> for safe re-imports ·
                    All imports are fully transactional
                </p>
            </div>
        </div>
    );
}
