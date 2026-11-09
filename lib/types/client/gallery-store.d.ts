/**
 * Lightweight IndexedDB persistence layer for Image Generation Gallery.
 * Stores lightweight metadata indexes; image binaries remain managed by DSH Attachment service.
 * Supports tombstones to ensure deleted items are never resurrected when revisiting conversations.
 */
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment';
import type { ImageProvider, StudioWatermark } from '../shared.js';
export { GALLERY_THUMB_MAX_AGE_MS, GALLERY_THUMB_MAX_BYTES, GALLERY_THUMB_WIDTH, galleryThumbKey, getGalleryThumb, getGalleryThumbStats, pruneGalleryThumbs, putGalleryThumb, } from './gallery-thumbs.js';
export interface GalleryItem {
    id: string;
    attachment: ImageAttachmentRef;
    prompt: string;
    /** Generation provider, or 'import' for user-uploaded images. */
    provider: ImageProvider | 'import';
    channel?: string | undefined;
    model: string;
    createdAt: number;
    aspectRatio?: string | undefined;
    imageSize?: string | undefined;
    resolution?: string | undefined;
    generationQuality?: string | undefined;
    watermark?: StudioWatermark | undefined;
    output?: string | undefined;
    /** Workflow seed reported by the ComfyUI provider. Optional so records written by older versions stay readable; the object store is schemaless, so no IndexedDB version bump is needed. */
    seed?: number | undefined;
    /** Saved file path on workspace disk if savedTo was returned */
    savedTo?: string | undefined;
    /** Whether this item is marked as favorite */
    isFavorite?: boolean | undefined;
    /** Custom tags or collection markers */
    tags?: string[] | undefined;
    /** Workspace filesystem path where the image was generated/saved */
    workspacePath?: string | undefined;
    /** Workspace ID if known */
    workspaceId?: string | undefined;
    /** Conversation session ID where the image was generated */
    sessionId?: string | undefined;
    /** Attachment ids of the source images this image was edited from; used by the canvas to rebuild edit chains. Optional so records written by older versions stay readable. */
    sourceAttachmentIds?: string[] | undefined;
    /** Raw pre-normalization bytes: an import the attachment layer changed, or a generated GIF it normalized to a still. */
    original?: {
        key: string;
        bytes: number;
        mediaType: ImageMediaType;
    } | undefined;
}
/** A user-created folder grouping favorite prompts. */
export interface FavoriteFolder {
    id: string;
    kind: 'image' | 'prompt';
    name: string;
    addedAt: number;
}
/** A prompt kept in the workbench favorites rail. */
export interface FavoritePrompt {
    /** Stable id derived from the trimmed text; identical prompts dedupe. */
    id: string;
    text: string;
    addedAt: number;
    /** Owning folder id; absent entries are unfiled and appear under "all". */
    folderId?: string;
}
/** Age at which timestamp metadata can be compacted; deleted IDs never expire. */
export declare const TOMBSTONE_TTL_MS: number;
/**
 * Compact old tombstones to permanent IDs. Removing an ID would let an old
 * conversation silently reinsert a deleted image. No IDs are removed.
 */
export declare function pruneTombstones(maxAgeMs?: number): Promise<number>;
type GalleryListener = () => void;
/**
 * Subscribe to gallery mutations (insert/delete/clear).
 */
export declare function subscribeGallery(listener: GalleryListener): () => void;
/**
 * Save or update a gallery record by attachmentId.
 * Skipped if the item was previously deleted (tombstoned).
 * Preserves existing isFavorite, tags, and original createdAt on re-renders.
 * Returns false when the record was not persisted (e.g. IndexedDB unavailable)
 * so callers can surface the failure and let the user retry.
 */
export declare function saveGalleryItem(item: Omit<GalleryItem, 'createdAt'> & {
    createdAt?: number;
}): Promise<boolean>;
/** Whether this id was deleted from the gallery, so a re-rendered card must not resurrect what the record referenced either. */
export declare function isGalleryItemTombstoned(id: string): Promise<boolean>;
/**
 * Retrieve all gallery records sorted by createdAt descending.
 */
export declare function getGalleryItems(): Promise<GalleryItem[]>;
/**
 * Like getGalleryItems, but rejects when IndexedDB is unavailable. Maintenance
 * callers must not treat a read failure as an empty gallery (that would make
 * vault gc delete every original).
 */
export declare function getGalleryItemsStrict(): Promise<GalleryItem[]>;
/**
 * Toggle favorite status of a gallery item.
 * Returns the new favorite status (true if favorited, false if unfavorited).
 */
export declare function toggleFavoriteGalleryItem(id: string): Promise<boolean>;
/**
 * Delete a single gallery record by ID and record a tombstone.
 */
export declare function deleteGalleryItem(id: string): Promise<void>;
/**
 * Bulk delete multiple gallery records by IDs and record tombstones in a single transaction.
 */
export declare function bulkDeleteGalleryItems(ids: string[]): Promise<void>;
/**
 * Bulk update favorite status for multiple gallery records in a single transaction.
 */
export declare function bulkSetFavoriteGalleryItems(ids: string[], isFavorite: boolean): Promise<void>;
/**
 * Clear all gallery records and reset tombstones.
 */
export declare function clearGallery(): Promise<void>;
/**
 * Standardize path format across Windows and POSIX (lowercase, forward slashes, no trailing slash).
 */
export declare function normalizeWorkspacePath(rawPath: string): string;
/**
 * Determine if a gallery item belongs to the given workspace context.
 * Compares workspaceId, sessionId membership, workspacePath, and savedTo file path prefix.
 */
export declare function isItemInWorkspace(item: GalleryItem, workspace?: {
    workspaceId?: string | undefined;
    path?: string | undefined;
    sessionIds?: readonly string[] | undefined;
} | null): boolean;
/** Subscribe to favorites mutations (insert/delete). */
export declare function subscribeFavorites(listener: () => void): () => void;
/**
 * Keep one prompt in the favorites rail; identical trimmed text overwrites
 * (one record per distinct prompt).
 * @returns false when the write failed.
 */
export declare function saveFavoritePrompt(text: string): Promise<boolean>;
/** Prompt favorites, newest first. */
export declare function getFavoritePrompts(): Promise<FavoritePrompt[]>;
/** Drop one prompt favorite. */
export declare function deleteFavoritePrompt(id: string): Promise<void>;
/** Create a favorites folder; returns null when the name is empty or already used for the kind. */
export declare function addFavoriteFolder(kind: 'image' | 'prompt', name: string): Promise<FavoriteFolder | null>;
/** List all favorite folders. */
export declare function getFavoriteFolders(): Promise<FavoriteFolder[]>;
/** Delete a folder; member favorites survive and become unfiled. */
export declare function deleteFavoriteFolder(id: string): Promise<void>;
/** File a favorite prompt into a folder (undefined unfiles it). */
export declare function moveFavoritePrompt(id: string, folderId: string | undefined): Promise<boolean>;
/** Rewrite a favorite prompt's text in place, keeping its id stable. */
export declare function updateFavoritePrompt(id: string, text: string): Promise<boolean>;
