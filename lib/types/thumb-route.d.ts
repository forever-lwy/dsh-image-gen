/** Server-rendered gallery variants derived from the attachment store. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
/** Dependencies required by the thumbnail and preview routes. */
export interface ThumbRouteDeps {
    readImageRequest(ref: ImageAttachmentRef, target: {
        width: number;
        height: number;
        maxBytes: number;
    }, signal?: AbortSignal): Promise<{
        variantId: string;
        data: Uint8Array;
        mediaType: ImageAttachmentRef['mediaType'];
    }>;
}
/**
 * Serve one downscaled, cached thumbnail.
 *
 * The attachment backend already derives deterministic request images (resize by
 * long edge + JPEG/WebP quality ladder) and caches them on disk, so the gallery
 * can render a tile without transferring the original to the renderer at all.
 */
export declare function serveThumb(req: IncomingMessage, res: ServerResponse, deps: ThumbRouteDeps): Promise<void>;
/** Serve the mid-size variant used by the lightbox preview. */
export declare function servePreview(req: IncomingMessage, res: ServerResponse, deps: ThumbRouteDeps): Promise<void>;
