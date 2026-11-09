import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useEffect, useState } from 'react';
import * as imageCache from '../image-cache.js';
import * as bridge from './tl-canvas-bridge.js';
import * as registry from './studio-tl-registry.js';
/** Global slot the chunk reads the shared main-bundle modules from (tsdown.config.ts). */
export const CANVAS_HOST_KEY = Symbol.for('dsh-image-gen.canvas-host');
function defaultLoader() {
    const load = typeof require === 'undefined' ? undefined : require.async;
    if (typeof load !== 'function')
        return Promise.reject(new Error('this DSH host cannot load plugin chunks'));
    globalThis[CANVAS_HOST_KEY] = { imageCache, bridge, registry };
    return load('./client.canvas.js');
}
let loader = defaultLoader;
let pending;
let loaded;
let styleAnchor = null;
let style;
/** Test seam: replace how the chunk is fetched, and forget a loaded one. */
export function setCanvasChunkLoader(next) {
    loader = next ?? defaultLoader;
    pending = undefined;
    loaded = undefined;
}
/**
 * Where tldraw's stylesheet goes once loaded: right before `anchor` (the
 * plugin's canvas theme overrides), keeping the cascade order of the single
 * stylesheet it used to be part of. `null` removes it again.
 */
export function setCanvasStyleAnchor(anchor) {
    styleAnchor = anchor;
    if (anchor === null) {
        style?.remove();
        style = undefined;
    }
    else if (loaded !== undefined) {
        installStyle(loaded.TL_CSS);
    }
}
function installStyle(css) {
    if (typeof document === 'undefined')
        return;
    if (style === undefined) {
        style = document.createElement('style');
        style.dataset.plugin = 'dsh-image-gen';
        style.dataset.part = 'tldraw';
        style.textContent = css;
    }
    if (styleAnchor?.parentNode)
        styleAnchor.before(style);
    else if (!style.isConnected)
        document.head.appendChild(style);
}
/** Fetch the canvas chunk once; a failed fetch can be retried. */
export function loadCanvasChunk() {
    if (loaded !== undefined)
        return Promise.resolve(loaded);
    pending ??= loader().then(chunk => {
        installStyle(chunk.TL_CSS);
        loaded = chunk;
        return chunk;
    }, error => {
        pending = undefined;
        throw error;
    });
    return pending;
}
export const StudioTlCanvas = memo(function LazyStudioTlCanvas({ lang = 'zh' }) {
    const [chunk, setChunk] = useState(loaded);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (chunk !== undefined)
            return;
        let live = true;
        setFailed(false);
        loadCanvasChunk().then(next => { if (live)
            setChunk(next); }, error => {
            console.warn('[dsh-image-gen] canvas chunk failed to load:', error);
            if (live)
                setFailed(true);
        });
        return () => { live = false; };
    }, [chunk, attempt]);
    if (chunk !== undefined)
        return _jsx(chunk.StudioTlCanvas, { lang: lang });
    const en = lang === 'en';
    return (_jsx("div", { className: "dsh-ig-tl-canvas", children: _jsxs("div", { className: "dsh-ig-canvas-sync-status", "data-phase": failed ? 'error' : 'loading', role: "status", children: [_jsx("span", { children: failed ? (en ? 'The canvas failed to load.' : '画布加载失败。') : (en ? 'Loading canvas…' : '正在加载画布…') }), failed && _jsx("button", { type: "button", onClick: () => setAttempt(n => n + 1), children: en ? 'Retry' : '重试' })] }) }));
});
export { clearStudioTlCanvases, deselectStudioTlCanvases } from './studio-tl-registry.js';
//# sourceMappingURL=lazy-studio-canvas.js.map