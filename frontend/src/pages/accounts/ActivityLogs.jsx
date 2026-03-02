import React, { useState, useEffect } from 'react';
import { User, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { accountsService } from '../../services/api';

const ActivityLogs = () => {
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
            setError('Failed to fetch activity logs. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getActionColor = (action) => {
        switch (action) {
            case 'LOGIN': return 'text-blue-600 bg-blue-50 border-blue-100';
            case 'LOGOUT': return 'text-gray-600 bg-gray-50 border-gray-100';
            case 'CREATE': return 'text-green-600 bg-green-50 border-green-100';
            case 'UPDATE': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
            case 'DELETE': return 'text-red-600 bg-red-50 border-red-100';
            case 'APPROVE': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
            case 'REJECT': return 'text-pink-600 bg-pink-50 border-pink-100';
            case 'PAY': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Activity className="text-indigo-600" size={28} />
                        Activity Logs
                    </h1>
                    <p className="text-gray-500 mt-1">Audit trail of system actions performed by users.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700">
                    <AlertCircle size={20} />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {loading && !logs.length ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <p className="font-medium">Loading logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Activity size={48} className="mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-bold text-gray-900 mb-1">No Activity Found</h3>
                        <p>There are no activity logs to display.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                                    <th className="p-4 pl-6">Time</th>
                                    <th className="p-4">User</th>
                                    <th className="p-4">Action</th>
                                    <th className="p-4">Resource</th>
                                    <th className="p-4 pr-6">Description</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 pl-6 text-sm whitespace-nowrap text-gray-500">
                                            {new Date(log.timestamp).toLocaleString(undefined, {
                                                month: 'short', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                                                    {log.username?.charAt(0).toUpperCase() || <User size={14} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{log.user_email || log.username}</p>
                                                    <p className="text-xs text-gray-500">{log.ip_address}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm font-bold text-gray-700">{log.model_name}</p>
                                            {log.object_repr && <p className="text-xs text-gray-500 truncate max-w-[150px]" title={log.object_repr}>{log.object_repr}</p>}
                                        </td>
                                        <td className="p-4 pr-6">
                                            <p className="text-sm text-gray-700 line-clamp-2" title={log.description}>
                                                {log.description || '-'}
                                            </p>
                                        </td>
                                        <td className="p-4 text-center whitespace-nowrap">
                                            {log.success ? (
                                                <span className="w-3 h-3 rounded-full bg-green-500 inline-block shadow-[0_0_8px_rgba(34,197,94,0.4)]" title="Success"></span>
                                            ) : (
                                                <span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow-[0_0_8px_rgba(239,68,68,0.4)]" title={`Failed: ${log.error_message || 'Unknown error'}`}></span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLogs;
