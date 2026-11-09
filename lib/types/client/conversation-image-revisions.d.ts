import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import { type StudioProvider, type StudioWatermark } from '../shared.js';
import { type ImageResultPresentation } from './image-result-node.js';
/** One regenerated version displayed in place of an original conversation image. */
export interface ConversationImageRevision {
    attachment: ImageAttachmentRef;
    prompt: string;
    provider: StudioProvider;
    channel?: string;
    model: string;
    output: string;
    createdAt: number;
    ratio: string;
    quality: string;
    resolution?: string;
    generationQuality?: string;
    watermark?: StudioWatermark;
    /** Raw animated bytes in the vault; the card plays this version from them. */
    original?: ImageResultPresentation['original'];
}
export interface ConversationImageRevisionChain {
    originId: string;
    /** Zero selects the immutable conversation image; revisions use one-based positions. */
    currentIndex: number;
    revisions: ConversationImageRevision[];
}
/** Read the locally persisted replacement history for one immutable conversation image. */
export declare function loadConversationImageRevisionChain(originId: string): ConversationImageRevisionChain;
/** Append a generated version and make it the version shown by the conversation card. */
export declare function appendConversationImageRevision(originId: string, revision: ConversationImageRevision): ConversationImageRevisionChain;
/** Select an earlier or later version without altering the underlying conversation event. */
export declare function selectConversationImageRevision(originId: string, requestedIndex: number): ConversationImageRevisionChain;
