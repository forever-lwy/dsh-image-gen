/**
 * Native Workspace Gallery & Studio View Component for DSH `conversation.view` slot.
 * Fully i18n-reactive (Chinese & English) with modular tabs, multi-dimensional filters,
 * responsive image grid, and placeholder routes.
 */
import { type FC } from 'react';
/** Host-provided locale service; `active` may be missing before the locale loads. */
export interface LocaleService {
    getSnapshot(): {
        active?: string;
    };
    subscribe(fn: () => void): () => void;
}
export type TabKey = 'gallery' | 'studio' | 'inspiration' | 'favorites';
export type SortKey = 'newest' | 'oldest';
export interface GalleryViewTabProps {
    locale?: LocaleService | undefined;
    sessionId?: string;
    useSession?: (selector: (state: any) => any) => any;
    useSessions?: (selector: (state: any) => any) => any;
    useWorkspaces?: (selector: (state: any) => any) => any;
    /** Host credential-change notifier; forwarded to the studio workbench. */
    credentialEvents?: {
        listen(callback: () => void): () => void;
    } | undefined;
    /**
     * Right-sidebar variant (DSH official `sidebar.right.pane.tab` seat). The
     * native conversation stays in the main area, so the composer must NOT be
     * hidden and the page-level CSS must not scope to the conversation column.
     */
    inSidebar?: boolean;
    /** Sub-tab opened first; the sidebar variant starts on the studio workbench. */
    defaultTab?: TabKey;
    /** Canvas surface the studio opens with; the sidebar variant shows the tldraw infinite canvas directly. */
    initialCanvasSurface?: 'preview' | 'infinite';
    /**
     * Sidebar tab visibility reader injected by DSH's `sidebar.right.pane.tab`
     * seat (absent on hosts that mount this view elsewhere, e.g. the main-area
     * conversation tab, where the hook is optional).
     */
    useTabInfo?: (() => {
        tab?: {
            visible?: boolean;
        };
    }) | undefined;
}
export declare const GalleryViewTab: FC<GalleryViewTabProps>;
export { copyImageBlob } from './browser-image-utils.js';
