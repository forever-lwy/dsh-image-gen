/**
 * Model-facing tools over the mirrored workbench canvas state.
 *
 * One `canvas` tool: `action=state` answers "what is on the canvas right now"
 * with a compact inventory; `action=view` returns the latest selection
 * screenshot as a real image block so the model can look at hand-drawn
 * sketches and annotated selections the way it looks at any conversation
 * image. It stays registered when no canvas is connected — its answer then
 * tells the model to ask the user to open the workbench instead of failing
 * silently. The canvas is disclosed only through this tool, never through the
 * system prompt: its state changes with every edit, selection and second.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ImageAttachmentRef, StoredImageAttachment } from '@deepseek-ai/dsh-attachment';
import type { CanvasMirror, CanvasSelectionImage } from './canvas-state.js';
import type { ReferenceImageAgent, ResolvedReferenceImage } from './reference-image.js';
/** The small attachment surface the canvas-selection resolver needs. */
export type CanvasSelectionImageStore = {
    readImage(ref: ImageAttachmentRef, signal?: AbortSignal): Promise<StoredImageAttachment>;
};
/** Dependencies of the canvas tools beyond the mirror itself. */
export interface CanvasToolsDeps {
    /**
     * Materializes an in-memory selection screenshot as a durable attachment.
     * Called by canvas action=view only, at the moment the image actually enters the
     * conversation — the durable store is content-addressed, so repeated views
     * of the same bytes reuse one object and dead screenshots never persist.
     */
    persistSelectionImage(image: CanvasSelectionImage): Promise<ImageAttachmentRef>;
}
/** Register the canvas tool on a context that owns a canvas mirror. */
export declare function registerCanvasTools(ctx: Context, mirror: CanvasMirror, deps: CanvasToolsDeps): void;
/**
 * Resolve the mirrored canvas selection as an edit reference image for
 * edit_image's `canvas_selection` source. The screenshot comes straight from
 * the mirror's in-memory bytes — identical to what canvas action=view shows the
 * model — and is never persisted here: reference images go to the image
 * provider, not the conversation.
 */
export declare function resolveCanvasSelectionReferences(input: {
    mirror: CanvasMirror;
    attachments: CanvasSelectionImageStore;
    agent?: ReferenceImageAgent;
    maxBytes?: number;
    signal: AbortSignal;
}): Promise<ResolvedReferenceImage[]>;
