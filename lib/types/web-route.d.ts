import type { ConnectionRequestRejection, ConnectionTrustRequest } from '@deepseek-ai/dsh-client-connection';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
export type WebAdmission = (request: ConnectionTrustRequest) => ConnectionRequestRejection;
export declare function withWebAdmission(route: WebRoute, admission: () => WebAdmission | undefined): WebRoute;
