export declare const INSPIRATION_SOURCE_ID = "awesome-gpt-image-2";
export declare const INSPIRATION_SOURCE_VERSION = "c7d293963b21c60bf338003915438cc5c39dd3ca";
export declare const INSPIRATION_SOURCE_UPDATED_AT = "2026-08-28T10:24:55Z";
export declare const INSPIRATION_SOURCE_REPOSITORY = "https://github.com/freestylefly/awesome-gpt-image-2";
/** Public mirror for the bundled cases' image assets; checked before GitHub. */
export declare const INSPIRATION_SOURCE_IMAGE_MIRROR = "https://gpt-image2.canghe.ai";
export declare const MAX_INSPIRATION_CASES = 2000;
export declare const HANDDRAW_SOURCE_ID = "handraw-style";
export declare const HANDDRAW_SOURCE_VERSION = "50998b094866e22007001161bca12c892a3796b1";
export declare const HANDDRAW_SOURCE_UPDATED_AT = "2026-09-27T14:24:28+08:00";
export declare const HANDDRAW_SOURCE_REPOSITORY = "https://github.com/yang0/handraw-style";
/**
 * Image revision for the handdraw source. The upstream pin stays fixed while
 * the referenced image paths change (sheet crops → upstream individuals);
 * browsers key their persistent image cache on this value, so bump it
 * whenever the source's images change.
 */
export declare const HANDDRAW_IMAGE_REVISION = "3";
export interface InspirationCase {
    id: string;
    title: string;
    imageAlt: string;
    sourceLabel?: string | undefined;
    sourceUrl?: string | undefined;
    githubUrl?: string | undefined;
    prompt: string;
    promptPreview: string;
    category: string;
    styles: string[];
    scenes: string[];
    featured: boolean;
}
export interface InspirationSource {
    id: string;
    label: string;
    repository: string;
    version: string;
    integritySha256?: string | undefined;
    updatedAt?: string | undefined;
    /** Content revision of the source's images; absent means `version` covers it. */
    imageRevision?: string | undefined;
    categories: string[];
    styles: string[];
    scenes: string[];
    cases: InspirationCase[];
}
export interface InspirationCatalog {
    schemaVersion: 1;
    sources: InspirationSource[];
}
interface ResolvedCase extends InspirationCase {
    imagePath: string;
}
export interface ResolvedSource extends InspirationSource {
    cases: ResolvedCase[];
}
export interface ResolvedInspirationCatalog {
    schemaVersion: 1;
    sources: ResolvedSource[];
}
/** Parse the upstream snapshot defensively before it becomes application data. */
export declare function parseInspirationSnapshot(value: unknown, version?: string, updatedAt?: string | undefined): ResolvedInspirationCatalog;
export declare function publicInspirationCatalog(catalog: ResolvedInspirationCatalog): InspirationCatalog;
export declare function findInspirationCase(catalog: ResolvedInspirationCatalog, sourceId: string, caseId: string): ResolvedCase | undefined;
/** One model-ready search hit: where the case lives plus its full reusable prompt. */
export interface InspirationSearchHit {
    sourceId: string;
    sourceLabel: string;
    id: string;
    title: string;
    category: string;
    prompt: string;
}
export interface InspirationSearchRequest {
    /** Substring matched case-insensitively against titles, prompts, categories, and style/scene tags; empty matches everything. */
    query: string;
    /** Restrict the search to one source id. */
    sourceId?: string | undefined;
    /** Restrict the search to one exact category name. */
    category?: string | undefined;
    /** Maximum hits to return; defaults to 8, clamped to 1-20. */
    limit?: number | undefined;
}
export interface InspirationSearchResult {
    /** Total matching cases before the limit; lets the caller refine instead of re-querying blindly. */
    total: number;
    hits: InspirationSearchHit[];
}
/** Search a resolved catalog for reusable prompts; bounded hits even with an empty query. */
export declare function searchInspirationCases(catalog: ResolvedInspirationCatalog, request: InspirationSearchRequest): InspirationSearchResult;
export declare const BUNDLED_INSPIRATION_CATALOG: ResolvedInspirationCatalog;
export {};
