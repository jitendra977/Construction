import React, {
    createContext, useContext, useState, useEffect, useCallback, useRef,
} from 'react';
import locationApi from '../../../services/locationApi';

const LocationContext = createContext(null);
const LIVE_POLL_MS = 30_000;

export function LocationProvider({ projectId, children }) {
    const [geofences,      setGeofences]      = useState([]);
    const [pins,           setPins]           = useState([]);
    const [analytics,      setAnalytics]      = useState([]);
    const [livePositions,  setLivePositions]  = useState([]);
    const [loading,        setLoading]        = useState(false);
    const [liveLoading,    setLiveLoading]    = useState(false);
    const [error,          setError]          = useState(null);
    const pollRef = useRef(null);

    // ── Geofences ─────────────────────────────────────────────────────────
    const loadGeofences = useCallback(async () => {
        if (!projectId) return;
        try {
            const data = await locationApi.getGeofences({ project: projectId });
            setGeofences(data.results || data || []);
        } catch (err) {
            console.error('loadGeofences:', err);
        }
    }, [projectId]);

    // ── Site Pins ─────────────────────────────────────────────────────────
    const loadPins = useCallback(async () => {
        if (!projectId) return;
        try {
            const data = await locationApi.getPins(projectId);
            setPins(data.results || data || []);
        } catch (err) {
            console.error('loadPins:', err);
        }
    }, [projectId]);

    const createPin = useCallback(async (payload) => {
        const pin = await locationApi.createPin(payload);
        setPins(prev => [...prev, pin]);
        return pin;
    }, []);

    const updatePin = useCallback(async (id, payload) => {
        const pin = await locationApi.updatePin(id, payload);
        setPins(prev => prev.map(p => p.id === id ? pin : p));
        return pin;
    }, []);

    const deletePin = useCallback(async (id) => {
        await locationApi.deletePin(id);
        setPins(prev => prev.filter(p => p.id !== id));
    }, []);

    // ── Analytics ─────────────────────────────────────────────────────────
    const loadAnalytics = useCallback(async (date) => {
        if (!projectId) return;
        try {
            setLoading(true);
            const params = { project: projectId };
            if (date) params.date = date;
            const data = await locationApi.getPresenceAnalytics(params);
            setAnalytics(data.results || data || []);
        } catch (err) {
            console.error('loadAnalytics:', err);
            setError('Failed to load analytics.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // ── Live Positions (auto-polled) ───────────────────────────────────────
    const fetchLivePositions = useCallback(async () => {
        if (!projectId) return;
        try {
            setLiveLoading(true);
            const data = await locationApi.getLivePositions(projectId);
            setLivePositions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('fetchLivePositions:', err);
        } finally {
            setLiveLoading(false);
        }
    }, [projectId]);

    const startLivePolling = useCallback(() => {
        fetchLivePositions();
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(fetchLivePositions, LIVE_POLL_MS);
    }, [fetchLivePositions]);

    const stopLivePolling = useCallback(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }, []);

    useEffect(() => {
        if (!projectId) return;
        loadGeofences();
        loadPins();
        startLivePolling();
        return () => stopLivePolling();
    }, [projectId, loadGeofences, loadPins, startLivePolling, stopLivePolling]);

    return (
        <LocationContext.Provider value={{
            geofences, pins, analytics, livePositions,
            loading, liveLoading, error,
            loadGeofences, loadPins,
            createPin, updatePin, deletePin,
            loadAnalytics,
            fetchLivePositions, startLivePolling, stopLivePolling,
            pollInterval: LIVE_POLL_MS,
        }}>
            {children}
        </LocationContext.Provider>
    );
}

export const useLocationTracking = () => useContext(LocationContext);
