/**
 * Bounded in-memory attachment image cache for client views.
 *
 * Enforces dual constraints (max items + max bytes) with LRU eviction.
 * The background fetch lifecycle is decoupled from individual consumer signals,
 * preventing a canceled thumbnail from aborting the shared blob request.
 */
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
export declare const MAX_CACHE_COUNT = 30;
export declare const MAX_CACHE_BYTES: number;
/**
 * Fetch or reuse an image Blob by attachment ID.
 * Refreshes LRU recency on hit and enforces count/byte limits on arrival.
 */
export declare function fetchAttachmentBlob(attachment: ImageAttachmentRef): Promise<Blob>;
/** Check if an attachment Blob is already cached in memory. */
export declare function getCachedAttachmentBlob(attachmentId: string | ImageAttachmentRef['attachmentId']): Promise<Blob> | undefined;
/** Evict one item from memory cache (e.g. when deleted from gallery). */
export declare function evictAttachmentCache(attachmentId: string | ImageAttachmentRef['attachmentId']): void;
/** Clear all in-memory image caches. */
export declare function clearAttachmentCache(): void;
/** Get current cache size metrics (useful for assertions and health monitoring). */
export declare function getCacheMetrics(): {
    count: number;
    bytes: number;
};
