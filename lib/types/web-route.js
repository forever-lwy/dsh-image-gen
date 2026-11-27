/** Preserve hosts without connection admission unless the operator opts in. */
export function resolveWebAdmission(check, required) {
    return check ?? (required ? () => 503 : undefined);
}
export function withWebAdmission(route, admission) {
    return {
        ...route,
        auth: 'required',
        handler: (req, res, peer) => {
            let rejection;
            if (peer !== undefined) {
                if (peer.signal.aborted)
                    rejection = 401;
            }
            else {
                try {
                    rejection = admission()?.(req);
                }
                catch {
                    rejection = 503;
                }
            }
            if (rejection === undefined)
                return route.handler(req, res);
            res.writeHead(rejection, { 'content-type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: rejection === 401 ? 'unauthorized' : 'forbidden' }));
        },
    };
}
//# sourceMappingURL=web-route.js.map