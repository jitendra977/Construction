import React, { useState, useRef, useCallback } from 'react';
import { importService } from '../services/api.js';
import { useConstruction } from '../context/ConstructionContext';
import MobileLayout from '../components/mobile/MobileLayout';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Database, Terminal } from 'lucide-react';

export default function DataImportPage() {
    const { user } = useConstruction();
    const [isMobile] = useState(window.innerWidth < 1024);
    const fileInputRef = useRef(null);

    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState(null);
    const [previewLines, setPreviewLines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    if (!user?.is_superuser) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-8">
                <div className="card-glass border-red-100 rounded-[2rem] p-12 text-center max-w-md shadow-lg">
                    <div className="text-6xl mb-4">🔐</div>
                    <h2 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Access Denied</h2>
                    <p className="text-slate-500 font-medium text-[11px]">Superuser clearance required for direct data injection.</p>
                </div>
            </div>
        );
    }

    const handleFile = useCallback((selectedFile) => {
        if (!selectedFile) return;
        if (!selectedFile.name.toLowerCase().endsWith('.sql')) {
            setError('SQL fragments only (.sql)');
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

    const handleImport = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await importService.importSql(file);
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'System rejection.');
        } finally {
            setLoading(false);
        }
    };

    const headerExtra = (
        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
            <Database size={18} />
        </div>
    );

    const content = (
        <div className="space-y-8 pb-12">
            <div className="card-glass rounded-[2rem] p-8 border border-slate-50 relative overflow-hidden group">
                <div 
                    onClick={() => !file && fileInputRef.current?.click()}
                    className={`relative rounded-3xl border-2 border-dashed transition-all duration-500 py-12 flex flex-col items-center justify-center text-center cursor-pointer ${file ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/10'}`}
                >
                    <input ref={fileInputRef} type="file" accept=".sql" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                    <Upload className={`mb-4 transition-all ${file ? 'text-emerald-600 scale-110' : 'text-slate-300'}`} size={40} />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-800">{file ? file.name : 'Upload SQL Batch'}</p>
                    {!file && <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">or drag & drop</p>}
                </div>

                <div className="mt-8 flex gap-3">
                    <button 
                        onClick={handleImport} 
                        disabled={!file || loading}
                        className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg disabled:opacity-30"
                    >
                        {loading ? 'Executing...' : 'Run Import'}
                    </button>
                    {file && <button onClick={() => { setFile(null); setPreviewLines([]); setResult(null); }} className="px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px]">Clear</button>}
                </div>
            </div>

            {result && (
                <div className={`card-glass rounded-[2rem] p-8 border ${result.success ? 'border-emerald-100 bg-emerald-50/20' : 'border-red-100 bg-red-50/20'}`}>
                    <div className="flex items-center gap-4 mb-6">
                        {result.success ? <CheckCircle className="text-emerald-500" /> : <XCircle className="text-red-500" />}
                         <div>
                            <p className="font-black text-slate-800 uppercase tracking-tight text-[11px]">{result.success ? 'Stream Complete' : 'Process Aborted'}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{result.message}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="card-glass rounded-[2rem] p-8 border border-slate-50 space-y-6">
                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                    <Terminal size={14} /> System Protocols
                </h3>
                <ul className="space-y-3">
                    {['Read-only objects protected', 'ACID compliant execution', 'Superuser clearance required'].map((text, i) => (
                        <li key={i} className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-200"></span> {text}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <MobileLayout title="Import" subtitle="Data Injection Hub" headerExtra={headerExtra}>
                {content}
            </MobileLayout>
        );
    }

    return <div className="p-12 max-w-5xl mx-auto">{content}</div>;
}
