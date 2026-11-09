/** Keep a manually refreshed public catalog available across plugin restarts. */
import type { InspirationCatalog } from '../inspiration.js';
export declare function loadCachedInspirationCatalog(): Promise<InspirationCatalog | undefined>;
export declare function saveCachedInspirationCatalog(catalog: InspirationCatalog): Promise<void>;
