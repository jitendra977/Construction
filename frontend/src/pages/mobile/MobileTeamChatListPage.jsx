import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import { messengerService } from '../../services/messengerService';

const me = authService.getCurrentUser();
const getName = (u) => u?.first_name || u?.last_name || u?.username || u?.email || 'User';
const getDisplayName = (u) => {
  const base = getName(u);
  if (!u) return base;
  if (u.is_system_admin) return `${base} (System Admin)`;
  if (u.role_label) return `${base} (${u.role_label})`;
  return base;
};
const READ_KEY = 'messenger_read_map_v1';
const loadReadMap = () => {
  try { return JSON.parse(localStorage.getItem(READ_KEY) || '{}'); } catch { return {}; }
};

function Avatar({ user, size = 64 }) {
  const profileUrl = user?.profile_image_url || '';
  const isOnline = !!user?.is_online;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: '#dbe8ff',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#1d4ed8',
        fontWeight: 900,
        fontSize: Math.max(14, Math.floor(size * 0.34)),
        border: isOnline ? '2px solid #ffffff' : '2px solid transparent',
        boxShadow: isOnline ? '0 0 0 1px #ffffff, 0 0 0 4px #1e3a8a' : 'none',
      }}
    >
      {profileUrl ? (
        <img src={profileUrl} alt={getName(user)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '999px' }} />
      ) : (
        getName(user).slice(0, 1).toUpperCase()
      )}
      {isOnline ? (
        <span style={{ position: 'absolute', right: 1, bottom: 1, width: 17, height: 17, borderRadius: 999, background: '#15803d', border: '2px solid #fff' }} />
      ) : null}
    </div>
  );
}

export default function MobileTeamChatListPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [query, setQuery] = useState('');
  const [readMap, setReadMap] = useState(() => loadReadMap());

  const loadBase = async (q = '') => {
    const [memberList, convList] = await Promise.all([
      messengerService.listMembers(q),
      messengerService.listConversations(),
    ]);
    setMembers(memberList);
    setConversations(convList);
  };

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      loadBase(query).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [query]);

  const recentPeople = useMemo(() => {
    const ids = new Set();
    return conversations
      .map((c) => (c.members || []).map((m) => m.user).find((u) => u?.id !== me?.id))
      .filter((u) => u && !ids.has(u.id) && ids.add(u.id))
      .slice(0, 8);
  }, [conversations]);

  const startDirect = async (userId) => {
    const conv = await messengerService.startDirectConversation(userId);
    navigate(`/dashboard/mobile/team-chat/${conv.id}`);
  };

  const openConversation = (conversationId) => {
    const conv = conversations.find((c) => String(c.id) === String(conversationId));
    const stamp = conv?.last_message?.created_at || new Date().toISOString();
    const next = { ...readMap, [String(conversationId)]: stamp };
    setReadMap(next);
    localStorage.setItem(READ_KEY, JSON.stringify(next));
    navigate(`/dashboard/mobile/team-chat/${conversationId}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', paddingBottom: 90, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}>
      <div style={{ padding: '14px 16px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 33, fontWeight: 800, letterSpacing: -0.9, color: '#2563eb' }}>messenger</h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ border: 0, background: '#fff', width: 40, height: 40, borderRadius: 999 }}>✎</button>
            <button style={{ border: 0, background: '#fff', width: 40, height: 40, borderRadius: 999 }}>🏗️</button>
          </div>
        </div>

        <div style={{ marginTop: 10, background: '#e5e7eb', borderRadius: 999, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ opacity: 0.65, fontSize: 16 }}>🔎</span>
          <input
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              loadBase(v);
            }}
            placeholder="Ask Meta AI or Search"
            style={{ border: 0, background: 'transparent', width: '100%', fontSize: 16, outline: 'none', color: '#374151', fontWeight: 500 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '10px 16px 8px' }}>
        {recentPeople.map((person) => (
          <button key={person.id} onClick={() => startDirect(person.id)} style={{ border: 0, background: 'transparent', minWidth: 74, padding: 0 }}>
            <Avatar user={person} size={70} />
          </button>
        ))}
      </div>

      <div style={{ padding: '6px 10px 0' }}>
        {conversations.map((c) => {
          const peer = (c.members || []).map((m) => m.user).find((u) => u?.id !== me?.id);
          const lastMsgAt = c?.last_message?.created_at;
          const lastReadAt = readMap[String(c.id)];
          const hasUnread = !!(
            c?.last_message?.sender?.id &&
            c.last_message.sender.id !== me?.id &&
            lastMsgAt &&
            (!lastReadAt || new Date(lastMsgAt).getTime() > new Date(lastReadAt).getTime())
          );
          return (
            <button key={c.id} onClick={() => openConversation(c.id)} style={{ width: '100%', border: hasUnread ? '1px solid #bfdbfe' : 0, background: hasUnread ? '#eff6ff' : 'transparent', display: 'flex', gap: 12, textAlign: 'left', padding: '9px 8px', borderRadius: 14 }}>
              <Avatar user={peer} size={58} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: hasUnread ? 800 : 700, color: '#111827', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDisplayName(peer)}</span>
                  {hasUnread ? <span style={{ width: 9, height: 9, borderRadius: 999, background: '#2563eb', flexShrink: 0 }} /> : null}
                </div>
                <div style={{ marginTop: 3, fontSize: 15, color: hasUnread ? '#1d4ed8' : '#6b7280', fontWeight: hasUnread ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.22 }}>
                  {c.last_message?.text || 'Start conversation'}
                </div>
              </div>
            </button>
          );
        })}

        {members.length > 0 && (
          <div style={{ padding: '14px 10px 0', borderTop: '1px solid #e5e7eb', marginTop: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#6b7280', marginBottom: 8 }}>People</div>
            {members.slice(0, 6).map((m) => (
              <button key={m.id} onClick={() => startDirect(m.id)} style={{ width: '100%', border: 0, background: 'transparent', display: 'flex', gap: 12, textAlign: 'left', padding: '8px 0' }}>
                <Avatar user={m} size={44} />
                <div>
                  <div style={{ fontWeight: 700 }}>{getDisplayName(m)}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{m.is_online ? 'Active now' : 'Offline'}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
