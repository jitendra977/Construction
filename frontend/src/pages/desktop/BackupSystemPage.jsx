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
    if (!window.confirm('Trigger a full system backup now?')) return;
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
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Cloud className="w-6 h-6 text-emerald-600" />
            System Auto Backup
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Manage your automated Google Drive snapshots and view backup history.
          </p>
        </div>
        <button
          onClick={triggerBackup}
          disabled={triggering}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
        >
          {triggering ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {triggering ? 'Backing up...' : 'Start Backup Now'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-3 border ${message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-center shadow-sm">
          <div className="flex items-center gap-4 text-slate-500 mb-2">
            <HardDrive className="w-5 h-5" />
            <h3 className="text-sm font-medium">Storage Target</h3>
          </div>
          <p className="text-lg font-semibold text-slate-800">Google Drive</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-center shadow-sm">
          <div className="flex items-center gap-4 text-slate-500 mb-2">
            <Database className="w-5 h-5" />
            <h3 className="text-sm font-medium">Backup Scope</h3>
          </div>
          <p className="text-lg font-semibold text-slate-800">Full Database & Media</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-center shadow-sm">
          <div className="flex items-center gap-4 text-slate-500 mb-2">
            <Clock className="w-5 h-5" />
            <h3 className="text-sm font-medium">Last Run</h3>
          </div>
          <p className="text-lg font-semibold text-slate-800">
            {logs.length > 0 ? new Date(logs[0].created_at).toLocaleString() : 'Never'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-800">Execution History</h2>
          <button 
            onClick={fetchLogs} 
            className="text-xs font-medium text-slate-500 hover:text-emerald-600 transition-colors flex items-center gap-1.5"
          >
            Refresh List
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 text-xs font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Archive Identifier</th>
                <th className="px-6 py-4 font-medium">Size</th>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Initiated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Retrieving logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No backup records found.</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    {log.status === 'success' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-emerald-100 text-emerald-700"><CheckCircle className="w-3.5 h-3.5" /> Success</span>}
                    {log.status === 'failed' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-red-100 text-red-700"><XCircle className="w-3.5 h-3.5" /> Failed</span>}
                    {log.status === 'in_progress' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-blue-100 text-blue-700"><Clock className="w-3.5 h-3.5 animate-spin" /> In Progress</span>}
                    {log.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-slate-100 text-slate-700"><Clock className="w-3.5 h-3.5" /> Pending</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs text-slate-700">{log.file_name || '—'}</span>
                      {log.error_message && (
                        <span className="text-red-500 text-xs truncate max-w-sm" title={log.error_message}>
                          Error: {log.error_message}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {log.file_size_mb ? `${log.file_size_mb.toFixed(2)} MB` : '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-xs">
                    {new Date(log.created_at).toLocaleString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
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
