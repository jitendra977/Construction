import React, { useState, useEffect } from 'react';
import { Play, Database, Cloud, Clock, CheckCircle, XCircle, HardDrive } from 'lucide-react';
import api from '../../services/api';

export default function BackupSystemPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/backup/logs/');
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Failed to fetch backup logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerBackup = async () => {
    if (!window.confirm('Trigger a full system backup now? This will compress the database and all media files, then upload to Google Drive.')) return;
    try {
      setTriggering(true);
      setMessage('');
      const res = await api.post('/backup/trigger/');
      setMessage(res.data.message || 'Backup triggered successfully.');
      fetchLogs();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to trigger backup');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-blue-700/50 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-blue-100 flex items-center gap-3">
            <Cloud className="w-6 h-6 text-indigo-400" />
            System Auto Backup
          </h1>
          <p className="text-sm text-blue-400 mt-1.5">
            Manage your automated Google Drive snapshots and view backup history.
          </p>
        </div>
        <button
          onClick={triggerBackup}
          disabled={triggering}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
        >
          {triggering ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {triggering ? 'Backing up...' : 'Start Backup Now'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-3 border ${message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {message}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-800/40 border border-blue-700/50 rounded-xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-4 text-blue-400 mb-2">
            <HardDrive className="w-5 h-5" />
            <h3 className="text-sm font-medium">Storage Target</h3>
          </div>
          <p className="text-lg font-semibold text-blue-100">Google Drive</p>
        </div>
        <div className="bg-blue-800/40 border border-blue-700/50 rounded-xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-4 text-blue-400 mb-2">
            <Database className="w-5 h-5" />
            <h3 className="text-sm font-medium">Backup Scope</h3>
          </div>
          <p className="text-lg font-semibold text-blue-100">Full Database & Media</p>
        </div>
        <div className="bg-blue-800/40 border border-blue-700/50 rounded-xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-4 text-blue-400 mb-2">
            <Clock className="w-5 h-5" />
            <h3 className="text-sm font-medium">Last Run</h3>
          </div>
          <p className="text-lg font-semibold text-blue-100">
            {logs.length > 0 ? new Date(logs[0].created_at).toLocaleString() : 'Never'}
          </p>
        </div>
      </div>

      {/* History Table Section */}
      <div className="bg-blue-800/40 border border-blue-700/50 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-blue-700/50 flex items-center justify-between bg-blue-800/60">
          <h2 className="text-sm font-semibold text-blue-200">Execution History</h2>
          <button 
            onClick={fetchLogs} 
            className="text-xs font-medium text-blue-400 hover:text-indigo-400 transition-colors flex items-center gap-1.5"
          >
            Refresh List
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-blue-300">
            <thead className="bg-blue-900/50 text-blue-400 text-xs font-medium">
              <tr>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Archive Identifier</th>
                <th className="px-6 py-4 font-medium">Size</th>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Initiated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-700/50">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-blue-500">Retrieving logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-blue-500">No backup records found.</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-blue-800/60 transition-colors group">
                  <td className="px-6 py-4">
                    {log.status === 'success' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> Success</span>}
                    {log.status === 'failed' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-red-500/10 text-red-400"><XCircle className="w-3.5 h-3.5" /> Failed</span>}
                    {log.status === 'in_progress' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-blue-500/10 text-blue-400"><Clock className="w-3.5 h-3.5 animate-spin" /> In Progress</span>}
                    {log.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-blue-500/10 text-blue-400"><Clock className="w-3.5 h-3.5" /> Pending</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs text-blue-300">{log.file_name || '—'}</span>
                      {log.error_message && (
                        <span className="text-red-400 text-xs truncate max-w-sm" title={log.error_message}>
                          Error: {log.error_message}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-blue-400">
                    {log.file_size_mb ? `${log.file_size_mb.toFixed(2)} MB` : '—'}
                  </td>
                  <td className="px-6 py-4 text-blue-400 whitespace-nowrap text-xs">
                    {new Date(log.created_at).toLocaleString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 text-blue-400 text-xs">
                    {log.created_by || 'System'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
