import { type FC } from 'react';
import type { GalleryItem } from '../gallery-store.js';
/** An explicit alternative to native dragging, including a visible unavailable state. */
export declare const GalleryCanvasButton: FC<{
    item: GalleryItem;
    lang: 'zh' | 'en';
    disabled?: boolean;
    className?: string;
    onToast(message: string): void;
}>;
