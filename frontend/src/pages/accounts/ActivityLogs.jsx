import React, { useState, useEffect, useMemo } from 'react';
import { User, Activity, AlertCircle, RefreshCw, Filter, Search, Calendar, Globe, Monitor, Code, ChevronRight } from 'lucide-react';
import { accountsService } from '../../services/api';
import MobileLayout from '../../components/mobile/MobileLayout';

const ActivityLogs = () => {
    const [isMobile] = useState(window.innerWidth < 1024);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Advanced States
    const [filters, setFilters] = useState({ model: 'ALL', action: 'ALL', user: 'ALL' });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLog, setSelectedLog] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

    // Derived Data: Filtered Logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchModel = filters.model === 'ALL' || log.model_name === filters.model;
            const matchAction = filters.action === 'ALL' || log.action === filters.action;
            const matchUser = filters.user === 'ALL' || log.username === filters.user;
            const matchSearch = !searchQuery || 
                log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.object_repr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.username?.toLowerCase().includes(searchQuery.toLowerCase());
            
            return matchModel && matchAction && matchUser && matchSearch;
        });
    }, [logs, filters, searchQuery]);

    // Derived Data: Groups
    const modelOptions = useMemo(() => ['ALL', ...new Set(logs.map(l => l.model_name))].sort(), [logs]);
    const userOptions = useMemo(() => ['ALL', ...new Set(logs.map(l => l.username))].sort(), [logs]);
    const actionOptions = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'PAY'];

    const groupedLogs = useMemo(() => {
        const groups = {};
        filteredLogs.forEach(log => {
            const date = new Date(log.timestamp).toLocaleDateString(undefined, { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });
            const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const label = date === today ? 'Today' : date;
            
            if (!groups[label]) groups[label] = [];
            groups[label].push(log);
        });
        return groups;
    }, [filteredLogs]);

    const getActionStyles = (action) => {
        switch (action) {
            case 'LOGIN': return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
            case 'CREATE': return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
            case 'UPDATE': return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
            case 'DELETE': return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
            default: return { color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
        }
    };

    const headerExtra = (
        <button
            onClick={fetchLogs}
            disabled={loading}
            className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center border border-slate-100 transition-all active:rotate-180 disabled:opacity-50"
        >
            <RefreshCw size={16} className={loading ? "animate-spin text-emerald-600" : "text-emerald-600"} />
        </button>
    );

    const content = (
        <div className="space-y-8 pb-32 max-w-6xl mx-auto">
            {/* Filters Bar */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                        type="text"
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50/50 border border-slate-100 pl-11 pr-4 py-3 rounded-2xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                        <Filter size={14} className="text-slate-400" />
                        <select 
                            value={filters.model}
                            onChange={(e) => setFilters({...filters, model: e.target.value})}
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                        >
                            {modelOptions.map(m => <option key={m} value={m}>{m === 'ALL' ? 'All Departments' : m}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                        <User size={14} className="text-slate-400" />
                        <select 
                            value={filters.user}
                            onChange={(e) => setFilters({...filters, user: e.target.value})}
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                        >
                            {userOptions.map(u => <option key={u} value={u}>{u === 'ALL' ? 'All Users' : u}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Error UI */}
            {error && (
                <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-3xl flex items-center gap-4 text-red-600 animate-in zoom-in-95">
                    <div className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest leading-none">Telemetry Error</p>
                        <p className="text-[10px] font-bold opacity-70 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Logs Timeline */}
            <div className="relative">
                {loading && !logs.length ? (
                    <div className="py-40 flex flex-col items-center justify-center text-slate-300">
                        <Activity size={64} className="animate-pulse opacity-20 mb-4" />
                        <p className="text-xs font-black uppercase tracking-[0.3em]">Connecting to Audit Stream...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 italic">
                        <p className="text-sm font-bold opacity-30 uppercase tracking-widest">No activity matches your filters</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(groupedLogs).map(([date, items]) => (
                            <div key={date} className="space-y-6">
                                <div className="flex items-center gap-4 px-4">
                                    <div className="h-px flex-1 bg-slate-100"></div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                                        <Calendar size={12} /> {date}
                                    </h3>
                                    <div className="h-px flex-1 bg-slate-100"></div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {items.map((log) => {
                                        const styles = getActionStyles(log.action);
                                        return (
                                            <div 
                                                key={log.id} 
                                                onClick={() => { setSelectedLog(log); setIsDrawerOpen(true); }}
                                                className="group relative bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-2px] hover:border-emerald-500/20 transition-all cursor-pointer overflow-hidden"
                                            >
                                                {/* Action Accent */}
                                                <div className={`absolute top-0 left-0 w-1.5 h-full ${styles.bg}`}></div>
                                                
                                                <div className="flex items-center gap-6">
                                                    <div className={`w-12 h-12 rounded-2xl ${styles.bg} ${styles.color} flex items-center justify-center font-black text-xs shadow-inner group-hover:scale-110 transition-transform`}>
                                                        {log.action.charAt(0)}
                                                    </div>
                                                    
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] font-black text-slate-800 tracking-tight">{log.username}</span>
                                                                <span className="text-[8px] text-slate-300">•</span>
                                                                <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg ${styles.bg} ${styles.color} border ${styles.border}`}>
                                                                    {log.action}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-400 tracking-tighter">
                                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-600 line-clamp-1">
                                                            {log.description || `${log.action} ${log.model_name}`}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                                {log.model_name}
                                                            </span>
                                                            {log.changes && (
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                    <Code size={10} /> Has Diffs
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <ChevronRight size={18} className="text-slate-200 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Log Detail Drawer */}
            {selectedLog && (
                <div className={`fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300`}>
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
                    <div className={`relative w-full max-w-lg h-full bg-white shadow-2xl border-l border-slate-100 flex flex-col transition-transform duration-500 ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        
                        {/* Drawer Header */}
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl ${getActionStyles(selectedLog.action).bg} ${getActionStyles(selectedLog.action).color} flex items-center justify-center text-xl`}>
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 leading-tight tracking-tight">Audit Detail</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Transaction ID: {selectedLog.id}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsDrawerOpen(false)}
                                className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
                            >✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                            {/* Summary Card */}
                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">Event Summary</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Performed By</p>
                                        <p className="text-xs font-black text-slate-800">{selectedLog.username}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Timestamp</p>
                                        <p className="text-xs font-black text-slate-800">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Model Affected</p>
                                        <p className="text-xs font-black text-emerald-600">{selectedLog.model_name}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Action Type</p>
                                        <p className={`text-xs font-black ${getActionStyles(selectedLog.action).color}`}>{selectedLog.action}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl mt-4">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">Technical Description</p>
                                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic">"{selectedLog.description}"</p>
                                </div>
                            </section>

                            {/* Changes Context */}
                            {selectedLog.changes && (
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">Change Delta</h3>
                                    <div className="bg-slate-900 rounded-2xl p-6 overflow-x-auto shadow-2xl">
                                        <div className="flex items-center gap-2 mb-4 text-amber-500">
                                            <Code size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Formatted Diff</span>
                                        </div>
                                        <pre className="text-[11px] text-emerald-400 font-mono leading-relaxed">
                                            {JSON.stringify(selectedLog.changes, null, 4)}
                                        </pre>
                                    </div>
                                </section>
                            )}

                            {/* Network & Source */}
                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">Technical Trace</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <Globe size={14} className="text-slate-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">IP Address</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">{selectedLog.ip_address || 'Internal Signal'}</span>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Monitor size={14} className="text-slate-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Source Agent</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-600 break-words leading-relaxed bg-white p-3 rounded-xl border border-slate-100 italic">
                                            {selectedLog.user_agent || 'Server Process'}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <Activity size={14} className="text-slate-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">API Endpoint</span>
                                        </div>
                                        <code className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded shadow-sm">{selectedLog.method}: {selectedLog.endpoint}</code>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-8 border-t border-slate-50 bg-slate-50 flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Security Audit v2.0 • Active</span>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${selectedLog.success ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{selectedLog.success ? 'Success' : 'Failed'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (isMobile) {
        return (
            <MobileLayout title="Audit Logs" subtitle="Security Stream" headerExtra={headerExtra}>
                {content}
            </MobileLayout>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-12">
            {content}
        </div>
    );
};

export default ActivityLogs;
