/**
 * Shared browser image and DOM helpers for client views.
 * Completely decoupled from gallery-view and studio-view to prevent circular dependencies.
 */
/** Convert a Blob to a data URL. Used for tldraw image assets, which need a
 *  self-contained src; the session canvas keeps them in memory only (no
 *  persistenceKey, nothing touches disk). */
export declare function blobToDataUrl(blob: Blob): Promise<string>;
/** Copy an image Blob to the OS clipboard, converting to PNG if required by the browser. */
export declare function copyImageBlob(blob: Blob): Promise<boolean>;
/** Safely trigger a browser file download by mounting an anchor element into the DOM. */
export declare function downloadBlobUrl(url: string, filename: string): void;
/** Human-readable relative time formatter supporting zh and en. */
export declare function formatRelativeTime(timestamp: number, lang: 'zh' | 'en'): string;
export interface ZipFileInput {
    name: string;
    data: Uint8Array;
}
/**
 * Create a standard zero-compression (Store mode 0) PKZip Blob from an array of files.
 * Zero external dependencies, pure browser ArrayBuffer/Blob, fast and universally compatible with OS extractors.
 */
export declare function createZipBlob(files: ZipFileInput[]): Blob;
/**
 * Downscale an image for the gallery grid.
 * Returns the source blob when the browser lacks the needed canvas APIs, so
 * callers can always render something without extra capability branches.
 */
export declare function createImageThumbnail(source: Blob, width: number): Promise<Blob>;
