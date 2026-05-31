import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
const avatarUrl = (u) => u?.profile_image_url || '';
const READ_KEY = 'messenger_read_map_v1';

function formatClock(date) {
  try {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(date));
  } catch {
    return '';
  }
}

export default function MobileTeamChatDetailPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [lastMessageAt, setLastMessageAt] = useState('');
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const lastMessageAtRef = useRef('');

  const peer = useMemo(() => {
    if (!conversation) return null;
    return (conversation.members || []).map((m) => m.user).find((u) => u?.id !== me?.id) || null;
  }, [conversation]);

  const loadConversation = useCallback(async () => {
    const convs = await messengerService.listConversations();
    const conv = convs.find((c) => String(c.id) === String(conversationId));
    if (conv) setConversation(conv);
  }, [conversationId]);

  const loadMessages = useCallback(async (incremental = false) => {
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
  }, [conversationId]);

  useEffect(() => {
    loadConversation();
    loadMessages(false);
    const map = (() => {
      try { return JSON.parse(localStorage.getItem(READ_KEY) || '{}'); } catch { return {}; }
    })();
    map[String(conversationId)] = new Date().toISOString();
    localStorage.setItem(READ_KEY, JSON.stringify(map));
  }, [conversationId, loadConversation, loadMessages]);

  useEffect(() => {
    lastMessageAtRef.current = lastMessageAt;
  }, [lastMessageAt]);

  useEffect(() => {
    const t = setInterval(() => {
      loadMessages(true).catch(() => {});
      const map = (() => {
        try { return JSON.parse(localStorage.getItem(READ_KEY) || '{}'); } catch { return {}; }
      })();
      map[String(conversationId)] = new Date().toISOString();
      localStorage.setItem(READ_KEY, JSON.stringify(map));
    }, 5000);
    return () => clearInterval(t);
  }, [conversationId, loadMessages]);

  const sendMessage = async () => {
    const payload = text.trim();
    if ((!payload && !imageFile) || sending) return;

    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      conversation: Number(conversationId),
      sender: me,
      text: payload,
      image_url: imageFile ? URL.createObjectURL(imageFile) : "",
      created_at: new Date().toISOString(),
    };

    setSending(true);
    setText('');
    setMessages((prev) => [...prev, optimistic]);
    try {
      const msg = await messengerService.sendMessage(conversationId, { text: payload, imageFile });
      setMessages((prev) => prev.map((m) => (m.id === tempId ? msg : m)));
      lastMessageAtRef.current = msg.created_at;
      setLastMessageAt(msg.created_at);
      setImageFile(null);
    } catch (_e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(payload);
    } finally {
      setSending(false);
    }
  };

  const startCall = async () => {
    await messengerService.startCall(conversationId, 'video');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fbff 0%, #eef4ff 55%, #e5efff 100%)', paddingBottom: 88, position: 'relative', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}>
      <style>{`
        .heart-bg:before, .heart-bg:after { content: ''; position: absolute; inset: 0; pointer-events: none; }
        .heart-bg:before {
          background:
            radial-gradient(circle at 15% 25%, rgba(37,99,235,0.08) 0 72px, transparent 73px),
            radial-gradient(circle at 72% 36%, rgba(56,189,248,0.09) 0 78px, transparent 79px),
            radial-gradient(circle at 28% 70%, rgba(37,99,235,0.07) 0 86px, transparent 87px),
            radial-gradient(circle at 82% 80%, rgba(59,130,246,0.08) 0 62px, transparent 63px);
        }
        .call-card { background: rgba(255,255,255,0.9); border-radius: 24px; padding: 14px; max-width: 78%; box-shadow: 0 10px 24px rgba(30,64,175,0.08); }
        .msg-bubble { max-width: 75%; border-radius: 22px; padding: 10px 14px; font-size: 15px; line-height: 1.35; }
        .msg-mine { margin-left: auto; background: #1d4ed8; color: #fff; border-bottom-right-radius: 8px; }
        .msg-peer { margin-right: auto; background: rgba(255,255,255,0.94); color: #0f172a; border-bottom-left-radius: 8px; }
      `}</style>
      <div className="heart-bg" />

      <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(241,245,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(148,163,184,0.25)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate('/dashboard/mobile/team-chat')} style={{ border: 0, background: 'transparent', color: '#2563eb', fontSize: 30, lineHeight: 1 }}>&lsaquo;</button>
          <div style={{ width: 48, height: 48, borderRadius: 999, border: '1px solid #fff', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: '#1e3a8a', fontWeight: 900 }}>
            {avatarUrl(peer) ? (
              <img src={avatarUrl(peer)} alt={getName(peer)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              getName(peer).slice(0, 1).toUpperCase()
            )}
            {peer?.is_online ? (
              <span style={{ position: 'absolute', right: 1, bottom: 1, width: 14, height: 14, borderRadius: 999, background: '#15803d', border: '2px solid #fff' }} />
            ) : null}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.2, color: '#0f172a' }}>{peer ? getDisplayName(peer) : 'Loading...'}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              {!peer ? 'Connecting...' : (peer.is_online ? 'Active now' : 'Offline')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          <button onClick={() => messengerService.startCall(conversationId, 'audio')} style={{ border: 0, background: 'transparent', color: '#2563eb', fontSize: 24 }}>📞</button>
          <button onClick={startCall} style={{ border: 0, background: 'transparent', color: '#2563eb', fontSize: 24 }}>🎥</button>
        </div>
      </header>

      <section style={{ padding: '14px 14px 4px', position: 'relative', zIndex: 1 }}>
        {messages.map((msg, idx) => {
          const mine = msg.sender?.id === me?.id;
          const looksLikeCall = /call/i.test(msg.text || '');
          const stamp = formatClock(msg.created_at);

          if (looksLikeCall) {
            return (
              <div key={msg.id || idx} style={{ marginBottom: 14 }}>
                <div style={{ textAlign: 'center', fontSize: 14, color: '#6f5568', margin: '8px 0 10px' }}>{stamp}</div>
                <div className="call-card" style={{ marginLeft: mine ? 'auto' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 999, background: mine ? '#9ca3af' : '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎥</div>
                    <div>
                      <div style={{ fontSize: 24 * 0.7, fontWeight: 800, color: '#3b0a2f' }}>{msg.text}</div>
                      <div style={{ fontSize: 15, color: '#a78b9f' }}>{stamp}</div>
                    </div>
                  </div>
                  <button style={{ marginTop: 12, width: '100%', border: 0, borderRadius: 14, background: '#e5e1e3', color: '#3b0a2f', fontWeight: 800, fontSize: 20 * 0.75, padding: '10px 12px' }}>Call again</button>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id || idx} style={{ marginBottom: 9, display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              {!mine && (
                <div style={{ width: 22, height: 22, borderRadius: 999, overflow: 'hidden', border: '1px solid #fff', flexShrink: 0, background: '#dbe8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8', fontWeight: 800, fontSize: 10 }}>
                  {avatarUrl(msg.sender) ? (
                    <img src={avatarUrl(msg.sender)} alt={getName(msg.sender)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (getName(msg.sender) || '?').slice(0, 1).toUpperCase()
                  )}
                </div>
              )}
              <div
                className={`msg-bubble ${mine ? 'msg-mine' : 'msg-peer'}`}
                style={msg.image_url && !(msg.text || '').trim()
                  ? { fontSize: 16, background: 'transparent', padding: 0, boxShadow: 'none', maxWidth: 'fit-content' }
                  : { fontSize: 16 }}
              >
                {msg.text ? <div>{msg.text}</div> : null}
                {msg.image_url ? (
                  <img
                    src={msg.image_url}
                    alt="chat"
                    onClick={() => setPreviewUrl(msg.image_url)}
                    style={{ marginTop: msg.text ? 8 : 0, width: 190, maxWidth: '100%', borderRadius: 12, display: 'block', cursor: 'zoom-in' }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </section>

      <footer style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, background: 'rgba(241,245,255,0.96)', borderTop: '1px solid rgba(148,163,184,0.24)', padding: '8px 12px calc(8px + env(safe-area-inset-bottom, 0px))' }}>
        {imageFile && (
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '6px 8px' }}>
            <span style={{ fontSize: 12, color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Selected: {imageFile.name}
            </span>
            <button onClick={() => setImageFile(null)} style={{ border: 0, background: 'transparent', color: '#2563eb', fontWeight: 700 }}>
              Remove
            </button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ border: '1px solid #93c5fd', borderRadius: 999, background: '#fff', color: '#1d4ed8', fontSize: 14, cursor: 'pointer', fontWeight: 700, padding: '8px 12px', whiteSpace: 'nowrap' }}>
            Attach Photo
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </label>
          <div style={{ flex: 1, border: '1px solid #93c5fd', borderRadius: 999, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', padding: '10px 12px' }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type message"
              style={{ flex: 1, border: 0, background: 'transparent', outline: 'none', fontSize: 16, fontWeight: 500, color: '#334155' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={sending || (!text.trim() && !imageFile)}
            style={{ border: 0, borderRadius: 999, background: '#2563eb', color: '#fff', fontWeight: 800, padding: '10px 14px' }}
          >
            Send
          </button>
        </div>
      </footer>

      {previewUrl && (
        <div
          onClick={() => setPreviewUrl("")}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.86)',
            zIndex: 100,
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
            style={{ maxWidth: '100%', maxHeight: '78vh', borderRadius: 12 }}
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
              onClick={() => setPreviewUrl("")}
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
