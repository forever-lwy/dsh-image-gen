import { type DragEvent, type ReactNode } from 'react';
import { type GifInfo } from '../gif-info.js';
import { type GifT } from './gif-i18n.js';
import { type GifDownloadKind } from './gif-menus.js';
import { type GifPlayer } from './gif-player.js';
export interface GifCardInput {
    lang: 'zh' | 'en';
    /** The vault copy of the version on display, when the host normalized its attachment. */
    original: {
        key: string;
        mediaType: string;
    } | undefined;
    /** The attachment on display; a GIF attachment is itself the raw file. */
    attachmentMediaType: string | undefined;
    attachmentBlob: Blob | undefined;
    /** The vault says the file is gone (deleted from the gallery): the record should drop its reference. */
    onOriginalGone(): void;
}
export interface GifCard {
    t: GifT;
    /** Whether the version on display is an animation, before its bytes are at hand. */
    animated: boolean;
    /** Defined once the raw GIF is at hand. */
    player: GifPlayer | undefined;
    /** Frame facts for a regeneration that asks for an animation again. */
    info(): Promise<GifInfo | undefined>;
    /** The GIF as it plays now: retimed to the playback speed once its bytes are read. */
    file(): Blob | undefined;
    download(kind: GifDownloadKind): void;
    /** Copy the frame on display as a still; resolves the message to show. */
    copyFrame(): Promise<string | undefined>;
}
/** Save the GIF at its speed, at its original timing, or the frame on display, named after `stem`. */
export declare function downloadGif(player: GifPlayer, kind: GifDownloadKind, speed: number, stem: string): void;
/** The animation behind a conversation card: its raw bytes, the player over them, and what a card does with them. */
export declare function useGifCard({ lang, original, attachmentMediaType, attachmentBlob, onOriginalGone }: GifCardInput): GifCard;
/** The card's speed chip; its panel opens over the image, so the card unclips while it is open. */
export declare function GifCardOverlay({ gif, onOpenChange }: {
    gif: GifCard;
    onOpenChange(open: boolean): void;
}): import("react").JSX.Element | null;
/** The card's hover-toolbar download, as a menu of the GIF, its original timing and the frame on screen. */
export declare function GifToolbarDownload({ gif, onOpenChange }: {
    gif: GifCard;
    onOpenChange(open: boolean): void;
}): import("react").JSX.Element | null;
export interface GifLightboxProps {
    gif: GifCard;
    player: GifPlayer;
    alt: string;
    /** Still image for a paused player whose frames were released. */
    poster: string | undefined;
    onClose(): void;
    onDragStart(event: DragEvent<HTMLElement>): void;
    /** Drawn over the stage, e.g. comment pins. */
    stageOverlay?: ReactNode;
    /** Controls after the speed in the player bar. */
    barTrailing?: ReactNode;
    /** Drawn under the player bar, e.g. the comment editor. */
    footer?: ReactNode;
    /** Extra class on the picture's frame, e.g. while it is being edited. */
    wrapClassName?: string | undefined;
    /** Frames the strip marks, e.g. the ones with notes. */
    frameMarks?: ReadonlySet<number>;
}
/** The GIF lightbox: the stage, the player bar, and copy, download and close at the top right. */
export declare function GifLightbox({ gif, player, alt, poster, onClose, onDragStart, stageOverlay, barTrailing, footer, wrapClassName, frameMarks }: GifLightboxProps): import("react").JSX.Element;
