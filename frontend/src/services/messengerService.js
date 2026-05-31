import createApiClient from './createApiClient';

const api = createApiClient();

export const messengerService = {
  listMembers: async (q = '') => {
    const { data } = await api.get(`messenger/members/${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    return data;
  },

  heartbeatPresence: async () => {
    const { data } = await api.post('messenger/members/presence-heartbeat/');
    return data;
  },

  listConversations: async () => {
    const { data } = await api.get('messenger/conversations/');
    return data;
  },

  startDirectConversation: async (userId) => {
    const { data } = await api.post('messenger/conversations/start-direct/', { user_id: userId });
    return data;
  },

  listMessages: async (conversationId, since = '') => {
    const { data } = await api.get(
      `messenger/conversations/${conversationId}/messages/${since ? `?since=${encodeURIComponent(since)}` : ''}`
    );
    return data;
  },

  sendMessage: async (conversationId, payload = {}) => {
    const formData = new FormData();
    const text = (typeof payload === 'string' ? payload : payload.text) || '';
    const imageFile = typeof payload === 'object' ? payload.imageFile : null;

    formData.append('conversation', conversationId);
    if (text) formData.append('text', text);
    if (imageFile) formData.append('image', imageFile);

    const { data } = await api.post(`messenger/conversations/${conversationId}/messages/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  startCall: async (conversationId, callType = 'audio') => {
    const { data } = await api.post('messenger/calls/', { conversation: conversationId, call_type: callType });
    return data;
  },

  acceptCall: async (callId) => {
    const { data } = await api.post(`messenger/calls/${callId}/accept/`);
    return data;
  },

  endCall: async (callId) => {
    const { data } = await api.post(`messenger/calls/${callId}/end/`);
    return data;
  },
};
