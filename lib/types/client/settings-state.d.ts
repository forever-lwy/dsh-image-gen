/** Preserve modern form states while accepting legacy scopes without status/mode. */
import { type SettingsHealth } from '../shared.js';
export interface SettingsScopeSnapshot<T> {
    value: T | undefined;
    writable: boolean;
    status?: 'loading' | 'ready' | 'unavailable';
    mode?: 'host' | 'memory';
}
export type SettingsState = 'ready' | 'loading' | 'remote' | 'unavailable' | 'readOnly' | 'incompatible';
export declare function settingsState(snapshot: SettingsScopeSnapshot<unknown>, health?: SettingsHealth): SettingsState;
/** A failed probe cannot identify the cause; keep the host's own form state. */
export declare function fetchSettingsHealth(signal: AbortSignal): Promise<SettingsHealth | undefined>;
