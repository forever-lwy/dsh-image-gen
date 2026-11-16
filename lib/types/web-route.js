/** Preserve hosts without connection admission unless the operator opts in. */
export function resolveWebAdmission(check, required) {
    return check ?? (required ? () => 503 : undefined);
}
export function withWebAdmission(route, admission) {
    return {
        ...route,
        handler: (req, res) => {
            let rejection;
            try {
                const check = admission();
                rejection = check?.(req);
            }
            catch {
                rejection = 503;
            }
            if (rejection === undefined)
                return route.handler(req, res);
            res.writeHead(rejection, { 'content-type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: rejection === 401 ? 'unauthorized' : 'forbidden' }));
        },
    };
}
//# sourceMappingURL=web-route.js.map