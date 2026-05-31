import React, { useEffect, useMemo, useRef, useState } from 'react';
import { authService } from '../../services/auth';
import { messengerService } from '../../services/messengerService';

const me = authService.getCurrentUser();

const getName = (user) => user?.first_name || user?.last_name || user?.username || user?.email || 'User';
const getDisplayName = (user) => {
  const base = getName(user);
  if (!user) return base;
  if (user.is_system_admin) return `${base} (System Admin)`;
  if (user.role_label) return `${base} (${user.role_label})`;
  return base;
};
const avatarUrl = (user) => user?.profile_image_url || '';
const READ_KEY = 'messenger_read_map_v1';

const loadReadMap = () => {
  try { return JSON.parse(localStorage.getItem(READ_KEY) || '{}'); } catch { return {}; }
};

const saveReadMap = (map) => {
  localStorage.setItem(READ_KEY, JSON.stringify(map));
};

const formatLastSeen = (iso) => {
  if (!iso) return 'offline';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.max(1, Math.floor(diffMs / 60000));
  if (min < 2) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  return `${day}d ago`;
};

export default function TeamChatPage() {
  const [members, setMembers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState('');
  const [activeCall, setActiveCall] = useState(null);
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [readMap, setReadMap] = useState(() => loadReadMap());
  const lastMessageAtRef = useRef('');

  const markConversationRead = (conversationId, ts = '') => {
    if (!conversationId) return;
    const stamp = ts || new Date().toISOString();
    setReadMap((prev) => {
      const next = { ...prev, [String(conversationId)]: stamp };
      saveReadMap(next);
      return next;
    });
  };

  const activePeer = useMemo(() => {
    if (!activeConversation) return null;
    const peer = (activeConversation.members || []).map((m) => m.user).find((u) => u?.id !== me?.id);
    return peer || null;
  }, [activeConversation]);

  const loadBase = async (searchQuery = '') => {
    setLoading(true);
    try {
      const [memberList, convList] = await Promise.all([
        messengerService.listMembers(searchQuery),
        messengerService.listConversations(),
      ]);
      setMembers(memberList);
      setConversations(convList);
      if (!activeConversation && convList.length > 0) setActiveConversation(convList[0]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId, incremental = false) => {
    const list = await messengerService.listMessages(conversationId, incremental ? lastMessageAtRef.current : '');
    if (!list.length) return;
    setMessages((prev) => {
      if (!incremental) return list;
      const seen = new Set(prev.map((m) => m.id));
      const deduped = list.filter((m) => !seen.has(m.id));
      return deduped.length ? [...prev, ...deduped] : prev;
    });
    const nextTs = list[list.length - 1]?.created_at || lastMessageAtRef.current;
    lastMessageAtRef.current = nextTs;
    setLastMessageAt(nextTs);
  };

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (!activeConversation?.id) return;
    setMessages([]);
    setLastMessageAt('');
    loadMessages(activeConversation.id, false);
    markConversationRead(activeConversation.id, activeConversation?.last_message?.created_at || new Date().toISOString());
  }, [activeConversation?.id]);

  useEffect(() => {
    lastMessageAtRef.current = lastMessageAt;
  }, [lastMessageAt]);

  useEffect(() => {
    const t = setInterval(() => {
      if (activeConversation?.id) loadMessages(activeConversation.id, true);
      loadBase(query).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [activeConversation?.id, query]);

  const startChatWithMember = async (memberId) => {
    const conv = await messengerService.startDirectConversation(memberId);
    await loadBase(query);
    setActiveConversation(conv);
  };

  const sendMessage = async () => {
    const payload = text.trim();
    if ((!payload && !imageFile) || !activeConversation?.id || sending) return;

    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      conversation: activeConversation.id,
      sender: me,
      text: payload,
      image_url: imageFile ? URL.createObjectURL(imageFile) : "",
      created_at: new Date().toISOString(),
    };

    setSending(true);
    setText('');
    setMessages((prev) => [...prev, optimistic]);
    try {
      const msg = await messengerService.sendMessage(activeConversation.id, { text: payload, imageFile });
      setMessages((prev) => prev.map((m) => (m.id === tempId ? msg : m)));
      lastMessageAtRef.current = msg.created_at;
      setLastMessageAt(msg.created_at);
      setImageFile(null);
      loadBase(query).catch(() => {});
    } catch (_e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(payload);
    } finally {
      setSending(false);
    }
  };

  const startAudioCall = async () => {
    if (!activeConversation?.id) return;
    const call = await messengerService.startCall(activeConversation.id, 'audio');
    setActiveCall(call);
  };

  const endCurrentCall = async () => {
    if (!activeCall?.id) return;
    const call = await messengerService.endCall(activeCall.id);
    setActiveCall(call);
  };

  return (
    <div style={{ padding: 14, color: '#111827' }}>
      <style>{`
        .ms-shell { background: linear-gradient(180deg, #f8fbff 0%, #f3f7fc 100%); border: 1px solid #dbe7f5; border-radius: 20px; min-height: calc(100vh - 130px); overflow: hidden; }
        .ms-grid { display: grid; grid-template-columns: 320px 1fr; min-height: calc(100vh - 130px); }
        .ms-left { border-right: 1px solid #dbe7f5; background: #ffffff; }
        .ms-right { display: flex; flex-direction: column; background: #f6faff; }
        .ms-avatar { width: 42px; height: 42px; border-radius: 999px; background: #c7d2fe; color: #1e3a8a; font-weight: 900; display: flex; align-items: center; justify-content: center; position: relative; }
        .ms-dot { width: 13px; height: 13px; border-radius: 999px; border: 2px solid #fff; position: absolute; right: -2px; bottom: -2px; background: #15803d; }
        .ms-dot.online { background: #15803d; }
        .ms-avatar.online { border: 2px solid #fff; box-shadow: 0 0 0 1px #fff, 0 0 0 4px #1e3a8a; }
        .ms-item { width: 100%; border: 0; background: transparent; padding: 10px 12px; border-radius: 12px; display: flex; gap: 10px; align-items: center; text-align: left; cursor: pointer; }
        .ms-item:hover { background: #eef4ff; }
        .ms-item.active { background: #e6efff; }
        .ms-bubble { max-width: 70%; padding: 10px 12px; border-radius: 18px; font-size: 14px; line-height: 1.35; }
        .ms-bubble.mine { margin-left: auto; background: #1d4ed8; color: #fff; border-bottom-right-radius: 6px; }
        .ms-bubble.theirs { margin-right: auto; background: #e5e7eb; color: #111827; border-bottom-left-radius: 6px; }
        .ms-input { border: 1px solid #cbd5e1; border-radius: 999px; padding: 11px 14px; width: 100%; background: #fff; }
        .ms-btn { border: 0; border-radius: 999px; padding: 10px 14px; font-weight: 700; cursor: pointer; }
        .ms-btn.primary { background: #2563eb; color: #fff; }
        .ms-btn.ghost { background: #e5edff; color: #1e40af; }
        @media (max-width: 980px) {
          .ms-grid { grid-template-columns: 1fr; }
          .ms-left { border-right: 0; border-bottom: 1px solid #dbe7f5; max-height: 320px; overflow-y: auto; }
        }
      `}</style>

      <div className="ms-shell">
        <div className="ms-grid">
          <aside className="ms-left">
            <div style={{ padding: 14, borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 25, fontWeight: 900, color: '#1e3a8a' }}>Chats</div>
              <input
                value={query}
                onChange={(e) => {
                  const v = e.target.value;
                  setQuery(v);
                  loadBase(v);
                }}
                placeholder="Search people"
                style={{ marginTop: 10, width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '9px 10px' }}
              />
            </div>

            <div style={{ padding: 10, display: 'grid', gap: 4 }}>
              {loading && <div style={{ fontSize: 12, color: '#64748b' }}>Loading...</div>}
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
                  <button
                    className={`ms-item ${c.id === activeConversation?.id ? 'active' : ''}`}
                    key={c.id}
                    onClick={() => {
                      setActiveConversation(c);
                      markConversationRead(c.id, c?.last_message?.created_at || new Date().toISOString());
                    }}
                    style={hasUnread ? { background: '#eef4ff', border: '1px solid #bfdbfe' } : undefined}
                  >
                    <div className={`ms-avatar ${peer?.is_online ? 'online' : ''}`}>
                      {avatarUrl(peer) ? (
                        <img src={avatarUrl(peer)} alt={getName(peer)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '999px' }} />
                      ) : (
                        (getName(peer) || '?').slice(0, 1).toUpperCase()
                      )}
                      {peer?.is_online ? <span className="ms-dot online" /> : null}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: hasUnread ? 900 : 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDisplayName(peer)}</span>
                        {hasUnread ? <span style={{ width: 9, height: 9, borderRadius: 999, background: '#2563eb', flexShrink: 0 }} /> : null}
                      </div>
                      <div style={{ fontSize: 12, color: hasUnread ? '#1d4ed8' : '#64748b', fontWeight: hasUnread ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.last_message?.text || 'Start conversation'}
                      </div>
                    </div>
                  </button>
                );
              })}

              <div style={{ marginTop: 8, borderTop: '1px dashed #dbe7f5', paddingTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>Start new chat</div>
                <div style={{ display: 'grid', gap: 4 }}>
                  {members.map((m) => (
                    <button className="ms-item" key={m.id} onClick={() => startChatWithMember(m.id)}>
                      <div className={`ms-avatar ${m?.is_online ? 'online' : ''}`} style={{ width: 34, height: 34, fontSize: 12 }}>
                        {avatarUrl(m) ? (
                          <img src={avatarUrl(m)} alt={getName(m)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '999px' }} />
                        ) : (
                          getName(m).slice(0, 1).toUpperCase()
                        )}
                        {m?.is_online ? <span className="ms-dot online" /> : null}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{getDisplayName(m)}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{m.is_online ? 'Online' : `Last seen ${formatLastSeen(m.last_seen_at)}`}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <section className="ms-right">
            <header style={{ padding: '12px 16px', borderBottom: '1px solid #dbe7f5', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={`ms-avatar ${activePeer?.is_online ? 'online' : ''}`} style={{ width: 36, height: 36, fontSize: 13 }}>
                  {avatarUrl(activePeer) ? (
                    <img src={avatarUrl(activePeer)} alt={getName(activePeer)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '999px' }} />
                  ) : (
                    (getName(activePeer) || '?').slice(0, 1).toUpperCase()
                  )}
                  {activePeer?.is_online ? <span className="ms-dot online" /> : null}
                </div>
                <div>
                  <div style={{ fontWeight: 900, color: '#0f172a' }}>{activePeer ? getDisplayName(activePeer) : 'Select chat'}</div>
                  {activePeer && <div style={{ fontSize: 12, color: '#64748b' }}>{activePeer.is_online ? 'Active now' : `Last seen ${formatLastSeen(activePeer.last_seen_at)}`}</div>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="ms-btn ghost" disabled={!activeConversation} onClick={startAudioCall}>Call</button>
                <button className="ms-btn ghost" disabled={!activeCall || activeCall.status === 'ended'} onClick={endCurrentCall}>End</button>
              </div>
            </header>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'grid', gap: 8 }}>
              {messages.map((msg) => {
                const mine = msg.sender?.id === me?.id;
                const hasImageOnly = !!(msg.image_url && !(msg.text || '').trim());
                return (
                  <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                    {!mine && (
                      <div className="ms-avatar" style={{ width: 24, height: 24, fontSize: 10, flexShrink: 0 }}>
                        {avatarUrl(msg.sender) ? (
                          <img src={avatarUrl(msg.sender)} alt={getName(msg.sender)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '999px' }} />
                        ) : (
                          (getName(msg.sender) || '?').slice(0, 1).toUpperCase()
                        )}
                      </div>
                    )}
                    <div
                      className={`ms-bubble ${mine ? 'mine' : 'theirs'}`}
                      style={hasImageOnly ? { background: 'transparent', padding: 0, boxShadow: 'none', maxWidth: 'fit-content' } : undefined}
                    >
                      {msg.text ? <div>{msg.text}</div> : null}
                      {msg.image_url ? (
                        <img
                          src={msg.image_url}
                          alt="chat"
                          onClick={() => setPreviewUrl(msg.image_url)}
                          style={{ marginTop: msg.text ? 8 : 0, width: 260, maxWidth: '100%', borderRadius: 12, display: 'block', cursor: 'zoom-in' }}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <footer style={{ borderTop: '1px solid #dbe7f5', padding: 12, background: '#fff', display: 'flex', gap: 8 }}>
              <label className="ms-btn ghost" style={{ display: 'inline-flex', alignItems: 'center' }}>
                Photo
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </label>
              <input
                className="ms-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
                placeholder="Type a message"
              />
              <button className="ms-btn primary" onClick={sendMessage} disabled={!activeConversation || (!text.trim() && !imageFile)}>
                Send
              </button>
            </footer>
          </section>
        </div>
      </div>

      {previewUrl && (
        <div
          onClick={() => setPreviewUrl('')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
            zIndex: 90,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <img
            src={previewUrl}
            alt="preview"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 12 }}
          />
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <a
              href={previewUrl}
              download
              onClick={(e) => e.stopPropagation()}
              style={{ textDecoration: 'none', padding: '9px 12px', borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 700 }}
            >
              Download
            </a>
            <button
              onClick={() => setPreviewUrl('')}
              style={{ border: 0, padding: '9px 12px', borderRadius: 8, background: '#374151', color: '#fff', fontWeight: 700 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
