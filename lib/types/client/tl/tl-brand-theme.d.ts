import type { Editor } from 'tldraw';
/** Apply the brand theme patch to a freshly mounted tldraw editor. */
export declare function applyBrandTheme(editor: Editor): void;
/**
 * Match tldraw's light/dark canvas to the DSH host theme. The host publishes
 * dark mode as the data-ds-dark-theme attribute on <body>; tldraw keeps its
 * own persisted user preference, so apply the host value now and observe
 * later flips. Returns the observer disposer.
 */
export declare function syncTldrawThemeWithHost(editor: Editor): () => void;
