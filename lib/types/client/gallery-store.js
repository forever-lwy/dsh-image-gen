import { clearGalleryThumbs, deleteGalleryThumbs } from './gallery-thumbs.js';
export { GALLERY_THUMB_MAX_AGE_MS, GALLERY_THUMB_MAX_BYTES, GALLERY_THUMB_WIDTH, galleryThumbKey, getGalleryThumb, getGalleryThumbStats, pruneGalleryThumbs, putGalleryThumb, } from './gallery-thumbs.js';
const DB_NAME = 'dsh_image_gen_db';
const DB_VERSION = 4;
const STORE_NAME = 'gallery_history';
const TOMBSTONE_STORE = 'gallery_tombstones';
const FAV_PROMPT_STORE = 'favorite_prompts';
const FAV_FOLDER_STORE = 'favorite_folders';
let dbPromise = null;
let tombstonesCache = null;
function getDB() {
    if (dbPromise)
        return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is not supported in this environment.'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
            if (!db.objectStoreNames.contains(TOMBSTONE_STORE)) {
                db.createObjectStore(TOMBSTONE_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(FAV_PROMPT_STORE)) {
                db.createObjectStore(FAV_PROMPT_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(FAV_FOLDER_STORE)) {
                db.createObjectStore(FAV_FOLDER_STORE, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => {
            const db = request.result;
            // Close proactively when another tab requests an upgrade: holding this
            // older-version connection open blocks their upgrade (onblocked)
            // until every tab releases it.
            db.onversionchange = () => {
                db.close();
                dbPromise = null;
            };
            resolve(db);
        };
        request.onerror = () => {
            // Drop the cached promise so the next call retries opening the database
            // instead of failing for the rest of the session (e.g. transient quota
            // or version-block states that a later attempt can recover from).
            dbPromise = null;
            reject(request.error);
        };
        request.onblocked = () => {
            dbPromise = null;
            reject(new Error('IndexedDB upgrade blocked. Close other open Studio tabs and retry.'));
        };
    });
    return dbPromise;
}
async function loadTombstones(db) {
    if (tombstonesCache)
        return tombstonesCache;
    return new Promise((resolve) => {
        if (!db.objectStoreNames.contains(TOMBSTONE_STORE)) {
            tombstonesCache = new Set();
            resolve(tombstonesCache);
            return;
        }
        try {
            const tx = db.transaction(TOMBSTONE_STORE, 'readonly');
            const store = tx.objectStore(TOMBSTONE_STORE);
            const req = store.getAllKeys();
            req.onsuccess = () => {
                tombstonesCache = new Set(req.result.map(String));
                resolve(tombstonesCache);
            };
            req.onerror = () => {
                tombstonesCache = new Set();
                resolve(tombstonesCache);
            };
        }
        catch {
            tombstonesCache = new Set();
            resolve(tombstonesCache);
        }
    });
}
/** Age at which timestamp metadata can be compacted; deleted IDs never expire. */
export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/**
 * Compact old tombstones to permanent IDs. Removing an ID would let an old
 * conversation silently reinsert a deleted image. No IDs are removed.
 */
export async function pruneTombstones(maxAgeMs = TOMBSTONE_TTL_MS) {
    try {
        const db = await getDB();
        if (!db.objectStoreNames.contains(TOMBSTONE_STORE))
            return 0;
        const records = await new Promise((resolve, reject) => {
            const req = db.transaction(TOMBSTONE_STORE, 'readonly').objectStore(TOMBSTONE_STORE).getAll();
            req.onsuccess = () => resolve((req.result ?? []));
            req.onerror = () => reject(req.error);
        });
        const cutoff = Date.now() - maxAgeMs;
        const doomed = records.filter(record => typeof record.deletedAt === 'number' && record.deletedAt < cutoff);
        if (doomed.length === 0)
            return 0;
        await new Promise((resolve, reject) => {
            const tx = db.transaction(TOMBSTONE_STORE, 'readwrite');
            const store = tx.objectStore(TOMBSTONE_STORE);
            for (const record of doomed)
                store.put({ id: String(record.id) });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        tombstonesCache = null;
        return 0;
    }
    catch {
        return 0;
    }
}
const listeners = new Set();
function notifyListeners() {
    for (const listener of listeners) {
        try {
            listener();
        }
        catch (err) {
            console.error('[dsh-image-gen] Gallery listener error:', err);
        }
    }
}
/**
 * Subscribe to gallery mutations (insert/delete/clear).
 */
export function subscribeGallery(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
/**
 * Save or update a gallery record by attachmentId.
 * Skipped if the item was previously deleted (tombstoned).
 * Preserves existing isFavorite, tags, and original createdAt on re-renders.
 * Returns false when the record was not persisted (e.g. IndexedDB unavailable)
 * so callers can surface the failure and let the user retry.
 */
export async function saveGalleryItem(item) {
    try {
        const db = await getDB();
        const tombstones = await loadTombstones(db);
        if (tombstones.has(item.id)) {
            return true;
        }
        await new Promise((resolve, reject) => {
            // The deletion check and the write share one transaction, including
            // tombstones created in another tab after our in-memory cache was read.
            const tx = db.transaction([STORE_NAME, TOMBSTONE_STORE], 'readwrite');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
            const store = tx.objectStore(STORE_NAME);
            const check = tx.objectStore(TOMBSTONE_STORE).get(item.id);
            check.onerror = () => reject(check.error);
            check.onsuccess = () => {
                if (check.result !== undefined) {
                    tombstones.add(item.id);
                    return;
                }
                const getReq = store.get(item.id);
                getReq.onsuccess = () => {
                    const existing = getReq.result;
                    const fav = item.isFavorite !== undefined ? item.isFavorite : existing?.isFavorite;
                    const userTags = item.tags !== undefined ? item.tags : existing?.tags;
                    const savedPath = item.savedTo !== undefined ? item.savedTo : existing?.savedTo;
                    const record = {
                        ...existing,
                        ...item,
                        // Preserve original generation timestamp if already recorded
                        createdAt: existing?.createdAt ?? item.createdAt ?? Date.now(),
                        ...(fav !== undefined ? { isFavorite: fav } : {}),
                        ...(userTags !== undefined ? { tags: userTags } : {}),
                        ...(savedPath !== undefined ? { savedTo: savedPath } : {}),
                    };
                    const putReq = store.put(record);
                    putReq.onerror = () => reject(putReq.error);
                };
                getReq.onerror = () => reject(getReq.error);
            };
        });
        notifyListeners();
        return true;
    }
    catch (err) {
        console.warn('[dsh-image-gen] Failed to save gallery item to IndexedDB:', err);
        return false;
    }
}
/** Whether this id was deleted from the gallery, so a re-rendered card must not resurrect what the record referenced either. */
export async function isGalleryItemTombstoned(id) {
    try {
        return (await loadTombstones(await getDB())).has(id);
    }
    catch {
        return false;
    }
}
async function readGalleryItems() {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('createdAt');
        const req = index.openCursor(null, 'prev'); // newest first
        const items = [];
        req.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                items.push(cursor.value);
                cursor.continue();
            }
            else {
                resolve(items);
            }
        };
        req.onerror = () => reject(req.error);
    });
}
/**
 * Retrieve all gallery records sorted by createdAt descending.
 */
export async function getGalleryItems() {
    try {
        return await readGalleryItems();
    }
    catch (err) {
        console.warn('[dsh-image-gen] Failed to read gallery items from IndexedDB:', err);
        return [];
    }
}
/**
 * Like getGalleryItems, but rejects when IndexedDB is unavailable. Maintenance
 * callers must not treat a read failure as an empty gallery (that would make
 * vault gc delete every original).
 */
export async function getGalleryItemsStrict() {
    return readGalleryItems();
}
/**
 * Toggle favorite status of a gallery item.
 * Returns the new favorite status (true if favorited, false if unfavorited).
 */
export async function toggleFavoriteGalleryItem(id) {
    try {
        const db = await getDB();
        const newStatus = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const getReq = store.get(id);
            getReq.onsuccess = () => {
                const item = getReq.result;
                if (!item) {
                    resolve(false);
                    return;
                }
                const nextFavorite = !item.isFavorite;
                item.isFavorite = nextFavorite;
                const putReq = store.put(item);
                putReq.onsuccess = () => resolve(nextFavorite);
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
        notifyListeners();
        return newStatus;
    }
    catch (err) {
        console.warn('[dsh-image-gen] Failed to toggle favorite item in IndexedDB:', err);
        return false;
    }
}
/**
 * Resolve the attachment ids behind gallery record ids. Imported records carry a
 * synthetic `import-<attachmentId>-<uuid>` id, so the record id is not always
 * the thumbnail key.
 */
async function attachmentIdsFor(db, ids) {
    if (ids.length === 0)
        return [];
    return new Promise((resolve) => {
        const found = [];
        try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            for (const id of ids) {
                const req = store.get(id);
                req.onsuccess = () => {
                    const item = req.result;
                    const attachmentId = item?.attachment?.attachmentId;
                    if (typeof attachmentId === 'string')
                        found.push(attachmentId);
                };
            }
            tx.oncomplete = () => resolve(found);
            tx.onerror = () => resolve(found);
        }
        catch {
            resolve(found);
        }
    });
}
/**
 * Delete a single gallery record by ID and record a tombstone.
 */
export async function deleteGalleryItem(id) {
    const db = await getDB();
    const tombstones = await loadTombstones(db);
    const attachmentIds = await attachmentIdsFor(db, [id]);
    await new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME, TOMBSTONE_STORE], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const tombstoneStore = tx.objectStore(TOMBSTONE_STORE);
        store.delete(id);
        tombstoneStore.put({ id, deletedAt: Date.now() });
        tx.oncomplete = () => {
            tombstones.add(id);
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
    void deleteGalleryThumbs([id, ...attachmentIds]);
    notifyListeners();
}
/**
 * Bulk delete multiple gallery records by IDs and record tombstones in a single transaction.
 */
export async function bulkDeleteGalleryItems(ids) {
    if (ids.length === 0)
        return;
    const db = await getDB();
    const tombstones = await loadTombstones(db);
    const attachmentIds = await attachmentIdsFor(db, ids);
    const now = Date.now();
    await new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME, TOMBSTONE_STORE], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const tombstoneStore = tx.objectStore(TOMBSTONE_STORE);
        for (const id of ids) {
            store.delete(id);
            tombstoneStore.put({ id, deletedAt: now });
        }
        tx.oncomplete = () => {
            for (const id of ids) {
                tombstones.add(id);
            }
            resolve();
        };
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
    void deleteGalleryThumbs([...ids, ...attachmentIds]);
    notifyListeners();
}
/**
 * Bulk update favorite status for multiple gallery records in a single transaction.
 */
export async function bulkSetFavoriteGalleryItems(ids, isFavorite) {
    if (ids.length === 0)
        return;
    const db = await getDB();
    await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const id of ids) {
            const getReq = store.get(id);
            getReq.onsuccess = () => {
                const item = getReq.result;
                if (item && item.isFavorite !== isFavorite) {
                    item.isFavorite = isFavorite;
                    store.put(item);
                }
            };
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
    notifyListeners();
}
/**
 * Clear all gallery records and reset tombstones.
 */
export async function clearGallery() {
    try {
        const db = await getDB();
        if (tombstonesCache)
            tombstonesCache.clear();
        await new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_NAME, TOMBSTONE_STORE], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const tombstoneStore = tx.objectStore(TOMBSTONE_STORE);
            store.clear();
            tombstoneStore.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        void clearGalleryThumbs();
        notifyListeners();
    }
    catch (err) {
        console.warn('[dsh-image-gen] Failed to clear gallery in IndexedDB:', err);
    }
}
/**
 * Standardize path format across Windows and POSIX (lowercase, forward slashes, no trailing slash).
 */
export function normalizeWorkspacePath(rawPath) {
    return rawPath.replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');
}
/**
 * Determine if a gallery item belongs to the given workspace context.
 * Compares workspaceId, sessionId membership, workspacePath, and savedTo file path prefix.
 */
export function isItemInWorkspace(item, workspace) {
    if (!workspace || (!workspace.workspaceId && !workspace.path && (!workspace.sessionIds || workspace.sessionIds.length === 0))) {
        return true;
    }
    // Items with no workspace attribution at all (generated before the studio
    // learned the active workspace) belong to every view; a workspace filter
    // must not hide them from the gallery or favorites tabs.
    if (!item.workspaceId && !item.sessionId && !item.workspacePath && !item.savedTo) {
        return true;
    }
    // 1. Direct workspaceId match
    if (item.workspaceId && workspace.workspaceId && item.workspaceId === workspace.workspaceId) {
        return true;
    }
    // 2. SessionId membership match
    if (item.sessionId && Array.isArray(workspace.sessionIds) && workspace.sessionIds.includes(item.sessionId)) {
        return true;
    }
    // 3. Direct workspacePath match
    if (item.workspacePath && workspace.path) {
        if (normalizeWorkspacePath(item.workspacePath) === normalizeWorkspacePath(workspace.path)) {
            return true;
        }
    }
    // 4. savedTo disk file prefix match (for historical items or files written to the workspace)
    if (item.savedTo && workspace.path) {
        const normSaved = normalizeWorkspacePath(item.savedTo);
        const normWs = normalizeWorkspacePath(workspace.path);
        if (normSaved === normWs || normSaved.startsWith(normWs + '/')) {
            return true;
        }
    }
    return false;
}
// ---------------------------------------------------------------------------
// Workbench favorites: reusable reference images and prompts. Same database,
// separate stores; a dedicated listener set keeps favorite mutations from
// re-reading the (potentially large) gallery history.
// ---------------------------------------------------------------------------
const favoriteListeners = new Set();
function notifyFavorites() {
    for (const listener of favoriteListeners) {
        try {
            listener();
        }
        catch (err) {
            console.error('[dsh-image-gen] Favorites listener error:', err);
        }
    }
}
/** Subscribe to favorites mutations (insert/delete). */
export function subscribeFavorites(listener) {
    favoriteListeners.add(listener);
    return () => {
        favoriteListeners.delete(listener);
    };
}
/** Stable base36 id for a favorite prompt; identical trimmed text dedupes. */
function promptIdOf(text) {
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
    }
    return `p${(hash >>> 0).toString(36)}-${text.length.toString(36)}`;
}
/**
 * Collision-free prompt id. Distinct texts can share the djb2 hash and the
 * length, which would silently overwrite an unrelated saved prompt; suffix
 * until the id is free or already owned by the same text.
 */
async function uniquePromptId(db, text) {
    const rows = await readAll(db, FAV_PROMPT_STORE);
    const byId = new Map(rows.map(row => [row.id, row]));
    const base = promptIdOf(text);
    let candidate = base;
    let suffix = 1;
    while (byId.has(candidate) && byId.get(candidate)?.text !== text) {
        suffix++;
        candidate = `${base}-${suffix}`;
    }
    return candidate;
}
function readAll(db, storeName) {
    return new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readonly').objectStore(storeName).openCursor();
        const rows = [];
        req.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                rows.push(cursor.value);
                cursor.continue();
            }
            else {
                resolve(rows);
            }
        };
        req.onerror = () => reject(req.error);
    });
}
/**
 * Keep one prompt in the favorites rail; identical trimmed text overwrites
 * (one record per distinct prompt).
 * @returns false when the write failed.
 */
export async function saveFavoritePrompt(text) {
    const trimmed = text.trim();
    if (trimmed.length === 0)
        return false;
    try {
        const db = await getDB();
        const id = await uniquePromptId(db, trimmed);
        await new Promise((resolve, reject) => {
            const req = db.transaction(FAV_PROMPT_STORE, 'readwrite').objectStore(FAV_PROMPT_STORE).put({
                id,
                text: trimmed,
                addedAt: Date.now(),
            });
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
        notifyFavorites();
        return true;
    }
    catch (err) {
        console.warn('[dsh-image-gen] Failed to save favorite prompt:', err);
        return false;
    }
}
/** Prompt favorites, newest first. */
export async function getFavoritePrompts() {
    try {
        const db = await getDB();
        const rows = await readAll(db, FAV_PROMPT_STORE);
        return rows.sort((a, b) => b.addedAt - a.addedAt);
    }
    catch (err) {
        console.warn('[dsh-image-gen] Failed to read favorite prompts:', err);
        return [];
    }
}
/** Drop one prompt favorite. */
export async function deleteFavoritePrompt(id) {
    try {
        const db = await getDB();
        await new Promise((resolve, reject) => {
            const req = db.transaction(FAV_PROMPT_STORE, 'readwrite').objectStore(FAV_PROMPT_STORE).delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
        notifyFavorites();
    }
    catch (err) {
        console.warn('[dsh-image-gen] Failed to delete favorite prompt:', err);
    }
}
function folderIdOf(kind, name) {
    return `f-${kind}-${name.trim().toLowerCase().replace(/\s+/g, '-')}-${name.length.toString(36)}`;
}
/** Create a favorites folder; returns null when the name is empty or already used for the kind. */
export async function addFavoriteFolder(kind, name) {
    const trimmed = name.trim();
    if (trimmed === '')
        return null;
    try {
        const db = await getDB();
        const existing = await readAll(db, FAV_FOLDER_STORE);
        if (existing.some(folder => folder.kind === kind && folder.name === trimmed))
            return null;
        const folder = { id: folderIdOf(kind, trimmed), kind, name: trimmed, addedAt: Date.now() };
        await new Promise((resolve, reject) => {
            const req = db.transaction(FAV_FOLDER_STORE, 'readwrite').objectStore(FAV_FOLDER_STORE).put(folder);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
        notifyFavorites();
        return folder;
    }
    catch (err) {
        console.warn('[dsh-image-gen] Failed to add favorite folder:', err);
        return null;
    }
}
/** List all favorite folders. */
export async function getFavoriteFolders() {
    try {
        const db = await getDB();
        const rows = await readAll(db, FAV_FOLDER_STORE);
        return rows.sort((a, b) => a.addedAt - b.addedAt);
    }
    catch (err) {
        console.warn('[dsh-image-gen] Failed to read favorite folders:', err);
        return [];
    }
}
/** Delete a folder; member favorites survive and become unfiled. */
export async function deleteFavoriteFolder(id) {
    try {
        const db = await getDB();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(FAV_PROMPT_STORE, 'readwrite');
            const req = tx.objectStore(FAV_PROMPT_STORE).openCursor();
            req.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const row = cursor.value;
                    if (row.folderId === id) {
                        delete row.folderId;
                        cursor.update(row);
                    }
                    cursor.continue();
                }
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        await new Promise((resolve, reject) => {
            const req = db.transaction(FAV_FOLDER_STORE, 'readwrite').objectStore(FAV_FOLDER_STORE).delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
        notifyFavorites();
    }
    catch (err) {
        console.warn('[dsh-image-gen] Failed to delete favorite folder:', err);
    }
}
async function moveFavorite(storeName, id, folderId) {
    try {
        const db = await getDB();
        const ok = await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).get(id);
            req.onsuccess = () => {
                const row = req.result;
                if (row === undefined) {
                    resolve(false);
                    return;
                }
                if (folderId === undefined)
                    delete row.folderId;
                else
                    row.folderId = folderId;
                tx.objectStore(storeName).put(row);
                resolve(true);
            };
            tx.onerror = () => reject(tx.error);
        });
        if (ok)
            notifyFavorites();
        return ok;
    }
    catch (err) {
        console.warn('[dsh-image-gen] Failed to move favorite:', err);
        return false;
    }
}
/** File a favorite prompt into a folder (undefined unfiles it). */
export function moveFavoritePrompt(id, folderId) {
    return moveFavorite(FAV_PROMPT_STORE, id, folderId);
}
/** Rewrite a favorite prompt's text in place, keeping its id stable. */
export async function updateFavoritePrompt(id, text) {
    const trimmed = text.trim();
    if (trimmed === '')
        return false;
    try {
        const db = await getDB();
        const ok = await new Promise((resolve, reject) => {
            const tx = db.transaction(FAV_PROMPT_STORE, 'readwrite');
            const req = tx.objectStore(FAV_PROMPT_STORE).get(id);
            req.onsuccess = () => {
                const row = req.result;
                if (row === undefined) {
                    resolve(false);
                    return;
                }
                row.text = trimmed;
                tx.objectStore(FAV_PROMPT_STORE).put(row);
                resolve(true);
            };
            tx.onerror = () => reject(tx.error);
        });
        if (ok)
            notifyFavorites();
        return ok;
    }
    catch (err) {
        console.warn('[dsh-image-gen] Failed to update favorite prompt:', err);
        return false;
    }
}
//# sourceMappingURL=gallery-store.js.map