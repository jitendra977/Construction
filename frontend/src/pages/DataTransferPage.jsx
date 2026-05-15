import React, { useState, useRef, useCallback, useEffect } from 'react';
import { dataTransferService } from '../services/api.js';
import { useConstruction } from '../context/ConstructionContext';

// ── Icons ──────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, className = '', fill = 'none' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
        stroke="currentColor" strokeWidth={2} strokeLinecap="round"
        strokeLinejoin="round" className={className}>
        <path d={d} />
    </svg>
);
const IcoDownload    = p => <Icon {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const IcoUpload      = p => <Icon {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const IcoDatabase    = p => <Icon {...p} d="M12 2a9 3 0 1 0 0 6 9 3 0 0 0 0-6zM3 5v4c0 1.657 4.03 3 9 3s9-1.343 9-3V5M3 13v4c0 1.657 4.03 3 9 3s9-1.343 9-3v-4" />;
const IcoCheck       = p => <Icon {...p} d="M20 6L9 17l-5-5" />;
const IcoX           = p => <Icon {...p} d="M18 6L6 18M6 6l12 12" />;
const IcoFile        = p => <Icon {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />;
const IcoRefresh     = p => <Icon {...p} d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />;
const IcoTable       = p => <Icon {...p} d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />;
const IcoShield      = p => <Icon {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IcoZap         = p => <Icon {...p} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />;
const IcoLayers      = p => <Icon {...p} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />;
const IcoArchive     = p => <Icon {...p} d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />;
const IcoAlertTri   = p => <Icon {...p} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />;
const IcoChevronDown = p => <Icon {...p} d="M6 9l6 6 6-6" />;
const IcoStar        = p => <Icon {...p} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDate = iso => iso
    ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

const fmtSize = bytes => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

const isAdmin = user =>
    user?.is_superuser || user?.is_staff || user?.is_system_admin;

// ── Access badge ───────────────────────────────────────────────────────────────
function AccessBadge({ user }) {
    const level = user?.is_superuser ? 'Super Admin'
        : user?.is_system_admin    ? 'System Admin'
        : user?.is_staff           ? 'Staff Admin'
        : 'Member';
    const color = user?.is_superuser ? 'bg-violet-100 text-violet-700 border-violet-200'
        : (user?.is_system_admin || user?.is_staff) ? 'bg-blue-100 text-blue-700 border-blue-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${color}`}>
            <IcoShield size={10} />
            {level}
        </span>
    );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Pill({ label, value, color = 'blue' }) {
    const c = {
        blue:   'bg-blue-50 text-blue-700 border-blue-200',
        green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-200',
        violet: 'bg-violet-50 text-violet-700 border-violet-200',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${c[color]}`}>
            {label}: <strong>{value}</strong>
        </span>
    );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHead({ icon: Ico, title, subtitle, accent = 'blue' }) {
    const bg = { blue: 'bg-blue-600', green: 'bg-emerald-600', violet: 'bg-violet-600' };
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className={`w-9 h-9 rounded-xl ${bg[accent]} flex items-center justify-center shadow-sm`}>
                <Ico size={17} className="text-white" />
            </div>
            <div>
                <h2 className="text-[14px] font-black text-slate-800 leading-tight">{title}</h2>
                {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider({ label }) {
    return (
        <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            {label && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>}
            <div className="flex-1 h-px bg-slate-200" />
        </div>
    );
}

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, selected, onSelect }) {
    return (
        <button
            onClick={() => onSelect(project)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all group ${
                selected
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm hover:bg-blue-50/20'
            }`}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className={`font-bold text-[13px] truncate ${selected ? 'text-blue-800' : 'text-slate-800'}`}>
                        {project.name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {project.owner} · {project.address}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 hidden sm:block">{fmtDate(project.start_date)}</span>
                    {selected
                        ? <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                              <IcoCheck size={11} className="text-white" />
                          </div>
                        : <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-blue-400 transition-colors" />
                    }
                </div>
            </div>
        </button>
    );
}

// ── Table row for export stats ────────────────────────────────────────────────
function StatRow({ model, table, rows }) {
    if (rows === 0) return null;
    return (
        <div className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
                <IcoTable size={11} className="text-slate-400 shrink-0" />
                <span className="text-[11px] text-slate-700 font-medium truncate">{model}</span>
                <span className="text-[10px] text-slate-400 hidden sm:block">({table})</span>
            </div>
            <span className="text-[11px] font-black text-slate-700 shrink-0 ml-2">{rows.toLocaleString()}</span>
        </div>
    );
}

// ── Toast / Feedback ──────────────────────────────────────────────────────────
function Feedback({ type, message, detail }) {
    if (!message) return null;
    const styles = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        error:   'bg-red-50 border-red-200 text-red-600',
        info:    'bg-blue-50 border-blue-200 text-blue-700',
    };
    const icons = { success: IcoCheck, error: IcoX, info: IcoZap };
    const Ico = icons[type] || IcoCheck;
    return (
        <div className={`flex items-start gap-3 border rounded-xl px-4 py-3 ${styles[type]}`}>
            <Ico size={15} className="shrink-0 mt-0.5" />
            <div>
                <p className="text-[12px] font-bold">{message}</p>
                {detail && <p className="text-[11px] mt-0.5 opacity-80">{detail}</p>}
            </div>
        </div>
    );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, color = 'blue' }) {
    const bar = { blue: 'bg-blue-500', green: 'bg-emerald-500', violet: 'bg-violet-500' };
    return (
        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
                className={`${bar[color]} h-1.5 rounded-full transition-all duration-300`}
                style={{ width: `${value}%` }}
            />
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORT PANEL
// ────────────────────────────────────────────────────────────────────────────
function ExportPanel({ user }) {
    const [projects, setProjects]         = useState([]);
    const [loadingProjects, setLoadingP]  = useState(true);
    const [selected, setSelected]         = useState(null);
    const [stats, setStats]               = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [exporting, setExporting]       = useState(false);
    const [feedback, setFeedback]         = useState(null);
    const [showStats, setShowStats]       = useState(true);

    useEffect(() => {
        dataTransferService.listProjects()
            .then(r => { setProjects(r.data.projects ?? r.data); })
            .catch(() => {})
            .finally(() => setLoadingP(false));
    }, []);

    const handleSelect = async proj => {
        setSelected(proj); setStats(null); setFeedback(null); setStatsLoading(true);
        try {
            const r = await dataTransferService.getExportStats(proj.id);
            setStats(r.data);
        } catch { setStats(null); }
        finally { setStatsLoading(false); }
    };

    const handleExport = async () => {
        if (!selected || exporting) return;
        setExporting(true); setFeedback(null);
        try {
            const r = await dataTransferService.exportProject(selected.id);
            const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `project_${selected.id}_${selected.name.replace(/\s+/g,'_').toLowerCase()}_${now}.sql`;
            downloadBlob(r.data, filename);
            setFeedback({ type: 'success', message: `Downloaded: ${filename}`, detail: `${stats?.total_rows?.toLocaleString() ?? '—'} rows exported` });
        } catch (e) {
            setFeedback({ type: 'error', message: e.response?.data?.error || 'Export failed. Please try again.' });
        } finally { setExporting(false); }
    };

    const handleFullBackup = async () => {
        if (exporting) return;
        setExporting(true); setFeedback(null);
        try {
            const r = await dataTransferService.exportFullSystem();
            const ts = new Date().toISOString().slice(0,10);
            downloadBlob(r.data, `full_system_backup_${ts}.sql`);
            setFeedback({ type: 'success', message: 'Full system backup downloaded.', detail: 'All projects included' });
        } catch {
            setFeedback({ type: 'error', message: 'Full system export failed.' });
        } finally { setExporting(false); }
    };

    return (
        <div className="flex flex-col h-full gap-5">
            <SectionHead
                icon={IcoDownload}
                accent="blue"
                title="Export Project"
                subtitle="Download project data as a portable SQL backup"
            />

            {/* Project selector */}
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    {projects.length} Project{projects.length !== 1 ? 's' : ''} available
                </p>
                {loadingProjects ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
                        <IcoRefresh size={15} className="animate-spin" /> Loading...
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">No projects found.</div>
                ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                        {projects.map(p => (
                            <ProjectCard key={p.id} project={p} selected={selected?.id === p.id} onSelect={handleSelect} />
                        ))}
                    </div>
                )}
            </div>

            {/* Stats panel */}
            {selected && (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <button
                        onClick={() => setShowStats(s => !s)}
                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <IcoDatabase size={13} className="text-slate-500" />
                            <span className="text-[12px] font-bold text-slate-700">Export Preview</span>
                            {statsLoading && <IcoRefresh size={12} className="animate-spin text-slate-400" />}
                        </div>
                        <div className="flex items-center gap-2">
                            {stats && (
                                <div className="flex gap-1.5">
                                    <Pill label="Tables" value={stats.tables?.filter(t => t.rows > 0).length} color="blue" />
                                    <Pill label="Rows" value={stats.total_rows?.toLocaleString()} color="green" />
                                </div>
                            )}
                            <IcoChevronDown
                                size={14}
                                className={`text-slate-400 transition-transform ${showStats ? 'rotate-180' : ''}`}
                            />
                        </div>
                    </button>
                    {showStats && (
                        <div className="px-2 py-2 max-h-40 overflow-y-auto border-t border-slate-200">
                            {stats ? (
                                stats.tables?.length > 0
                                    ? stats.tables.map((t, i) => <StatRow key={i} {...t} />)
                                    : <p className="text-center text-slate-400 text-sm py-3">No data to export</p>
                            ) : (
                                !statsLoading && (
                                    <p className="text-center text-slate-400 text-sm py-3">
                                        {selected ? 'Stats unavailable' : 'Select a project'}
                                    </p>
                                )
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Feedback */}
            {feedback && <Feedback {...feedback} />}

            {/* Export button */}
            <button
                onClick={handleExport}
                disabled={!selected || exporting}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-[13px] transition-all ${
                    !selected || exporting
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-md hover:shadow-lg'
                }`}
            >
                {exporting
                    ? <><IcoRefresh size={15} className="animate-spin" /> Generating SQL…</>
                    : <><IcoDownload size={15} /> Export Selected Project</>
                }
            </button>

            {/* Full system backup */}
            {isAdmin(user) && (
                <>
                    <Divider label="System Administration" />
                    <button
                        onClick={handleFullBackup}
                        disabled={exporting}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-blue-500 text-blue-600 font-black text-[12px] hover:bg-blue-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <IcoLayers size={15} />
                        Full System Backup — All Projects
                    </button>
                    <p className="text-[10px] text-slate-400 text-center -mt-3">
                        Exports every project in the system as a single SQL file.
                    </p>
                </>
            )}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// IMPORT PANEL
// ────────────────────────────────────────────────────────────────────────────
function ImportPanel({ user }) {
    const fileInputRef = useRef(null);
    const [dragOver, setDragOver]   = useState(false);
    const [file, setFile]           = useState(null);
    const [preview, setPreview]     = useState([]);
    const [loading, setLoading]     = useState(false);
    const [progress, setProgress]   = useState(0);
    const [result, setResult]       = useState(null);
    const [error, setError]         = useState(null);
    const [showPreview, setShowPrev] = useState(true);

    const canImport = isAdmin(user);

    const handleFile = useCallback(f => {
        if (!f) return;
        if (!f.name.toLowerCase().endsWith('.sql')) {
            setError('Only .sql files are accepted.');
            return;
        }
        setError(null); setResult(null); setFile(f);
        const reader = new FileReader();
        reader.onload = e => setPreview(e.target.result.split('\n').slice(0, 30));
        reader.readAsText(f);
    }, []);

    const handleDrop = useCallback(e => {
        e.preventDefault(); setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    }, [handleFile]);

    const clearFile = e => {
        e.stopPropagation();
        setFile(null); setPreview([]); setResult(null); setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImport = async () => {
        if (!file || !canImport) return;
        setLoading(true); setError(null); setResult(null); setProgress(0);
        try {
            const r = await dataTransferService.importSql(file, evt => {
                if (evt.total) setProgress(Math.round(evt.loaded / evt.total * 100));
            });
            setResult(r.data);
        } catch (e) {
            setError(e.response?.data?.error || e.response?.data?.message || 'Import failed.');
        } finally { setLoading(false); setProgress(0); }
    };

    if (!canImport) {
        return (
            <div className="flex flex-col h-full">
                <SectionHead icon={IcoUpload} accent="green" title="Import Data" subtitle="Restore from SQL backup" />
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-10">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <IcoShield size={28} className="text-slate-400" />
                    </div>
                    <div className="text-center">
                        <p className="font-black text-slate-700 text-[15px]">Admin Access Required</p>
                        <p className="text-slate-500 text-[12px] text-center max-w-xs mt-1 leading-relaxed">
                            SQL import executes directly against the database.<br />
                            Contact your system administrator to perform imports.
                        </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 max-w-xs">
                        <div className="flex items-start gap-2">
                            <IcoAlertTri size={13} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-700">
                                Staff, System Admins, and Super Admins have import access.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-5">
            <SectionHead
                icon={IcoUpload}
                accent="green"
                title="Import SQL Data"
                subtitle="Restore from a .sql backup file — all statements run atomically"
            />

            {/* Drop zone */}
            <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !file && fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed transition-all ${
                    dragOver
                        ? 'border-emerald-400 bg-emerald-50 scale-[1.01] cursor-copy'
                        : file
                        ? 'border-emerald-400 bg-emerald-50/60 cursor-default'
                        : 'border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer'
                }`}
            >
                <input ref={fileInputRef} type="file" accept=".sql" className="hidden"
                    onChange={e => handleFile(e.target.files[0])} />

                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    file ? 'bg-emerald-100' : 'bg-slate-200'
                }`}>
                    {file
                        ? <IcoCheck size={22} className="text-emerald-600" />
                        : <IcoUpload size={22} className="text-slate-500" />
                    }
                </div>

                {file ? (
                    <div className="text-center px-4">
                        <p className="font-bold text-emerald-700 text-[13px]">{file.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{fmtSize(file.size)} · SQL file ready</p>
                    </div>
                ) : (
                    <div className="text-center px-4">
                        <p className="font-bold text-slate-600 text-[13px]">Drop .sql file here</p>
                        <p className="text-[11px] text-slate-400 mt-1">or click to browse your files</p>
                    </div>
                )}

                {/* Change / clear button when file selected */}
                {file && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            className="text-[11px] text-emerald-600 font-bold hover:underline"
                        >Change file</button>
                        <span className="text-slate-300">·</span>
                        <button onClick={clearFile} className="text-[11px] text-red-500 font-bold hover:underline">
                            Remove
                        </button>
                    </div>
                )}
            </div>

            {/* SQL Preview */}
            {preview.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <button
                        onClick={() => setShowPrev(s => !s)}
                        className="w-full px-4 py-2 bg-slate-800 flex items-center justify-between hover:bg-slate-700 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <IcoFile size={12} className="text-slate-400" />
                            <span className="text-[11px] text-slate-300 font-mono">
                                Preview — first {Math.min(preview.length, 30)} lines
                            </span>
                        </div>
                        <IcoChevronDown
                            size={13}
                            className={`text-slate-400 transition-transform ${showPreview ? 'rotate-180' : ''}`}
                        />
                    </button>
                    {showPreview && (
                        <pre className="text-[10px] font-mono bg-slate-900 px-4 py-3 max-h-36 overflow-y-auto leading-relaxed">
                            {preview.map((l, i) => (
                                <span key={i} className={`block ${
                                    l.startsWith('--') ? 'text-slate-500'
                                    : l.toUpperCase().startsWith('INSERT') ? 'text-emerald-400'
                                    : l.toUpperCase().startsWith('--') ? 'text-slate-500'
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
                        <span>Uploading…</span>
                        <span>{progress}%</span>
                    </div>
                    <ProgressBar value={progress} color="green" />
                </div>
            )}

            {/* Result: success */}
            {result?.success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                            <IcoCheck size={14} className="text-white" />
                        </div>
                        <p className="font-black text-emerald-700 text-[13px]">{result.message}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Pill label="Imported" value={result.statements_executed} color="green" />
                        <Pill label="Total"    value={result.total_statements}    color="blue"  />
                        {result.statements_skipped > 0 && (
                            <Pill label="Skipped" value={result.statements_skipped} color="yellow" />
                        )}
                    </div>
                    {result.statements_skipped > 0 && (
                        <p className="text-[11px] text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                            ⚠ {result.statements_skipped} row(s) skipped — old integer IDs that have no matching record in the new schema. All other data was imported successfully.
                        </p>
                    )}
                    {result.preview?.length > 0 && (
                        <pre className="text-[10px] font-mono text-emerald-800 bg-emerald-100 rounded-lg p-2.5 max-h-24 overflow-y-auto">
                            {result.preview.slice(0, 10).join('\n')}
                        </pre>
                    )}
                </div>
            )}

            {/* Result: error */}
            {(error || (result && !result.success)) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-start gap-2">
                        <IcoX size={14} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="font-bold text-red-600 text-[12px]">{error || result?.message}</p>
                    </div>
                    {result?.errors?.slice(0, 5).map((e, i) => (
                        <p key={i} className="text-[10px] text-red-500 font-mono pl-5">
                            #{e.index}: {e.error}
                        </p>
                    ))}
                    {result?.errors?.length > 5 && (
                        <p className="text-[10px] text-red-400 pl-5">…and {result.errors.length - 5} more errors</p>
                    )}
                </div>
            )}

            {/* Import button */}
            <button
                onClick={handleImport}
                disabled={!file || loading}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-[13px] transition-all ${
                    !file || loading
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-md hover:shadow-lg'
                }`}
            >
                {loading
                    ? <><IcoRefresh size={15} className="animate-spin" /> Importing…</>
                    : <><IcoUpload size={15} /> Execute SQL Import</>
                }
            </button>

            {/* Safety note */}
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                <IcoShield size={13} className="text-amber-500 shrink-0" />
                <p className="text-[11px] text-amber-700">
                    All statements execute in one transaction — any error triggers a full rollback. DROP/TRUNCATE blocked.
                </p>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// WHAT'S INCLUDED SIDEBAR CARDS
// ────────────────────────────────────────────────────────────────────────────
const EXPORT_CONTENTS = [
    { icon: IcoLayers,  label: 'Structure',   items: ['Phases, floors & rooms', 'Project members', 'Construction timeline'] },
    { icon: IcoZap,     label: 'Tasks',        items: ['Tasks & updates', 'Task media & logs', 'Phase assignments'] },
    { icon: IcoArchive, label: 'Finance',      items: ['Budget categories', 'Bills & expenses', 'Payments & transfers'] },
    { icon: IcoDatabase,label: 'Resources',    items: ['Materials & stock', 'Contractors & labor', 'Supplier rates'] },
];

function IncludesPanel() {
    return (
        <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Export includes</p>
            {EXPORT_CONTENTS.map(({ icon: Ico, label, items }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Ico size={13} className="text-blue-500" />
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">{label}</span>
                    </div>
                    <ul className="space-y-1">
                        {items.map(it => (
                            <li key={it} className="flex items-center gap-2 text-[11px] text-slate-500">
                                <IcoCheck size={9} className="text-emerald-500 shrink-0" />
                                {it}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// HELP / GUIDE PANEL
// ────────────────────────────────────────────────────────────────────────────
const GUIDE = [
    {
        q: 'के हो यो प्रणाली? (What is this?)',
        a: 'यो प्रणालीले तपाइँको निर्माण परियोजनाको सबै जानकारी (बजेट, टास्क, फोटो, हिसाब-किताब) लाई सुरक्षित SQL फाइलमा बदल्न र फेरि लोड गर्न मद्दत गर्छ।'
    },
    {
        q: 'कसरी Export गर्ने? (How to export?)',
        a: 'बायाँ तर्फको Export panel बाट आफ्नो परियोजना छान्नुहोस्, "Export Preview" मा डाटा जाँच्नुहोस्, र "Export Selected Project" बटन थिच्नुहोस्।'
    },
    {
        q: 'कसरी Import गर्ने? (How to import?)',
        a: 'दायाँ तर्फको Import panel मा .sql फाइल drag & drop वा browse गरेर अपलोड गर्नुहोस्, preview जाँच्नुहोस्, र "Execute SQL Import" बटन थिच्नुहोस्।'
    },
    {
        q: 'कसले Import गर्न सक्छ? (Who can import?)',
        a: 'Staff Admin, System Admin, र Super Admin ले Import गर्न सक्छन्। सामान्य project member ले Export मात्र गर्न सक्छन्।'
    },
    {
        q: 'के Import गर्दा डाटा हराउँछ? (Is import safe?)',
        a: 'हैन। सबै SQL statements एउटै transaction मा चल्छन्। कुनै पनि गल्ती भएमा सबै पूर्ण रूपमा rollback हुन्छ। साथै DROP/TRUNCATE स्वतः block हुन्छ।'
    },
];

function HelpSection() {
    const [open, setOpen] = useState(null);
    return (
        <div className="space-y-2">
            {GUIDE.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <button
                        onClick={() => setOpen(open === i ? null : i)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                <span className="text-blue-600 font-black text-[11px]">{i + 1}</span>
                            </div>
                            <span className="font-bold text-slate-700 text-[12px] leading-tight">{item.q}</span>
                        </div>
                        <IcoChevronDown
                            size={14}
                            className={`text-slate-400 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`}
                        />
                    </button>
                    {open === i && (
                        <div className="px-4 pb-4 pt-1">
                            <p className="text-[12px] text-slate-600 leading-relaxed pl-8">{item.a}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────────────
export default function DataTransferPage() {
    const { user } = useConstruction();
    const [activeGuide, setActiveGuide] = useState(false);

    const admin = isAdmin(user);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 p-4 md:p-6 pb-20">
            <div className="max-w-7xl mx-auto space-y-5">

                {/* ── Top bar ─────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg rotate-3">
                            <IcoDatabase size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 leading-tight">Data Transfer</h1>
                            <p className="text-[12px] text-slate-500">डाटा स्थानान्तरण · Project SQL Backup & Restore</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <AccessBadge user={user} />
                        {admin && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                <IcoStar size={9} />
                                Import Enabled
                            </span>
                        )}
                        <button
                            onClick={() => setActiveGuide(g => !g)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                                activeGuide
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
                            }`}
                        >
                            <IcoFile size={11} />
                            {activeGuide ? 'Hide Guide' : 'Guide (निर्देशिका)'}
                        </button>
                    </div>
                </div>

                {/* ── Alert for non-admins ─────────────────────────────── */}
                {!admin && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <IcoAlertTri size={15} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[12px] font-bold text-amber-700">You have Export-only access</p>
                            <p className="text-[11px] text-amber-600 mt-0.5">
                                Select a project and export it as an SQL backup. Import requires admin privileges.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Guide panel (collapsible) ────────────────────────── */}
                {activeGuide && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                                <IcoFile size={14} className="text-white" />
                            </div>
                            <div>
                                <h2 className="font-black text-slate-800 text-[14px]">प्रणाली निर्देशिका</h2>
                                <p className="text-[11px] text-slate-500">Frequently asked questions · कसरी प्रयोग गर्ने</p>
                            </div>
                        </div>
                        <HelpSection />
                    </div>
                )}

                {/* ── Main two-column layout ───────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">

                    {/* Left: Export */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <ExportPanel user={user} />
                    </div>

                    {/* Right: Import */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <ImportPanel user={user} />
                    </div>
                </div>

                {/* ── Bottom info cards ────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <IncludesPanel />
                </div>

                {/* ── Safety note strip ────────────────────────────────── */}
                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                    <IcoShield size={16} className="text-blue-500 shrink-0" />
                    <p className="text-[11px] text-slate-600">
                        <strong>Security:</strong> Exports use <code className="bg-slate-100 px-1 rounded text-[10px]">ON CONFLICT DO NOTHING</code> for safe re-imports.
                        Imports block <code className="bg-slate-100 px-1 rounded text-[10px]">DROP TABLE</code>, <code className="bg-slate-100 px-1 rounded text-[10px]">TRUNCATE</code>, and unscoped <code className="bg-slate-100 px-1 rounded text-[10px]">DELETE</code> statements.
                        All operations are fully transactional.
                    </p>
                </div>

            </div>
        </div>
    );
}
