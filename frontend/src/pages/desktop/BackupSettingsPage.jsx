import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, ArrowLeft, Key, Folder, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function BackupSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    gdrive_client_id: '',
    gdrive_client_secret: '',
    gdrive_refresh_token: '',
    gdrive_folder_id: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/backup/analytics/');
        if (res.data.settings) {
          setFormData({
            gdrive_client_id: res.data.settings.gdrive_client_id || '',
            gdrive_client_secret: res.data.settings.gdrive_client_secret || '',
            gdrive_refresh_token: res.data.settings.gdrive_refresh_token || '',
            gdrive_folder_id: res.data.settings.gdrive_folder_id || ''
          });
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    try {
      const res = await api.post('/backup/control/save_credentials/', formData);
      setMessage(res.data.message || 'Settings saved successfully');
      setTimeout(() => navigate('/dashboard/desktop/backups'), 1500);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <button 
          onClick={() => navigate('/dashboard/desktop/backups')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Settings className="w-6 h-6 text-indigo-600" />
            Backup System Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Configure Google Drive OAuth credentials for automated system backups.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-3 border ${message.toLowerCase().includes('fail') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-400" />
              Google Drive Client ID
            </label>
            <input 
              type="text" 
              name="gdrive_client_id"
              value={formData.gdrive_client_id}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
              name="gdrive_client_secret"
              value={formData.gdrive_client_secret}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
              name="gdrive_refresh_token"
              value={formData.gdrive_refresh_token}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
              name="gdrive_folder_id"
              value={formData.gdrive_folder_id}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="The 33-character folder ID from your Drive URL"
            />
            <p className="text-xs text-slate-500 mt-1">
              Example: https://drive.google.com/drive/folders/<b>1Ab2Cd3Ef4Gh5Ij6Kl7Mn8Op9Qr0St</b>
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/desktop/backups')}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-lg shadow-sm disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
