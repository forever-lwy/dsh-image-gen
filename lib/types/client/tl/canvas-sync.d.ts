/**
 * Live canvas-state sync from one tldraw surface to the host mirror.
 *
 * The conversation agent runs in the host process and cannot see the browser
 * canvas, so this module is the canvas's voice: it watches the editor store,
 * summarizes the page (shape inventory + selection) and pushes a compact
 * snapshot to the canvas-state route. When the selection settles, it also
 * exports a fallback PNG screenshot (persistent images may come from a
 * different conversation), which the host
 * turns into a durable attachment (canvas action=view / edit_image
 * source=canvas_selection read exactly that).
 *
 * Pushes are fire-and-forget: failures warn in the console and the next
 * change retries. Duplicate snapshots (e.g. camera pans that change nothing
 * in the summary) never hit the network.
 */
import type { Editor } from 'tldraw';
/**
 * Start mirroring one editor into the host canvas-state route.
 * Returns a disposer that stops listening and marks the instance offline.
 */
export interface CanvasSyncStatus {
    phase: 'idle' | 'preparing' | 'ready' | 'error';
    count: number;
    error?: string;
}
export type CanvasSyncHandle = (() => void) & {
    retry(): void;
};
export declare function startCanvasSync(editor: Editor, onStatus?: (status: CanvasSyncStatus) => void): CanvasSyncHandle;
