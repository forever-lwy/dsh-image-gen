/** User-facing configuration for supported image providers. */
import z from '@deepseek-ai/schemastery';
import type { CompatEditFormat } from './openai-compatible.js';
import { ARK_BACKGROUND_MODES, ARK_OUTPUT_FORMATS, DEFAULT_CLOUD_TIMEOUT_MS, DEFAULT_DASHSCOPE_ENDPOINT, DEFAULT_DASHSCOPE_MODEL, DEFAULT_COMFYUI_BASE_URL, DEFAULT_COMFYUI_TIMEOUT_MS, DEFAULT_COMFYUI_WORKFLOW_LABEL, DEFAULT_GOOGLE_ENDPOINT, DEFAULT_GOOGLE_MODEL, DEFAULT_OPENAI_BASE_URL, DEFAULT_OPENAI_MODEL, DEFAULT_SEEDREAM_BASE_URL, DEFAULT_SEEDREAM_MODEL, DEFAULT_XAI_BASE_URL, DEFAULT_XAI_MODEL, DEFAULT_ZHIPU_BASE_URL, DEFAULT_ZHIPU_MODEL, DASHSCOPE_API_KEY_ENV, GOOGLE_API_KEY_ENV, IMAGE_PROVIDERS, OPENAI_API_KEY_ENV, OPENAI_COMPAT_API_KEY_ENV, SEEDREAM_API_KEY_ENV, XAI_API_KEY_ENV, ZHIPU_API_KEY_ENV, activeComfyUIWorkflow, resolveComfyUIWorkflows, type OpenAICompatChannel, type ArkBackgroundMode, type ArkOutputFormat, type ArkOutputOptions, type ComfyUIWorkflowEntry, type ImageProvider } from './shared.js';
export { ARK_BACKGROUND_MODES, ARK_OUTPUT_FORMATS, DEFAULT_CLOUD_TIMEOUT_MS, DEFAULT_DASHSCOPE_ENDPOINT, DEFAULT_DASHSCOPE_MODEL, DEFAULT_COMFYUI_BASE_URL, DEFAULT_COMFYUI_TIMEOUT_MS, DEFAULT_COMFYUI_WORKFLOW_LABEL, DEFAULT_GOOGLE_ENDPOINT, DEFAULT_GOOGLE_MODEL, DEFAULT_OPENAI_BASE_URL, DEFAULT_OPENAI_MODEL, DEFAULT_SEEDREAM_BASE_URL, DEFAULT_SEEDREAM_MODEL, DEFAULT_XAI_BASE_URL, DEFAULT_XAI_MODEL, DEFAULT_ZHIPU_BASE_URL, DEFAULT_ZHIPU_MODEL, DASHSCOPE_API_KEY_ENV, GOOGLE_API_KEY_ENV, IMAGE_PROVIDERS, OPENAI_API_KEY_ENV, OPENAI_COMPAT_API_KEY_ENV, SEEDREAM_API_KEY_ENV, XAI_API_KEY_ENV, ZHIPU_API_KEY_ENV, activeComfyUIWorkflow, resolveComfyUIWorkflows, type ArkBackgroundMode, type ArkOutputFormat, type ArkOutputOptions, type ComfyUIWorkflowEntry, type ImageProvider, };
/** Default workspace subfolder that receives generated image files. */
export declare const DEFAULT_WORKSPACE_FOLDER = "dsh-image-gen";
/** Google tool-level controls. Aligned with gemini-3.1-flash-image's common set. */
export declare const ASPECT_RATIOS: readonly ["1:1", "3:2", "2:3", "4:3", "3:4", "4:5", "5:4", "16:9", "9:16", "21:9"];
export declare const IMAGE_SIZES: readonly ["1K", "2K", "4K"];
export type AspectRatio = typeof ASPECT_RATIOS[number];
export type ImageSize = typeof IMAGE_SIZES[number];
/** Bundle configuration from the profile patch and the Web settings page. */
export interface Config {
    provider?: ImageProvider;
    cloudTimeoutMs?: number;
    googleModel?: string;
    googleEndpoint?: string;
    /** Use Gemini generateContent instead of Interactions; opt-in for native-only gateways. */
    googleNative?: boolean;
    openaiBaseURL?: string;
    openaiModel?: string;
    /** Official model size table: ratio -> resolution tier -> pixels. Empty uses model presets. */
    openaiSizes?: Record<string, Record<string, string>>;
    /** OpenAI-compatible relay settings; independent from the official OpenAI row. */
    openaiCompatLabel?: string;
    openaiCompatBaseURL?: string;
    openaiCompatModel?: string;
    /** Models offered by the workbench for the legacy default channel. */
    openaiCompatModels?: string[];
    /** Additional named relay channels; the flat fields above remain the default channel. */
    openaiCompatChannels?: OpenAICompatChannel[];
    openaiCompatActiveChannel?: string;
    /** Editing model; empty reuses the generation model. */
    openaiCompatEditModel?: string;
    /** Default quality; empty preserves the upstream default by omitting the field. */
    openaiCompatQuality?: string;
    /** Quality values accepted by this relay; independent of resolution tiers. */
    openaiCompatQualityOptions?: string[];
    /** Generation-only JSON fields, merged last (e.g. watermark: false). */
    openaiCompatExtraBody?: Record<string, unknown>;
    /** JSON edit sizing stays auto unless the relay supports selected dimensions. */
    openaiCompatEditSizeMode?: 'auto' | 'selected';
    /**
     * Request shape the relay's images/edits endpoint expects (#41). Most
      * relays take OpenAI's multipart form; some (e.g. SenseNova) accept the
      * generations endpoint but run edits on their own JSON contract with
      * `images: [{ image_url }]` objects; some take a multipart form whose
      * `reference_images` field is a JSON array of base64 strings. Defaults to
      * `multipart`.
      */
    openaiCompatEditFormat?: 'multipart' | 'jsonImageUrlArray' | 'formReferenceImages' | 'siliconflowJson';
    /**
     * Extra JSON fields merged into the JSON edit body last (can override the
     * built-in defaults), e.g. SenseNova's `watermark`/`prompt_extend`.
     * Used by JSON edit formats, including automatically recognized official contracts.
     */
    openaiCompatEditExtra?: Record<string, unknown>;
    /**
     * Size table the OpenAI-compatible relay accepts, keyed
     * `ratio → resolution tier → exact size string`, e.g.
     * `{'16:9': {'1K': '1536x864', '2K': '2048x1152', '4K': '3840x2160'}}`.
     * Empty keeps the built-in OpenAI trio (`1024x1024`, `1536x1024`,
     * `1024x1536`). The workbench derives its ratio picker from the outer keys
     * and its resolution picker from the tier keys, so relays or models with
     * richer size tables expose every supported combination instead of the
     * fixed three. Generation sends the exact configured string.
     */
    openaiCompatSizes?: Record<string, Record<string, string>>;
    seedreamBaseURL?: string;
    seedreamModel?: string;
    /**
     * Ark `output_format`. Ark defaults to `jpeg`, which is lossy and cannot
     * carry an alpha channel; `png` is lossless, so it survives later editing
     * (e.g. background removal) without JPEG ringing around the subject.
     */
    seedreamOutputFormat?: ArkOutputFormat;
    /**
     * Ark `watermark`. Ark defaults to `true`, which bakes an "AI generated"
     * mark into the bottom-right corner.
     */
    seedreamWatermark?: boolean;
    /**
     * Ark `background`. Only the edit path can honour `transparent`, and only
     * when every reference image already carries an alpha channel.
     */
    seedreamBackground?: ArkBackgroundMode;
    dashscopeEndpoint?: string;
    dashscopeModel?: string;
    xaiBaseURL?: string;
    xaiModel?: string;
    zhipuBaseURL?: string;
    zhipuModel?: string;
    comfyuiBaseURL?: string;
    /** Named ComfyUI workflows managed by the Web settings page. */
    comfyuiWorkflows?: ComfyUIWorkflowEntry[];
    /** Name of the workflow ComfyUI calls use by default. */
    comfyuiActiveWorkflow?: string;
    /** Legacy single-workflow storage; synced to the active entry for downgrades. */
    comfyuiWorkflowJson?: string;
    /** Original imported file name of the legacy single workflow. */
    comfyuiWorkflowName?: string;
    comfyuiTimeoutMs?: number;
    /** Also write every generated image as a file under the session workspace. */
    saveToWorkspace?: boolean;
    /** Workspace subfolder for generated images; empty means the workspace root. */
    workspaceFolder?: string;
    /** Show the provider switcher beside the chat input. */
    showProviderPill?: boolean;
    /** Prune the host request-image cache once at startup and then daily. */
    requestCachePrune?: boolean;
    /** Retain request-image variants for this many days. */
    requestCacheTtlDays?: number;
    /** Byte budget for the request-image cache; 0 disables the cap. */
    requestCacheMaxBytes?: number;
    /** Override the request-image cache root (empty keeps the DSH_HOME default). */
    requestCacheDir?: string;
    /** Keep the pre-normalization bytes when the attachment layer changes an import or normalizes a generated GIF to a still. */
    vaultEnabled?: boolean;
    /** Override the raw-image vault root (empty keeps the DSH_HOME default). */
    vaultDir?: string;
}
/**
 * Cordis configuration schema. Volatile marking happens per field (see
 * `volatile`); the `z<Config>` annotation keeps the plain output type for the
 * rest of the codebase because the wrapping is unwrapped at the entry.
 */
export declare const Config: z<Config>;
/** Resolve exactly one provider profile for a tool call. */
export declare function resolveProvider(config: Config): {
    provider: 'google';
    apiKeyEnv: string;
    model: string;
    endpoint: string;
    native: boolean;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
} | {
    provider: 'openai';
    apiKeyEnv: string;
    model: string;
    baseURL: string;
    imageSize: string;
} | {
    provider: 'openai-compat';
    apiKeyEnv: string;
    model: string;
    baseURL: string;
    imageSize: string;
    editFormat: CompatEditFormat;
    editExtra: Record<string, unknown>;
} | {
    provider: 'seedream';
    apiKeyEnv: string;
    model: string;
    baseURL: string;
    imageSize: string;
    arkOptions: ArkOutputOptions;
} | {
    provider: 'dashscope';
    apiKeyEnv: string;
    model: string;
    endpoint: string;
    imageSize: string;
} | {
    provider: 'xai';
    apiKeyEnv: string;
    model: string;
    baseURL: string;
    imageSize: string;
} | {
    provider: 'zhipu';
    apiKeyEnv: string;
    model: string;
    baseURL: string;
    imageSize: string;
} | {
    provider: 'comfyui';
    baseURL: string;
    workflows: ComfyUIWorkflowEntry[];
    workflow?: ComfyUIWorkflowEntry;
    timeoutMs: number;
} | {
    provider: 'chatgpt-sub';
    model: string;
} | {
    provider: 'grok-sub';
    model: string;
} | {
    provider: 'google-sub';
    model: string;
};
/** Project one named relay channel onto the legacy flat fields used by all provider adapters. */
export declare function withOpenAICompatChannel(config: Config, channelId?: string): Config;
/**
 * Apply a per-call provider and/or model override on top of the saved config.
 * `model` is ignored for ComfyUI, whose per-call equivalent is `workflow`.
 */
export declare function withProviderOverrides(config: Config, provider?: ImageProvider, model?: string, mode?: 'generate' | 'edit'): Config;
/**
 * One-time migration: when the legacy single OpenAI slot points at a relay
 * (non-official base URL) and the compat row is empty, move the relay config
 * to the compat row so both can coexist. Returns the input untouched when
 * nothing needs moving.
 */
export declare function migrateOpenAICompatConfig(config: Config): Config;
/** The workflow a ComfyUI call runs: the requested name when given, else the active one. */
export declare function selectComfyUIWorkflow(active: {
    workflows: ComfyUIWorkflowEntry[];
    workflow?: ComfyUIWorkflowEntry;
}, requested?: string): ComfyUIWorkflowEntry;
