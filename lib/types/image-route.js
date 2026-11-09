import { parseImageAttachmentRef } from './reference-image.js';
import { IMAGE_ROUTE, DELETE_ROUTE, SAVE_WORKSPACE_ROUTE, decodeImageRef } from './shared.js';
import { assertWorkspaceAllowed } from './workspace-save.js';
export { IMAGE_ROUTE, DELETE_ROUTE, SAVE_WORKSPACE_ROUTE } from './shared.js';
const MAX_BODY_BYTES = 64 * 1024;
/** Serve one verified durable image reference to a same-origin browser request. */
export async function serveImage(req, res, deps) {
    if (req.method === 'GET')
        return serveCachedImage(req, res, deps);
    if (req.method !== 'POST')
        return jsonError(res, 405, 'method-not-allowed');
    if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json'))
        return jsonError(res, 415, 'json-required');
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin !== undefined && host !== undefined && origin !== `http://${host}` && origin !== `https://${host}`) {
        return jsonError(res, 403, 'origin-rejected');
    }
    let body;
    try {
        body = JSON.parse(await readBody(req));
    }
    catch {
        return jsonError(res, 400, 'invalid-request');
    }
    const attachment = attachmentFromRequest(body);
    if (attachment === undefined)
        return jsonError(res, 400, 'invalid-attachment');
    try {
        const stored = await deps.readImage(attachment);
        res.writeHead(200, {
            'content-type': stored.ref.mediaType,
            'content-length': String(stored.data.byteLength),
            'cache-control': 'private, no-store',
            'x-content-type-options': 'nosniff',
        });
        res.end(stored.data);
    }
    catch {
        jsonError(res, 404, 'image-unavailable');
    }
}
/**
 * Cacheable GET form: attachments are content-addressed, so the response can be
 * marked immutable and revalidated with a stable ETag. Preview, copy and
 * download then hit the browser cache instead of re-reading the host.
 */
async function serveCachedImage(req, res, deps) {
    if (!sameOrigin(req))
        return jsonError(res, 403, 'origin-rejected');
    const raw = new URL(req.url ?? '/', 'http://x').searchParams.get('ref');
    const attachment = raw === null ? undefined : decodeImageRef(raw, parseImageAttachmentRef);
    if (attachment === undefined)
        return jsonError(res, 400, 'invalid-attachment');
    const etag = '"' + String(attachment.attachmentId) + '"';
    const cacheHeaders = {
        'cache-control': 'private, max-age=31536000, immutable',
        etag,
    };
    const ifNoneMatch = req.headers['if-none-match'];
    if (typeof ifNoneMatch === 'string' && ifNoneMatch.split(',').some(value => value.trim() === etag)) {
        res.writeHead(304, cacheHeaders);
        res.end();
        return;
    }
    try {
        const stored = await deps.readImage(attachment);
        res.writeHead(200, {
            'content-type': stored.ref.mediaType,
            'content-length': String(stored.data.byteLength),
            'x-content-type-options': 'nosniff',
            ...cacheHeaders,
        });
        res.end(stored.data);
    }
    catch {
        jsonError(res, 404, 'image-unavailable');
    }
}
function sameOrigin(req) {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin !== undefined && host !== undefined && origin !== `http://${host}` && origin !== `https://${host}`) {
        return false;
    }
    return true;
}
/** Safely delete one or more generated image files from the workspace disk. */
export async function serveDelete(req, res, deps) {
    if (req.method !== 'POST')
        return jsonError(res, 405, 'method-not-allowed');
    if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json'))
        return jsonError(res, 415, 'json-required');
    if (!sameOrigin(req)) {
        return jsonError(res, 403, 'origin-rejected');
    }
    let body;
    try {
        body = JSON.parse(await readBody(req));
    }
    catch {
        return jsonError(res, 400, 'invalid-request');
    }
    const rawPaths = typeof body === 'object' && body !== null && 'paths' in body && Array.isArray(body.paths)
        ? body.paths
        : [];
    const deletedFiles = [];
    const failedFiles = [];
    // Delete by direct paths
    for (const p of rawPaths) {
        if (typeof p === 'string' && p.trim()) {
            try {
                const ok = await deps.deleteWorkspaceImage(p);
                if (ok) {
                    deletedFiles.push(p);
                }
                else {
                    failedFiles.push({ path: p, error: 'File not found or rejected by safety checks' });
                }
            }
            catch (err) {
                failedFiles.push({ path: p, error: err instanceof Error ? err.message : String(err) });
            }
        }
    }
    res.writeHead(200, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
    });
    res.end(JSON.stringify({
        ok: failedFiles.length === 0,
        deletedCount: deletedFiles.length,
        deletedFiles,
        failedFiles,
    }));
}
/** Serve on-demand image persistence into the workspace. */
export async function serveSaveWorkspace(req, res, deps) {
    if (!sameOrigin(req))
        return jsonError(res, 403, 'origin-rejected');
    if (req.method !== 'POST')
        return jsonError(res, 405, 'method-not-allowed');
    if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
        return jsonError(res, 415, 'json-required');
    }
    try {
        const raw = JSON.parse(await readBody(req));
        const attachment = parseImageAttachmentRef(raw.attachment);
        if (!attachment) {
            return jsonError(res, 400, 'invalid-attachment');
        }
        if (!deps.isSaveEnabled()) {
            res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
            res.end(JSON.stringify({ ok: true, savedTo: undefined }));
            return;
        }
        const rawTarget = typeof raw.workspaceRoot === 'string' && raw.workspaceRoot.trim()
            ? raw.workspaceRoot.trim()
            : deps.getActiveWorkspaceRoot();
        const allowedRoots = await deps.getAllowedWorkspaceRoots();
        let targetRoot;
        try {
            targetRoot = await assertWorkspaceAllowed(rawTarget, allowedRoots);
        }
        catch {
            return jsonError(res, 403, 'workspace-root-not-allowed');
        }
        const stored = await deps.readImage(attachment);
        if (!stored || !stored.data) {
            return jsonError(res, 404, 'image-not-found');
        }
        const savedTo = await deps.saveToWorkspace({
            workspaceRoot: targetRoot,
            attachmentId: String(attachment.attachmentId),
            mediaType: attachment.mediaType,
            data: stored.data,
        });
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ ok: true, savedTo }));
    }
    catch (err) {
        res.writeHead(500, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
    }
}
/** Validate the persisted reference carried by a tool presentation. */
export function imageAttachmentFromMeta(meta) {
    const value = record(meta);
    if (value?.kind !== 'dsh-image-gen')
        return undefined;
    return parseImageAttachmentRef(value.attachment);
}
function attachmentFromRequest(value) {
    return parseImageAttachmentRef(record(value)?.attachment);
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
}
async function readBody(req) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.byteLength;
        if (bytes > MAX_BODY_BYTES)
            throw new Error('request too large');
        chunks.push(buffer);
    }
    return Buffer.concat(chunks).toString('utf8');
}
function jsonError(res, status, code) {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ error: code }));
}
//# sourceMappingURL=image-route.js.map