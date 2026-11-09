import { type SavedOriginal, type VaultConfig } from './vault-store.js';
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment';
export interface VaultRegistryProfile {
    keys: string[];
    updatedAt: number;
}
export interface VaultRegistry {
    version: 1;
    profiles: Record<string, VaultRegistryProfile>;
}
export interface VaultRegistryLoad {
    status: 'ok' | 'missing' | 'corrupt';
    registry?: VaultRegistry;
}
export declare function isValidVaultProfileId(value: unknown): value is string;
export declare function loadVaultRegistry(dir: string): Promise<VaultRegistryLoad>;
/** Store and claim an import in the same transaction used by explicit deletion. */
export declare function saveImportedOriginal(config: VaultConfig, input: {
    data: Uint8Array;
    mediaType: ImageMediaType;
}, profileId?: string): Promise<SavedOriginal | undefined>;
/**
 * Store a generated original without claiming it: the browser profiles that
 * render its card claim it one by one, so it is owned by whoever has seen it.
 * The registry is created here, with the same legacy sweep an import does,
 * because the first single-key claim would otherwise create it and sweep every
 * other unclaimed generated file into the legacy profile, where the gallery
 * could never delete it. A corrupt registry is left alone: it already blocks
 * every sync and deletion, while the file is still worth keeping for playback.
 */
export declare function saveGeneratedOriginal(config: VaultConfig, input: {
    data: Uint8Array;
    mediaType: ImageMediaType;
}): Promise<SavedOriginal | undefined>;
/**
 * Keep the raw bytes of a generated GIF when the attachment layer normalized
 * it (a GIF is the only type where normalization drops the animation; a still
 * image loses at most some compression, and its workspace file keeps the
 * original). A single-frame GIF is a still image as well, as the tool result
 * already tells the model, and keeps nothing. The image is already paid for,
 * so a vault failure is reported through `warn` and the result stays usable
 * without the original.
 */
export declare function keepGifOriginal(config: VaultConfig, generated: {
    data: Uint8Array;
    mediaType: ImageMediaType;
}, attachment: ImageAttachmentRef, warn: (message: string) => void): Promise<SavedOriginal | undefined>;
/**
 * Merge one profile's complete key set into the persistent registry.
 *
 * On first creation, pre-existing vault files that the syncing profile does
 * not already reference are placed in a reserved legacy profile, so a browser
 * that has not opened yet cannot lose an original. Once a profile syncs a
 * legacy key, the unknown legacy owners remain protected too.
 *
 * A refused claim is told apart: `'missing-original'` when a key of this
 * request is not on disk (the only refusal a client should drop its reference
 * for), undefined when the registry itself cannot be written.
 */
export declare function updateVaultRegistry(dir: string, profileId: string, keys: readonly string[]): Promise<VaultRegistry | 'missing-original' | undefined>;
/** Remove explicitly owned keys using the same transaction as reference sync. */
export declare function deleteUnreferencedOriginals(config: VaultConfig, profileId: string, keys: readonly string[], deleteKeys: readonly string[]): Promise<{
    removed: number;
    bytes: number;
} | undefined>;
export declare function unionVaultKeys(registry: VaultRegistry): string[];
