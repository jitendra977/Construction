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
    
    // Auto-detect secure context (HTTPS) to automatically upgrade to wss://
    const isSecureContext = typeof window !== 'undefined' && window.location?.protocol === 'https:';
    let tls = useTls || isSecureContext;
    
    let port = Number(wsPort) || 9001;
    
    // If running inside a secure context, cloud proxy managers (like NPM) always
    // terminate SSL/TLS over standard HTTPS port 443. We dynamically default
    // port to 443 in secure remote contexts unless explicitly overridden.
    if (tls && port === 9001 && host && !host.includes('127.0.0.1') && !host.includes('localhost')) {
        port = 443;
    }

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
