import React, { useState, useEffect } from 'react';
import { Play, Database, Cloud, Clock, CheckCircle, XCircle, HardDrive, Key, Folder, Save, Settings } from 'lucide-react';
import api from '../../services/api';
import ConfirmModal from '../../components/common/ConfirmModal';
import Modal from '../../components/common/Modal';

export default function BackupSystemPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState('');

  const [settingsData, setSettingsData] = useState({ is_paused: false, schedule: '0 2 * * *' });
  const [analytics, setAnalytics] = useState({ unbacked_up: { count: 0, size_mb: 0 }, drive_quota: { limit_gb: 0, usage_gb: 0, usage_percent: 0 } });
  
  const [formData, setFormData] = useState({
    gdrive_client_id: '',
    gdrive_client_secret: '',
    gdrive_refresh_token: '',
    gdrive_folder_id: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success, message }
  const [testing, setTesting] = useState(false);
  
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
  const [scheduleModal, setScheduleModal] = useState({ isOpen: false, cron: '' });
  const [activeBackup, setActiveBackup] = useState(null);
  const pollRef = React.useRef(null);

  const showConfirm = (config) => setConfirmConfig({ ...config, isOpen: true });
  const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

  const startProgressPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get('/backup/progress/');
        const data = res.data;
        setActiveBackup(data);
        if (!data.active) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setTriggering(false);
          fetchLogs();
        }
      } catch {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setTriggering(false);
      }
    }, 1000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
  
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
      setFormData({
        gdrive_client_id: statRes.data.settings?.gdrive_client_id || '',
        gdrive_client_secret: statRes.data.settings?.gdrive_client_secret || '',
        gdrive_refresh_token: statRes.data.settings?.gdrive_refresh_token || '',
        gdrive_folder_id: statRes.data.settings?.gdrive_folder_id || ''
      });
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Failed to fetch backup logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Check if a backup is already running in the background when page loads
    const checkActiveBackup = async () => {
      try {
        const res = await api.get('/backup/progress/');
        if (res.data && res.data.active) {
          setActiveBackup(res.data);
          setTriggering(true);
          startProgressPolling();
        }
      } catch (err) {
        console.error("Failed to check active backup status", err);
      }
    };
    checkActiveBackup();

    const interval = setInterval(fetchLogs, 10000);
    return () => {
      clearInterval(interval);
      if (pollRef.current) clearInterval(pollRef.current);
    };
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
          setActiveBackup({ active: true, progress_percent: 0, current_stage: 'Queuing backup job...' });
          const res = await api.post('/backup/trigger/');
          setMessage(res.data.message || 'Backup triggered successfully.');
          startProgressPolling();
        } catch (err) {
          setMessage(err.response?.data?.error || 'Failed to trigger backup');
          setTriggering(false);
          setActiveBackup(null);
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

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setMessage('');
    setTestResult(null);
    try {
      const res = await api.post('/backup/control/save_credentials/', formData);
      setMessage(res.data.message || 'Settings saved successfully');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/backup/control/test_connection/', formData);
      setTestResult({ success: true, message: res.data.message });
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.message || err.response?.data?.error || 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Cloud className="w-6 h-6 text-emerald-600" />
            System Auto Backup
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Manage your automated Google Drive snapshots and view backup history.
          </p>
        </div>
        {activeTab === 'overview' && (
          <button
            onClick={triggerBackup}
            disabled={triggering}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
          >
            {triggering ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {triggering ? 'Backing up...' : 'Start Backup Now'}
          </button>
        )}
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Overview & History
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Settings className="w-4 h-4" />
            Drive Connection
          </button>
        </nav>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-3 border ${message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {message}
        </div>
      )}

      {activeTab === 'overview' && (
        <>
          {activeBackup?.active && (
            <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-semibold text-emerald-800">Backup In Progress</span>
                </div>
                <span className="text-sm font-bold text-emerald-700">{activeBackup.progress_percent ?? 0}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700 ease-out"
                  style={{ width: `${activeBackup.progress_percent ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {activeBackup.current_stage || 'Working...'}
              </p>
            </div>
          )}

          {activeBackup && !activeBackup.active && activeBackup.status === 'success' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center gap-4">
              <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Backup completed successfully</p>
                <p className="text-xs text-emerald-600 mt-0.5">{activeBackup.file_name} · {activeBackup.file_size_mb?.toFixed(2)} MB uploaded to Google Drive</p>
              </div>
            </div>
          )}

          {activeBackup && !activeBackup.active && activeBackup.status === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-4">
              <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Backup failed</p>
                <p className="text-xs text-red-600 mt-0.5">{activeBackup.error_message}</p>
              </div>
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
             <button onClick={() => setActiveTab('settings')} className="flex-1 py-1.5 px-3 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
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
        </>
      )}

      {activeTab === 'settings' && (
        <form onSubmit={handleSettingsSubmit} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden max-w-3xl">
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Google Drive API Connection</h2>
            <p className="text-sm text-slate-500 mb-6">
              To allow the system to automatically upload backup files to Google Drive, you must provide your Google Cloud OAuth credentials.
            </p>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" />
                Google Drive Client ID
              </label>
              <input 
                type="text" 
                value={formData.gdrive_client_id}
                onChange={(e) => setFormData({ ...formData, gdrive_client_id: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="e.g. 123456789-abcdefg.apps.googleusercontent.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" />
                Google Drive Client Secret
              </label>
              <input 
                type="password" 
                value={formData.gdrive_client_secret}
                onChange={(e) => setFormData({ ...formData, gdrive_client_secret: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="e.g. GOCSPX-abcdefghijklmnopqrstuvwxyz"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" />
                Google Drive Refresh Token
              </label>
              <input 
                type="password" 
                value={formData.gdrive_refresh_token}
                onChange={(e) => setFormData({ ...formData, gdrive_refresh_token: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="1//0gXXXXXXXXXXXXX..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Folder className="w-4 h-4 text-slate-400" />
                Google Drive Folder ID
              </label>
              <input 
                type="text" 
                value={formData.gdrive_folder_id}
                onChange={(e) => setFormData({ ...formData, gdrive_folder_id: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="The 33-character folder ID from your Drive URL"
              />
              <p className="text-xs text-slate-500 mt-1">
                Example: https://drive.google.com/drive/folders/<b>1Ab2Cd3Ef4Gh5Ij6Kl7Mn8Op9Qr0St</b>
              </p>
            </div>

            {testResult && (
              <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-3 border ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {testResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" /> : <XCircle className="w-5 h-5 flex-shrink-0 text-red-500" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border-t border-slate-200 p-5 flex justify-between items-center">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              {testing ? <Clock className="w-4 h-4 animate-spin text-slate-500" /> : <Cloud className="w-4 h-4 text-slate-500" />}
              {testing ? 'Testing Connection...' : 'Test Connection'}
            </button>
            <button
              type="submit"
              disabled={loading || savingSettings}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 border border-transparent rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {savingSettings ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      )}

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
