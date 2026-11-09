/**
 * One-shot delivery into the persistent canvas document. The first mounted
 * editor handles a batch; tldraw synchronizes the document to other editors.
 * Delivered items are removed, so deleting a shape never triggers a replay.
 */
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
export interface TlLandingItem {
    /** Gallery item id; also used to dedupe shapes via shape.meta.galleryId. */
    galleryId: string;
    attachment: ImageAttachmentRef;
    /** Live conversation delivery; discard unfinished delivery when all canvases close. */
    fromConversation?: boolean;
    /** Explicit history actions must not resume after the last canvas closes. */
    onlyWhileCanvasOpen?: boolean;
    /**
     * Generation provenance copied onto the landed shape's meta: the canvas
     * digest then tells the model how each image was made, so "regenerate this"
     * or "vary this" reuses the original prompt and model instead of guessing.
     * All optional; shapes landed from older paths simply carry none.
     */
    prompt?: string;
    provider?: string;
    model?: string;
}
type TlLandingConsumer = (items: readonly TlLandingItem[]) => Promise<boolean>;
/** History actions must not silently queue into a canvas that is not open. */
export declare function hasTlLandingConsumer(): boolean;
export declare function subscribeTlLandingAvailability(listener: () => void): () => void;
export declare function sendTlLandingToOpenCanvas(item: TlLandingItem): boolean;
/** Invalidates async landings that started before the user cleared the canvas. */
export declare function getTlLandingGeneration(): number;
export declare function clearTlLandings(): void;
/** Queue freshly generated images for the tldraw canvases. Safe to call anywhere. */
export declare function pushTlLandings(newItems: readonly TlLandingItem[]): void;
/** Conversation results are admitted only while a canvas is mounted. */
export declare function pushTlLandingsLive(items: readonly TlLandingItem[]): void;
/** Register a ready editor. False means it unmounted before committing. */
export declare function registerTlLandingConsumer(consumer: TlLandingConsumer): () => void;
export {};
