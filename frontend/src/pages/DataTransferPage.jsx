import React, { useState, useRef, useCallback, useEffect } from 'react';
import { dataTransferService } from '../services/api.js';
import { useConstruction } from '../context/ConstructionContext';
import { dataTransferService as dtSvc } from '../services/dataTransferService.js';

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
    table:     'd="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M3 9h18 M9 21V3"',
    copy:      'd="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2M16 8h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-2"',
    plus:      'd="M12 5v14M5 12h14"',
    layers:    'd="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"',
    rocket:    'd="M21 3l-6.5 18a.5.5 0 0 1-.9 0L10 14l-7-3.5a.5.5 0 0 1 0-.9z M21 3L10 14"',
    deploy:    'd="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"',
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
// IMPORT TAB  — smart project-scoped import
// ═══════════════════════════════════════════════════════════════════════════════
function ImportTab({ user }) {
    const fileRef = useRef(null);
    const [mode, setMode] = useState('project');

    // Project selector state
    const [projects, setProjects]         = useState([]);
    const [loadingP, setLoadingP]         = useState(true);
    const [targetProject, setTargetProject] = useState(null);

    // File state
    const [drag, setDrag]       = useState(false);
    const [file, setFile]       = useState(null);
    const [preview, setPreview] = useState([]);
    const [showPrev, setShowPrev] = useState(false);

    // Import state
    const [loading, setLoading]   = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult]     = useState(null);
    const [error, setError]       = useState(null);

    const canImport = isAdmin(user);

    // Load projects list for the selector
    useEffect(() => {
        if (!canImport) return;
        dataTransferService.listProjects()
            .then(r => setProjects(r.data.projects ?? r.data))
            .catch(() => {})
            .finally(() => setLoadingP(false));
    }, [canImport]);

    const handleFile = useCallback(f => {
        if (!f) return;
        if (!f.name.toLowerCase().endsWith('.sql')) {
            setError('Only .sql files are accepted.');
            return;
        }
        setError(null); setResult(null); setFile(f);
        const reader = new FileReader();
        reader.onload = e => {
            const lines = e.target.result.split('\n').slice(0, 40);
            setPreview(lines);
            setShowPrev(true);
        };
        reader.readAsText(f);
    }, []);

    const clearFile = e => {
        e?.stopPropagation();
        setFile(null); setPreview([]); setResult(null); setError(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleImport = async () => {
        if (!file || !canImport) return;
        if (mode === 'project' && !targetProject) return;
        setLoading(true); setError(null); setResult(null); setProgress(0);
        try {
            const onProgress = e => { if (e.total) setProgress(Math.round(e.loaded / e.total * 100)); };
            const r = mode === 'system'
                ? await dataTransferService.importSql(file, onProgress)
                : await dataTransferService.importSqlToProject(targetProject.id, file, onProgress);
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

    const ready = !!file && (mode === 'system' || !!targetProject);

    return (
        <div className="space-y-5">

            {/* ── Step 1: Choose import mode ─────────────────────── */}
            <div>
                <Label>Step 1 — Choose import mode</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                        onClick={() => { setMode('project'); setResult(null); setError(null); }}
                        className={`text-left px-3.5 py-3 rounded-lg border transition-all ${
                            mode === 'project'
                                ? 'border-slate-800 bg-slate-800 text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                    >
                        <p className={`font-semibold text-[13px] ${mode === 'project' ? 'text-white' : 'text-slate-800'}`}>Import into one project</p>
                        <p className={`text-[11px] mt-1 leading-relaxed ${mode === 'project' ? 'text-slate-300' : 'text-slate-400'}`}>
                            Use for single-project exports. Project IDs are remapped to the selected target.
                        </p>
                    </button>
                    <button
                        onClick={() => { setMode('system'); setTargetProject(null); setResult(null); setError(null); }}
                        className={`text-left px-3.5 py-3 rounded-lg border transition-all ${
                            mode === 'system'
                                ? 'border-slate-800 bg-slate-800 text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                    >
                        <p className={`font-semibold text-[13px] ${mode === 'system' ? 'text-white' : 'text-slate-800'}`}>Full system restore</p>
                        <p className={`text-[11px] mt-1 leading-relaxed ${mode === 'system' ? 'text-slate-300' : 'text-slate-400'}`}>
                            Use for full-system backup files. No project remapping is applied.
                        </p>
                    </button>
                </div>
            </div>

            {mode === 'project' && (
            <div>
                <Label>Step 2 — Select target project</Label>
                <p className="text-[11px] text-slate-400 mb-2">
                    The SQL file will be imported into this project. Project IDs are remapped automatically.
                </p>
                {loadingP ? (
                    <div className="flex items-center gap-2 py-5 text-slate-400 text-[12px]">
                        <I name="spin" size={14} cls="animate-spin" /> Loading projects…
                    </div>
                ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                        {projects.map(p => {
                            const sel = targetProject?.id === p.id;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => { setTargetProject(p); setResult(null); setError(null); }}
                                    className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition-all ${
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
            )}

            <Div />

            {/* ── Step 2: Upload SQL file ────────────────────────────── */}
            <div>
                <Label>{mode === 'project' ? 'Step 3' : 'Step 2'} — Upload SQL backup file</Label>
                <div
                    onDragOver={e => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
                    onClick={() => !file && fileRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                        drag   ? 'border-slate-500 bg-slate-50'
                        : file ? 'border-emerald-400 bg-emerald-50/40 cursor-default'
                        : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                >
                    <input ref={fileRef} type="file" accept=".sql" className="hidden"
                        onChange={e => handleFile(e.target.files[0])} />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${file ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        <I name={file ? 'check' : 'upload'} size={18} cls={file ? 'text-emerald-600' : 'text-slate-400'} />
                    </div>
                    {file ? (
                        <div className="text-center">
                            <p className="font-semibold text-slate-800 text-[13px]">{file.name}</p>
                            <p className="text-slate-400 text-[11px] mt-0.5">{fmtSize(file.size)}</p>
                            <div className="flex items-center justify-center gap-3 mt-2">
                                <button onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                                    className="text-[11px] text-slate-500 hover:text-slate-700 font-semibold">Change</button>
                                <span className="text-slate-200">|</span>
                                <button onClick={clearFile}
                                    className="text-[11px] text-red-400 hover:text-red-600 font-semibold">Remove</button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="font-semibold text-slate-600 text-[13px]">Drop .sql file here</p>
                            <p className="text-slate-400 text-[11px] mt-1">or click to browse</p>
                        </div>
                    )}
                </div>
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
                            File preview — first {Math.min(preview.length, 40)} lines
                        </div>
                        <I name="chevron" size={12} cls={`text-slate-400 transition-transform ${showPrev ? 'rotate-180' : ''}`} />
                    </button>
                    {showPrev && (
                        <pre className="text-[10px] font-mono bg-slate-900 px-4 py-3 max-h-40 overflow-y-auto leading-relaxed">
                            {preview.map((l, i) => (
                                <span key={i} className={`block ${
                                    l.startsWith('--') ? 'text-slate-500'
                                    : /^(INSERT|SELECT)/i.test(l.trim()) ? 'text-emerald-400'
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

            {/* ── Result ────────────────────────────────────────────── */}
            {result?.success && (
                <div className="border border-emerald-200 rounded-lg overflow-hidden">
                    <div className="bg-emerald-50 px-3.5 py-2.5 flex items-start gap-2">
                        <I name="check" size={14} cls="text-emerald-600 shrink-0 mt-0.5" />
                        <p className="font-semibold text-emerald-700 text-[12px] leading-snug">{result.message}</p>
                    </div>
                    <div className="px-3.5 py-2.5 flex flex-wrap gap-2 border-t border-emerald-100">
                        <Badge color="green">Imported: {result.statements_executed}</Badge>
                        <Badge color="slate">Total: {result.total_statements}</Badge>
                        {result.statements_skipped_user > 0 && (
                            <Badge color="blue">User rows skipped: {result.statements_skipped_user}</Badge>
                        )}
                        {result.statements_skipped > 0 && (
                            <Badge color="amber">Other skipped: {result.statements_skipped}</Badge>
                        )}
                        {result.remapped && (
                            <Badge color="violet">
                                ID remapped: {result.source_project_id} → {String(result.target_project_id).slice(0, 8)}…
                            </Badge>
                        )}
                    </div>
                    {result.statements_skipped_user > 0 && (
                        <div className="px-3.5 pb-3 border-t border-slate-100 pt-2.5">
                            <Alert type="info">
                                <strong>{result.statements_skipped_user}</strong> user/member rows were skipped automatically —
                                user accounts differ between systems and cannot be remapped. All project data (tasks, finance, phases) was imported.
                            </Alert>
                        </div>
                    )}
                    {result.skipped?.length > 0 && (
                        <div className="border-t border-slate-100 px-3.5 py-2.5 max-h-28 overflow-y-auto space-y-1">
                            <p className="text-[10px] text-slate-400 font-semibold mb-1">Skipped statements</p>
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

            {/* ── Step 3: Import button ─────────────────────────────── */}
            <div>
                <Label>{mode === 'project' ? 'Step 4' : 'Step 3'} — Run import</Label>
                {mode === 'project' && !targetProject && (
                    <p className="text-[11px] text-amber-600 mb-2">Select a target project above first.</p>
                )}
                {!file && (
                    <p className="text-[11px] text-amber-600 mb-2">Upload a .sql file above first.</p>
                )}
                <Btn onClick={handleImport} disabled={!ready} loading={loading}>
                    <I name="upload" size={14} />
                    {loading
                        ? 'Importing…'
                        : mode === 'system'
                        ? 'Restore full system SQL'
                        : targetProject
                        ? `Import into "${targetProject.name}"`
                        : 'Import SQL'}
                </Btn>
            </div>

            {mode === 'project' ? (
                <Alert type="info">
                    User rows (<code>accounts_user</code>, <code>core_projectmember</code>) are skipped automatically — they don't transfer between systems.
                    All other rows use savepoints so one FK violation never rolls back the whole import.
                    <strong> DROP TABLE</strong> and <strong>TRUNCATE</strong> are always blocked.
                </Alert>
            ) : (
                <Alert type="warn">
                    Full system restore imports every compatible row from the backup. Existing rows are preserved when the SQL uses
                    <strong> ON CONFLICT DO NOTHING</strong>. Constraint failures are skipped per statement and reported after import.
                </Alert>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SQL TERMINAL TAB
// ═══════════════════════════════════════════════════════════════════════════════
const MODELS = [
    // Accounts
    { label: 'Users', table: 'accounts_user', cols: 'id, password, is_superuser, username, first_name, last_name, is_staff, is_active, date_joined, email, bio, address, preferred_language, notifications_enabled, is_verified, created_at, updated_at, digital_signature', orderBy: 'username' },
    { label: 'Roles', table: 'accounts_role', cols: 'id, code, name, can_manage_all_systems, can_manage_finances, can_view_finances, can_manage_phases, can_view_phases, can_manage_users, can_manage_structure, can_view_structure, can_manage_resources, can_manage_workforce, can_manage_data_transfer, can_manage_settings, can_view_projects, can_manage_projects, can_view_dashboard, can_view_resources, can_view_workforce, can_manage_admin_config, can_view_profile', orderBy: 'name' },
    
    // Core
    { label: 'Projects', table: 'core_houseproject', cols: 'id, name, owner_name, address, total_budget, start_date, expected_completion_date, area_sqft, created_at, updated_at', orderBy: 'created_at DESC' },
    { label: 'Phases', table: 'core_constructionphase', cols: 'id, name, status, order, description, technical_spec, estimated_budget, permit_required, permit_status, permit_notes' },
    { label: 'Project members', table: 'core_projectmember', cols: 'id, role, note, joined_at, can_manage_members, can_manage_finances, can_view_finances, can_manage_phases, can_manage_structure, can_manage_resources, can_upload_media, can_manage_workforce, can_approve_purchases, project_id, user_id, can_view_members, can_view_phases, can_view_structure, can_view_resources, can_view_workforce', customSelect: 'SELECT pm.id, pm.role, u.email FROM core_projectmember pm JOIN accounts_user u ON u.id = pm.user_id LIMIT 50' },
    { label: 'Floors', table: 'core_floor', cols: 'id, name, level, created_at, updated_at' },
    { label: 'Rooms', table: 'core_room', cols: 'id, name, room_type, status, budget_allocation, floor_finish, wall_finish, color_scheme, window_count, door_count, electrical_points, light_points, fan_points, ac_provision, plumbing_points, priority, notes, floor_id' },

    // Tasks
    { label: 'Tasks', table: 'tasks_task', cols: 'id, title, description, technical_requirement, estimated_cost, status, priority, created_at, updated_at, phase_id', orderBy: 'created_at DESC' },
    { label: 'Task Updates', table: 'tasks_taskupdate', cols: 'id, note, progress_percentage, date, task_id' },
    { label: 'Task Media', table: 'tasks_taskmedia', cols: 'id, file, media_type, created_at' },

    // Workforce
    { label: 'Workforce', table: 'workforce_workforcemember', cols: 'id, employee_id, first_name, last_name, gender, nationality, language, phone, phone_alt, email, address, worker_type, status, join_date, created_at, updated_at, portal_pin_hash', orderBy: '_first_name' },
    { label: 'Worker Assignments', table: 'workforce_workerassignment', cols: 'id, start_date, status, estimated_hours, actual_hours, overtime_hours, notes, created_at, updated_at, project_id, worker_id' },
    { label: 'Payroll', table: 'workforce_payrollrecord', cols: 'id, period_start, period_end, total_days_present, total_days_absent, total_days_leave, total_days_holiday, total_overtime_hours, base_pay, overtime_pay, allowances, bonus, deduction_tax, deduction_advance, deduction_other, deduction_notes, net_pay, currency, status, payment_method, payment_reference, created_at, updated_at, worker_id' },

    // Financials
    { label: 'Expenses (Fin)', table: 'fin_expense', cols: 'id, title, amount, expense_type, date, paid_to, is_paid, notes, created_at, updated_at' },
    { label: 'Bills', table: 'finance_bill', cols: 'id, bill_number, date_issued, due_date, total_amount, amount_paid, status, notes, created_at', orderBy: 'created_at DESC' },
    { label: 'Budget Categories', table: 'fin_budgetcategory', cols: 'id, name, description, created_at, updated_at, project_id, sequence' },
    { label: 'Accounts', table: 'fin_account', cols: 'id, code, name, account_type, description, is_bank, bank_name, account_number, account_holder_name, is_loan, is_active, created_at, updated_at' },

    // Resources
    { label: 'Materials', table: 'resource_material', cols: 'id, name, category, unit_price, stock_qty, reorder_level, description, is_active, created_at, updated_at, project_id, unit', orderBy: 'name' },
    { label: 'Equipment', table: 'resource_equipment', cols: 'id, name, equipment_type, status, daily_rate, quantity, description, is_active, created_at, updated_at, project_id' },
    { label: 'Suppliers', table: 'resource_supplier', cols: 'id, name, contact_person, phone, email, address, specialty, is_active, notes, created_at, updated_at, project_id' },
    { label: 'Purchase Orders', table: 'resource_purchaseorder', cols: 'id, order_number, order_date, status, notes, created_at, updated_at, project_id, signature_data, signature_name' },

    // Attendance
    { label: 'Attendance Workers', table: 'attendance_attendanceworker', cols: 'id, name, trade, worker_type, daily_rate, overtime_rate_per_hour, phone, address, is_active, notes, use_custom_window, qr_token, created_at, updated_at, project_id, working_days_mask' },
    { label: 'Daily Attendance', table: 'attendance_dailyattendance', cols: 'id, date, status, overtime_hours, daily_rate_snapshot, overtime_rate_snapshot, notes, created_at, updated_at, project_id, worker_id' },

    // Estimate
    { label: 'Estimates', table: 'estimate_estimate', cols: 'id, name, description, status, quality_tier, total_area_sqft, floors, bedrooms, bathrooms, include_mep, include_finishing, contingency_pct, material_total, labor_total, contingency_amount, grand_total, created_at, updated_at, notes' },
    { label: 'Estimate Items', table: 'estimate_estimateitem', cols: 'id, label, category, rate_key, quantity, unit, unit_rate, wastage_pct, total, notes, section_id' },

    // Location
    { label: 'Geofences', table: 'location_tracking_projectgeofence', cols: 'id, latitude, longitude, radius_meters, is_active, updated_at, project_id, name, fence_color' },
    { label: 'Staff Location Logs', table: 'location_tracking_stafflocationlog', cols: 'id, latitude, longitude, accuracy, timestamp, is_on_site, user_id' },
];

const makeUuid = () => {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
    } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const getSampleValue = (col, table = '') => {
    const c = col.trim().toLowerCase();
    const t = table.toLowerCase();
    
    if (c === 'id') {
        const isUuidTable = t.startsWith('resource_') || t.startsWith('workforce_') || t.startsWith('fin_') || t.startsWith('finance_');
        return isUuidTable ? `'${makeUuid()}'` : '1';
    }
    if (c.endsWith('_id')) {
        const isUuidFk = ['worker_id', 'supplier_id', 'material_id', 'expense_id'].includes(c);
        return isUuidFk ? `'${makeUuid()}'` : '1';
    }
    
    if (c.includes('password')) return "'pbkdf2_sha256$...(use Django hash)'";
    if (c.includes('email')) return "'test@example.com'";
    if (c.includes('username')) return "'testuser'";
    if (c.includes('first_name')) return "'John'";
    if (c.includes('last_name')) return "'Doe'";
    if (c === 'preferred_language' || c === 'language') return "'en'";
    if (c === 'digital_signature') return "''";
    if (c === 'notifications_enabled') return 'true';
    if (c.includes('name') || c.includes('title') || c.includes('label')) return "'Sample'";
    if (c.includes('date') || c.includes('timestamp') || c.endsWith('_at')) return "'2026-05-28 07:30:00'";
    
    // Description and notes fields
    if (c.includes('description') || c.includes('spec') || c.includes('note') || c.includes('bio') || c.includes('specialty') || c.includes('relationship') || c.includes('comments') || c.includes('action') || c.includes('recommendation') || c.includes('token') || c.includes('mask') || c.includes('data')) {
        return "'Sample Details'";
    }
    
    // Numeric metrics
    if (c.includes('amount') || c.includes('price') || c.includes('rate') || c.includes('total') || c.includes('balance') || c.includes('budget') || c.includes('wage') || c.includes('cost') || c.includes('pay') || c.includes('allowance') || c.includes('bonus') || c.includes('deduction') || c.includes('multiplier') || c.includes('latitude') || c.includes('longitude') || c.includes('snap')) {
        return '100.50';
    }
    
    // Quantities / levels / counts / points / order / sequence / level / dimensions
    if (c.includes('qty') || c.includes('quantity') || c.includes('level') || c.includes('radius') || c.includes('count') || c.includes('points') || c.includes('days') || c.includes('hours') || c.includes('pct') || c.includes('percentage') || c.includes('score') || c.includes('order') || c.includes('seq') || c.includes('sequence') || c.includes('duration') || c.includes('floors') || c.includes('bedrooms') || c.includes('bathrooms') || c.includes('accuracy') || c.includes('sqft') || c.includes('area') || c.includes('width') || c.includes('depth') || c.includes('height') || c.includes('pos') || c.includes('cm') || c.includes('years') || c.includes('experience')) {
        return '10';
    }
    
    // Unit / Category / Types
    if (c === 'unit') return "'bag'";
    if (c === 'category') return "'OTHER'";
    if (c === 'code') return "'CODE'";
    if (c === 'gender') return "'M'";
    if (c === 'nationality') return "'Nepalese'";
    if (c === 'employee_id') return "'EMP001'";
    if (c === 'portal_pin_hash') return "'hash'";
    
    // Booleans
    if (c.startsWith('can_') || c.includes('is_') || c === 'is_active' || c === 'is_staff' || c === 'is_superuser' || c === 'is_verified' || c === 'is_present' || c === 'use_custom_window' || c === 'include_mep' || c === 'include_finishing' || c === 'auto_generated' || c === 'emailed' || c === 'ac_provision') {
        return 'true';
    }
    
    if (c.includes('status')) return "'Active'";
    if (c.includes('role')) return "'Manager'";
    if (c.includes('type')) return "'General'";
    if (c.includes('phone')) return "'+1234567890'";
    if (c.includes('address')) return "'123 Main St'";
    
    return "'value'";
};

const getSnippet = (op, model) => {
    if (!model) return '';
    switch(op) {
        case 'SELECT':
            if (model.customSelect) return model.customSelect;
            return `SELECT * FROM ${model.table}${model.orderBy ? ` ORDER BY ${model.orderBy}` : ''} LIMIT 30`;
        case 'INSERT': {
            const colsToInsert = model.cols.split(',').map(c => c.trim()).filter(c => c !== 'id');
            // Generate 3 rows of slightly varied sample data
            const makeRow = (idx) => {
                const vals = colsToInsert.map(c => {
                    const base = getSampleValue(c, model.table);
                    // Vary string values with a suffix so rows are unique
                    if (base.startsWith("'") && base !== 'true' && base !== 'false' && !base.includes('@') && !base.includes('-')) {
                        const inner = base.slice(1, -1);
                        if (inner && !inner.match(/^\d/) && !inner.includes(':')) {
                            return `'${inner} ${idx}'`;
                        }
                    }
                    return base;
                });
                return `  (${vals.join(', ')})`;
            };
            const rows = [makeRow(1), makeRow(2), makeRow(3)].join(',\n');
            return `INSERT INTO ${model.table} (${colsToInsert.join(', ')})\nVALUES\n${rows}`;
        }
        case 'UPDATE': {
            const sets = model.cols.split(',').filter(c => c.trim() !== 'id').map(c => `${c.trim()} = ${getSampleValue(c, model.table)}`).join(',\n    ');
            return `UPDATE ${model.table}\nSET\n    ${sets}\nWHERE id = ${getSampleValue('id', model.table)}`;
        }
        case 'DELETE':
            return `DELETE FROM ${model.table}\nWHERE id = ${getSampleValue('id', model.table)}`;
        default:
            return '';
    }
};

function SqlTerminalTab({ user }) {
    const [sql, setSql]             = useState('SELECT id, name, address FROM core_houseproject ORDER BY created_at DESC LIMIT 20');
    const [operation, setOperation] = useState('SELECT');
    const [selectedModel, setSelectedModel] = useState(null);
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

            const isWrite = /^\s*(INSERT|UPDATE|DELETE)/i.test(sql);
            if (isWrite && r.data.success && !r.data.columns?.includes('Error') && selectedModel) {
                // Auto-run SELECT query to show the updated list in the table
                const selectSql = `SELECT * FROM ${selectedModel.table} ORDER BY id DESC LIMIT 10`;
                try {
                    const r2 = await dataTransferService.runSql(selectSql);
                    if (r2.data.success) {
                        setResult(r2.data);
                    }
                } catch (e2) {
                    // Ignore select error so we don't overwrite successful write status
                }
            }
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
            {/* Quick queries builder */}
            <div>
                <Label>1. Select Operation</Label>
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {['SELECT', 'INSERT', 'UPDATE', 'DELETE'].map(op => (
                        <button
                            key={op}
                            onClick={() => setOperation(op)}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                                operation === op 
                                    ? 'bg-slate-800 text-white' 
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {op}
                        </button>
                    ))}
                </div>
                
                <Label>2. Generate Query for Model</Label>
                <div className="flex flex-wrap gap-1.5">
                    {MODELS.map(model => (
                        <button
                            key={model.label}
                            onClick={() => { setSql(getSnippet(operation, model)); setSelectedModel(model); setResult(null); setError(null); }}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            {model.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div className="rounded-xl overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-800">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <I name="terminal" size={12} cls="text-slate-400" />
                        SQL — SELECT, INSERT, UPDATE, DELETE · Ctrl+Enter to run
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

            {/* Example Values Card – shows below editor for INSERT / UPDATE */}
            {selectedModel && (operation === 'INSERT' || operation === 'UPDATE') && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-blue-100">
                        <I name="warn" size={12} cls="text-blue-500" />
                        <span className="text-[11px] font-semibold text-blue-700">
                            Example values for <strong>{selectedModel.label}</strong> — replace before running
                        </span>
                    </div>
                    <div className="px-3.5 py-2.5 flex flex-wrap gap-x-6 gap-y-1.5">
                        {selectedModel.cols.split(',').map(col => (
                            <div key={col.trim()} className="flex items-center gap-2 text-[11px]">
                                <span className="font-mono text-blue-800 font-semibold">{col.trim()}</span>
                                <span className="text-slate-400">→</span>
                                <span className="font-mono text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">{getSampleValue(col)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                Queries run against the live production database. Results are capped at 500 rows.
            </Alert>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSV / EXCEL TAB
// ═══════════════════════════════════════════════════════════════════════════════

const CSV_TYPES = [
    { id: 'workforce',  label: 'Workforce Members', icon: '👷', desc: 'Bulk add / update staff' },
    { id: 'materials',  label: 'Materials',          icon: '🧱', desc: 'Inventory & price list'  },
    { id: 'attendance', label: 'Attendance Records', icon: '📋', desc: 'Export only'             },
];

function ActionRow({ label, children }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--color-border, #e2e8f0)' }}>
            <span style={{ width: 160, fontSize: 12, fontWeight: 600, color: '#64748b', flexShrink: 0 }}>{label}</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
        </div>
    );
}

function CsvBtn({ onClick, disabled, children, color = '#6366f1', small }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: small ? '5px 12px' : '7px 16px',
                borderRadius: 8, border: 'none',
                background: disabled ? '#e2e8f0' : color,
                color: disabled ? '#94a3b8' : '#fff',
                fontWeight: 700, fontSize: small ? 11 : 12,
                cursor: disabled ? 'not-allowed' : 'pointer',
            }}
        >
            {children}
        </button>
    );
}

function PreviewTable({ rows }) {
    if (!rows?.length) return null;
    const cols = Object.keys(rows[0]).filter(k => k !== 'error');
    const ACTION_COLOR = { new: '#059669', exists: '#d97706', error: '#ef4444' };
    return (
        <div style={{ overflowX: 'auto', marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                    <tr style={{ background: '#f8fafc' }}>
                        {cols.map(c => (
                            <th key={c} style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', borderBottom: '1px solid #e2e8f0' }}>
                                {c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.slice(0, 50).map((row, i) => (
                        <tr key={i} style={{ background: row.action === 'error' ? '#fef2f2' : i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                            {cols.map(c => (
                                <td key={c} style={{
                                    padding: '6px 12px',
                                    color: c === 'action' ? (ACTION_COLOR[row[c]] || '#334155') : '#334155',
                                    fontWeight: c === 'action' ? 700 : 400,
                                    borderBottom: '1px solid #f1f5f9',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {String(row[c] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length > 50 && (
                <div style={{ padding: '6px 12px', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #e2e8f0' }}>
                    Showing 50 of {rows.length} rows
                </div>
            )}
        </div>
    );
}

function CsvTab({ user }) {
    const { activeProjectId: projectId } = useConstruction();

    const [csvType,   setCsvType]   = useState('workforce');
    const [file,      setFile]      = useState(null);
    const [preview,   setPreview]   = useState(null);   // dry-run result
    const [result,    setResult]    = useState(null);   // import result
    const [jobs,      setJobs]      = useState([]);
    const [busy,      setBusy]      = useState('');     // 'dryrun'|'import'|'export'|''
    const [error,     setError]     = useState('');

    const fileRef = useRef();

    const loadJobs = useCallback(async () => {
        if (!projectId) return;
        try {
            const data = await dtSvc.csvJobs(projectId);
            setJobs(data.jobs || []);
        } catch { /* non-fatal */ }
    }, [projectId]);

    useEffect(() => { loadJobs(); }, [loadJobs]);

    const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    const handleExport = async (fmt) => {
        if (!projectId) return;
        setBusy('export'); setError('');
        try {
            const res = await dtSvc.csvExport(projectId, csvType, fmt);
            const ext = fmt === 'xlsx' ? 'xlsx' : 'csv';
            downloadBlob(res.data, `${csvType}_${projectId}.${ext}`);
        } catch (e) {
            setError(e?.response?.data?.error || e.message || 'Export failed');
        } finally {
            setBusy('');
        }
    };

    const handleTemplate = async (fmt) => {
        setBusy('template'); setError('');
        try {
            const res = await dtSvc.csvTemplate(csvType, fmt);
            const ext = fmt === 'xlsx' ? 'xlsx' : 'csv';
            downloadBlob(res.data, `template_${csvType}.${ext}`);
        } catch (e) {
            setError(e?.response?.data?.error || e.message || 'Template download failed');
        } finally {
            setBusy('');
        }
    };

    const handleDryRun = async () => {
        if (!file || !projectId) return;
        setBusy('dryrun'); setError(''); setPreview(null); setResult(null);
        try {
            const res = await dtSvc.csvDryRun(projectId, csvType, file);
            setPreview(res.data);
        } catch (e) {
            setError(e?.response?.data?.error || e.message || 'Dry run failed');
        } finally {
            setBusy('');
        }
    };

    const handleImport = async () => {
        if (!file || !projectId) return;
        setBusy('import'); setError(''); setResult(null);
        try {
            const res = await dtSvc.csvImport(projectId, csvType, file);
            setResult(res.data);
            setPreview(null);
            setFile(null);
            if (fileRef.current) fileRef.current.value = '';
            loadJobs();
        } catch (e) {
            setError(e?.response?.data?.error || e.message || 'Import failed');
        } finally {
            setBusy('');
        }
    };

    const isAttendance = csvType === 'attendance';
    const canImport    = !isAttendance;

    return (
        <div style={{ paddingTop: 20 }}>
            {/* Type selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {CSV_TYPES.map(t => (
                    <button
                        key={t.id}
                        onClick={() => { setCsvType(t.id); setFile(null); setPreview(null); setResult(null); setError(''); }}
                        style={{
                            padding: '8px 16px', borderRadius: 10,
                            border: `2px solid ${csvType === t.id ? '#6366f1' : '#e2e8f0'}`,
                            background: csvType === t.id ? '#6366f115' : '#fff',
                            color: csvType === t.id ? '#4338ca' : '#64748b',
                            fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        }}
                    >
                        {t.icon} {t.label}
                        <span style={{ fontSize: 10, fontWeight: 400, display: 'block', color: '#94a3b8' }}>{t.desc}</span>
                    </button>
                ))}
            </div>

            {/* Export section */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 8 }}>📥 Export</div>
                <ActionRow label="Download existing data">
                    <CsvBtn onClick={() => handleExport('csv')} disabled={busy === 'export' || !projectId}>
                        {busy === 'export' ? '⏳ Exporting…' : '⬇ CSV'}
                    </CsvBtn>
                    <CsvBtn onClick={() => handleExport('xlsx')} disabled={busy === 'export' || !projectId} color="#059669">
                        ⬇ Excel (.xlsx)
                    </CsvBtn>
                </ActionRow>
                {canImport && (
                    <ActionRow label="Download blank template">
                        <CsvBtn onClick={() => handleTemplate('csv')} disabled={busy === 'template'} color="#d97706" small>
                            📄 CSV template
                        </CsvBtn>
                        <CsvBtn onClick={() => handleTemplate('xlsx')} disabled={busy === 'template'} color="#b45309" small>
                            📊 Excel template
                        </CsvBtn>
                    </ActionRow>
                )}
            </div>

            {/* Import section */}
            {canImport && (
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 8 }}>📤 Import</div>

                    <ActionRow label="1. Choose file">
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={e => { setFile(e.target.files[0] || null); setPreview(null); setResult(null); setError(''); }}
                            style={{ fontSize: 12, color: '#334155' }}
                        />
                        {file && <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ {file.name}</span>}
                    </ActionRow>

                    <ActionRow label="2. Preview (dry run)">
                        <CsvBtn onClick={handleDryRun} disabled={!file || busy === 'dryrun'} color="#6366f1">
                            {busy === 'dryrun' ? '⏳ Checking…' : '🔍 Preview Import'}
                        </CsvBtn>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>No data is written</span>
                    </ActionRow>

                    {preview && (
                        <div style={{ marginTop: 10 }}>
                            <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 700, flexWrap: 'wrap' }}>
                                <span style={{ color: '#059669' }}>🟢 {preview.new_rows} new</span>
                                <span style={{ color: '#d97706' }}>🟡 {preview.existing_rows} already exist (will skip)</span>
                                <span style={{ color: '#ef4444' }}>🔴 {preview.error_rows} errors</span>
                            </div>
                            <PreviewTable rows={preview.preview} />

                            {preview.can_import && (
                                <div style={{ marginTop: 12 }}>
                                    <ActionRow label="3. Commit import">
                                        <CsvBtn onClick={handleImport} disabled={busy === 'import'} color="#059669">
                                            {busy === 'import' ? '⏳ Importing…' : `✅ Import ${preview.new_rows} rows`}
                                        </CsvBtn>
                                    </ActionRow>
                                </div>
                            )}

                            {preview.errors?.length > 0 && (
                                <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5' }}>
                                    <div style={{ fontWeight: 700, fontSize: 12, color: '#991b1b', marginBottom: 6 }}>Row errors (fix these in your file before importing):</div>
                                    {preview.errors.slice(0, 10).map((e, i) => (
                                        <div key={i} style={{ fontSize: 11, color: '#7f1d1d' }}>Row {e.row}: {e.message}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Result banner */}
            {result && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #86efac', marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, color: '#166534', fontSize: 13, marginBottom: 4 }}>✅ Import complete</div>
                    <div style={{ fontSize: 12, color: '#15803d' }}>{result.message}</div>
                    {result.errors?.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 11, color: '#92400e' }}>
                            {result.errors.slice(0, 5).map((e, i) => <div key={i}>Row {e.row}: {e.message}</div>)}
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', fontWeight: 600, fontSize: 12, marginBottom: 12 }}>
                    {error}
                </div>
            )}

            {/* Import history */}
            {jobs.length > 0 && (
                <div style={{ marginTop: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 10 }}>📜 Import History</div>
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    {['Type', 'File', 'Status', 'Imported', 'Skipped', 'Failed', 'By', 'Date'].map(h => (
                                        <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map((j, i) => (
                                    <tr key={j.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{j.import_type}</td>
                                        <td style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{j.file_name}</td>
                                        <td style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', color: j.status === 'done' ? '#059669' : j.status === 'failed' ? '#ef4444' : '#d97706', fontWeight: 700 }}>{j.status}</td>
                                        <td style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', color: '#059669', fontWeight: 700 }}>{j.rows_imported}</td>
                                        <td style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', color: '#d97706' }}>{j.rows_skipped}</td>
                                        <td style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', color: '#ef4444' }}>{j.rows_failed}</td>
                                        <td style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{j.created_by}</td>
                                        <td style={{ padding: '6px 12px', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                            {j.created_at ? new Date(j.created_at).toLocaleDateString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY TAB  — GitOps production deployer & live monitor
// ═══════════════════════════════════════════════════════════════════════════════
function DeployTab({ user }) {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deploying, setDeploying] = useState(false);
    const [configured, setConfigured] = useState(true);
    const [feedback, setFeedback] = useState(null);
    const [error, setError] = useState(null);

    const loadRuns = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const r = await dtSvc.getDeployStatus();
            if (r.data?.success) {
                setRuns(r.data.runs || []);
                setConfigured(r.data.configured);
            } else {
                setError(r.data?.error || 'Failed to fetch deploy status.');
            }
        } catch (e) {
            setError(e.response?.data?.error || 'Could not connect to deployment logs.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRuns();
        const interval = setInterval(() => {
            loadRuns(true);
        }, 8000); // Poll every 8 seconds
        return () => clearInterval(interval);
    }, [loadRuns]);

    const handleDeploy = async () => {
        if (!window.confirm("क्या तपाईं साच्चिकै यो भर्सन उत्पादन (Production) सर्भरमा पठाउन चाहनुहुन्छ? (Deploy to Production?)")) {
            return;
        }
        setDeploying(true);
        setFeedback(null);
        setError(null);
        try {
            const r = await dtSvc.triggerDeploy();
            if (r.data?.success) {
                setFeedback({ type: 'success', msg: r.data.message });
                loadRuns();
            } else {
                setError(r.data?.error || 'Failed to trigger deploy.');
            }
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to start deployment workflow.');
        } finally {
            setDeploying(false);
        }
    };

    if (!isAdmin(user)) {
        return (
            <div className="py-12 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                    <I name="shield" size={26} cls="text-slate-300" />
                </div>
                <div>
                    <p className="font-semibold text-slate-700 text-[14px]">Admin access required</p>
                    <p className="text-slate-400 text-[12px] mt-1 max-w-xs leading-relaxed">
                        Production deployments trigger GitHub Actions pipelines.<br />
                        Only staff and system administrators can trigger builds.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <Label>ConstructPro Control Center — GitOps Deployer</Label>
                <p className="text-[12px] text-slate-400 mb-4 leading-relaxed">
                    यो प्रणालीले तपाईंको कोडलाई GitHub Actions मार्फत स्वतः कम्पाइल गरेर उत्पादन सर्भर (VPS) मा पुर्‍याउँछ।
                    अहिलेको भर्सन लाइभ गर्न तलको <strong>"Deploy to Production"</strong> बटन थिच्नुहोस्।
                </p>
            </div>

            {/* Config alert */}
            {!configured && (
                <Alert type="warn">
                    <strong>GitHub Token Missing:</strong> <code>GITHUB_DEPLOY_TOKEN</code> is not set in the server environment variables.
                    Deployments will fall back to public fetch, which may fail due to authentication/rate-limits. Please configure the token on the server.
                </Alert>
            )}

            {/* Trigger Button */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center animate-pulse">
                        <I name="rocket" size={18} />
                    </div>
                    <div>
                        <h4 className="text-[13px] font-bold text-slate-800">Production Deploy</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Build branch <strong>main</strong> & restart containers</p>
                    </div>
                </div>
                <button
                    onClick={handleDeploy}
                    disabled={deploying}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-white font-bold text-[12px] uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 shadow-lg"
                    style={{
                        background: 'linear-gradient(135deg, #ea580c, #f97316)',
                        boxShadow: '0 4px 14px rgba(249, 115, 22, 0.3)'
                    }}
                >
                    {deploying ? (
                        <>
                            <I name="spin" size={12} cls="animate-spin" />
                            Deploying...
                        </>
                    ) : (
                        <>
                            🚀 Deploy to Production
                        </>
                    )}
                </button>
            </div>

            {feedback && <Alert type={feedback.type}>{feedback.msg}</Alert>}
            {error && <Alert type="error">{error}</Alert>}

            {/* Run history list */}
            <div style={{ marginTop: 24 }}>
                <div className="flex items-center justify-between mb-3">
                    <Label>📡 GitHub Actions Run History (अहिलेको प्रगतिको इतिहास)</Label>
                    <button
                        onClick={() => loadRuns()}
                        disabled={loading}
                        className="text-[10px] text-slate-500 hover:text-slate-800 font-bold uppercase tracking-wider flex items-center gap-1"
                    >
                        <I name="spin" size={10} cls={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {loading && runs.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-[12px]">
                        <I name="spin" size={14} cls="animate-spin" /> Loading run history...
                    </div>
                ) : runs.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-[12px] border border-dashed border-slate-200 rounded-lg">
                        No workflow runs detected on this branch.
                    </div>
                ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                        {runs.map((run) => {
                            const isRunning = run.status === 'in_progress' || run.status === 'queued';
                            const isSuccess = run.conclusion === 'success';
                            const isFailed = run.conclusion === 'failure' || run.conclusion === 'cancelled';
                            
                            const statusColor = isRunning ? 'amber'
                                : isSuccess ? 'green'
                                : isFailed ? 'red' : 'slate';

                            const statusText = isRunning ? '🔄 ' + run.status.toUpperCase()
                                : isSuccess ? '✅ SUCCESS'
                                : isFailed ? '❌ ' + (run.conclusion || 'FAILED').toUpperCase()
                                : '⚪ ' + run.status.toUpperCase();

                            return (
                                <div key={run.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-[13px] text-slate-800 truncate block max-w-md">
                                                {run.commit_msg || run.name || 'Workflow Trigger'}
                                            </span>
                                            <Badge color={statusColor}>{statusText}</Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                                            <span>Actor: <strong className="text-slate-600">@{run.trigger_by}</strong></span>
                                            <span>•</span>
                                            <span>Event: <strong className="text-slate-600">{run.event}</strong></span>
                                            <span>•</span>
                                            <span>Created: <strong>{new Date(run.created_at).toLocaleTimeString()}</strong></span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                        <a
                                            href={run.html_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-600 flex items-center gap-1.5 shadow-sm transition-all"
                                        >
                                            👁️ View on GitHub
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Alert type="info">
                <strong>GitOps Deployment flow:</strong> यो ड्यासबोर्डले GitHub Actions मा रहेको <code>deploy.yml</code> पाइपलाइनलाई सक्रिय गर्छ।
                पाइपलाइन चल्दा पहिले कोडको शुद्धता (Lint tests) जाँचिन्छ र सफल भएपछि मात्र नयाँ सर्भर कन्टेनर सुरु गरिन्छ।
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
        { id: 'export',   label: 'Export',        icon: 'download' },
        { id: 'import',   label: 'SQL Import',    icon: 'upload',   badge: admin ? null : 'Admin' },
        { id: 'csv',      label: 'CSV / Excel',   icon: 'table'    },
        { id: 'terminal', label: 'SQL Terminal',  icon: 'terminal', badge: admin ? null : 'Admin' },
        { id: 'deploy',   label: 'Deploy System', icon: 'deploy',   badge: admin ? null : 'Admin' },
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
                            You have <strong>export-only</strong> access. Import, SQL Terminal, and Deployments require admin privileges.
                        </Alert>
                    </div>
                )}

                {/* Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <Tabs tabs={tabs} active={tab} onChange={setTab} />

                    {tab === 'export'   && <ExportTab      user={user} />}
                    {tab === 'import'   && <ImportTab      user={user} />}
                    {tab === 'csv'      && <CsvTab         user={user} />}
                    {tab === 'terminal' && <SqlTerminalTab user={user} />}
                    {tab === 'deploy'   && <DeployTab      user={user} />}
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
