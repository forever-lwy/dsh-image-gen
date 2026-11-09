/** Read-only delivery, reference sync and explicit deletion for the raw-image vault. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { type VaultConfig } from './vault-store.js';
export declare function serveVault(req: IncomingMessage, res: ServerResponse, config: VaultConfig): Promise<void>;
/** Sync one browser profile's references; never deletes originals. 410 names a key that is not on disk, 409 a registry no profile can write. */
export declare function serveVaultRefs(req: IncomingMessage, res: ServerResponse, config: VaultConfig): Promise<void>;
/** Explicit gallery deletion: remove only keys no profile still references. */
export declare function serveVaultDelete(req: IncomingMessage, res: ServerResponse, config: VaultConfig): Promise<void>;
