/** OpenAI Images API and compatible response adapter. */
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment';
import { type ArkOutputOptions } from './shared.js';
export interface GeneratedCompatibleImage {
    data: Uint8Array;
    mediaType: ImageMediaType;
}
export interface CompatibleReferenceImage {
    data: Uint8Array;
    mediaType: ImageMediaType;
}
export declare function generateOpenAICompatibleImage(input: {
    provider: 'openai' | 'openai-compat' | 'seedream' | 'xai' | 'zhipu';
    apiKey: string;
    baseURL: string;
    model: string;
    prompt: string;
    /**
     * Pixel size or tier string. Optional because not every channel accepts
     * `size` at all — xAI takes aspect_ratio+resolution via `extraBody` and
     * rejects nothing but silently ignores unknown fields, so we simply omit
     * the parameter for it.
     */
    size?: string;
    /** Vendor quality tier (e.g. OpenAI low/medium/high); omitted when unset. */
    quality?: string;
    /** Extra JSON fields merged last into the generations body (xAI aspect_ratio/resolution). */
    extraBody?: Readonly<Record<string, unknown>>;
    maxBytes: number;
    signal: AbortSignal;
    /** Ark-only output controls; ignored by every other provider. */
    arkOptions?: ArkOutputOptions;
}): Promise<GeneratedCompatibleImage>;
/** How the edits endpoint expects its request body (#41). */
export type CompatEditFormat = 'multipart' | 'jsonImageUrlArray' | 'formReferenceImages' | 'siliconflowJson' | 'xaiJson' | 'qwenJson';
export declare function editOpenAICompatibleImage(input: {
    apiKey: string;
    baseURL: string;
    model: string;
    prompt: string;
    sourceImages: CompatibleReferenceImage[];
    size?: string;
    maxBytes: number;
    signal: AbortSignal;
    /**
     * Request shape for the edits call. Most OpenAI-compatible channels take
     * the standard multipart form; some (e.g. SenseNova) accept OpenAI's
     * generations endpoint but run edits on their own JSON contract with
     * `images: [{ image_url }]` objects. Defaults to the standard multipart.
     */
    editFormat?: CompatEditFormat;
    editSizeMode?: 'auto' | 'selected';
    /**
     * Channel-specific extra fields merged into the JSON edit body last (so
     * they can override the defaults above), e.g. SenseNova's
     * `watermark`/`prompt_extend`. Ignored in multipart mode.
     */
    editExtra?: Readonly<Record<string, unknown>>;
    /** Vendor quality tier sent with the edit request when set. */
    quality?: string;
    /**
     * Multipart edit response shape. `auto` asks for inline b64_json first and
     * retries once without the field when a relay rejects it (400/422); `url`
     * keeps the relay default; `b64_json` never retries.
     */
    editResponseFormat?: 'auto' | 'b64_json' | 'url';
    /** Called once when the relay rejects response_format and the request is retried without it. */
    onResponseFormatRetry?: (status: number) => void;
    /**
     * Extra fields for the edit request (multipart: one form field per entry;
     * JSON shapes: merged after `editExtra`), e.g. xAI's
     * aspect_ratio/resolution pair.
     */
    extraBody?: Readonly<Record<string, unknown>>;
}): Promise<GeneratedCompatibleImage>;
