import type { GalleryItem } from './gallery-store.js';
/** Content addressing makes these five fields the complete attachment identity. */
export declare function sameAttachment(a: GalleryItem['attachment'], b: GalleryItem['attachment']): boolean;
/**
 * Field-by-field comparison for one gallery record. Keep this list in sync with
 * GalleryItem: a field added there but missing here would silently keep the old
 * object and show stale data after a reload.
 */
export declare function sameGalleryItem(a: GalleryItem, b: GalleryItem): boolean;
/**
 * Reuse the previous object for every unchanged record so memoized cards keep
 * their identity after a full-table reload; only changed records get new
 * objects. The order always follows the incoming list.
 */
export declare function mergeGalleryItems(prev: readonly GalleryItem[], next: readonly GalleryItem[]): GalleryItem[];
