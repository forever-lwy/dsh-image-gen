import { type FC } from 'react';
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import { type GalleryItem } from './gallery-store.js';
import type { LocaleService } from './gallery-view.js';
export interface StudioReferenceItem {
    id: string;
    attachment?: ImageAttachmentRef;
    file?: File;
    previewUrl: string;
}
export interface StudioWorkspaceProps {
    workspaceId?: string | undefined;
    path?: string | undefined;
    title?: string | undefined;
    sessionIds?: readonly string[] | undefined;
}
/**
 * The selection after the gallery reloaded: the fresh record of a saved item,
 * null for a saved item that was deleted, and an unsaved result unchanged.
 */
export declare function keepSelection(current: GalleryItem, next: readonly GalleryItem[], previousIds: ReadonlySet<string> | undefined): GalleryItem | null;
export declare const StudioView: FC<{
    locale?: LocaleService | undefined;
    /** Host credential-change notifier; re-reads provider sign-in state silently. */
    credentialEvents?: {
        listen(callback: () => void): () => void;
    } | undefined;
    workspace?: StudioWorkspaceProps | null | undefined;
    initialPrompt?: string | undefined;
    /** Reference image applied once on arrival (e.g. an inspiration card used as 图生图 input). */
    initialReference?: File | undefined;
    /**
     * Canvas surface opened first: 'preview' (single-image viewer, the default)
     * or 'infinite' (the tldraw editor). The right-sidebar variant opens the
     * infinite canvas directly - mirroring chat-generated images while the
     * native conversation runs beside it is the point of the split.
     */
    initialCanvasSurface?: 'preview' | 'infinite' | undefined;
    /**
     * Show the one-time hint banner above the infinite canvas. Only the
     * conversation-tab seat (no chat running beside the canvas) needs it - the
     * right-sidebar variant IS the full experience, so the hint would be noise.
     */
    showInfiniteCanvasHint?: boolean;
    onInitialPromptApplied?(): void;
    onInitialReferenceApplied?(): void;
    onOpenInspiration?(): void;
}>;
