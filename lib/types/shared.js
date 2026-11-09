/** Browser route used by the generated-image card. */
export const IMAGE_ROUTE = '/plugins/dsh-image-gen/image';
/** Encode a durable image reference for the cacheable GET form of IMAGE_ROUTE. */
export function encodeImageRef(ref) {
    const bytes = new TextEncoder().encode(JSON.stringify(ref));
    let binary = '';
    for (const byte of bytes)
        binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** Decode a GET query value; the caller supplies the reference parser. */
export function decodeImageRef(value, parse) {
    try {
        const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        return parse(JSON.parse(new TextDecoder().decode(bytes)));
    }
    catch {
        return undefined;
    }
}
/** Same-origin GET URL for one attachment; safe to put in an <img src>. */
export function imageUrlFor(ref) {
    return IMAGE_ROUTE + '?ref=' + encodeImageRef(ref);
}
/** Same-origin GET URL for a host-rendered thumbnail of one attachment. */
export function thumbUrlFor(ref, width = 320) {
    return THUMB_ROUTE + '?w=' + String(width) + '&ref=' + encodeImageRef(ref);
}
/** Mid-size preview used by the lightbox; originals stay for copy/download/drag. */
export function previewUrlFor(ref) {
    return PREVIEW_ROUTE + '?ref=' + encodeImageRef(ref);
}
/** Content-addressed vault key: the sha256 of the original bytes, validated on both faces. */
export const VAULT_KEY_PATTERN = /^[a-f0-9]{64}$/;
/** Content-addressed raw copy, served when the attachment layer normalized an import or a generated GIF. */
export function vaultUrlFor(key, mediaType) {
    const base = VAULT_ROUTE + '?key=' + encodeURIComponent(key);
    return mediaType === undefined ? base : base + '&mediaType=' + encodeURIComponent(mediaType);
}
/** Browser route that uploads user-picked images as DSH attachments. */
export const IMPORT_ROUTE = '/plugins/dsh-image-gen/import';
/** Browser route used for deleting generated images and workspace files. */
export const DELETE_ROUTE = '/plugins/dsh-image-gen/delete';
/** Same-origin route used by the browser image workbench. */
export const STUDIO_ROUTE = '/plugins/dsh-image-gen/studio';
/** Same-origin route for built-in prompt inspiration metadata and images. */
export const INSPIRATION_ROUTE = '/plugins/dsh-image-gen/inspiration';
/** Browser route used for saving generated images to workspace on demand. */
export const SAVE_WORKSPACE_ROUTE = '/plugins/dsh-image-gen/save-workspace';
/** Browser route that streams a ZIP export of the selected gallery images. */
export const ZIP_ROUTE = '/plugins/dsh-image-gen/zip';
/** Browser route that serves host-rendered gallery thumbnails. */
export const THUMB_ROUTE = '/plugins/dsh-image-gen/thumb';
export const PREVIEW_ROUTE = '/plugins/dsh-image-gen/preview';
export const VAULT_ROUTE = '/plugins/dsh-image-gen/vault';
export const VAULT_REFS_ROUTE = '/plugins/dsh-image-gen/vault-refs';
export const VAULT_DELETE_ROUTE = '/plugins/dsh-image-gen/vault-delete';
export const ZIP_PROGRESS_ROUTE = '/plugins/dsh-image-gen/zip/progress';
export const ZIP_CANCEL_ROUTE = '/plugins/dsh-image-gen/zip/cancel';
export const STORAGE_STATS_ROUTE = '/plugins/dsh-image-gen/storage-stats';
/** Browser route the settings card probes provider connectivity through. */
export const TEST_CONNECTION_ROUTE = '/plugins/dsh-image-gen/test';
/** Non-secret settings capability probe, available even when the host cannot serve a form. */
export const SETTINGS_HEALTH_ROUTE = '/plugins/dsh-image-gen/settings-health';
/** Browser route the workbench infinite canvas pushes live state through. */
export const CANVAS_STATE_ROUTE = '/plugins/dsh-image-gen/canvas-state';
/** Upload a selected canvas original to the host attachment store. */
export const CANVAS_ASSET_ROUTE = '/plugins/dsh-image-gen/canvas-asset';
export const SUBSCRIPTION_LOGIN_ROUTE = '/plugins/dsh-image-gen/subscription-login';
export const SUBSCRIPTION_STATUS_ROUTE = '/plugins/dsh-image-gen/subscription-status';
/** Every accepted canvas node kind, for validating untrusted pushes. */
export const CANVAS_NODE_KINDS = ['image', 'draw', 'text', 'note', 'geo', 'arrow', 'frame', 'other'];
/**
 * Cap on the selection identity list: the client trims `selection.items` to
 * this size and the canvas-state route rejects pushes carrying more, so the
 * two ends can never drift apart.
 */
export const CANVAS_MAX_SELECTION_ITEMS = 16;
/**
 * Cap on the node inventory: the client trims `nodes` to this size and the
 * canvas-state route rejects pushes carrying more, so the two ends can never
 * drift apart. Sized to keep the model-facing digest compact.
 */
export const CANVAS_MAX_NODES = 48;
/** Same shared-cap contract as CANVAS_MAX_NODES, for the selection kind list. */
export const CANVAS_MAX_SELECTION_KINDS = 8;
/**
 * Cap on the generation prompt copied onto canvas image shapes and into the
 * model-facing summaries. The landing path truncates to this and the
 * canvas-state route rejects longer values, so the two ends can never drift.
 * The gallery keeps the full prompt; this is only the canvas-side digest view.
 */
export const CANVAS_MAX_PROMPT_CHARS = 120;
/** Namespace persisted through DSH Settings. */
export const IMAGE_GENERATION_NAMESPACE = 'image-generation';
/**
 * Loader entry id of this plugin's composition entry (see cordis.patch.yml).
 * DSH 0.1.7 serves a plugin's settings under its entry id as the namespace,
 * so browser-side reads/writes bind `configForms` to this id.
 */
export const IMAGE_GENERATION_ENTRY_ID = 'image-gen';
/** Supported providers. */
export const IMAGE_PROVIDERS = ['google', 'openai', 'openai-compat', 'seedream', 'dashscope', 'xai', 'zhipu', 'comfyui', 'chatgpt-sub', 'grok-sub', 'google-sub'];
/**
 * Providers that generate through a logged-in subscription account instead
 * of an API key. They use no credential reference and never join the
 * cloud/BYOK sets.
 */
export const SUBSCRIPTION_PROVIDERS = ['chatgpt-sub', 'grok-sub', 'google-sub'];
/** True when the provider generates through a logged-in subscription account. */
export function isSubscriptionProvider(provider) {
    return SUBSCRIPTION_PROVIDERS.includes(provider);
}
/** Providers supported by the first browser workbench release. */
export const CLOUD_IMAGE_PROVIDERS = ['google', 'openai', 'openai-compat', 'seedream', 'dashscope', 'xai', 'zhipu'];
/** Normalize the relay model list while keeping the legacy default model selectable. */
export function resolveOpenAICompatModels(config) {
    const defaultModel = config.openaiCompatModel?.trim() ?? '';
    const models = [...new Set((config.openaiCompatModels ?? []).map(model => model.trim()).filter(Boolean))];
    if (defaultModel.length > 0 && !models.includes(defaultModel))
        models.unshift(defaultModel);
    return models;
}
export const DEFAULT_OPENAI_COMPAT_CHANNEL_ID = 'default';
export function openAICompatKeyRef(channelId) {
    return channelId === DEFAULT_OPENAI_COMPAT_CHANNEL_ID
        ? OPENAI_COMPAT_API_KEY_ENV
        : `${OPENAI_COMPAT_API_KEY_ENV}_${channelId.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}`;
}
/** The legacy flat fields remain the first channel; additional entries are fully independent. */
export function resolveOpenAICompatChannels(source) {
    const legacy = {
        id: DEFAULT_OPENAI_COMPAT_CHANNEL_ID,
        label: source.openaiCompatLabel?.trim() || 'OpenAI 兼容',
        keyRef: OPENAI_COMPAT_API_KEY_ENV,
        baseURL: source.openaiCompatBaseURL ?? '',
        model: source.openaiCompatModel ?? '',
        models: [...source.openaiCompatModels ?? []],
        editModel: source.openaiCompatEditModel ?? '',
        quality: source.openaiCompatQuality ?? '',
        qualityOptions: [...source.openaiCompatQualityOptions ?? []],
        extraBody: source.openaiCompatExtraBody ?? {},
        editSizeMode: source.openaiCompatEditSizeMode ?? 'auto',
        editFormat: source.openaiCompatEditFormat ?? 'multipart',
        editExtra: source.openaiCompatEditExtra ?? {},
        sizes: source.openaiCompatSizes ?? {},
    };
    const channels = [legacy];
    const seen = new Set([legacy.id]);
    for (const [index, entry] of (source.openaiCompatChannels ?? []).entries()) {
        const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id) || seen.has(id))
            continue;
        seen.add(id);
        const storedKeyRef = typeof entry.keyRef === 'string' ? entry.keyRef.trim() : '';
        channels.push({
            id,
            label: typeof entry.label === 'string' && entry.label.trim().length > 0 ? entry.label.trim() : `OpenAI 兼容 ${index + 2}`,
            keyRef: /^DSH_IMAGE_GEN_OPENAI_COMPAT_KEY_[A-Z0-9_]+$/.test(storedKeyRef) ? storedKeyRef : openAICompatKeyRef(id),
            baseURL: typeof entry.baseURL === 'string' ? entry.baseURL : '',
            model: typeof entry.model === 'string' ? entry.model : '',
            models: Array.isArray(entry.models) ? entry.models.filter((model) => typeof model === 'string') : [],
            editModel: typeof entry.editModel === 'string' ? entry.editModel : '',
            quality: typeof entry.quality === 'string' ? entry.quality : '',
            qualityOptions: Array.isArray(entry.qualityOptions) ? entry.qualityOptions.filter((quality) => typeof quality === 'string') : [],
            extraBody: entry.extraBody ?? {},
            editSizeMode: entry.editSizeMode === 'selected' ? 'selected' : 'auto',
            editFormat: entry.editFormat ?? 'multipart',
            editExtra: entry.editExtra ?? {},
            sizes: entry.sizes ?? {},
        });
    }
    return channels;
}
export function resolveOpenAICompatChannel(source, channelId) {
    const channels = resolveOpenAICompatChannels(source);
    const explicit = channelId?.trim() ?? '';
    if (explicit.length > 0) {
        const selected = channels.find(channel => channel.id === explicit);
        if (selected === undefined)
            throw new Error(`Unknown OpenAI-compatible channel "${explicit}". Available channels: ${channels.map(channel => channel.id).join(', ')}.`);
        return selected;
    }
    const active = source.openaiCompatActiveChannel?.trim() ?? '';
    return channels.find(channel => channel.id === active) ?? channels[0];
}
/**
 * Providers the browser workbench can drive: the BYOK cloud set plus the
 * logged-in subscription channels. ComfyUI stays out; it has its own workflow
 * pipeline and no shared request shape.
 */
export const STUDIO_PROVIDERS = [...CLOUD_IMAGE_PROVIDERS, ...SUBSCRIPTION_PROVIDERS];
export function studioTargetKey(provider, channel) {
    return channel === undefined ? provider : `${provider}:${channel}`;
}
/** True when the provider is selectable in the browser workbench. */
export function isStudioProvider(provider) {
    return STUDIO_PROVIDERS.includes(provider);
}
/** Default timeout for API-key cloud generation in the browser workbench. */
export const DEFAULT_CLOUD_TIMEOUT_MS = 150_000;
/** Timeout for one subscription image call, shared by the tool path and the
 * studio route so neither drifts from the other. */
export const SUBSCRIPTION_TIMEOUT_MS = 300_000;
/** OpenAI Images GIF output contract: frame count, per-frame delay, and the
 * longest edge of the sheet all frames are tiled into. */
export const GIF_FRAME_COUNT_MIN = 2;
export const GIF_FRAME_COUNT_MAX = 16;
export const GIF_FRAME_DURATION_MS_MIN = 20;
export const GIF_FRAME_DURATION_MS_MAX = 2000;
export const GIF_SHEET_MAX_EDGE = 3840;
/** A GIF draws every frame in one image call, so it runs longer than a still; the host's HTTP client gives up on response headers after 300 s anyway. */
export const DEFAULT_GIF_TIMEOUT_MS = 300_000;
/** The cloud timeout for a request: a GIF gets the longer GIF default while the cloud timeout is left at its default. */
export function cloudTimeoutFor(configuredMs, gif) {
    const timeout = configuredMs ?? DEFAULT_CLOUD_TIMEOUT_MS;
    return gif && timeout === DEFAULT_CLOUD_TIMEOUT_MS ? DEFAULT_GIF_TIMEOUT_MS : timeout;
}
/**
 * Credential references resolved through the DSH Credentials service (BYOK).
 * These are POSIX-style reference names, not environment variables: the host
 * layers the process environment and its managed store behind them, so a name
 * like OPENAI_API_KEY is shared with any other plugin resolving the same ref.
 */
export const GOOGLE_API_KEY_ENV = 'GEMINI_API_KEY';
/** OpenAI Platform credential reference. */
export const OPENAI_API_KEY_ENV = 'OPENAI_API_KEY';
/**
 * OpenAI-compatible relay credential reference. Deliberately distinct from
 * OPENAI_API_KEY so an official key and a relay key can coexist without
 * overwriting each other.
 */
export const OPENAI_COMPAT_API_KEY_ENV = 'DSH_IMAGE_GEN_OPENAI_COMPAT_KEY';
/** Volcengine Ark credential reference. */
export const SEEDREAM_API_KEY_ENV = 'ARK_API_KEY';
/** DashScope credential reference. */
export const DASHSCOPE_API_KEY_ENV = 'DASHSCOPE_API_KEY';
/** xAI credential reference; matches the official xAI SDK environment name. */
export const XAI_API_KEY_ENV = 'XAI_API_KEY';
/** Zhipu credential reference; matches the official Zhipu SDK environment name. */
export const ZHIPU_API_KEY_ENV = 'ZHIPUAI_API_KEY';
/** The credential reference each cloud provider's API key is stored under. */
export const CLOUD_CREDENTIAL_REFS = {
    google: GOOGLE_API_KEY_ENV,
    openai: OPENAI_API_KEY_ENV,
    'openai-compat': OPENAI_COMPAT_API_KEY_ENV,
    seedream: SEEDREAM_API_KEY_ENV,
    dashscope: DASHSCOPE_API_KEY_ENV,
    xai: XAI_API_KEY_ENV,
    zhipu: ZHIPU_API_KEY_ENV,
};
/** The credential reference storing this provider's API key, when it uses one. */
export function cloudCredentialRef(provider) {
    return CLOUD_IMAGE_PROVIDERS.includes(provider)
        ? CLOUD_CREDENTIAL_REFS[provider]
        : undefined;
}
/** Locale-neutral provider names for user-facing errors and status lines. */
export const PROVIDER_DISPLAY_NAMES = {
    google: 'Google Gemini',
    openai: 'OpenAI',
    'openai-compat': 'OpenAI 兼容',
    seedream: 'Seedream',
    dashscope: 'DashScope',
    xai: 'xAI Grok',
    zhipu: '智谱 GLM',
    comfyui: 'ComfyUI',
    'chatgpt-sub': 'ChatGPT 订阅',
    'grok-sub': 'Grok 订阅',
    'google-sub': 'Google 订阅',
};
/** Display names for the subscription providers, separate from the BYOK table. */
export const SUBSCRIPTION_PROVIDER_DISPLAY_NAMES = {
    'chatgpt-sub': 'ChatGPT 订阅',
    'grok-sub': 'Grok 订阅',
    'google-sub': 'Google 订阅',
};
export const STUDIO_WATERMARK_VALUES = ['default', 'off', 'on'];
/** A model picker/request must use the same operation-specific default. */
export function studioModelForMode(profile, mode) {
    return mode === 'edit' ? profile.editModel ?? profile.model : profile.model;
}
export function studioModelOptionsForMode(profile, mode) {
    if (mode === 'edit' && profile.editModel !== undefined) {
        return [{ value: profile.editModel, label: profile.editModel }];
    }
    return profile.modelOptions ?? [{ value: profile.model, label: profile.model }];
}
export function studioWatermarkCapability(profile, mode) {
    return profile?.watermarkCapabilities?.[mode]
        ?? (mode === 'generate' && profile?.watermarkOptions?.length
            ? { status: 'supported' } : { status: 'unknown', reason: 'channel-unconfirmed' });
}
/** Default endpoints and base URLs. */
export const DEFAULT_GOOGLE_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_SEEDREAM_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
export const DEFAULT_DASHSCOPE_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1';
export const DEFAULT_XAI_BASE_URL = 'https://api.x.ai/v1';
export const DEFAULT_ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';
export const DEFAULT_COMFYUI_BASE_URL = 'http://127.0.0.1:8188';
export const DEFAULT_COMFYUI_TIMEOUT_MS = 300_000;
export const DEFAULT_COMFYUI_WORKFLOW_LABEL = 'API workflow';
export const MAX_COMFYUI_WORKFLOW_BYTES = 5 * 1024 * 1024;
/** Content types Ark's Seedream endpoint can return. */
export const ARK_OUTPUT_FORMATS = ['png', 'jpeg'];
/** Whether Ark stamps an "AI generated" watermark on the result. */
export const ARK_BACKGROUND_MODES = ['opaque', 'transparent'];
/**
 * Map the Ark output controls onto request-body fields.
 *
 * `background` is opt-in per call site because Ark restricts `transparent` to
 * image-to-image with a single alpha-bearing reference and rejects the whole
 * request otherwise:
 *
 *   text-to-image + transparent → 400 InvalidParameter
 *     "transparent background requires exactly one input image"
 *
 * So the generation endpoint must never carry it, and that caller passes
 * `{ background: false }`. `background: opaque` is never emitted anywhere: it
 * is already Ark's default, so sending it would change nothing while adding a
 * field only the edit path can act on.
 */
export function arkOutputBody(options, { background = true } = {}) {
    if (options === undefined)
        return {};
    const body = {};
    if (options.outputFormat !== undefined)
        body.output_format = options.outputFormat;
    if (options.watermark !== undefined)
        body.watermark = options.watermark;
    if (background && options.background === 'transparent')
        body.background = 'transparent';
    return body;
}
/** Default model names. */
export const DEFAULT_GOOGLE_MODEL = 'gemini-3.1-flash-image';
export const DEFAULT_OPENAI_MODEL = 'gpt-image-2.6-flare';
export const DEFAULT_SEEDREAM_MODEL = 'doubao-seedream-5-0-pro-260628';
/**
 * Seedream models Volcano Ark retires on 2026-11-24 (batch 10), mapped to the
 * model that takes their requests. A saved settings value naming one of them
 * (the plugin's own former default among them) would start failing that day.
 */
const RETIRED_SEEDREAM_MODELS = {
    'doubao-seedream-5-0-260128': DEFAULT_SEEDREAM_MODEL,
    'doubao-seedream-5-0-lite-260128': DEFAULT_SEEDREAM_MODEL,
    'doubao-seedream-4-5-251128': DEFAULT_SEEDREAM_MODEL,
};
/** The Seedream model a request should use: a retired one is replaced, anything else is kept. */
export function currentSeedreamModel(model) {
    const trimmed = model?.trim();
    if (trimmed === undefined || trimmed.length === 0)
        return DEFAULT_SEEDREAM_MODEL;
    return RETIRED_SEEDREAM_MODELS[trimmed] ?? trimmed;
}
export const DEFAULT_DASHSCOPE_MODEL = 'qwen-image-3.0';
export const DEFAULT_XAI_MODEL = 'grok-imagine-image-2.0';
export const DEFAULT_ZHIPU_MODEL = 'glm-image';
/** Named workflows, falling back to the legacy single-workflow fields when the list is empty. */
export function resolveComfyUIWorkflows(source) {
    const named = [];
    for (const entry of source.comfyuiWorkflows ?? []) {
        const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
        const json = typeof entry?.json === 'string' ? entry.json : '';
        if (name.length > 0 && json.trim().length > 0) {
            const presetPrompt = typeof entry.presetPrompt === 'string' ? entry.presetPrompt.trim() : '';
            named.push(presetPrompt.length > 0 ? { name, json, presetPrompt } : { name, json });
        }
    }
    if (named.length > 0)
        return named;
    const legacyJson = typeof source.comfyuiWorkflowJson === 'string' ? source.comfyuiWorkflowJson : '';
    if (legacyJson.trim().length === 0)
        return [];
    const legacyName = typeof source.comfyuiWorkflowName === 'string' ? source.comfyuiWorkflowName.trim() : '';
    return [{ name: legacyName.length > 0 ? legacyName : DEFAULT_COMFYUI_WORKFLOW_LABEL, json: legacyJson }];
}
/** The workflow ComfyUI calls use by default: the configured active name, else the first entry. */
export function activeComfyUIWorkflow(source) {
    const workflows = resolveComfyUIWorkflows(source);
    if (workflows.length === 0)
        return undefined;
    const activeName = typeof source.comfyuiActiveWorkflow === 'string' ? source.comfyuiActiveWorkflow.trim() : '';
    return workflows.find(workflow => workflow.name === activeName) ?? workflows[0];
}
/** Derive a workflow label that does not collide with the given existing names. */
export function uniqueComfyUIWorkflowName(name, existing) {
    const base = name.trim().length > 0 ? name.trim() : DEFAULT_COMFYUI_WORKFLOW_LABEL;
    if (!existing.includes(base))
        return base;
    for (let index = 2;; index += 1) {
        const candidate = `${base} (${index})`;
        if (!existing.includes(candidate))
            return candidate;
    }
}
/**
 * Combine a workflow's preset with the user prompt: preset first, user second,
 * joined by one comma — never doubled when the preset already ends in a
 * separator, and reduced to the non-empty side when the other is blank.
 */
export function mergeComfyUIPrompt(preset, user) {
    const presetText = typeof preset === 'string' ? preset.trim().replace(/[,;\s]+$/, '') : '';
    const userText = user.trim();
    if (presetText.length === 0)
        return userText;
    if (userText.length === 0)
        return presetText;
    return `${presetText}, ${userText}`;
}
/** Default models for the subscription channels; fixed by the bridge protocol. */
export const DEFAULT_SUBSCRIPTION_MODELS = {
    'chatgpt-sub': 'gpt-image-2.6-flare',
    'grok-sub': 'grok-imagine-image-2.0',
    'google-sub': 'gemini-3.1-flash-image',
};
export const DEFAULT_MODELS = {
    google: DEFAULT_GOOGLE_MODEL,
    openai: DEFAULT_OPENAI_MODEL,
    // Relays expose arbitrary model ids; there is no sensible default to offer.
    'openai-compat': '',
    seedream: DEFAULT_SEEDREAM_MODEL,
    dashscope: DEFAULT_DASHSCOPE_MODEL,
    xai: DEFAULT_XAI_MODEL,
    zhipu: DEFAULT_ZHIPU_MODEL,
    comfyui: DEFAULT_COMFYUI_WORKFLOW_LABEL,
    'chatgpt-sub': DEFAULT_SUBSCRIPTION_MODELS['chatgpt-sub'],
    'grok-sub': DEFAULT_SUBSCRIPTION_MODELS['grok-sub'],
    'google-sub': DEFAULT_SUBSCRIPTION_MODELS['google-sub'],
};
/**
 * Official consoles where each API-key provider issues keys, linked next to
 * the key field (#109). Relays (openai-compat), ComfyUI and the subscription
 * channels have no single place to get one.
 */
export const API_KEY_CONSOLE_URLS = {
    google: 'https://aistudio.google.com/apikey',
    openai: 'https://platform.openai.com/api-keys',
    seedream: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
    dashscope: 'https://bailian.console.aliyun.com/',
    xai: 'https://console.x.ai/team/default/api-keys',
    zhipu: 'https://bigmodel.cn/usercenter/proj-mgmt/apikeys',
};
export const DEFAULT_BASE_URLS = {
    google: DEFAULT_GOOGLE_ENDPOINT,
    openai: DEFAULT_OPENAI_BASE_URL,
    // Relay addresses are user-specific; empty until the compat row is filled in.
    'openai-compat': '',
    seedream: DEFAULT_SEEDREAM_BASE_URL,
    dashscope: DEFAULT_DASHSCOPE_ENDPOINT,
    xai: DEFAULT_XAI_BASE_URL,
    zhipu: DEFAULT_ZHIPU_BASE_URL,
    comfyui: DEFAULT_COMFYUI_BASE_URL,
    // Subscription channels call an in-process service, never a URL.
    'chatgpt-sub': '',
    'grok-sub': '',
    'google-sub': '',
};
//# sourceMappingURL=shared.js.map