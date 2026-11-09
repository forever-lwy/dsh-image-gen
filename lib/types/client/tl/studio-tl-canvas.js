import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useCallback, useId, useRef, useState } from 'react';
import { DefaultToolbar, Tldraw, createShapeId, } from 'tldraw';
import { blobToDataUrl } from '../browser-image-utils.js';
import { fetchAttachmentBlob } from '../image-cache.js';
import { CANVAS_MAX_PROMPT_CHARS } from '../../shared.js';
import { applyBrandTheme, syncTldrawThemeWithHost } from './tl-brand-theme.js';
import { startCanvasSync } from './canvas-sync.js';
import { getTlLandingGeneration, registerTlLandingConsumer } from './tl-canvas-bridge.js';
import { mountedCanvases, mountedEditors } from './studio-tl-registry.js';
import { GALLERY_IMAGE_MIME, readGalleryImageDrop } from './gallery-image-transfer.js';
/**
 * Infinite canvas surface for the Studio workbench, backed by tldraw.
 *
 * Both surfaces share one locally persisted document. The landing queue is
 * consumed once; tldraw owns subsequent edits, deletion, undo and persistence.
 */
const MAX_DISPLAY_SIDE = 380;
const GRID_GAP = 40;
const GRID_COLS = 3;
export { clearStudioTlCanvases, deselectStudioTlCanvases } from './studio-tl-registry.js';
/**
 * Dock the stock toolbar vertically along the left edge (Figma-style) instead
 * of tldraw's signature bottom-center pill. It is still the same
 * DefaultToolbar with the same tools and overflow handling — only the
 * orientation changes, which is what makes the whole composition read as our
 * own surface rather than stock tldraw. TL_THEME_CSS offsets it from the
 * screen edge like the other floating cards.
 */
const StudioToolbar = () => _jsx(DefaultToolbar, { orientation: "vertical" });
function tlAssetIdFor(galleryId) {
    return `asset:ig-${galleryId.replace(/[^A-Za-z0-9_-]/g, '_')}`;
}
function displaySizeOf(attachment) {
    const width = attachment.width > 0 ? attachment.width : 512;
    const height = attachment.height > 0 ? attachment.height : 512;
    const scale = MAX_DISPLAY_SIDE / Math.max(width, height);
    return { w: Math.round(width * scale), h: Math.round(height * scale) };
}
/** Dedupe across the whole document, including images moved to other pages. */
function landedIdsOf(editor) {
    const landedIds = new Set();
    for (const shape of editor.store.allRecords()) {
        if (shape.typeName !== 'shape' || shape.type !== 'image')
            continue;
        const galleryId = shape.meta?.galleryId;
        if (typeof galleryId === 'string')
            landedIds.add(galleryId);
    }
    return landedIds;
}
/** Truncate the prompt copied onto a shape: the canvas digest stays compact. */
function metaPromptOf(prompt) {
    if (typeof prompt !== 'string')
        return undefined;
    const collapsed = prompt.replace(/\s+/g, ' ').trim();
    return collapsed.length === 0 ? undefined : collapsed.slice(0, CANVAS_MAX_PROMPT_CHARS);
}
export async function landTlItems(editor, items, isActive, onUnreadable) {
    // Explicit saves may request an image that is already in the document.
    const landedIds = landedIdsOf(editor);
    const pending = items.filter(item => !landedIds.has(item.galleryId));
    if (pending.length === 0)
        return true;
    const assets = [];
    const landed = [];
    for (const item of pending) {
        if (!isActive())
            return false;
        const assetId = tlAssetIdFor(item.galleryId);
        if (editor.getAsset(assetId) === undefined) {
            try {
                const blob = await fetchAttachmentBlob(item.attachment);
                const src = await blobToDataUrl(blob);
                assets.push({
                    id: assetId,
                    typeName: 'asset',
                    type: 'image',
                    meta: {},
                    props: {
                        name: item.attachment.name ?? item.galleryId,
                        src,
                        w: item.attachment.width > 0 ? item.attachment.width : 512,
                        h: item.attachment.height > 0 ? item.attachment.height : 512,
                        mimeType: blob.type || item.attachment.mediaType,
                        isAnimated: item.attachment.mediaType === 'image/gif',
                        fileSize: item.attachment.bytes,
                    },
                });
            }
            catch (error) {
                console.warn('[dsh-image-gen] canvas landing skipped (attachment unreadable):', item.galleryId, error);
                if (isActive())
                    onUnreadable?.();
                continue;
            }
        }
        const size = displaySizeOf(item.attachment);
        const prompt = metaPromptOf(item.prompt);
        landed.push({
            galleryId: item.galleryId,
            assetId,
            attachmentId: String(item.attachment.attachmentId),
            name: item.attachment.name ?? item.galleryId,
            fromConversation: item.fromConversation === true,
            w: size.w,
            h: size.h,
            ...(prompt !== undefined ? { prompt } : {}),
            ...(typeof item.provider === 'string' && item.provider.length > 0 ? { provider: item.provider } : {}),
            ...(typeof item.model === 'string' && item.model.length > 0 ? { model: item.model } : {}),
        });
    }
    if (!isActive())
        return false;
    // A second surface/tab may have synchronized this image during the fetch.
    const nowLanded = landedIdsOf(editor);
    const ready = landed.filter(item => !nowLanded.has(item.galleryId));
    if (ready.length === 0)
        return true;
    if (assets.length > 0)
        editor.createAssets(assets);
    // Layout: rows of up to GRID_COLS images. The block prefers the viewport
    // center; when that spot is already occupied it drops below all existing
    // content, so consecutive batches never stack on top of each other.
    const rows = [];
    for (let index = 0; index < ready.length; index += GRID_COLS)
        rows.push(ready.slice(index, index + GRID_COLS));
    const rowSizes = rows.map(row => ({
        width: row.reduce((sum, cell) => sum + cell.w, 0) + GRID_GAP * (row.length - 1),
        height: Math.max(...row.map(cell => cell.h)),
    }));
    const blockWidth = Math.max(...rowSizes.map(size => size.width));
    const blockHeight = rowSizes.reduce((sum, size) => sum + size.height, 0) + GRID_GAP * (rows.length - 1);
    const viewport = editor.getViewportPageBounds();
    const originX = viewport.center.x - blockWidth / 2;
    let originY = viewport.center.y - blockHeight / 2;
    const existing = editor.getCurrentPageShapes();
    if (existing.length > 0) {
        // Cushion the candidate by half a gap so landed batches keep breathing room.
        const cushion = GRID_GAP / 2;
        const candidateX = originX - cushion;
        const candidateY = originY - cushion;
        const candidateW = blockWidth + cushion * 2;
        const candidateH = blockHeight + cushion * 2;
        let occupied = false;
        let contentBottom = Number.NEGATIVE_INFINITY;
        for (const shape of existing) {
            const bounds = editor.getShapePageBounds(shape.id);
            if (bounds === undefined)
                continue;
            if (bounds.maxY > contentBottom)
                contentBottom = bounds.maxY;
            if (!occupied
                && candidateX < bounds.maxX && candidateX + candidateW > bounds.minX
                && candidateY < bounds.maxY && candidateY + candidateH > bounds.minY) {
                occupied = true;
            }
        }
        if (occupied)
            originY = contentBottom + GRID_GAP;
    }
    let cursorY = originY;
    const shapes = [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const rowSize = rowSizes[rowIndex];
        let cursorX = originX + (blockWidth - rowSize.width) / 2;
        for (const cell of row) {
            shapes.push({
                id: createShapeId(`ig-${cell.galleryId}`),
                type: 'image',
                x: Math.round(cursorX),
                y: Math.round(cursorY),
                props: { assetId: cell.assetId, w: cell.w, h: cell.h },
                // Generation provenance rides on meta: canvas-sync surfaces it in the
                // model-facing digest so "regenerate this" reuses the original params.
                meta: {
                    galleryId: cell.galleryId,
                    attachmentId: cell.attachmentId,
                    name: cell.name,
                    fromConversation: cell.fromConversation,
                    ...(cell.prompt !== undefined ? { prompt: cell.prompt } : {}),
                    ...(cell.provider !== undefined ? { provider: cell.provider } : {}),
                    ...(cell.model !== undefined ? { model: cell.model } : {}),
                },
            });
            cursorX += cell.w + GRID_GAP;
        }
        cursorY += rowSize.height + GRID_GAP;
    }
    editor.createShapes(shapes);
    // When the batch landed outside the visible viewport (e.g. below older
    // content), bring it into view: pan if it fits at the current zoom,
    // otherwise zoom out just enough to frame it.
    const visible = originX >= viewport.minX && originY >= viewport.minY
        && originX + blockWidth <= viewport.maxX && originY + blockHeight <= viewport.maxY;
    if (!visible) {
        if (blockWidth <= viewport.w && blockHeight <= viewport.h) {
            editor.centerOnPoint({ x: originX + blockWidth / 2, y: originY + blockHeight / 2 }, { animation: { duration: 240 } });
        }
        else {
            editor.zoomToBounds({ x: originX, y: originY, w: blockWidth, h: blockHeight }, { animation: { duration: 240 }, inset: GRID_GAP });
        }
    }
    return true;
}
const TL_COMPONENTS = { Toolbar: StudioToolbar };
export const StudioTlCanvas = memo(function StudioTlCanvas({ lang = 'zh' }) {
    // Separate camera/selection state for editors sharing the document.
    const sessionId = useId();
    const [syncStatus, setSyncStatus] = useState({ phase: 'idle', count: 0 });
    const [landingError, setLandingError] = useState(false);
    const retrySync = useRef(() => { });
    const editorRef = useRef(null);
    const onMount = useCallback((editor) => {
        let active = true;
        editorRef.current = editor;
        // tldraw restores instance state (including the selection) from the
        // persisted snapshot; every mount starts as fresh interaction state.
        editor.run(() => editor.selectNone());
        mountedEditors.add(editor);
        // Re-tint canvas-rendered colors (selection, marquee, "blue"
        // palette) to the plugin brand; UI chrome comes from TL_THEME_CSS.
        applyBrandTheme(editor);
        // Follow the DSH host's light/dark theme, now and on later flips.
        const stopThemeSync = syncTldrawThemeWithHost(editor);
        // Dot-grid backdrop: tldraw's built-in zoom-aware grid, re-tinted to
        // the workbench blue-grey. Gives the empty canvas spatial rhythm and
        // alignment reference without the graph-paper feel of line grids.
        editor.updateInstanceState({ isGridMode: true });
        // One console line proves the editor booted inside the webview;
        // useful when the host page swallows render errors.
        console.info(`[dsh-image-gen] tldraw mounted (instance ${editor.id})`);
        // tldraw calls onMount after the local document has loaded.
        const stopLanding = registerTlLandingConsumer(items => {
            const generation = getTlLandingGeneration();
            setLandingError(false);
            return landTlItems(editor, items, () => active && generation === getTlLandingGeneration(), () => setLandingError(true));
        });
        // Mirror this canvas into the host so the conversation agent can
        // see it (canvas tool / edit_image canvas_selection).
        let stopSync = startCanvasSync(editor, setSyncStatus);
        retrySync.current = () => stopSync.retry();
        const clear = () => {
            setLandingError(false);
            // Stop outstanding screenshots as well as the old host selection.
            stopSync();
            editor.complete();
            editor.run(() => {
                editor.selectNone();
                const pages = editor.getPages();
                for (const page of pages) {
                    editor.deleteShapes([...editor.getPageShapeIds(page.id)]);
                }
                for (const page of pages.slice(1))
                    editor.deletePage(page.id);
                editor.deleteAssets(editor.getAssets());
                editor.setCamera({ x: 0, y: 0, z: 1 });
            }, { history: 'ignore', ignoreShapeLock: true });
            editor.clearHistory();
            stopSync = startCanvasSync(editor, setSyncStatus);
        };
        mountedCanvases.add(clear);
        return () => {
            active = false;
            if (editorRef.current === editor)
                editorRef.current = null;
            mountedEditors.delete(editor);
            mountedCanvases.delete(clear);
            stopLanding();
            stopThemeSync();
            stopSync();
            retrySync.current = () => { };
        };
    }, []);
    const statusText = lang === 'en'
        ? syncStatus.phase === 'ready' ? `Selection ready · ${syncStatus.count} shapes`
            : syncStatus.phase === 'preparing' ? `Preparing selection · ${syncStatus.count} shapes…`
                : 'Selection sync failed'
        : syncStatus.phase === 'ready' ? `选区已就绪 · ${syncStatus.count} 个元素`
            : syncStatus.phase === 'preparing' ? `正在准备选区 · ${syncStatus.count} 个元素…`
                : '选区同步失败';
    return (_jsxs("div", { className: "dsh-ig-tl-canvas", onDragOverCapture: event => {
            // Drag-over runs in protected mode: inspect types, not getData().
            // A cold internal drag has no Files payload for tldraw's handler.
            if (!editorRef.current || !event.dataTransfer.types.includes(GALLERY_IMAGE_MIME))
                return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'copy';
        }, onDropCapture: event => {
            const item = readGalleryImageDrop(event.dataTransfer);
            const editor = editorRef.current;
            if (!item || !editor)
                return;
            event.preventDefault();
            event.stopPropagation();
            setLandingError(false);
            const generation = getTlLandingGeneration();
            void landTlItems(editor, [item], () => editorRef.current === editor && generation === getTlLandingGeneration(), () => setLandingError(true))
                .catch(error => {
                if (editorRef.current === editor)
                    setLandingError(true);
                console.warn('[dsh-image-gen] history image drop failed:', error);
            });
        }, children: [_jsx(Tldraw, { persistenceKey: "dsh-image-gen-workbench-v1", sessionId: sessionId, components: TL_COMPONENTS, onMount: onMount }), (landingError || syncStatus.phase !== 'idle') && (_jsxs("div", { className: "dsh-ig-canvas-sync-status", "data-phase": landingError ? 'error' : syncStatus.phase, role: "status", "aria-live": "polite", children: [_jsx("span", { children: landingError
                            ? lang === 'en' ? 'Could not read the original image. Reload it and try again.' : '无法读取原图，请重新加载图片后重试。'
                            : _jsxs(_Fragment, { children: [statusText, syncStatus.phase === 'error' ? `：${canvasSyncError(syncStatus.error, lang)}` : ''] }) }), !landingError && syncStatus.phase === 'error' && _jsx("button", { type: "button", onClick: () => retrySync.current(), children: lang === 'en' ? 'Retry' : '重试' })] }))] }));
});
function canvasSyncError(error, lang) {
    const en = lang === 'en';
    if (error?.includes('too-many-selected'))
        return en ? 'Select at most 16 shapes to edit with originals.' : '使用原图编辑时，请一次选择不超过 16 个元素。';
    if (error?.includes('too-large'))
        return en ? 'An image exceeds the size limit. Reduce its size and retry.' : '图片超出大小限制，请缩小后重试。';
    if (error?.includes('unsupported'))
        return en ? 'Use PNG, JPEG, WebP or GIF images.' : '请使用 PNG、JPEG、WebP 或 GIF 图片。';
    if (error?.includes('host-unavailable'))
        return en ? 'Restart DSH to load the updated plugin, then retry.' : '请重启 DSH 加载新版插件后重试。';
    return en ? 'Check the connection or re-import an unavailable image, then retry.' : '请检查连接；若原图已失效，请重新导入后重试。';
}
//# sourceMappingURL=studio-tl-canvas.js.map