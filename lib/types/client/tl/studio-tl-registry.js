import { clearAttachmentCache } from '../image-cache.js';
import { clearTlLandings } from './tl-canvas-bridge.js';
/**
 * Mounted infinite-canvas surfaces, kept outside the tldraw chunk.
 *
 * The canvas component ships in the lazily loaded `client.canvas.js` chunk,
 * but the studio and gallery views (main bundle) clear and deselect canvases
 * without loading tldraw. Both bundles share this module's single instance:
 * the chunk build links it back to the main bundle (see tsdown.config.ts).
 */
export const mountedCanvases = new Set();
export const mountedEditors = new Set();
/** Reset canvas-owned data only. Gallery records and host attachments are untouched. */
export function clearStudioTlCanvases() {
    if (mountedCanvases.size === 0)
        return false;
    clearTlLandings();
    for (const clear of mountedCanvases)
        clear();
    clearAttachmentCache();
    return true;
}
/**
 * Cancel in-editor selection on every mounted canvas, keeping shapes and sync
 * untouched. Selection is interaction state tied to the surface: leaving the
 * studio page cancels it so a stale selection can neither resurface on return
 * nor linger in the host mirror.
 */
export function deselectStudioTlCanvases() {
    if (mountedEditors.size === 0)
        return false;
    for (const editor of mountedEditors)
        editor.run(() => editor.selectNone());
    return true;
}
//# sourceMappingURL=studio-tl-registry.js.map