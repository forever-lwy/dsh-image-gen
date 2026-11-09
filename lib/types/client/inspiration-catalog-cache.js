const DB_NAME = 'dsh-image-gen-inspiration';
const STORE = 'catalog';
const IMAGE_STORE = 'images';
const KEY = 'latest';
export async function loadCachedInspirationCatalog() {
    const db = await openDatabase();
    if (db === undefined)
        return undefined;
    try {
        return await new Promise(resolve => {
            const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
            request.onsuccess = () => {
                const record = request.result;
                resolve(isCatalog(record?.catalog) ? record.catalog : undefined);
            };
            request.onerror = () => resolve(undefined);
        });
    }
    finally {
        db.close();
    }
}
export async function saveCachedInspirationCatalog(catalog) {
    if (!isCatalog(catalog))
        return;
    const db = await openDatabase();
    if (db === undefined)
        return;
    try {
        await new Promise(resolve => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put({ id: KEY, catalog, storedAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
            tx.onabort = () => resolve();
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
                if (!db.objectStoreNames.contains(STORE))
                    db.createObjectStore(STORE, { keyPath: 'id' });
                if (!db.objectStoreNames.contains(IMAGE_STORE)) {
                    const images = db.createObjectStore(IMAGE_STORE, { keyPath: 'key' });
                    images.createIndex('accessedAt', 'accessedAt');
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(undefined);
        }
        catch {
            resolve(undefined);
        }
    });
}
function isCatalog(value) {
    if (typeof value !== 'object' || value === null || value.schemaVersion !== 1)
        return false;
    const sources = value.sources;
    return Array.isArray(sources) && sources.length > 0 && sources.every(source => typeof source === 'object' && source !== null && Array.isArray(source.cases));
}
//# sourceMappingURL=inspiration-catalog-cache.js.map