import { useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export default function useGPSBackgroundTracker(isActive = true, tokenKey = 'access_token') {
    const watchIdRef = useRef(null);
    const lastPingRef = useRef({ lat: null, lng: null, time: 0 });

    useEffect(() => {
        if (!isActive || !('geolocation' in navigator)) return;

        // Calculate distance between two lat/lng in meters (Haversine formula approximation)
        const getDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371e3;
            const p1 = lat1 * Math.PI/180;
            const p2 = lat2 * Math.PI/180;
            const dp = (lat2-lat1) * Math.PI/180;
            const dl = (lon2-lon1) * Math.PI/180;
            const a = Math.sin(dp/2) * Math.sin(dp/2) +
                      Math.cos(p1) * Math.cos(p2) *
                      Math.sin(dl/2) * Math.sin(dl/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        };

        const pingServer = async (coords) => {
            const token = localStorage.getItem(tokenKey);
            if (!token) return;

            try {
                await axios.post(`${API_URL}/location/ping/`, {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    accuracy: coords.accuracy
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                lastPingRef.current = { lat: coords.latitude, lng: coords.longitude, time: Date.now() };
                console.log('GPS Ping Sent', coords.latitude, coords.longitude);
            } catch (err) {
                console.error('Failed to send GPS ping:', err);
                // Note: Offline sync mechanism can be built on top of this by caching to IndexedDB/localStorage
            }
        };

        const handlePosition = (position) => {
            const { coords } = position;
            // Ignore very inaccurate readings to prevent bouncing
            if (coords.accuracy > 50) return;

            const now = Date.now();
            const last = lastPingRef.current;
            
            // Battery Optimization Ping Rules:
            // 1. Initial ping
            // 2. User moved more than 20 meters
            // 3. Keep-alive ping every 5 minutes (to keep the session active)
            const distance = last.lat ? getDistance(last.lat, last.lng, coords.latitude, coords.longitude) : Infinity;
            const timeElapsed = now - last.time;

            if (distance > 20 || timeElapsed > 5 * 60 * 1000) {
                pingServer(coords);
            }
        };

        // Start watching position
        watchIdRef.current = navigator.geolocation.watchPosition(
            handlePosition,
            (error) => console.warn('GPS Error: ', error.message),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [isActive]);
}
