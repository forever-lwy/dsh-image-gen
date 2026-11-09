import { type Pkce } from '../oauth.js';
import type { SubscriptionBlob } from '../blob.js';
/** Antigravity CLI's embedded OAuth client, treated as public like Codex's. */
export declare const ANTIGRAVITY_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
export declare const ANTIGRAVITY_CLIENT_SECRET = "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";
export declare const ANTIGRAVITY_REDIRECT_URI = "http://localhost:51121/oauth-callback";
/**
 * Preserve the working sandbox routes, then try ordinary daily (consumer
 * accounts) before the production compatibility fallback. A Gmail address
 * alone does not establish which backend an account can use.
 */
export declare const ANTIGRAVITY_ENDPOINTS: readonly ["https://daily-cloudcode-pa.sandbox.googleapis.com", "https://autopush-cloudcode-pa.sandbox.googleapis.com", "https://daily-cloudcode-pa.googleapis.com", "https://cloudcode-pa.googleapis.com"];
/** The image model served through this channel: Nano Banana 2. */
export declare const ANTIGRAVITY_IMAGE_MODEL: string;
/**
 * Antigravity client version carried in the browser User-Agent. Google's
 * backend routes by this: a non-Antigravity or outdated UA lands in the
 * enterprise-license check and fails with the misleading 403 #3501
 * "You do not have a valid license of this product". The official
 * auto-updater publishes the current version; changelog scrape and the
 * hardcoded fallback keep the header sane when the updater is unreachable
 * (same strategy as the reference implementation's version.js).
 */
/**
 * Oldest client version the backend still serves (#123): 2.x now gets HTTP 200
 * with a "no longer supported" text and no image. Raise it when the backend
 * asks for a newer client again.
 */
export declare const MIN_ANTIGRAVITY_VERSION = "3.0.0";
/** Current client version: the fetched one, or the fallback until fetched. */
export declare function getAntigravityVersion(): string;
/** Numeric x.y.z comparison: negative, zero or positive like a sort comparator. */
export declare function compareVersions(left: string, right: string): number;
/** Test seam: pin the version so unit tests never depend on the network. */
export declare function setAntigravityVersionForTest(version: string | undefined): void;
/** Fetch and cache the current version once; failures keep the fallback. */
export declare function initAntigravityVersion(signal?: AbortSignal): Promise<void>;
export interface AntigravityConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}
export declare function antigravityConfig(): AntigravityConfig;
export declare function antigravityAuthorizeUrl(cfg: AntigravityConfig, pkce: Pkce): string;
export declare function antigravityExchangeCode(cfg: AntigravityConfig, pkce: Pkce, code: string): Promise<SubscriptionBlob>;
export declare function antigravityRefresh(blob: SubscriptionBlob): Promise<SubscriptionBlob>;
export interface AntigravityProjectContext {
    projectId: string;
    source: 'account' | 'fallback';
    /** Bounded, redacted discovery outcomes, retained for generation failures. */
    diagnostics: string[];
}
/** Compatibility helper for callers that only need the project string. */
export declare function antigravityResolveProject(blob: SubscriptionBlob, signal?: AbortSignal): Promise<string>;
/**
 * Discover an actual account project, preserving HTTP and eligibility failures.
 * Keep the legacy fallback for accounts whose image route still accepts it;
 * UNSUPPORTED_CLIENT here describes Code Assist, not a universal image ban.
 * Do not invoke onboarding or accept account terms during image generation.
 */
export declare function antigravityResolveProjectContext(blob: SubscriptionBlob, signal?: AbortSignal): Promise<AntigravityProjectContext>;
/**
 * Build the streamGenerateContent request body for one image generation.
 * Ported from the reference buildImageRequest + the wrapping envelope: no
 * tools, no systemInstruction, no thinkingConfig; responseModalities asks
 * for TEXT+IMAGE. Reference images (edits) ride along as inlineData parts
 * before the text part, mirroring the reference implementation.
 */
export declare function antigravityImageBody(options: {
    prompt: string;
    aspectRatio?: string;
    hd?: boolean;
    referenceImages?: ReadonlyArray<{
        data: Uint8Array;
        mediaType: string;
    }>;
}): Record<string, unknown>;
/** Wrap the inner request in the Antigravity agent envelope. */
export declare function antigravityEnvelope(projectId: string, request: Record<string, unknown>): Record<string, unknown>;
export interface AntigravityImageResult {
    b64: string;
    mimeType: string;
    text?: string;
}
/**
 * Generate one image on the logged-in Antigravity account: resolve the
 * project, POST the wrapped body to each endpoint in fallback order, and
 * parse the SSE stream for the inlineData image part.
 */
export declare function antigravityGenerateImage(options: {
    blob: SubscriptionBlob;
    projectId: string;
    projectContext?: AntigravityProjectContext;
    prompt: string;
    aspectRatio?: string;
    hd?: boolean;
    referenceImages?: ReadonlyArray<{
        data: Uint8Array;
        mediaType: string;
    }>;
    signal?: AbortSignal;
}): Promise<AntigravityImageResult>;
