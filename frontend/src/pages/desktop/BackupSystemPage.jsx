import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Database, Cloud, Clock, CheckCircle, XCircle, HardDrive } from 'lucide-react';
import api from '../../services/api';
import ConfirmModal from '../../components/common/ConfirmModal';
import Modal from '../../components/common/Modal';

export default function BackupSystemPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState('');

  const [settingsData, setSettingsData] = useState({ is_paused: false, schedule: '0 2 * * *' });
  const [analytics, setAnalytics] = useState({ unbacked_up: { count: 0, size_mb: 0 }, drive_quota: { limit_gb: 0, usage_gb: 0, usage_percent: 0 } });
  
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
  const [scheduleModal, setScheduleModal] = useState({ isOpen: false, cron: '' });

  const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
  const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });
  
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/backup/logs/');
      setLogs(res.data.logs || []);
      
      const statRes = await api.get('/backup/analytics/');
      setAnalytics({
        unbacked_up: statRes.data.unbacked_up,
        drive_quota: statRes.data.drive_quota
      });
      setSettingsData(statRes.data.settings);
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

  const triggerBackup = () => {
    showConfirm({
      title: 'Trigger Manual Backup',
      message: 'Are you sure you want to trigger a full system backup now?',
      confirmText: 'Start Backup',
      type: 'primary',
      onConfirm: async () => {
        closeConfirm();
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
      }
    });
  };

  const togglePause = async () => {
    try {
      const res = await api.post('/backup/control/toggle_pause/');
      setMessage(res.data.message);
      fetchLogs();
    } catch (err) {
      alert('Failed to toggle system status');
    }
  };

  const openScheduleModal = () => {
    setScheduleModal({ isOpen: true, cron: settingsData.schedule });
  };

  const closeScheduleModal = () => {
    setScheduleModal({ isOpen: false, cron: '' });
  };

  const handleUpdateSchedule = async () => {
    if (!scheduleModal.cron) return;
    try {
      const res = await api.post('/backup/control/update_schedule/', { cron_expr: scheduleModal.cron });
      setMessage(res.data.message);
      fetchLogs();
      closeScheduleModal();
    } catch (err) {
      alert('Failed to update schedule');
    }
  };

  const abortBackup = (taskId) => {
    showConfirm({
      title: 'Abort Backup Task',
      message: 'Are you sure you want to abort this running backup immediately? Data being processed may be lost.',
      confirmText: 'Yes, Abort',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          const res = await api.post('/backup/control/abort/', { task_id: taskId });
          setMessage(res.data.message);
          fetchLogs();
        } catch (err) {
          alert('Failed to abort task');
        }
      }
    });
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="col-span-1 md:col-span-3 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
               <Database className="w-5 h-5 text-emerald-600" />
               Storage Analytics
             </h2>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Unbacked-Up Data</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{analytics.unbacked_up.count} files</p>
                <p className="text-xs text-orange-600 font-medium mt-1">Pending: {analytics.unbacked_up.size_mb} MB</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Google Drive Quota</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{analytics.drive_quota.usage_gb} GB / {analytics.drive_quota.limit_gb} GB</p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2">
                   <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${analytics.drive_quota.usage_percent}%` }}></div>
                </div>
              </div>
           </div>
        </div>
        
        <div className="col-span-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
           <div>
             <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
               <Clock className="w-5 h-5 text-indigo-600" />
               Scheduling
             </h2>
             <div className="space-y-3">
               <div>
                 <p className="text-xs text-slate-500">System Status</p>
                 <p className={`text-sm font-bold mt-0.5 ${settingsData.is_paused ? 'text-orange-500' : 'text-emerald-600'}`}>
                   {settingsData.is_paused ? 'Paused (No Auto-Backups)' : 'Active & Running'}
                 </p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Backup Frequency</p>
                 <p className="text-sm font-mono font-medium text-slate-700 mt-0.5">
                    {settingsData.schedule === '0 2 * * *' ? 'Daily at 2:00 AM' : 
                     settingsData.schedule === '0 0 * * 0' ? 'Weekly on Sunday' : 
                     settingsData.schedule === '0 0 1 * *' ? 'Monthly (1st day)' : 
                     settingsData.schedule}
                 </p>
               </div>
             </div>
           </div>
           
           <div className="flex gap-2 mt-4">
             <button onClick={togglePause} className="flex-1 py-1.5 px-3 text-xs font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200">
               {settingsData.is_paused ? 'Resume' : 'Pause'}
             </button>
             <button onClick={openScheduleModal} className="flex-1 py-1.5 px-3 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
               Change Schedule
             </button>
             <button onClick={() => navigate('/dashboard/desktop/backups/settings')} className="flex-1 py-1.5 px-3 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100" title="Configure Google Drive API Connection">
               Drive Setup
             </button>
           </div>
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
                <th className="px-6 py-4 font-medium text-right">Actions</th>
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
                  <td className="px-6 py-4 text-right">
                    {log.status === 'in_progress' ? (
                      <button onClick={() => abortBackup(log.celery_task_id)} className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 font-semibold transition-colors">
                        Abort
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs">{log.created_by || 'System'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        onConfirm={confirmConfig.onConfirm}
        onCancel={closeConfirm}
        type={confirmConfig.type || 'warning'}
      />

      <Modal
        isOpen={scheduleModal.isOpen}
        onClose={closeScheduleModal}
        title="Automated Backup Schedule"
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={closeScheduleModal}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateSchedule}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
            >
              Save Schedule
            </button>
          </div>
        }
      >
        <div className="p-4 space-y-5">
          <p className="text-sm text-slate-600">
            Choose how often the system should automatically back up your data to Google Drive.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Select Frequency</label>
            <select
              value={
                ['0 2 * * *', '0 0 * * 0', '0 0 1 * *'].includes(scheduleModal.cron) 
                  ? scheduleModal.cron 
                  : 'custom'
              }
              onChange={(e) => {
                if (e.target.value !== 'custom') {
                  setScheduleModal({ ...scheduleModal, cron: e.target.value });
                }
              }}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="0 2 * * *">Daily (At 2:00 AM)</option>
              <option value="0 0 * * 0">Weekly (Sundays at Midnight)</option>
              <option value="0 0 1 * *">Monthly (1st day of the Month)</option>
              <option value="custom">Custom Schedule</option>
            </select>
          </div>

          {!['0 2 * * *', '0 0 * * 0', '0 0 1 * *'].includes(scheduleModal.cron) && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-medium text-slate-700">Advanced Cron Expression</label>
              <input
                type="text"
                value={scheduleModal.cron}
                onChange={(e) => setScheduleModal({ ...scheduleModal, cron: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                placeholder="e.g. 0 2 * * *"
              />
              <p className="text-xs text-slate-500 mt-1">
                For advanced users only. Modifying this changes the exact minute/hour of backups.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
