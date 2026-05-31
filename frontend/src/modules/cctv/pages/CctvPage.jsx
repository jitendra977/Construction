import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../../services/client';
import { useConstruction } from '../../../context/ConstructionContext';
import { createCamera, deleteCamera, fetchAllCameras, fetchCameras, updateCamera } from '../services';

const emptyForm = { name: '', stream_url: '', snapshot_url: '', is_active: true };

export default function CctvPage() {
  const { activeProjectId } = useConstruction();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [allCameras, setAllCameras] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [tab, setTab] = useState('live'); // live | setup

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [activeList, fullList, projectRes] = await Promise.all([
        fetchCameras(activeProjectId),
        fetchAllCameras(activeProjectId),
        api.get('projects/'),
      ]);
      const projectData = Array.isArray(projectRes.data) ? projectRes.data : (projectRes.data?.results || []);
      setCameras(activeList);
      setAllCameras(fullList);
      setProjects(projectData);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load CCTV data');
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const title = useMemo(() => `Field CCTV (${cameras.length})`, [cameras.length]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!activeProjectId) {
      setError('Select a project first from top project switcher.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        project: activeProjectId,
        name: form.name.trim(),
        stream_url: form.stream_url.trim(),
        snapshot_url: form.snapshot_url.trim(),
        is_active: !!form.is_active,
      };
      if (editingId) {
        await updateCamera(editingId, payload);
      } else {
        await createCamera(payload);
      }
      resetForm();
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save camera');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (camera) => {
    setEditingId(camera.id);
    setForm({
      name: camera.name || '',
      stream_url: camera.stream_url || '',
      snapshot_url: camera.snapshot_url || '',
      is_active: !!camera.is_active,
    });
  };

  const onDelete = async (camera) => {
    if (!window.confirm(`Delete camera "${camera.name}"?`)) return;
    try {
      await deleteCamera(camera.id);
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to delete camera');
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{title}</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--t-text3)', fontSize: 12 }}>
          Live monitoring and in-app camera setup
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setTab('live')}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid var(--t-border)',
            background: tab === 'live' ? 'var(--t-primary)' : 'var(--t-surface)',
            color: tab === 'live' ? '#fff' : 'var(--t-text)',
          }}
        >
          All CCTV
        </button>
        <button
          type="button"
          onClick={() => setTab('setup')}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid var(--t-border)',
            background: tab === 'setup' ? 'var(--t-primary)' : 'var(--t-surface)',
            color: tab === 'setup' ? '#fff' : 'var(--t-text)',
          }}
        >
          Camera Setup
        </button>
      </div>

      {tab === 'setup' ? (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 12 }}>
        <section style={{ border: '1px solid var(--t-border)', borderRadius: 12, background: 'var(--t-surface)', padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>{editingId ? 'Edit Camera' : 'Add Camera'}</h3>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
            <input placeholder="Camera name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            <input placeholder="Stream URL (HTTP MJPEG/HLS)" value={form.stream_url} onChange={(e) => setForm((p) => ({ ...p, stream_url: e.target.value }))} required />
            <input placeholder="Snapshot URL (optional)" value={form.snapshot_url} onChange={(e) => setForm((p) => ({ ...p, snapshot_url: e.target.value }))} />
            <label style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} />
              Active
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving}>{saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}</button>
              {editingId ? <button type="button" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>
          <p style={{ marginTop: 8, fontSize: 11, color: 'var(--t-text3)' }}>
            Current project: {projects.find((p) => String(p.id) === String(activeProjectId))?.name || 'None selected'}
          </p>
        </section>
      </div>
      ) : (
        <section>
          {loading && <p style={{ color: 'var(--t-text3)' }}>Loading cameras...</p>}
          {error && <p style={{ color: '#ef4444' }}>{error}</p>}

          {!loading && cameras.length === 0 && (
            <div style={{ padding: 16, border: '1px solid var(--t-border)', borderRadius: 12, background: 'var(--t-surface)' }}>
              No active cameras for current project.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {cameras.map((camera) => (
              <div key={camera.id} style={{ border: '1px solid var(--t-border)', borderRadius: 12, background: 'var(--t-surface)', padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{camera.name}</strong>
                    <div style={{ fontSize: 11, color: 'var(--t-text3)' }}>{camera.project_name || `Project ${camera.project}`}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#16a34a' }}>ACTIVE</span>
                </div>
                <div style={{ aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 8, background: '#0b0f19' }}>
                  <img src={camera.stream_url} alt={camera.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 10, fontSize: 12, flexWrap: 'wrap' }}>
                  <a href={camera.stream_url} target="_blank" rel="noreferrer">Open Stream</a>
                  {camera.snapshot_url ? <a href={camera.snapshot_url} target="_blank" rel="noreferrer">Snapshot</a> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'setup' && (
        <section>
          {loading && <p style={{ color: 'var(--t-text3)' }}>Loading cameras...</p>}
          {error && <p style={{ color: '#ef4444' }}>{error}</p>}

          {!loading && allCameras.length === 0 && (
            <div style={{ padding: 16, border: '1px solid var(--t-border)', borderRadius: 12, background: 'var(--t-surface)' }}>
              No camera setup yet. Add your first camera from the left form.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {allCameras.map((camera) => (
              <div key={camera.id} style={{ border: '1px solid var(--t-border)', borderRadius: 12, background: 'var(--t-surface)', padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{camera.name}</strong>
                    <div style={{ fontSize: 11, color: 'var(--t-text3)' }}>{camera.project_name || `Project ${camera.project}`}</div>
                  </div>
                  <span style={{ fontSize: 11, color: camera.is_active ? '#16a34a' : '#6b7280' }}>{camera.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
                <div style={{ aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 8, background: '#0b0f19' }}>
                  <img src={camera.stream_url} alt={camera.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 10, fontSize: 12, flexWrap: 'wrap' }}>
                  <a href={camera.stream_url} target="_blank" rel="noreferrer">Open Stream</a>
                  {camera.snapshot_url ? <a href={camera.snapshot_url} target="_blank" rel="noreferrer">Snapshot</a> : null}
                  <button type="button" onClick={() => onEdit(camera)}>Edit</button>
                  <button type="button" onClick={() => onDelete(camera)} style={{ color: '#dc2626' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
