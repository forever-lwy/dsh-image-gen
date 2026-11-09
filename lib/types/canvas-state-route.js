import { CANVAS_MAX_NODES, CANVAS_MAX_PROMPT_CHARS, CANVAS_MAX_SELECTION_ITEMS, CANVAS_MAX_SELECTION_KINDS, CANVAS_NODE_KINDS } from './shared.js';
import { parseImageAttachmentRef } from './reference-image.js';
const MAX_CLIENT_INSTANCE_CHARS = 64;
const MAX_NODE_TEXT_CHARS = 200;
const MAX_ID_CHARS = 256;
/** Provider ids come from the shared enum (longest is "openai-compat"). */
const MAX_PROVIDER_CHARS = 32;
/** Model ids and ComfyUI workflow labels are user-facing strings. */
const MAX_MODEL_CHARS = 128;
const MAX_NODE_COUNT = 100_000;
const MAX_SELECTION_COUNT = 1_000;
/** Serve one canvas-state push. */
export async function serveCanvasState(req, res, deps) {
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
        body = JSON.parse(await readBody(req, deps.maxBodyBytes));
    }
    catch (error) {
        return jsonError(res, error instanceof Error && error.message === 'request-too-large' ? 413 : 400, 'invalid-request');
    }
    const push = parseCanvasStatePush(body);
    if (push === undefined)
        return jsonError(res, 400, 'invalid-canvas-state');
    let selectionImage;
    if (push.selectionImage !== undefined) {
        const decoded = decodeSelectionImage(push.selectionImage);
        if (decoded === undefined)
            return jsonError(res, 400, 'invalid-selection-image');
        if (decoded.data.byteLength > deps.maxImageBytes)
            return jsonError(res, 413, 'selection-image-too-large');
        selectionImage = decoded;
    }
    deps.mirror.apply(push, selectionImage);
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true }));
}
/**
 * Validate one untrusted canvas-state push at the HTTP boundary.
 * Returns a normalized copy, or undefined when any field is malformed.
 * Present-but-malformed known fields reject the whole push: they signal a
 * client/server version skew rather than a legitimately absent value.
 */
export function parseCanvasStatePush(value) {
    try {
        return parsePush(value);
    }
    catch (error) {
        if (error instanceof InvalidPush)
            return undefined;
        throw error;
    }
}
/** Sentinel thrown by field validators; caught at the public parse boundary. */
class InvalidPush extends Error {
}
function parsePush(value) {
    const record = plainRecord(value);
    if (record === undefined)
        throw new InvalidPush();
    const clientInstance = boundedString(record.clientInstance, 1, MAX_CLIENT_INSTANCE_CHARS);
    if (clientInstance === undefined)
        throw new InvalidPush();
    if (typeof record.connected !== 'boolean')
        throw new InvalidPush();
    if (!nonNegativeInteger(record.nodeCount) || record.nodeCount > MAX_NODE_COUNT)
        throw new InvalidPush();
    if (!nonNegativeInteger(record.updatedAt))
        throw new InvalidPush();
    if (Math.abs(record.updatedAt - Date.now()) > 5 * 60_000)
        throw new InvalidPush();
    let nodes;
    if (record.nodes !== undefined) {
        if (!Array.isArray(record.nodes) || record.nodes.length > CANVAS_MAX_NODES)
            throw new InvalidPush();
        const parsed = [];
        for (const raw of record.nodes) {
            const node = parseNodeSummary(raw);
            if (node === undefined)
                throw new InvalidPush();
            parsed.push(node);
        }
        nodes = parsed;
    }
    let selection;
    if (record.selection !== undefined) {
        const raw = plainRecord(record.selection);
        if (raw === undefined)
            throw new InvalidPush();
        if (!nonNegativeInteger(raw.count) || raw.count > MAX_SELECTION_COUNT)
            throw new InvalidPush();
        if (!Array.isArray(raw.kinds) || raw.kinds.length > CANVAS_MAX_SELECTION_KINDS)
            throw new InvalidPush();
        const kinds = [];
        for (const kind of raw.kinds) {
            if (typeof kind !== 'string' || !CANVAS_NODE_KINDS.includes(kind))
                throw new InvalidPush();
            kinds.push(kind);
        }
        let items;
        if (raw.items !== undefined) {
            if (!Array.isArray(raw.items) || raw.items.length > CANVAS_MAX_SELECTION_ITEMS)
                throw new InvalidPush();
            // items is a capped prefix of the selection, so it can never exceed count.
            if (raw.items.length > raw.count)
                throw new InvalidPush();
            const parsed = [];
            for (const item of raw.items) {
                const node = parseNodeSummary(item);
                if (node === undefined)
                    throw new InvalidPush();
                parsed.push(node);
            }
            items = parsed;
        }
        selection = items === undefined ? { count: raw.count, kinds } : { count: raw.count, kinds, items };
    }
    if (record.selectionImage !== undefined && typeof record.selectionImage !== 'string')
        throw new InvalidPush();
    const selectionRevision = optionalBoundedString(record.selectionRevision, 64);
    const selectionError = optionalBoundedString(record.selectionError, 300);
    const selectionStatus = record.selectionStatus;
    if (selectionStatus !== undefined && selectionStatus !== 'preparing' && selectionStatus !== 'ready' && selectionStatus !== 'error')
        throw new InvalidPush();
    if (record.sequence !== undefined && (!nonNegativeInteger(record.sequence) || !Number.isSafeInteger(record.sequence)))
        throw new InvalidPush();
    return {
        clientInstance,
        connected: record.connected,
        nodeCount: record.nodeCount,
        ...(nodes === undefined ? {} : { nodes }),
        ...(selection === undefined ? {} : { selection }),
        ...(typeof record.selectionImage === 'string' ? { selectionImage: record.selectionImage } : {}),
        ...(selectionRevision === undefined ? {} : { selectionRevision }),
        ...(selectionStatus === undefined ? {} : { selectionStatus }),
        ...(selectionError === undefined ? {} : { selectionError }),
        ...(record.sequence === undefined ? {} : { sequence: record.sequence }),
        updatedAt: record.updatedAt,
    };
}
/** Decode and sanity-check an embedded selection screenshot data URL. */
export function decodeSelectionImage(dataUrl) {
    // The charset deliberately excludes base64url ('-' and '_'): they are not
    // valid in data URLs and Buffer.from would silently accept them.
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl);
    if (match === null)
        return undefined;
    // Both capture groups always participate, but index access stays
    // `string | undefined` under noUncheckedIndexedAccess; narrow for the compiler.
    const mediaType = match[1];
    const base64 = match[2];
    if (mediaType === undefined || base64 === undefined)
        return undefined;
    try {
        const buffer = Buffer.from(base64, 'base64');
        if (buffer.byteLength === 0)
            return undefined;
        return { data: new Uint8Array(buffer), mediaType: mediaType };
    }
    catch {
        return undefined;
    }
}
function parseNodeSummary(value) {
    const record = plainRecord(value);
    if (record === undefined)
        return undefined;
    if (typeof record.kind !== 'string' || !CANVAS_NODE_KINDS.includes(record.kind))
        return undefined;
    const galleryId = optionalBoundedString(record.galleryId, MAX_ID_CHARS);
    const attachmentId = optionalBoundedString(record.attachmentId, MAX_ID_CHARS);
    const attachment = record.attachment === undefined ? undefined : parseImageAttachmentRef(record.attachment);
    if (record.attachment !== undefined && (attachment === undefined || attachment.attachmentId.length > MAX_ID_CHARS || (attachment.name?.length ?? 0) > MAX_ID_CHARS))
        throw new InvalidPush();
    const name = optionalBoundedString(record.name, MAX_ID_CHARS);
    const text = optionalBoundedString(record.text, MAX_NODE_TEXT_CHARS);
    const prompt = optionalBoundedString(record.prompt, CANVAS_MAX_PROMPT_CHARS);
    const provider = optionalBoundedString(record.provider, MAX_PROVIDER_CHARS);
    const model = optionalBoundedString(record.model, MAX_MODEL_CHARS);
    const width = optionalDimension(record.width);
    const height = optionalDimension(record.height);
    return {
        kind: record.kind,
        ...(galleryId === undefined ? {} : { galleryId }),
        ...(attachmentId === undefined ? {} : { attachmentId }),
        ...(attachment === undefined ? {} : { attachment }),
        ...(name === undefined ? {} : { name }),
        ...(width === undefined ? {} : { width }),
        ...(height === undefined ? {} : { height }),
        ...(text === undefined ? {} : { text }),
        ...(prompt === undefined ? {} : { prompt }),
        ...(provider === undefined ? {} : { provider }),
        ...(model === undefined ? {} : { model }),
    };
}
function plainRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
}
function boundedString(value, min, max) {
    if (typeof value !== 'string' || value.length < min || value.length > max)
        return undefined;
    return value;
}
/** Absent is fine; present-but-not-a-bounded-string rejects the whole push. */
function optionalBoundedString(value, max) {
    if (value === undefined)
        return undefined;
    const parsed = boundedString(value, 0, max);
    if (parsed === undefined)
        throw new InvalidPush();
    return parsed;
}
/** Absent is fine; present-but-not-a-finite-dimension rejects the whole push. */
function optionalDimension(value) {
    if (value === undefined)
        return undefined;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000)
        throw new InvalidPush();
    return Math.round(value);
}
function nonNegativeInteger(value) {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
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
//# sourceMappingURL=canvas-state-route.js.map