import React, { useState, useRef, useCallback } from 'react';
import { importService } from '../services/api.js';
import { useConstruction } from '../context/ConstructionContext';

// ── Icons (inline SVGs to avoid lucide dependency issues) ────────────────────
const UploadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);
const FileIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
);
const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const AlertIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

// ── Sample SQL template the user can download ──────────────────────────────
const SAMPLE_SQL = `-- Construction DB Sample Import
-- Safe statements: INSERT / UPDATE only

INSERT INTO tasks_task (title, description, status, created_at, updated_at)
VALUES
  ('Foundation Inspection', 'Check all footings and reinforcement', 'pending', NOW(), NOW()),
  ('Plumbing Rough-in',     'Install first-floor water lines',       'in_progress', NOW(), NOW());

UPDATE tasks_task
SET status = 'completed'
WHERE title = 'Site Survey';
`;

function downloadTemplate() {
    const blob = new Blob([SAMPLE_SQL], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_template.sql';
    a.click();
    URL.revokeObjectURL(url);
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function DataImportPage() {
    const { user } = useConstruction();
    const fileInputRef = useRef(null);

    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState(null);
    const [previewLines, setPreviewLines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [result, setResult] = useState(null); // { success, statements_executed, total_statements, errors, message, preview }
    const [error, setError] = useState(null);

    // ── Admin guard ─────────────────────────────────────────────────────────
    if (!user?.is_superuser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
                <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-12 text-center max-w-md">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-red-400 mb-2">Admin Only</h2>
                    <p className="text-slate-400">SQL Data Import is restricted to superuser accounts.</p>
                </div>
            </div>
        );
    }

    // ── File handling ────────────────────────────────────────────────────────
    const handleFile = useCallback((selectedFile) => {
        if (!selectedFile) return;
        if (!selectedFile.name.toLowerCase().endsWith('.sql')) {
            setError('Only .sql files are accepted.');
            return;
        }
        setError(null);
        setResult(null);
        setFile(selectedFile);

        const reader = new FileReader();
        reader.onload = (e) => {
            const lines = e.target.result.split('\n').slice(0, 30);
            setPreviewLines(lines);
        };
        reader.readAsText(selectedFile);
    }, []);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
    }, [handleFile]);

    const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const onDragLeave = () => setDragOver(false);

    // ── Import ───────────────────────────────────────────────────────────────
    const handleImport = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setResult(null);
        setUploadProgress(0);

        try {
            const res = await importService.importSql(file, (e) => {
                if (e.total) {
                    setUploadProgress(Math.round((e.loaded / e.total) * 100));
                }
            });
            setResult(res.data);
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Import failed.';
            const data = err.response?.data;
            if (data) {
                setResult({ ...data, success: false });
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const reset = () => {
        setFile(null);
        setPreviewLines([]);
        setResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-10">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xl">
                        📥
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">SQL Data Import</h1>
                        <p className="text-slate-400 text-sm">डाटा आयात — Upload and execute SQL files against the database</p>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        INSERT / UPDATE allowed
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
                        🚫 DROP / TRUNCATE / ALTER blocked
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                        🔐 Superuser only
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* ── Left: Upload ─────────────────────────────────────────── */}
                <div className="space-y-5">
                    {/* Drop zone */}
                    <div
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onClick={() => !file && fileInputRef.current?.click()}
                        className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer
                            ${dragOver
                                ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                                : file
                                    ? 'border-emerald-500/50 bg-emerald-500/5 cursor-default'
                                    : 'border-slate-600 bg-slate-800/50 hover:border-indigo-500/60 hover:bg-indigo-500/5'
                            }`}
                        style={{ minHeight: 180 }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".sql"
                            className="hidden"
                            onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                        <div className="flex flex-col items-center justify-center p-10 text-center">
                            {file ? (
                                <>
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
                                        <FileIcon />
                                    </div>
                                    <p className="text-white font-semibold">{file.name}</p>
                                    <p className="text-slate-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                </>
                            ) : (
                                <>
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all
                                        ${dragOver ? 'bg-indigo-500/30 text-indigo-300 scale-110' : 'bg-slate-700/50 text-slate-400'}`}
                                    >
                                        <UploadIcon />
                                    </div>
                                    <p className="text-slate-300 font-medium">Drag & drop your <span className="text-indigo-400">.sql</span> file here</p>
                                    <p className="text-slate-500 text-sm mt-1">or click to browse</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Error message */}
                    {error && !result && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
                            <span className="text-red-400 mt-0.5"><AlertIcon /></span>
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleImport}
                            disabled={!file || loading}
                            className="flex-1 py-3.5 rounded-2xl font-semibold text-white transition-all duration-300
                                bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-indigo-600 disabled:hover:to-violet-600
                                shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {uploadProgress > 0 && uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Executing...'}
                                </span>
                            ) : '📥 Run Import'}
                        </button>
                        {file && (
                            <button
                                onClick={reset}
                                className="px-5 py-3.5 rounded-2xl font-semibold text-slate-300 bg-slate-700/60 border border-slate-600/60
                                    hover:bg-slate-700 hover:text-white transition-all duration-200"
                            >
                                Clear
                            </button>
                        )}
                        <button
                            onClick={downloadTemplate}
                            className="px-5 py-3.5 rounded-2xl font-semibold text-slate-300 bg-slate-700/60 border border-slate-600/60
                                hover:bg-slate-700 hover:text-white transition-all duration-200 whitespace-nowrap"
                            title="Download sample SQL template"
                        >
                            ⬇ Template
                        </button>
                    </div>

                    {/* Upload progress bar */}
                    {loading && uploadProgress > 0 && (
                        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    )}

                    {/* Info card */}
                    <div className="p-4 rounded-2xl bg-amber-500/8 border border-amber-500/20">
                        <div className="flex gap-2 items-start">
                            <span className="text-amber-400 mt-0.5"><AlertIcon /></span>
                            <div>
                                <p className="text-amber-300 text-sm font-semibold mb-1">Important Notes</p>
                                <ul className="text-amber-200/70 text-xs space-y-1 list-disc list-inside">
                                    <li>All statements run in a single transaction — any error rolls back everything</li>
                                    <li>DROP TABLE, TRUNCATE, ALTER TABLE, DELETE (without WHERE) are blocked</li>
                                    <li>File must be UTF-8 encoded .sql format</li>
                                    <li>Use the Template button to see the expected format</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Right: Preview + Results ─────────────────────────────── */}
                <div className="space-y-5">
                    {/* SQL Preview */}
                    {previewLines.length > 0 && !result && (
                        <div className="rounded-3xl bg-slate-900/80 border border-slate-700/60 overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/60">
                                <span className="text-slate-300 text-sm font-semibold">📄 File Preview (first 30 lines)</span>
                                <span className="text-slate-500 text-xs">{file?.name}</span>
                            </div>
                            <div className="overflow-auto" style={{ maxHeight: 340 }}>
                                <pre className="p-5 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                                    {previewLines.map((line, i) => (
                                        <div key={i} className="flex gap-3">
                                            <span className="text-slate-600 select-none w-5 shrink-0 text-right">{i + 1}</span>
                                            <span className={
                                                line.trim().startsWith('--') ? 'text-slate-500 italic' :
                                                    /^(INSERT|UPDATE|SELECT|CREATE|SET|USE)\b/i.test(line.trim()) ? 'text-indigo-300' :
                                                        'text-slate-300'
                                            }>{line}</span>
                                        </div>
                                    ))}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Results panel */}
                    {result && (
                        <div className={`rounded-3xl border overflow-hidden ${result.success ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-red-500/40 bg-red-500/5'}`}>
                            {/* Result header */}
                            <div className={`flex items-center gap-3 px-5 py-4 border-b ${result.success ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${result.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {result.success ? <CheckIcon /> : <XIcon />}
                                </div>
                                <div>
                                    <p className={`font-semibold ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
                                        {result.success ? 'Import Successful' : 'Import Failed — Rolled Back'}
                                    </p>
                                    <p className="text-slate-400 text-xs">{result.message}</p>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-px bg-slate-700/30">
                                {[
                                    { label: 'Statements Executed', value: result.statements_executed ?? 0, color: 'text-emerald-400' },
                                    { label: 'Total Statements', value: result.total_statements ?? 0, color: 'text-slate-300' },
                                ].map(s => (
                                    <div key={s.label} className="bg-slate-800/60 p-5 text-center">
                                        <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                                        <div className="text-slate-500 text-xs mt-1">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Error detail */}
                            {result.errors?.length > 0 && (
                                <div className="p-5 space-y-3">
                                    <p className="text-red-400 text-sm font-semibold">Errors:</p>
                                    {result.errors.map((err, i) => (
                                        <div key={i} className="rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                                            <p className="text-red-300 text-xs font-mono">[stmt #{err.index}] {err.statement}</p>
                                            <p className="text-red-400 text-xs mt-1">↳ {err.error}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Preview of executed statements */}
                            {result.success && result.preview?.length > 0 && (
                                <div className="p-5 border-t border-emerald-500/20">
                                    <p className="text-emerald-400 text-sm font-semibold mb-3">Executed Statements (first {result.preview.length}):</p>
                                    <div className="space-y-2 overflow-auto" style={{ maxHeight: 240 }}>
                                        {result.preview.map((stmt, i) => (
                                            <div key={i} className="flex gap-2 items-start">
                                                <span className="text-emerald-500 mt-0.5 shrink-0"><CheckIcon /></span>
                                                <code className="text-emerald-200/70 text-xs font-mono">{stmt}</code>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* New import button */}
                            <div className="p-5 border-t border-slate-700/40">
                                <button
                                    onClick={reset}
                                    className="w-full py-3 rounded-2xl font-semibold text-slate-300 bg-slate-700/60 border border-slate-600/60 hover:bg-slate-700 hover:text-white transition-all"
                                >
                                    Import Another File
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {!previewLines.length && !result && (
                        <div className="rounded-3xl border border-slate-700/40 bg-slate-800/30 flex flex-col items-center justify-center p-16 text-center" style={{ minHeight: 260 }}>
                            <div className="text-5xl mb-4 opacity-30">🗄️</div>
                            <p className="text-slate-500 text-sm">Upload a .sql file to see a preview and import it</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
