import React, { useState } from 'react';
import ResourceContext, { useResource } from '../../context/ResourceContext';
import teamsApi from '../../services/teamsApi';

export default function TeamForm({ team, onDone, projectId: propProjectId, workers = [] }) {
  const resourceCtx = React.useContext(ResourceContext); // Optional context
  const projectId = propProjectId || resourceCtx?.projectId;
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  
  const [formData, setFormData] = useState({
    name: team?.name || '',
    description: team?.description || '',
    leader: team?.leader || '',
    is_active: team?.is_active ?? true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const data = { 
        ...formData, 
        project: projectId,
        leader: formData.leader || null
      };
      
      // If we are editing, we should preserve the members list
      // The serializer might clear it if 'members' is missing and it's a PUT
      // But we are using PATCH in teamsApi, so it should be fine.
      
      if (team?.id) {
        await teamsApi.updateTeam(team.id, data);
      } else {
        await teamsApi.createTeam(data);
      }
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save team.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Team Name</label>
        <input
          required
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-black outline-none transition-all"
          placeholder="e.g., Masonry Team A"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-black outline-none transition-all h-24 resize-none"
          placeholder="What does this team do?"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Team Leader</label>
        <select
          value={formData.leader}
          onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-black outline-none transition-all"
        >
          <option value="">No Leader Assigned</option>
          {workers.map(w => (
            <option key={w.id} value={w.id}>{w.name} ({w.trade})</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
        />
        <label htmlFor="is_active" className="text-[10px] font-black text-gray-500 uppercase tracking-wider cursor-pointer">
          Active Team
        </label>
      </div>

      <button
        disabled={loading}
        type="submit"
        className="w-full py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {loading ? 'Saving...' : team?.id ? 'Update Team' : 'Create Team'}
      </button>
    </form>
  );
}
