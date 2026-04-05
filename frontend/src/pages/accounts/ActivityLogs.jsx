import React, { useState, useEffect, useMemo } from 'react';
import { 
    User, Activity, AlertCircle, RefreshCw, Filter, 
    Search, Calendar, Globe, Monitor, Code, 
    ChevronRight, MapPin, Download, TrendingUp, 
    Users, Box, Clock, Shield, Database, ExternalLink
} from 'lucide-react';
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
        const total = filteredLogs.length;
        const userCounts = {};
        const modelCounts = {};
        filteredLogs.forEach(l => {
            userCounts[l.user_display_name] = (userCounts[l.user_display_name] || 0) + 1;
            modelCounts[l.model_name] = (modelCounts[l.model_name] || 0) + 1;
        });

        const topUser = Object.entries(userCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
        const activeModule = Object.entries(modelCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

        return [
            { label: 'Total Audit Logs', value: total, color: 'indigo-500', icon: Database },
            { label: 'Active Operator', value: topUser, color: 'emerald-500', icon: Users },
            { label: 'High Traffic Area', value: activeModule, color: 'blue-500', icon: Box },
            { label: 'Security Status', value: 'Protected', color: 'purple-500', icon: Shield }
        ];
    }, [filteredLogs]);

    const modelOptions = useMemo(() => ['ALL', ...new Set(logs.map(l => l.model_name))].sort(), [logs]);
    const userOptions = useMemo(() => ['ALL', ...new Set(logs.map(l => l.username))].sort(), [logs]);

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
        return new Date(timestamp).toLocaleDateString();
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
        <div className="flex gap-3">
            <button
                onClick={exportToCSV}
                className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center border border-gray-200 hover:bg-emerald-50 transition-colors group"
                title="Export to CSV"
            >
                <Download size={16} className="text-gray-500 group-hover:text-emerald-600" />
            </button>
            <button
                onClick={fetchLogs}
                disabled={loading}
                className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center border border-gray-200 transition-all active:rotate-180 disabled:opacity-50 hover:bg-gray-50"
            >
                <RefreshCw size={16} className={loading ? "animate-spin text-gray-500" : "text-gray-500"} />
            </button>
        </div>
    );

    const content = (
        <div className="max-w-7xl mx-auto space-y-8 min-h-screen bg-[var(--t-bg)] p-8">
            {/* Standard Dashboard Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-[var(--t-text)] tracking-tight">Audit Management</h1>
                    <p className="text-[var(--t-text2)] mt-1 font-medium italic">Security surveillance and system activity protocol.</p>
                </div>
                {!isMobile && headerExtra}
            </div>

            {/* Management Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                    <div key={i} className="bg-[var(--t-surface)] p-5 rounded-2xl border border-[var(--t-border)] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-[0.05] group-hover:scale-125 transition-transform duration-500">
                            <s.icon size={50} />
                        </div>
                        <div className="text-[var(--t-text3)] text-[10px] font-black uppercase tracking-widest leading-none mb-2">{s.label}</div>
                        <div className="text-2xl font-black text-[var(--t-text)] line-clamp-1">{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filter & Search Belt */}
            <div className="bg-[var(--t-surface)] p-2 rounded-[2rem] border border-[var(--t-border)] shadow-sm flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[280px] relative px-2">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text"
                        placeholder="Search logs, locations, descriptions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent pl-12 pr-4 py-4 rounded-2xl text-xs font-bold text-[var(--t-text)] focus:outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 pr-2">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--t-surface2)] rounded-2xl border border-[var(--t-border)]">
                        <Box size={14} className="text-gray-400" />
                        <select 
                            value={filters.model}
                            onChange={(e) => setFilters({...filters, model: e.target.value})}
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer pr-1 text-[var(--t-text)]"
                        >
                            {modelOptions.map(m => <option key={m} value={m}>{m === 'ALL' ? 'All Modules' : m}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--t-surface2)] rounded-2xl border border-[var(--t-border)]">
                        <Users size={14} className="text-gray-400" />
                        <select 
                            value={filters.user}
                            onChange={(e) => setFilters({...filters, user: e.target.value})}
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer pr-1 text-[var(--t-text)]"
                        >
                            {userOptions.map(u => <option key={u} value={u}>{u === 'ALL' ? 'All Staff' : u}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Professional Management Table */}
            <div className="bg-[var(--t-surface)] rounded-[2.5rem] shadow-sm border border-[var(--t-border)] overflow-hidden">
                {loading && !logs.length ? (
                    <div className="p-20 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-12 h-12 border-4 border-gray-100 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-xs font-black uppercase tracking-widest">Hydrating Logs...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-20 text-center text-gray-300 italic">
                        <Activity size={48} className="mx-auto opacity-10 mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest opacity-30">No matching activities found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[var(--t-surface2)] border-b border-[var(--t-border)]">
                                    <th className="px-8 py-5 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Department</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Protocol / Activity</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Initiated By</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Origin</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em]">Timestamp</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[var(--t-text3)] uppercase tracking-[0.2em] text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--t-border)]">
                                {filteredLogs.map((log) => {
                                    const styles = getActionStyles(log.action);
                                    return (
                                        <tr key={log.id} className="hover:bg-[var(--t-surface2)]/40 transition-colors group">
                                            {/* Department Column */}
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl ${styles.bg} ${styles.color} flex items-center justify-center shadow-inner`}>
                                                        {log.action.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-black text-[var(--t-text)] uppercase tracking-widest">{log.model_name}</div>
                                                        <div className={`text-[8px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-md ${styles.bg} ${styles.color} border ${styles.border} inline-block mt-1`}>
                                                            {log.action}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Activity Column */}
                                            <td className="px-8 py-6">
                                                <div className="max-w-[280px]">
                                                    <div className="text-xs font-black text-[var(--t-text)] line-clamp-1">{log.object_repr || 'System Action'}</div>
                                                    <div className="text-[10px] font-bold text-[var(--t-text3)] line-clamp-1 mt-1 italic leading-tight">"{log.description}"</div>
                                                </div>
                                            </td>

                                            {/* Personnel Column */}
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--t-border)] shadow-sm">
                                                        <img 
                                                            src={log.user_avatar} 
                                                            className="w-full h-full object-cover" 
                                                            alt="" 
                                                            onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${log.username}&background=random`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-black text-[var(--t-text)]">{log.user_display_name}</div>
                                                        <div className="text-[8px] font-bold text-[var(--t-text3)] opacity-50 font-mono tracking-tighter uppercase">{log.user_email || 'System'}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Origin Column */}
                                            <td className="px-8 py-6">
                                                {log.city ? (
                                                    <div className="flex items-center gap-2 group/origin">
                                                        <MapPin size={12} className="text-blue-500 opacity-50" />
                                                        <div>
                                                            <div className="text-[10px] font-black text-[var(--t-text)]">{log.city}</div>
                                                            <div className="text-[8px] font-black text-[var(--t-text3)] uppercase tracking-widest">{log.country}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] font-bold text-[var(--t-text3)] opacity-30 tracking-widest">LOCAL_NET</div>
                                                )}
                                            </td>

                                            {/* Time Column */}
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <Clock size={12} className="opacity-50" />
                                                    <div className="whitespace-nowrap">
                                                        <div className="text-[10px] font-black text-[var(--t-text)]">{formatRelativeTime(log.timestamp)}</div>
                                                        <div className="text-[8px] font-bold text-[var(--t-text3)] uppercase">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Actions Column */}
                                            <td className="px-8 py-6 text-right">
                                                <button 
                                                    onClick={() => { setSelectedLog(log); setIsDrawerOpen(true); }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--t-surface2)] hover:bg-[var(--t-primary)]/10 text-[var(--t-text3)] hover:text-[var(--t-primary)] border border-transparent hover:border-[var(--t-primary)]/20 transition-all font-black text-[9px] uppercase tracking-widest"
                                                >
                                                    <ExternalLink size={12} />
                                                    Explore
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Advanced Log Detail Drawer */}
            {selectedLog && (
                <div className={`fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300 ${!isDrawerOpen ? 'pointer-events-none opacity-0 duration-500' : ''}`}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-500" onClick={handleCloseDrawer} />
                    <div className={`relative w-full max-w-2xl h-full bg-[var(--t-surface)] shadow-2xl flex flex-col transition-transform duration-500 ease-out border-l border-[var(--t-border)] ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        
                        {/* Drawer Header Pro */}
                        <div className="p-10 border-b border-[var(--t-border)] flex items-center justify-between bg-[var(--t-surface2)]/30">
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border-2 border-[var(--t-surface)] shadow-xl">
                                        <img 
                                            src={selectedLog.user_avatar} 
                                            alt={selectedLog.user_display_name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${selectedLog.username}&background=random`}
                                        />
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-2xl ${getActionStyles(selectedLog.action).bg} ${getActionStyles(selectedLog.action).color} flex items-center justify-center border-4 border-[var(--t-surface)] shadow-lg`}>
                                        <Activity size={14} />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-[var(--t-text)] leading-tight tracking-tighter uppercase">{selectedLog.action} EVENT</h2>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t-text3)] mt-1 flex items-center gap-2">
                                        <Clock size={12} /> ID: {selectedLog.id} • {new Date(selectedLog.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={handleCloseDrawer}
                                className="w-12 h-12 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)] flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm text-[var(--t-text)]"
                            >✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                            {/* Pro Diff Comparison Table */}
                            {selectedLog.changes ? (
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--t-text3)]">Side-by-Side Comparison</h3>
                                        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 text-[9px] font-black rounded-lg border border-amber-500/20 tracking-widest">
                                            {Object.keys(selectedLog.changes).length} FIELDS CHANGED
                                        </span>
                                    </div>
                                    <div className="bg-[var(--t-surface2)] rounded-[2rem] border border-[var(--t-border)] overflow-hidden shadow-inner">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-[var(--t-surface3)]">
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text3)] w-1/4">Field</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-red-500 w-[37%] bg-red-500/5">Previous</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-500 w-[37%] bg-emerald-500/5">Updated</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--t-border)]">
                                                {Object.entries(selectedLog.changes).map(([field, values]) => (
                                                    <tr key={field} className="hover:bg-[var(--t-surface)] transition-colors group">
                                                        <td className="px-6 py-5 text-[11px] font-black text-[var(--t-text2)] capitalize border-r border-[var(--t-border)]">
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
                                </section>
                            ) : (
                                <div className="p-10 bg-[var(--t-surface2)] border-2 border-dashed border-[var(--t-border)] rounded-[2rem] text-center">
                                    <Box size={40} className="mx-auto text-[var(--t-text3)] opacity-20 mb-4" />
                                    <p className="text-xs font-bold text-[var(--t-text3)] opacity-50 uppercase tracking-widest">No state differences available</p>
                                </div>
                            )}

                            {/* Origin & Identity Analysis */}
                            <section className="space-y-6">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--t-text3)]">Identity & Network Origin</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Location Card */}
                                    <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] space-y-4 relative overflow-hidden group">
                                        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                                            <MapPin size={80} />
                                        </div>
                                        <div className="flex items-center gap-3 text-blue-600">
                                            <MapPin size={18} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Geographic Trace</span>
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-[var(--t-text)] tracking-tight">{selectedLog.city || 'Remote Origin'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black text-[var(--t-text3)] uppercase tracking-widest">{selectedLog.country || 'Global Network'}</span>
                                                {selectedLog.city === 'Internal Workspace' && (
                                                    <div className="flex gap-1">
                                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[8px] font-black rounded-md border border-emerald-500/20">SECURE_DEV_NET</span>
                                                        {selectedLog.ip_address && !['127.0.0.1', '::1', 'localhost'].includes(selectedLog.ip_address) && (
                                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 text-[8px] font-black rounded-md border border-blue-500/20">PROXY_ENTRY</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Device & Browser Card */}
                                    <div className="p-6 bg-[var(--t-surface2)] border border-[var(--t-border)] rounded-[2rem] space-y-4 relative overflow-hidden group">
                                        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                                            <Monitor size={80} />
                                        </div>
                                        <div className="flex items-center gap-3 text-[var(--t-text3)]">
                                            <Globe size={18} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Device Identity</span>
                                        </div>
                                        <div>
                                            {selectedLog.user_agent?.includes('|') ? (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Monitor size={14} className="text-[var(--t-primary)]" />
                                                        <p className="text-sm font-black text-[var(--t-text)]">{selectedLog.user_agent.split('|')[0].trim()}</p>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-[var(--t-text3)] flex items-center gap-2">
                                                        <Shield size={10} className="opacity-50" />
                                                        {selectedLog.user_agent.split('|')[1].trim()}
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-lg font-black text-[var(--t-text)] tracking-tight">{selectedLog.ip_address || 'INTERNAL'}</p>
                                                    <p className="text-[9px] font-black text-[var(--t-text3)] uppercase tracking-widest font-mono line-clamp-1 opacity-50">{selectedLog.user_agent || 'Direct Protocol'}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Technical IP Trace */}
                                {selectedLog.user_agent?.includes('|') && (
                                    <div className="p-4 bg-[var(--t-surface2)]/50 rounded-2xl border border-[var(--t-border)] border-dashed flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Database size={14} className="text-[var(--t-text3)] opacity-50" />
                                            <span className="text-[9px] font-black text-[var(--t-text3)] uppercase tracking-widest">Technical Trace (IP)</span>
                                        </div>
                                        <span className="text-[10px] font-mono font-bold text-[var(--t-text)] bg-[var(--t-surface)] px-3 py-1 rounded-lg border border-[var(--t-border)] shadow-sm">
                                            {selectedLog.ip_address}
                                        </span>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (isMobile) {
        return (
            <MobileLayout title="Audit Logs" subtitle="Security Center" headerExtra={headerExtra}>
                {content}
            </MobileLayout>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--t-bg)]">
            {content}
        </div>
    );
};

export default ActivityLogs;
