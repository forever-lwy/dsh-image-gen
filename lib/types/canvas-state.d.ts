/**
 * In-memory mirror of the workbench infinite canvas.
 *
 * The tldraw canvas lives in the browser; the conversation agent lives in the
 * host process. Browser instances push compact `CanvasStatePush` snapshots
 * through the canvas-state route, and this mirror is the host-side truth the
 * canvas tool (state digest and selection view) and the
 * edit_image `canvas_selection` source all read from. Nothing here is
 * persisted: the mirror dies with the host process, matching the canvas's
 * own session-scratch semantics.
 */
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment';
import type { CanvasNodeSummary, CanvasStatePush } from './shared.js';
/**
 * Decoded selection screenshot held in memory only. Nothing touches the
 * durable attachment store until a tool actually consumes it: most
 * screenshots are replaced within seconds (selection changed) or die with
 * the canvas (closed), and the immutable content-addressed store has no
 * deletion — persisting them eagerly would leak disk forever.
 */
export interface CanvasSelectionImage {
    data: Uint8Array;
    mediaType: ImageMediaType;
}
/** Server-side view of one client push after validation. */
export interface CanvasMirrorEntry {
    clientInstance: string;
    connected: true;
    nodeCount: number;
    nodes: readonly CanvasNodeSummary[];
    selectionCount: number;
    selectionKinds: readonly string[];
    /** Capped identity list of the selected shapes (name, attachment id, ...). */
    selectionItems: readonly CanvasNodeSummary[];
    /**
     * Identity-bearing selection signature (count + kinds + item identities).
     * Two selections of different shapes never share it, so a stale screenshot
     * is never kept across a selection swap — even when count and kinds match.
     */
    selectionSignature: string;
    /** In-memory screenshot of the current selection, when one was pushed. */
    selectionImage?: CanvasSelectionImage;
    selectionStatus?: CanvasStatePush['selectionStatus'];
    selectionError?: string;
    /** Mirror receive time, used for the digest's "updated N ago" line. */
    receivedAt: number;
    /** Monotonic apply counter; `latest()` prefers the most recently applied instance. */
    seq: number;
    updatedAt: number;
}
/**
 * Host-side mirror of every currently connected workbench canvas.
 *
 * One instance is shared by the canvas-state route, the canvas tools, and the
 * system-prompt context registration. More than one canvas can be mounted at
 * once (right-sidebar studio tab, conversation gallery tab); each instance
 * pushes under its own `clientInstance` id and `latest()` reads the freshest.
 */
export declare class CanvasMirror {
    private readonly entries;
    private readonly sequences;
    private nextSeq;
    /**
     * Apply one validated push. A disconnect removes the instance; an unchanged
     * selection keeps the previously received screenshot bytes so the model can
     * still view them while unrelated canvas edits keep flowing in.
     */
    apply(push: CanvasStatePush, selectionImage?: CanvasSelectionImage): void;
    /** The freshest connected canvas entry, or undefined. */
    latest(): CanvasMirrorEntry | undefined;
    /** The in-memory selection screenshot of the freshest canvas, if present. */
    latestSelectionImage(): CanvasSelectionImage | undefined;
    /** Whether any canvas instance is currently connected. */
    connected(): boolean;
    /**
     * Compact one-screen digest of the canvas for the system prompt and tools.
     * Evaluated per call so the "updated N ago" line stays current between pushes.
     */
    digest(now?: number): string;
}
