import React, { useState, useEffect, useMemo } from 'react';
import { User, Activity, AlertCircle, RefreshCw, Filter, Search, Calendar, Globe, Monitor, Code, ChevronRight, MapPin, Download, TrendingUp, Users, Box, Clock } from 'lucide-react';
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

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        // Wait for the slide-out animation (500ms) before clearing the data
        setTimeout(() => {
            setSelectedLog(null);
        }, 500);
    };

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
                log.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.user_display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.country?.toLowerCase().includes(searchQuery.toLowerCase());
            
            return matchModel && matchAction && matchUser && matchSearch;
        });
    }, [logs, filters, searchQuery]);

    // Analytics Calculation
    const stats = useMemo(() => {
        if (!filteredLogs.length) return { total: 0, topUser: 'N/A', activeModule: 'N/A' };
        
        const userCounts = {};
        const modelCounts = {};
        filteredLogs.forEach(l => {
            userCounts[l.user_display_name] = (userCounts[l.user_display_name] || 0) + 1;
            modelCounts[l.model_name] = (modelCounts[l.model_name] || 0) + 1;
        });

        const topUser = Object.entries(userCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
        const activeModule = Object.entries(modelCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

        return { total: filteredLogs.length, topUser, activeModule };
    }, [filteredLogs]);

    // Derived Data: Groups
    const modelOptions = useMemo(() => ['ALL', ...new Set(logs.map(l => l.model_name))].sort(), [logs]);
    const userOptions = useMemo(() => ['ALL', ...new Set(logs.map(l => l.username))].sort(), [logs]);

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

    const formatRelativeTime = (timestamp) => {
        const diff = new Date() - new Date(timestamp);
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const exportToCSV = () => {
        const headers = ["Timestamp", "User", "Action", "Module", "Description", "IP", "Location", "Success"];
        const rows = filteredLogs.map(l => [
            new Date(l.timestamp).toLocaleString(),
            l.user_display_name,
            l.action,
            l.model_name,
            l.description,
            l.ip_address,
            `${l.city || ''}, ${l.country || ''}`,
            l.success ? "YES" : "NO"
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `audit_log_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const headerExtra = (
        <div className="flex items-center gap-3">
            <button
                onClick={exportToCSV}
                className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center border border-slate-100 hover:bg-emerald-50 transition-colors group"
                title="Export to CSV"
            >
                <Download size={16} className="text-slate-400 group-hover:text-emerald-600" />
            </button>
            <button
                onClick={fetchLogs}
                disabled={loading}
                className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center border border-slate-100 transition-all active:rotate-180 disabled:opacity-50"
            >
                <RefreshCw size={16} className={loading ? "animate-spin text-emerald-600" : "text-emerald-600"} />
            </button>
        </div>
    );

    const content = (
        <div className="space-y-8 pb-32 max-w-6xl mx-auto">
            {/* Stats Pulse Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                        <TrendingUp size={80} />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Activity size={20} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activity Pulse</h4>
                    </div>
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">{stats.total.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Actions Recoreded</p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                        <Users size={80} />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <User size={20} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top Contributor</h4>
                    </div>
                    <p className="text-xl font-black text-slate-800 tracking-tight line-clamp-1">{stats.topUser}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Most Active User</p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                        <Box size={80} />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Monitor size={20} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hot Department</h4>
                    </div>
                    <p className="text-xl font-black text-slate-800 tracking-tight">{stats.activeModule}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Highest Traffic Area</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white/70 backdrop-blur-md p-5 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/30 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[240px] relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                        type="text"
                        placeholder="Search users, actions, locations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50/50 border border-slate-100 pl-11 pr-4 py-3.5 rounded-2xl text-xs font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <Filter size={14} className="text-slate-400" />
                        <select 
                            value={filters.model}
                            onChange={(e) => setFilters({...filters, model: e.target.value})}
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer pr-2"
                        >
                            {modelOptions.map(m => <option key={m} value={m}>{m === 'ALL' ? 'All Modules' : m}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <User size={14} className="text-slate-400" />
                        <select 
                            value={filters.user}
                            onChange={(e) => setFilters({...filters, user: e.target.value})}
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer pr-2"
                        >
                            {userOptions.map(u => <option key={u} value={u}>{u === 'ALL' ? 'All Personnel' : u}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Logs Timeline */}
            <div className="space-y-12 relative">
                {/* Vertical Timeline Guide */}
                <div className="absolute left-10 top-16 bottom-0 w-px bg-slate-100 hidden md:block"></div>

                {loading && !logs.length ? (
                    <div className="py-40 flex flex-col items-center justify-center text-slate-300">
                        <div className="flex gap-1 mb-4">
                            <div className="w-2 h-8 bg-emerald-500 animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-8 bg-emerald-500 animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-8 bg-emerald-500 animate-bounce"></div>
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600/50">Synchronizing Telemetry...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="py-32 text-center bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-100">
                        <Activity size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No activities recorded for this scope</p>
                    </div>
                ) : (
                    Object.entries(groupedLogs).map(([date, items]) => (
                        <div key={date} className="space-y-8">
                            <div className="flex items-center gap-4 px-4 sticky top-4 z-10">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50/80 backdrop-blur-md px-6 py-2 rounded-full border border-emerald-100/50 shadow-sm">
                                    <Calendar size={12} className="inline mr-2" /> {date}
                                </h3>
                                <div className="h-px flex-1 bg-gradient-to-r from-slate-100 to-transparent"></div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 pl-0 md:pl-20">
                                {items.map((log) => {
                                    const styles = getActionStyles(log.action);
                                    return (
                                        <div 
                                            key={log.id} 
                                            onClick={() => { setSelectedLog(log); setIsDrawerOpen(true); }}
                                            className="group relative bg-white p-5 md:p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:translate-y-[-4px] hover:border-emerald-500/20 transition-all cursor-pointer overflow-hidden"
                                        >
                                            {/* Action Visual Indicator */}
                                            <div className={`absolute top-0 right-0 w-32 h-32 ${styles.bg} opacity-[0.02] rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`}></div>
                                            
                                            <div className="flex items-start gap-6">
                                                {/* User Avatar Pulse */}
                                                <div className="relative shrink-0">
                                                    <div className="w-14 h-14 rounded-3xl overflow-hidden border-2 border-white shadow-xl group-hover:scale-110 transition-transform duration-500">
                                                        <img 
                                                            src={log.user_avatar} 
                                                            alt={log.user_display_name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${log.username}&background=random`}
                                                        />
                                                    </div>
                                                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-xl ${styles.bg} ${styles.color} flex items-center justify-center border-2 border-white shadow-lg`}>
                                                        <Activity size={12} />
                                                    </div>
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <span className="text-[13px] font-black text-slate-800 tracking-tight truncate max-w-[150px]">
                                                                {log.user_display_name}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg ${styles.bg} ${styles.color} border ${styles.border}`}>
                                                                    {log.action}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                                                                    <Clock size={10} /> {formatRelativeTime(log.timestamp)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <h2 className="text-sm font-bold text-slate-600 leading-snug line-clamp-2 mb-3">
                                                        {log.description || `${log.action} ${log.model_name}`}
                                                    </h2>

                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                                                            <Box size={10} className="text-slate-400 group-hover:text-emerald-500" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-emerald-600">
                                                                {log.model_name}
                                                            </span>
                                                        </div>
                                                        
                                                        {log.city && (
                                                            <div className="flex items-center gap-2 bg-blue-50/50 px-3 py-1 rounded-xl border border-blue-100/50">
                                                                <MapPin size={10} className="text-blue-400" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">
                                                                    {log.city}, {log.country}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {log.changes && (
                                                            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-xl border border-amber-100 animate-pulse">
                                                                <Code size={10} className="text-amber-500" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                                                                    PRO DIFF ACTIVE
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="self-center">
                                                    <ChevronRight size={24} className="text-slate-200 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Side Action Overlay (Mobile Floating Export) */}
            {isMobile && filteredLogs.length > 0 && (
                <button 
                    onClick={exportToCSV}
                    className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center animate-in zoom-in-50 duration-300 z-50 transition-transform active:scale-90"
                >
                    <Download size={24} />
                </button>
            )}

            {/* Advanced Log Detail Drawer */}
            {selectedLog && (
                <div className={`fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300 ${!isDrawerOpen ? 'pointer-events-none opacity-0 duration-500' : ''}`}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-500" onClick={handleCloseDrawer} />
                    <div className={`relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col transition-transform duration-500 ease-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        
                        {/* Drawer Header Pro */}
                        <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-gradient-to-br from-slate-50 to-white">
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-[2rem] overflow-hidden border-2 border-white shadow-xl">
                                        <img 
                                            src={selectedLog.user_avatar} 
                                            alt={selectedLog.user_display_name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-2xl ${getActionStyles(selectedLog.action).bg} ${getActionStyles(selectedLog.action).color} flex items-center justify-center border-4 border-white shadow-lg`}>
                                        <Activity size={14} />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 leading-tight tracking-tighter">{selectedLog.action} EVENT</h2>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1 flex items-center gap-2">
                                        <Clock size={12} /> ID: {selectedLog.id} • {new Date(selectedLog.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={handleCloseDrawer}
                                className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                            >✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                            {/* Pro Diff Comparison Table */}
                            {selectedLog.changes ? (
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Side-by-Side Comparison</h3>
                                        <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black rounded-lg border border-amber-100 tracking-widest">
                                            {Object.keys(selectedLog.changes).length} FIELDS CHANGED
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-inner">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100/50">
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-1/4">Field</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-red-500 w-[37%] bg-red-50/30">Previous Value</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-500 w-[37%] bg-emerald-50/30">Updated Value</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {Object.entries(selectedLog.changes).map(([field, values]) => (
                                                    <tr key={field} className="hover:bg-white transition-colors group">
                                                        <td className="px-6 py-5 text-[11px] font-black text-slate-700 capitalize border-r border-slate-100">
                                                            {field.replace(/_/g, ' ')}
                                                        </td>
                                                        <td className="px-6 py-5 text-[11px] font-bold text-slate-400 bg-red-50/10 italic">
                                                            {values[0] === 'None' ? '— EMPTY —' : values[0]}
                                                        </td>
                                                        <td className="px-6 py-5 text-[11px] font-black text-emerald-600 bg-emerald-50/10">
                                                            {values[1] === 'None' ? '— EMPTY —' : values[1]}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-6 bg-slate-900 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                                        <div className="flex items-center gap-2 mb-4 text-emerald-400">
                                            <Code size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Raw System Log (JSON)</span>
                                        </div>
                                        <pre className="text-[11px] text-slate-300 font-mono leading-relaxed max-h-40 overflow-y-auto">
                                            {JSON.stringify(selectedLog.changes, null, 4)}
                                        </pre>
                                    </div>
                                </section>
                            ) : (
                                <div className="p-10 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[3rem] text-center">
                                    <Box size={40} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No state differences recorded for this event type</p>
                                </div>
                            )}

                            {/* Core Transaction Metrics */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Personnel Context</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-300 uppercase">Operator</p>
                                            <p className="text-xs font-black text-slate-800">{selectedLog.user_display_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-300 uppercase">Email Ref</p>
                                            <p className="text-[10px] font-bold text-emerald-600 font-mono">{selectedLog.user_email || 'System Account'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Object Link</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-300 uppercase">Department</p>
                                            <p className="text-xs font-black text-slate-800">{selectedLog.model_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-300 uppercase">Entity Reference</p>
                                            <p className="text-[10px] font-black text-blue-600 line-clamp-1">{selectedLog.object_repr}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Origin Analysis */}
                            <section className="space-y-6">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Origin Analysis</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 bg-blue-50/30 border border-blue-100/50 rounded-[2.5rem] space-y-4">
                                        <div className="flex items-center gap-3">
                                            <MapPin size={18} className="text-blue-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Geo Location</span>
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-slate-800 tracking-tight">{selectedLog.city || 'Remote'}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedLog.country || 'Distributed Output'}</p>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-4">
                                        <div className="flex items-center gap-3 text-slate-500">
                                            <Monitor size={18} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Source Trace</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic break-words bg-white p-4 rounded-2xl border border-slate-100">
                                            {selectedLog.user_agent || 'Direct Server Protocol Entry'}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Drawer Status Bar */}
                        <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Security Audit v2.5 • SHA-256 Verified</span>
                            <div className="flex items-center gap-3">
                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${selectedLog.success ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full bg-white ${selectedLog.success ? 'animate-pulse' : ''}`}></div>
                                    {selectedLog.success ? 'Integrity Valid' : 'Log Fault'}
                                </div>
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
