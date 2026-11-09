/** Disposable IndexedDB cache for grid thumbnails. */
export declare const GALLERY_THUMB_MAX_BYTES: number;
export declare const GALLERY_THUMB_MAX_AGE_MS: number;
export declare const GALLERY_THUMB_WIDTH = 320;
/** Cache key for one attachment thumbnail. */
export declare function galleryThumbKey(attachmentId: string, width?: number): string;
/** Read a cached thumbnail; resolves undefined when it was never generated. */
export declare function getGalleryThumb(key: string): Promise<Blob | undefined>;
/** Persist a generated thumbnail. Failures are non-fatal: the grid falls back to the original. */
export declare function putGalleryThumb(key: string, blob: Blob): Promise<void>;
/** Aggregate size of the disposable thumbnail cache (storage panel). */
export declare function getGalleryThumbStats(): Promise<{
    count: number;
    bytes: number;
}>;
/** Drop cached thumbnails for deleted records. Best-effort: the cache is disposable. */
export declare function deleteGalleryThumbs(ids: string[]): Promise<void>;
/**
 * Drop cached thumbnails whose attachment is no longer in the gallery.
 * Returns how many entries were removed.
 */
export declare function pruneGalleryThumbs(validAttachmentIds: Iterable<string>, maxBytes?: number, maxAgeMs?: number): Promise<number>;
/** Drop every cached thumbnail (used when the gallery is cleared). */
export declare function clearGalleryThumbs(): Promise<void>;
