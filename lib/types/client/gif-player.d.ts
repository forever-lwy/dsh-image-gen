/**
 * Frame-accurate GIF playback for the conversation card: a small external
 * store that owns the decoded frames and the clock, a stage that paints the
 * current frame, and a control bar. Frames are decoded only while a stage is
 * visible and only within a memory budget; otherwise the GIF plays natively in
 * an <img>, which still animates but cannot pause, seek or change speed.
 */
import { type DragEvent, type MouseEvent } from 'react';
import { type GifInfo } from '../gif-info.js';
import type { GifT } from './gif-i18n.js';
/** Range and step of the speed control: one decimal is enough to fine-tune around 1x. */
export declare const GIF_SPEED_MIN = 0.2;
export declare const GIF_SPEED_MAX = 2;
export declare const GIF_SPEED_STEP = 0.1;
export declare const DECODE_TOTAL_BUDGET_BYTES: number;
export declare function nextFrameIndex(index: number, total: number, delta?: number): number;
/** Delays are rounded to the 10 ms ticks a retimed download stores, so the preview plays at the file's speed. */
export declare function scheduledDelayMs(delayMs: number, speed: number): number;
/** A speed on the control's grid and within its range; anything unreadable is 1x. */
export declare function snapSpeed(speed: number): number;
export declare function formatSpeed(speed: number): string;
/**
 * The delay a browser plays a frame for: its own decoder's duration when it
 * reports one, else the header delay; either way a delay of at most 10 ms is
 * shown for 100 ms, as the <img> element and the retimed download do.
 */
export declare function playedDelayMs(durationUs: number | null | undefined, headerMs: number): number;
type GifKeyboardAction = 'toggle' | 'previous' | 'next' | 'first' | 'last';
/**
 * The lightbox shortcut for a key, given the element that holds focus. A
 * focused control keeps only the keys it handles itself (a button its Space
 * and Enter, the frame scrubber its arrows and Home/End), so stepping still
 * works after the mouse has clicked a button, while a text field keeps all.
 */
export declare function gifKeyboardAction(key: string, target: {
    tagName: string;
    type?: string | undefined;
} | null): GifKeyboardAction | undefined;
/** File-name suffix for a download at a non-default speed. */
export declare function speedSuffix(speed: number): string;
/** "Download GIF", naming the speed only when it is not the file's own. */
export declare function gifDownloadLabel(t: GifT, speed: number): string;
/** Judged from the header before anything is decoded: the GIF alone, and together with what other cards already hold; a header without a screen size cannot be judged. */
export declare function withinDecodeBudget(info: Pick<GifInfo, 'frames' | 'width' | 'height'>, usedBytes: number): boolean;
type GifPlayerStatus = 'native' | 'decoding' | 'ready' | 'fallback';
export interface GifPlayerSnapshot {
    readonly status: GifPlayerStatus;
    readonly info: GifInfo | undefined;
    readonly index: number;
    readonly playing: boolean;
    /** A pointer is previewing frames on the strip: the clock holds, play state is kept. */
    readonly scrubbing: boolean;
    readonly speed: number;
    /** Composited frames while `ready`; empty otherwise. */
    readonly frames: readonly ImageBitmap[];
    readonly delaysMs: readonly number[];
}
interface DecodedGif {
    frames: ImageBitmap[];
    delaysMs: number[];
}
/** Browser services the store relies on; tests inject stand-ins. */
export interface GifPlayerDeps {
    /** Resolves undefined when this environment cannot decode frame by frame. */
    decode(blob: Blob, info: GifInfo): Promise<DecodedGif | undefined>;
    encodeFrame(frame: ImageBitmap): Promise<Blob | undefined>;
    hidden(): boolean;
    setTimeout(fn: () => void, ms: number): unknown;
    clearTimeout(handle: unknown): void;
}
export interface GifPlayer {
    readonly blob: Blob;
    /** Object URL of the raw GIF for native playback and "open in new tab". */
    readonly url: string | undefined;
    /** The raw bytes once read; a drag-out needs them synchronously. */
    bytes(): Uint8Array | undefined;
    subscribe(listener: () => void): () => void;
    getSnapshot(): GifPlayerSnapshot;
    /** Each stage reports its own viewport state; frames exist while any stage is visible. */
    setVisible(stage: unknown, visible: boolean): void;
    play(): void;
    pause(): void;
    toggle(): void;
    /** Seeking and stepping pause playback, so the chosen frame stays. */
    seek(index: number): void;
    /** Show a frame while the pointer is over the strip, without changing play state. */
    scrub(index: number): void;
    /** Leave the strip: playback goes on from the frame shown; a paused player returns to the frame it chose. */
    endScrub(): void;
    step(delta: number): void;
    first(): void;
    last(): void;
    /** Takes effect on the next tick; nothing is re-decoded. */
    setSpeed(speed: number): void;
    /** Encode the frame on screen as PNG, leaving playback as it is; undefined until frames are decoded. */
    captureFrame(): Promise<Blob | undefined>;
    dispose(): void;
}
export declare function createGifPlayer(blob: Blob, overrides?: Partial<GifPlayerDeps>): GifPlayer;
/**
 * Paint one composited frame on the stage canvas. The canvas is cleared first:
 * a frame can hold transparent pixels after disposal compositing, and
 * source-over would leave the previous frame showing through them. A bitmap
 * released between render and effect has zero size; drawing it would throw,
 * so it is skipped.
 */
export declare function paintGifFrame(canvas: HTMLCanvasElement, frame: ImageBitmap): void;
/** Own a player for the current GIF blob; a new blob replaces and disposes the previous player. */
export declare function useGifPlayer(blob: Blob | undefined): GifPlayer | undefined;
/** Status alone, so the card re-renders on readiness rather than on every frame. */
export declare function useGifStatus(player: GifPlayer | undefined): GifPlayerStatus | undefined;
export declare function useGifSpeed(player: GifPlayer | undefined): number | undefined;
export declare function useGifPlaying(player: GifPlayer): boolean;
/** Whether the file's bytes are read: the speed and a speed-named download need them, frames do not. */
export declare function useGifReadable(player: GifPlayer | undefined): boolean;
/** Every change, including each frame; only components that draw the frame should use it. */
export declare function useGifSnapshot(player: GifPlayer): GifPlayerSnapshot;
interface GifStageProps {
    player: GifPlayer;
    /** The card, the lightbox and the gallery preview are separate stages, each reporting its own visibility. */
    stage: 'card' | 'lightbox' | 'gallery';
    className: string;
    alt: string;
    /** Still image for a paused player without frames (re-decoding after a scroll), instead of the natively animating GIF. */
    poster?: string | undefined;
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    onDragStart?: (event: DragEvent<HTMLElement>) => void;
}
/** Paints the current frame on a canvas once decoded; the raw GIF plays in an <img> until then or when decoding is not possible. */
export declare function GifStage({ player, stage, className, alt, poster, onClick, onDragStart }: GifStageProps): import("react").JSX.Element;
export {};
