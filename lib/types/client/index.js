import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Must stay the first import: it shims CSS.supports before tldraw's
// module-scope environment probe runs (#40); see css-supports-shim.ts.
import './tl/css-supports-shim.js';
import { installDatalistScrollFix } from './datalist-scroll-fix.js';
import { compatEditFormat } from '../watermark.js';
import { useEffect, useState, useRef } from 'react';
import { fetchSettingsHealth, settingsState } from './settings-state.js';
import { currentSeedreamModel, CLOUD_CREDENTIAL_REFS, CLOUD_IMAGE_PROVIDERS, API_KEY_CONSOLE_URLS, DEFAULT_BASE_URLS, DEFAULT_CLOUD_TIMEOUT_MS, DEFAULT_COMFYUI_TIMEOUT_MS, DEFAULT_MODELS, IMAGE_GENERATION_ENTRY_ID, IMAGE_GENERATION_NAMESPACE, IMAGE_PROVIDERS, IMAGE_ROUTE, MAX_COMFYUI_WORKFLOW_BYTES, STUDIO_ROUTE, SUBSCRIPTION_LOGIN_ROUTE, SUBSCRIPTION_PROVIDERS, SUBSCRIPTION_STATUS_ROUTE, TEST_CONNECTION_ROUTE, activeComfyUIWorkflow, cloudCredentialRef, isSubscriptionProvider, openAICompatKeyRef, resolveComfyUIWorkflows, resolveOpenAICompatChannels, resolveOpenAICompatModels, uniqueComfyUIWorkflowName, } from '../shared.js';
import { validateComfyUIWorkflowJson } from '../comfyui-workflow.js';
import { saveGalleryItem } from './gallery-store.js';
import { GalleryViewTab } from './gallery-view.js';
import { GeneratedImageCard, GeneratedImagesCard, PromotedImageResultNode } from './image-result-view.js';
export { GeneratedImageCard, GeneratedImagesCard, PromotedImageResultNode } from './image-result-view.js';
import { DICT } from './plugin-i18n.js';
import { PLUGIN_STYLE } from './plugin-style.js';
import { GIF_STYLE } from './gif-style.js';
import { createCanvasSessionSelection, startConversationLandings } from './tl/conversation-landings.js';
import { STUDIO_STYLE } from './studio-style.js';
import { setCanvasStyleAnchor } from './tl/lazy-studio-canvas.js';
import { TL_THEME_CSS } from './tl/tl-theme-css.js';
import { INSPIRATION_STYLE } from './inspiration-style.js';
import { IMAGE_RESULT_NODE_KIND, createImageResultDefinition, } from './image-result-node.js';
import { conversationRegenerateRequest } from './conversation-regenerate.js';
import { parseExtraFields, parseSizeTable } from './output-settings.js';
import { DEFAULT_COMPAT_QUALITIES, validateOfficialSize } from '../openai-output.js';
import { ImageProviderPill, PROVIDER_PILL_STYLE } from './provider-pill.js';
import { writeSetting } from './settings-write.js';
// Convention: the canvas bundle announces its build timestamp on load, so a
// stale host webview cache is provable from the browser console. The typeof
// guard keeps the module importable where the define is absent (vitest).
if (typeof __CANVAS_BUILD_TS__ !== 'undefined') {
    console.info(`[dsh-image-gen] canvas bundle ${__CANVAS_BUILD_TS__}`);
}
/** Right-sidebar tab-type registration id (DSH 0.1.5 `sidebarRightTabs`). */
const SIDEBAR_STUDIO_TAB_ID = 'dsh-image-gen/studio';
/** The tab kind: a page type opened by kind, recognizing no resource address. */
const SIDEBAR_STUDIO_TAB_KIND = 'dsh-image-gen-studio';
/**
 * Required browser services. The settings form reader is deliberately absent:
 * DSH 0.1.7 serves it as `configForms` (keyed by the Loader entry id) while
 * 0.1.5/0.1.6 expose `settingsScope` (keyed by the legacy namespace), so it is
 * probed at runtime in `apply`. A static inject of either name would park this
 * fiber forever on hosts from the other generation — the issue #55 failure.
 */
export const inject = ['slots', 'connection', 'remote', 'locale'];
/** Host with neither settings generation: reads empty, writes refuse, never throws. */
function degradedScope() {
    return {
        getSnapshot: () => ({ value: undefined, writable: false, status: 'unavailable' }),
        subscribe: () => () => { },
        set: async () => false,
    };
}
/** Mount the settings card, generated-image card, and native conversation gallery view. */
export function apply(ctx) {
    // Probe instead of inject (see `inject`): 0.1.7+ resolves `configForms`,
    // older hosts fall back to `settingsScope`, and `ctx.get` reads undefined for
    // a service the host never declared.
    const configForms = ctx.get('configForms');
    const settingsScopeApi = configForms === undefined
        ? ctx.get('settingsScope')
        : undefined;
    const scope = configForms?.get(IMAGE_GENERATION_ENTRY_ID)
        ?? settingsScopeApi?.bind({ namespace: IMAGE_GENERATION_NAMESPACE })
        ?? degradedScope();
    const locale = ctx.get('locale');
    const promotion = { enabled: false };
    ctx.effect(() => installDatalistScrollFix() || (() => { }), 'dsh-image-gen: datalist scroll handling');
    ctx.inject(['sessions'], owner => {
        const sessions = owner.get('sessions');
        if (typeof sessions?.binding !== 'function' || typeof sessions.list?.subscribe !== 'function')
            return;
        const selection = createCanvasSessionSelection();
        owner.effect(() => startConversationLandings(sessions, selection), 'dsh-image-gen: live canvas images');
        owner.inject(['uiSession'], uiOwner => {
            const ui = uiOwner.get('uiSession');
            const current = ui?.adapter?.current;
            if (typeof current?.getSnapshot !== 'function' || typeof current.subscribe !== 'function')
                return;
            uiOwner.effect(() => selection.bind(current), 'dsh-image-gen: current canvas session');
        });
    });
    ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.plugin = 'dsh-image-gen';
        style.textContent = `${PLUGIN_STYLE}\n${GIF_STYLE}\n${STUDIO_STYLE}\n${INSPIRATION_STYLE}\n${PROVIDER_PILL_STYLE}`;
        // tldraw's own stylesheet arrives with the lazily loaded canvas chunk and
        // is inserted between these two, preserving the original cascade order.
        const themeStyle = document.createElement('style');
        themeStyle.dataset.plugin = 'dsh-image-gen';
        themeStyle.textContent = TL_THEME_CSS;
        document.head.appendChild(style);
        document.head.appendChild(themeStyle);
        setCanvasStyleAnchor(themeStyle);
        return () => {
            setCanvasStyleAnchor(null);
            style.remove();
            themeStyle.remove();
        };
    }, 'dsh-image-gen: styles');
    // One-time cleanup: the workflow canvas tab was removed; drop its orphaned
    // IndexedDB database. Best-effort only: a missing database succeeds
    // immediately, and failures (locked/blocked) are ignored.
    if (typeof indexedDB !== 'undefined') {
        const request = indexedDB.deleteDatabase('dsh_image_gen_canvas');
        request.onerror = () => { };
        request.onblocked = () => { };
    }
    const register = ctx.slots.register.bind(ctx.slots);
    ctx.inject(['uiConversation'], (owner) => {
        const uiConversation = asModernUiConversation(owner.get('uiConversation'));
        if (uiConversation === undefined) {
            throw new Error('dsh-image-gen: uiConversation has an incompatible interface');
        }
        promotion.enabled = true;
        const ownerRegister = owner.slots.register.bind(owner.slots);
        owner.effect(() => uiConversation.events.register(createImageResultDefinition()), 'dsh-image-gen: promoted image result node');
        owner.slots.inject('conversation.chat.node', () => ownerRegister({
            name: 'conversation.chat.node',
            key: IMAGE_RESULT_NODE_KIND,
            inject: () => ({ locale }),
        }, PromotedImageResultNode));
    });
    // 1. Settings item
    // Credential badges stay fresh: relay host reference-updated events to the settings card.
    const credentialListeners = new Set();
    const notifyCredentialsUpdated = () => { for (const listener of credentialListeners)
        listener(); };
    ctx.effect(() => {
        const remote = ctx.get('remote');
        if (typeof remote?.$on !== 'function')
            return () => { };
        return remote.$on('credentials/reference-updated', notifyCredentialsUpdated);
    }, 'dsh-image-gen: credential events');
    const credentialEvents = {
        listen(callback) {
            credentialListeners.add(callback);
            return () => { credentialListeners.delete(callback); };
        },
    };
    // The card lives on this plugin's own page in the Plugins manager. DSH's
    // plugins page renders the keyed list slot 'plugins.bundle.config' inside a
    // bundle's detail page — keyed by the bundle's package name — so the card is
    // one click from the plugin row it configures, and the settings rail keeps no
    // extra row or tab. The page host renders it with view: 'page' and the card
    // draws its own title, form and save controls.
    //
    // The older per-plugin seat ('settings.plugin.item', hosts <=0.1.5) stays
    // registered so one build stays reachable on every host this plugin supports;
    // a host without that slot never mounts it.
    const injectSettingsItem = (owner) => {
        const ownerRegister = owner.slots.register.bind(owner.slots);
        const injectSettingsFace = () => ({ scope, credentials: credentialsProxy, credentialsAvailable, locale, credentialEvents });
        owner.slots.inject('plugins.bundle.config', () => ownerRegister({
            name: 'plugins.bundle.config',
            // Keyed slots select by bundle package name, and this fork ships as the
            // '@forever-lwy/dsh-image-gen' bundle.
            key: '@forever-lwy/dsh-image-gen',
            locale,
            inject: injectSettingsFace,
        }, ImageGenerationSettingsCard));
        owner.slots.inject('settings.plugin.item', () => ownerRegister({
            name: 'settings.plugin.item',
            key: IMAGE_GENERATION_NAMESPACE,
            inject: injectSettingsFace,
        }, ImageGenerationSettingsCard));
    };
    // Composer tool-row pill (DSH official slot: 'conversation.input.right', the
    // seat right beside the model select): switch the default image provider
    // without leaving the chat. Writes the same 'provider' field as the card.
    const injectComposerPill = (owner) => {
        const ownerRegister = owner.slots.register.bind(owner.slots);
        owner.slots.inject('conversation.input.right', () => ownerRegister({
            name: 'conversation.input.right',
            id: 'image-provider',
            order: 10,
            inject: () => ({ scope, credentials: credentialsProxy, locale, credentialEvents }),
        }, ImageProviderPill));
    };
    // Credentials resolve through a mutable holder: hosts expose the service
    // synchronously (probed now) or later (deferred inject below). The card and
    // the pill mount unconditionally — a missing service degrades only the key
    // UI instead of hiding the whole card (issue #32).
    const credentialsRef = {
        current: asCredentialsRemote(ctx.get('remote.credentials')) ?? credentialsFromLegacyConnection(ctx.get('connection')),
    };
    /** Stable delegating remote so the host-cached inject face never goes stale. */
    const credentialsProxy = {
        describe(refs) {
            const remote = credentialsRef.current;
            return remote === undefined ? Promise.resolve({ ok: false }) : remote.describe(refs);
        },
        set(ref, value) {
            const remote = credentialsRef.current;
            return remote === undefined
                ? Promise.resolve({ ok: false, error: { message: 'credentials service unavailable' } })
                : remote.set(ref, value);
        },
        get unset() {
            const remote = credentialsRef.current;
            return remote?.unset?.bind(remote);
        },
    };
    /** False while the host core exposes no credentials service (preview cores). */
    const credentialsAvailable = () => credentialsRef.current !== undefined;
    injectSettingsItem(ctx);
    injectComposerPill(ctx);
    // Preview cores can expose the credentials service after this plugin loads:
    // adopt it late and refresh every mounted card through the shared events.
    ctx.inject(['remote.credentials'], (remoteCtx) => {
        const credentials = asCredentialsRemote(remoteCtx.get('remote.credentials'));
        if (credentials === undefined) {
            console.warn('dsh-image-gen: remote.credentials resolved with an incompatible interface; key settings stay degraded');
            return;
        }
        credentialsRef.current = credentials;
        notifyCredentialsUpdated();
    });
    // 2. Tool result view card in chat stream
    ctx.slots.inject('tool.call.toolview', () => register({
        name: 'tool.call.toolview',
        key: 'generate_image',
        inject: () => ({ locale, promoted: promotion.enabled }),
    }, GeneratedImageCard));
    ctx.slots.inject('tool.call.toolview', () => register({
        name: 'tool.call.toolview',
        key: 'generate_images',
        inject: () => ({ locale, promoted: promotion.enabled }),
    }, GeneratedImagesCard));
    ctx.slots.inject('tool.call.toolview', () => register({
        name: 'tool.call.toolview',
        key: 'edit_image',
        inject: () => ({ locale, promoted: promotion.enabled }),
    }, GeneratedImageCard));
    ctx.slots.inject('conversation.view', () => register({
        name: 'conversation.view',
        id: 'gallery',
        order: 20,
        label: () => {
            const active = locale?.getSnapshot?.()?.active;
            return active?.startsWith('en') ? 'Gallery' : '画廊';
        },
        inject: () => ({ locale, credentialEvents }),
    }, GalleryViewTab));
    ctx.inject(['sidebarRightTabs'], (owner) => {
        const sidebarTabs = owner.get('sidebarRightTabs');
        const sidebarTitle = () => {
            const active = locale?.getSnapshot?.()?.active;
            return active?.startsWith('en') ? 'Image Studio' : '图像工作台';
        };
        // Stage one - the page type. The guide entry is the only one registered
        // (the shipped guide declares none), so `defaultSeed` lands every new
        // sidebar straight onto the studio tab.
        owner.effect(() => sidebarTabs.register({
            id: SIDEBAR_STUDIO_TAB_ID,
            kind: SIDEBAR_STUDIO_TAB_KIND,
            priority: 'extension',
            title: () => sidebarTitle(),
            guide: [{ order: 100, title: () => sidebarTitle() }],
        }), 'dsh-image-gen: sidebar studio tab type');
        // Stage two - the body, keyed by the definition id.
        const ownerRegister = owner.slots.register.bind(owner.slots);
        owner.slots.inject('sidebar.right.pane.tab', () => ownerRegister({
            name: 'sidebar.right.pane.tab',
            key: SIDEBAR_STUDIO_TAB_ID,
            inject: () => ({
                locale,
                credentialEvents,
                inSidebar: true,
                defaultTab: 'studio',
                initialCanvasSurface: 'infinite',
            }),
        }, GalleryViewTab));
    });
}
function asModernUiConversation(value) {
    if (value === null || typeof value !== 'object')
        return undefined;
    const events = value.events;
    if (events === null || typeof events !== 'object')
        return undefined;
    return typeof events.register === 'function'
        ? value
        : undefined;
}
function asCredentialsRemote(value) {
    if (value === null || typeof value !== 'object')
        return undefined;
    const candidate = value;
    return typeof candidate.describe === 'function' && typeof candidate.set === 'function'
        ? candidate
        : undefined;
}
function credentialsFromLegacyConnection(value) {
    if (value === null || typeof value !== 'object')
        return undefined;
    const credentials = value.api?.credentials;
    if (credentials === undefined || typeof credentials.describe !== 'function' || typeof credentials.set !== 'function')
        return undefined;
    const legacy = credentials;
    return {
        async describe(refs) {
            const response = await legacy.describe({ refs });
            return response.result.ok
                ? { ok: true, value: response.result.value.credentials }
                : { ok: false };
        },
        async set(ref, credentialValue) {
            const response = await legacy.set({ ref, value: credentialValue });
            return response.result.ok
                ? { ok: true }
                : { ok: false, error: response.result.error };
        },
    };
}
function emptyProviderRow() {
    return {
        expanded: false,
        label: '',
        model: '',
        models: [],
        editModel: '',
        baseURL: '',
        googleNative: false,
        keyInput: '',
        keyStatus: 'checking',
        keyInfo: undefined,
        testing: false,
        testResult: undefined,
        fetchingModels: false,
        modelOptions: [],
        modelFetchMessage: '',
        modelFetchIsError: false,
        saving: false,
        message: '',
        messageIsError: false,
        workflows: [],
        activeWorkflow: '',
        timeoutSeconds: DEFAULT_COMFYUI_TIMEOUT_MS / 1000,
        editFormat: 'multipart',
        editExtraText: '',
        sizeTableText: '',
        generationQuality: '',
        qualityOptionsText: DEFAULT_COMPAT_QUALITIES.join(', '),
        generateExtraText: '',
        editSizeMode: 'auto',
        outputFormat: 'jpeg',
        watermark: true,
        background: 'opaque',
    };
}
/** Settings field each cloud provider persists its model under. */
const CLOUD_MODEL_FIELDS = {
    google: 'googleModel',
    openai: 'openaiModel',
    'openai-compat': 'openaiCompatModel',
    seedream: 'seedreamModel',
    dashscope: 'dashscopeModel',
    xai: 'xaiModel',
    zhipu: 'zhipuModel',
};
/** Settings field each cloud provider persists its endpoint or base URL under. */
const CLOUD_URL_FIELDS = {
    google: 'googleEndpoint',
    openai: 'openaiBaseURL',
    'openai-compat': 'openaiCompatBaseURL',
    seedream: 'seedreamBaseURL',
    dashscope: 'dashscopeEndpoint',
    xai: 'xaiBaseURL',
    zhipu: 'zhipuBaseURL',
};
/** Dictionary key of each cloud provider's endpoint hint. */
const CLOUD_HINT_KEYS = {
    google: 'endpointHintGoogle',
    openai: 'endpointHintOpenAI',
    'openai-compat': 'endpointHintOpenAICompat',
    seedream: 'endpointHintSeedream',
    dashscope: 'endpointHintDashScope',
    xai: 'endpointHintXAI',
    zhipu: 'endpointHintZhipu',
};
/** Config field a cloud provider persists its model under. */
function modelFieldOf(provider) {
    return CLOUD_MODEL_FIELDS[provider];
}
/** Config field a cloud provider persists its endpoint or base URL under. */
function baseURLFieldOf(provider) {
    return CLOUD_URL_FIELDS[provider];
}
/** Providers whose settings row offers the "pull models" button. */
function modelPullSupported(_provider) {
    // Every cloud provider ships a model pull; ComfyUI rows never reach here.
    return true;
}
/** Serialize the extra-fields record into editor text; empty record becomes ''. */
function editExtraTextOf(value) {
    if (value === undefined || Object.keys(value).length === 0)
        return '';
    try {
        return JSON.stringify(value);
    }
    catch {
        return '';
    }
}
/** Persisted or selected edit-format value → row state; unknown values fall back to standard multipart. */
function parseEditFormat(value) {
    return value === 'jsonImageUrlArray' || value === 'formReferenceImages' || value === 'siliconflowJson' ? value : 'multipart';
}
function compatChannelRowKey(channelId) {
    return `openai-compat:${channelId}`;
}
function compatRowFields(channel) {
    return {
        label: channel.label,
        model: channel.model,
        models: resolveOpenAICompatModels({ openaiCompatModel: channel.model, openaiCompatModels: channel.models ?? [] }),
        editModel: channel.editModel ?? '',
        baseURL: channel.baseURL,
        editFormat: parseEditFormat(channel.editFormat),
        editExtraText: editExtraTextOf(channel.editExtra),
        sizeTableText: editExtraTextOf(channel.sizes),
        generationQuality: channel.quality ?? '',
        qualityOptionsText: (channel.qualityOptions !== undefined && channel.qualityOptions.length > 0 ? channel.qualityOptions : DEFAULT_COMPAT_QUALITIES).join(', '),
        generateExtraText: editExtraTextOf(channel.extraBody),
        editSizeMode: channel.editSizeMode === 'selected' ? 'selected' : 'auto',
    };
}
/** Build one row per provider from persisted settings, including ComfyUI extras. */
function rowsFromSettings(value) {
    const rows = {};
    for (const provider of IMAGE_PROVIDERS) {
        rows[provider] = {
            ...emptyProviderRow(),
            model: modelOf(provider, value),
            baseURL: baseURLOf(provider, value),
            ...(provider === 'google' ? { googleNative: value?.googleNative === true } : {}),
            ...(provider === 'openai' ? { sizeTableText: editExtraTextOf(value?.openaiSizes) } : {}),
            ...(provider === 'comfyui' ? {
                workflows: resolveComfyUIWorkflows(value ?? {}),
                activeWorkflow: activeComfyUIWorkflow(value ?? {})?.name ?? '',
                timeoutSeconds: Math.max(1, Math.round((value?.comfyuiTimeoutMs ?? DEFAULT_COMFYUI_TIMEOUT_MS) / 1000)),
            } : {}),
            ...(provider === 'openai-compat' ? compatRowFields(resolveOpenAICompatChannels(value ?? {})[0]) : {}),
            ...(provider === 'seedream' ? {
                outputFormat: value?.seedreamOutputFormat === 'png' ? 'png' : 'jpeg',
                watermark: value?.seedreamWatermark !== false,
                background: value?.seedreamBackground === 'transparent' ? 'transparent' : 'opaque',
            } : {}),
        };
    }
    for (const channel of resolveOpenAICompatChannels(value ?? {}).slice(1)) {
        rows[compatChannelRowKey(channel.id)] = { ...emptyProviderRow(), ...compatRowFields(channel) };
    }
    return rows;
}
/** Edit each provider independently, pick an explicit default, and verify keys inline. */
export function ImageGenerationSettingsCard(props) {
    // Always open: DSH renders this card inside the plugin's own page, so the
    // old click-to-expand header (and the card chrome around the fields) is gone
    // — the fields sit directly on the page. `open` stays as the flag the
    // health/login effects gate on, and is now simply always true.
    const [open] = useState(true);
    const [snapshot, setSnapshot] = useState(() => props.scope.getSnapshot());
    const [health, setHealth] = useState();
    const state = settingsState(snapshot, health);
    const settingsWritable = state === 'ready';
    const [lang, setLang] = useState(() => (props.locale?.getSnapshot?.()?.active?.startsWith('en') ? 'en' : 'zh'));
    const [defaultProvider, setDefaultProvider] = useState(() => props.scope.getSnapshot().value?.provider ?? 'google');
    const [providerMessage, setProviderMessage] = useState('');
    const [providerMessageIsError, setProviderMessageIsError] = useState(false);
    const [cloudTimeoutSeconds, setCloudTimeoutSeconds] = useState(() => (props.scope.getSnapshot().value?.cloudTimeoutMs ?? DEFAULT_CLOUD_TIMEOUT_MS) / 1000);
    const [cloudTimeoutMessage, setCloudTimeoutMessage] = useState('');
    const [saveToWorkspace, setSaveToWorkspace] = useState(() => props.scope.getSnapshot().value?.saveToWorkspace ?? true);
    const [workspaceFolder, setWorkspaceFolder] = useState(() => props.scope.getSnapshot().value?.workspaceFolder ?? 'dsh-image-gen');
    const [showPill, setShowPill] = useState(() => props.scope.getSnapshot().value?.showProviderPill === true);
    const [uiMessage, setUiMessage] = useState('');
    const [uiMessageIsError, setUiMessageIsError] = useState(false);
    const [workspaceMessage, setWorkspaceMessage] = useState('');
    const [workspaceMessageIsError, setWorkspaceMessageIsError] = useState(false);
    const [rows, setRows] = useState(() => rowsFromSettings(props.scope.getSnapshot().value));
    const [compatChannels, setCompatChannels] = useState(() => resolveOpenAICompatChannels(props.scope.getSnapshot().value ?? {}).slice(1));
    // Bumped by host credential events so every badge re-checks without remounting.
    const [keyTick, setKeyTick] = useState(0);
    // Subscription login state per provider, read from the host login-status route.
    const [subStatus, setSubStatus] = useState(() => ({ 'chatgpt-sub': { state: 'unknown' }, 'grok-sub': { state: 'unknown' }, 'google-sub': { state: 'unknown' } }));
    const [subTick, setSubTick] = useState(0);
    const [subBusy, setSubBusy] = useState({});
    // Providers whose browser login is still completing: the status probe keeps
    // polling until each lands as logged-in (or the loopback window expires), so
    // the badge flips without closing and reopening the settings card.
    const [subPending, setSubPending] = useState([]);
    useEffect(() => {
        const sync = () => { setSnapshot(props.scope.getSnapshot()); };
        const unsubscribe = props.scope.subscribe(sync);
        // The host may accept its first view between render and subscription.
        // Re-read after subscribing so the card cannot stay in a stale loading state.
        sync();
        return unsubscribe;
    }, [props.scope]);
    useEffect(() => {
        if (!open || snapshot.mode === 'memory')
            return undefined;
        const controller = new AbortController();
        void fetchSettingsHealth(controller.signal).then(value => {
            if (!controller.signal.aborted)
                setHealth(value);
        });
        return () => { controller.abort(); };
    }, [open, snapshot.status, snapshot.mode]);
    useEffect(() => {
        return props.locale?.subscribe?.(() => {
            setLang(props.locale?.getSnapshot?.()?.active?.startsWith('en') ? 'en' : 'zh');
        });
    }, [props.locale]);
    const credentialEvents = props.credentialEvents;
    useEffect(() => credentialEvents?.listen(() => { setKeyTick(tick => tick + 1); }), [credentialEvents]);
    // Subscription login badges: one status probe on card open, after every
    // login/logout, on window focus (the user just returned from the authorize
    // tab), and every 2s while a browser login is still completing. The browser
    // never touches tokens; the host route reports only the state word and the
    // account email.
    const pending = subPending;
    useEffect(() => {
        if (!open)
            return undefined;
        let active = true;
        const probe = async () => {
            try {
                const response = await fetch(SUBSCRIPTION_STATUS_ROUTE, { method: 'POST', cache: 'no-store' });
                if (!response.ok)
                    return;
                const payload = await response.json();
                if (!active || payload.statuses === undefined)
                    return;
                const next = { 'chatgpt-sub': { state: 'unknown' }, 'grok-sub': { state: 'unknown' }, 'google-sub': { state: 'unknown' } };
                for (const provider of SUBSCRIPTION_PROVIDERS) {
                    const row = payload.statuses[provider];
                    if (row?.state === 'logged-in')
                        next[provider] = { state: 'logged-in', ...(typeof row.email === 'string' ? { email: row.email } : {}) };
                    else if (row?.state === 'logged-out')
                        next[provider] = { state: 'logged-out' };
                }
                setSubStatus(next);
                // A pending login just landed: drop it from the poll set and surface
                // the success message on that provider's row.
                const landed = pending.filter(entry => next[entry.provider].state === 'logged-in');
                if (landed.length > 0) {
                    setSubPending(current => current.filter(entry => next[entry.provider].state !== 'logged-in'));
                    for (const entry of landed) {
                        updateRow(entry.provider, { message: t('subLoginOk'), messageIsError: false });
                    }
                }
                // Bounded by the host's 10-minute loopback window: entries older than
                // that stop polling instead of spinning forever.
                const WINDOW_MS = 10.5 * 60_000;
                const stale = pending.filter(entry => Date.now() - entry.startedAt > WINDOW_MS);
                if (stale.length > 0) {
                    setSubPending(current => current.filter(entry => Date.now() - entry.startedAt <= WINDOW_MS));
                }
            }
            catch { /* badges stay unknown */ }
        };
        void probe();
        // While a browser login is in flight, keep polling; stop when none is.
        let timer;
        if (pending.length > 0) {
            timer = setInterval(() => { void probe(); }, 2000);
        }
        const onFocus = () => { void probe(); };
        window.addEventListener('focus', onFocus);
        return () => {
            active = false;
            if (timer !== undefined)
                clearInterval(timer);
            window.removeEventListener('focus', onFocus);
        };
        // pending is read fresh from the closure each render; its identity changes
        // on setSubPending and restarts the interval with the updated set.
    }, [open, subTick, pending]);
    /** Start a subscription login: the host registers PKCE and the loopback
     * catch server, then the browser opens the vendor's authorize URL. The
     * provider joins the pending set so the badge polls until login lands. */
    const subscriptionLogin = async (provider) => {
        updateRow(provider, { message: '', messageIsError: false });
        setSubBusy(current => ({ ...current, [provider]: 'login' }));
        try {
            const response = await fetch(SUBSCRIPTION_LOGIN_ROUTE, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ provider }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true || typeof payload.url !== 'string') {
                const detail = typeof payload.error === 'string' ? payload.error : payload.error?.message;
                throw new Error(detail ?? `HTTP ${String(response.status)}`);
            }
            // The loopback catch window is 10 minutes; the poll set drops the row
            // earlier if it lands, and this expiry drops it if it never does.
            setSubPending(current => [...current.filter(entry => entry.provider !== provider), { provider, startedAt: Date.now() }]);
            window.open(payload.url, '_blank', 'noopener');
            updateRow(provider, { message: t('subWaitingLogin'), messageIsError: false });
        }
        catch (cause) {
            updateRow(provider, { message: cause instanceof Error ? cause.message : String(cause), messageIsError: true });
        }
        finally {
            setSubBusy(current => { const next = { ...current }; delete next[provider]; return next; });
        }
    };
    /** Sign out one subscription account; nothing else changes. */
    const subscriptionLogout = async (provider) => {
        setSubBusy(current => ({ ...current, [provider]: 'logout' }));
        try {
            const response = await fetch(SUBSCRIPTION_LOGIN_ROUTE, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ provider, action: 'logout' }),
            });
            if (!response.ok)
                throw new Error(`HTTP ${String(response.status)}`);
            updateRow(provider, { message: '', messageIsError: false });
        }
        catch (cause) {
            updateRow(provider, { message: cause instanceof Error ? cause.message : String(cause), messageIsError: true });
        }
        finally {
            setSubBusy(current => { const next = { ...current }; delete next[provider]; return next; });
            setSubTick(tick => tick + 1);
        }
    };
    const t = (keyName, params) => {
        const dict = lang === 'en' ? DICT.en : DICT.zh;
        let text = dict[keyName] || DICT.zh[keyName] || keyName;
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                text = text.replace(`{${k}}`, v);
            }
        }
        return text;
    };
    const stateMessages = {
        loading: 'settingsLoading', remote: 'settingsRemote', unavailable: 'settingsUnavailable',
        readOnly: 'settingsReadOnly', incompatible: 'settingsIncompatible',
    };
    const settingsMessage = state === 'ready' ? undefined : t(stateMessages[state]);
    const saveSetting = async (field, value) => {
        if (settingsMessage !== undefined)
            throw new Error(settingsMessage);
        await writeSetting(props.scope, field, value, t('settingsWriteRejected'));
    };
    const providerLabels = {
        google: t('providerGoogle'),
        openai: t('providerOpenAI'),
        'openai-compat': t('providerOpenAICompat'),
        seedream: t('providerSeedream'),
        dashscope: t('providerDashScope'),
        xai: t('providerXAI'),
        zhipu: t('providerZhipu'),
        comfyui: t('providerComfyUI'),
        'chatgpt-sub': t('providerChatGPTSub'),
        'grok-sub': t('providerGrokSub'),
        'google-sub': t('providerGoogleSub'),
    };
    useEffect(() => {
        const value = snapshot.value;
        setDefaultProvider(value?.provider ?? 'google');
        setCloudTimeoutSeconds((value?.cloudTimeoutMs ?? DEFAULT_CLOUD_TIMEOUT_MS) / 1000);
        setSaveToWorkspace(value?.saveToWorkspace ?? true);
        setWorkspaceFolder(value?.workspaceFolder ?? 'dsh-image-gen');
        setShowPill(value?.showProviderPill === true);
        setRows(current => {
            const next = { ...current };
            for (const provider of IMAGE_PROVIDERS) {
                next[provider] = {
                    ...current[provider],
                    model: modelOf(provider, value),
                    ...(provider === 'openai-compat' ? compatRowFields(resolveOpenAICompatChannels(value ?? {})[0]) : {}),
                    baseURL: baseURLOf(provider, value),
                    ...(provider === 'comfyui' ? {
                        workflows: resolveComfyUIWorkflows(value ?? {}),
                        activeWorkflow: activeComfyUIWorkflow(value ?? {})?.name ?? '',
                        timeoutSeconds: Math.max(1, Math.round((value?.comfyuiTimeoutMs ?? DEFAULT_COMFYUI_TIMEOUT_MS) / 1000)),
                    } : {}),
                    ...(provider === 'seedream' ? {
                        outputFormat: value?.seedreamOutputFormat === 'png' ? 'png' : 'jpeg',
                        watermark: value?.seedreamWatermark !== false,
                        background: value?.seedreamBackground === 'transparent' ? 'transparent' : 'opaque',
                    } : {}),
                };
            }
            for (const channel of resolveOpenAICompatChannels(value ?? {}).slice(1)) {
                const key = compatChannelRowKey(channel.id);
                next[key] = { ...(current[key] ?? emptyProviderRow()), ...compatRowFields(channel) };
            }
            return next;
        });
    }, [snapshot]);
    const credentials = props.credentials;
    const credentialsAvailable = props.credentialsAvailable;
    useEffect(() => {
        let active = true;
        const targets = [
            ...CLOUD_IMAGE_PROVIDERS.flatMap(provider => {
                const keyRef = cloudCredentialRef(provider);
                return keyRef === undefined ? [] : [{ key: provider, keyRef }];
            }),
            ...compatChannels.map(channel => ({ key: compatChannelRowKey(channel.id), keyRef: channel.keyRef })),
        ];
        if (!credentialsAvailable()) {
            setRows(current => {
                const next = { ...current };
                for (const target of targets)
                    next[target.key] = { ...(current[target.key] ?? emptyProviderRow()), keyStatus: 'unavailable', keyInfo: undefined };
                return next;
            });
            return () => { active = false; };
        }
        for (const target of targets) {
            setRows(current => ({ ...current, [target.key]: { ...current[target.key], keyStatus: 'checking' } }));
            void credentials.describe([target.keyRef]).then(response => {
                if (!active)
                    return;
                const info = response.ok ? response.value?.[target.keyRef] : undefined;
                setRows(current => ({ ...current, [target.key]: { ...current[target.key], keyStatus: response.ok ? (info?.configured ? 'configured' : 'missing') : 'unknown', keyInfo: info } }));
            }).catch(() => {
                if (!active)
                    return;
                setRows(current => ({ ...current, [target.key]: { ...current[target.key], keyStatus: 'unknown' } }));
            });
        }
        return () => { active = false; };
    }, [credentials, credentialsAvailable, keyTick, compatChannels]);
    const updateRow = (target, patch) => {
        setRows(current => ({ ...current, [target]: { ...current[target], ...patch } }));
    };
    /** The only action that ever changes the default provider; saving a key never does. */
    const selectDefaultProvider = (provider) => {
        setDefaultProvider(provider);
        setProviderMessage('');
        setProviderMessageIsError(false);
        void saveSetting('provider', provider).catch((cause) => {
            setDefaultProvider(snapshot.value?.provider ?? 'google');
            setProviderMessage(cause instanceof Error ? cause.message : String(cause));
            setProviderMessageIsError(true);
        });
    };
    const saveProviderRow = async (provider, channel) => {
        const target = channel === undefined ? provider : compatChannelRowKey(channel.id);
        const row = rows[target];
        updateRow(target, { saving: true, message: '', messageIsError: false });
        try {
            if (channel !== undefined) {
                const label = row.label.trim();
                if (label.length === 0)
                    throw new Error(t('channelNameRequired'));
                const updated = {
                    ...channel,
                    label,
                    baseURL: row.baseURL.trim(),
                    model: row.model.trim(),
                    models: resolveOpenAICompatModels({ openaiCompatModel: row.model, openaiCompatModels: row.models }),
                    editModel: row.editModel.trim(),
                    quality: row.generationQuality.trim(),
                    qualityOptions: [...new Set(row.qualityOptionsText.split(',').map(value => value.trim()).filter(Boolean))],
                    extraBody: parseExtraFields(row.generateExtraText, t('editExtraInvalid')),
                    editSizeMode: row.editSizeMode,
                    editFormat: row.editFormat,
                    editExtra: parseExtraFields(row.editExtraText, t('editExtraInvalid')),
                    sizes: parseSizeTable(row.sizeTableText, t('sizeTableInvalid')),
                };
                const nextChannels = compatChannels.some(entry => entry.id === channel.id)
                    ? compatChannels.map(entry => entry.id === channel.id ? updated : entry)
                    : [...compatChannels, updated];
                await saveSetting('openaiCompatChannels', nextChannels);
                setCompatChannels(nextChannels);
                if (row.keyInput.trim().length > 0) {
                    if (!credentialsAvailable())
                        throw new Error(t('credentialsUnavailable'));
                    const response = await props.credentials.set(channel.keyRef, row.keyInput.trim());
                    if (!response.ok)
                        throw new Error(response.error?.message ?? t('saveKeyFailed'));
                    updateRow(target, { keyInput: '', keyStatus: 'configured' });
                }
            }
            else if (provider === 'comfyui') {
                const entries = row.workflows.map(entry => ({ name: entry.name.trim(), json: entry.json, presetPrompt: (entry.presetPrompt ?? '').trim() }));
                for (const entry of entries) {
                    if (entry.name.length === 0)
                        throw new Error(t('workflowNameRequired'));
                    validateComfyUIWorkflowJson(entry.json);
                }
                if (new Set(entries.map(entry => entry.name)).size !== entries.length)
                    throw new Error(t('workflowDuplicateName'));
                const activeEntry = entries.find(entry => entry.name === row.activeWorkflow) ?? entries[0];
                await saveSetting('comfyuiBaseURL', row.baseURL);
                await saveSetting('comfyuiWorkflows', entries);
                await saveSetting('comfyuiActiveWorkflow', activeEntry === undefined ? '' : activeEntry.name);
                await saveSetting('comfyuiWorkflowJson', activeEntry === undefined ? '' : activeEntry.json);
                await saveSetting('comfyuiWorkflowName', activeEntry === undefined ? '' : activeEntry.name);
                await saveSetting('comfyuiTimeoutMs', Math.max(1, Math.round(row.timeoutSeconds)) * 1000);
            }
            else if (isSubscriptionProvider(provider)) {
                await Promise.resolve();
            }
            else {
                const editExtra = provider === 'openai-compat' ? parseExtraFields(row.editExtraText, t('editExtraInvalid')) : {};
                const sizeTable = provider === 'openai' || provider === 'openai-compat' ? parseSizeTable(row.sizeTableText, t('sizeTableInvalid')) : {};
                const generateExtra = provider === 'openai-compat' ? parseExtraFields(row.generateExtraText, t('editExtraInvalid')) : {};
                if (provider === 'openai')
                    for (const tiers of Object.values(sizeTable))
                        for (const size of Object.values(tiers))
                            validateOfficialSize(row.model, size);
                await saveSetting(modelFieldOf(provider), row.model);
                await saveSetting(baseURLFieldOf(provider), row.baseURL);
                if (provider === 'google')
                    await saveSetting('googleNative', row.googleNative);
                if (provider === 'openai')
                    await saveSetting('openaiSizes', sizeTable);
                if (provider === 'openai-compat') {
                    await saveSetting('openaiCompatLabel', row.label.trim());
                    await saveSetting('openaiCompatModels', resolveOpenAICompatModels({ openaiCompatModel: row.model, openaiCompatModels: row.models }));
                    await saveSetting('openaiCompatEditModel', row.editModel.trim());
                    await saveSetting('openaiCompatEditFormat', row.editFormat);
                    await saveSetting('openaiCompatEditExtra', editExtra);
                    await saveSetting('openaiCompatSizes', sizeTable);
                    await saveSetting('openaiCompatQuality', row.generationQuality.trim());
                    await saveSetting('openaiCompatQualityOptions', [...new Set(row.qualityOptionsText.split(',').map(value => value.trim()).filter(Boolean))]);
                    await saveSetting('openaiCompatExtraBody', generateExtra);
                    await saveSetting('openaiCompatEditSizeMode', row.editSizeMode);
                }
                if (provider === 'seedream') {
                    await saveSetting('seedreamOutputFormat', row.outputFormat);
                    await saveSetting('seedreamWatermark', row.watermark);
                    await saveSetting('seedreamBackground', row.background);
                }
                if (row.keyInput.trim().length > 0) {
                    const keyRef = cloudCredentialRef(provider);
                    if (keyRef === undefined)
                        throw new Error(t('comfyuiNoKey'));
                    if (!credentialsAvailable())
                        throw new Error(t('credentialsUnavailable'));
                    const response = await props.credentials.set(keyRef, row.keyInput.trim());
                    if (!response.ok)
                        throw new Error(response.error?.message ?? t('saveKeyFailed'));
                    updateRow(target, { keyInput: '', keyStatus: 'configured' });
                }
            }
            updateRow(target, {
                message: t('saved'), messageIsError: false,
                testResult: undefined, modelFetchMessage: '', modelFetchIsError: false,
            });
        }
        catch (cause) {
            updateRow(target, { message: cause instanceof Error ? cause.message : String(cause), messageIsError: true });
        }
        finally {
            updateRow(target, { saving: false });
        }
    };
    const addCompatChannel = () => {
        const id = `channel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const label = `OpenAI 兼容 ${compatChannels.length + 2}`;
        const channel = {
            id,
            label,
            keyRef: openAICompatKeyRef(id),
            baseURL: '',
            model: '',
            models: [],
            qualityOptions: [...DEFAULT_COMPAT_QUALITIES],
        };
        setCompatChannels(current => [...current, channel]);
        setRows(current => ({
            ...current,
            [compatChannelRowKey(id)]: { ...emptyProviderRow(), ...compatRowFields(channel), expanded: true },
        }));
    };
    const removeCompatChannel = async (channel) => {
        if (!window.confirm(t('removeChannelConfirm', { label: channel.label })))
            return;
        const target = compatChannelRowKey(channel.id);
        const persisted = snapshot.value?.openaiCompatChannels?.some(entry => entry.id === channel.id) === true;
        if (!persisted) {
            setCompatChannels(current => current.filter(entry => entry.id !== channel.id));
            setRows(current => {
                const next = { ...current };
                delete next[target];
                return next;
            });
            return;
        }
        let removed = false;
        updateRow(target, { saving: true, message: '', messageIsError: false });
        try {
            const nextChannels = compatChannels.filter(entry => entry.id !== channel.id);
            await saveSetting('openaiCompatChannels', nextChannels);
            if (snapshot.value?.openaiCompatActiveChannel === channel.id)
                await saveSetting('openaiCompatActiveChannel', 'default');
            removed = true;
            setCompatChannels(nextChannels);
            setRows(current => {
                const next = { ...current };
                delete next[target];
                return next;
            });
        }
        catch (cause) {
            updateRow(target, { message: cause instanceof Error ? cause.message : String(cause), messageIsError: true });
        }
        finally {
            if (!removed)
                updateRow(target, { saving: false });
        }
    };
    /** These actions use host settings, so drafts must be saved before making a request. */
    const providerActionBlockMessage = (provider, channel) => {
        const target = channel === undefined ? provider : compatChannelRowKey(channel.id);
        const row = rows[target];
        if (row.keyInput.trim().length > 0)
            return t('saveKeyFirst');
        if (isSubscriptionProvider(provider))
            return undefined;
        const address = row.baseURL.trim();
        if (address.length === 0)
            return t('endpointRequired');
        const savedAddress = channel === undefined ? baseURLOf(provider, props.scope.getSnapshot().value) : channel.baseURL;
        if (address !== savedAddress.trim())
            return t('saveEndpointFirst');
        if (provider === 'google' && row.googleNative !== (props.scope.getSnapshot().value?.googleNative === true))
            return t('saveGoogleProtocolFirst');
        return undefined;
    };
    /** Localize the host's missing-address error while preserving upstream details. */
    const providerErrorMessage = (message) => message === 'Base URL is not configured' ? t('savedEndpointMissing') : message ?? t('testFailed');
    /** Probe through the host route so the browser side never touches credential values. */
    const testConnection = async (provider, channel) => {
        const target = channel === undefined ? provider : compatChannelRowKey(channel.id);
        const blocked = providerActionBlockMessage(provider, channel);
        if (blocked !== undefined) {
            updateRow(target, { message: blocked, messageIsError: false, testResult: undefined });
            return;
        }
        updateRow(target, { testing: true, testResult: undefined, message: '', messageIsError: false });
        try {
            const response = await fetch(TEST_CONNECTION_ROUTE, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ provider, ...(channel === undefined ? {} : { channel: channel.id }) }),
            });
            if (!response.ok)
                throw new Error(`HTTP ${String(response.status)}`);
            updateRow(target, { testResult: await response.json() });
        }
        catch (cause) {
            updateRow(target, { testResult: { ok: false, reason: 'error', message: cause instanceof Error ? cause.message : String(cause) } });
        }
        finally {
            updateRow(target, { testing: false });
        }
    };
    /** Pull the provider's image-capable model ids through the host route (Google and the OpenAI family). */
    const fetchProviderModels = async (provider, channel) => {
        const target = channel === undefined ? provider : compatChannelRowKey(channel.id);
        const blocked = providerActionBlockMessage(provider, channel);
        if (blocked !== undefined) {
            updateRow(target, { modelFetchMessage: blocked, modelFetchIsError: false });
            return;
        }
        updateRow(target, { fetchingModels: true, modelFetchMessage: '', modelFetchIsError: false });
        try {
            const response = await fetch(TEST_CONNECTION_ROUTE, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ provider, action: 'models', ...(channel === undefined ? {} : { channel: channel.id }) }),
            });
            if (!response.ok)
                throw new Error(`HTTP ${String(response.status)}`);
            const payload = await response.json();
            if (payload.ok && Array.isArray(payload.models)) {
                const models = payload.models.filter((id) => typeof id === 'string');
                updateRow(target, {
                    modelOptions: models,
                    modelFetchMessage: models.length > 0 ? t('modelsFound', { n: String(models.length) }) : t('modelsNone'),
                    modelFetchIsError: models.length === 0,
                });
            }
            else if (payload.reason === 'missing-key') {
                updateRow(target, { modelFetchMessage: t('badgeMissing'), modelFetchIsError: true });
            }
            else if (payload.reason === 'unauthorized') {
                updateRow(target, { modelFetchMessage: t('testUnauthorized'), modelFetchIsError: true });
            }
            else {
                updateRow(target, { modelFetchMessage: providerErrorMessage(payload.message), modelFetchIsError: true });
            }
        }
        catch (cause) {
            updateRow(target, { modelFetchMessage: cause instanceof Error ? cause.message : String(cause), modelFetchIsError: true });
        }
        finally {
            updateRow(target, { fetchingModels: false });
        }
    };
    const clearProviderKey = async (provider, channel) => {
        const target = channel === undefined ? provider : compatChannelRowKey(channel.id);
        const keyRef = channel === undefined ? cloudCredentialRef(provider) : channel.keyRef;
        if (keyRef === undefined)
            return;
        if (typeof props.credentials.unset !== 'function') {
            updateRow(target, { message: t('clearKeyUnsupported'), messageIsError: true });
            return;
        }
        updateRow(target, { saving: true, message: '', messageIsError: false });
        try {
            const response = await props.credentials.unset(keyRef);
            if (!response.ok)
                throw new Error(response.error?.message ?? t('clearKeyFailed'));
            updateRow(target, { keyStatus: 'missing', keyInput: '', testResult: undefined, message: t('keyCleared'), messageIsError: false });
        }
        catch (cause) {
            updateRow(target, { message: cause instanceof Error ? cause.message : String(cause), messageIsError: true });
        }
        finally {
            updateRow(target, { saving: false });
        }
    };
    const testResultText = (result) => {
        if (result === undefined)
            return '';
        if (result.ok)
            return t('testOk');
        if (result.reason === 'missing-key')
            return t('badgeMissing');
        if (result.reason === 'unauthorized')
            return t('testUnauthorized');
        return `${t('testFailed')}${result.message !== undefined && result.message.length > 0 ? `: ${providerErrorMessage(result.message)}` : ''}`;
    };
    const badgeOf = (provider, channel) => {
        if (provider === 'comfyui')
            return { text: t('comfyuiNoKey'), className: 'dsh-ig-badge dsh-ig-badge-neutral' };
        if (isSubscriptionProvider(provider)) {
            const status = subStatus[provider].state;
            if (status === 'logged-in')
                return { text: t('subBadgeLoggedIn'), className: 'dsh-ig-badge dsh-ig-badge-ok' };
            if (status === 'logged-out')
                return { text: t('subBadgeLoggedOut'), className: 'dsh-ig-badge dsh-ig-badge-missing' };
            return { text: t('subBadgeUnknown'), className: 'dsh-ig-badge dsh-ig-badge-neutral' };
        }
        const target = channel === undefined ? provider : compatChannelRowKey(channel.id);
        const status = rows[target].keyStatus;
        if (status === 'checking')
            return { text: t('badgeChecking'), className: 'dsh-ig-badge dsh-ig-badge-neutral dsh-ig-badge-checking' };
        if (status === 'configured')
            return { text: t('badgeConfigured'), className: 'dsh-ig-badge dsh-ig-badge-ok' };
        if (status === 'missing')
            return { text: t('badgeMissing'), className: 'dsh-ig-badge dsh-ig-badge-missing' };
        if (status === 'unavailable')
            return { text: t('badgeUnavailable'), className: 'dsh-ig-badge dsh-ig-badge-neutral' };
        return { text: t('badgeUnknown'), className: 'dsh-ig-badge dsh-ig-badge-neutral' };
    };
    const importWorkflow = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file === undefined)
            return;
        updateRow('comfyui', { message: '', messageIsError: false });
        try {
            if (file.size > MAX_COMFYUI_WORKFLOW_BYTES)
                throw new Error(t('workflowTooLarge'));
            const json = await file.text();
            validateComfyUIWorkflowJson(json);
            const name = uniqueComfyUIWorkflowName(file.name, rows.comfyui.workflows.map(entry => entry.name));
            setRows(current => ({ ...current, comfyui: { ...current.comfyui, workflows: [...current.comfyui.workflows, { name, json }], activeWorkflow: current.comfyui.activeWorkflow.length > 0 ? current.comfyui.activeWorkflow : name } }));
            updateRow('comfyui', { message: t('workflowImported', { name }), messageIsError: false });
        }
        catch (cause) {
            updateRow('comfyui', { message: cause instanceof Error ? cause.message : String(cause), messageIsError: true });
        }
    };
    /** Renaming the active entry keeps the active selection following its new name. */
    const renameWorkflow = (index, name) => {
        setRows(current => {
            const previous = current.comfyui.workflows[index];
            const workflows = current.comfyui.workflows.map((entry, position) => position === index ? { ...entry, name } : entry);
            const activeWorkflow = previous !== undefined && previous.name === current.comfyui.activeWorkflow ? name : current.comfyui.activeWorkflow;
            return { ...current, comfyui: { ...current.comfyui, workflows, activeWorkflow } };
        });
    };
    /** Removing the active entry moves the selection to the first remaining workflow. */
    const removeWorkflow = (index) => {
        setRows(current => {
            const previous = current.comfyui.workflows[index];
            const workflows = current.comfyui.workflows.filter((_entry, position) => position !== index);
            const activeWorkflow = previous !== undefined && previous.name === current.comfyui.activeWorkflow ? workflows[0]?.name ?? '' : current.comfyui.activeWorkflow;
            return { ...current, comfyui: { ...current.comfyui, workflows, activeWorkflow } };
        });
    };
    /** Editing one entry's preset leaves the rest of the entry untouched. */
    const setWorkflowPreset = (index, presetPrompt) => {
        setRows(current => {
            const workflows = current.comfyui.workflows.map((entry, position) => position === index ? { ...entry, presetPrompt } : entry);
            return { ...current, comfyui: { ...current.comfyui, workflows } };
        });
    };
    const commitCloudTimeout = () => {
        if (!Number.isInteger(cloudTimeoutSeconds) || cloudTimeoutSeconds < 5 || cloudTimeoutSeconds > 3600) {
            setCloudTimeoutSeconds((snapshot.value?.cloudTimeoutMs ?? DEFAULT_CLOUD_TIMEOUT_MS) / 1000);
            return;
        }
        const next = cloudTimeoutSeconds * 1000;
        if (next === (snapshot.value?.cloudTimeoutMs ?? DEFAULT_CLOUD_TIMEOUT_MS))
            return;
        setCloudTimeoutMessage('');
        void saveSetting('cloudTimeoutMs', next).catch((cause) => {
            setCloudTimeoutSeconds((snapshot.value?.cloudTimeoutMs ?? DEFAULT_CLOUD_TIMEOUT_MS) / 1000);
            setCloudTimeoutMessage(cause instanceof Error ? cause.message : String(cause));
        });
    };
    /** Workspace checkbox persists immediately, like every other toggle on this card. */
    const toggleSaveToWorkspace = (next) => {
        setSaveToWorkspace(next);
        setWorkspaceMessage('');
        setWorkspaceMessageIsError(false);
        void saveSetting('saveToWorkspace', next).catch((cause) => {
            setSaveToWorkspace(snapshot.value?.saveToWorkspace ?? true);
            setWorkspaceMessage(cause instanceof Error ? cause.message : String(cause));
            setWorkspaceMessageIsError(true);
        });
    };
    /** Folder input persists on Enter or blur; no save button needed. */
    const commitWorkspaceFolder = () => {
        const next = workspaceFolder.trim();
        if (next === (snapshot.value?.workspaceFolder ?? 'dsh-image-gen'))
            return;
        setWorkspaceMessage('');
        setWorkspaceMessageIsError(false);
        void saveSetting('workspaceFolder', next).then(() => {
            setWorkspaceMessage(t('saved'));
        }).catch((cause) => {
            setWorkspaceFolder(snapshot.value?.workspaceFolder ?? 'dsh-image-gen');
            setWorkspaceMessage(cause instanceof Error ? cause.message : String(cause));
            setWorkspaceMessageIsError(true);
        });
    };
    /** The pill toggle saves immediately, like the default-provider radio. */
    const toggleShowPill = (next) => {
        setShowPill(next);
        setUiMessage('');
        setUiMessageIsError(false);
        void saveSetting('showProviderPill', next).catch((cause) => {
            setShowPill(snapshot.value?.showProviderPill === true);
            setUiMessage(cause instanceof Error ? cause.message : String(cause));
            setUiMessageIsError(true);
        });
    };
    const renderCloudBody = (provider, channel) => {
        const target = channel === undefined ? provider : compatChannelRowKey(channel.id);
        const row = rows[target];
        const update = (patch) => { updateRow(target, patch); };
        const modelListId = `dsh-ig-${target.replace(/[^A-Za-z0-9_-]/g, '-')}-model-options`;
        const officialEditFormat = provider === 'openai-compat'
            ? compatEditFormat({ openaiCompatBaseURL: row.baseURL, openaiCompatModel: row.editModel.trim() || row.model }) : 'multipart';
        const automaticEditFormat = officialEditFormat !== 'multipart';
        const editFormat = automaticEditFormat ? officialEditFormat : row.editFormat;
        const keyRef = channel === undefined ? cloudCredentialRef(provider) ?? '' : channel.keyRef;
        const keyReadOnly = row.keyInfo?.writable === false;
        const keyUnavailable = !credentialsAvailable();
        const providerLabel = provider === 'openai-compat' && row.label.trim().length > 0 ? row.label.trim() : providerLabels[provider];
        const compatModelChoices = provider === 'openai-compat'
            ? resolveOpenAICompatModels({ openaiCompatModel: row.model, openaiCompatModels: [...row.models, ...row.modelOptions] })
            : [];
        return (_jsx("div", { className: "dsh-ig-provider-body", children: _jsxs("form", { onSubmit: (event) => { event.preventDefault(); void saveProviderRow(provider, channel); }, children: [provider === 'openai-compat' ? (_jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('channelName') }), _jsx("input", { className: "dsh-ig-input", value: row.label, onChange: event => { update({ label: event.target.value }); }, placeholder: providerLabels[provider], required: channel !== undefined, disabled: !settingsWritable })] })) : null, _jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('apiKeyLabel', { provider: providerLabel }) }), _jsx("input", { className: "dsh-ig-input", type: "password", autoComplete: "off", value: row.keyInput, onChange: event => { update({ keyInput: event.target.value }); }, placeholder: row.keyStatus === 'configured' ? t('apiKeyPlaceholder') : '', disabled: !settingsWritable || keyReadOnly || keyUnavailable }), _jsxs("span", { className: "dsh-ig-hint", children: [keyUnavailable ? t('credentialsUnavailable')
                                        : keyReadOnly ? t('keyReadOnly', { source: row.keyInfo?.source ?? '' })
                                            : t('apiKeyHint', { key: keyRef }), channel === undefined && API_KEY_CONSOLE_URLS[provider] !== undefined ? (_jsxs(_Fragment, { children: [' ', _jsx("a", { className: "dsh-ig-link", href: API_KEY_CONSOLE_URLS[provider], target: "_blank", rel: "noopener noreferrer", children: t('getApiKey') })] })) : null] })] }), _jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('endpoint') }), _jsxs("div", { className: "dsh-ig-input-group", children: [_jsx("input", { className: "dsh-ig-input", type: "url", value: row.baseURL, onChange: event => { update({ baseURL: event.target.value }); }, required: true, disabled: !settingsWritable }), provider !== 'openai-compat' ? (_jsx("button", { type: "button", className: "dsh-ig-btn-reset", title: t('resetTitle'), onClick: () => { update({ baseURL: DEFAULT_BASE_URLS[provider] }); }, disabled: !settingsWritable, children: t('reset') })) : null] }), _jsx("span", { className: "dsh-ig-hint", children: t(provider === 'google' && row.googleNative ? 'endpointHintGoogleNative' : CLOUD_HINT_KEYS[provider]) })] }), provider === 'google' ? (_jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('googleProtocol') }), _jsxs("select", { className: "dsh-ig-input", value: row.googleNative ? 'native' : 'interactions', onChange: event => { update({ googleNative: event.target.value === 'native' }); }, disabled: !settingsWritable, children: [_jsx("option", { value: "interactions", children: t('googleInteractions') }), _jsx("option", { value: "native", children: t('googleNative') })] })] })) : null, _jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t(provider === 'openai-compat' ? 'defaultModel' : 'model') }), modelPullSupported(provider) ? (_jsxs("div", { className: "dsh-ig-input-group", children: [_jsx("input", { className: "dsh-ig-input", value: row.model, onChange: event => { update({ model: event.target.value }); }, onBlur: () => {
                                            if (provider === 'openai-compat')
                                                update({ models: resolveOpenAICompatModels({ openaiCompatModel: row.model, openaiCompatModels: row.models }) });
                                        }, list: modelListId, required: provider !== 'openai-compat', disabled: !settingsWritable }), _jsx("datalist", { id: modelListId, children: row.modelOptions.map(id => _jsx("option", { value: id }, id)) }), _jsx("button", { type: "button", className: "dsh-ig-btn-secondary", disabled: row.fetchingModels || row.saving || !settingsWritable, onClick: () => { void fetchProviderModels(provider, channel); }, children: row.fetchingModels ? t('fetchingModels') : t('fetchModels') })] })) : (_jsx("input", { className: "dsh-ig-input", value: row.model, onChange: event => { update({ model: event.target.value }); }, required: true, disabled: !settingsWritable })), modelPullSupported(provider) ? (row.modelFetchMessage.length > 0 ? (_jsx("span", { className: `dsh-ig-hint${row.modelFetchIsError ? ' dsh-ig-hint-error' : ''}`, role: "status", children: row.modelFetchMessage })) : (_jsx("span", { className: "dsh-ig-hint", children: t('fetchModelsHint') }))) : null] }), provider === 'openai-compat' && compatModelChoices.length > 0 ? (_jsxs("div", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('availableModels') }), _jsx("div", { className: "dsh-ig-model-picker", children: compatModelChoices.map(id => {
                                    const isDefault = row.model.trim() === id;
                                    const checked = isDefault || row.models.includes(id);
                                    return (_jsxs("label", { className: "dsh-ig-check-row", title: id, children: [_jsx("input", { type: "checkbox", checked: checked, disabled: !settingsWritable || isDefault, onChange: event => {
                                                    const models = event.target.checked ? [...row.models, id] : row.models.filter(model => model !== id);
                                                    update({ models: resolveOpenAICompatModels({ openaiCompatModel: row.model, openaiCompatModels: models }) });
                                                } }), _jsx("span", { className: "dsh-ig-model-option", children: id }), isDefault ? _jsx("span", { className: "dsh-ig-model-default", children: t('defaultModelTag') }) : null] }, id));
                                }) }), _jsx("span", { className: "dsh-ig-hint", children: t('availableModelsHint') })] })) : null, provider === 'openai-compat' ? (_jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('editModel') }), _jsx("input", { className: "dsh-ig-input", value: row.editModel, onChange: event => { update({ editModel: event.target.value }); }, list: modelListId, disabled: !settingsWritable }), _jsx("span", { className: "dsh-ig-hint", children: t('editModelHint') })] })) : null, provider === 'openai-compat' ? (_jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('editFormat') }), _jsxs("select", { className: "dsh-ig-input", value: automaticEditFormat ? '__official__' : row.editFormat, onChange: event => { update({ editFormat: parseEditFormat(event.target.value) }); }, disabled: !settingsWritable || automaticEditFormat, children: [automaticEditFormat ? _jsx("option", { value: "__official__", children: t('editFormatAutomatic') }) : null, _jsx("option", { value: "multipart", children: t('editFormatMultipart') }), _jsx("option", { value: "jsonImageUrlArray", children: t('editFormatJsonImageUrlArray') }), _jsx("option", { value: "formReferenceImages", children: t('editFormatFormReferenceImages') }), _jsx("option", { value: "siliconflowJson", children: t('editFormatSiliconFlow') })] }), _jsx("span", { className: "dsh-ig-hint", children: t(editFormat === 'siliconflowJson' ? 'editFormatSiliconFlowHint' : 'editFormatHint') })] })) : null, provider === 'seedream' ? (_jsxs(_Fragment, { children: [_jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('arkOutputFormat') }), _jsxs("select", { className: "dsh-ig-input", value: row.outputFormat, onChange: event => { update({ outputFormat: event.target.value === 'png' ? 'png' : 'jpeg' }); }, disabled: !settingsWritable, children: [_jsx("option", { value: "jpeg", children: t('arkOutputFormatJpeg') }), _jsx("option", { value: "png", children: t('arkOutputFormatPng') })] }), _jsx("span", { className: "dsh-ig-hint", children: t('arkOutputFormatHint') })] }), _jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('arkWatermark') }), _jsxs("select", { className: "dsh-ig-input", value: row.watermark ? 'on' : 'off', onChange: event => { update({ watermark: event.target.value === 'on' }); }, disabled: !settingsWritable, children: [_jsx("option", { value: "on", children: t('arkWatermarkOn') }), _jsx("option", { value: "off", children: t('arkWatermarkOff') })] }), _jsx("span", { className: "dsh-ig-hint", children: t('arkWatermarkHint') })] }), _jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('arkBackground') }), _jsxs("select", { className: "dsh-ig-input", value: row.background, onChange: event => { update({ background: event.target.value === 'transparent' ? 'transparent' : 'opaque' }); }, disabled: !settingsWritable, children: [_jsx("option", { value: "opaque", children: t('arkBackgroundOpaque') }), _jsx("option", { value: "transparent", children: t('arkBackgroundTransparent') })] }), _jsx("span", { className: "dsh-ig-hint", children: t('arkBackgroundHint') })] })] })) : null, provider === 'openai' || provider === 'openai-compat' ? (_jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('sizeTable') }), _jsx("textarea", { className: "dsh-ig-input dsh-ig-textarea", value: row.sizeTableText, onChange: event => { update({ sizeTableText: event.target.value }); }, rows: 3, disabled: !settingsWritable }), _jsx("span", { className: "dsh-ig-hint", children: t('sizeTableHint') })] })) : null, provider === 'openai-compat' ? (_jsxs(_Fragment, { children: [_jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('defaultQuality') }), _jsx("input", { className: "dsh-ig-input", value: row.generationQuality, onChange: event => { update({ generationQuality: event.target.value }); }, placeholder: "high", disabled: !settingsWritable }), _jsx("span", { className: "dsh-ig-hint", children: t('defaultQualityHint') })] }), _jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('qualityOptions') }), _jsx("input", { className: "dsh-ig-input", value: row.qualityOptionsText, onChange: event => { update({ qualityOptionsText: event.target.value }); }, disabled: !settingsWritable })] }), _jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('generateExtra') }), _jsx("textarea", { className: "dsh-ig-input dsh-ig-textarea", value: row.generateExtraText, onChange: event => { update({ generateExtraText: event.target.value }); }, placeholder: '{"watermark":false}', rows: 2, disabled: !settingsWritable }), _jsx("span", { className: "dsh-ig-hint", children: t('generateExtraHint') })] })] })) : null, provider === 'openai-compat' && (editFormat === 'jsonImageUrlArray' || editFormat === 'qwenJson' || editFormat === 'siliconflowJson') ? (_jsxs(_Fragment, { children: [editFormat === 'jsonImageUrlArray' ? (_jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('editSizeMode') }), _jsxs("select", { className: "dsh-ig-input", value: row.editSizeMode, onChange: event => { update({ editSizeMode: event.target.value === 'selected' ? 'selected' : 'auto' }); }, disabled: !settingsWritable, children: [_jsx("option", { value: "auto", children: t('editSizeAuto') }), _jsx("option", { value: "selected", children: t('editSizeSelected') })] })] })) : null, _jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('editExtra') }), _jsx("textarea", { className: "dsh-ig-input dsh-ig-textarea", value: row.editExtraText, onChange: event => { update({ editExtraText: event.target.value }); }, placeholder: t('editExtraPlaceholder'), rows: 2, disabled: !settingsWritable }), _jsx("span", { className: "dsh-ig-hint", children: t('editExtraHint') })] })] })) : null, _jsxs("div", { className: "dsh-ig-row-actions", children: [_jsx("p", { className: `dsh-ig-status${row.messageIsError ? ' dsh-ig-status-error' : ''}`, role: "status", children: row.message || testResultText(row.testResult) }), _jsxs("span", { className: "dsh-ig-row-buttons", children: [_jsx("button", { type: "button", className: "dsh-ig-btn-secondary", disabled: row.testing || row.saving, onClick: () => { void testConnection(provider, channel); }, children: row.testing ? t('testing') : t('testConnection') }), row.keyStatus === 'configured' && !keyReadOnly ? (_jsx("button", { type: "button", className: "dsh-ig-btn-secondary dsh-ig-btn-danger", disabled: row.saving, onClick: () => { void clearProviderKey(provider, channel); }, children: t('clearKey') })) : null, _jsx("button", { className: "dsh-ig-save", type: "submit", disabled: row.saving || row.testing || row.fetchingModels || !settingsWritable, children: row.saving ? t('saving') : t('save') })] })] })] }) }));
    };
    const renderComfyUIBody = () => {
        const row = rows.comfyui;
        return (_jsx("div", { className: "dsh-ig-provider-body", children: _jsxs("form", { onSubmit: (event) => { event.preventDefault(); void saveProviderRow('comfyui'); }, children: [_jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('endpoint') }), _jsxs("div", { className: "dsh-ig-input-group", children: [_jsx("input", { className: "dsh-ig-input", type: "url", value: row.baseURL, onChange: event => { updateRow('comfyui', { baseURL: event.target.value }); }, required: true, disabled: !settingsWritable }), _jsx("button", { type: "button", className: "dsh-ig-btn-reset", title: t('resetTitle'), onClick: () => { updateRow('comfyui', { baseURL: DEFAULT_BASE_URLS.comfyui }); }, disabled: !settingsWritable, children: t('reset') })] }), _jsx("span", { className: "dsh-ig-hint", children: t('endpointHintComfyUI') })] }), _jsxs("div", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('workflow') }), _jsxs("div", { className: "dsh-ig-file-row", children: [_jsxs("label", { className: "dsh-ig-file-button", children: [_jsx("input", { className: "dsh-ig-file-input", type: "file", accept: ".json,application/json", onChange: event => { void importWorkflow(event); } }), t('workflowImport')] }), row.workflows.length === 0 ? _jsx("span", { className: "dsh-ig-file-name", children: t('workflowMissing') }) : null] }), row.workflows.length > 0 ? (_jsx("ul", { className: "dsh-ig-workflow-list", children: row.workflows.map((entry, index) => (_jsxs("li", { className: "dsh-ig-workflow-row", children: [_jsxs("div", { className: "dsh-ig-workflow-main", children: [_jsx("label", { className: "dsh-ig-workflow-active", title: t('workflowActiveTitle'), children: _jsx("input", { type: "radio", name: "dsh-ig-active-workflow", "aria-label": t('workflowActiveTitle'), checked: entry.name === row.activeWorkflow, onChange: () => { updateRow('comfyui', { activeWorkflow: entry.name }); } }) }), _jsx("input", { className: "dsh-ig-input dsh-ig-workflow-name", value: entry.name, title: entry.name, onChange: event => { renameWorkflow(index, event.target.value); } }), _jsx("button", { type: "button", className: "dsh-ig-btn-reset", onClick: () => { removeWorkflow(index); }, children: t('workflowRemove') })] }), _jsx("input", { className: "dsh-ig-input dsh-ig-workflow-preset", value: entry.presetPrompt ?? '', placeholder: t('workflowPresetPlaceholder'), title: t('workflowPresetTitle'), onChange: event => { setWorkflowPreset(index, event.target.value); } })] }, String(index)))) })) : null, _jsx("span", { className: "dsh-ig-hint", children: t('workflowHint') })] }), _jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('timeout') }), _jsx("input", { className: "dsh-ig-input", type: "number", min: "1", max: "3600", step: "1", value: row.timeoutSeconds, onChange: event => { updateRow('comfyui', { timeoutSeconds: Number(event.target.value) }); }, required: true, disabled: !settingsWritable }), _jsx("span", { className: "dsh-ig-hint", children: t('timeoutHint') })] }), _jsxs("div", { className: "dsh-ig-row-actions", children: [_jsx("p", { className: `dsh-ig-status${row.messageIsError ? ' dsh-ig-status-error' : ''}`, role: "status", children: row.message || testResultText(row.testResult) }), _jsxs("span", { className: "dsh-ig-row-buttons", children: [_jsx("button", { type: "button", className: "dsh-ig-btn-secondary", disabled: row.testing, onClick: () => { void testConnection('comfyui'); }, children: row.testing ? t('testing') : t('testConnection') }), _jsx("button", { className: "dsh-ig-save", type: "submit", disabled: row.saving || !settingsWritable || row.workflows.length === 0, children: row.saving ? t('saving') : t('save') })] })] })] }) }));
    };
    /** Subscription rows: account login/logout, fixed model, edit limitation. */
    const renderSubscriptionBody = (provider) => {
        const row = rows[provider];
        const status = subStatus[provider];
        const busy = subBusy[provider];
        return (_jsx("div", { className: "dsh-ig-provider-body", children: _jsxs("form", { onSubmit: (event) => { event.preventDefault(); void saveProviderRow(provider); }, children: [_jsxs("div", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('subSectionTitle') }), _jsx("p", { className: "dsh-ig-hint", children: t('subHint') }), _jsx("p", { className: "dsh-ig-hint", role: "note", children: t('subProxyHint') })] }), _jsxs("div", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('subAccountLabel') }), _jsx("p", { className: "dsh-ig-hint", children: status.state === 'logged-in'
                                    ? t('subAccountEmail', { email: status.email ?? '' })
                                    : status.state === 'logged-out' ? t('subAccountNone') : t('subBadgeUnknown') }), _jsx("span", { className: "dsh-ig-row-buttons", children: status.state === 'logged-in'
                                    ? _jsx("button", { type: "button", className: "dsh-ig-btn-secondary", disabled: busy !== undefined, onClick: () => { void subscriptionLogout(provider); }, children: busy === 'logout' ? t('subLoggingOut') : t('subLogout') })
                                    : _jsx("button", { type: "button", className: "dsh-ig-save", disabled: busy !== undefined, onClick: () => { void subscriptionLogin(provider); setSubTick(tick => tick + 1); }, children: busy === 'login' ? t('subLoggingIn') : t('subLogin') }) })] }), _jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('subModelLabel') }), _jsx("input", { className: "dsh-ig-input", type: "text", value: row.model, readOnly: true, disabled: true }), _jsx("span", { className: "dsh-ig-hint", children: t('subModelHint') })] }), _jsx("div", { className: "dsh-ig-field", children: _jsx("span", { className: "dsh-ig-hint", children: t('subEditCapability') }) }), _jsxs("div", { className: "dsh-ig-row-actions", children: [_jsx("p", { className: `dsh-ig-status${row.messageIsError ? ' dsh-ig-status-error' : ''}`, role: "status", children: row.message || testResultText(row.testResult) }), _jsxs("span", { className: "dsh-ig-row-buttons", children: [_jsx("button", { type: "button", className: "dsh-ig-btn-secondary", disabled: row.testing, onClick: () => { void testConnection(provider); setSubTick(tick => tick + 1); }, children: row.testing ? t('testing') : t('testConnection') }), _jsx("button", { className: "dsh-ig-save", type: "submit", disabled: row.saving || !settingsWritable, children: row.saving ? t('saving') : t('save') })] })] })] }) }));
    };
    // Providers keep their collapse: the plugin page is the settings surface now,
    // and a dozen providers expanded at once would make it far too long. The row
    // carries no card chrome — the header is a plain row and the body sits
    // directly under it on the page.
    const renderProviderRow = (provider) => {
        const row = rows[provider];
        const badge = badgeOf(provider);
        const label = provider === 'openai-compat' && row.label.trim().length > 0 ? row.label.trim() : providerLabels[provider];
        return (_jsxs("div", { className: "dsh-ig-provider-row", children: [_jsxs("div", { className: "dsh-ig-provider-head-row", children: [_jsxs("button", { type: "button", className: "dsh-ig-provider-head", "aria-expanded": row.expanded, onClick: () => { updateRow(provider, { expanded: !row.expanded }); }, children: [_jsx("span", { className: "dsh-ig-provider-name", children: label }), _jsxs("span", { className: badge.className, title: badge.text, children: [_jsx("span", { className: "dsh-ig-badge-dot", "aria-hidden": "true" }), badge.text] }), _jsx("span", { className: `dsh-ig-provider-chevron ${row.expanded ? 'dsh-ig-provider-chevron-open' : ''}`, "aria-hidden": "true", children: _jsx("svg", { width: "12", height: "12", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M4 6l4 4 4-4" }) }) })] }), provider === 'openai-compat' ? _jsx("button", { type: "button", className: "dsh-ig-btn-secondary dsh-ig-channel-add", title: t('addCompatChannel'), "aria-label": t('addCompatChannel'), onClick: addCompatChannel, disabled: !settingsWritable, children: _jsx("svg", { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", "aria-hidden": "true", children: _jsx("path", { d: "M8 3v10M3 8h10" }) }) }) : null] }), row.expanded ? (provider === 'comfyui' ? renderComfyUIBody() : isSubscriptionProvider(provider) ? renderSubscriptionBody(provider) : renderCloudBody(provider)) : null] }, provider));
    };
    const renderCompatChannelRow = (channel) => {
        const target = compatChannelRowKey(channel.id);
        const row = rows[target];
        const badge = badgeOf('openai-compat', channel);
        return (_jsxs("div", { className: "dsh-ig-provider-row dsh-ig-compat-channel-row", children: [_jsxs("div", { className: "dsh-ig-provider-head-row", children: [_jsxs("button", { type: "button", className: "dsh-ig-provider-head", "aria-expanded": row.expanded, onClick: () => { updateRow(target, { expanded: !row.expanded }); }, children: [_jsx("span", { className: "dsh-ig-provider-name", children: channel.label }), _jsxs("span", { className: badge.className, title: badge.text, children: [_jsx("span", { className: "dsh-ig-badge-dot", "aria-hidden": "true" }), badge.text] }), _jsx("span", { className: `dsh-ig-provider-chevron ${row.expanded ? 'dsh-ig-provider-chevron-open' : ''}`, "aria-hidden": "true", children: _jsx("svg", { width: "12", height: "12", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M4 6l4 4 4-4" }) }) })] }), _jsx("button", { type: "button", className: "dsh-ig-btn-secondary dsh-ig-btn-danger", disabled: row.saving || !settingsWritable, onClick: () => { void removeCompatChannel(channel); }, children: t('removeChannel') })] }), row.expanded ? renderCloudBody('openai-compat', channel) : null] }, target));
    };
    return (_jsxs("li", { className: "dsh-ig-card", children: [_jsx("div", { className: "dsh-ig-head", children: _jsxs("span", { className: "dsh-ig-head-text", children: [_jsx("span", { className: "dsh-ig-title", children: t('title') }), _jsx("span", { className: "dsh-ig-desc", children: t('description') })] }) }), _jsxs("div", { className: "dsh-ig-body", children: [settingsMessage !== undefined ? _jsx("p", { className: "dsh-ig-status dsh-ig-status-readonly", role: "note", children: settingsMessage }) : null, _jsxs("div", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('defaultProvider') }), _jsx("div", { className: "dsh-ig-radios", role: "radiogroup", "aria-label": t('defaultProvider'), children: IMAGE_PROVIDERS.map(provider => (_jsxs("label", { className: `dsh-ig-radio${defaultProvider === provider ? ' dsh-ig-radio-checked' : ''}`, children: [_jsx("input", { type: "radio", name: "dsh-ig-default-provider", checked: defaultProvider === provider, onChange: () => { selectDefaultProvider(provider); }, disabled: !settingsWritable }), providerLabels[provider]] }, provider))) }), _jsx("span", { className: "dsh-ig-hint", children: t('defaultProviderHint') }), providerMessage.length > 0 ? _jsx("span", { className: `dsh-ig-status${providerMessageIsError ? ' dsh-ig-status-error' : ''}`, role: "status", children: providerMessage }) : null] }), _jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('cloudTimeout') }), _jsx("input", { className: "dsh-ig-input", type: "number", min: "5", max: "3600", step: "1", value: cloudTimeoutSeconds, onChange: event => { setCloudTimeoutSeconds(Number(event.target.value)); }, onBlur: () => { commitCloudTimeout(); }, onKeyDown: event => { if (event.key === 'Enter')
                                    commitCloudTimeout(); }, required: true, disabled: !settingsWritable }), _jsx("span", { className: "dsh-ig-hint", children: t('cloudTimeoutHint') }), cloudTimeoutMessage.length > 0 ? _jsx("span", { className: "dsh-ig-status dsh-ig-status-error", role: "status", children: cloudTimeoutMessage }) : null] }), _jsx("div", { className: "dsh-ig-providers", children: IMAGE_PROVIDERS.flatMap(provider => [
                            renderProviderRow(provider),
                            ...(provider === 'openai-compat' ? compatChannels.map(channel => renderCompatChannelRow(channel)) : []),
                        ]) }), _jsxs("div", { className: "dsh-ig-section", children: [_jsx("span", { className: "dsh-ig-section-title", children: t('workspaceSection') }), _jsxs("div", { className: "dsh-ig-field", children: [_jsxs("label", { className: "dsh-ig-check-row", children: [_jsx("input", { type: "checkbox", checked: saveToWorkspace, onChange: event => { toggleSaveToWorkspace(event.target.checked); }, disabled: !settingsWritable }), _jsx("span", { className: "dsh-ig-label", children: t('saveToWorkspace') })] }), _jsx("span", { className: "dsh-ig-hint", children: t('saveToWorkspaceHint') })] }), saveToWorkspace ? (_jsxs("label", { className: "dsh-ig-field", children: [_jsx("span", { className: "dsh-ig-label", children: t('folder') }), _jsx("input", { className: "dsh-ig-input", value: workspaceFolder, onChange: event => { setWorkspaceFolder(event.target.value); }, onBlur: () => { commitWorkspaceFolder(); }, onKeyDown: event => { if (event.key === 'Enter')
                                            commitWorkspaceFolder(); }, placeholder: "dsh-image-gen", disabled: !settingsWritable }), _jsx("span", { className: "dsh-ig-hint", children: t('folderHint') })] })) : null, workspaceMessage.length > 0 ? _jsx("p", { className: `dsh-ig-status${workspaceMessageIsError ? ' dsh-ig-status-error' : ''}`, role: "status", children: workspaceMessage }) : null] }), _jsxs("div", { className: "dsh-ig-section", children: [_jsx("span", { className: "dsh-ig-section-title", children: t('uiSection') }), _jsxs("div", { className: "dsh-ig-field", children: [_jsxs("label", { className: "dsh-ig-check-row", children: [_jsx("input", { type: "checkbox", checked: showPill, onChange: event => { toggleShowPill(event.target.checked); }, disabled: !settingsWritable }), _jsx("span", { className: "dsh-ig-label", children: t('showPill') })] }), _jsx("span", { className: "dsh-ig-hint", children: t('showPillHint') }), uiMessage.length > 0 ? _jsx("p", { className: `dsh-ig-status${uiMessageIsError ? ' dsh-ig-status-error' : ''}`, role: "status", children: uiMessage }) : null] })] })] })] }));
}
/** Keep the legacy Tool row for old DSH and hand modern results to the independent Chat node. */
function modelOf(provider, value) {
    const stored = provider === 'comfyui'
        ? activeComfyUIWorkflow(value ?? {})?.name
        : isSubscriptionProvider(provider)
            ? DEFAULT_MODELS[provider]
            : value?.[CLOUD_MODEL_FIELDS[provider]];
    // A retired Seedream model runs on its replacement; show that one (saving rewrites it).
    if (provider === 'seedream')
        return currentSeedreamModel(typeof stored === 'string' ? stored : undefined);
    return typeof stored === 'string' && stored.length > 0 ? stored : DEFAULT_MODELS[provider];
}
function baseURLOf(provider, value) {
    const stored = provider === 'comfyui'
        ? value?.comfyuiBaseURL
        : isSubscriptionProvider(provider)
            ? ''
            : value?.[CLOUD_URL_FIELDS[provider]];
    return typeof stored === 'string' && stored.length > 0 ? stored : DEFAULT_BASE_URLS[provider];
}
//# sourceMappingURL=index.js.map