/** Streaming ZIP writer (Store mode) used by the gallery export route. */
import type { ServerResponse } from 'node:http';
/** Raised when the selection cannot be represented even with ZIP64 records. */
export declare class ZipTooLargeError extends Error {
    constructor(message: string);
}
/**
 * Write a ZIP archive straight to an HTTP response.
 *
 * Images are already compressed, so entries are stored (method 0) and the only
 * CPU work is the CRC — `zlib.crc32` runs in native code. Sizes are known before
 * each header is written, so no data descriptor is needed; entries that cross
 * the ZIP32 limits get ZIP64 extra fields, and the archive ends with a ZIP64
 * end-of-central-directory record when any entry needs one.
 */
export declare class ZipStreamWriter {
    private readonly res;
    private readonly options;
    private readonly central;
    private readonly names;
    private offset;
    private entries;
    private closed;
    private zip64Archive;
    constructor(res: ServerResponse, options?: {
        zip64?: 'auto' | 'always';
        maxBytes?: number;
    });
    get entryCount(): number;
    get bytesWritten(): number;
    get isClosed(): boolean;
    /** Stop writing as soon as the browser closes the download. */
    markClientClosed(): void;
    /** Append one file entry. */
    add(name: string, data: Buffer): Promise<void>;
    /** Write the central directory and finish the response. */
    finish(): Promise<void>;
    private centralRecord;
    private write;
    private uniqueName;
}
/** Keep download names portable: no paths, no control characters, bounded length. */
export declare function sanitizeName(raw: string): string;
