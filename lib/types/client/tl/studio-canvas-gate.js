import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
export function studioCanvasLicenseState(config, loading) {
    if (loading)
        return 'loading';
    if (config === null)
        return 'failed';
    return config.tldrawLicenseKey?.trim() ? 'configured' : 'unconfigured';
}
/** Hold the tldraw surface until the license read settles; a failed read still opens it. */
export const StudioCanvasGate = ({ state, loadingLabel, children }) => state === 'loading'
    ? _jsx("div", { className: "dsh-ig-canvas", children: _jsx("div", { className: "dsh-ig-canvas-empty", role: "status", children: loadingLabel }) })
    : _jsx(_Fragment, { children: children });
//# sourceMappingURL=studio-canvas-gate.js.map