import type { GalleryItem } from './gallery-store.js';
import { type GifT } from './gif-i18n.js';
import { type GifPlayer } from './gif-player.js';
/** Where a gallery item's animation is served, when it has one: its vault original, or a GIF attachment. */
export declare function galleryGifUrl(item: GalleryItem): string | undefined;
/**
 * A grid tile's GIF badge, and its animation laid over the still thumbnail
 * while the pointer is on the tile. The thumbnail stays underneath, so a slow
 * or missing original never blanks the tile, and drags still start from it.
 */
export declare function GalleryGifTile({ item, lang, hovered }: {
    item: GalleryItem;
    lang: 'zh' | 'en';
    hovered: boolean;
}): import("react").JSX.Element | null;
export interface GalleryGifPreview {
    t: GifT;
    player: GifPlayer;
    item: GalleryItem;
}
/**
 * The player behind the gallery preview of an animated item, once its bytes
 * are at hand. An original that is gone falls back to the still attachment,
 * which the gallery's own image shows.
 */
export declare function useGalleryGifPreview(item: GalleryItem | null, lang: 'zh' | 'en'): GalleryGifPreview | undefined;
/** The preview's animation, in place of the gallery image; sized to leave room for the player bar. */
export declare function GalleryGifStage({ preview, poster }: {
    preview: GalleryGifPreview;
    poster: string | undefined;
}): import("react").JSX.Element;
/** The player bar, floating above the gallery's own bottom bar. */
export declare function GalleryGifBar({ preview }: {
    preview: GalleryGifPreview;
}): import("react").JSX.Element;
/** The bottom bar's download, as a menu of the GIF at its speed, its original timing and the frame on display. */
export declare function GalleryGifDownload({ preview }: {
    preview: GalleryGifPreview;
}): import("react").JSX.Element;
