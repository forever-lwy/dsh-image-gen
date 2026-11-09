import type { Editor, TLShape } from 'tldraw';
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
/** Bound raster dimensions before exporting; large multi-image PNGs get a
 * JPEG preview instead of being silently discarded. Originals are separate. */
export declare function exportSelectionPreview(editor: Editor, shapes: TLShape[], maxBytes: number, signal: AbortSignal): Promise<string>;
export declare function readCanvasImageLimit(signal: AbortSignal): Promise<number>;
export interface CanvasOriginalCacheEntry {
    src: string | null;
    attachment: ImageAttachmentRef;
}
/** Use tldraw's resolver for IndexedDB-backed imports, not just asset.props.src.
 * Upload each original once per mount/source, with individual byte limits. */
export declare function syncCanvasOriginal(editor: Editor, shape: TLShape, maxBytes: number, signal: AbortSignal, cache: Map<string, CanvasOriginalCacheEntry>): Promise<ImageAttachmentRef>;
