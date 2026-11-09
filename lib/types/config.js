/** User-facing configuration for supported image providers. */
import z from '@deepseek-ai/schemastery';
import { compatEditFormat } from './watermark.js';
import { ARK_BACKGROUND_MODES, ARK_OUTPUT_FORMATS, DEFAULT_CLOUD_TIMEOUT_MS, DEFAULT_DASHSCOPE_ENDPOINT, DEFAULT_DASHSCOPE_MODEL, DEFAULT_COMFYUI_BASE_URL, DEFAULT_COMFYUI_TIMEOUT_MS, DEFAULT_COMFYUI_WORKFLOW_LABEL, DEFAULT_GOOGLE_ENDPOINT, DEFAULT_GOOGLE_MODEL, DEFAULT_OPENAI_BASE_URL, DEFAULT_OPENAI_MODEL, DEFAULT_SEEDREAM_BASE_URL, DEFAULT_SEEDREAM_MODEL, currentSeedreamModel, DEFAULT_SUBSCRIPTION_MODELS, DEFAULT_XAI_BASE_URL, DEFAULT_XAI_MODEL, DEFAULT_ZHIPU_BASE_URL, DEFAULT_ZHIPU_MODEL, DASHSCOPE_API_KEY_ENV, GOOGLE_API_KEY_ENV, IMAGE_PROVIDERS, OPENAI_API_KEY_ENV, OPENAI_COMPAT_API_KEY_ENV, SEEDREAM_API_KEY_ENV, XAI_API_KEY_ENV, ZHIPU_API_KEY_ENV, activeComfyUIWorkflow, resolveComfyUIWorkflows, resolveOpenAICompatChannel, } from './shared.js';
export { ARK_BACKGROUND_MODES, ARK_OUTPUT_FORMATS, DEFAULT_CLOUD_TIMEOUT_MS, DEFAULT_DASHSCOPE_ENDPOINT, DEFAULT_DASHSCOPE_MODEL, DEFAULT_COMFYUI_BASE_URL, DEFAULT_COMFYUI_TIMEOUT_MS, DEFAULT_COMFYUI_WORKFLOW_LABEL, DEFAULT_GOOGLE_ENDPOINT, DEFAULT_GOOGLE_MODEL, DEFAULT_OPENAI_BASE_URL, DEFAULT_OPENAI_MODEL, DEFAULT_SEEDREAM_BASE_URL, DEFAULT_SEEDREAM_MODEL, DEFAULT_XAI_BASE_URL, DEFAULT_XAI_MODEL, DEFAULT_ZHIPU_BASE_URL, DEFAULT_ZHIPU_MODEL, DASHSCOPE_API_KEY_ENV, GOOGLE_API_KEY_ENV, IMAGE_PROVIDERS, OPENAI_API_KEY_ENV, OPENAI_COMPAT_API_KEY_ENV, SEEDREAM_API_KEY_ENV, XAI_API_KEY_ENV, ZHIPU_API_KEY_ENV, activeComfyUIWorkflow, resolveComfyUIWorkflows, };
/** Default workspace subfolder that receives generated image files. */
export const DEFAULT_WORKSPACE_FOLDER = 'dsh-image-gen';
/** Google tool-level controls. Aligned with gemini-3.1-flash-image's common set. */
export const ASPECT_RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '4:5', '5:4', '16:9', '9:16', '21:9'];
export const IMAGE_SIZES = ['1K', '2K', '4K'];
/**
 * Mark a schema field live for DSH 0.1.7+: the host serves a plugin's settings
 * form only for `.volatile()` fields and hands `apply` a `Volatile` box per
 * field (unwrapped in `src/index.ts`). Hosts ≤0.1.6 ship a schemastery without
 * the method, so marking is conditional — an unmarked schema stays plain there
 * and the old settings relay keeps working.
 */
function volatile(schema) {
    const mark = schema.volatile;
    return typeof mark === 'function' ? mark.call(schema) : schema;
}
/**
 * Cordis configuration schema. Volatile marking happens per field (see
 * `volatile`); the `z<Config>` annotation keeps the plain output type for the
 * rest of the codebase because the wrapping is unwrapped at the entry.
 */
export const Config = z.object({
    provider: volatile(z.union(IMAGE_PROVIDERS).default('google')),
    cloudTimeoutMs: volatile(z.number().min(5_000).max(3_600_000).default(DEFAULT_CLOUD_TIMEOUT_MS)),
    googleModel: volatile(z.string().default(DEFAULT_GOOGLE_MODEL)),
    googleEndpoint: volatile(z.string().default(DEFAULT_GOOGLE_ENDPOINT)),
    googleNative: volatile(z.boolean().default(false)),
    openaiBaseURL: volatile(z.string().default(DEFAULT_OPENAI_BASE_URL)),
    openaiModel: volatile(z.string().default(DEFAULT_OPENAI_MODEL)),
    openaiSizes: volatile(z.dict(z.dict(z.string())).default({})),
    openaiCompatLabel: volatile(z.string().default('')),
    openaiCompatBaseURL: volatile(z.string().default('')),
    openaiCompatModel: volatile(z.string().default('')),
    openaiCompatModels: volatile(z.array(z.string()).default([])),
    openaiCompatChannels: volatile(z.array(z.object({
        id: z.string(),
        label: z.string().default(''),
        keyRef: z.string(),
        baseURL: z.string().default(''),
        model: z.string().default(''),
        models: z.array(z.string()).default([]),
        editModel: z.string().default(''),
        quality: z.string().default(''),
        qualityOptions: z.array(z.string()).default([]),
        extraBody: z.dict(z.any()).default({}),
        editSizeMode: z.union(['auto', 'selected']).default('auto'),
        editFormat: z.union([z.const('multipart'), z.const('jsonImageUrlArray'), z.const('formReferenceImages'), z.const('siliconflowJson')]).default('multipart'),
        editExtra: z.dict(z.any()).default({}),
        sizes: z.dict(z.dict(z.string())).default({}),
    })).default([])),
    openaiCompatActiveChannel: volatile(z.string().default('')),
    openaiCompatEditModel: volatile(z.string().default('')),
    openaiCompatQuality: volatile(z.string().default('')),
    openaiCompatQualityOptions: volatile(z.array(z.string()).default(['auto', 'low', 'medium', 'high'])),
    openaiCompatExtraBody: volatile(z.dict(z.any()).default({})),
    openaiCompatEditSizeMode: volatile(z.union(['auto', 'selected']).default('auto')),
    openaiCompatEditFormat: volatile(z.union([z.const('multipart'), z.const('jsonImageUrlArray'), z.const('formReferenceImages'), z.const('siliconflowJson')]).default('multipart')),
    openaiCompatEditExtra: volatile(z.dict(z.any()).default({})),
    openaiCompatSizes: volatile(z.dict(z.dict(z.string())).default({})),
    seedreamBaseURL: volatile(z.string().default(DEFAULT_SEEDREAM_BASE_URL)),
    seedreamModel: volatile(z.string().default(DEFAULT_SEEDREAM_MODEL)),
    seedreamOutputFormat: volatile(z.union(ARK_OUTPUT_FORMATS).default('jpeg')),
    seedreamWatermark: volatile(z.boolean().default(true)),
    seedreamBackground: volatile(z.union(ARK_BACKGROUND_MODES).default('opaque')),
    dashscopeEndpoint: volatile(z.string().default(DEFAULT_DASHSCOPE_ENDPOINT)),
    dashscopeModel: volatile(z.string().default(DEFAULT_DASHSCOPE_MODEL)),
    xaiBaseURL: volatile(z.string().default(DEFAULT_XAI_BASE_URL)),
    xaiModel: volatile(z.string().default(DEFAULT_XAI_MODEL)),
    zhipuBaseURL: volatile(z.string().default(DEFAULT_ZHIPU_BASE_URL)),
    zhipuModel: volatile(z.string().default(DEFAULT_ZHIPU_MODEL)),
    comfyuiBaseURL: volatile(z.string().default(DEFAULT_COMFYUI_BASE_URL)),
    comfyuiWorkflows: volatile(z.array(z.object({ name: z.string(), json: z.string(), presetPrompt: z.string().default('') })).default([])),
    comfyuiActiveWorkflow: volatile(z.string().default('')),
    comfyuiWorkflowJson: volatile(z.string().default('')),
    comfyuiWorkflowName: volatile(z.string().default('')),
    comfyuiTimeoutMs: volatile(z.number().min(1_000).max(3_600_000).default(DEFAULT_COMFYUI_TIMEOUT_MS)),
    saveToWorkspace: volatile(z.boolean().default(true)),
    workspaceFolder: volatile(z.string().default(DEFAULT_WORKSPACE_FOLDER)),
    showProviderPill: volatile(z.boolean().default(false)),
    requestCachePrune: volatile(z.boolean().default(true)),
    requestCacheTtlDays: volatile(z.number().min(1).max(365).default(14)),
    requestCacheMaxBytes: volatile(z.number().min(0).default(256 * 1024 * 1024)),
    requestCacheDir: volatile(z.string().default('')),
    vaultEnabled: volatile(z.boolean().default(true)),
    vaultDir: volatile(z.string().default('')),
});
/** Resolve exactly one provider profile for a tool call. */
export function resolveProvider(config) {
    switch (config.provider ?? 'google') {
        case 'openai': return { provider: 'openai', apiKeyEnv: OPENAI_API_KEY_ENV, model: config.openaiModel ?? DEFAULT_OPENAI_MODEL, baseURL: config.openaiBaseURL ?? DEFAULT_OPENAI_BASE_URL, imageSize: '1024x1024' };
        case 'openai-compat': {
            const baseURL = config.openaiCompatBaseURL?.trim();
            if (baseURL === undefined || baseURL.length === 0) {
                throw new Error('OpenAI 兼容 provider requires a base URL; set it in Settings > Plugins > Image generation.');
            }
            const model = config.openaiCompatModel?.trim();
            if (model === undefined || model.length === 0) {
                throw new Error('OpenAI 兼容 provider requires a model name; set it in Settings > Plugins > Image generation.');
            }
            return { provider: 'openai-compat', apiKeyEnv: OPENAI_COMPAT_API_KEY_ENV, model, baseURL, imageSize: '1024x1024', editFormat: compatEditFormat(config), editExtra: config.openaiCompatEditExtra ?? {} };
        }
        case 'seedream': {
            const seedreamBackground = config.seedreamBackground ?? 'opaque';
            return {
                provider: 'seedream',
                apiKeyEnv: SEEDREAM_API_KEY_ENV,
                model: currentSeedreamModel(config.seedreamModel),
                baseURL: config.seedreamBaseURL ?? DEFAULT_SEEDREAM_BASE_URL,
                imageSize: '2K',
                arkOptions: {
                    // Ark rejects `output_format: jpeg` together with `background: transparent`
                    // outright — a JPEG cannot carry the alpha channel the transparent mode
                    // exists to produce. The two controls are independent in the settings UI,
                    // so couple them here rather than letting the combination reach the wire.
                    outputFormat: seedreamBackground === 'transparent' ? 'png' : config.seedreamOutputFormat ?? 'jpeg',
                    watermark: config.seedreamWatermark ?? true,
                    background: seedreamBackground,
                },
            };
        }
        case 'dashscope': return { provider: 'dashscope', apiKeyEnv: DASHSCOPE_API_KEY_ENV, model: config.dashscopeModel ?? DEFAULT_DASHSCOPE_MODEL, endpoint: config.dashscopeEndpoint ?? DEFAULT_DASHSCOPE_ENDPOINT, imageSize: '1024*1024' };
        case 'xai': return { provider: 'xai', apiKeyEnv: XAI_API_KEY_ENV, model: config.xaiModel ?? DEFAULT_XAI_MODEL, baseURL: config.xaiBaseURL ?? DEFAULT_XAI_BASE_URL, imageSize: '1024x1024' };
        case 'zhipu': return { provider: 'zhipu', apiKeyEnv: ZHIPU_API_KEY_ENV, model: config.zhipuModel ?? DEFAULT_ZHIPU_MODEL, baseURL: config.zhipuBaseURL ?? DEFAULT_ZHIPU_BASE_URL, imageSize: '1024x1024' };
        case 'comfyui': {
            const workflows = resolveComfyUIWorkflows(config);
            const workflow = activeComfyUIWorkflow(config);
            return {
                provider: 'comfyui',
                baseURL: config.comfyuiBaseURL ?? DEFAULT_COMFYUI_BASE_URL,
                workflows,
                ...(workflow === undefined ? {} : { workflow }),
                timeoutMs: config.comfyuiTimeoutMs ?? DEFAULT_COMFYUI_TIMEOUT_MS,
            };
        }
        case 'chatgpt-sub': return { provider: 'chatgpt-sub', model: DEFAULT_SUBSCRIPTION_MODELS['chatgpt-sub'] };
        case 'grok-sub': return { provider: 'grok-sub', model: DEFAULT_SUBSCRIPTION_MODELS['grok-sub'] };
        case 'google-sub': return { provider: 'google-sub', model: DEFAULT_SUBSCRIPTION_MODELS['google-sub'] };
        case 'google': return { provider: 'google', apiKeyEnv: GOOGLE_API_KEY_ENV, model: config.googleModel ?? DEFAULT_GOOGLE_MODEL, endpoint: config.googleEndpoint ?? DEFAULT_GOOGLE_ENDPOINT, native: config.googleNative === true, aspectRatio: '1:1', imageSize: '1K' };
    }
}
/** Project one named relay channel onto the legacy flat fields used by all provider adapters. */
export function withOpenAICompatChannel(config, channelId) {
    const channel = resolveOpenAICompatChannel(config, channelId);
    if (channel.id === 'default')
        return { ...config, openaiCompatActiveChannel: 'default' };
    return {
        ...config,
        openaiCompatLabel: channel.label,
        openaiCompatBaseURL: channel.baseURL,
        openaiCompatModel: channel.model,
        openaiCompatModels: channel.models ?? [],
        openaiCompatEditModel: channel.editModel ?? '',
        openaiCompatQuality: channel.quality ?? '',
        openaiCompatQualityOptions: channel.qualityOptions ?? [],
        openaiCompatExtraBody: channel.extraBody ?? {},
        openaiCompatEditSizeMode: channel.editSizeMode ?? 'auto',
        openaiCompatEditFormat: channel.editFormat ?? 'multipart',
        openaiCompatEditExtra: channel.editExtra ?? {},
        openaiCompatSizes: channel.sizes ?? {},
        openaiCompatActiveChannel: channel.id,
    };
}
/**
 * Apply a per-call provider and/or model override on top of the saved config.
 * `model` is ignored for ComfyUI, whose per-call equivalent is `workflow`.
 */
export function withProviderOverrides(config, provider, model, mode = 'generate') {
    const base = provider === undefined ? { ...config } : { ...config, provider };
    const trimmed = model?.trim() || (mode === 'edit' && base.provider === 'openai-compat' ? base.openaiCompatEditModel?.trim() : '') || '';
    if (trimmed.length === 0)
        return base;
    switch (base.provider ?? 'google') {
        case 'google': return { ...base, googleModel: trimmed };
        case 'openai': return { ...base, openaiModel: trimmed };
        case 'openai-compat': return { ...base, openaiCompatModel: trimmed, ...(mode === 'edit' ? { openaiCompatEditModel: trimmed } : {}) };
        case 'seedream': return { ...base, seedreamModel: trimmed };
        case 'dashscope': return { ...base, dashscopeModel: trimmed };
        case 'xai': return { ...base, xaiModel: trimmed };
        case 'zhipu': return { ...base, zhipuModel: trimmed };
        // Subscription models are fixed by the bridge protocol; the override is ignored.
        case 'chatgpt-sub': return base;
        case 'grok-sub': return base;
        case 'google-sub': return base;
        case 'comfyui': return base;
    }
}
/**
 * One-time migration: when the legacy single OpenAI slot points at a relay
 * (non-official base URL) and the compat row is empty, move the relay config
 * to the compat row so both can coexist. Returns the input untouched when
 * nothing needs moving.
 */
export function migrateOpenAICompatConfig(config) {
    const legacyBase = config.openaiBaseURL?.trim() ?? '';
    if (legacyBase.length === 0 || legacyBase === DEFAULT_OPENAI_BASE_URL)
        return config;
    if (hostOf(legacyBase) === 'api.openai.com')
        return config;
    if ((config.openaiCompatBaseURL?.trim() ?? '').length > 0)
        return config;
    const compatModel = config.openaiCompatModel?.trim() ?? '';
    return {
        ...config,
        openaiCompatBaseURL: legacyBase,
        ...(compatModel.length > 0 ? {} : { openaiCompatModel: config.openaiModel }),
        ...((config.openaiCompatModels?.length ?? 0) > 0 ? {} : { openaiCompatModels: [compatModel || config.openaiModel?.trim() || ''].filter(Boolean) }),
        openaiBaseURL: DEFAULT_OPENAI_BASE_URL,
        ...(config.provider === 'openai' ? { provider: 'openai-compat' } : {}),
    };
}
/** Host part of a URL, or null when it cannot be parsed. */
function hostOf(raw) {
    try {
        return new URL(raw).host;
    }
    catch {
        return null;
    }
}
/** The workflow a ComfyUI call runs: the requested name when given, else the active one. */
export function selectComfyUIWorkflow(active, requested) {
    if (active.workflow === undefined) {
        throw new Error('ComfyUI image generation requires an imported workflow; import one in Settings > Plugins > Image generation.');
    }
    if (typeof requested !== 'string' || requested.trim().length === 0)
        return active.workflow;
    const name = requested.trim();
    const workflow = active.workflows.find(candidate => candidate.name === name);
    if (workflow === undefined) {
        throw new Error(`No ComfyUI workflow named "${name}" is configured. Available workflows: ${active.workflows.map(entry => entry.name).join(', ')}.`);
    }
    return workflow;
}
//# sourceMappingURL=config.js.map