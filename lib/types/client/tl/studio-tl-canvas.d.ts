import { type FC } from 'react';
import { type Editor } from 'tldraw';
import { type TlLandingItem } from './tl-canvas-bridge.js';
export { clearStudioTlCanvases, deselectStudioTlCanvases } from './studio-tl-registry.js';
export declare function landTlItems(editor: Editor, items: readonly TlLandingItem[], isActive: () => boolean, onUnreadable?: () => void): Promise<boolean>;
export declare const StudioTlCanvas: FC<{
    lang?: 'zh' | 'en';
}>;
