/** Independent size and quality controls for official and compatible image APIs. */
import type { Config } from './config.js';
import { type StudioOption } from './shared.js';
export { compatGenerationExtraBody, compatWatermarkField, compatWatermarkOptions } from './watermark.js';
export declare const PROVIDER_DEFAULT_QUALITY = "__default__";
export declare const DEFAULT_COMPAT_QUALITIES: string[];
export declare function officialSizeTable(config: Config, model: string): Record<string, Record<string, string>>;
/** Check the official model contract before spending a request. Relays own their size contract. */
export declare function validateOfficialSize(model: string, size: string): void;
interface GifRequestOptions {
    outputFormat?: string | undefined;
    frameCount?: number | undefined;
    frameDurationMs?: number | undefined;
}
/** Output formats the OpenAI images contract can return besides a still raster image. */
export type ImageOutputFormat = 'gif' | 'svg';
/** A type alias (not an interface) so it satisfies the adapter's Record<string, unknown> extraBody. */
type OutputRequestFields = {
    output_format?: ImageOutputFormat;
    frame_count?: number;
    frame_duration_ms?: number;
};
type GifRequestFields = {
    output_format?: 'gif';
    frame_count?: number;
    frame_duration_ms?: number;
};
/**
 * Fold one call's output-format parameters into OpenAI images request fields.
 *
 * `gif` keeps the frame controls; `svg` is a single vector document, so the
 * frame controls are rejected rather than silently dropped. A call that only
 * sets frame fields without `output_format` stays an error.
 */
export declare function outputRequestFields(options: GifRequestOptions): OutputRequestFields;
/** Fold one call's GIF parameters into OpenAI images request fields; anything but a GIF yields {}. */
export declare function gifRequestFields(options: GifRequestOptions): GifRequestFields;
/**
 * A GIF `size` is the single-frame size: auto or multiples of 16 with the
 * longest edge within the sheet limit. The still-image pixel floor of
 * validateOfficialSize does not apply; the provider judges the frame budget.
 */
export declare function validateGifFrameSize(size: string): void;
export declare function officialQualityOptions(model: string): StudioOption[];
export declare function compatQualityOptions(config: Config): StudioOption[];
export declare function compatRequestQuality(config: Config, selected?: string): string | undefined;
