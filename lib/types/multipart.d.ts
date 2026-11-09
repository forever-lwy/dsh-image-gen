/** Minimal streaming multipart/form-data reader for the gallery import route. */
import type { IncomingMessage } from 'node:http';
export declare class MultipartError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(status: number, code: string);
}
export interface MultipartPart {
    name: string;
    filename?: string;
    mediaType?: string;
    /** Part payload; empty when the part exceeded the per-part byte cap. */
    data: Buffer;
    /** True when the payload exceeded the cap and was discarded. */
    tooLarge: boolean;
    /** Payload byte count even when it was discarded. */
    bytes: number;
}
export interface ReadMultipartOptions {
    /** Maximum payload bytes kept per part; larger parts are drained and flagged. */
    maxPartBytes: number;
    /** Called once per complete part, in order; awaited before parsing continues. */
    onPart(part: MultipartPart): Promise<void>;
}
/**
 * Parse a multipart body incrementally. Only one part is buffered at a time,
 * so an 8 x 40 MiB upload never holds the whole request in memory.
 */
export declare function readMultipart(req: IncomingMessage, boundary: string, options: ReadMultipartOptions): Promise<void>;
