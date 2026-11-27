import type { LocaleService } from './gallery-view.js';
/** One open right-sidebar tab as published by DSH's `sidebarRight` inventory. */
export interface SidebarRightTab {
    sessionId?: string;
    tabId: string;
    kind: string;
}
/**
 * Runtime face of DSH's `sidebarRight` controller. Duck-typed and optional:
 * older hosts without the service never mount the composer shortcut.
 */
export interface SidebarRightFace {
    openTab(kind: string, options?: {
        revealIfOpened?: boolean;
    }): void;
    close(tabId: string): void;
    active(): {
        id: string;
        kind: string;
    } | undefined;
    openTabs?: {
        getSnapshot(): readonly SidebarRightTab[];
        subscribe(listener: () => void): () => void;
    } | undefined;
}
export interface StudioShortcutProps {
    locale?: LocaleService | undefined;
    sidebarRight: SidebarRightFace;
    /** Studio tab identity: `kind` is what `openTab` takes, `id` prefixes its tab ids. */
    studioTab: {
        id: string;
        kind: string;
    };
    sessionId?: string;
    /** Plugin settings; the shortcut shares the provider pill's `showProviderPill` toggle. */
    scope?: ShortcutVisibilityScope | undefined;
}
export interface ShortcutVisibilityScope {
    getSnapshot(): {
        value?: {
            showProviderPill?: boolean;
        } | undefined;
    };
    subscribe(listener: () => void): () => void;
}
/** Shown together with the provider pill: only while its toggle is on. */
export declare function shortcutVisible(scope: ShortcutVisibilityScope | undefined): boolean;
declare const SHORTCUT_TEXT: {
    readonly zh: {
        readonly open: "打开图像工作台";
        readonly close: "关闭图像工作台";
    };
    readonly en: {
        readonly open: "Open Image Studio";
        readonly close: "Close Image Studio";
    };
};
export type ShortcutLang = keyof typeof SHORTCUT_TEXT;
export declare function shortcutLang(locale: LocaleService | undefined): ShortcutLang;
/** Tooltip and accessible name: the action the next click performs. */
export declare function shortcutTitle(lang: ShortcutLang, open: boolean): string;
/** Subscribable view of the host locale reduced to the shortcut's language. */
export declare function shortcutLangStore(locale: LocaleService | undefined): {
    subscribe(listener: () => void): () => void;
    getSnapshot(): ShortcutLang;
};
export declare function isStudioTab(studioTab: {
    id: string;
    kind: string;
}, tab: {
    kind?: string;
    tabId?: string;
    id?: string;
} | undefined): boolean;
/** The studio tab of this session to close, or undefined when the next click opens it. */
export declare function openStudioTab(props: StudioShortcutProps): string | undefined;
/** Opens the studio, or closes it when this session already shows it. */
export declare function toggleStudio(props: StudioShortcutProps): 'opened' | 'closed';
export declare function StudioShortcutButton(props: StudioShortcutProps): import("react").JSX.Element | null;
export {};
