import type { ConnectionRequestRejection, ConnectionTrustRequest } from '@deepseek-ai/dsh-client-connection';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
export type WebAdmission = (request: ConnectionTrustRequest) => ConnectionRequestRejection | 503;
/** Preserve hosts without connection admission unless the operator opts in. */
export declare function resolveWebAdmission(check: WebAdmission | undefined, required: boolean): WebAdmission | undefined;
export declare function withWebAdmission(route: WebRoute, admission: () => WebAdmission | undefined): WebRoute;
