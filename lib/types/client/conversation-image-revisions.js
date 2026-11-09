import { STUDIO_PROVIDERS, STUDIO_WATERMARK_VALUES } from '../shared.js';
import { imageVersionKey, originalFromMeta } from './image-result-node.js';
function revisionKey(revision) {
    return imageVersionKey(String(revision.attachment.attachmentId), revision.original);
}
const STORAGE_PREFIX = 'dsh_image_gen_conversation_revisions:';
const MAX_REVISIONS = 20;
/** Read the locally persisted replacement history for one immutable conversation image. */
export function loadConversationImageRevisionChain(originId) {
    const empty = () => ({ originId, currentIndex: 0, revisions: [] });
    try {
        const raw = globalThis.localStorage?.getItem(storageKey(originId));
        if (!raw)
            return empty();
        const value = JSON.parse(raw);
        if (!isChain(value, originId))
            return empty();
        const currentIndex = Math.min(value.currentIndex, value.revisions.length);
        // A corrupt vault reference costs only the animation, never the version.
        return { originId, currentIndex, revisions: value.revisions.map(({ original, ...revision }) => {
                const checked = originalFromMeta(original);
                return checked === undefined ? revision : { ...revision, original: checked };
            }) };
    }
    catch {
        return empty();
    }
}
/** Append a generated version and make it the version shown by the conversation card. */
export function appendConversationImageRevision(originId, revision) {
    const current = loadConversationImageRevisionChain(originId);
    // Animations sharing a first-frame still are still different versions.
    const key = revisionKey(revision);
    const withoutDuplicate = current.revisions.filter(item => revisionKey(item) !== key);
    const revisions = [...withoutDuplicate, revision].slice(-MAX_REVISIONS);
    const next = { originId, currentIndex: revisions.length, revisions };
    persist(next);
    return next;
}
/** Select an earlier or later version without altering the underlying conversation event. */
export function selectConversationImageRevision(originId, requestedIndex) {
    const current = loadConversationImageRevisionChain(originId);
    const currentIndex = Math.max(0, Math.min(Math.trunc(requestedIndex), current.revisions.length));
    const next = { ...current, currentIndex };
    persist(next);
    return next;
}
function persist(chain) {
    try {
        globalThis.localStorage?.setItem(storageKey(chain.originId), JSON.stringify(chain));
    }
    catch {
        // The generated attachment is still available for this mount when browser storage is unavailable.
    }
}
function storageKey(originId) {
    return `${STORAGE_PREFIX}${originId}`;
}
function isChain(value, originId) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const candidate = value;
    return candidate.originId === originId
        && typeof candidate.currentIndex === 'number'
        && Number.isSafeInteger(candidate.currentIndex)
        && candidate.currentIndex >= 0
        && Array.isArray(candidate.revisions)
        && candidate.revisions.every(isRevision);
}
function isRevision(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const candidate = value;
    return isAttachment(candidate.attachment)
        && typeof candidate.provider === 'string'
        && STUDIO_PROVIDERS.includes(candidate.provider)
        && (candidate.channel === undefined || typeof candidate.channel === 'string')
        && typeof candidate.prompt === 'string'
        && typeof candidate.model === 'string'
        && typeof candidate.output === 'string'
        && typeof candidate.createdAt === 'number'
        && Number.isFinite(candidate.createdAt)
        && typeof candidate.ratio === 'string'
        && typeof candidate.quality === 'string'
        && (candidate.resolution === undefined || typeof candidate.resolution === 'string')
        && (candidate.generationQuality === undefined || typeof candidate.generationQuality === 'string')
        && (candidate.watermark === undefined || STUDIO_WATERMARK_VALUES.some(value => value === candidate.watermark));
}
function isAttachment(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const candidate = value;
    return typeof candidate.attachmentId === 'string'
        && (candidate.mediaType === 'image/png' || candidate.mediaType === 'image/jpeg' || candidate.mediaType === 'image/webp' || candidate.mediaType === 'image/gif')
        && typeof candidate.bytes === 'number'
        && typeof candidate.width === 'number'
        && typeof candidate.height === 'number';
}
//# sourceMappingURL=conversation-image-revisions.js.map