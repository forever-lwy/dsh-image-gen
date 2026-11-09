/** Upload endpoint turning browser-picked image files into DSH attachments. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment';
export interface ImportRouteDeps {
    /** Durable attachment store; computes dimensions and content-addresses the bytes. */
    saveImage(image: {
        data: Uint8Array;
        mediaType: ImageMediaType;
        name?: string;
    }): Promise<ImageAttachmentRef>;
    /** Per-image byte cap from the host attachment limits. */
    maxImageBytes: number;
    /** Accepted media types from the host attachment limits. */
    mediaTypes: readonly string[];
    /** Optional background warm-up for the gallery thumbnail of a saved image. */
    warmThumbnail?(ref: ImageAttachmentRef): void;
    /** Persist the pre-normalization bytes when the attachment layer changed them. */
    saveOriginal?(input: {
        data: Uint8Array;
        mediaType: ImageMediaType;
    }): Promise<{
        key: string;
        bytes: number;
        mediaType: ImageMediaType;
    } | undefined>;
}
export declare function serveImport(req: IncomingMessage, res: ServerResponse, deps: ImportRouteDeps): Promise<void>;
