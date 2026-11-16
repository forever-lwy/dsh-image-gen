import { request as httpsRequest } from 'node:https';
import type { LookupAddress } from 'node:dns';
export declare function isPublicAddress(address: string): boolean;
interface DownloadOptions {
    maxBytes: number;
    signal?: AbortSignal;
    authorization?: string;
    acceptSvg?: boolean;
}
interface DownloadDeps {
    lookup?: (host: string, options: {
        all: true;
        verbatim: true;
    }) => Promise<LookupAddress[]>;
    request?: typeof httpsRequest;
}
/** Pin validated DNS answers at socket lookup. Never follow provider-result redirects.
 * Explicitly configured local ComfyUI uses its separate bounded transport.
 */
export declare function downloadPublicImage(value: string, options: DownloadOptions, deps?: DownloadDeps): Promise<{
    data: Uint8Array;
    contentType: string | undefined;
}>;
export {};
