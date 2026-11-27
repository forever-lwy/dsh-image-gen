import type { ConnectionRequestRejection, ConnectionTrustRequest } from '@deepseek-ai/dsh-client-connection';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import type { IncomingMessage, ServerResponse } from 'node:http';
export type WebAdmission = (request: ConnectionTrustRequest) => ConnectionRequestRejection | 503;
/** Preserve hosts without connection admission unless the operator opts in. */
export declare function resolveWebAdmission(check: WebAdmission | undefined, required: boolean): WebAdmission | undefined;
type ProtectedWebRoute = Omit<WebRoute, 'handler'> & {
    auth: 'required';
    handler: (req: IncomingMessage, res: ServerResponse, peer?: {
        readonly signal: AbortSignal;
    }) => ReturnType<WebRoute['handler']>;
};
export declare function withWebAdmission(route: WebRoute, admission: () => WebAdmission | undefined): ProtectedWebRoute;
export {};
