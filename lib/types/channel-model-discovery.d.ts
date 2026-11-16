/**
 * Live model discovery for the image workbench.
 *
 * The workbench offered whatever model ids the configuration named: one per
 * official cloud row, and a list per OpenAI-compatible relay channel. That is a
 * guess. A relay's catalog changes without the patch file changing, and an
 * official row names only its default, so a model the vendor serves and the
 * operator never typed is unreachable - invisible in the picker, and rejected by
 * assertAllowed if it were somehow sent.
 *
 * This module asks the endpoints what they actually serve. It is the workbench
 * sibling of the settings card's pull button (`action: 'models'` in
 * test-route.ts) and reuses that code path rather than growing a second opinion
 * about what an image model is called.
 *
 * The load-bearing rule is that discovery NEVER blocks a render:
 *
 *   * {@link withCachedChannelModels} is synchronous and only reads the cache.
 *     It is what `describeStudio` calls, so a settings page or provider pill
 *     paints at the same speed as before this feature existed.
 *   * {@link primeChannelModels} and {@link discoverOfficialModels} are the only
 *     network paths. They fill the cache and are started fire-and-forget; the
 *     next render sees the result.
 *
 * A cold cache therefore renders the configured ids alone for one paint and then
 * widens. Ordering keeps intent leading: configured ids first, in their order,
 * discovered ids appended.
 *
 * @module dsh-image-gen/channel-model-discovery
 */
import type { Context } from '@deepseek-ai/cordis';
import { type Config } from './config.js';
import { type CloudImageProvider, type OpenAICompatChannel, type StudioProviderProfile } from './shared.js';
/** How long one endpoint's catalog answers from cache, success or failure. */
export declare const CHANNEL_MODEL_DISCOVERY_TTL_MS: number;
/** One probe gets this long before the background refresh gives up. */
export declare const CHANNEL_MODEL_DISCOVERY_TIMEOUT_MS = 4000;
/** Drop cached catalogs; with a base URL, only that endpoint's. Used by tests. */
export declare function forgetDiscoveredChannelModels(baseURL?: string): void;
/**
 * Ask the relay behind one channel which image models it serves, and cache the
 * answer.
 *
 * Failures are cached for the same TTL as successes: telling a relay it is
 * offline on every render is worse than showing the configured ids alone. A
 * blank base URL - the untouched legacy row - is neither probed nor cached, so
 * filling the address in later takes effect on the next render.
 */
export declare function primeChannelModels(ctx: Context, config: Config, channel: OpenAICompatChannel, now?: number): Promise<readonly string[]>;
/**
 * Probe one official cloud row for the image models the vendor serves, and cache
 * the answer.
 *
 * Every row answers on its own endpoint and payload shape: Google paginates
 * `list models` 1000 at a time, DashScope tags capabilities `IG`, Ark names the
 * Seedream/SeedEdit families, the rest share OpenAI `/models`. So this
 * dispatches to the same `fetch*ImageModels` the settings card's pull button
 * uses - a second parser here would eventually disagree with the card about a
 * model id, and the picker would offer something generation rejects.
 *
 * Returns [] for every failure and for any provider without a catalog: ComfyUI
 * lists workflows and the subscription rows list nothing.
 */
export declare function discoverOfficialModels(ctx: Context, config: Config, provider: CloudImageProvider, signal?: AbortSignal | undefined): Promise<string[]>;
/**
 * Synchronously read the cached relay catalogs, and name the channels whose
 * catalog is cold or stale.
 *
 * This is the render path: no await, no abort signal, no network. An untouched
 * cache returns `config` itself, so the case allocates nothing and every channel
 * shows exactly the configured ids until a prime lands. Official rows are widened
 * separately by {@link withCachedOfficialModels}, one row at a time.
 */
export declare function withCachedChannelModels(config: Config, now?: number): {
    config: Config;
    pending: OpenAICompatChannel[];
};
/**
 * Widen one official row's `modelOptions` with ids already discovered for it.
 *
 * Kept separate from {@link withCachedChannelModels} because the official rows are
 * built one `studioProfile` at a time: the caller reads the cache once per row
 * while assembling that row's profile, instead of re-mapping the whole config.
 */
export declare function withCachedOfficialModels(provider: CloudImageProvider, config: Config, modelOptions: readonly string[], apiKey: string | undefined, now?: number): {
    modelOptions: string[];
    stale: boolean;
};
/**
 * Synchronously widen one assembled profile with the catalog already known for it.
 *
 * This is both the render path and the validation path - no await, no abort signal, no
 * network - so a picker and its generate request agree by construction. `refresh`
 * reports that the caller should start a probe: true when the row was never asked,
 * and true again once its entry aged out, because {@link agedModels} still merges the
 * aged candidates. Serving them while the refresh runs is what keeps a model from
 * vanishing out of the picker mid-session.
 */
export declare function widenProfileModels(profile: StudioProviderProfile, config: Config, now?: number): {
    profile: StudioProviderProfile;
    refresh: boolean;
};
/** Start the probe a reply asked for; a rendering caller cannot act on a rejection. */
export declare function refreshProfileModels(ctx: Context, config: Config, profile: StudioProviderProfile): void;
