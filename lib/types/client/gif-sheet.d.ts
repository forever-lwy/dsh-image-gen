/**
 * The contact sheet a frame-comment edit sends as its reference image, and the
 * prompt and request built around it. An edits endpoint takes a still, so
 * every frame of the animation is tiled into one near-square grid in reading
 * order; the prompt explains the grid and anchors each note inside its frame.
 * Pure except for the canvas work, which takes injectable canvas and encoder
 * stand-ins.
 */
import { type StudioGenerateRequest } from '../shared.js';
import { type RegeneratableImage } from './conversation-regenerate.js';
export declare const GIF_COMMENT_MAX_CHARS = 500;
export declare const GIF_COMMENTS_MAX = 32;
export interface GifComment {
    /** Creation order; also the number on the pin. */
    id: number;
    /** Zero-based frame index. */
    frame: number;
    /** Position inside that frame, in percent of its width and height from the top-left corner. */
    x: number;
    y: number;
    text: string;
}
export interface GifSheetPlan {
    cols: number;
    rows: number;
    /** Cell size in sheet pixels; the frame size unless the sheet had to shrink. */
    cellW: number;
    cellH: number;
    width: number;
    height: number;
    /** Trailing empty cells of the grid. */
    blanks: number;
    frames: number;
}
export interface SheetEncodeAttempt {
    scale: number;
    type: 'image/png' | 'image/jpeg';
    quality: number;
}
export type SheetEncoder = (canvas: HTMLCanvasElement, attempt: SheetEncodeAttempt) => Promise<Blob | undefined>;
export interface EncodedSheet {
    blob: Blob;
    mediaType: 'image/png' | 'image/jpeg';
    plan: GifSheetPlan;
}
/**
 * Near-square grid: cols = ceil(sqrt(n)). The cells shrink, snapped down to
 * 16 px, only when the sheet's longest edge would exceed the provider limit.
 */
export declare function planGifSheet(frames: number, frameW: number, frameH: number, maxEdge?: number): GifSheetPlan;
/** The size to show the sheet at: the full sheet scaled into the display edge, so the editor does not hold a second full-size copy. */
export declare function sheetViewSize(plan: Pick<GifSheetPlan, 'width' | 'height'>, maxEdge?: number): {
    width: number;
    height: number;
};
/** A point inside one frame, as the same point on the whole sheet (percent, one decimal). */
export declare function sheetPinPosition(comment: Pick<GifComment, 'frame' | 'x' | 'y'>, plan: GifSheetPlan): {
    x: number;
    y: number;
};
/** Paint the frames into their cells on a white sheet; blank cells stay white. */
export declare function drawGifSheet(frames: readonly CanvasImageSource[], plan: GifSheetPlan, createCanvas?: () => HTMLCanvasElement): HTMLCanvasElement;
/**
 * First attempt that fits both the host limit and a modest request budget.
 * The returned plan is scaled with the attempt, so the prompt can name the
 * cell size that was actually sent.
 */
export declare function encodeSheetWithinLimit(canvas: HTMLCanvasElement, plan: GifSheetPlan, maxBytes: number, encode?: SheetEncoder): Promise<EncodedSheet>;
/**
 * The edit prompt: the opening instruction, the sheet layout as sent (its
 * cells may be smaller than the frames) and the frames to produce at the
 * animation's own size, then the notes grouped by frame the way ChatGPT
 * writes them: a `Frame #n:` heading and one `(x: X%, y: Y%): note` line each.
 */
export declare function composeGifEditPrompt(comments: readonly GifComment[], plan: GifSheetPlan, frame: {
    width: number;
    height: number;
}): string;
export interface GifEditRequestInput {
    /** The version being edited: its channel, model, output and the description it was drawn from. */
    image: RegeneratableImage & {
        prompt: string;
    };
    /** The editing model of the channel, as the workbench would pick it. */
    model: string;
    comments: readonly GifComment[];
    /** The encoded sheet and the plan it was encoded at (scaled with the encoding attempt). */
    sheet: {
        mediaType: 'image/png' | 'image/jpeg';
        data: string;
        plan: GifSheetPlan;
    };
    /** The decoded frames: their size and the delays they play at, as captured when the editor opened. */
    frame: {
        width: number;
        height: number;
        delaysMs: readonly number[];
    };
    /** Playback speed; the delay asked for follows it, like a download does. */
    speed: number;
}
/**
 * The workbench edit that redraws the animation from the notes: the sheet as
 * the only reference, and a GIF with the sheet's frame count, the delay the
 * frames play at retimed by the speed, and the frame size the contract takes.
 * The prompt is the sheet instruction; the card files the new version under
 * the animation's own description instead.
 */
export declare function gifEditRequest({ image, model, comments, sheet, frame, speed }: GifEditRequestInput): StudioGenerateRequest;
/**
 * The same notes for a plain regeneration, which sees neither the previous
 * animation nor the sheet: no coordinates, the frame only as a time hint.
 */
export declare function composeFallbackPrompt(originalPrompt: string, comments: readonly GifComment[], frameTotal: number): string;
/** The frame delay to ask for: the animation's own delay retimed by the playback speed, within the provider range, in 10 ms steps. */
export declare function gifEditFrameDurationMs(baseMs: number, speed: number): number | undefined;
