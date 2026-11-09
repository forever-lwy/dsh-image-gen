import type { GifT } from './gif-i18n.js';
import { type GifPlayer } from './gif-player.js';
/** The frame under a pointer: one equal cell per frame across the strip; the ends hold outside it. */
export declare function filmstripFrameAt(x: number, width: number, total: number): number;
/** The centred source rectangle that fills a cell without stretching the frame. */
export declare function coverCrop(frameW: number, frameH: number, cellW: number, cellH: number): {
    sx: number;
    sy: number;
    sw: number;
    sh: number;
};
/**
 * The frame timeline, as ChatGPT draws it: every frame in an equal cell and a
 * playhead on the current one. Hovering previews a frame on the stage without
 * changing play state; a press stops on it, and a drag keeps choosing. Keys
 * are handled here and kept from the page, whose arrows turn gallery pages.
 */
export declare function GifFilmstrip({ player, t, hint, marks }: {
    player: GifPlayer;
    t: GifT;
    hint?: string | undefined;
    marks?: ReadonlySet<number> | undefined;
}): import("react").JSX.Element;
