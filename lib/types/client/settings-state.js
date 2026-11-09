/** Preserve modern form states while accepting legacy scopes without status/mode. */
import { SETTINGS_HEALTH_ROUTE } from '../shared.js';
export function settingsState(snapshot, health) {
    if (snapshot.mode === 'memory')
        return 'remote';
    if (health?.settings === 'live' && !health.liveSchema)
        return 'incompatible';
    if (snapshot.status === 'loading')
        return 'loading';
    if (snapshot.status === 'unavailable')
        return 'unavailable';
    return snapshot.writable ? 'ready' : 'readOnly';
}
/** A failed probe cannot identify the cause; keep the host's own form state. */
export async function fetchSettingsHealth(signal) {
    try {
        const response = await fetch(SETTINGS_HEALTH_ROUTE, { cache: 'no-store', signal });
        if (!response.ok)
            return undefined;
        const health = await response.json();
        if (health === null || typeof health.liveSchema !== 'boolean'
            || !['live', 'legacy', 'unavailable'].includes(health.settings ?? ''))
            return undefined;
        return { settings: health.settings, liveSchema: health.liveSchema };
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=settings-state.js.map