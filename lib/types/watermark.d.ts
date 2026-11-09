/** Visible-watermark contracts, resolved separately for generation and editing. */
import type { Config } from './config.js';
import type { CompatEditFormat } from './openai-compatible.js';
import type { StudioOption, StudioProvider, StudioWatermark, StudioWatermarkCapability } from './shared.js';
type Mode = 'generate' | 'edit';
type WatermarkField = 'watermark' | 'watermark_enabled' | 'parameters.watermark';
export declare const WATERMARK_OPTIONS: StudioOption[];
/** Known official edit contracts take precedence over relay-specific format settings. */
export declare function compatEditFormat(config: Config): CompatEditFormat;
export declare function compatWatermarkField(config: Config, mode?: Mode): WatermarkField | undefined;
export declare function compatWatermarkOptions(config: Config, mode?: Mode): StudioOption[] | undefined;
/** Preserve all advanced fields; only an explicit workbench choice overrides its own watermark. */
export declare function compatGenerationExtraBody(config: Config, selected?: StudioWatermark): Record<string, unknown> | undefined;
export declare function compatEditExtraBody(config: Config, selected?: StudioWatermark): Record<string, unknown> | undefined;
export declare function selectedWatermark(selected: StudioWatermark | undefined, channelDefault?: boolean): boolean | undefined;
export declare function watermarkProfile(config: Config, provider: StudioProvider, model: string): {
    watermarkCapabilities: Record<Mode, StudioWatermarkCapability>;
    watermarkOptions?: StudioOption[];
};
export {};
