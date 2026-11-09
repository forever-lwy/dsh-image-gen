/**
 * Workbench session that outlives the StudioView component (#99). Switching to
 * another DSH view unmounts the workbench; before this store the unmount
 * aborted the request (the server then cancelled the upstream generation) and
 * dropped the unsaved results with the component state. The session keeps the
 * request running and the results on screen across remounts, while nothing is
 * saved to the gallery unless the user saves it, as before.
 *
 * One session per workbench surface (the main tab and the right-sidebar
 * variant are separate), held in memory only: a page reload still starts
 * empty, like the unsaved results always did.
 */
import type { GalleryItem } from './gallery-store.js';
export type StudioBatchKind = 'multi-model' | 'multi-image';
/** What the workbench shows: the result in view and the batch around it. */
export interface StudioViewState {
    selected: GalleryItem | null;
    currentBatch: GalleryItem[] | null;
    selectedBatchIds: string[];
    batchKind: StudioBatchKind | null;
}
/** How a generation ended, delivered to whichever workbench is mounted. */
export interface StudioOutcome {
    seq: number;
    view?: StudioViewState | undefined;
    error?: string | undefined;
    notice?: string | undefined;
}
export interface StudioSessionSnapshot {
    generating: boolean;
    outcome: StudioOutcome | undefined;
}
export interface StudioSession {
    subscribe(listener: () => void): () => void;
    getSnapshot(): StudioSessionSnapshot;
    /** The view the workbench last showed, restored when it mounts again. */
    view(): StudioViewState | undefined;
    /** Remember the view a workbench leaves behind when it unmounts. */
    keepView(view: StudioViewState): void;
    /** Begin a generation owned by this controller; false while another is running. */
    start(controller: AbortController): boolean;
    /** End the generation of this controller; a stale or cancelled one changes nothing. */
    settle(controller: AbortController, outcome?: Omit<StudioOutcome, 'seq'>): void;
    /** Abort the running generation at the user's request. */
    cancel(): void;
    /** Whether a mounted workbench already showed this outcome, so a remount does not repeat its error or notice. */
    delivered(seq: number): boolean;
    /** Mark an outcome as shown. */
    markDelivered(seq: number): void;
}
/** The session of one workbench surface, created on first use. */
export declare function studioSession(key: string): StudioSession;
/** A fresh session, exported for tests. */
export declare function createStudioSession(): StudioSession;
