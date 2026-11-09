import { VAULT_KEY_PATTERN } from '../shared.js';
export const IMAGE_RESULT_NODE_KIND = 'dsh-image-result';
/** Default definition for the successful images from each Tool invocation. */
export const imageResultDefinition = createImageResultDefinition();
/**
 * Give each image Tool result its own Chat row at the event that produced it.
 * PTC (run_code) sub-calls already have their own stable sub-call identity.
 */
export function createImageResultDefinition() {
    return {
        kind: IMAGE_RESULT_NODE_KIND,
        target: 'chat',
        match: (event) => {
            // PTC (run_code) sub-calls carry neither a turn nor presentationMeta.
            // A successful dispatch of our image tools becomes its own node keyed
            // by the sub-call (#38).
            if (event.type === 'tool/ptc-dispatch') {
                const subCallId = event.data.subCallId;
                if (typeof subCallId !== 'string' || subCallId === '')
                    return null;
                return imageResultsFromPtcDispatch(event).length === 0
                    ? null
                    : { id: `ptc:${subCallId}`, role: 'start' };
            }
            if (event.type === 'tool/result'
                && eventTurn(event) !== undefined
                && imageResultsFromMeta(event.data.meta).length > 0) {
                return { id: `result:${event.seq}`, role: 'start' };
            }
            return null;
        },
        start: (_context, match) => {
            if (match.event.type === 'tool/ptc-dispatch') {
                const results = imageResultsFromPtcDispatch(match.event);
                if (results.length === 0)
                    throw new Error('dsh-image-result start requires a plugin image dispatch');
                return { results: results.map(result => ({ ...result, seq: match.event.seq })) };
            }
            const turn = eventTurn(match.event);
            const results = match.event.type === 'tool/result'
                ? imageResultsFromMeta(match.event.data.meta)
                : [];
            if (turn === undefined || results.length === 0) {
                throw new Error('dsh-image-result start requires an image Tool result');
            }
            return { turn, results: results.map(result => ({ ...result, seq: match.event.seq })) };
        },
        update: (context, match) => {
            if (match.event.type !== 'tool/ptc-dispatch')
                return context.state;
            // Defensive merge: a re-dispatch of the same sub-call must not duplicate.
            return imageResultsFromPtcDispatch(match.event).reduce((state, result) => appendResult(state, result, match.event.seq), context.state);
        },
        buildViewNode: (context) => {
            const state = context.state;
            const first = state?.results[0];
            if (state === undefined || first === undefined)
                return null;
            return {
                key: context.key,
                kind: IMAGE_RESULT_NODE_KIND,
                id: context.id,
                target: 'chat',
                // Keep the result at the event that produced it, even after the Turn
                // ends or later images arrive in that same Turn.
                anchorSeq: first.seq,
                // Chat groups every turn-located custom node into Tool process, even
                // when its anchor is beside the answer. A session-located result is a
                // direct Chat row and remains visible when that process folds (#65).
                location: { kind: 'session' },
                visibility: 'visible',
                data: {
                    ...(state.turn !== undefined ? { turn: state.turn } : {}),
                    results: state.results.map(({ seq: _seq, ...result }) => result),
                },
            };
        },
    };
}
/** Append a parsed result unless its attachment is already collected. */
function appendResult(state, result, seq) {
    if (state.results.some(candidate => candidate.attachment.attachmentId === result.attachment.attachmentId)) {
        return state;
    }
    return { ...state, results: [...state.results, { ...result, seq }] };
}
/** Parse the plugin-owned durable presentation metadata from a Tool result event. */
export function imageResultFromMeta(value) {
    const meta = record(value);
    if (meta?.kind !== 'dsh-image-gen')
        return undefined;
    const attachment = imageAttachment(meta.attachment);
    if (attachment === undefined)
        return undefined;
    const original = originalFromMeta(meta.original);
    return {
        attachment,
        prompt: stringValue(meta.prompt, 'Generated Image'),
        provider: stringValue(meta.provider, 'google'),
        ...(typeof meta.channel === 'string' ? { channel: meta.channel } : {}),
        model: stringValue(meta.model, ''),
        output: stringValue(meta.output, ''),
        ...(typeof meta.savedTo === 'string' ? { savedTo: meta.savedTo } : {}),
        ...(typeof meta.seed === 'number' ? { seed: meta.seed } : {}),
        ...(original === undefined ? {} : { original }),
    };
}
/** Parse all successful images from either a single or batch Tool result. */
export function imageResultsFromMeta(value) {
    const meta = record(value);
    if (meta?.kind === 'dsh-image-gen-batch' && Array.isArray(meta.images)) {
        return meta.images.flatMap(image => {
            const result = imageResultFromMeta(image);
            return result === undefined ? [] : [result];
        });
    }
    const result = imageResultFromMeta(value);
    return result === undefined ? [] : [result];
}
function eventTurn(event) {
    const turn = event.data.turn;
    return typeof turn === 'number' && Number.isSafeInteger(turn) && turn >= 0 ? turn : undefined;
}
/** Plugin tools whose PTC (run_code) dispatch results are image results. */
const PTC_IMAGE_TOOL_NAMES = new Set(['generate_image', 'generate_images', 'edit_image']);
/**
 * Fixed summary text rendered by the tools' imageOutput(). PTC dispatch events
 * carry no presentationMeta, so provider/model/output are recovered from this
 * template rather than parsed out of natural language.
 */
const PTC_SUMMARY_PATTERN = /^(?:Generated|Edited) one image with ([^/\s]+)\/(\S+) \((.+)\)\. Attachment ID: /;
/** The vault reference the tools append for an animated result (index.ts originalNote). */
const ORIGINAL_NOTE_PATTERN = / Original animation \(for the result card only\): vault ([a-f0-9]{64}), (\d+) bytes, (image\/[a-z]+)\./;
const PTC_SAVED_TO_PATTERN = / It was also saved to the workspace as (.+)\. (?:(?:Saving it to the workspace failed)|(?:It has no local file path)|(?:Respond to the user))/;
/**
 * Parse a plugin image result from a tool/ptc-dispatch event (#38). PTC
 * run_code sub-calls carry neither a turn nor presentationMeta, so the result
 * is rebuilt from the dispatch payload itself: the image content block for the
 * attachment, arguments for the prompt (and edit source ids), and the tool's
 * fixed-format summary text for provider/model/output. Returns undefined for
 * anything that is not a successful image result from our own image tools.
 */
export function imageResultFromPtcDispatch(event) {
    return imageResultsFromPtcDispatch(event)[0];
}
/** Pair each rendered image with its own summary, including batches with failed items. */
export function imageResultsFromPtcDispatch(event) {
    if (event.type !== 'tool/ptc-dispatch')
        return [];
    const data = event.data;
    if (data.isError === true)
        return [];
    if (typeof data.name !== 'string' || !PTC_IMAGE_TOOL_NAMES.has(data.name))
        return [];
    const content = Array.isArray(data.content) ? data.content : [];
    const results = [];
    let summaryText = '';
    const args = record(data.arguments);
    const sourceIds = sourceAttachmentIds(args);
    for (const block of content) {
        const candidate = record(block);
        if (candidate === undefined)
            continue;
        if (candidate.type === 'text' && typeof candidate.text === 'string') {
            summaryText = candidate.text;
            continue;
        }
        if (candidate.type !== 'image')
            continue;
        const attachment = imageAttachment(candidate.attachment);
        if (attachment === undefined)
            continue;
        const summary = PTC_SUMMARY_PATTERN.exec(summaryText);
        const savedTo = PTC_SAVED_TO_PATTERN.exec(summaryText)?.[1];
        const originalMatch = ORIGINAL_NOTE_PATTERN.exec(summaryText);
        const original = originalMatch === null ? undefined : originalFromMeta({ key: originalMatch[1], bytes: Number(originalMatch[2]), mediaType: originalMatch[3] });
        const promptMarker = '\nImage prompt: ';
        const promptAt = data.name === 'generate_images' ? summaryText.indexOf(promptMarker) : -1;
        results.push({
            attachment,
            prompt: promptAt < 0 ? stringValue(args?.prompt, 'Generated Image') : summaryText.slice(promptAt + promptMarker.length),
            provider: summary?.[1] ?? '',
            model: summary?.[2] ?? '',
            output: summary?.[3] ?? '',
            ...(savedTo !== undefined ? { savedTo } : {}),
            ...(sourceIds !== undefined ? { sourceAttachmentIds: sourceIds } : {}),
            ...(original === undefined ? {} : { original }),
        });
    }
    return results;
}
/** Collect edit_image source attachment ids (single or list form) from dispatch arguments. */
function sourceAttachmentIds(args) {
    if (args === undefined)
        return undefined;
    const single = typeof args.source_attachment_id === 'string' ? [args.source_attachment_id] : undefined;
    const list = Array.isArray(args.source_attachment_ids)
        ? args.source_attachment_ids.filter((id) => typeof id === 'string')
        : undefined;
    const ids = single ?? list;
    return ids !== undefined && ids.length > 0 ? ids : undefined;
}
function imageAttachment(value) {
    const candidate = record(value);
    if (candidate === undefined
        || typeof candidate.attachmentId !== 'string'
        || !isImageMediaType(candidate.mediaType)
        || !positiveInteger(candidate.bytes)
        || !positiveInteger(candidate.width)
        || !positiveInteger(candidate.height))
        return undefined;
    const original = record(candidate.originalDimensions);
    if (candidate.originalDimensions !== undefined
        && (original === undefined || !positiveInteger(original.width) || !positiveInteger(original.height)))
        return undefined;
    return {
        attachmentId: candidate.attachmentId,
        mediaType: candidate.mediaType,
        bytes: candidate.bytes,
        width: candidate.width,
        height: candidate.height,
        ...(typeof candidate.name === 'string' ? { name: candidate.name } : {}),
        ...(original === undefined ? {} : { originalDimensions: { width: original.width, height: original.height } }),
    };
}
function isImageMediaType(value) {
    return value === 'image/png' || value === 'image/jpeg' || value === 'image/webp' || value === 'image/gif';
}
function positiveInteger(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
function stringValue(value, fallback) {
    return typeof value === 'string' ? value : fallback;
}
/**
 * The identity of one image version. A still is its attachment; an animated
 * result is also its vault original, because the host normalizes a GIF to a
 * still of its first frame and two animations that differ only after that
 * frame share one attachment. Keying versions, gallery records and frame notes
 * by the attachment alone would merge such animations into one.
 */
export function imageVersionKey(attachmentId, original) {
    return original === undefined ? attachmentId : `${attachmentId}#gif:${original.key}`;
}
/** Parse a vault reference; anything malformed drops the reference, never the image that carries it. */
export function originalFromMeta(value) {
    const candidate = record(value);
    if (candidate === undefined
        || typeof candidate.key !== 'string' || !VAULT_KEY_PATTERN.test(candidate.key)
        || !positiveInteger(candidate.bytes)
        || !isImageMediaType(candidate.mediaType))
        return undefined;
    return { key: candidate.key, bytes: candidate.bytes, mediaType: candidate.mediaType };
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : undefined;
}
//# sourceMappingURL=image-result-node.js.map