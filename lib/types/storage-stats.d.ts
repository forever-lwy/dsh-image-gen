import type { IncomingMessage, ServerResponse } from 'node:http';
/** Directory scans are cached for this long; the panel is read-only. */
export declare const STORAGE_STATS_TTL_MS: number;
export interface StorageStats {
    attachments: {
        count: number;
        bytes: number;
    };
    requestImages: {
        count: number;
        bytes: number;
    };
    orphans: {
        count: number;
        bytes: number;
        ids: string[];
    };
    scannedAt: number;
}
export declare function resolveAttachmentsRoot(home?: string): string;
/** Drop the cached directory scan (used by tests and a manual refresh). */
export declare function resetStorageStatsCache(): void;
export declare function collectStorageStats(attachmentIds: Iterable<string>, options?: {
    attachmentsRoot?: string;
    requestImagesRoot?: string;
    now?: number;
    ttlMs?: number;
}): Promise<StorageStats>;
export interface StorageStatsRouteDeps {
    /** Effective request-image cache root, matching the directory pruning maintains. */
    requestImagesRoot?: string;
}
/** POST {attachmentIds: string[]} -> read-only usage numbers. */
export declare function serveStorageStats(req: IncomingMessage, res: ServerResponse, deps?: StorageStatsRouteDeps): Promise<void>;
