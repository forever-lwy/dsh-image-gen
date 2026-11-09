/** Persistent, bounded browser cache for publicly proxied inspiration images. */
import { INSPIRATION_ROUTE } from '../shared.js';
const DB_NAME = 'dsh-image-gen-inspiration';
const STORE = 'images';
const CATALOG_STORE = 'catalog';
const MAX_ENTRIES = 120;
const MAX_BYTES = 180 * 1024 * 1024;
const pending = new Map();
let cacheEpoch = 0;
/**
 * Resolve the IndexedDB key for one image. `rev` (the source's imageRevision,
 * falling back to its version) namespaces the cache by image content: when a
 * source re-packages its images at stable case IDs, a bumped rev orphans the
 * old blobs instead of serving them forever.
 */
function cacheKey(sourceId, caseId, rev) {
    return rev === undefined ? `${sourceId}:${caseId}` : `${sourceId}:${caseId}@${rev}`;
}
export function fetchInspirationImage(sourceId, caseId, rev) {
    const key = cacheKey(sourceId, caseId, rev);
    const existing = pending.get(key);
    if (existing !== undefined)
        return existing;
    const requestEpoch = cacheEpoch;
    const task = getCached(key).then(async (cached) => {
        if (cached !== undefined)
            return cached;
        const response = await fetch(`${INSPIRATION_ROUTE}/image/${encodeURIComponent(sourceId)}/${encodeURIComponent(caseId)}`, {
            credentials: 'same-origin',
            headers: { accept: 'image/avif,image/webp,image/png,image/jpeg' },
        });
        if (!response.ok)
            throw new Error(`灵感图片读取失败 (${String(response.status)})`);
        const blob = await response.blob();
        if (blob.size < 64 || !['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) {
            throw new Error('灵感图片格式不受支持');
        }
        if (requestEpoch === cacheEpoch) {
            void putCached(key, blob);
        }
        return blob;
    }).finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
}
export async function evictInspirationImage(sourceId, caseId, rev) {
    const key = cacheKey(sourceId, caseId, rev);
    pending.delete(key);
    const db = await openDatabase();
    if (db === undefined)
        return;
    try {
        await new Promise(resolve => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
        });
    }
    finally {
        db.close();
    }
}
function openDatabase() {
    if (typeof indexedDB === 'undefined')
        return Promise.resolve(undefined);
    return new Promise(resolve => {
        try {
            const request = indexedDB.open(DB_NAME, 2);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    const store = db.createObjectStore(STORE, { keyPath: 'key' });
                    store.createIndex('accessedAt', 'accessedAt');
                }
                if (!db.objectStoreNames.contains(CATALOG_STORE))
                    db.createObjectStore(CATALOG_STORE, { keyPath: 'id' });
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(undefined);
        }
        catch {
            resolve(undefined);
        }
    });
}
async function getCached(key) {
    const db = await openDatabase();
    if (db === undefined)
        return undefined;
    try {
        return await new Promise(resolve => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            const request = store.get(key);
            request.onsuccess = () => {
                const entry = request.result;
                if (entry === undefined || !(entry.blob instanceof Blob) || entry.blob.size < 64) {
                    if (entry !== undefined) {
                        try {
                            store.delete(key);
                        }
                        catch { /* best effort */ }
                    }
                    return resolve(undefined);
                }
                entry.accessedAt = Date.now();
                store.put(entry);
                resolve(entry.blob);
            };
            request.onerror = () => resolve(undefined);
        });
    }
    finally {
        db.close();
    }
}
async function putCached(key, blob) {
    const db = await openDatabase();
    if (db === undefined)
        return;
    try {
        await new Promise(resolve => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            store.put({ key, blob, bytes: blob.size, accessedAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
            tx.onabort = () => resolve();
        });
        await trimCache(db);
    }
    finally {
        db.close();
    }
}
async function trimCache(db) {
    await new Promise(resolve => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const items = [];
        const cursor = store.openCursor();
        cursor.onsuccess = () => {
            const result = cursor.result;
            if (result !== null) {
                items.push(result.value);
                result.continue();
                return;
            }
            items.sort((a, b) => a.accessedAt - b.accessedAt);
            let count = items.length;
            let bytes = items.reduce((total, item) => total + Math.max(0, item.bytes), 0);
            for (const item of items) {
                if (count <= MAX_ENTRIES && bytes <= MAX_BYTES)
                    break;
                store.delete(item.key);
                count -= 1;
                bytes -= Math.max(0, item.bytes);
            }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
    });
}
export async function clearInspirationImageCache() {
    cacheEpoch += 1;
    pending.clear();
    const db = await openDatabase();
    if (db === undefined)
        return;
    try {
        await new Promise(resolve => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
            tx.onabort = () => resolve();
        });
    }
    finally {
        db.close();
    }
}
//# sourceMappingURL=inspiration-image-cache.js.map