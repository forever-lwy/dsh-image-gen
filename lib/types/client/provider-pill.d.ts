import { type ComfyUIWorkflowEntry, type OpenAICompatChannel, type ImageProvider } from '../shared.js';
import type { SettingsScope } from './index.js';
import type { LocaleService } from './gallery-view.js';
/** Settings fields the pill reads; a structural subset of the full settings shape. */
export interface PillSettings {
    provider?: ImageProvider;
    googleModel?: string;
    openaiModel?: string;
    openaiCompatLabel?: string;
    openaiCompatModel?: string;
    openaiCompatModels?: readonly string[];
    openaiCompatChannels?: readonly OpenAICompatChannel[];
    openaiCompatActiveChannel?: string;
    seedreamModel?: string;
    dashscopeModel?: string;
    xaiModel?: string;
    zhipuModel?: string;
    comfyuiWorkflows?: readonly ComfyUIWorkflowEntry[];
    comfyuiActiveWorkflow?: string;
    comfyuiWorkflowJson?: string;
    comfyuiWorkflowName?: string;
    /** Opt-in toggle persisted by the settings card; the pill stays hidden until enabled. */
    showProviderPill?: boolean;
}
/** Minimal credential face the pill needs; structurally satisfied by the settings card's remote. */
interface PillCredentials {
    describe(refs: string[]): Promise<{
        ok: boolean;
        value?: Readonly<Record<string, {
            configured?: boolean;
        }>>;
    }>;
}
/** Notifies the pill whenever any credential reference changes on the host. */
interface PillCredentialEvents {
    listen(callback: () => void): () => void;
}
/** Business face injected at registration time by the client entry. */
export interface ProviderPillFace {
    scope: SettingsScope<PillSettings>;
    credentials: PillCredentials;
    locale?: LocaleService | undefined;
    credentialEvents?: PillCredentialEvents | undefined;
}
/**
 * Where `position: fixed` offsets start next to the pill, in viewport
 * coordinates. The host composer wraps the tool row in a transformed box
 * (`will-change: transform`), which makes fixed descendants resolve against
 * that box instead of the viewport (#109): viewport coordinates then land the
 * menu a sidebar-width off whenever the left sidebar is open. Two zero-size
 * probes read the real origin, whichever CSS rule creates it.
 */
export declare function fixedOriginNear(host: Element): {
    left: number;
    top: number;
    bottom: number;
};
/** Whether the user opted into the composer pill; hidden (not merely inert) when off. */
export declare function pillVisible(value: PillSettings | undefined): boolean;
/** Model (or ComfyUI workflow) a provider row will use with the persisted settings. */
export declare function pillModelOf(provider: ImageProvider, value: PillSettings | undefined, channelId?: string): string;
/** Optional model choices exposed by a provider; single-model providers return an empty list. */
export declare function pillModelOptionsOf(provider: ImageProvider, value: PillSettings | undefined, channelId?: string): string[];
/**
 * The settings writes that make a ComfyUI workflow the active one: the same
 * three fields the settings card saves for its active workflow (the name plus
 * the legacy single-workflow mirror), so the two views never disagree.
 * Undefined for a name that is not imported.
 */
export declare function comfyUIWorkflowWrites(value: PillSettings | undefined, name: string): Array<[keyof PillSettings, string]> | undefined;
/** The pill button text: the channel label, or the provider with its active workflow for ComfyUI. */
export declare function pillButtonLabel(provider: ImageProvider, providerLabel: string, value: PillSettings | undefined, channelLabel?: string): string;
/** One fixed-position provider menu anchored to the pill button. */
export declare function ImageProviderPill(props: ProviderPillFace): import("react").JSX.Element | null;
/** Styles for the pill and its fixed-position menu; injected by the client entry. */
export declare const PROVIDER_PILL_STYLE = "\n.dsh-ig-pill-root{position:relative;display:inline-flex;align-items:center;height:28px}\n.dsh-ig-pill-button{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 9px 0 8px;border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:14px;background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-secondary,#4b5563);font:inherit;font-size:13px;line-height:20px;cursor:pointer;transition:border-color .15s,background .15s,color .15s;-webkit-user-select:none;user-select:none}\n.dsh-ig-pill-button:hover:not(:disabled){border-color:var(--dsw-alias-label-dimmed,#9ca3af);color:var(--dsw-alias-label-primary,#111827)}\n.dsh-ig-pill-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4c78ff);outline-offset:1px}\n.dsh-ig-pill-button:disabled{opacity:.5;cursor:not-allowed}\n.dsh-ig-pill-button-open{border-color:var(--dsw-alias-brand-primary,#4c78ff);color:var(--dsw-alias-label-primary,#111827)}\n.dsh-ig-pill-icon{flex:none;color:var(--dsw-alias-brand-primary,#4c78ff)}\n.dsh-ig-pill-provider{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.dsh-ig-pill-caret{display:inline-flex;flex:none;transition:transform .15s}\n.dsh-ig-pill-caret-open{transform:rotate(180deg)}\n@container (max-width:700px){\n  .dsh-ig-pill-caret{display:none}\n  .dsh-ig-pill-button{padding:0 7px 0 6px}\n}\n.dsh-ig-pill-menu{position:fixed;z-index:1000;min-width:264px;max-width:min(320px,calc(100vw - 24px));padding:6px;border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:12px;background:var(--dsw-alias-bg-layer-3,#fff);box-shadow:0 12px 32px rgba(0,0,0,.16),0 2px 8px rgba(0,0,0,.08);max-height:min(320px,calc(100vh - 48px));overflow-y:auto}\n.dsh-ig-pill-menu-title{padding:6px 8px 4px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary,#6b7280)}\n.dsh-ig-pill-option{display:flex;width:100%;align-items:center;gap:9px;padding:7px 8px;border:0;border-radius:8px;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer}\n.dsh-ig-pill-option:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2,#f3f4f6)}\n.dsh-ig-pill-option:disabled{opacity:.6;cursor:default}\n.dsh-ig-pill-option:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4c78ff);outline-offset:-2px}\n.dsh-ig-pill-option-active{background:var(--dsw-alias-brand-primary-soft,rgba(76,120,255,.10))}\n.dsh-ig-pill-dot{flex:none;width:7px;height:7px;border-radius:50%}\n.dsh-ig-pill-dot-ok{background:#22c55e}\n.dsh-ig-pill-dot-missing{background:#9ca3af}\n.dsh-ig-pill-dot-neutral{background:#4c78ff}\n.dsh-ig-pill-option-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}\n.dsh-ig-pill-option-name{font-size:12.5px;font-weight:500;color:var(--dsw-alias-label-primary,#111827);line-height:1.2}\n.dsh-ig-pill-option-sub{font-size:11px;color:var(--dsw-alias-label-tertiary,#6b7280);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.dsh-ig-pill-model-option{padding-left:24px}\n.dsh-ig-pill-model-name{flex:1;min-width:0;font-size:12px;color:var(--dsw-alias-label-secondary,#4b5563);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.dsh-ig-pill-check{flex:none;color:var(--dsw-alias-brand-primary,#4c78ff)}\n.dsh-ig-pill-error{margin-top:4px;padding:6px 8px;border-radius:8px;background:rgba(239,68,68,.08);color:#ef4444;font-size:11.5px;line-height:1.4;word-break:break-all}\n";
export {};
