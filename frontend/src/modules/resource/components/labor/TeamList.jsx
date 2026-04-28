import React from 'react';

export default function TeamList({ teams, onEdit, onManageMembers }) {
  if (!teams.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3 opacity-40">👥</div>
        <p className="text-sm font-bold text-gray-400">No teams found</p>
        <p className="text-xs text-gray-300 mt-1">Create teams to group your workers.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map((t) => (
        <div key={t.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-black text-gray-900">{t.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  {t.member_count} Members
                </p>
                {t.leader_name && (
                  <>
                    <span className="text-[10px] text-gray-300">•</span>
                    <p className="text-[10px] text-orange-600 font-black uppercase tracking-wider">
                      👑 {t.leader_name}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${t.is_active ? 'bg-green-500' : 'bg-gray-300'}`} title={t.is_active ? 'Active' : 'Inactive'} />
          </div>
          
          <p className="text-xs text-gray-600 line-clamp-2 mb-4">
            {t.description || 'No description provided.'}
          </p>

          {/* Members Preview */}
          <div className="mb-6">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em] mb-2">Team Members</p>
            <div className="flex flex-wrap gap-1.5">
              {(t.members_detail || []).slice(0, 8).map(m => (
                <div key={m.id} className="group relative">
                  <div 
                    title={`${m.name} (${m.trade})`}
                    className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] hover:border-black transition-colors cursor-help"
                  >
                    {/* Assuming we have a way to get trade icon. I'll just use a generic emoji or first letter for now, 
                        but actually I should probably pass the TRADE_ICONS map or just use a generic one. */}
                    👷
                  </div>
                  {/* Tooltip-like label */}
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {m.name}
                  </span>
                </div>
              ))}
              {t.member_count > 8 && (
                <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-400">
                  +{t.member_count - 8}
                </div>
              )}
              {t.member_count === 0 && (
                <p className="text-[10px] text-gray-300 italic">No members assigned yet.</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
            <button
              onClick={() => onManageMembers(t)}
              className="flex-1 px-3 py-1.5 bg-black text-white text-[10px] font-black rounded-lg hover:bg-gray-800 transition-colors"
            >
              Manage Members
            </button>
            <button
              onClick={() => onEdit(t)}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-black rounded-lg hover:bg-gray-200 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
