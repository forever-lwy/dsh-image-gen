/**
 * Subscription account manager: login flows, blob storage through the DSH
 * Credentials service, token refresh with per-account locking, and image
 * generation on the logged-in account.
 *
 * The account store pattern follows @goodandready/dsh-subscriptions (MIT,
 * (c) 2026 GooDAnDReaDY) lib/accounts.js, trimmed to one account per vendor
 * (no rotation, no cooldowns) because this bundle has one account per vendor
 * and no chat adapter to protect.
 *
 * Isolation invariants (project rules):
 * - OAuth blobs live under SUBSCRIPTION_OAUTH_* refs, never the API-key refs.
 * - Login/logout never touches any other setting or credential.
 * - The browser side never sees a token; it sees the authorize URL and
 *   status words only. Generation happens host-side, mirroring every other
 *   adapter in this bundle.
 */
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { createPkce } from './oauth.js';
import { startLoopback } from './loopback.js';
import { parseBlob, serializeBlob } from './blob.js';
import { CODEX_IMAGE_EDIT_URL, CODEX_IMAGE_MODEL, CODEX_IMAGE_URL, CODEX_REDIRECT_URI, codexAuthorizeUrl, codexConfig, codexExchangeCode, codexIdentityHeaders, codexRefresh, } from './vendors/codex.js';
import { GROK_IMAGE_EDIT_URL, GROK_IMAGE_MODEL, GROK_IMAGE_URL, GROK_REDIRECT_URI, grokAuthorizeUrl, grokConfig, grokExchangeCode, grokIdentityHeaders, grokRefresh, } from './vendors/grok.js';
import { ANTIGRAVITY_REDIRECT_URI, antigravityAuthorizeUrl, antigravityConfig, antigravityExchangeCode, antigravityGenerateImage, antigravityRefresh, antigravityResolveProjectContext, } from './vendors/antigravity.js';
import { SUBSCRIPTION_PROVIDER_DISPLAY_NAMES } from '../shared.js';
import { xaiToolParameters } from '../xai-params.js';
import { redactSecrets } from '../redact.js';
/** The vendor each dsh-image-gen subscription provider maps onto. */
export function vendorOf(provider) {
    if (provider === 'chatgpt-sub')
        return 'codex';
    if (provider === 'google-sub')
        return 'antigravity';
    return 'grok';
}
/** Credential ref one vendor's OAuth blob is stored under (index fixed at 1). */
export function subscriptionOauthRef(vendor) {
    return credentialRef(`${vendor.toUpperCase()}_OAUTH_1`);
}
/** Sizes both vendors understand. */
export const SUBSCRIPTION_SIZES = ['1024x1024', '1024x1536', '1536x1024', 'auto'];
/**
 * Reference images per edit call. Every subscription channel accepts at
 * least this many (Codex edits up to 16, Grok up to 5, Antigravity up to 10),
 * so 5 keeps one shared guard in line with the Studio UI's upload cap.
 */
export const SUBSCRIPTION_MAX_REFERENCE_IMAGES = 5;
/**
 * Per-application manager instance. Constructed once in the plugin entry,
 * owns the pending-login map (PKCE state to login session) and the refresh
 * locks; nothing here is persisted except the blobs themselves.
 */
/** Provider names by vendor for login-result pages and errors. */
function providerNameOf(vendor) {
    return SUBSCRIPTION_PROVIDER_DISPLAY_NAMES[vendor === 'codex' ? 'chatgpt-sub' : vendor === 'antigravity' ? 'google-sub' : 'grok-sub'];
}
export class SubscriptionManager {
    ctx;
    pending = new Map();
    refreshLocks = new Map();
    /** Cheap in-memory expiry cache so badges do not hit credentials on read. */
    blobCache = new Map();
    /** Antigravity needs a per-account project id on every generation call. */
    projectCache = new Map();
    constructor(ctx) {
        this.ctx = ctx;
    }
    /** Read a vendor's stored blob, or undefined when signed out. */
    async readBlob(vendor) {
        try {
            const resolved = await this.ctx.credentials.resolve(subscriptionOauthRef(vendor));
            const raw = resolved?.value ?? '';
            if (raw.trim().length === 0)
                return undefined;
            return parseBlob(raw);
        }
        catch {
            return undefined;
        }
    }
    /** Login status for the settings card; never throws. */
    async loginStatus(vendor) {
        const blob = await this.readBlob(vendor);
        if (blob === undefined)
            return { state: 'logged-out' };
        return { state: 'logged-in', email: blob.email };
    }
    /**
     * Begin a login: registers PKCE state, starts the loopback catch server on
     * the vendor-fixed redirect port, and returns the authorize URL for the
     * browser to open. Completion lands in the loopback callback.
     */
    async beginLogin(vendor) {
        const redirectUri = vendor === 'codex' ? CODEX_REDIRECT_URI
            : vendor === 'antigravity' ? ANTIGRAVITY_REDIRECT_URI
                : GROK_REDIRECT_URI;
        const pkce = await createPkce();
        this.pending.set(pkce.state, { vendor, pkce });
        const url = vendor === 'codex' ? codexAuthorizeUrl(codexConfig(), pkce)
            : vendor === 'antigravity' ? antigravityAuthorizeUrl(antigravityConfig(), pkce)
                : grokAuthorizeUrl(grokConfig(), pkce);
        // The catch server must be listening before the browser opens, otherwise
        // the redirect to localhost:<port> hits a dead port and the login hangs.
        startLoopback({
            redirectUri,
            onCode: async (params) => await this.completeLoginFromCallback(vendor, params.get('code') ?? '', params.get('state') ?? ''),
        }).catch(() => { });
        return { url };
    }
    /** Loopback callback: validate state, exchange the code, store the blob. */
    async completeLoginFromCallback(vendor, code, state) {
        if (code.length === 0)
            throw new Error('callback carried no authorization code');
        const row = this.pending.get(state);
        if (row === undefined || row.vendor !== vendor)
            throw new Error('login session expired; start again');
        this.pending.delete(state);
        const blob = vendor === 'codex'
            ? await codexExchangeCode(codexConfig(), row.pkce, code)
            : vendor === 'antigravity'
                ? await antigravityExchangeCode(antigravityConfig(), row.pkce, code)
                : await grokExchangeCode(grokConfig(), row.pkce, code);
        await this.saveBlob(vendor, blob);
        return `<!doctype html><meta charset="utf-8"><title>dsh-image-gen</title><p lang="zh-CN">${providerNameOf(vendor)} 登录成功（${escapeHtml(blob.email)}），可以关闭此页返回设置。</p><p lang="en">${providerNameOf(vendor)} sign-in successful (${escapeHtml(blob.email)}). You can close this page and return to settings.</p>`;
    }
    /** Sign out: clear the blob and the caches. No other setting changes. */
    async logout(vendor) {
        await this.ctx.credentials.unset(subscriptionOauthRef(vendor));
        this.blobCache.delete(vendor);
        this.projectCache.clear();
    }
    async saveBlob(vendor, blob) {
        await this.ctx.credentials.set(subscriptionOauthRef(vendor), serializeBlob(blob));
        this.blobCache.set(vendor, blob);
    }
    /**
     * Return a blob whose access token is usable; refreshes first when the
     * stored one is expired (or expiring within the skew window). Single-flight
     * per vendor so concurrent generate calls share one refresh.
     */
    async ensureFresh(vendor) {
        const blob = await this.readBlob(vendor);
        if (blob === undefined)
            throw notLoggedInError(vendor);
        if (blob.refreshToken.length === 0)
            return blob;
        const SKEW_MS = 60_000;
        if (blob.expiresAt !== 0 && blob.expiresAt - SKEW_MS > Date.now())
            return blob;
        const inflight = this.refreshLocks.get(vendor);
        if (inflight !== undefined)
            return inflight;
        const refresh = (async () => {
            const next = vendor === 'codex' ? await codexRefresh(blob)
                : vendor === 'antigravity' ? await antigravityRefresh(blob)
                    : await grokRefresh(blob);
            const merged = {
                ...next,
                refreshToken: next.refreshToken.length > 0 ? next.refreshToken : blob.refreshToken,
                accountId: next.accountId.length > 0 ? next.accountId : blob.accountId,
            };
            await this.saveBlob(vendor, merged);
            return merged;
        })().finally(() => { this.refreshLocks.delete(vendor); });
        this.refreshLocks.set(vendor, refresh);
        return refresh;
    }
    /** Generate one image through the logged-in account. b64 reply decoded host-side. */
    async generate(options) {
        const { vendor, prompt } = options;
        const session = await this.ensureFresh(vendor);
        const text = prompt.trim();
        if (text.length === 0)
            throw new Error('prompt must be a non-empty string');
        const references = options.referenceImages ?? [];
        if (references.length > SUBSCRIPTION_MAX_REFERENCE_IMAGES) {
            throw new Error(`订阅生图最多支持 ${String(SUBSCRIPTION_MAX_REFERENCE_IMAGES)} 张参考图，当前 ${String(references.length)} 张`);
        }
        // Antigravity speaks the Gemini contents protocol, not OpenAI-style
        // generations; it gets its own wire call and skips the shared shape below.
        if (vendor === 'antigravity') {
            const projectContext = await this.ensureAntigravityProject(session, options.signal);
            const aspectRatio = antigravityAspectRatioOf(options.size);
            const result = await antigravityGenerateImage({
                blob: session,
                projectId: projectContext.projectId,
                projectContext,
                prompt: text,
                ...(aspectRatio !== undefined ? { aspectRatio } : {}),
                hd: options.quality === 'hd' || options.quality === 'high',
                ...(references.length > 0 ? { referenceImages: references } : {}),
                ...(options.signal !== undefined ? { signal: options.signal } : {}),
            });
            return [{ b64_json: result.b64 }];
        }
        let url;
        let headers;
        let body;
        if (vendor === 'codex') {
            // Codex edits ride a sibling endpoint with the same identity headers;
            // reference images go as data-URL image_url entries (JSON, not multipart).
            url = references.length > 0 ? CODEX_IMAGE_EDIT_URL : CODEX_IMAGE_URL;
            headers = codexIdentityHeaders(session);
            body = {
                prompt: codexPromptWithSize(text, options.size),
                model: CODEX_IMAGE_MODEL,
                ...(references.length > 0 ? { images: references.map(image => ({ image_url: toDataUrl(image) })) } : {}),
                ...(options.size !== undefined && options.size.length > 0 ? { size: options.size } : {}),
                ...(options.quality !== undefined && options.quality.length > 0 ? { quality: options.quality } : {}),
            };
        }
        else {
            // Grok edits ride the public /v1/images/edits JSON endpoint; reference
            // images go as typed image_url entries (JSON, not multipart).
            url = references.length > 0 ? GROK_IMAGE_EDIT_URL : GROK_IMAGE_URL;
            headers = grokIdentityHeaders(session);
            // Grok thinks in aspect ratios, not sizes. W:H strings pass through;
            // legacy pixel sizes map to their exact supported ratio. Unsupported
            // sizes fail explicitly. Quality tier '1k'/'2k' goes to `resolution`;
            // low/medium/high stay on `quality` for backwards compatibility.
            const xaiParams = xaiToolParameters({
                ...(options.size === undefined ? {} : options.size === 'auto' || options.size.includes(':') ? { aspectRatio: options.size } : { size: options.size }),
                ...(options.quality === '1k' || options.quality === '2k' ? { imageSize: options.quality } : {}),
            });
            const level = options.quality === 'low' ? 'low' : (options.quality === 'medium' || options.quality === 'high') ? 'medium' : undefined;
            body = {
                prompt: text,
                model: GROK_IMAGE_MODEL,
                response_format: 'b64_json',
                ...(references.length === 1 ? { image: { type: 'image_url', url: toDataUrl(references[0]) } }
                    : references.length > 1 ? { images: references.map(image => ({ type: 'image_url', url: toDataUrl(image) })) } : {}),
                ...xaiParams,
                ...(level !== undefined ? { quality: level } : {}),
            };
        }
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            ...(options.signal !== undefined ? { signal: options.signal } : {}),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const detail = extractErrorMessage(payload);
            const safeDetail = detail === undefined ? undefined : redactSecrets(detail, session.accessToken, session.refreshToken, session.accountId, session.email).slice(0, 200);
            throw new Error(`${vendor} HTTP ${String(response.status)}${safeDetail !== undefined ? `: ${safeDetail}` : ''}`);
        }
        return parseImages(payload);
    }
    /**
     * Resolve (and cache per refresh token) the managed project id the
     * Antigravity generation envelope needs. Re-resolved when the account
     * signs out or a different account logs in.
     */
    async ensureAntigravityProject(blob, signal) {
        const cacheKey = blob.refreshToken.length > 0 ? blob.refreshToken : blob.accessToken.slice(0, 32);
        const cached = this.projectCache.get(cacheKey);
        if (cached !== undefined)
            return cached;
        const context = await antigravityResolveProjectContext(blob, signal);
        // A failed discovery must not freeze a made-up project until logout.
        if (context.source === 'account')
            this.projectCache.set(cacheKey, context);
        return context;
    }
}
/** The private Codex backend can ignore size while following a canvas ratio in
 * the prompt (live checks: 16:9 -> 1672x941, 9:16 -> 941x1672). Keep size too;
 * this is best-effort composition guidance, not an exact-pixel guarantee. */
function codexPromptWithSize(prompt, size) {
    const dimensions = /^(\d+)x(\d+)$/.exec(size ?? '');
    if (dimensions === null)
        return prompt;
    const width = Number(dimensions[1]);
    const height = Number(dimensions[2]);
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0)
        return prompt;
    let divisor = width;
    let remainder = height;
    while (remainder !== 0) {
        const next = divisor % remainder;
        divisor = remainder;
        remainder = next;
    }
    const ratio = `${String(width / divisor)}:${String(height / divisor)}`;
    const orientation = width > height ? '横向宽屏' : width < height ? '竖向' : '正方形';
    return `${prompt}\n\n输出图片的画布宽高比必须为${ratio}，${orientation}构图，完整画面铺满${orientation}画布。`;
}
/** Map an OpenAI-style size onto the aspect ratio Antigravity accepts. */
function antigravityAspectRatioOf(size) {
    const table = {
        '1024x1024': '1:1',
        '1024x1536': '2:3',
        '1536x1024': '3:2',
        '768x1398': '9:16',
        '1398x768': '16:9',
    };
    if (size === undefined)
        return undefined;
    // `auto` means the model picks; omitting imageConfig.aspectRatio entirely
    // is the only way to express that, so no ratio is forwarded.
    if (size === 'auto')
        return undefined;
    const mapped = table[size];
    if (mapped !== undefined)
        return mapped;
    // Already a ratio like 16:9 passes through; anything else falls back to 1:1.
    return /^\d+:\d+$/.test(size) ? size : '1:1';
}
/** Encode one reference image as the data URL the edit endpoints accept. */
function toDataUrl(image) {
    return `data:${image.mediaType};base64,${Buffer.from(image.data).toString('base64')}`;
}
/** Response parsing: Codex and Grok reply in the same `{data:[{b64_json}]}` shape. */
function parseImages(payload) {
    const body = typeof payload === 'object' && payload !== null ? payload : {};
    const rows = Array.isArray(body.data) ? body.data : [];
    const images = [];
    const reportedQuality = typeof body.quality === 'string' && body.quality.length > 0 ? body.quality : undefined;
    for (const row of rows) {
        if (typeof row !== 'object' || row === null)
            continue;
        const b64 = row.b64_json;
        if (typeof b64 !== 'string' || b64.length === 0)
            continue;
        const revised = row.revised_prompt;
        images.push({
            b64_json: b64,
            ...(typeof revised === 'string' && revised.length > 0 ? { revisedPrompt: revised } : {}),
            ...(reportedQuality !== undefined ? { reportedQuality } : {}),
        });
    }
    if (images.length === 0)
        throw new Error('response contains no images');
    return images;
}
function extractErrorMessage(payload) {
    if (typeof payload !== 'object' || payload === null)
        return undefined;
    const error = payload.error;
    if (typeof error !== 'object' || error === null)
        return undefined;
    const row = error;
    if (typeof row.message === 'string')
        return row.message;
    if (typeof row.code === 'string')
        return row.code;
    return undefined;
}
function notLoggedInError(vendor) {
    const display = providerNameOf(vendor);
    return new Error(`${display} 未登录：请到 设置 > 插件 > 图像生成 的订阅区完成登录`);
}
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch);
}
//# sourceMappingURL=manager.js.map