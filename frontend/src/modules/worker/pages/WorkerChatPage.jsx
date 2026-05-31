import React, { useEffect, useMemo, useRef, useState } from 'react';
import workerPortalApi from '../../../services/workerPortalApi';

const getName = (user) => user?.first_name || user?.last_name || user?.username || user?.email || 'User';
const getDisplayName = (user) => {
  const base = getName(user);
  if (!user) return base;
  if (user.is_system_admin) return `${base} (System Admin)`;
  if (user.role_label) return `${base} (${user.role_label})`;
  return base;
};
const avatarUrl = (user) => user?.profile_image_url || '';

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

const uniqBy = (arr = [], keyFn) => {
  const seen = new Set();
  return arr.filter((item) => {
    const k = keyFn(item);
    if (k == null || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const toStr = (v) => (v == null ? '' : String(v));
const getUserId = (u) => toStr(u?.id || u?.user_id || u?.user?.id);
const norm = (v) => toStr(v).trim().toLowerCase();
const getPhone = (u) => norm(u?.phone || u?.phone_number || u?.mobile || u?.worker_phone);
const getUsername = (u) => norm(u?.username);
const getEmail = (u) => norm(u?.email);

const isSameUser = (a, b) => {
  const aId = getUserId(a);
  const bId = getUserId(b);
  if (aId && bId && aId === bId) return true;

  const pairs = [
    [getUsername(a), getUsername(b)],
    [getEmail(a), getEmail(b)],
    [getPhone(a), getPhone(b)],
  ];
  return pairs.some(([x, y]) => x && y && x === y);
};

const findPeerFromMemberIds = (conversation, memberIdSet) => {
  const users = (conversation?.members || []).map((m) => m.user).filter(Boolean);
  return users.find((u) => memberIdSet.has(getUserId(u))) || null;
};

export default function WorkerChatPage() {
  const [members, setMembers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState('');
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const lastMessageAtRef = useRef('');
  const messagesEndRef = useRef(null);

  const my = workerPortalApi.getCurrentWorker();
  const myUserId = getUserId(my);
  const memberIdSet = useMemo(() => new Set((members || []).map((m) => getUserId(m)).filter(Boolean)), [members]);
  const myChatUserId = useMemo(() => {
    if (!activeConversation) return myUserId;
    const allUsers = (activeConversation.members || []).map((m) => m.user).filter(Boolean);
    const ownFromConversation = allUsers.find((u) => !memberIdSet.has(getUserId(u)));
    return getUserId(ownFromConversation) || myUserId;
  }, [activeConversation, memberIdSet, myUserId]);

  const activePeer = useMemo(() => {
    if (!activeConversation) return null;
    const peer = findPeerFromMemberIds(activeConversation, memberIdSet)
      || (activeConversation.members || []).map((m) => m.user).find((u) => !isSameUser(u, my));
    return peer || null;
  }, [activeConversation, memberIdSet, my, myUserId]);

  const loadBase = async (searchQuery = '') => {
    setLoading(true);
    try {
      const [memberList, convList] = await Promise.all([
        workerPortalApi.listChatMembers(searchQuery),
        workerPortalApi.listChatConversations(),
      ]);
      const filteredMembers = uniqBy((memberList || []), (m) => getUserId(m));
      const allowedPeerIds = new Set(filteredMembers.map((m) => getUserId(m)).filter(Boolean));

      const onlyPeerConversations = (convList || []).filter((c) =>
        (c.members || []).map((m) => m.user).some((u) => allowedPeerIds.has(getUserId(u)))
      );

      const dedupedConversations = uniqBy(onlyPeerConversations, (c) => {
        const peer = findPeerFromMemberIds(c, allowedPeerIds);
        return getUserId(peer) ? `peer-${getUserId(peer)}` : `conv-${c.id}`;
      });

      setMembers(filteredMembers);
      setConversations(dedupedConversations);
      if (!activeConversation && dedupedConversations.length > 0) setActiveConversation(dedupedConversations[0]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId, incremental = false) => {
    const list = await workerPortalApi.listChatMessages(conversationId, incremental ? lastMessageAtRef.current : '');
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
  }, [activeConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, mobileDetailOpen, activeConversation?.id]);

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
    const conv = await workerPortalApi.startDirectChat(memberId);
    await loadBase(query);
    setActiveConversation(conv);
    setMobileDetailOpen(true);
  };

  const sendMessage = async () => {
    const payload = text.trim();
    if ((!payload && !imageFile) || !activeConversation?.id || sending) return;

    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      conversation: activeConversation.id,
      sender: { ...(my || {}), id: myChatUserId || myUserId },
      text: payload,
      image_url: imageFile ? URL.createObjectURL(imageFile) : '',
      created_at: new Date().toISOString(),
    };

    setSending(true);
    setText('');
    setMessages((prev) => [...prev, optimistic]);
    try {
      const msg = await workerPortalApi.sendChatMessage(activeConversation.id, { text: payload, imageFile });
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

  return (
    <div className="ms-page" style={{ padding: 14, color: '#111827' }}>
      <style>{`
        .ms-shell { background: linear-gradient(180deg, #f8fbff 0%, #f3f7fc 100%); border: 1px solid #dbe7f5; border-radius: 20px; min-height: calc(100vh - 130px); overflow: hidden; }
        .ms-grid { display: grid; grid-template-columns: 320px 1fr; min-height: calc(100vh - 130px); }
        .ms-left { border-right: 1px solid #dbe7f5; background: #ffffff; }
        .ms-right { display: flex; flex-direction: column; background: #f6faff; }
        .ms-avatar { width: 42px; height: 42px; border-radius: 999px; background: #c7d2fe; color: #1e3a8a; font-weight: 900; display: flex; align-items: center; justify-content: center; position: relative; }
        .ms-dot { width: 10px; height: 10px; border-radius: 999px; border: 2px solid #fff; position: absolute; right: -1px; bottom: -1px; background: #9ca3af; }
        .ms-dot.online { background: #22c55e; }
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
          .ms-page { padding: 0 !important; min-height: 100dvh; }
          .ms-shell { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; min-height: 100dvh !important; }
          .ms-grid { min-height: 100dvh !important; }
          .ms-grid { grid-template-columns: 1fr; }
          .ms-left { border-right: 0; border-bottom: 1px solid #dbe7f5; max-height: none; height: 100dvh; overflow-y: auto; }
          .ms-shell.mobile-detail .ms-right { min-height: 100dvh !important; }
          .ms-shell.mobile-detail .ms-chat-footer {
            position: fixed !important;
            left: 0;
            right: 0;
            bottom: calc(86px + env(safe-area-inset-bottom, 0px));
            z-index: 9999;
            padding-bottom: 10px !important;
            box-shadow: 0 -8px 20px rgba(2, 6, 23, 0.08);
          }
          .ms-shell.mobile-detail .ms-chat-messages { padding-bottom: 220px !important; }
        }
      `}</style>

      <div className={`ms-shell ${mobileDetailOpen ? 'mobile-detail' : 'mobile-list'}`}>
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
                const peer = findPeerFromMemberIds(c, memberIdSet)
                  || (c.members || []).map((m) => m.user).find((u) => !isSameUser(u, my));
                if (!peer) return null;
                return (
                  <button
                    className={`ms-item ${c.id === activeConversation?.id ? 'active' : ''}`}
                    key={c.id}
                    onClick={() => {
                      setActiveConversation(c);
                      setMobileDetailOpen(true);
                    }}
                  >
                    <div className="ms-avatar">
                      {avatarUrl(peer) ? (
                        <img src={avatarUrl(peer)} alt={getName(peer)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '999px' }} />
                      ) : (
                        (getName(peer) || '?').slice(0, 1).toUpperCase()
                      )}
                      {peer?.is_online ? <span className="ms-dot online" /> : null}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{getDisplayName(peer)}</div>
                      <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                      <div className="ms-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
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
                <button
                  className="ms-btn ghost ms-mobile-back"
                  onClick={() => setMobileDetailOpen(false)}
                  style={{ padding: '6px 10px' }}
                >
                  Back
                </button>
                <div className="ms-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
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
            </header>

            <div className="ms-chat-messages" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'grid', gap: 8 }}>
              {messages.map((msg) => {
                const senderId = getUserId(msg.sender);
                const mine = (
                  (senderId && senderId === myChatUserId) ||
                  (senderId && senderId === myUserId) ||
                  isSameUser(msg.sender, my)
                );
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
                        <>
                          <img
                            src={msg.image_url}
                            alt="chat"
                            onClick={() => setPreviewUrl(msg.image_url)}
                            style={{ marginTop: msg.text ? 8 : 0, width: 260, maxWidth: '100%', borderRadius: 12, display: 'block', cursor: 'zoom-in' }}
                          />
                          <a
                            href={msg.image_url}
                            download
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: 'inline-block', marginTop: 6, fontSize: 12, color: mine ? '#dbeafe' : '#1e40af', textDecoration: 'underline' }}
                          >
                            Download
                          </a>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <footer className="ms-chat-footer" style={{ borderTop: '1px solid #dbe7f5', padding: 12, background: '#fff' }}>
              {imageFile && (
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 8px' }}>
                  <span style={{ fontSize: 12, color: '#475569', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Selected: {imageFile.name}
                  </span>
                  <button
                    onClick={() => setImageFile(null)}
                    style={{ border: 0, background: 'transparent', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
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
              <button className="ms-btn primary" onClick={sendMessage} disabled={sending || !activeConversation || (!text.trim() && !imageFile)}>
                Send
              </button>
              </div>
            </footer>
          </section>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .ms-shell.mobile-list .ms-right { display: none !important; }
          .ms-shell.mobile-detail .ms-left { display: none !important; }
          .ms-mobile-back { display: inline-flex !important; }
        }
        @media (min-width: 981px) {
          .ms-mobile-back { display: none !important; }
        }
      `}</style>

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
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
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
