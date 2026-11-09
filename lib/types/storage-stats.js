/** Read-only storage accounting for the gallery storage panel. */
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { resolveRequestImageCacheDir } from './request-cache.js';
/** Directory scans are cached for this long; the panel is read-only. */
export const STORAGE_STATS_TTL_MS = 10 * 60 * 1000;
function resolveDshHome() {
    return process.env.DSH_HOME?.trim() || join(homedir(), '.dsh');
}
export function resolveAttachmentsRoot(home = resolveDshHome()) {
    return join(home, 'attachments', 'v1', 'objects');
}
async function scanTree(root) {
    try {
        const entries = await readdir(root, { recursive: true, withFileTypes: true });
        const files = [];
        let bytes = 0;
        for (const entry of entries) {
            if (!entry.isFile())
                continue;
            const parent = entry.parentPath ?? root;
            try {
                const info = await stat(join(parent, entry.name));
                bytes += info.size;
                files.push({ name: entry.name, bytes: info.size });
            }
            catch {
                // A file can disappear between readdir and stat; ignore it.
            }
        }
        return { count: files.length, bytes, files };
    }
    catch {
        return { count: 0, bytes: 0, files: [] };
    }
}
let baseCache = null;
/** Drop the cached directory scan (used by tests and a manual refresh). */
export function resetStorageStatsCache() {
    baseCache = null;
}
export async function collectStorageStats(attachmentIds, options = {}) {
    const now = options.now ?? Date.now();
    const ttl = options.ttlMs ?? STORAGE_STATS_TTL_MS;
    // Only an explicit attachments root isolates a test; the request cache root
    // changes with settings and is compared through the cache key below.
    const injected = options.attachmentsRoot !== undefined;
    const attachmentsRoot = options.attachmentsRoot ?? resolveAttachmentsRoot();
    const requestImagesRoot = options.requestImagesRoot ?? resolveRequestImageCacheDir(resolveDshHome());
    if (!injected && baseCache !== null && baseCache.requestImagesRoot === requestImagesRoot && now - baseCache.at < ttl) {
        return buildStats(baseCache.attachments, baseCache.requestImages, attachmentIds, now);
    }
    const [attachments, requestImages] = await Promise.all([scanTree(attachmentsRoot), scanTree(requestImagesRoot)]);
    if (!injected)
        baseCache = { at: now, attachments, requestImages, requestImagesRoot };
    return buildStats(attachments, requestImages, attachmentIds, now);
}
function buildStats(attachments, requestImages, attachmentIds, now) {
    const refs = new Set();
    for (const id of attachmentIds) {
        const value = String(id);
        refs.add(value);
        refs.add(value.replace(/^sha256:/, ''));
    }
    const orphans = attachments.files
        .filter(file => !refs.has(file.name) && !refs.has('sha256:' + file.name))
        .map(file => ({ id: 'sha256:' + file.name, bytes: file.bytes }));
    return {
        attachments: { count: attachments.count, bytes: attachments.bytes },
        requestImages: { count: requestImages.count, bytes: requestImages.bytes },
        orphans: {
            count: orphans.length,
            bytes: orphans.reduce((sum, entry) => sum + entry.bytes, 0),
            ids: orphans.map(entry => entry.id),
        },
        scannedAt: now,
    };
}
/** POST {attachmentIds: string[]} -> read-only usage numbers. */
export async function serveStorageStats(req, res, deps = {}) {
    if (req.method !== 'POST')
        return jsonError(res, 405, 'method-not-allowed');
    if (!sameOrigin(req))
        return jsonError(res, 403, 'origin-rejected');
    let body;
    try {
        body = await readBody(req, 2 * 1024 * 1024);
    }
    catch {
        return jsonError(res, 413, 'request-too-large');
    }
    let parsed;
    try {
        parsed = JSON.parse(body);
    }
    catch {
        return jsonError(res, 400, 'invalid-request');
    }
    const ids = parsed?.attachmentIds;
    if (!Array.isArray(ids))
        return jsonError(res, 400, 'invalid-request');
    const stats = await collectStorageStats(ids.filter((id) => typeof id === 'string'), deps.requestImagesRoot === undefined ? {} : { requestImagesRoot: deps.requestImagesRoot });
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(stats));
}
function sameOrigin(req) {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin !== undefined && host !== undefined && origin !== 'http://' + host && origin !== 'https://' + host)
        return false;
    return true;
}
async function readBody(req, limit) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.byteLength;
        if (bytes > limit)
            throw new Error('request too large');
        chunks.push(buffer);
    }
    return Buffer.concat(chunks).toString('utf8');
}
function jsonError(res, status, code) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ error: code }));
}
//# sourceMappingURL=storage-stats.js.map