import './tl/css-supports-shim.js';
import type { Context } from '@deepseek-ai/cordis';
import { type SettingsScopeSnapshot } from './settings-state.js';
export type { SettingsScopeSnapshot } from './settings-state.js';
export interface SettingsScope<T> {
    getSnapshot(): SettingsScopeSnapshot<T>;
    subscribe(listener: () => void): () => void;
    /** New hosts return true/false; legacy settings scopes resolve to void. */
    set(field: string, value: unknown): Promise<boolean | void>;
}
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { type ComfyUIWorkflowEntry, type OpenAICompatChannel, type ImageProvider } from '../shared.js';
import { type LocaleService } from './gallery-view.js';
export { GeneratedImageCard, GeneratedImagesCard, PromotedImageResultNode } from './image-result-view.js';
type Provider = ImageProvider;
interface ImageSettings {
    provider?: Provider;
    cloudTimeoutMs?: number;
    googleModel?: string;
    googleEndpoint?: string;
    googleNative?: boolean;
    openaiBaseURL?: string;
    openaiModel?: string;
    openaiSizes?: Record<string, Record<string, string>>;
    openaiCompatLabel?: string;
    openaiCompatBaseURL?: string;
    openaiCompatModel?: string;
    openaiCompatModels?: string[];
    openaiCompatChannels?: OpenAICompatChannel[];
    openaiCompatActiveChannel?: string;
    openaiCompatEditModel?: string;
    openaiCompatSizes?: Record<string, Record<string, string>>;
    openaiCompatQuality?: string;
    openaiCompatQualityOptions?: string[];
    openaiCompatExtraBody?: Record<string, unknown>;
    openaiCompatEditSizeMode?: 'auto' | 'selected';
    /** Edit-request shape for the openai-compat relay (#41); see src/config.ts. */
    openaiCompatEditFormat?: 'multipart' | 'jsonImageUrlArray' | 'formReferenceImages' | 'siliconflowJson';
    /** Extra JSON fields merged into the JSON edit body; ignored in multipart mode. */
    openaiCompatEditExtra?: Record<string, unknown>;
    seedreamBaseURL?: string;
    seedreamModel?: string;
    /** Ark `output_format`; `png` is lossless and keeps an alpha channel. */
    seedreamOutputFormat?: 'png' | 'jpeg';
    /** Ark `watermark`; off removes the baked-in "AI generated" mark. */
    seedreamWatermark?: boolean;
    /** Ark `background`; `transparent` needs an alpha-bearing edit reference. */
    seedreamBackground?: 'opaque' | 'transparent';
    dashscopeEndpoint?: string;
    dashscopeModel?: string;
    xaiBaseURL?: string;
    xaiModel?: string;
    zhipuBaseURL?: string;
    zhipuModel?: string;
    comfyuiBaseURL?: string;
    comfyuiWorkflows?: ComfyUIWorkflowEntry[];
    comfyuiActiveWorkflow?: string;
    comfyuiWorkflowJson?: string;
    comfyuiWorkflowName?: string;
    comfyuiTimeoutMs?: number;
    saveToWorkspace?: boolean;
    workspaceFolder?: string;
    showProviderPill?: boolean;
}
interface CredentialInfo {
    configured?: boolean;
    source?: string;
    writable?: boolean;
}
interface CredentialResult {
    ok: boolean;
    value?: Readonly<Record<string, CredentialInfo>>;
}
interface CredentialMutationResult {
    ok: boolean;
    error?: {
        message?: string;
    };
}
interface CredentialsRemote {
    describe(refs: string[]): Promise<CredentialResult>;
    set(ref: string, value: string): Promise<CredentialMutationResult>;
    /** Present only on modern hosts; feature-detected before use; undefined while degraded. */
    unset?: ((ref: string) => Promise<CredentialMutationResult>) | undefined;
}
/** Notifies the settings card whenever any credential reference changes on the host. */
interface CredentialEvents {
    listen(callback: () => void): () => void;
}
interface SettingsFace {
    scope: SettingsScope<ImageSettings>;
    credentials: CredentialsRemote;
    /** False while the host core exposes no credentials service; the key UI degrades but the card stays mounted. */
    credentialsAvailable: () => boolean;
    locale?: LocaleService | undefined;
    credentialEvents?: CredentialEvents | undefined;
}
type SettingsCardProps = PropsRuntime<'settings.plugins.tab'> & InjectFace<SettingsFace>;
/** Current DSH serves live settings by the Loader entry id through configForms. */
export declare const inject: string[];
/** Mount the settings card, generated-image card, and native conversation gallery view. */
export declare function apply(ctx: Context): void;
/** Edit each provider independently, pick an explicit default, and verify keys inline. */
export declare function ImageGenerationSettingsCard(props: SettingsCardProps): import("react").JSX.Element;
