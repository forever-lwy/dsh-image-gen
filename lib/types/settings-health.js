export function describeSettingsHealth(settings, schema) {
    const service = settings;
    const fields = Object.values(schema.dict ?? {});
    return {
        settings: typeof service?.describe === 'function' ? 'live' : 'unavailable',
        // Check what the host actually projects, rather than a version string or
        // the presence of a method on a different schemastery copy.
        liveSchema: fields.length > 0 && fields.every(field => field.meta.volatile === true),
    };
}
export function serveSettingsHealth(req, res, health) {
    res.setHeader('cache-control', 'no-store');
    if (req.method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('allow', 'GET');
        res.end();
        return;
    }
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(health));
}
//# sourceMappingURL=settings-health.js.map