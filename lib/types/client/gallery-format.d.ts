import type { GalleryItem } from './gallery-store.js';
import type { DictKey } from './gallery-i18n.js';
export declare function formatRelativeTime(timestamp: number, t: (key: DictKey, params?: Record<string, string>) => string): string;
/** Extract standard aspect ratio for precise filtering */
export declare function getItemRatio(item: GalleryItem): string;
/** Format aspect ratio or dimensions for card metadata (e.g., 1024×1024 or 16:9) */
export declare function formatCardMeta(item: GalleryItem): string;
