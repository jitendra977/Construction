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
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-3xl p-10 text-center space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="mx-auto w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-2xl rotate-3 flex items-center justify-center mb-6 border border-emerald-500/30">
            <Cloud className="w-10 h-10 -rotate-3" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">System Data Backup</h1>
          <p className="text-slate-400 max-w-xl mx-auto mt-4 text-lg">
            Create a secure snapshot of your entire database, project photos, and files. 
            The backup will be compressed and uploaded directly to your Google Drive.
          </p>
          <div className="mt-8">
            <button
              onClick={triggerBackup}
              disabled={triggering}
              className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold text-lg rounded-xl transition-all hover:scale-105 shadow-xl shadow-emerald-500/20 active:scale-95"
            >
              {triggering ? <Clock className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
              {triggering ? 'Backing up now (ब्याकअप हुँदैछ)...' : 'Start Backup Now (ब्याकअप सुरु गर्नुहोस्)'}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center font-medium shadow-lg backdrop-blur-sm">
          {message}
        </div>
      )}

      {/* History Section */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-5 border-b border-slate-700/50 bg-slate-800/60 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <Database className="w-6 h-6 text-slate-400" />
            Recent Backups (हालको ब्याकअपहरू)
          </h2>
          <button onClick={fetchLogs} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors">
            Refresh
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">File Name</th>
                <th className="px-6 py-4">Size (MB)</th>
                <th className="px-6 py-4">Started At</th>
                <th className="px-6 py-4">Triggered By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading history...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No backups found. Trigger one above.</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4">
                    {log.status === 'success' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> Success</span>}
                    {log.status === 'failed' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400"><XCircle className="w-3.5 h-3.5" /> Failed</span>}
                    {log.status === 'in_progress' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400"><Clock className="w-3.5 h-3.5 animate-spin" /> In Progress</span>}
                    {log.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400"><Clock className="w-3.5 h-3.5" /> Pending</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-slate-500" />
                      <span className="font-mono text-xs">{log.file_name || '—'}</span>
                    </div>
                    {log.error_message && <div className="text-red-400 text-xs mt-1 truncate max-w-xs" title={log.error_message}>{log.error_message}</div>}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    {log.file_size_mb ? `${log.file_size_mb.toFixed(2)} MB` : '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {log.created_by}
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
