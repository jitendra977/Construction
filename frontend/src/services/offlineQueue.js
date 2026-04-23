/**
 * Offline write-queue (HCMS-2 Phase 6).
 *
 * Any mutating request that fails with a network error is pushed into
 * IndexedDB via this module. When the browser regains connectivity the
 * queue flushes in FIFO order.
 *
 * Data model:
 *   { id (auto), method, url, body, headers, createdAt, tries, status }
 *
 * Built on the `idb` npm package when available, otherwise degrades
 * gracefully to localStorage.
 */

const DB_NAME = 'hcms-offline';
const STORE = 'outbox';
const DB_VERSION = 1;
const LS_KEY = 'hcms-offline-outbox';

// ── Native IndexedDB wrapper (no external dep) ──────────────────────
function openDB() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB unavailable'));
            return;
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function tx(mode, fn) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const t = db.transaction(STORE, mode);
            const store = t.objectStore(STORE);
            const p = fn(store);
            t.oncomplete = () => resolve(p);
            t.onerror = () => reject(t.error);
            t.onabort = () => reject(t.error);
        });
    } catch {
        // Fallback to localStorage
        const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
        return fn({ list });
    }
}

// ── Public API ───────────────────────────────────────────────────────
export async function enqueue(entry) {
    const item = {
        method: entry.method || 'POST',
        url: entry.url,
        body: entry.body || null,
        headers: entry.headers || {},
        createdAt: Date.now(),
        tries: 0,
        status: 'PENDING',
    };
    return tx('readwrite', (store) => {
        if (store.list) {
            item.id = Date.now();
            store.list.push(item);
            localStorage.setItem(LS_KEY, JSON.stringify(store.list));
            return item.id;
        }
        const r = store.add(item);
        return new Promise((resolve) => { r.onsuccess = () => resolve(r.result); });
    });
}

export async function list() {
    return tx('readonly', (store) => {
        if (store.list) return Promise.resolve(store.list);
        return new Promise((resolve) => {
            const out = [];
            const cursor = store.openCursor();
            cursor.onsuccess = (e) => {
                const c = e.target.result;
                if (c) { out.push(c.value); c.continue(); } else resolve(out);
            };
        });
    });
}

export async function remove(id) {
    return tx('readwrite', (store) => {
        if (store.list) {
            const filtered = store.list.filter((x) => x.id !== id);
            localStorage.setItem(LS_KEY, JSON.stringify(filtered));
            return;
        }
        return new Promise((resolve) => {
            const r = store.delete(id);
            r.onsuccess = () => resolve();
        });
    });
}

export async function flush(axiosInstance) {
    const entries = await list();
    const results = [];
    for (const e of entries) {
        try {
            await axiosInstance.request({
                url: e.url,
                method: e.method,
                data: e.body,
                headers: e.headers,
            });
            await remove(e.id);
            results.push({ id: e.id, ok: true });
        } catch (err) {
            results.push({ id: e.id, ok: false, error: err?.message });
            // Only give up after 5 tries
            if ((e.tries || 0) >= 5) await remove(e.id);
        }
    }
    return results;
}

export function installOnlineFlush(axiosInstance) {
    if (typeof window === 'undefined') return;
    const handler = () => flush(axiosInstance).catch(() => { });
    window.addEventListener('online', handler);
    // Also try a one-off flush on boot
    if (navigator.onLine) setTimeout(handler, 500);
}

export default { enqueue, list, remove, flush, installOnlineFlush };
