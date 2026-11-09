export function withWebAdmission(route, admission) {
    return {
        ...route,
        handler: (req, res) => {
            const rejection = admission()?.(req);
            if (rejection === undefined)
                return route.handler(req, res);
            res.writeHead(rejection, { 'content-type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: rejection === 401 ? 'unauthorized' : 'forbidden' }));
        },
    };
}
//# sourceMappingURL=web-route.js.map