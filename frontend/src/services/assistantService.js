import api from './client';

export const assistantService = {
    // Legacy rule-based voice command
    ask: (transcript, language = 'ne') =>
        api.post('assistant/voice-commands/ask/', { transcript, language }),

    // AI chat — Groq / Gemini / OpenAI
    // provider: "auto" | "groq" | "gemini" | "openai"
    chat: (message, history = [], projectId = null, language = 'ne', provider = 'auto') => {
        const safeMessage = String(message || '').trim();
        const safeHistory = Array.isArray(history)
            ? history
                .filter((h) => h && typeof h === 'object')
                .map((h) => ({
                    role: h.role === 'assistant' ? 'assistant' : 'user',
                    content: String(h.content || '').slice(0, 4000),
                }))
                .filter((h) => h.content)
                .slice(-20)
            : [];

        return api.post(
            'assistant/chat/',
            {
                message: safeMessage,
                history: safeHistory,
                project_id: projectId,
                language,
                provider,
            },
            {
                _silentError: true,
                timeout: 45000,
            },
        );
    },

    // Groq Whisper STT — sends audio blob, returns { transcript, language }
    transcribe: (audioBlob, language = 'ne') => {
        const form = new FormData();
        form.append('audio', audioBlob, `recording.${_ext(audioBlob.type)}`);
        form.append('language', language);
        return api.post('assistant/transcribe/', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            _silentError: true,
        });
    },

    // Edge TTS / ElevenLabs / OpenAI TTS — returns audio/mpeg ArrayBuffer
    tts: (text, voiceId = null, lang = 'ne') => {
        const body = { text, lang };
        if (voiceId) body.voice_id = voiceId;
        return api.post('assistant/tts/', body, {
            responseType: 'arraybuffer',
            _silentError: true,
        });
    },

    getHistory: () => api.get('assistant/voice-commands/'),
    getPhrases: () => api.get('assistant/phrases/'),
    addPhrase:  (payload) => api.post('assistant/phrases/', payload),
};

// Derive file extension from MIME type
function _ext(mime = '') {
    if (mime.includes('webm')) return 'webm';
    if (mime.includes('ogg'))  return 'ogg';
    if (mime.includes('mp4'))  return 'mp4';
    if (mime.includes('wav'))  return 'wav';
    return 'webm';
}
