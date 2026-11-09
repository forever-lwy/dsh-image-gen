/** One line describing why a provider fetch failed: the abort reason when the caller cancelled, the cause chain otherwise. */
export declare function describeTransportFailure(error: unknown, signal?: AbortSignal): string;
/**
 * Await one provider fetch and rethrow transport failures as
 * `${label} failed after 12.3s: ${cause chain}`. The original error stays
 * reachable on `cause` for host-side error rendering.
 */
export declare function guardedFetch(label: string, signal: AbortSignal | undefined, run: () => Promise<Response>, ...secrets: Array<string | undefined>): Promise<Response>;
/** Guard only body I/O; parsing, HTTP checks and size enforcement stay with the adapter. */
export declare function readResponseBody<T>(response: Response, read: () => Promise<T>): Promise<T>;
