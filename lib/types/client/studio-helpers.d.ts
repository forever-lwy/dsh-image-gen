import { type FC } from 'react';
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment';
import type { FavoriteFolder, GalleryItem } from './gallery-store.js';
export declare const BatchCanvasItem: FC<{
    item: GalleryItem;
    index: number;
    badge?: string | undefined;
    isActive: boolean;
    isChecked: boolean;
    onSelect(): void;
}>;
export declare function hasSubscriptionRatioMismatch(item: GalleryItem): boolean;
export declare const FieldSelect: FC<{
    label: string;
    value: string;
    options: Array<{
        value: string;
        label: string;
    }>;
    onChange(value: string): void;
}>;
export declare function localizeRatioOptions(options: Array<{
    value: string;
    label: string;
}>, lang: 'zh' | 'en'): Array<{
    value: string;
    label: string;
}>;
export declare function localizeQualityOptions(options: Array<{
    value: string;
    label: string;
}>, lang: 'zh' | 'en'): Array<{
    value: string;
    label: string;
}>;
export interface RecentItemActions {
    select(item: GalleryItem): void;
    favorite(item: GalleryItem): void;
    toast(message: string): void;
}
export declare const RecentItem: import("react").MemoExoticComponent<({ item, active, mode, lang, actions }: {
    item: GalleryItem;
    active: boolean;
    mode: "select" | "favorite";
    lang: "zh" | "en";
    actions: RecentItemActions;
}) => import("react").JSX.Element>;
export declare const FavoriteFolderBar: FC<{
    folders: FavoriteFolder[];
    active: string;
    onSelect(id: string): void;
    onDelete(id: string): void;
    deleteLabel: string;
}>;
export declare function useInView<T extends HTMLElement>(): [(node: T | null) => void, boolean];
export declare function useAttachmentImage(attachment: ImageAttachmentRef | undefined, shouldLoad?: boolean): {
    url: string | null;
    blob: Blob | null;
    loading: boolean;
};
export declare function fileToBase64(file: File): Promise<string>;
export declare function extension(mediaType: ImageMediaType): string;
export declare function messageOf(error: unknown): string;
