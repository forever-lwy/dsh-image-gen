import type { Editor } from 'tldraw';
/**
 * Mounted infinite-canvas surfaces, kept outside the tldraw chunk.
 *
 * The canvas component ships in the lazily loaded `client.canvas.js` chunk,
 * but the studio and gallery views (main bundle) clear and deselect canvases
 * without loading tldraw. Both bundles share this module's single instance:
 * the chunk build links it back to the main bundle (see tsdown.config.ts).
 */
export declare const mountedCanvases: Set<() => void>;
export declare const mountedEditors: Set<Editor>;
/** Reset canvas-owned data only. Gallery records and host attachments are untouched. */
export declare function clearStudioTlCanvases(): boolean;
/**
 * Cancel in-editor selection on every mounted canvas, keeping shapes and sync
 * untouched. Selection is interaction state tied to the surface: leaving the
 * studio page cancels it so a stale selection can neither resurface on return
 * nor linger in the host mirror.
 */
export declare function deselectStudioTlCanvases(): boolean;
