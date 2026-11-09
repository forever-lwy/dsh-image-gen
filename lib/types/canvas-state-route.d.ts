/**
 * Same-origin HTTP route receiving live canvas-state pushes from the
 * workbench infinite canvas in the browser.
 *
 * The browser owns the tldraw canvas; this route is the only door that state
 * enters the host process through. Every push is validated end to end
 * (origin, method, body size, field shapes, embedded image bytes) before it
 * reaches the mirror. Selection screenshots stay in memory: the mirror holds
 * the decoded bytes and a tool persists them only when the model actually
 * consumes them (canvas action=view), so dead screenshots never hit the disk.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment';
import { type CanvasStatePush } from './shared.js';
import type { CanvasMirror } from './canvas-state.js';
/** Dependencies required by the canvas-state route. */
export interface CanvasStateRouteDeps {
    mirror: CanvasMirror;
    /** Hard cap for the JSON body; sized by the caller from the attachment limits. */
    maxBodyBytes: number;
    /** Largest accepted selection screenshot in bytes. */
    maxImageBytes: number;
}
/** Serve one canvas-state push. */
export declare function serveCanvasState(req: IncomingMessage, res: ServerResponse, deps: CanvasStateRouteDeps): Promise<void>;
/**
 * Validate one untrusted canvas-state push at the HTTP boundary.
 * Returns a normalized copy, or undefined when any field is malformed.
 * Present-but-malformed known fields reject the whole push: they signal a
 * client/server version skew rather than a legitimately absent value.
 */
export declare function parseCanvasStatePush(value: unknown): CanvasStatePush | undefined;
/** Decode and sanity-check an embedded selection screenshot data URL. */
export declare function decodeSelectionImage(dataUrl: string): {
    data: Uint8Array;
    mediaType: ImageMediaType;
} | undefined;
