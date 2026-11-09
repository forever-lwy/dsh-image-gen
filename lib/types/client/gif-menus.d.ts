import type { GifT } from './gif-i18n.js';
import { type GifPlayer } from './gif-player.js';
/**
 * The speed slider: a native range for keys and assistive tech, drawn as a
 * vertical track. It carries no numbers; the trigger shows the value.
 */
export declare function GifSpeedPanel({ speed, t, onChange }: {
    speed: number;
    t: GifT;
    onChange(speed: number): void;
}): import("react").JSX.Element;
/** The speed trigger and its panel: a chip on the card, a button in the lightbox bar. */
export declare function GifSpeedControl({ player, t, variant, onOpenChange }: {
    player: GifPlayer;
    t: GifT;
    variant: 'chip' | 'bar';
    onOpenChange?: (open: boolean) => void;
}): import("react").JSX.Element;
export type GifDownloadKind = 'gif' | 'original' | 'frame';
export interface GifDownloadItem {
    kind: GifDownloadKind;
    label: string;
    hint: string;
    disabled: boolean;
}
/** The GIF at the speed it plays, the original timing when that differs, and the frame on screen (one-based). */
export declare function gifDownloadItems(t: GifT, speed: number, framesReady: boolean, frame: number): GifDownloadItem[];
export interface GifDownloadMenuProps {
    player: GifPlayer;
    t: GifT;
    /** The card's hover toolbar, the lightbox's top-right actions, or the gallery preview's bottom bar. */
    variant: 'toolbar' | 'lightbox' | 'gallery';
    onDownload(kind: GifDownloadKind): void;
    onOpenChange?: (open: boolean) => void;
}
export declare function GifDownloadMenu({ player, t, variant, onDownload, onOpenChange }: GifDownloadMenuProps): import("react").JSX.Element;
