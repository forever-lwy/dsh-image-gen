import type { Context } from '@deepseek-ai/cordis';
import { type Config } from './config.js';
import { type SubscriptionManager } from './subscription.js';
import { type CloudImageProvider, type StudioConfigResponse, type StudioGenerateRequest, type StudioGenerateResponse, type StudioProviderProfile } from './shared.js';
/**
 * Normalize the configured relay table: drop empty strings and invalid tier
 * ranks so one typo cannot take the whole workbench down.
 * @param config - plugin configuration carrying `openaiCompatSizes`.
 */
export declare function openAICompatTable(config: Config): Array<{
    ratio: string;
    tiers: Array<{
        tier: string;
        size: string;
        rank: number;
    }>;
}>;
/**
 * Resolve the wire `size` for one workbench request against the relay table.
 * Falls down to the largest tier not exceeding the requested one (never up,
 * so an unsupported combination cannot silently spend more); unparseable
 * quality labels (legacy `standard`) map to the ratio's lowest tier, and a
 * ratio with nothing at or below the request is rejected loudly.
 * @param config - plugin configuration carrying `openaiCompatSizes`.
 * @param ratio - selected ratio option (`W:H`).
 * @param quality - selected resolution tier.
 */
export declare function openAIRequestSize(config: Config, ratio: string, quality: string): string;
/** Return only browser-safe capability data. */
export declare function describeStudio(ctx: Context, config: Config, subscriptions?: SubscriptionManager | undefined): Promise<StudioConfigResponse>;
/** A generation on an OpenAI-compatible channel whose extras select GIF is a GIF request even when it carries no `output`. */
export declare function channelSelectsGif(config: Config, input: Pick<StudioGenerateRequest, 'provider' | 'mode' | 'channel'>): boolean;
/** Execute one validated browser workbench request using the existing provider adapters. */
export declare function generateFromStudio(ctx: Context, config: Config, input: StudioGenerateRequest, signal: AbortSignal, fallbackWorkspaceRoot?: string | undefined, subscriptions?: SubscriptionManager | undefined): Promise<StudioGenerateResponse>;
export declare function runPool<T>(tasks: Array<() => Promise<T>>, concurrency?: number): Promise<PromiseSettledResult<T>[]>;
export declare function studioProfile(config: Config, provider: CloudImageProvider, configured: boolean, channelId?: string): StudioProviderProfile;
/**
 * Regenerating an edit result is a generation, but the card remembers the
 * channel's separate editing model that drew it, which the generation list
 * may not offer. That model is swapped for the channel's generation model;
 * any other unknown model still fails as a stale workbench below.
 */
export declare function withGenerationModel<T extends StudioGenerateRequest>(profile: StudioProviderProfile, input: T): T;
