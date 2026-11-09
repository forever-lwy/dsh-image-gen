import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MultipartError, readMultipart } from './multipart.js';
const MAX_IMAGES_PER_REQUEST = 8;
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP = (() => {
    const table = new Uint8Array(128);
    for (let index = 0; index < BASE64_ALPHABET.length; index++)
        table[BASE64_ALPHABET.charCodeAt(index)] = 1;
    return table;
})();
/**
 * Validate base64 in linear time. A backtracking regexp looks harmless but V8
 * throws RangeError ("Maximum call stack size exceeded") once the input passes
 * a few megabytes, which turned every large import into a bare HTTP 400.
 */
function isValidBase64(value) {
    // An empty payload is left to the byte-range check below so its stable
    // 'size-out-of-range' code is preserved.
    if (value.length % 4 !== 0)
        return false;
    const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
    const end = value.length - padding;
    for (let index = 0; index < end; index++) {
        const code = value.charCodeAt(index);
        if (code > 127 || BASE64_LOOKUP[code] !== 1)
            return false;
    }
    return true;
}
/** base64 inflates bytes by 4/3; allow one full batch plus JSON overhead. */
function bodyLimit(maxImageBytes) {
    return MAX_IMAGES_PER_REQUEST * Math.ceil(maxImageBytes * 1.4) + 4096;
}
export async function serveImport(req, res, deps) {
    if (req.method !== 'POST')
        return jsonError(res, 405, 'method-not-allowed');
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin !== undefined && host !== undefined && origin !== `http://${host}` && origin !== `https://${host}`) {
        return jsonError(res, 403, 'origin-rejected');
    }
    const contentType = req.headers['content-type'] ?? '';
    const boundary = multipartBoundary(contentType);
    if (boundary !== undefined)
        return serveMultipartImport(req, res, deps, boundary);
    if (!contentType.toLowerCase().startsWith('application/json'))
        return jsonError(res, 415, 'json-required');
    let body;
    try {
        body = JSON.parse(await readBody(req, bodyLimit(deps.maxImageBytes)));
    }
    catch {
        return jsonError(res, 400, 'invalid-request');
    }
    const images = typeof body === 'object' && body !== null ? body.images : undefined;
    if (!Array.isArray(images) || images.length === 0 || images.length > MAX_IMAGES_PER_REQUEST) {
        return jsonError(res, 400, 'invalid-image-count');
    }
    const saved = [];
    const failures = [];
    for (const [index, item] of images.entries()) {
        try {
            const record = typeof item === 'object' && item !== null ? item : undefined;
            if (record === undefined || typeof record.data !== 'string' || typeof record.mediaType !== 'string') {
                failures.push({ index, error: 'invalid-item' });
                continue;
            }
            if (!deps.mediaTypes.includes(record.mediaType)) {
                failures.push({ index, error: `unsupported-media-type: ${record.mediaType}` });
                continue;
            }
            // Buffer.from silently skips characters outside the base64 alphabet, so the
            // encoded text is validated up front instead of relying on decode failures.
            if (!isValidBase64(record.data)) {
                failures.push({ index, error: 'invalid-base64' });
                continue;
            }
            const bytes = Buffer.from(record.data, 'base64');
            if (bytes.byteLength === 0 || bytes.byteLength > deps.maxImageBytes) {
                failures.push({ index, error: `size-out-of-range (max ${String(deps.maxImageBytes)} bytes)` });
                continue;
            }
            try {
                const persisted = await persistImport(deps, bytes, record.mediaType, record.name);
                saved.push(persisted);
                try {
                    deps.warmThumbnail?.(persisted.attachment);
                }
                catch { /* warm-up is best effort */ }
            }
            catch {
                // Host save errors may carry internal details; surface a stable code
                // instead, matching the canvas upload route's generic failure answer.
                failures.push({ index, error: 'save-failed' });
            }
        }
        catch {
            // Never let one malformed item reject the whole request: an uncaught
            // throw reaches the host web server, which answers with a bare HTTP 400.
            failures.push({ index, error: 'internal-error' });
        }
    }
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ images: saved, failures }));
}
async function serveMultipartImport(req, res, deps, boundary) {
    const saved = [];
    const failures = [];
    let tempDir;
    try {
        tempDir = await mkdtemp(join(tmpdir(), 'dsh-image-import-'));
        const spooled = [];
        let index = 0;
        await readMultipart(req, boundary, {
            maxPartBytes: deps.maxImageBytes,
            onPart: async (part) => {
                const current = index++;
                // Keep parsing after the cap, but never save part nine: the first eight
                // are returned normally and the rest are reported as failures.
                if (current >= MAX_IMAGES_PER_REQUEST) {
                    failures.push({ index: current, error: 'invalid-image-count' });
                    return;
                }
                if (part.tooLarge || part.bytes === 0 || part.bytes > deps.maxImageBytes) {
                    failures.push({ index: current, error: 'size-out-of-range (max ' + String(deps.maxImageBytes) + ' bytes)' });
                    return;
                }
                const declared = part.mediaType !== undefined && deps.mediaTypes.includes(part.mediaType)
                    ? part.mediaType
                    : mediaTypeFromFilename(part.filename);
                if (declared === undefined || !deps.mediaTypes.includes(declared)) {
                    failures.push({ index: current, error: 'unsupported-media-type: ' + (declared ?? 'unknown') });
                    return;
                }
                // Spool the complete part before touching the durable attachment store.
                // A truncated request therefore leaves no unreferenced attachments.
                const path = join(tempDir, String(current) + '.part');
                await writeFile(path, part.data);
                spooled.push({
                    index: current,
                    path,
                    mediaType: declared,
                    ...(part.filename === undefined ? {} : { filename: part.filename }),
                    bytes: part.bytes,
                });
            },
        });
        // The request body is complete; now commit the batch in order.
        for (const part of spooled) {
            try {
                const data = await readFile(part.path);
                const persisted = await persistImport(deps, data, part.mediaType, part.filename);
                saved.push(persisted);
                try {
                    deps.warmThumbnail?.(persisted.attachment);
                }
                catch { /* warm-up is best effort */ }
            }
            catch {
                failures.push({ index: part.index, error: 'save-failed' });
            }
        }
    }
    catch (err) {
        if (err instanceof MultipartError)
            return jsonError(res, err.status, err.code);
        return jsonError(res, 400, 'invalid-request');
    }
    finally {
        if (tempDir !== undefined)
            await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
    if (saved.length === 0 && failures.length === 0)
        return jsonError(res, 400, 'invalid-image-count');
    failures.sort((a, b) => a.index - b.index);
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ images: saved, failures }));
}
/** Save one image and, when the attachment layer normalized it, keep the raw copy. */
async function persistImport(deps, bytes, mediaType, name) {
    const attachment = await deps.saveImage({
        data: bytes,
        mediaType,
        ...(typeof name === 'string' && name.length > 0 ? { name } : {}),
    });
    let original;
    if (deps.saveOriginal !== undefined && (attachment.mediaType !== mediaType || attachment.bytes !== bytes.byteLength)) {
        // Do not acknowledge a full-resolution import whose original could not be
        // stored and protected. The caller can retry instead of silently losing it.
        original = await deps.saveOriginal({ data: bytes, mediaType });
    }
    return { attachment, ...(original === undefined ? {} : { original }) };
}
function multipartBoundary(contentType) {
    if (!contentType.toLowerCase().startsWith('multipart/form-data'))
        return undefined;
    const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
    const value = (match?.[1] ?? match?.[2] ?? '').trim();
    return value.length > 0 ? value : undefined;
}
const FILENAME_MEDIA_TYPES = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
};
function mediaTypeFromFilename(name) {
    if (name === undefined)
        return undefined;
    const dot = name.lastIndexOf('.');
    if (dot === -1)
        return undefined;
    return FILENAME_MEDIA_TYPES[name.slice(dot + 1).toLowerCase()];
}
async function readBody(req, maxBytes) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.byteLength;
        if (bytes > maxBytes)
            throw new Error('request-too-large');
        chunks.push(buffer);
    }
    return Buffer.concat(chunks).toString('utf8');
}
function jsonError(res, status, code) {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ error: code }));
}
//# sourceMappingURL=import-route.js.map