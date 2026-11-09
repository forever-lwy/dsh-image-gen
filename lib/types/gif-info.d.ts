/**
 * Frame count, timing and size of a GIF, read from its block structure, plus
 * a speed change that rewrites only the frame delays: no decoding, no node
 * imports, so the browser bundle shares it.
 */
export interface GifInfo {
    frames: number;
    /** Per-frame delay in milliseconds; 0 when a frame carries no Graphic Control Extension. */
    delaysMs: number[];
    /** Logical screen size from the header. */
    width: number;
    height: number;
}
/**
 * Read every frame's delay. Returns undefined for anything that is not a GIF
 * with at least one intact frame: callers only decorate a successful result
 * with these facts, so a parse failure must never fail the image.
 */
export declare function readGifInfo(bytes: Uint8Array): GifInfo | undefined;
/** The most common frame delay (the first one on a tie); 0 without frames. */
export declare function gifFrameDurationMs(delaysMs: readonly number[]): number;
/**
 * Play a GIF faster or slower by rewriting the delay of every Graphic Control
 * Extension in place: same length, same pixels, so the result is still the
 * provider's file. 1x returns the input itself. A delay the browser treats as
 * "too short" (0 or 1 tick plays as 100 ms) is scaled from that effective
 * value, and the result never goes below 2 ticks, where it would fall back
 * into that same 100 ms rule and play slower instead of faster. Returns
 * undefined for anything the walker cannot trust, or a speed that is not a
 * positive number.
 */
export declare function retimeGif(bytes: Uint8Array, speed: number): Uint8Array | undefined;
