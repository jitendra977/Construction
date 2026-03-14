import React, { useState, useEffect } from 'react';
import { User, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { accountsService } from '../../services/api';
import MobileLayout from '../../components/mobile/MobileLayout';

const ActivityLogs = () => {
    const [isMobile] = useState(window.innerWidth < 1024);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await accountsService.getActivityLogs();
            setLogs(response.data);
        } catch (err) {
            console.error('Failed to fetch activity logs', err);
            setError('System link failure. Retry recommended.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getActionColor = (action) => {
        switch (action) {
            case 'LOGIN': return 'text-blue-500 bg-blue-50';
            case 'CREATE': return 'text-emerald-500 bg-emerald-50';
            case 'UPDATE': return 'text-teal-500 bg-teal-50';
            case 'DELETE': return 'text-red-500 bg-red-50';
            default: return 'text-slate-500 bg-slate-50';
        }
    };

    const headerExtra = (
        <button
            onClick={fetchLogs}
            disabled={loading}
            className="w-10 h-10 bg-white/50 backdrop-blur-md rounded-xl flex items-center justify-center border border-slate-100 shadow-sm transition-all active:rotate-180 disabled:opacity-50"
        >
            <RefreshCw size={16} className={loading ? "animate-spin text-emerald-600" : "text-emerald-600"} />
        </button>
    );

    const content = (
        <div className="space-y-6 pb-12">
            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                    <AlertCircle size={18} />
                    <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                </div>
            )}

            <div className="card-glass rounded-[2rem] p-6 shadow-sm min-h-[400px]">
                {loading && !logs.length ? (
                    <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Scanning History...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-24 text-center text-slate-500">
                        <Activity size={40} className="mx-auto mb-4 opacity-20" />
                        <h3 className="text-xs font-black uppercase tracking-widest">No Telemetry</h3>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {logs.map((log) => (
                            <div key={log.id} className="p-4 bg-white/50 rounded-2xl border border-slate-50 flex flex-col gap-3 group">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs uppercase">
                                            {log.username?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-800 tracking-tight">{log.username}</p>
                                            <p className="text-[9px] text-slate-400 mono">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg ${getActionColor(log.action)}`}>
                                        {log.action}
                                    </span>
                                </div>
                                <div className="pl-11">
                                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                                        {log.description || `${log.action} ${log.model_name}`}
                                    </p>
                                    <p className="text-[8px] text-slate-300 mt-1 mono uppercase">{log.model_name} | {log.ip_address}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <MobileLayout title="Audit Logs" subtitle="Security Stream" headerExtra={headerExtra}>
                {content}
            </MobileLayout>
        );
    }

    return <div className="p-12 max-w-5xl mx-auto">{content}</div>;
};

export default ActivityLogs;
