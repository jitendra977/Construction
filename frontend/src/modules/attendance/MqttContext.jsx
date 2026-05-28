/**
 * MqttContext.jsx
 * ═══════════════
 * React context that holds the live MQTT WebSocket connection for the browser.
 *
 * Config loading strategy (in order of priority):
 *   1. New MQTTConfig model  →  GET /attendance/mqtt/config/?project=<id>
 *      (requires migration 0009 to be applied: python manage.py migrate)
 *   2. Legacy ProjectAttendanceSettings fallback  →  GET /attendance/settings/
 *      (automatically used if the new table doesn't exist yet)
 *
 * Context value (backward-compatible):
 *   status     'Connected' | 'Connecting...' | 'Disconnected' | 'Error'
 *   lastScan   { uid, data, timestamp } | null
 *   settings   full settings object (ProjectAttendanceSettings) for sound/voice
 *   config     MQTTConfig object (new model) — null until migration is applied
 *   clearScan  () => void
 *   reconnect  () => void
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import mqttService         from '../../services/mqttService';
import attendanceService   from '../../services/attendanceService';
import { mqttWebSocketUrl, normalizeMqttBrokerHost } from './utils/mqttUrl';

const DEVICE_HEARTBEAT_GRACE_MS = 45 * 1000;
const MQTT_RECONNECT_PERIOD_MS = 5 * 1000;

function _isDeviceOnline(lastSeen, graceMs = DEVICE_HEARTBEAT_GRACE_MS) {
    if (!lastSeen) return false;
    return (Date.now() - new Date(lastSeen).getTime()) < graceMs;
}

/**
 * If the stored broker host is 'localhost' or '127.0.0.1', substitute the
 * current page's hostname so that devices on the LAN (phones, tablets, etc.)
 * automatically connect to the real server IP instead of their own loopback.
 */
function _resolveBrokerHost(host) {
    if (!host) return window.location.hostname;
    const normalized = normalizeMqttBrokerHost(host);
    const h = normalized.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1') return window.location.hostname;
    return normalized;
}

const MqttContext = createContext(null);

export function MqttProvider({ projectId, children }) {
    const [status,   setStatus]   = useState('Disconnected');
    const [lastScan, setLastScan] = useState(null);   // { uid, data, timestamp, topic }
    const [settings, setSettings] = useState(null);   // ProjectAttendanceSettings (sound/voice)
    const [config,   setConfig]   = useState(null);   // MQTTConfig (new model)
    const [listenerStatus, setListenerStatus] = useState('unknown');
    const [deviceStatus, setDeviceStatus] = useState('No Device');
    const [deviceCount, setDeviceCount] = useState(0);
    const [onlineDeviceCount, setOnlineDeviceCount] = useState(0);
    const [lastDeviceSeenAt, setLastDeviceSeenAt] = useState(null);
    const [testingConnection, setTestingConnection] = useState(false);
    const [lastTestResult, setLastTestResult] = useState(null);
    const [reconnectCountdown, setReconnectCountdown] = useState(null);
    const clientRef = useRef(null);
    const runtimeTimerRef = useRef(null);
    const reconnectTimerRef = useRef(null);

    const clearReconnectCountdown = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearInterval(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        setReconnectCountdown(null);
    }, []);

    const startReconnectCountdown = useCallback((ms = MQTT_RECONNECT_PERIOD_MS) => {
        const endAt = Date.now() + ms;
        clearReconnectCountdown();

        const update = () => {
            const remainingMs = Math.max(0, endAt - Date.now());
            const remainingSeconds = Math.ceil(remainingMs / 1000);
            setReconnectCountdown(remainingSeconds);
            if (remainingMs <= 0) {
                clearReconnectCountdown();
            }
        };

        update();
        reconnectTimerRef.current = setInterval(update, 1000);
    }, [clearReconnectCountdown]);

    // ─────────────────────────────────────────────────────────────────────────
    // _loadBrokerConfig
    // Try the new MQTTConfig endpoint first.
    // If it fails (table doesn't exist / 500), fall back to ProjectAttendanceSettings.
    // Returns a normalised object with: broker_host, ws_port, topic, username, is_enabled
    // ─────────────────────────────────────────────────────────────────────────
    const _loadBrokerConfig = useCallback(async () => {
        // ── Try new MQTTConfig model ──────────────────────────────────────────
        try {
            const cfg = await mqttService.getConfig(projectId);
            setConfig(cfg);

            // Also load full settings for sound/voice feedback
            try {
                const s = await attendanceService.getSettings(projectId);
                setSettings(s);
            } catch { /* non-critical */ }

            // MQTTConfig doesn't store the password in API responses (security).
            // Fetch full settings to get the broker password for WS auth.
            let brokerPassword = '';
            try {
                const s = await attendanceService.getSettings(projectId);
                setSettings(s);
                brokerPassword = s?.mqtt_password || '';
            } catch { /* non-critical — broker may be allow_anonymous */ }

            return {
                // If broker is 'localhost'/'127.0.0.1', replace with the page's actual hostname
                // so that other devices on the same network can also connect.
                broker_host: _resolveBrokerHost(cfg.broker_host),
                ws_port:     cfg.ws_port     || 9001,
                topic:       cfg.topic       || 'nfc/+/state',
                username:    cfg.username    || '',
                password:    brokerPassword,
                use_tls:     cfg.use_tls     || false,
                is_enabled:  cfg.is_enabled  !== false,
            };
        } catch (newApiErr) {
            // New table doesn't exist yet — fall back silently
            console.warn(
                '[MqttContext] MQTTConfig API failed (migration not applied?), ' +
                'falling back to ProjectAttendanceSettings.',
                newApiErr?.response?.status
            );
        }

        // ── Fall back to legacy ProjectAttendanceSettings ─────────────────────
        try {
            const s = await attendanceService.getSettings(projectId);
            setSettings(s);

            return {
                // If broker is 'localhost'/'127.0.0.1', replace with the page's actual hostname
                broker_host: _resolveBrokerHost(s?.mqtt_broker_url || 'localhost'),
                ws_port:     s?.mqtt_ws_port    || 9001,
                topic:       s?.mqtt_topic      || 'nfc/+/state',
                username:    s?.mqtt_username   || '',
                password:    s?.mqtt_password   || '',   // ← pass broker password
                use_tls:     false,
                is_enabled:  true,
            };
        } catch (legacyErr) {
            console.error('[MqttContext] Could not load any MQTT settings:', legacyErr);
            return null;
        }
    }, [projectId]);

    // ─────────────────────────────────────────────────────────────────────────
    // connect
    // ─────────────────────────────────────────────────────────────────────────
    const connect = useCallback(async () => {
        // Tear down existing connection
        if (clientRef.current) {
            clientRef.current.end(true);
            clientRef.current = null;
        }

        const brokerCfg = await _loadBrokerConfig();

        if (!brokerCfg) {
            setStatus('Error');
            return;
        }

        if (!brokerCfg.broker_host) {
            console.warn('[MqttContext] Broker host not configured — skipping connection.');
            setStatus('Disconnected');
            return;
        }

        if (!brokerCfg.is_enabled) {
            console.info('[MqttContext] MQTT listener is disabled for this project.');
            setStatus('Disconnected');
            return;
        }

        // ── Build WebSocket URL ───────────────────────────────────────────────
        const wsUrl = mqttWebSocketUrl(brokerCfg.broker_host, brokerCfg.ws_port, brokerCfg.use_tls);

        setStatus('Connecting...');
        startReconnectCountdown();
        console.info(`[MqttContext] Connecting to ${wsUrl}  topic: ${brokerCfg.topic}`);

        try {
            const client = mqtt.connect(wsUrl, {
                clientId:        `hub_${Math.random().toString(16).slice(2, 10)}`,
                username:        brokerCfg.username || undefined,
                password:        brokerCfg.password || undefined,
                reconnectPeriod: 5000,
                connectTimeout:  10000,
            });

            // ── mqtt.js event handlers ────────────────────────────────────────
            client.on('connect', () => {
                setStatus('Connected');
                clearReconnectCountdown();
                client.subscribe(brokerCfg.topic);
                console.info(`[MqttContext] Connected ✓  subscribed to: ${brokerCfg.topic}`);
            });

            client.on('message', (topic, msg) => {
                try {
                    const data = JSON.parse(msg.toString());

                    // Accept uid / UID / id from different firmware variants
                    const rawUid = data.uid || data.UID || data.id || '';
                    if (!rawUid) return;

                    const cleanUid = String(rawUid).replace(/\s+/g, '').toUpperCase();
                    const scan     = { uid: cleanUid, data, timestamp: new Date(), topic };

                    setLastScan(scan);

                    // Broadcast so components outside the provider can also react
                    window.dispatchEvent(new CustomEvent('nfc-scan', { detail: scan }));
                } catch (e) {
                    console.error('[MqttContext] Message parse error:', e);
                }
            });

            client.on('error',      (err) => {
                setStatus('Error');
                startReconnectCountdown();
                console.error('[MqttContext] Error:', err);
            });
            client.on('close',      ()    => {
                setStatus('Disconnected');
                startReconnectCountdown();
            });
            client.on('reconnect',  ()    => {
                setStatus('Connecting...');
                startReconnectCountdown();
            });
            client.on('offline',    ()    => {
                setStatus('Disconnected');
                startReconnectCountdown();
            });

            clientRef.current = client;

        } catch (err) {
            console.error('[MqttContext] Failed to create MQTT client:', err);
            setStatus('Error');
        }
    }, [projectId, _loadBrokerConfig]);

    const refreshRuntimeStatus = useCallback(async () => {
        if (!projectId) return;

        try {
            const [statusData, deviceData] = await Promise.all([
                mqttService.getStatus(projectId).catch(() => null),
                attendanceService.getNfcDevices(projectId).catch(() => null),
            ]);

            if (statusData?.config) {
                setConfig((prev) => ({ ...(prev || {}), ...statusData.config }));
                setListenerStatus(statusData.config.connection_status || 'unknown');
            } else {
                setListenerStatus('unknown');
            }

            const devices = Array.isArray(deviceData?.devices) ? deviceData.devices : [];
            const onlineDevices = devices.filter((device) => _isDeviceOnline(device.last_seen));
            const latestSeen = devices
                .map((device) => device.last_seen)
                .filter(Boolean)
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

            setDeviceCount(devices.length);
            setOnlineDeviceCount(onlineDevices.length);
            setLastDeviceSeenAt(latestSeen);

            if (onlineDevices.length > 0) {
                setDeviceStatus('Connected');
            } else if (devices.length > 0) {
                setDeviceStatus('Disconnected');
            } else {
                setDeviceStatus('No Device');
            }
        } catch (err) {
            console.warn('[MqttContext] Failed to refresh runtime status', err);
            setListenerStatus('unknown');
            setDeviceStatus('No Device');
            setDeviceCount(0);
            setOnlineDeviceCount(0);
            setLastDeviceSeenAt(null);
        }
    }, [projectId]);

    const testConnection = useCallback(async () => {
        if (!projectId) {
            return { success: false, message: 'No project selected.' };
        }

        setTestingConnection(true);
        setLastTestResult(null);
        try {
            const result = await mqttService.testConnection(projectId);
            setLastTestResult(result);
            return result;
        } catch (err) {
            const result = {
                success: false,
                message: err?.response?.data?.message || 'Connection test failed',
            };
            setLastTestResult(result);
            return result;
        } finally {
            setTestingConnection(false);
        }
    }, [projectId]);

    // ── Connect on mount / when projectId changes ─────────────────────────────
    useEffect(() => {
        if (projectId) connect();
        return () => {
            if (clientRef.current) {
                clientRef.current.end(true);
                clientRef.current = null;
            }
            clearReconnectCountdown();
        };
    }, [projectId, connect, clearReconnectCountdown]);

    useEffect(() => {
        if (!projectId) return undefined;

        refreshRuntimeStatus();
        runtimeTimerRef.current = setInterval(refreshRuntimeStatus, 10000);

        return () => {
            if (runtimeTimerRef.current) clearInterval(runtimeTimerRef.current);
        };
    }, [projectId, refreshRuntimeStatus]);

    useEffect(() => {
        const handleConfigUpdated = (event) => {
            if (String(event?.detail?.projectId) !== String(projectId)) return;
            connect();
            refreshRuntimeStatus();
        };

        window.addEventListener('mqtt-config-updated', handleConfigUpdated);
        return () => window.removeEventListener('mqtt-config-updated', handleConfigUpdated);
    }, [projectId, connect, refreshRuntimeStatus]);

    // ── Context value ─────────────────────────────────────────────────────────
    // `settings` kept for backward compat — AttendanceHub reads sound/voice fields from it.
    // `config`   is the new MQTTConfig model (null until migration 0009 is applied).
    const value = {
        status,
        lastScan,
        setLastScan,
        settings,          // ← ProjectAttendanceSettings (sound_enabled, voice_rate, etc.)
        config,            // ← MQTTConfig (broker settings)
        listenerStatus,
        deviceStatus,
        deviceCount,
        onlineDeviceCount,
        lastDeviceSeenAt,
        testingConnection,
        lastTestResult,
        reconnectCountdown,
        clearScan:  () => setLastScan(null),
        reconnect:  connect,
        refreshRuntimeStatus,
        testConnection,
    };

    return (
        <MqttContext.Provider value={value}>
            {children}
        </MqttContext.Provider>
    );
}

/** Hook — use inside any component wrapped by MqttProvider */
export const useMqtt = () => useContext(MqttContext);
