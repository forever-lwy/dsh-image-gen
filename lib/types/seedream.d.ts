/** Volcengine Ark Seedream image-editing adapter. */
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment';
import type { GeneratedCompatibleImage } from './openai-compatible.js';
import { type ArkOutputOptions } from './shared.js';
/** Edit one image through Ark ImageGenerations using a data-URL reference. */
export declare function editSeedreamImage(input: {
    apiKey: string;
    baseURL: string;
    model: string;
    prompt: string;
    sourceImages: Array<{
        data: Uint8Array;
        mediaType: ImageMediaType;
    }>;
    size?: string;
    maxBytes: number;
    strictImageDownloads?: boolean;
    signal: AbortSignal;
    /**
     * Ark output controls. Before Seedream 5.5 the edit path is the only one Ark
     * lets request a transparent background, and it requires every reference
     * image to carry an alpha channel — see `arkOutputBody`.
     */
    arkOptions?: ArkOutputOptions;
}): Promise<GeneratedCompatibleImage>;
export declare function imageEndpoint(baseURL: string): string;
export declare function toDataUrl(image: {
    data: Uint8Array;
    mediaType: ImageMediaType;
}): string;
export declare function readBoundedText(response: Response, maxBytes: number): Promise<string>;
