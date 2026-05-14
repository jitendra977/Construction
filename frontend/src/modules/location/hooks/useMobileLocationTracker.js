/**
 * useMobileLocationTracker
 * ─────────────────────────
 * Watches the device GPS and pings the backend automatically.
 * Replaces the old useGPSBackgroundTracker — now exposes live status
 * so the UI can show on-site / off-site / accuracy feedback.
 *
 * Ping rules (battery-conscious):
 *  - Moved > 15 m   → ping immediately
 *  - Time  > 45 s   → keep-alive ping regardless of movement
 *  - Accuracy > 50 m → skip (too noisy)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { locationApi } from '../../../services/locationApi';

const PING_INTERVAL_MS = 45_000;   // 45-second keep-alive
const MIN_MOVE_M       = 15;        // ping if moved this far
const MAX_ACCURACY_M   = 50;        // reject low-quality fixes

function haversineM(lat1, lon1, lat2, lon2) {
    const R    = 6_371_000;
    const toR  = d => (d * Math.PI) / 180;
    const dLat = toR(lat2 - lat1);
    const dLon = toR(lon2 - lon1);
    const a    =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * @param {number|string|null} projectId  — active project (can be null while loading)
 * @param {{ enabled?: boolean }}  opts
 */
export function useMobileLocationTracker(projectId, { enabled = true } = {}) {
    // ── State ─────────────────────────────────────────────────────────────────
    const [permission,   setPermission]   = useState('prompt');   // prompt | granted | denied | unavailable
    const [position,     setPosition]     = useState(null);       // { lat, lon, accuracy, heading }
    const [status,       setStatus]       = useState('idle');     // idle | tracking | on_site | off_site | error
    const [geofenceName, setGeofenceName] = useState(null);
    const [error,        setError]        = useState(null);
    const [lastPingAt,   setLastPingAt]   = useState(null);       // Date
    const [pingCount,    setPingCount]    = useState(0);

    // ── Refs (survive re-renders without triggering effects) ──────────────────
    const watchRef    = useRef(null);
    const lastPingRef = useRef(null);   // { lat, lon, time }

    // ── Core ping ─────────────────────────────────────────────────────────────
    const sendPing = useCallback(async (lat, lon, accuracy, heading) => {
        try {
            const res = await locationApi.pingLocation({
                latitude:  lat,
                longitude: lon,
                accuracy:  accuracy ?? 0,
                heading:   heading  ?? null,
            });

            setLastPingAt(new Date());
            setPingCount(n => n + 1);

            if (res.status === 'on_site') {
                setStatus('on_site');
                setGeofenceName(res.geofence_name || null);
            } else if (res.status === 'ignored') {
                // accuracy rejected server-side — don't change on-site status
            } else {
                setStatus('off_site');
                setGeofenceName(null);
            }
        } catch (e) {
            // Network / auth errors — silent, keep tracking
            console.warn('[MobileTracker] ping failed:', e?.message);
        }
    }, []);

    // ── Throttle logic ────────────────────────────────────────────────────────
    const maybePin = useCallback((lat, lon, accuracy, heading) => {
        if (accuracy > MAX_ACCURACY_M) return;   // too inaccurate, skip

        const now  = Date.now();
        const prev = lastPingRef.current;

        const tooSoon    = prev && (now - prev.time) < PING_INTERVAL_MS;
        const barelyMoved = prev && haversineM(lat, lon, prev.lat, prev.lon) < MIN_MOVE_M;

        if (tooSoon && barelyMoved) return;   // nothing to report yet

        lastPingRef.current = { lat, lon, time: now };
        sendPing(lat, lon, accuracy, heading);
    }, [sendPing]);

    // ── Geolocation callbacks ─────────────────────────────────────────────────
    const onPosition = useCallback((pos) => {
        const { latitude: lat, longitude: lon, accuracy, heading } = pos.coords;

        setPosition({ lat, lon, accuracy, heading });
        setPermission('granted');
        setError(null);
        // Move from idle/error → tracking while we wait for first ping response
        setStatus(s => (s === 'idle' || s === 'error') ? 'tracking' : s);

        maybePin(lat, lon, accuracy, heading);
    }, [maybePin]);

    const onError = useCallback((err) => {
        if (err.code === 1) {
            setPermission('denied');
            setStatus('error');
            setError('Location access denied. Enable GPS in your browser settings.');
        } else if (err.code === 2) {
            setError('GPS signal unavailable — move to an open area.');
        } else {
            setError('Location timed out — retrying…');
        }
    }, []);

    // ── Manual permission request (for the UI button) ─────────────────────────
    const requestPermission = useCallback(() => {
        if (!navigator?.geolocation) {
            setPermission('unavailable');
            setStatus('error');
            setError('GPS is not supported on this device.');
            return;
        }
        navigator.geolocation.getCurrentPosition(onPosition, onError, {
            enableHighAccuracy: true,
            timeout:    12_000,
            maximumAge: 0,
        });
    }, [onPosition, onError]);

    // ── Start / stop watchPosition ────────────────────────────────────────────
    useEffect(() => {
        if (!enabled || !projectId) return;

        if (!navigator?.geolocation) {
            setPermission('unavailable');
            setStatus('error');
            setError('GPS not supported on this device.');
            return;
        }

        watchRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
            enableHighAccuracy: true,
            timeout:     15_000,
            maximumAge:  30_000,   // use cached fix if < 30 s old
        });

        setStatus(s => s === 'idle' ? 'tracking' : s);

        return () => {
            if (watchRef.current != null) {
                navigator.geolocation.clearWatch(watchRef.current);
                watchRef.current = null;
            }
        };
    }, [enabled, projectId, onPosition, onError]);

    // ── Public API ────────────────────────────────────────────────────────────
    return {
        permission,      // 'prompt' | 'granted' | 'denied' | 'unavailable'
        position,        // { lat, lon, accuracy, heading } | null
        status,          // 'idle' | 'tracking' | 'on_site' | 'off_site' | 'error'
        geofenceName,    // string | null — name of the matched geofence
        error,           // string | null
        lastPingAt,      // Date | null
        pingCount,       // number — total pings sent this session
        requestPermission,
    };
}
