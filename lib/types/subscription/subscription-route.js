import { SubscriptionManager } from './manager.js';
import { SUBSCRIPTION_LOGIN_ROUTE, SUBSCRIPTION_STATUS_ROUTE } from '../shared.js';
import { SUBSCRIPTION_PROVIDERS } from '../shared.js';
import { withWebAdmission } from '../web-route.js';
export { SUBSCRIPTION_LOGIN_ROUTE, SUBSCRIPTION_STATUS_ROUTE } from '../shared.js';
const MAX_BODY_BYTES = 16 * 1024;
/** The vendor each subscription provider logs in as. */
function vendorOfProvider(provider) {
    if (provider === 'chatgpt-sub')
        return 'codex';
    if (provider === 'google-sub')
        return 'antigravity';
    return 'grok';
}
/** Register the login/status routes on the plugin's web server. */
export function registerSubscriptionRoutes(ctx, manager, admission = () => undefined) {
    ctx.effect(() => ctx.webServer.register(withWebAdmission({
        kind: 'exact',
        path: SUBSCRIPTION_LOGIN_ROUTE,
        handler: (req, res) => { void serveLogin(req, res, manager); },
    }, admission)), 'dsh-image-gen: subscription login route');
    ctx.effect(() => ctx.webServer.register(withWebAdmission({
        kind: 'exact',
        path: SUBSCRIPTION_STATUS_ROUTE,
        handler: (req, res) => { void serveStatus(req, res, manager); },
    }, admission)), 'dsh-image-gen: subscription status route');
}
async function serveLogin(req, res, manager) {
    if (!sameOrigin(req))
        return jsonError(res, 403, 'origin-rejected');
    if (req.method !== 'POST')
        return jsonError(res, 405, 'method-not-allowed');
    if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
        return jsonError(res, 415, 'json-required');
    }
    let body;
    try {
        body = JSON.parse(await readBody(req));
    }
    catch {
        return jsonError(res, 400, 'invalid-request');
    }
    const provider = record(body)?.provider;
    if (typeof provider !== 'string' || !SUBSCRIPTION_PROVIDERS.includes(provider)) {
        return jsonError(res, 400, 'invalid-provider');
    }
    const action = record(body)?.action;
    const vendor = vendorOfProvider(provider);
    try {
        if (action === 'logout') {
            await manager.logout(vendor);
            return json(res, 200, { ok: true });
        }
        const { url } = await manager.beginLogin(vendor);
        json(res, 200, { ok: true, url });
    }
    catch (error) {
        json(res, 502, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
}
async function serveStatus(req, res, manager) {
    if (!sameOrigin(req))
        return jsonError(res, 403, 'origin-rejected');
    if (req.method !== 'POST')
        return jsonError(res, 405, 'method-not-allowed');
    const statuses = {};
    for (const provider of SUBSCRIPTION_PROVIDERS) {
        const status = await manager.loginStatus(vendorOfProvider(provider));
        statuses[provider] = status.state === 'logged-in'
            ? { state: status.state, email: status.email }
            : { state: status.state };
    }
    json(res, 200, { ok: true, statuses });
}
function sameOrigin(req) {
    const origin = req.headers.origin;
    const host = req.headers.host;
    return origin === undefined || host === undefined || origin === `http://${host}` || origin === `https://${host}`;
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
}
async function readBody(req) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.byteLength;
        if (bytes > MAX_BODY_BYTES)
            throw new Error('request too large');
        chunks.push(buffer);
    }
    return Buffer.concat(chunks).toString('utf8');
}
function json(res, status, value) {
    if (res.headersSent || res.writableEnded || res.destroyed)
        return;
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(value));
}
function jsonError(res, status, code) {
    json(res, status, { error: code });
}
//# sourceMappingURL=subscription-route.js.map