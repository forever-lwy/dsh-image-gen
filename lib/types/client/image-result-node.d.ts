/** Modern DSH conversation node that keeps image artifacts outside Tool process folding. */
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment';
export declare const IMAGE_RESULT_NODE_KIND = "dsh-image-result";
export interface ImageResultPresentation {
    readonly attachment: ImageAttachmentRef;
    readonly prompt: string;
    readonly provider: string;
    readonly channel?: string;
    readonly model: string;
    readonly output: string;
    readonly savedTo?: string;
    /** Workflow seed reported by the ComfyUI provider, when available. */
    readonly seed?: number;
    /** Attachment ids of the edit sources when this image came from edit_image; used to rebuild canvas edit chains. */
    readonly sourceAttachmentIds?: readonly string[];
    /** Raw bytes in the vault when the attachment is a normalized copy; today only an animated GIF. */
    readonly original?: {
        readonly key: string;
        readonly bytes: number;
        readonly mediaType: ImageMediaType;
    };
}
interface ImageResultState {
    /** Owning conversation turn; PTC (run_code) sub-call results carry no turn. */
    readonly turn?: number;
    readonly results: readonly (ImageResultPresentation & {
        readonly seq: number;
    })[];
}
interface EventLike {
    readonly type: string;
    readonly seq: number;
    readonly data: Record<string, unknown>;
}
interface MatchLike {
    readonly event: EventLike;
    readonly location: unknown;
}
interface ContextLike<State> {
    readonly key: string;
    readonly id: string;
    readonly matches: readonly MatchLike[];
    readonly start?: MatchLike;
    readonly state?: State;
}
interface ConversationNodeDefinitionLike<State> {
    readonly kind: string;
    readonly target: 'chat';
    match(event: EventLike): {
        id: string;
        role: 'start' | 'update';
    } | null;
    start(context: ContextLike<State>, match: MatchLike, reader: unknown): State;
    update(context: ContextLike<State> & {
        readonly state: State;
    }, match: MatchLike): State;
    buildViewNode(context: ContextLike<State>): Record<string, unknown> | null;
}
/** Default definition for the successful images from each Tool invocation. */
export declare const imageResultDefinition: ConversationNodeDefinitionLike<ImageResultState>;
/**
 * Give each image Tool result its own Chat row at the event that produced it.
 * PTC (run_code) sub-calls already have their own stable sub-call identity.
 */
export declare function createImageResultDefinition(): ConversationNodeDefinitionLike<ImageResultState>;
/** Parse the plugin-owned durable presentation metadata from a Tool result event. */
export declare function imageResultFromMeta(value: unknown): ImageResultPresentation | undefined;
/** Parse all successful images from either a single or batch Tool result. */
export declare function imageResultsFromMeta(value: unknown): readonly ImageResultPresentation[];
/**
 * Parse a plugin image result from a tool/ptc-dispatch event (#38). PTC
 * run_code sub-calls carry neither a turn nor presentationMeta, so the result
 * is rebuilt from the dispatch payload itself: the image content block for the
 * attachment, arguments for the prompt (and edit source ids), and the tool's
 * fixed-format summary text for provider/model/output. Returns undefined for
 * anything that is not a successful image result from our own image tools.
 */
export declare function imageResultFromPtcDispatch(event: EventLike): ImageResultPresentation | undefined;
/** Pair each rendered image with its own summary, including batches with failed items. */
export declare function imageResultsFromPtcDispatch(event: EventLike): readonly ImageResultPresentation[];
/**
 * The identity of one image version. A still is its attachment; an animated
 * result is also its vault original, because the host normalizes a GIF to a
 * still of its first frame and two animations that differ only after that
 * frame share one attachment. Keying versions, gallery records and frame notes
 * by the attachment alone would merge such animations into one.
 */
export declare function imageVersionKey(attachmentId: string, original: {
    readonly key: string;
} | undefined): string;
/** Parse a vault reference; anything malformed drops the reference, never the image that carries it. */
export declare function originalFromMeta(value: unknown): ImageResultPresentation['original'];
export {};
