import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Mic, Square } from 'lucide-react';
import { assistantService } from '../../services/api';

function appendTranscript(existing, transcript) {
    const next = (transcript || '').trim();
    if (!next) return existing || '';
    const base = (existing || '').trimEnd();
    return base ? `${base}\n${next}` : next;
}

export default function VoiceNoteInput({
    value,
    onChange,
    placeholder,
    rows = 3,
    language = 'ne',
    disabled = false,
    textareaClassName = '',
    textareaStyle = {},
    wrapperStyle = {},
}) {
    const recorderRef = useRef(null);
    const streamRef = useRef(null);
    const recognitionRef = useRef(null);
    const chunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const levelFrameRef = useRef(null);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [lastTranscript, setLastTranscript] = useState('');
    const [audioLevel, setAudioLevel] = useState(0.08);
    const showListeningModal = status === 'recording' || status === 'transcribing';

    const updateValue = useCallback((nextValue) => {
        onChange?.(nextValue);
    }, [onChange]);

    const stopAll = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.onresult = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onend = null;
            try { recognitionRef.current.stop(); } catch (_err) { void _err; }
            recognitionRef.current = null;
        }

        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            try { recorderRef.current.stop(); } catch (_err) { void _err; }
        }
        recorderRef.current = null;

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (levelFrameRef.current) {
            cancelAnimationFrame(levelFrameRef.current);
            levelFrameRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        setAudioLevel(0.08);
    }, []);

    useEffect(() => () => stopAll(), [stopAll]);

    const startBrowserSpeechRecognition = useCallback(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            throw new Error('Browser speech recognition is not available.');
        }

        setStatus('recording');
        setError('');
        setLastTranscript('');

        const recognition = new SR();
        recognition.lang = language === 'ne' ? 'ne-NP' : 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

        recognition.onresult = (event) => {
            const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
            if (!transcript) return;
            updateValue(appendTranscript(value, transcript));
            setLastTranscript(transcript);
            setStatus('idle');
        };

        recognition.onerror = (event) => {
            setError(event.error === 'not-allowed'
                ? 'Microphone permission denied. Browser permission check गर्नुहोस्।'
                : `Voice typing failed: ${event.error}`);
            setStatus('idle');
        };

        recognition.onend = () => {
            recognitionRef.current = null;
            setStatus(current => (current === 'recording' ? 'idle' : current));
        };

        recognition.start();
    }, [language, updateValue, value]);

    const transcribeBlob = useCallback(async (blob) => {
        try {
            const { data } = await assistantService.transcribe(blob, language);
            const transcript = (data?.transcript || '').trim();
            if (!transcript) {
                setError('No speech detected. फेरि स्पष्ट बोल्नुहोस्।');
                return;
            }
            updateValue(appendTranscript(value, transcript));
            setLastTranscript(transcript);
            setError('');
        } catch (err) {
            const fallbackSupported = typeof window !== 'undefined'
                && (window.SpeechRecognition || window.webkitSpeechRecognition);
            if (fallbackSupported) {
                setError('Server transcription failed. Browser voice typing fallback सुरु भयो।');
                startBrowserSpeechRecognition();
                return;
            }
            setError(err?.response?.data?.detail || err?.message || 'Voice typing failed.');
        } finally {
            setStatus(current => (current === 'transcribing' ? 'idle' : current));
        }
    }, [language, startBrowserSpeechRecognition, updateValue, value]);

    const startRecording = useCallback(async () => {
        if (disabled || status === 'recording' || status === 'transcribing') return;
        setError('');
        setLastTranscript('');

        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            try {
                startBrowserSpeechRecognition();
            } catch (err) {
                setError(err.message);
            }
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            chunksRef.current = [];
            setAudioLevel(0.12);

            const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
            if (AudioContextCtor) {
                const audioContext = new AudioContextCtor();
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.82;
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                audioContextRef.current = audioContext;
                analyserRef.current = analyser;

                const data = new Uint8Array(analyser.frequencyBinCount);
                const tick = () => {
                    if (!analyserRef.current) return;
                    analyserRef.current.getByteFrequencyData(data);
                    const avg = data.reduce((sum, value) => sum + value, 0) / (data.length || 1);
                    const normalized = Math.max(0.08, Math.min(1, avg / 110));
                    setAudioLevel(normalized);
                    levelFrameRef.current = requestAnimationFrame(tick);
                };
                tick();
            }

            const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
                .find(type => MediaRecorder.isTypeSupported(type)) || '';
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            recorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data?.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
                if (levelFrameRef.current) {
                    cancelAnimationFrame(levelFrameRef.current);
                    levelFrameRef.current = null;
                }
                if (audioContextRef.current) {
                    audioContextRef.current.close().catch(() => {});
                    audioContextRef.current = null;
                }
                analyserRef.current = null;
                recorderRef.current = null;
                if (!chunksRef.current.length) {
                    setStatus('idle');
                    setError('No audio captured. फेरि प्रयास गर्नुहोस्।');
                    return;
                }
                setStatus('transcribing');
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                chunksRef.current = [];
                await transcribeBlob(blob);
            };

            recorder.start(250);
            setStatus('recording');
        } catch (err) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('Microphone permission denied. Browser permission check गर्नुहोस्।');
            } else if (err.name === 'NotFoundError') {
                setError('No microphone found on this device.');
            } else {
                setError(err.message || 'Could not start recording.');
            }
            setStatus('idle');
        }
    }, [disabled, startBrowserSpeechRecognition, status, transcribeBlob]);

    const stopRecording = useCallback(() => {
        if (recognitionRef.current) {
            stopAll();
            setStatus('idle');
            return;
        }
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }
    }, [stopAll]);

    const toggleRecording = useCallback(() => {
        if (status === 'recording') {
            stopRecording();
            return;
        }
        startRecording();
    }, [startRecording, status, stopRecording]);

    const helperText = error
        || (status === 'recording'
            ? 'Listening... now speak your task note. अहिले बोल्नुहोस्।'
            : status === 'transcribing'
            ? 'Transcribing voice note... आवाज टाइप हुँदैछ...'
            : lastTranscript
            ? `Added: ${lastTranscript}`
            : 'Tap the mic to dictate the note. माइक थिचेर नोट बोल्नुहोस्।');
    const pulseScale = status === 'recording' ? 1 + audioLevel * 0.45 : 1;
    const ringScale = status === 'recording' ? 1.1 + audioLevel * 0.55 : 1.12;
    const bars = [0.55, 0.82, 1, 0.82, 0.55];

    return (
        <>
            <div style={{ ...wrapperStyle }}>
                <textarea
                    className={textareaClassName}
                    rows={rows}
                    value={value}
                    onChange={(event) => updateValue(event.target.value)}
                    placeholder={placeholder}
                    disabled={disabled || status === 'transcribing'}
                    style={textareaStyle}
                />
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginTop: 8,
                    flexWrap: 'wrap',
                }}>
                    <button
                        type="button"
                        onClick={toggleRecording}
                        disabled={disabled || status === 'transcribing'}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: 10,
                            border: '1px solid var(--t-border)',
                            background: status === 'recording'
                                ? 'rgba(239,68,68,0.12)'
                                : 'var(--t-surface)',
                            color: status === 'recording' ? '#ef4444' : 'var(--t-text)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.55 : 1,
                        }}
                    >
                        {status === 'transcribing'
                            ? <Loader2 size={16} className="animate-spin" />
                            : status === 'recording'
                            ? <Square size={15} />
                            : <Mic size={15} />}
                        {status === 'recording'
                            ? 'Stop'
                            : status === 'transcribing'
                            ? 'Typing...'
                            : 'Voice Typing'}
                    </button>
                    <div style={{
                        flex: 1,
                        minWidth: 180,
                        fontSize: 11,
                        lineHeight: 1.45,
                        color: error ? '#ef4444' : 'var(--t-text3)',
                        textAlign: 'right',
                    }}>
                        {helperText}
                    </div>
                </div>
            </div>

            {showListeningModal && typeof document !== 'undefined' && createPortal(
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 160,
                    background: 'rgba(0,0,0,0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                }}>
                    <div style={{
                        width: 'min(320px, 92vw)',
                        borderRadius: 24,
                        background: 'var(--t-surface)',
                        border: '1px solid var(--t-border)',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
                        padding: '22px 18px 16px',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            width: 72,
                            height: 72,
                            margin: '0 auto 14px',
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            background: status === 'recording'
                                ? 'radial-gradient(circle, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.08) 55%, transparent 56%)'
                                : 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.08) 55%, transparent 56%)',
                            transform: `scale(${ringScale})`,
                            transition: 'transform 90ms linear',
                        }}>
                            <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                display: 'grid',
                                placeItems: 'center',
                                background: status === 'recording' ? '#ef4444' : '#3b82f6',
                                color: '#fff',
                                boxShadow: status === 'recording'
                                    ? '0 0 0 10px rgba(239,68,68,0.12)'
                                    : '0 0 0 10px rgba(59,130,246,0.12)',
                                transform: `scale(${pulseScale})`,
                                transition: 'transform 90ms linear, box-shadow 90ms linear',
                            }}>
                                {status === 'transcribing'
                                    ? <Loader2 size={22} className="animate-spin" />
                                    : <Mic size={22} />}
                            </div>
                        </div>

                        {status === 'recording' && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'center',
                                gap: 6,
                                height: 30,
                                marginBottom: 8,
                            }}>
                                {bars.map((factor, index) => (
                                    <span
                                        key={index}
                                        style={{
                                            display: 'block',
                                            width: 7,
                                            borderRadius: 999,
                                            background: index === 2 ? '#ef4444' : 'rgba(239,68,68,0.72)',
                                            height: `${10 + audioLevel * 18 * factor}px`,
                                            transition: 'height 90ms linear',
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        <p style={{
                            margin: 0,
                            fontSize: 18,
                            fontWeight: 900,
                            color: 'var(--t-text)',
                        }}>
                            {status === 'recording' ? 'Listening...' : 'Typing voice note...'}
                        </p>
                        <p style={{
                            margin: '8px 0 0',
                            fontSize: 12,
                            lineHeight: 1.5,
                            color: 'var(--t-text3)',
                        }}>
                            {status === 'recording'
                                ? 'Speak clearly. The note will be added after you stop recording. अहिले स्पष्ट बोल्नुहोस्।'
                                : 'Your voice is being converted into note text. आवाज नोटमा बदलिँदैछ।'}
                        </p>

                        {status === 'recording' && (
                            <button
                                type="button"
                                onClick={stopRecording}
                                style={{
                                    marginTop: 16,
                                    minWidth: 120,
                                    padding: '10px 16px',
                                    borderRadius: 12,
                                    border: 'none',
                                    background: '#ef4444',
                                    color: '#fff',
                                    fontSize: 13,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                }}
                            >
                                Stop Recording
                            </button>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
