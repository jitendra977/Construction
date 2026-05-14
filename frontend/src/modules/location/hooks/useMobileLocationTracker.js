/**
 * useMobileLocationTracker
 * ─────────────────────────
 * Watches the device GPS and pings the backend automatically.
 *
 * Permission flow:
 *  1. On mount: query navigator.permissions to detect pre-existing denial
 *     without triggering the browser prompt.
 *  2. When enabled + projectId: call watchPosition (triggers prompt if needed).
 *  3. Expose requestPermission() so UI can trigger a manual prompt / retry.
 *  4. Listen for permission changes (user flips setting in browser).
 *
 * Ping rules (battery-conscious):
 *  - Moved > 15 m   → ping immediately
 *  - Time  > 45 s   → keep-alive ping regardless of movement
 *  - Accuracy > 50 m → skip (too noisy)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { locationApi } from '../../../services/locationApi';

const PING_INTERVAL_MS = 45_000;
const MIN_MOVE_M       = 15;
const MAX_ACCURACY_M   = 50;

function haversineM(lat1, lon1, lat2, lon2) {
    const R   = 6_371_000;
    const toR = d => (d * Math.PI) / 180;
    const dLat = toR(lat2 - lat1);
    const dLon = toR(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useMobileLocationTracker(projectId, { enabled = true } = {}) {
    const [permission,   setPermission]   = useState('unknown');  // unknown|prompt|granted|denied|unavailable
    const [position,     setPosition]     = useState(null);
    const [status,       setStatus]       = useState('idle');     // idle|tracking|on_site|off_site|error
    const [geofenceName, setGeofenceName] = useState(null);
    const [error,        setError]        = useState(null);
    const [lastPingAt,   setLastPingAt]   = useState(null);
    const [pingCount,    setPingCount]    = useState(0);

    const watchRef    = useRef(null);
    const lastPingRef = useRef(null);

    // ── Ping backend ───────────────────────────────────────────────────────────
    const sendPing = useCallback(async (lat, lon, accuracy, heading) => {
        try {
            const res = await locationApi.pingLocation({
                latitude: lat, longitude: lon,
                accuracy: accuracy ?? 0, heading: heading ?? null,
            });
            setLastPingAt(new Date());
            setPingCount(n => n + 1);
            if (res.status === 'on_site') {
                setStatus('on_site');
                setGeofenceName(res.geofence_name || null);
            } else if (res.status !== 'ignored') {
                setStatus('off_site');
                setGeofenceName(null);
            }
        } catch (e) {
            console.warn('[MobileTracker] ping failed:', e?.message);
        }
    }, []);

    // ── Throttle ───────────────────────────────────────────────────────────────
    const maybePin = useCallback((lat, lon, accuracy, heading) => {
        if (accuracy > MAX_ACCURACY_M) return;
        const now  = Date.now();
        const prev = lastPingRef.current;
        const tooSoon    = prev && (now - prev.time) < PING_INTERVAL_MS;
        const barelyMoved = prev && haversineM(lat, lon, prev.lat, prev.lon) < MIN_MOVE_M;
        if (tooSoon && barelyMoved) return;
        lastPingRef.current = { lat, lon, time: now };
        sendPing(lat, lon, accuracy, heading);
    }, [sendPing]);

    // ── Geo callbacks ──────────────────────────────────────────────────────────
    const onPosition = useCallback((pos) => {
        const { latitude: lat, longitude: lon, accuracy, heading } = pos.coords;
        setPosition({ lat, lon, accuracy, heading });
        setPermission('granted');
        setError(null);
        setStatus(s => (s === 'idle' || s === 'error') ? 'tracking' : s);
        maybePin(lat, lon, accuracy, heading);
    }, [maybePin]);

    const onError = useCallback((err) => {
        if (err.code === 1) {
            // PERMISSION_DENIED
            setPermission('denied');
            setStatus('error');
            setError('denied');
        } else if (err.code === 2) {
            // POSITION_UNAVAILABLE
            setStatus('error');
            setError('unavailable');
        } else {
            // TIMEOUT
            setStatus('error');
            setError('timeout');
        }
    }, []);

    // ── Start/stop watch ───────────────────────────────────────────────────────
    const startWatch = useCallback(() => {
        if (!navigator?.geolocation) return;
        if (watchRef.current != null) return; // already watching
        watchRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
            enableHighAccuracy: true,
            timeout:    15_000,
            maximumAge: 30_000,
        });
        setStatus(s => s === 'idle' ? 'tracking' : s);
    }, [onPosition, onError]);

    const stopWatch = useCallback(() => {
        if (watchRef.current != null) {
            navigator.geolocation.clearWatch(watchRef.current);
            watchRef.current = null;
        }
    }, []);

    // ── Manual permission request / retry ──────────────────────────────────────
    const requestPermission = useCallback(() => {
        if (!window.isSecureContext && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            setPermission('denied');
            setStatus('error');
            setError('insecure_context');
            return;
        }
        if (!navigator?.geolocation) {
            setPermission('unavailable');
            setStatus('error');
            setError('unsupported');
            return;
        }
        // getCurrentPosition triggers the browser prompt immediately
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                onPosition(pos);
                // If we weren't watching yet, start now
                startWatch();
            },
            onError,
            { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
        );
    }, [onPosition, onError, startWatch]);

    // ── Check pre-existing permission state on mount (no prompt) ──────────────
    useEffect(() => {
        if (!navigator?.permissions) {
            // Permissions API not supported — set to prompt so UI shows button
            setPermission('prompt');
            return;
        }

        let permResult = null;

        navigator.permissions.query({ name: 'geolocation' }).then(result => {
            permResult = result;

            if (result.state === 'denied') {
                setPermission('denied');
                setStatus('error');
                setError('denied');
            } else if (result.state === 'granted') {
                setPermission('granted');
            } else {
                setPermission('prompt');
            }

            // Listen for permission changes (user flips setting mid-session)
            result.onchange = () => {
                if (result.state === 'denied') {
                    setPermission('denied');
                    setStatus('error');
                    setError('denied');
                    stopWatch();
                } else if (result.state === 'granted') {
                    setPermission('granted');
                    setError(null);
                    // Restart tracking if we were enabled
                    if (enabled && projectId) startWatch();
                } else {
                    setPermission('prompt');
                }
            };
        }).catch(() => {
            setPermission('prompt');
        });

        return () => {
            if (permResult) permResult.onchange = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-prompt: trigger native browser popup as soon as state is 'prompt' ──
    // Fires independently of projectId so the user sees the dialog immediately
    // on first visit, without having to tap any button.
    useEffect(() => {
        if (permission !== 'prompt') return;
        if (!navigator?.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                onPosition(pos);
                startWatch();            // begin continuous tracking straight away
            },
            onError,
            { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
        );
    }, [permission, onPosition, onError, startWatch]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-start watch when ready ────────────────────────────────────────────
    useEffect(() => {
        if (!enabled || !projectId) return;
        if (!navigator?.geolocation) {
            setPermission('unavailable');
            setStatus('error');
            setError('unsupported');
            return;
        }
        // Don't call watchPosition if already denied — wait for user to fix in settings
        if (permission === 'denied') return;

        startWatch();
        return stopWatch;
    }, [enabled, projectId, permission, startWatch, stopWatch]);

    return {
        permission,       // 'unknown'|'prompt'|'granted'|'denied'|'unavailable'
        position,         // { lat, lon, accuracy, heading } | null
        status,           // 'idle'|'tracking'|'on_site'|'off_site'|'error'
        geofenceName,
        error,            // 'denied'|'unavailable'|'timeout'|'unsupported'|null
        lastPingAt,
        pingCount,
        requestPermission,
    };
}
