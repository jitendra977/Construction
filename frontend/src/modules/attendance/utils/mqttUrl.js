export const MQTT_URL_EXAMPLES = [
    'nishanaweb.cloud',
    '148.230.97.39',
    'mqtt://nishanaweb.cloud:1883',
    'ws://nishanaweb.cloud:9001',
    'wss://mqtt.example.com:9001',
];

export const normalizeMqttBrokerHost = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `mqtt://${raw}`;

    try {
        return new URL(withScheme).hostname;
    } catch {
        return raw
            .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
            .replace(/^\/+/, '')
            .split('/')[0]
            .split(':')[0]
            .trim();
    }
};

export const mqttWebSocketUrl = (brokerHost, wsPort = 9001, useTls = false) => {
    const raw = String(brokerHost || '').trim();
    if (!raw) return '';

    const parsedInput = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `mqtt://${raw}`;
    let host = normalizeMqttBrokerHost(raw);
    let port = Number(wsPort) || 9001;
    let tls = useTls;

    try {
        const url = new URL(parsedInput);
        host = url.hostname || host;
        if ((url.protocol === 'ws:' || url.protocol === 'wss:') && url.port) {
            port = Number(url.port) || port;
        }
        if (url.protocol === 'wss:' || url.protocol === 'mqtts:') tls = true;
    } catch {
        // normalizeMqttBrokerHost already handled malformed inputs.
    }

    return `${tls ? 'wss' : 'ws'}://${host}:${port}`;
};
