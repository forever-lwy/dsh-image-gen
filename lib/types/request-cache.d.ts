/** Default retention for request-image variants. */
export declare const DEFAULT_REQUEST_CACHE_TTL_MS: number;
/** Default byte budget, matching the thumbnail cache policy. */
export declare const DEFAULT_REQUEST_CACHE_MAX_BYTES: number;
/** Never touch variants younger than this: a request may still be in flight. */
export declare const DEFAULT_REQUEST_CACHE_KEEP_MS: number;
export interface RequestCachePruneOptions {
    /** Absolute request-image cache root. */
    dir: string;
    /** Delete files older than this (default 14 days). */
    ttlMs?: number;
    /** Keep the total under this many bytes (0 disables the cap). */
    maxBytes?: number;
    /** Window of recent files that pruning never touches. */
    keepMs?: number;
    /** Injectable clock for tests. */
    now?: number;
    /** Additional roots whose files must never be pruned (for example the raw vault). */
    protectedRoots?: string[];
}
export interface RequestCachePruneStats {
    scanned: number;
    removed: number;
    freedBytes: number;
    remainingBytes: number;
}
/** Resolve the default cache root below DSH_HOME. */
export declare function resolveRequestImageCacheDir(home?: string): string;
/** Durable attachment objects; never a pruning target, even via a broad override. */
export declare function durableAttachmentsRoot(): string;
/** True when the directory is the durable attachment tree or one of its ancestors. */
export declare function overlapsDurableAttachments(dir: string, attachmentsRoot?: string): boolean;
/**
 * Remove stale request-image variants.
 *
 * The attachment backend writes one file per (attachment, target) variant and
 * never cleans them up itself, so a gallery full of 320 px thumbnails grows it
 * without bound. Deletion is safe: variants are deterministic and regenerated
 * on demand, so removing an entry only costs one sharp pass next time.
 */
export declare function pruneRequestImageCache(options: RequestCachePruneOptions): Promise<RequestCachePruneStats>;
