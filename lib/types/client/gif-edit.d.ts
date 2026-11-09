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
import { type GifEditAvailability } from './gif-comments.js';
import { type GifComment, type GifSheetPlan } from './gif-sheet.js';
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
    /** The edit came back as a new version: close the lightbox and say how it went. */
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
    sending: boolean;
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
export declare function useGifEdit({ gif, image, versionKey, busy, addRevision, onSent, onFallback }: GifEditInput): GifEdit;
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
 * The GIF lightbox with the frame editor: entering edit mode pauses the
 * player and draws the sheet once (the sheet view and the request read it,
 * and it outlives frames the player releases); leaving it keeps the notes.
 * Escape leaves edit mode before it closes the lightbox.
 */
export declare function GifEditLightbox({ edit, ...props }: GifLightboxProps & {
    edit: GifEdit;
}): import("react").JSX.Element;
