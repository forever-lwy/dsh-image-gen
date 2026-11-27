import { type ResolvedReferenceImage } from './reference-image.js';
interface LayerInput {
    source: ResolvedReferenceImage;
    model: string;
    apiKey: string;
    baseURL: string;
    prompt?: string | undefined;
    size?: string | undefined;
    maxImages?: number | undefined;
    /** Ark adds its "AI generated" mark unless told otherwise, so the user's setting is always sent. */
    watermark: boolean;
    /** Bounds the upstream decomposition call only; each layer download keeps its own timeout. */
    requestTimeoutMs: number;
    workspaceRoot: string;
    folder?: string | undefined;
    maxBytes: number;
    signal: AbortSignal;
}
export interface LayerResult {
    directory: string;
    manifest: string;
    imageCount: number;
    /** Layers Ark billed but that could not be saved; listed in the manifest with their URLs. */
    missingCount: number;
}
/**
 * Save every layer that downloads and record the rest in the manifest. The set is
 * staged and published with one rename, so a cancelled run leaves nothing behind.
 */
export declare function decomposeSeedreamLayers(input: LayerInput): Promise<LayerResult>;
export {};
