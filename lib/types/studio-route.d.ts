/** Same-origin HTTP bridge used by the browser image workbench. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { type StudioConfigResponse, type StudioGenerateRequest, type StudioGenerateResponse } from './shared.js';
export interface StudioRouteDeps {
    describe(): Promise<StudioConfigResponse>;
    generate(input: StudioGenerateRequest, signal: AbortSignal): Promise<StudioGenerateResponse>;
    maxBodyBytes: number;
    timeoutMs?: number;
    /** Whether the selected channel asks for a GIF by itself, so a request without `output` still gets the GIF timeout. */
    channelSelectsGif?(input: StudioGenerateRequest): boolean;
    /** Heartbeat cadence for the streaming generation response; tests shrink it. */
    heartbeatMs?: number;
}
/** Serve workbench capabilities and generation requests without exposing provider credentials. */
export declare function serveStudio(req: IncomingMessage, res: ServerResponse, deps: StudioRouteDeps): Promise<void>;
/** Strictly validate the small untrusted workbench wire contract. */
export declare function parseStudioGenerateRequest(value: unknown): StudioGenerateRequest;
