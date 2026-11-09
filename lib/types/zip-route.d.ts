/** Streaming ZIP export of gallery attachments. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ImageAttachmentRef, ImageMediaType, StoredImageAttachment } from '@deepseek-ai/dsh-attachment';
/** Dependencies required by the gallery export route. */
export interface ZipRouteDeps {
    readImage(ref: ImageAttachmentRef): Promise<StoredImageAttachment>;
    /** Optional raw-vault reader: archives prefer original bytes when present. */
    readVault?(key: string, mediaType?: string): Promise<{
        data: Uint8Array;
        mediaType: ImageMediaType;
    } | undefined>;
    /** Hard cap on how many attachments one archive may contain. */
    maxEntries?: number;
    maxBodyBytes?: number;
    /** Real output budget, including raw originals and ZIP bookkeeping. */
    maxArchiveBytes?: number;
}
/**
 * Package selected gallery images into one ZIP and stream it to the browser.
 *
 * The request is a plain form post (`items` = JSON array of {name, attachment}),
 * so the renderer never builds the archive: the browser download manager owns
 * the transfer while this route reads attachments one at a time.
 */
export declare function serveZip(req: IncomingMessage, res: ServerResponse, deps: ZipRouteDeps): Promise<void>;
