/** Selected originals are uploaded individually; previews stay memory-only. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment';
export interface CanvasAssetRouteDeps {
    maxImageBytes: number;
    /** Host validates image contents/dimensions and content-addresses the bytes. */
    saveImage(image: {
        data: Uint8Array;
        mediaType: ImageMediaType;
    }): Promise<ImageAttachmentRef>;
}
export declare function serveCanvasAsset(req: IncomingMessage, res: ServerResponse, deps: CanvasAssetRouteDeps): Promise<void>;
