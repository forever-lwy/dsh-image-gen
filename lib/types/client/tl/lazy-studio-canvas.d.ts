import { type FC } from 'react';
/**
 * Main-bundle face of the infinite canvas. tldraw and its stylesheet (several
 * MB) live in the `client.canvas.js` chunk, fetched through the DSH module
 * loader's `require.async` the first time a canvas is shown, so pages that
 * never open the canvas never download or parse them.
 *
 * Stateful modules the canvas shares with the main bundle (attachment cache,
 * landing queue, mounted-canvas registry) are handed over through
 * {@link CANVAS_HOST_KEY}; the chunk build resolves its imports of those
 * modules to this object instead of bundling second copies.
 */
type CanvasProps = {
    lang?: 'zh' | 'en';
};
export interface CanvasChunk {
    StudioTlCanvas: FC<CanvasProps>;
    TL_CSS: string;
}
/** Global slot the chunk reads the shared main-bundle modules from (tsdown.config.ts). */
export declare const CANVAS_HOST_KEY: unique symbol;
/** Test seam: replace how the chunk is fetched, and forget a loaded one. */
export declare function setCanvasChunkLoader(next: (() => Promise<CanvasChunk>) | undefined): void;
/**
 * Where tldraw's stylesheet goes once loaded: right before `anchor` (the
 * plugin's canvas theme overrides), keeping the cascade order of the single
 * stylesheet it used to be part of. `null` removes it again.
 */
export declare function setCanvasStyleAnchor(anchor: Element | null): void;
/** Fetch the canvas chunk once; a failed fetch can be retried. */
export declare function loadCanvasChunk(): Promise<CanvasChunk>;
export declare const StudioTlCanvas: FC<CanvasProps>;
export { clearStudioTlCanvases, deselectStudioTlCanvases } from './studio-tl-registry.js';
