import type { ImageMediaType } from '@deepseek-ai/dsh-attachment';
import type { Config } from './config.js';
export interface VaultConfig {
    enabled: boolean;
    dir: string;
}
export interface SavedOriginal {
    key: string;
    bytes: number;
    mediaType: ImageMediaType;
}
export declare function resolveDshHome(home?: string): string;
export declare function resolveVaultDir(home?: string): string;
/** Resolve a configured vault path; relative values stay below the DSH home, not the process cwd. */
export declare function resolveVaultPath(configured: string, home?: string): string;
export declare function isValidVaultKey(key: string): boolean;
/** Vault settings as configured: off only when explicitly disabled; a relative dir stays below the DSH home. */
export declare function vaultConfigOf(config: Config): VaultConfig;
/** Persist one original file; the same bytes are shared through content addressing. */
export declare function saveOriginal(config: VaultConfig, input: {
    data: Uint8Array;
    mediaType: ImageMediaType;
}): Promise<SavedOriginal | undefined>;
export declare function readOriginal(config: VaultConfig, key: string, preferredMediaType?: string): Promise<{
    data: Buffer;
    mediaType: ImageMediaType;
} | undefined>;
export declare function listVaultKeys(config: VaultConfig): Promise<string[]>;
export declare function deleteVaultKeys(config: VaultConfig, keys: Iterable<string>): Promise<{
    removed: number;
    bytes: number;
}>;
/** Delete only the explicitly requested originals; callers must prove they are unreferenced. */
