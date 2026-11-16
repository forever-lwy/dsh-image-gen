/**
 * Frame-comment editing of an animated card: the notes of each version, the
 * edit request that redraws the animation from them, and the lightbox that
 * hosts the editor. The card supplies its busy state, its version chain and
 * its regenerate dialog; gif-comments.tsx draws the editor.
 */
import { type MutableRefObject } from 'react';
import type { ConversationImageRevision } from './conversation-image-revisions.js';
import type { RegeneratableImage } from './conversation-regenerate.js';
import { type GifCard, type GifLightboxProps } from './gif-card.js';
import { type GifEditAvailability, type GifEditDone, type GifEditPhase } from './gif-comments.js';
import { type GifComment, type GifSheetPlan } from './gif-sheet.js';
/** How long the reply waits before the new version is filed, so the bar is seen to fill (it takes .3s in gif-style.ts); the overlay stays until the version is filed. */
export declare const GIF_EDIT_FINISH_MS = 500;
/** How long the card says how an edit went when it came back unwatched: the user is busy elsewhere and may glance back late. */
export declare const GIF_EDIT_SENT_TOAST_MS = 8000;
/** How long filing a new version waits for its picture: a fetch that stalls must not hold the version, or the overlay, back. */
export declare const GIF_EDIT_PREFETCH_WAIT_MS = 3000;
/** Settles as `promise` does, or with undefined once `ms` have passed, whichever is first. */
export declare function waitAtMost<T>(promise: Promise<T>, ms: number): Promise<T | undefined>;
/**
 * The redraw's estimated share after waiting this long. The channel reports
 * no progress, so the estimate rises quickly at first, slows down, and never
 * passes 90%: only the reply fills the bar.
 */
export declare function gifEditProgressAt(waitedMs: number): number;
export interface GifEditStatus {
    phase: GifEditPhase | undefined;
    /** Whole seconds since the send; ticks every second until the reply. */
    seconds: number;
    /** The redraw's estimated share, 0 to 1. */
    progress: number;
    /** Kept until the user goes on from it, closes the preview or sends again. */
    done: GifEditDone | undefined;
}
/** One send's hold on the status; it does nothing once it ended, a later send began or the status was stopped. */
export interface GifEditRun {
    redraw(): void;
    /** The reply is in: the bar fills and the seconds stop. */
    finish(): void;
    /** Idle again, with what came of it when the editor is still on screen to show it. */
    succeed(done: GifEditDone | undefined): void;
    stop(): void;
}
export interface GifEditStatusStore {
    subscribe(listener: () => void): () => void;
    getSnapshot(): GifEditStatus;
    start(): GifEditRun;
    dismiss(): void;
    /** Stop ticking and drop the send in progress. */
    stop(): void;
}
/**
 * The card's send in progress and how the last one ended. It lives with the
 * card rather than the lightbox, which remounts when the new version loads,
 * and outside React state, so only the views that show the seconds re-render
 * every second.
 */
export declare function createGifEditStatus(): GifEditStatusStore;
/** The sheet drawn when editing began, with the frame facts the request needs; it outlives frames the player releases. */
export interface DrawnSheet {
    canvas: HTMLCanvasElement;
    plan: GifSheetPlan;
    frame: {
        width: number;
        height: number;
        delaysMs: readonly number[];
    };
}
export interface GifEditInput {
    gif: GifCard;
    /** The version on display; editing is offered only for one the workbench can redraw. */
    image: (RegeneratableImage & {
        prompt: string;
    }) | undefined;
    /** Notes belong to the version they were made on. */
    versionKey: string | undefined;
    /** The card's single busy slot, shared with regeneration: one request at a time, and the card's cancel aborts either. */
    busy: {
        running: boolean;
        setRunning(running: boolean): void;
        controller: MutableRefObject<AbortController | undefined>;
    };
    /** File a new version under the card and in the gallery; resolves whether the gallery kept it. */
    addRevision(revision: ConversationImageRevision): Promise<boolean>;
    /** The originating card's preview can stay open after the user leaves frame editing. */
    isPreviewOpen(): boolean;
    /** The edit came back as a new version while its preview was closed. */
    onSent(message: string): void;
    /** Regenerate from a description instead, with the notes written into the prompt. */
    onFallback(prompt: string, hint: string): void;
}
export interface GifEdit {
    t: GifCard['t'];
    availability: GifEditAvailability | undefined;
    comments: readonly GifComment[];
    setComments(comments: GifComment[]): void;
    busy: boolean;
    /** The send in progress; the views that show its seconds subscribe to it. */
    status: GifEditStatusStore;
    /** The reply is in and its version is being filed: there is nothing left to cancel. */
    finishing: boolean;
    /** An edit that came back while its editor was on screen; the preview shows it in place of the edit bar. */
    done: GifEditDone | undefined;
    dismissDone(): void;
    error: {
        message: string;
        fromChannel: boolean;
    } | undefined;
    /** Said under the card title: a failure that came back while no editor was on screen. */
    notice: string | undefined;
    /** The edit chip asked the next lightbox to open in edit mode. */
    editRequested: boolean;
    requestEdit(): void;
    takeEditRequest(): boolean;
    /** The lightbox reports whether its editor is on screen, so a late failure knows where to show. */
    setEditorOpen(open: boolean): void;
    beginEditing(): void;
    send(sheet: DrawnSheet): void;
    cancelSend(): void;
    fallback(total: number): void;
}
/** The notes of the version on display and the edit request built from them. */
export declare function useGifEdit({ gif, image, versionKey, busy, addRevision, isPreviewOpen, onSent, onFallback }: GifEditInput): GifEdit;
/** The card's edit chip, wired to open the lightbox in edit mode. */
export declare function GifCardEditChip({ edit, onOpen }: {
    edit: GifEdit;
    onOpen(): void;
}): import("react").JSX.Element;
/** A failure that came back while no editor was on screen, under the card title. */
export declare function GifEditNotice({ edit }: {
    edit: GifEdit;
}): import("react").JSX.Element | null;
/**
 * A finished edit in the plain image preview, which takes over when the new
 * version is a still, and for a moment while a new animation's bytes load.
 */
export declare function GifEditDoneDock({ edit, onFinish }: {
    edit: GifEdit;
    onFinish(): void;
}): import("react").JSX.Element | null;
/**
 * The GIF lightbox with the frame editor: entering edit mode pauses the
 * player and draws the sheet once (the sheet view and the request read it,
 * and it outlives frames the player releases); leaving it keeps the notes.
 * Escape leaves edit mode before it closes the lightbox. While a send runs the
 * picture is covered with its progress; an edit that comes back while the
 * editor is on screen leaves edit mode and shows the new version playing,
 * with its outcome where the edit bar was.
 */
export declare function GifEditLightbox({ edit, ...props }: GifLightboxProps & {
    edit: GifEdit;
}): import("react").JSX.Element;
