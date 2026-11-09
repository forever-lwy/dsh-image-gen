import type { ReactNode } from 'react';
import type { GifT } from './gif-i18n.js';
import { type GifPlayer } from './gif-player.js';
interface GifPlayerBarProps {
    player: GifPlayer;
    t: GifT;
    /** Extra class for where the bar sits, e.g. above the gallery's own bottom bar. */
    className?: string | undefined;
    /** Controls after the speed, e.g. the frame editor toggle. */
    trailing?: ReactNode;
    /** The frame strip's tooltip, where its arrow keys mean something else around it. */
    stripHint?: string | undefined;
    /** Frames the strip marks, e.g. the ones with notes. */
    marks?: ReadonlySet<number> | undefined;
}
/**
 * The lightbox player: play/pause, the frame strip and the speed. The bar is
 * in place from the first render; frame controls wait for decoded frames,
 * the speed only for the file's bytes, which a speed-named download retimes.
 */
export declare function GifPlayerBar({ player, t, className, trailing, stripHint, marks }: GifPlayerBarProps): import("react").JSX.Element;
export {};
