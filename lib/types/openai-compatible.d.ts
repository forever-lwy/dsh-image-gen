import type { ImageMediaType } from '@deepseek-ai/dsh-attachment';
import { type ArkOutputOptions } from './shared.js';
/**
 * What an images request can return: the raster types the attachment layer
 * stores, plus the SVG document `output_format: 'svg'` produces.
 */
export type GeneratedMediaType = ImageMediaType | 'image/svg+xml';
export interface GeneratedCompatibleImage {
    data: Uint8Array;
    mediaType: GeneratedMediaType;
}
/**
 * The workbench stores results through the raster attachment API only, so a
 * studio call never asks for SVG; guard the widened result type anyway.
 */
export declare function rasterOnly<T extends {
    data: Uint8Array;
    mediaType: GeneratedMediaType;
}>(image: T): {
    data: Uint8Array;
    mediaType: ImageMediaType;
};
/**
 * True when the bytes are an SVG document rather than a raster image. The
 * relay returns SVG as `b64_json` of the markup (or a URL to a .svg file), so
 * the payload is UTF-8 text whose root element, after any XML declaration,
 * processing instructions, comments, and DOCTYPE, is `<svg>`; every raster
 * format starts with a binary magic number instead. An HTML page that merely
 * contains an inline `<svg>` is not an SVG document. Only the first 64 KB are
 * decoded.
 */
export declare function isSvgDocument(data: Uint8Array): boolean;
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
    strictImageDownloads?: boolean;
    maxBytes: number;
    signal: AbortSignal;
    /** Ark-only output controls; ignored by every other provider. */
    arkOptions?: ArkOutputOptions;
    /**
     * ModelScope-style async task mode (#140): the generations endpoint answers
     * `{"task_id": ...}` and the image URLs only appear after polling
     * `/v1/tasks/{task_id}`. Opt-in per channel through the `modelscopeAsync`
     * edit format, so every other relay keeps today's request shape untouched.
     */
    asyncImages?: boolean;
}): Promise<GeneratedCompatibleImage>;
/**
 * How the edits endpoint expects its request body (#41). `modelscopeAsync`
 * additionally switches generation itself to ModelScope's async task flow
 * (#140): submit → poll `/v1/tasks/{id}` → download `output_images`.
 */
export type CompatEditFormat = 'multipart' | 'jsonImageUrlArray' | 'formReferenceImages' | 'siliconflowJson' | 'xaiJson' | 'qwenJson' | 'modelscopeAsync';
export declare function editOpenAICompatibleImage(input: {
    apiKey: string;
    baseURL: string;
    model: string;
    prompt: string;
    sourceImages: CompatibleReferenceImage[];
    size?: string;
    strictImageDownloads?: boolean;
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
/**
 * Models that fill every field keep retrying a GIF or SVG the upstream already
 * refused (#160); tell them plainly how to get the still image instead.
 */
export declare function outputFormatRejectionHint(status: number, text: string): string;
/**
 * Decode a response body a relay sent compressed while the runtime did not
 * decode it itself.
 *
 * Some OpenAI-compatible relays answer with `content-encoding: zstd` (or gzip /
 * br / deflate) and the fetch implementation in use does not always honour it.
 * The compressed bytes then reach `JSON.parse` and surface as
 * `openai-compat image request returned invalid JSON` — a message that points
 * at the prompt or the site rather than at the transport, so the failure is
 * routinely misdiagnosed.
 *
 * Two details matter beyond the single-coding case:
 *
 * - A header may list several codings (`gzip, zstd`). HTTP applies them in the
 *   order listed, so decoding runs in reverse — decoding only the last one
 *   would hand gzip bytes to the parser and still report invalid JSON.
 * - The zstd magic (`28 b5 2f fd`) is also checked on its own, because a few
 *   relays compress without declaring the header, and because a header that
 *   disagrees with the body (the runtime already decoded it) must not stop a
 *   body that is plainly zstd from being decoded.
 *
 * A decompression error means the declaration disagrees with the bytes
 * (typically the runtime already decoded them, or the body was never
 * compressed), so the input is returned unchanged and the caller's own parser
 * reports the real problem. Returning the bytes untouched is deliberate:
 * swallowing the original error here would hide the actual cause.
 *
 * `maxOutputLength` is passed to every decompression call so a small body that
 * expands to hundreds of MiB is rejected *before* the buffer is allocated, and
 * `maxBytes` is checked again afterwards. An output-limit failure is a real
 * error and is propagated; it must not be mistaken for an encoding mismatch.
 *
 * Exported so the tests can drive each branch directly; at runtime it is only
 * reached through `readBoundedBytes`.
 */
export declare function decodeCompressedBody(bytes: Uint8Array, encoding: string | null, maxBytes?: number): Uint8Array;
