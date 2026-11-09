import { type MouseEvent } from 'react';
import type { GalleryItem } from './gallery-store.js';
import type { DictKey } from './gallery-i18n.js';
/** Stable dispatchers shared by every card, so memoized cards never re-render for selection changes. */
export interface GalleryCardActions {
    click: (item: GalleryItem, index: number, event: MouseEvent) => void;
    toggleSelect: (item: GalleryItem, index: number, event: MouseEvent) => void;
    requestDelete: (item: GalleryItem) => void;
    preview: (item: GalleryItem, blob?: Blob) => void;
    toast: (message: string) => void;
}
export interface GalleryCardProps {
    lang: 'zh' | 'en';
    item: GalleryItem;
    index: number;
    isManageMode: boolean;
    isSelected: boolean;
    t: (key: DictKey, params?: Record<string, string>) => string;
    actions: GalleryCardActions;
}
export declare const GalleryCard: import("react").MemoExoticComponent<({ lang, item, index, isManageMode, isSelected, t, actions, }: GalleryCardProps) => import("react").JSX.Element>;
