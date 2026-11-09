/** Progress/cancel bookkeeping for host-streamed ZIP exports. */
import type { IncomingMessage, ServerResponse } from 'node:http';
export type ZipJobState = 'running' | 'done' | 'cancelled' | 'error';
/** Tokens are client-generated identifiers; anything else is ignored. */
export declare function isValidZipToken(token: string): boolean;
/** The SSE listener may connect first; createZipJob then fills in the total. */
export declare function createZipJob(token: string, total: number): void;
export declare function updateZipJob(token: string, done: number): void;
export declare function finishZipJob(token: string, state: Exclude<ZipJobState, 'running'>): void;
export declare function isZipJobCancelled(token: string): boolean;
export declare function cancelZipJob(token: string): boolean;
/**
 * Server-sent events for one export: the client keeps the fast iframe download
 * and still sees "N/M" progress plus completion.
 */
export declare function serveZipProgress(req: IncomingMessage, res: ServerResponse): void;
/** Stop an in-flight export; the ZIP response is destroyed so the download fails. */
export declare function serveZipCancel(req: IncomingMessage, res: ServerResponse): void;
