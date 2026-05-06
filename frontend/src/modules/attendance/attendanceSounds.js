/**
 * attendanceSounds.js
 * ════════════════════
 * Advanced audio + voice engine for NFC attendance scan feedback.
 *
 * Features:
 *  • 6 sound themes: harmonic | classic | modern | temple | chime | digital
 *  • ADSR envelope shaping on every note
 *  • Stereo reverb (convolution) for room ambiance
 *  • Harmonic overtone layering for richness
 *  • Stereo panning for spatial feel
 *  • Time-aware voice greetings (morning / afternoon / evening)
 *  • Voice queue — no overlapping speech
 *  • Best-voice auto-selection (prefers en-US female)
 *  • Worker context: name, trade, action, daily count
 *
 * Usage:
 *   import { playScanSound, speakScanResult, previewTheme } from './attendanceSounds';
 *
 *   playScanSound('CHECK_IN', settings);
 *   speakScanResult({ action: 'CHECK_IN', worker: { name: 'Ram Bahadur', trade: 'Mason' } }, settings);
 *   previewTheme('temple', settings);      // for the Settings UI preview button
 */

// ══════════════════════════════════════════════════════════════════════════════
// Shared AudioContext (one per page lifetime — browsers limit creation)
// ══════════════════════════════════════════════════════════════════════════════
let _sharedCtx = null;
let _audioUnlocked = false;
let _silentLoop = null; // Hidden audio element for iOS mute bypass

const SILENT_WAV = "data:audio/wav;base64,UklGRjIAAABXQVZFRm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YSAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

function getCtx() {
    if (_sharedCtx && _sharedCtx.state !== 'closed') {
        if (_sharedCtx.state === 'suspended') _sharedCtx.resume();
        return _sharedCtx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _sharedCtx = new AC();
    return _sharedCtx;
}

/**
 * Mobile Audio Unlock
 * ════════════════════
 * iOS Safari and Android Chrome block AudioContext + SpeechSynthesis until a
 * user gesture (touchstart/click) happens. CRITICALLY, the AudioContext must
 * be created AND a sound played SYNCHRONOUSLY inside the touch handler —
 * async callbacks are NOT treated as user-gesture-activated on iOS.
 *
 * Call this once on component mount. It installs a one-time capture listener.
 * For guaranteed unlock, also call forceUnlockAudio() directly inside a
 * React onClick/onTouchStart handler (e.g. a "Tap to Start" button).
 */
export function unlockAudioOnGesture() {
    if (_audioUnlocked) return;

    const unlock = () => {
        forceUnlockAudio();
    };

    ['touchstart', 'touchend', 'click', 'pointerdown'].forEach(evt =>
        document.addEventListener(evt, unlock, { once: true, capture: true, passive: true })
    );
}

/**
 * Call this directly inside a React onClick or onTouchStart handler.
 * This is the most reliable way to unlock audio on iOS Safari because
 * it runs synchronously within the user gesture stack frame.
 */
export function forceUnlockAudio() {
    if (_audioUnlocked) return;
    _audioUnlocked = true;

    // 1. Create/resume AudioContext synchronously inside gesture
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
            if (!_sharedCtx || _sharedCtx.state === 'closed') {
                _sharedCtx = new AC();
            }
            // Play a completely silent buffer — this is what unlocks the Web Audio graph
            const silentBuf = _sharedCtx.createBuffer(1, 1, _sharedCtx.sampleRate);
            const src = _sharedCtx.createBufferSource();
            src.buffer = silentBuf;
            src.connect(_sharedCtx.destination);
            src.start(0);
            _sharedCtx.resume();
        }
    } catch (e) {
        console.warn('[attendanceSounds] AudioContext unlock failed:', e);
    }

    // 2. iOS Mute Switch Bypass Trick
    // Playing a silent loop through an <audio> tag shifts iOS into "Playback" mode
    try {
        if (!_silentLoop) {
            _silentLoop = new Audio(SILENT_WAV);
            _silentLoop.loop = true;
            _silentLoop.volume = 0.01; // Tiny volume to keep session active
            _silentLoop.play().catch(e => console.warn("[attendanceSounds] Silent loop failed:", e));
        }
    } catch (e) {
        console.warn("[attendanceSounds] Mute bypass setup failed:", e);
    }

    // 3. Prime SpeechSynthesis synchronously (required on iOS Safari)
    try {
        if (window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance('');
            u.volume = 0;
            u.rate = 1;
            u.pitch = 1;
            window.speechSynthesis.speak(u);
        }
    } catch (e) {
        console.warn('[attendanceSounds] SpeechSynthesis unlock failed:', e);
    }
}



// ══════════════════════════════════════════════════════════════════════════════
// Audio helpers
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a convolution reverb buffer programmatically.
 * @param {AudioContext} ctx
 * @param {number} durationSec  — tail length in seconds
 * @param {number} decay        — how fast the tail decays (higher = shorter)
 */
function createReverb(ctx, durationSec = 0.5, decay = 3.0) {
    const len = Math.floor(ctx.sampleRate * durationSec);
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
        const ch = impulse.getChannelData(c);
        for (let i = 0; i < len; i++) {
            ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
}

/**
 * Play a single note with full ADSR envelope + optional reverb send + panning.
 *
 * @param {AudioContext}  ctx
 * @param {AudioNode}     masterGain   — master volume output node
 * @param {AudioNode|null} reverb      — reverb send node (or null)
 * @param {Object} opts
 */
function playNote(ctx, masterGain, reverb, opts) {
    const {
        freq = 440,
        start = 0,
        duration = 0.4,
        wave = 'sine',
        volume = 0.15,
        detune = 0,
        pan = 0,
        attack = 0.005,
        decay = 0.1,
        sustain = 0.6,
        release = 0.25,
        reverbMix = 0.25,
    } = opts;

    const now = ctx.currentTime + start;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const panNode = ctx.createStereoPanner
        ? ctx.createStereoPanner()
        : null;

    osc.type = wave;
    osc.frequency.setValueAtTime(freq, now);
    if (detune) osc.detune.setValueAtTime(detune, now);

    // ADSR
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + attack);
    gainNode.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);
    gainNode.gain.setValueAtTime(volume * sustain, now + duration - release);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // Routing: osc → gain → panner → masterGain
    osc.connect(gainNode);
    if (panNode) {
        panNode.pan.value = pan;
        gainNode.connect(panNode);
        panNode.connect(masterGain);
        if (reverb && reverbMix > 0) {
            const dryWet = ctx.createGain();
            dryWet.gain.value = reverbMix;
            panNode.connect(dryWet);
            dryWet.connect(reverb);
        }
    } else {
        gainNode.connect(masterGain);
        if (reverb && reverbMix > 0) {
            const dryWet = ctx.createGain();
            dryWet.gain.value = reverbMix;
            gainNode.connect(dryWet);
            dryWet.connect(reverb);
        }
    }

    osc.start(now);
    osc.stop(now + duration + 0.05);
}

/**
 * Play a chord: multiple detuned oscillators for richness.
 */
function playChord(ctx, masterGain, reverb, baseFreq, start, duration, wave, volume, detuneSpread, pan, reverbMix) {
    const offsets = [-detuneSpread, 0, detuneSpread];
    offsets.forEach((d, i) => {
        playNote(ctx, masterGain, reverb, {
            freq: baseFreq, start, duration, wave, volume: volume * 0.6,
            detune: d, pan: pan + (i - 1) * 0.15,
            attack: 0.01, decay: 0.12, sustain: 0.7, release: duration * 0.4,
            reverbMix,
        });
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// Theme definitions
// ══════════════════════════════════════════════════════════════════════════════
//
// Each theme defines CHECK_IN, CHECK_OUT, and ERROR sequences.
// A sequence is an array of note descriptors, each played by playNote().
//
// Frequencies use equal temperament:
//   C4=261.63  D4=293.66  E4=329.63  F4=349.23  G4=392.00  A4=440.00  B4=493.88
//   C5=523.25  D5=587.33  E5=659.25  F5=698.46  G5=783.99  A5=880.00  B5=987.77
//   C6=1046.50 D6=1174.66 E6=1318.51 Eb5=622.25 Gb5=739.99 Bb5=932.33
// ══════════════════════════════════════════════════════════════════════════════

const THEMES = {

    // ── Harmonic ─────────────────────────────────────────────────────────────
    // Lush rising major arpeggio on CHECK_IN, warm descend on CHECK_OUT.
    // Rich detuned chords with room reverb for a premium feel.
    harmonic: {
        label: 'Harmonic',
        description: 'Warm orchestral chimes — rich chords with reverb',
        CHECK_IN: (ctx, mg, rv, vol, pit) => {
            // C5 → E5 → G5 → C6  rising arpeggio — each with overtone
            const notes = [
                { freq: 523.25 * pit, start: 0.00, duration: 0.55, wave: 'sine', volume: 0.13 * vol, detune: 5, pan: -0.3, reverbMix: 0.35 },
                { freq: 523.25 * pit, start: 0.00, duration: 0.55, wave: 'sine', volume: 0.07 * vol, detune: -5, pan: -0.3, reverbMix: 0.35 },
                { freq: 659.25 * pit, start: 0.10, duration: 0.55, wave: 'sine', volume: 0.12 * vol, detune: 4, pan: 0.0, reverbMix: 0.35 },
                { freq: 659.25 * pit, start: 0.10, duration: 0.55, wave: 'sine', volume: 0.06 * vol, detune: -4, pan: 0.0, reverbMix: 0.35 },
                { freq: 783.99 * pit, start: 0.20, duration: 0.55, wave: 'sine', volume: 0.11 * vol, detune: 3, pan: 0.3, reverbMix: 0.40 },
                { freq: 1046.50 * pit, start: 0.32, duration: 0.70, wave: 'sine', volume: 0.14 * vol, detune: 2, pan: 0.2, reverbMix: 0.45, attack: 0.008, release: 0.45 },
                // Sub harmonic shimmer
                { freq: 1318.51 * pit, start: 0.36, duration: 0.40, wave: 'sine', volume: 0.05 * vol, detune: 0, pan: 0.4, reverbMix: 0.50 },
            ];
            notes.forEach(n => playNote(ctx, mg, rv, n));
        },
        CHECK_OUT: (ctx, mg, rv, vol, pit) => {
            // G5 → E5 → C5  descending, slower and warmer
            const notes = [
                { freq: 783.99 * pit, start: 0.00, duration: 0.60, wave: 'sine', volume: 0.11 * vol, detune: 4, pan: 0.2, reverbMix: 0.40 },
                { freq: 783.99 * pit, start: 0.00, duration: 0.60, wave: 'sine', volume: 0.06 * vol, detune: -4, pan: 0.2, reverbMix: 0.40 },
                { freq: 659.25 * pit, start: 0.13, duration: 0.60, wave: 'sine', volume: 0.10 * vol, detune: 3, pan: 0.0, reverbMix: 0.40 },
                { freq: 523.25 * pit, start: 0.28, duration: 0.75, wave: 'sine', volume: 0.12 * vol, detune: 5, pan: -0.2, reverbMix: 0.45, attack: 0.01, release: 0.50 },
                { freq: 523.25 * pit, start: 0.28, duration: 0.75, wave: 'sine', volume: 0.06 * vol, detune: -5, pan: -0.2, reverbMix: 0.45 },
            ];
            notes.forEach(n => playNote(ctx, mg, rv, n));
        },
        ERROR: (ctx, mg, rv, vol, pit) => {
            playNote(ctx, mg, rv, { freq: 220 * pit, start: 0.00, duration: 0.25, wave: 'sawtooth', volume: 0.10 * vol, detune: 15, reverbMix: 0.1 });
            playNote(ctx, mg, rv, { freq: 185 * pit, start: 0.08, duration: 0.30, wave: 'sawtooth', volume: 0.09 * vol, detune: -15, reverbMix: 0.1 });
            playNote(ctx, mg, rv, { freq: 155 * pit, start: 0.18, duration: 0.35, wave: 'sawtooth', volume: 0.08 * vol, detune: 8, reverbMix: 0.1 });
        },
    },

    // ── Classic ──────────────────────────────────────────────────────────────
    // Crisp, snappy double-beep. Familiar office / access control style.
    classic: {
        label: 'Classic',
        description: 'Crisp double-beep — familiar access-control style',
        CHECK_IN: (ctx, mg, rv, vol, pit) => {
            playNote(ctx, mg, rv, { freq: 1000 * pit, start: 0.00, duration: 0.10, wave: 'square', volume: 0.09 * vol, attack: 0.003, decay: 0.05, sustain: 0.8, release: 0.05, reverbMix: 0.08 });
            playNote(ctx, mg, rv, { freq: 1500 * pit, start: 0.13, duration: 0.14, wave: 'square', volume: 0.10 * vol, attack: 0.003, decay: 0.05, sustain: 0.8, release: 0.05, reverbMix: 0.08 });
        },
        CHECK_OUT: (ctx, mg, rv, vol, pit) => {
            playNote(ctx, mg, rv, { freq: 1500 * pit, start: 0.00, duration: 0.10, wave: 'square', volume: 0.10 * vol, attack: 0.003, decay: 0.05, sustain: 0.8, release: 0.05, reverbMix: 0.08 });
            playNote(ctx, mg, rv, { freq: 1000 * pit, start: 0.13, duration: 0.14, wave: 'square', volume: 0.09 * vol, attack: 0.003, decay: 0.05, sustain: 0.8, release: 0.05, reverbMix: 0.08 });
        },
        ERROR: (ctx, mg, rv, vol, pit) => {
            [0.00, 0.12, 0.24].forEach(t =>
                playNote(ctx, mg, rv, { freq: 300 * pit, start: t, duration: 0.09, wave: 'square', volume: 0.10 * vol, attack: 0.003, release: 0.04, reverbMix: 0.05 })
            );
        },
    },

    // ── Modern ───────────────────────────────────────────────────────────────
    // Clean glass-like pings with light sparkle. Minimal, premium.
    modern: {
        label: 'Modern',
        description: 'Glass ping with shimmer — clean and minimal',
        CHECK_IN: (ctx, mg, rv, vol, pit) => {
            // Main ping
            playNote(ctx, mg, rv, { freq: 1046.50 * pit, start: 0.00, duration: 0.55, wave: 'sine', volume: 0.13 * vol, detune: 2, pan: 0, attack: 0.002, decay: 0.06, sustain: 0.3, release: 0.45, reverbMix: 0.30 });
            // Harmonic shimmer
            playNote(ctx, mg, rv, { freq: 2093.00 * pit, start: 0.01, duration: 0.35, wave: 'sine', volume: 0.04 * vol, detune: 0, pan: 0.3, attack: 0.003, release: 0.30, reverbMix: 0.50 });
            // Rising accent
            playNote(ctx, mg, rv, { freq: 1318.51 * pit, start: 0.12, duration: 0.40, wave: 'sine', volume: 0.08 * vol, detune: 1, pan: -0.2, attack: 0.004, decay: 0.08, sustain: 0.3, release: 0.30, reverbMix: 0.35 });
            playNote(ctx, mg, rv, { freq: 1567.98 * pit, start: 0.22, duration: 0.45, wave: 'sine', volume: 0.09 * vol, detune: 1, pan: 0.2, attack: 0.004, release: 0.38, reverbMix: 0.40 });
        },
        CHECK_OUT: (ctx, mg, rv, vol, pit) => {
            playNote(ctx, mg, rv, { freq: 1318.51 * pit, start: 0.00, duration: 0.50, wave: 'sine', volume: 0.11 * vol, detune: 2, pan: 0, attack: 0.002, release: 0.42, reverbMix: 0.30 });
            playNote(ctx, mg, rv, { freq: 1046.50 * pit, start: 0.14, duration: 0.60, wave: 'sine', volume: 0.12 * vol, detune: 1, pan: 0, attack: 0.003, release: 0.50, reverbMix: 0.35 });
            playNote(ctx, mg, rv, { freq: 2093.00 * pit, start: 0.03, duration: 0.25, wave: 'sine', volume: 0.03 * vol, pan: -0.3, attack: 0.003, release: 0.20, reverbMix: 0.50 });
        },
        ERROR: (ctx, mg, rv, vol, pit) => {
            playNote(ctx, mg, rv, { freq: 440 * pit, start: 0.00, duration: 0.20, wave: 'triangle', volume: 0.10 * vol, detune: 20, reverbMix: 0.15 });
            playNote(ctx, mg, rv, { freq: 415 * pit, start: 0.08, duration: 0.25, wave: 'triangle', volume: 0.09 * vol, detune: -20, reverbMix: 0.15 });
        },
    },

    // ── Temple ───────────────────────────────────────────────────────────────
    // Singing bowl / Tibetan bell style — slow attack, long sustain, warm minor.
    // Culturally resonant for Nepali construction sites.
    temple: {
        label: 'Temple',
        description: 'Singing bowl tones — warm bell with long sustain',
        CHECK_IN: (ctx, mg, rv, vol, pit) => {
            // Eb minor chord — warm, meditative welcome
            const bowl = (freq, start, volume, pan) => playNote(ctx, mg, rv, {
                freq: freq * pit, start, duration: 1.2, wave: 'sine',
                volume: volume * vol, pan,
                attack: 0.04, decay: 0.20, sustain: 0.65, release: 0.70,
                reverbMix: 0.55, detune: 3,
            });
            bowl(622.25, 0.00, 0.12, -0.3);   // Eb5
            bowl(622.25, 0.00, 0.05, -0.3);   // overtone
            bowl(739.99, 0.12, 0.11, 0.0);   // Gb5
            bowl(932.33, 0.26, 0.12, 0.3);   // Bb5
            // Sub shimmer
            playNote(ctx, mg, rv, { freq: 311.13 * pit, start: 0.00, duration: 1.5, wave: 'sine', volume: 0.06 * vol, attack: 0.08, release: 1.0, reverbMix: 0.60, pan: 0 });
        },
        CHECK_OUT: (ctx, mg, rv, vol, pit) => {
            const bowl = (freq, start, volume, pan) => playNote(ctx, mg, rv, {
                freq: freq * pit, start, duration: 1.0, wave: 'sine',
                volume: volume * vol, pan,
                attack: 0.05, decay: 0.25, sustain: 0.55, release: 0.65,
                reverbMix: 0.55, detune: 3,
            });
            bowl(932.33, 0.00, 0.11, 0.3);
            bowl(739.99, 0.14, 0.10, 0.0);
            bowl(622.25, 0.30, 0.12, -0.3);
            playNote(ctx, mg, rv, { freq: 311.13 * pit, start: 0.30, duration: 1.4, wave: 'sine', volume: 0.05 * vol, attack: 0.08, release: 1.0, reverbMix: 0.60 });
        },
        ERROR: (ctx, mg, rv, vol, pit) => {
            playNote(ctx, mg, rv, { freq: 220 * pit, start: 0.00, duration: 0.60, wave: 'sine', volume: 0.10 * vol, detune: 25, attack: 0.03, release: 0.50, reverbMix: 0.40 });
            playNote(ctx, mg, rv, { freq: 207 * pit, start: 0.05, duration: 0.55, wave: 'sine', volume: 0.08 * vol, detune: -25, attack: 0.03, release: 0.45, reverbMix: 0.40 });
        },
    },

    // ── Chime ────────────────────────────────────────────────────────────────
    // Wind chime sparkle — pentatonic notes scattered in stereo space.
    chime: {
        label: 'Chime',
        description: 'Wind chime sparkle — airy pentatonic scatter',
        CHECK_IN: (ctx, mg, rv, vol, pit) => {
            // C pentatonic: C D E G A — ascending scatter
            const penta = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66];
            const seq = [0, 2, 4, 1, 3, 5, 6];  // non-linear sparkle order
            seq.forEach((idx, i) => {
                playNote(ctx, mg, rv, {
                    freq: penta[idx] * pit,
                    start: i * 0.055 + (Math.random() * 0.02),
                    duration: 0.5 + Math.random() * 0.2,
                    wave: 'sine',
                    volume: (0.09 + Math.random() * 0.03) * vol,
                    pan: (Math.random() - 0.5) * 0.9,
                    attack: 0.002, decay: 0.05, sustain: 0.2, release: 0.40,
                    reverbMix: 0.50,
                });
            });
        },
        CHECK_OUT: (ctx, mg, rv, vol, pit) => {
            const penta = [880.00, 783.99, 659.25, 587.33, 523.25, 440.00, 392.00];
            penta.forEach((freq, i) => {
                playNote(ctx, mg, rv, {
                    freq: freq * pit,
                    start: i * 0.065,
                    duration: 0.45,
                    wave: 'sine',
                    volume: (0.08 - i * 0.008) * vol,
                    pan: (Math.random() - 0.5) * 0.8,
                    attack: 0.002, release: 0.38,
                    reverbMix: 0.45,
                });
            });
        },
        ERROR: (ctx, mg, rv, vol, pit) => {
            [440, 466, 415].forEach((f, i) =>
                playNote(ctx, mg, rv, { freq: f * pit, start: i * 0.07, duration: 0.18, wave: 'sine', volume: 0.10 * vol, reverbMix: 0.25 })
            );
        },
    },

    // ── Digital ──────────────────────────────────────────────────────────────
    // Futuristic sci-fi scanner sweep — ascending frequency chirp.
    digital: {
        label: 'Digital',
        description: 'Sci-fi scanner sweep — rising frequency chirp',
        CHECK_IN: (ctx, mg, rv, vol, pit) => {
            // Rising chirp sweep
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(300 * pit, now + 0.02);
            osc.frequency.exponentialRampToValueAtTime(1600 * pit, now + 0.32);

            gain.gain.setValueAtTime(0, now + 0.02);
            gain.gain.linearRampToValueAtTime(0.12 * vol, now + 0.06);
            gain.gain.linearRampToValueAtTime(0.10 * vol, now + 0.28);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.40);

            osc.connect(gain);
            if (panner) { panner.pan.value = 0; gain.connect(panner); panner.connect(ctx.destination); }
            else { gain.connect(ctx.destination); }

            osc.start(now + 0.02);
            osc.stop(now + 0.45);

            // Second harmonic layer
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(600 * pit, now + 0.05);
            osc2.frequency.exponentialRampToValueAtTime(3200 * pit, now + 0.35);
            gain2.gain.setValueAtTime(0, now + 0.05);
            gain2.gain.linearRampToValueAtTime(0.04 * vol, now + 0.10);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.05);
            osc2.stop(now + 0.42);

            // Confirmation tick
            playNote(ctx, gain, null, { freq: 1800 * pit, start: 0.33, duration: 0.08, wave: 'square', volume: 0.08 * vol, attack: 0.003, release: 0.05 });
        },
        CHECK_OUT: (ctx, mg, rv, vol, pit) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1400 * pit, now + 0.02);
            osc.frequency.exponentialRampToValueAtTime(350 * pit, now + 0.30);

            gain.gain.setValueAtTime(0, now + 0.02);
            gain.gain.linearRampToValueAtTime(0.11 * vol, now + 0.05);
            gain.gain.linearRampToValueAtTime(0.09 * vol, now + 0.27);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + 0.02);
            osc.stop(now + 0.42);

            playNote(ctx, gain, null, { freq: 800 * pit, start: 0.28, duration: 0.08, wave: 'square', volume: 0.07 * vol, attack: 0.003, release: 0.05 });
        },
        ERROR: (ctx, mg, rv, vol, pit) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400 * pit, now);
            osc.frequency.linearRampToValueAtTime(200 * pit, now + 0.4);
            gain.gain.setValueAtTime(0.10 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.5);
        },
    },
};

// ══════════════════════════════════════════════════════════════════════════════
// Public API — playScanSound
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Play the scan feedback sound.
 *
 * @param {'CHECK_IN'|'CHECK_OUT'|'ERROR'} type
 * @param {Object} settings   — ProjectAttendanceSettings from the API
 */
export function playScanSound(type = 'CHECK_IN', settings = {}) {
    const s = settings || {};
    try {
        if (s.sound_enabled === false) return;

        const ctx = getCtx();
        if (!ctx) return;

        // Ensure context is running (especially important on mobile)
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => { });
        }

        const vol = s.sound_volume !== undefined ? parseFloat(s.sound_volume) : 0.5;
        const pit = s.sound_pitch !== undefined ? parseFloat(s.sound_pitch) : 1.0;
        const theme = s.sound_theme || 'harmonic';

        const def = THEMES[theme] || THEMES.harmonic;
        const fn = def[type] || def.ERROR;

        console.log(`[attendanceSounds] Playing ${type} (Theme: ${theme}, Vol: ${vol}, Pit: ${pit})`);

        // Master gain for volume control
        const masterGain = ctx.createGain();
        masterGain.gain.value = 1.0;
        masterGain.connect(ctx.destination);

        // Reverb output (wet signal goes here → destination)
        let reverb = null;
        try {
            reverb = createReverb(ctx, 0.6, 3.5);
            const reverbGain = ctx.createGain();
            reverbGain.gain.value = 0.4;
            reverb.connect(reverbGain);
            reverbGain.connect(ctx.destination);
        } catch { reverb = null; }

        fn(ctx, masterGain, reverb, vol, pit);

    } catch (e) {
        console.warn('[attendanceSounds] Audio feedback failed:', e);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// Public API — previewTheme (for Settings UI)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Preview a theme's CHECK_IN sound from the Settings UI.
 *
 * @param {string} themeName
 * @param {Object} settings
 */
export function previewTheme(themeName, settings = {}) {
    playScanSound('CHECK_IN', { ...settings, sound_theme: themeName });
}

/**
 * All available themes with labels and descriptions.
 */
export const SOUND_THEMES = Object.fromEntries(
    Object.entries(THEMES).map(([key, def]) => [key, { label: def.label, description: def.description }])
);

// ══════════════════════════════════════════════════════════════════════════════
// Voice engine
// ══════════════════════════════════════════════════════════════════════════════

// Voice queue to prevent overlapping utterances
const _voiceQueue = [];
let _voicePlaying = false;

function _dequeueVoice() {
    if (_voicePlaying || _voiceQueue.length === 0) return;
    _voicePlaying = true;
    const { text, rate, pitch, voice } = _voiceQueue.shift();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = rate;
    utt.pitch = pitch;
    utt.volume = 1.0;
    if (voice) utt.voice = voice;
    utt.onend = () => { _voicePlaying = false; _dequeueVoice(); };
    utt.onerror = () => { _voicePlaying = false; _dequeueVoice(); };
    window.speechSynthesis.speak(utt);
}

function _enqueueVoice(text, settings) {
    if (!window.speechSynthesis) return;
    const rate = settings.voice_rate !== undefined ? parseFloat(settings.voice_rate) : 1.05;
    const pitch = settings.voice_pitch !== undefined ? parseFloat(settings.voice_pitch) : 1.0;

    // Pick best voice: prefer en-US, prefer female
    let voice = null;
    try {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const enUS = voices.filter(v => v.lang.startsWith('en'));
            const female = enUS.filter(v => /female|woman|zira|samantha|karen|victoria|moira|fiona/i.test(v.name));
            voice = female[0] || enUS[0] || voices[0];
        }
    } catch { /* ignore */ }

    _voiceQueue.push({ text, rate, pitch, voice });

    // Limit queue depth — drop oldest if too deep (e.g. rapid taps)
    if (_voiceQueue.length > 3) _voiceQueue.shift();

    _dequeueVoice();
}

// Clears any pending speech (e.g. when navigating away)
export function cancelVoice() {
    _voiceQueue.length = 0;
    _voicePlaying = false;
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
}

// Time-aware greeting
function _timeGreeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Good morning';
    if (h >= 12 && h < 17) return 'Good afternoon';
    if (h >= 17 && h < 21) return 'Good evening';
    return 'Hello';
}

/**
 * Speak rich feedback after an NFC scan.
 *
 * @param {Object} scanResult   — response from attendanceService.nfcAttendanceScan
 *   scanResult.success         boolean
 *   scanResult.action          'CHECK_IN' | 'CHECK_OUT'
 *   scanResult.worker          { name, trade }
 *   scanResult.message         string
 *   scanResult.present_count   optional: how many workers on site today
 * @param {Object} settings     — ProjectAttendanceSettings
 */
export function speakScanResult(scanResult, settings = {}) {
    const s = settings || {};
    try {
        if (s.voice_enabled === false) return;

        const { success, action, worker, message, present_count } = scanResult || {};
        const name = worker?.name || '';
        const trade = worker?.trade || '';

        let text = '';

        if (success && action === 'CHECK_IN') {
            const greeting = _timeGreeting();
            if (name) {
                text = `${greeting}, ${name}. Checked in.`;
            } else {
                text = `${greeting}. Checked in.`;
            }
            // Optionally mention worker count
            if (present_count && present_count > 1) {
                text += ` ${present_count} workers on site.`;
            }
        } else if (success && action === 'CHECK_OUT') {
            if (name) {
                text = `Goodbye, ${name}. Have a safe journey.`;
            } else {
                text = 'Checked out. Have a safe journey.';
            }
        } else if (!success && message) {
            // Extract a short, speakable version of the error
            const spoken = message
                .replace(/[^a-zA-Z0-9 ,.'!?-]/g, '')
                .slice(0, 80);
            text = spoken || 'Scan not registered.';
        } else {
            text = 'Scan not registered.';
        }

        if (text) _enqueueVoice(text, settings);

    } catch (e) {
        console.warn('[attendanceSounds] Voice feedback failed:', e);
    }
}

/**
 * Speak arbitrary text (for system messages, test button, etc.)
 */
export function speakText(text, settings = {}) {
    const s = settings || {};
    try {
        if (s.voice_enabled === false) return;
        _enqueueVoice(text, s);
    } catch (e) {
        console.warn('[attendanceSounds] speakText failed:', e);
    }
}
