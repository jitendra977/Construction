import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, MessageCircle, X } from 'lucide-react';
import { assistantService } from '../../services/api';

/**
 * साथी — floating mic button with a conversation tray.
 *
 * Uses the browser Web Speech API for Nepali STT. Falls back to a
 * text input when speech APIs aren't available (Safari iOS, older
 * Android WebViews).
 */
const SathiButton = () => {
    const [open, setOpen] = useState(false);
    const [listening, setListening] = useState(false);
    const [busy, setBusy] = useState(false);
    const [typedText, setTypedText] = useState('');
    const [messages, setMessages] = useState([
        { role: 'sathi', text: 'नमस्ते! म साथी हुँ। तपाईंलाई कसरी सहयोग गरूँ?' },
    ]);
    const recognitionRef = useRef(null);
    const supportsSpeech = typeof window !== 'undefined' &&
        (window.SpeechRecognition || window.webkitSpeechRecognition);

    const send = async (transcript) => {
        if (!transcript?.trim()) return;
        setMessages((m) => [...m, { role: 'user', text: transcript }]);
        setBusy(true);
        try {
            const { data } = await assistantService.ask(transcript, 'ne');
            setMessages((m) => [...m, { role: 'sathi', text: data.response_text, intent: data.intent }]);
            try {
                if ('speechSynthesis' in window && data.response_text) {
                    const u = new SpeechSynthesisUtterance(data.response_text);
                    u.lang = 'ne-NP';
                    window.speechSynthesis.speak(u);
                }
            } catch {
                /* ignore */
            }
        } catch (e) {
            setMessages((m) => [...m, { role: 'sathi', text: 'त्रुटि: साथी उपलब्ध छैन।' }]);
        } finally {
            setBusy(false);
        }
    };

    const toggleListen = () => {
        if (!supportsSpeech) return;
        if (listening) {
            recognitionRef.current?.stop();
            return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.lang = 'ne-NP';
        rec.continuous = false;
        rec.interimResults = false;
        rec.onstart = () => setListening(true);
        rec.onend = () => setListening(false);
        rec.onerror = () => setListening(false);
        rec.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            send(transcript);
        };
        rec.start();
        recognitionRef.current = rec;
    };

    useEffect(() => () => recognitionRef.current?.stop?.(), []);

    return (
        <>
            {/* Floating trigger */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 flex items-center justify-center z-50"
                aria-label="साथी सहायक"
                title="साथी"
            >
                {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </button>

            {open && (
                <div className="fixed bottom-24 right-6 w-80 bg-white rounded-xl border shadow-2xl flex flex-col z-50 overflow-hidden">
                    <div className="px-4 py-2 border-b bg-gradient-to-r from-blue-600 to-blue-500 text-white">
                        <div className="font-semibold">साथी</div>
                        <div className="text-xs opacity-80">आवाजमा सहयोग</div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm max-h-80">
                        {messages.map((m, i) => (
                            <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                                <span
                                    className={`inline-block px-2 py-1 rounded ${m.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
                                        }`}
                                >
                                    {m.text}
                                </span>
                            </div>
                        ))}
                        {busy && (
                            <div className="text-gray-500 text-xs inline-flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> सोच्दै…
                            </div>
                        )}
                    </div>

                    <div className="p-2 border-t flex items-center gap-2">
                        {supportsSpeech ? (
                            <button
                                onClick={toggleListen}
                                className={`p-2 rounded-full border ${listening ? 'bg-red-600 text-white' : 'bg-white'
                                    }`}
                                title={listening ? 'रोक्नुहोस्' : 'बोल्नुहोस्'}
                            >
                                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>
                        ) : null}
                        <input
                            value={typedText}
                            onChange={(e) => setTypedText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    send(typedText);
                                    setTypedText('');
                                }
                            }}
                            placeholder={supportsSpeech ? 'वा टाइप गर्नुहोस्…' : 'प्रश्न टाइप गर्नुहोस्'}
                            className="flex-1 border rounded-md px-2 py-1 text-sm"
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default SathiButton;
