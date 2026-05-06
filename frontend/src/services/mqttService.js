/**
 * mqttService.js
 * ══════════════
 * All HTTP API calls related to MQTT broker configuration and NFC scan events.
 *
 * Kept completely separate from attendanceService.js so that:
 *  - MQTT broker logic can be updated without touching attendance business logic.
 *  - A developer working on the MQTT integration has one file to look at.
 *
 * Endpoints mirrored (all under /api/v1/attendance/mqtt/):
 *   GET/PATCH  config/     — read or update MQTTConfig for a project
 *   POST       test/       — TCP ping test (returns latency_ms)
 *   GET        status/     — live connection state + last 10 scan events
 *   GET        logs/       — paginated MQTTScanEvent log
 *   POST       nfc-scan/   — HTTP fallback NFC scan (mirrors MQTT listener path)
 */

import axios from 'axios';
import { attachResponseInterceptor } from './api';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ── Axios instance scoped to the MQTT sub-path ────────────────────────────────
const api = axios.create({ baseURL: `${API_URL}/attendance/mqtt` });

api.interceptors.request.use((cfg) => {
    const token = localStorage.getItem('access_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

attachResponseInterceptor(api);

// ══════════════════════════════════════════════════════════════════════════════
// Service methods
// ══════════════════════════════════════════════════════════════════════════════

const mqttService = {
    /**
     * Fetch (or auto-create with defaults) the MQTTConfig for a project.
     *
     * @param {number} projectId
     * @returns {Promise<MQTTConfig>}
     */
    getConfig: (projectId) =>
        api.get('/config/', { params: { project: projectId } }).then((r) => r.data),

    /**
     * Update MQTT broker settings for a project.
     * Only include fields you want to change.
     * To clear the password send password: "" — omit the key to leave it unchanged.
     *
     * @param {number} projectId
     * @param {Partial<MQTTConfig>} data
     * @returns {Promise<MQTTConfig>}
     */
    updateConfig: (projectId, data) =>
        api.patch('/config/', { project: projectId, ...data }).then((r) => r.data),

    /**
     * Test TCP connectivity to the broker without saving.
     * Useful for the "Test Connection" button in the settings UI.
     *
     * @param {number} projectId
     * @param {{ broker_host?: string, broker_port?: number }} overrides
     * @returns {Promise<{ success: boolean, message: string, latency_ms?: number }>}
     */
    testConnection: (projectId, overrides = {}) =>
        api
            .post('/test/', { project: projectId, ...overrides })
            .then((r) => r.data),

    /**
     * Get the live connection status of the MQTT listener + last 10 scan events.
     * Designed for a polling status widget (every 5-10 s).
     *
     * @param {number} projectId
     * @returns {Promise<{ config: MQTTConfig, recent_events: MQTTScanEvent[] }>}
     */
    getStatus: (projectId) =>
        api.get('/status/', { params: { project: projectId } }).then((r) => r.data),

    /**
     * Paginated list of raw MQTT scan events (admin log viewer).
     *
     * @param {number} projectId
     * @param {{ limit?: number, offset?: number, uid?: string }} params
     * @returns {Promise<{ total: number, limit: number, offset: number, results: MQTTScanEvent[] }>}
     */
    getScanLogs: (projectId, params = {}) =>
        api
            .get('/logs/', { params: { project: projectId, ...params } })
            .then((r) => r.data),

    /**
     * HTTP-based NFC scan — same attendance logic as the MQTT listener.
     * Use for kiosks that talk directly to the backend, or for manual testing.
     *
     * @param {string} nfcUid  — raw UID from the reader (spaces will be stripped server-side)
     * @param {number} projectId
     * @returns {Promise<ScanResult>}
     */
    nfcScan: (nfcUid, projectId) =>
        api
            .post('/nfc-scan/', { nfc_uid: nfcUid, project: projectId })
            .then((r) => r.data),
};

export default mqttService;

// ══════════════════════════════════════════════════════════════════════════════
// JSDoc type stubs (no runtime cost — purely for IDE autocomplete)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} MQTTConfig
 * @property {number}  id
 * @property {number}  project
 * @property {string}  broker_host
 * @property {number}  broker_port
 * @property {number}  ws_port
 * @property {string}  topic
 * @property {string}  username
 * @property {boolean} has_password       — true if a password is stored (never returned in full)
 * @property {boolean} use_tls
 * @property {boolean} is_enabled
 * @property {'connected'|'disconnected'|'error'|'unknown'} connection_status
 * @property {string|null} last_connected_at
 * @property {string}  last_error_message
 * @property {number|null} listener_pid
 * @property {string}  updated_at
 */

/**
 * @typedef {Object} MQTTScanEvent
 * @property {number}  id
 * @property {string}  topic
 * @property {string}  nfc_uid
 * @property {'success'|'rejected'|'unknown'|'invalid'} event_type
 * @property {string}  message
 * @property {string}  worker_name
 * @property {string}  received_at
 */

/**
 * @typedef {Object} ScanResult
 * @property {boolean} success
 * @property {string}  message
 * @property {string}  [action]       — 'CHECK_IN' | 'CHECK_OUT'
 * @property {Object}  [worker]
 * @property {Object}  [attendance]
 */
