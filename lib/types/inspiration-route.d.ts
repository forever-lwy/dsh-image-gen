import type { IncomingMessage, ServerResponse } from 'node:http';
export interface InspirationRouteDeps {
    fetch?: typeof fetch;
}
export declare function createInspirationRoute(deps?: InspirationRouteDeps): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
export declare function drainCacheWrites(): Promise<void>;
