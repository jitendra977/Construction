import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';
import attendanceService from '../../services/attendanceService';

const MqttContext = createContext(null);

export function MqttProvider({ projectId, children }) {
    const [status, setStatus] = useState('Disconnected');
    const [lastScan, setLastScan] = useState(null); // { uid, data, timestamp }
    const clientRef = useRef(null);

    const connect = async () => {
        if (clientRef.current) clientRef.current.end(true);

        try {
            const settings = await attendanceService.getSettings(projectId);
            if (!settings || !settings.mqtt_broker_url) {
                console.warn('MQTT Broker URL not configured.');
                return;
            }

            const wsUrl = `ws://${settings.mqtt_broker_url}:${settings.mqtt_ws_port || 9001}`;
            const client = mqtt.connect(wsUrl, {
                clientId: `hub_${Math.random().toString(16).slice(2, 10)}`,
                username: settings.mqtt_username || undefined,
                password: settings.mqtt_password || undefined,
                reconnectPeriod: 5000,
            });

            client.on('connect', () => {
                setStatus('Connected');
                client.subscribe(settings.mqtt_topic || 'nfc/#');
            });

            client.on('message', (topic, msg) => {
                try {
                    const data = JSON.parse(msg.toString());
                    if (data.uid) {
                        const cleanUid = data.uid.replace(/\s+/g, '').toUpperCase();
                        const scan = { uid: cleanUid, data, timestamp: new Date() };
                        setLastScan(scan);
                        // Dispatch global event for non-context listeners (if any)
                        window.dispatchEvent(new CustomEvent('nfc-scan', { detail: scan }));
                    }
                } catch (e) {
                    console.error('MQTT message parse error:', e);
                }
            });

            client.on('error', (err) => {
                setStatus('Error');
                console.error('MQTT Error:', err);
            });

            client.on('close', () => setStatus('Disconnected'));

            clientRef.current = client;
        } catch (err) {
            console.error('Failed to initialize MQTT:', err);
        }
    };

    useEffect(() => {
        if (projectId) connect();
        return () => {
            if (clientRef.current) clientRef.current.end(true);
        };
    }, [projectId]);

    return (
        <MqttContext.Provider value={{ status, lastScan, setLastScan, clearScan: () => setLastScan(null), reconnect: connect }}>
            {children}
        </MqttContext.Provider>
    );
}

export const useMqtt = () => useContext(MqttContext);
